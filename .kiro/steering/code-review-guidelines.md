# Guide de Revue de Code et Bonnes Pratiques - AttendanceX

Ce guide définit les standards de développement et les bonnes pratiques pour maintenir la qualité du code dans AttendanceX. Il s'appuie sur le pattern établi pour les tenants et met l'accent sur un typage fort.

## Architecture Obligatoire pour Nouvelles Fonctionnalités

### Pattern MVC Complet (Basé sur le Pattern Tenant)

Chaque nouvelle fonctionnalité DOIT suivre cette structure complète :

```
1. database.ts        → Définition de la collection
2. types/            → Interfaces TypeScript strictes
3. models/           → Modèle de persistance avec validation
4. services/         → Logique métier
5. controllers/      → Gestion HTTP
6. routes/           → Définition des endpoints
7. middleware/       → Mise à jour si nécessaire
```

### 1. Définition de Collection (database.ts)

**OBLIGATOIRE** : Ajouter la nouvelle collection dans `backend/functions/src/config/database.ts`

```typescript
// Dans collections
export const collections = {
  // ... collections existantes
  new_feature: db.collection("new_feature"),
  new_feature_memberships: db.collection("new_feature_memberships"),
  new_feature_settings: db.collection("new_feature_settings"),
};

// Dans collectionNames
export const collectionNames = {
  // ... noms existants
  NEW_FEATURE: "new_feature",
  NEW_FEATURE_MEMBERSHIPS: "new_feature_memberships",
  NEW_FEATURE_SETTINGS: "new_feature_settings",
};
```

### 2. Types TypeScript Stricts (types/)

**OBLIGATOIRE** : Définir des interfaces complètes avec typage fort

```typescript
// types/new-feature.types.ts
export interface NewFeature {
  id: string;
  tenantId: string;
  name: string;
  status: NewFeatureStatus;
  settings: NewFeatureSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export enum NewFeatureStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface NewFeatureSettings {
  timezone: string;
  locale: string;
  notifications: boolean;
}

export interface CreateNewFeatureRequest {
  name: string;
  settings?: Partial<NewFeatureSettings>;
  metadata?: Record<string, any>;
}

export interface UpdateNewFeatureRequest {
  name?: string;
  settings?: Partial<NewFeatureSettings>;
  metadata?: Record<string, any>;
}

// Document interne (avec champs sensibles)
export interface NewFeatureDocument extends NewFeature {
  internalNotes?: string;
  auditLog?: AuditEntry[];
}
```

### 3. Modèle de Persistance (models/)

**OBLIGATOIRE** : Étendre BaseModel avec validation complète

```typescript
// models/new-feature.model.ts
import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  NewFeature, 
  NewFeatureDocument, 
  NewFeatureStatus, 
  CreateNewFeatureRequest,
  UpdateNewFeatureRequest 
} from "../types/new-feature.types";

export class NewFeatureModel extends BaseModel<NewFeatureDocument> {
  constructor(data: Partial<NewFeatureDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const feature = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(feature, [
      "name", "tenantId", "status", "createdBy"
    ]);

    // Validation du nom
    this.validateLength(feature.name, 2, 100, "name");

    // Validation du statut
    if (!Object.values(NewFeatureStatus).includes(feature.status)) {
      throw new Error("Invalid feature status");
    }

    // Validation des paramètres
    if (feature.settings) {
      this.validateSettings(feature.settings);
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = NewFeatureModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<NewFeatureDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles
    delete cleaned.internalNotes;
    delete cleaned.auditLog;
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): NewFeatureModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = NewFeatureModel.prototype.convertDatesFromFirestore(data);

    return new NewFeatureModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateNewFeatureRequest & { tenantId: string; createdBy: string }
  ): NewFeatureModel {
    const featureData = {
      ...request,
      status: NewFeatureStatus.ACTIVE,
      settings: {
        timezone: "Europe/Paris",
        locale: "fr-FR",
        notifications: true,
        ...request.settings,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata || {},
    };

    return new NewFeatureModel(featureData);
  }

  private validateSettings(settings: any): void {
    if (settings.timezone && !this.isValidTimezone(settings.timezone)) {
      throw new Error("Invalid timezone");
    }
    // Autres validations...
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Service (services/)

**OBLIGATOIRE** : Logique métier avec gestion d'erreurs

```typescript
// services/new-feature/new-feature.service.ts
import { NewFeatureModel } from "../../models/new-feature.model";
import { collections } from "../../config/database";
import { 
  NewFeature, 
  CreateNewFeatureRequest, 
  UpdateNewFeatureRequest 
} from "../../types/new-feature.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";

export class NewFeatureService {
  
  async createFeature(
    request: CreateNewFeatureRequest, 
    tenantId: string, 
    userId: string
  ): Promise<NewFeature> {
    try {
      // Validation métier
      await this.validateCreateRequest(request, tenantId);
      
      // Créer le modèle
      const featureModel = NewFeatureModel.fromCreateRequest({
        ...request,
        tenantId,
        createdBy: userId
      });
      
      // Valider le modèle
      await featureModel.validate();
      
      // Sauvegarder
      const featureRef = collections.new_feature.doc();
      await featureRef.set(featureModel.toFirestore());
      
      // Retourner l'entité
      return {
        id: featureRef.id,
        ...featureModel.toAPI()
      } as NewFeature;
      
    } catch (error: any) {
      if (error instanceof ValidationError) throw error;
      throw new Error(`Failed to create feature: ${error.message}`);
    }
  }

  async getFeature(featureId: string, tenantId: string): Promise<NewFeature | null> {
    const doc = await collections.new_feature.doc(featureId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const featureModel = NewFeatureModel.fromFirestore(doc);
    if (!featureModel || featureModel.data.tenantId !== tenantId) {
      return null;
    }
    
    return featureModel.toAPI() as NewFeature;
  }

  async updateFeature(
    featureId: string, 
    updates: UpdateNewFeatureRequest, 
    tenantId: string
  ): Promise<NewFeature> {
    const existing = await this.getFeature(featureId, tenantId);
    if (!existing) {
      throw new NotFoundError("Feature not found");
    }
    
    // Validation des mises à jour
    await this.validateUpdateRequest(updates, tenantId);
    
    // Appliquer les mises à jour
    const updatedData = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    
    const featureModel = new NewFeatureModel(updatedData);
    await featureModel.validate();
    
    await collections.new_feature.doc(featureId).update(featureModel.toFirestore());
    
    return featureModel.toAPI() as NewFeature;
  }

  async deleteFeature(featureId: string, tenantId: string): Promise<void> {
    const existing = await this.getFeature(featureId, tenantId);
    if (!existing) {
      throw new NotFoundError("Feature not found");
    }
    
    await collections.new_feature.doc(featureId).delete();
  }

  async getFeaturesByTenant(tenantId: string): Promise<NewFeature[]> {
    const snapshot = await collections.new_feature
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs
      .map(doc => NewFeatureModel.fromFirestore(doc))
      .filter(model => model !== null)
      .map(model => model!.toAPI() as NewFeature);
  }

  private async validateCreateRequest(
    request: CreateNewFeatureRequest, 
    tenantId: string
  ): Promise<void> {
    // Vérifier l'unicité du nom dans le tenant
    const existing = await collections.new_feature
      .where('tenantId', '==', tenantId)
      .where('name', '==', request.name)
      .limit(1)
      .get();
    
    if (!existing.empty) {
      throw new ConflictError("Feature name already exists in this tenant");
    }
  }

  private async validateUpdateRequest(
    updates: UpdateNewFeatureRequest, 
    tenantId: string
  ): Promise<void> {
    if (updates.name) {
      // Vérifier l'unicité du nouveau nom
      const existing = await collections.new_feature
        .where('tenantId', '==', tenantId)
        .where('name', '==', updates.name)
        .limit(1)
        .get();
      
      if (!existing.empty) {
        throw new ConflictError("Feature name already exists in this tenant");
      }
    }
  }
}

export const newFeatureService = new NewFeatureService();
```

### 5. Controller (controllers/)

**OBLIGATOIRE** : Gestion HTTP avec validation stricte

```typescript
// controllers/new-feature/new-feature.controller.ts
import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { newFeatureService } from "../../services/new-feature/new-feature.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateNewFeatureRequest, 
  UpdateNewFeatureRequest 
} from "../../types/new-feature.types";

export class NewFeatureController {

  static createFeature = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateNewFeatureRequest = req.body;

      // Validation des champs requis
      if (!createRequest.name) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Feature name is required");
      }

      logger.info(`🚀 Creating feature: ${createRequest.name}`, {
        userId,
        tenantId,
        featureName: createRequest.name
      });

      const feature = await newFeatureService.createFeature(createRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Feature created successfully: ${feature.id} in ${duration}ms`, {
        featureId: feature.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Feature created successfully",
        data: feature
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating feature after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create feature");
    }
  });

  static getFeature = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { featureId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const feature = await newFeatureService.getFeature(featureId, tenantId);

      if (!feature) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Feature not found");
      }

      res.json({
        success: true,
        data: feature
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting feature:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get feature");
    }
  });

  static updateFeature = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { featureId } = req.params;
      const tenantId = req.user?.tenantId;
      const updateRequest: UpdateNewFeatureRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const feature = await newFeatureService.updateFeature(featureId, updateRequest, tenantId);

      logger.info(`✅ Feature updated: ${featureId}`, {
        featureId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Feature updated successfully",
        data: feature
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating feature:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update feature");
    }
  });

  static deleteFeature = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { featureId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      await newFeatureService.deleteFeature(featureId, tenantId);

      logger.info(`🗑️ Feature deleted: ${featureId}`, {
        featureId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Feature deleted successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error deleting feature:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete feature");
    }
  });

  static getFeaturesByTenant = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const features = await newFeatureService.getFeaturesByTenant(tenantId);

      res.json({
        success: true,
        data: features
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting features:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get features");
    }
  });
}
```

### 6. Routes (routes/)

**OBLIGATOIRE** : Définition des endpoints avec middleware complet

```typescript
// routes/new-feature/new-feature.routes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantContextMiddleware } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { NewFeatureController } from "../../controllers/new-feature/new-feature.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authMiddleware);
router.use(tenantContextMiddleware);

// Routes CRUD
router.post("/", NewFeatureController.createFeature);
router.get("/", NewFeatureController.getFeaturesByTenant);
router.get("/:featureId", NewFeatureController.getFeature);
router.put("/:featureId", NewFeatureController.updateFeature);
router.delete("/:featureId", NewFeatureController.deleteFeature);

export { router as newFeatureRoutes };
```

### 7. Intégration dans routes/index.ts

**OBLIGATOIRE** : Ajouter les nouvelles routes

```typescript
// routes/index.ts
import { newFeatureRoutes } from "./new-feature/new-feature.routes";

// Dans la fonction setupRoutes
app.use("/api/new-features", newFeatureRoutes);
```

## Standards de Revue de Code

### 1. Typage TypeScript Strict

#### ✅ OBLIGATOIRE
```typescript
// Interfaces complètes avec tous les champs typés
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

// Enums pour les valeurs constantes
enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

// Types union stricts
type EventStatus = 'draft' | 'published' | 'cancelled';

// Génériques avec contraintes
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

#### ❌ INTERDIT
```typescript
// Types any
const userData: any = req.body;

// Propriétés optionnelles sans raison
interface User {
  id?: string;  // id devrait toujours être requis
  email?: string;  // email devrait être requis
}

// Types implicites
const users = await getUsers();  // Type non défini
```

### 2. Validation des Données

#### ✅ OBLIGATOIRE
```typescript
// Validation stricte dans les modèles
async validate(): Promise<boolean> {
  BaseModel.validateRequired(this.data, ['name', 'email', 'tenantId']);
  
  if (!this.isValidEmail(this.data.email)) {
    throw new ValidationError('Invalid email format');
  }
  
  return true;
}

// Validation des entrées dans les services
private validateCreateRequest(request: CreateUserRequest): void {
  if (!request.email || !this.isValidEmail(request.email)) {
    throw new ValidationError('Valid email is required');
  }
  
  if (!request.name || request.name.trim().length < 2) {
    throw new ValidationError('Name must be at least 2 characters');
  }
}
```

#### ❌ INTERDIT
```typescript
// Pas de validation
const user = await userService.create(req.body);

// Validation partielle
if (userData.email) {
  // Validation seulement si présent
}
```

### 3. Gestion d'Erreurs

#### ✅ OBLIGATOIRE
```typescript
// Classes d'erreur spécifiques
throw new ValidationError('Invalid email format', { field: 'email' });
throw new NotFoundError('User not found');
throw new ConflictError('Email already exists');

// Gestion dans les controllers
try {
  const result = await service.operation();
  res.json({ success: true, data: result });
} catch (error: any) {
  const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
  
  if (error instanceof ValidationError) {
    return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
  }
  
  return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Operation failed");
}
```

#### ❌ INTERDIT
```typescript
// Erreurs génériques
throw new Error('Something went wrong');

// Pas de gestion d'erreur
const result = await riskyOperation();
```

### 4. Sécurité et Contexte Tenant

#### ✅ OBLIGATOIRE
```typescript
// Toujours vérifier le contexte tenant
const tenantId = req.user?.tenantId;
if (!tenantId) {
  throw new UnauthorizedError('Tenant context required');
}

// Scoper toutes les opérations par tenant
const users = await collections.users
  .where('tenantId', '==', tenantId)
  .get();

// Vérifier les permissions
if (!hasPermission(req.user, 'canManageUsers', tenantId)) {
  throw new UnauthorizedError('Insufficient permissions');
}
```

#### ❌ INTERDIT
```typescript
// Opérations sans scope tenant
const users = await collections.users.get();

// Pas de vérification de permissions
await userService.deleteUser(userId);
```

### 5. Performance et Optimisation

#### ✅ OBLIGATOIRE
```typescript
// Pagination pour les listes
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Indexes Firestore appropriés
// Créer des indexes composés pour les requêtes complexes

// Batching pour les opérations multiples
const batch = db.batch();
users.forEach(user => {
  batch.set(userRef, user);
});
await batch.commit();
```

#### ❌ INTERDIT
```typescript
// Pas de pagination
const allUsers = await collections.users.get();

// Requêtes N+1
for (const user of users) {
  const profile = await getProfile(user.id);
}
```

## Checklist de Revue de Code

### Architecture et Structure
- [ ] Suit le pattern MVC complet (database → types → model → service → controller → routes)
- [ ] Collection ajoutée dans `database.ts`
- [ ] Types TypeScript stricts définis
- [ ] Modèle étend `BaseModel` avec validation
- [ ] Service contient la logique métier
- [ ] Controller gère uniquement HTTP
- [ ] Routes avec middleware complet

### Typage TypeScript
- [ ] Aucun type `any` utilisé
- [ ] Interfaces complètes avec tous les champs
- [ ] Enums pour les valeurs constantes
- [ ] Types de retour explicites sur toutes les fonctions
- [ ] Génériques utilisés correctement
- [ ] Types union stricts

### Validation et Sécurité
- [ ] Validation stricte dans les modèles
- [ ] Validation des entrées dans les services
- [ ] Contexte tenant vérifié partout
- [ ] Permissions vérifiées
- [ ] Données sensibles exclues des réponses API
- [ ] Rate limiting appliqué

### Gestion d'Erreurs
- [ ] Classes d'erreur spécifiques utilisées
- [ ] Gestion complète dans les controllers
- [ ] Messages d'erreur informatifs
- [ ] Logging approprié
- [ ] Codes d'erreur HTTP corrects

### Performance
- [ ] Pagination implémentée pour les listes
- [ ] Indexes Firestore appropriés
- [ ] Pas de requêtes N+1
- [ ] Batching pour les opérations multiples
- [ ] Cache utilisé si approprié

### Tests
- [ ] Tests unitaires pour les services
- [ ] Tests d'intégration pour les endpoints
- [ ] Couverture de code > 80%
- [ ] Tests des cas d'erreur
- [ ] Tests de validation

### Documentation
- [ ] JSDoc sur les fonctions publiques
- [ ] README mis à jour si nécessaire
- [ ] Types documentés
- [ ] Exemples d'utilisation

## Exemples de Commentaires de Revue

### ✅ Commentaires Constructifs
```
"Cette fonction devrait retourner un type spécifique au lieu de 'any'. 
Peux-tu définir une interface pour le retour ?"

"Il manque la validation du contexte tenant ici. 
Ajoute la vérification de req.user?.tenantId."

"Cette requête pourrait bénéficier d'un index composé sur (tenantId, status, createdAt). 
Peux-tu l'ajouter dans firestore.indexes.json ?"
```

### ❌ Commentaires Non Constructifs
```
"Ce code ne marche pas"
"Refais tout"
"C'est mal fait"
```

## Outils de Validation

### ESLint Rules Obligatoires
```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "error",
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/strict-boolean-expressions": "error"
}
```

### Pre-commit Hooks
```bash
# Validation TypeScript
npm run type-check

# Linting
npm run lint

# Tests
npm run test:unit

# Build
npm run build
```

Ce guide doit être suivi rigoureusement pour maintenir la qualité et la cohérence du code dans AttendanceX.

## Portée du Hook de Revue de Code

Le hook de revue de code automatique se concentre exclusivement sur le **backend** :

### Fichiers Analysés
- `backend/functions/src/**/*.ts` - Code TypeScript backend uniquement
- Exclusion du frontend (frontend/, frontend-v2/)
- Exclusion des fichiers de test et scripts utilitaires

### Focus d'Analyse Backend
1. **Pattern MVC Complet** - Vérification de l'architecture complète
2. **Typage TypeScript Strict** - Aucun `any`, interfaces complètes
3. **Sécurité Tenant** - Contexte tenant obligatoire sur toutes les opérations
4. **Validation des Données** - Modèles avec validation BaseModel
5. **Gestion d'Erreurs** - Classes d'erreur spécifiques et logging
6. **Performance API** - Pagination, indexes Firestore, batching
7. **Middleware Chain** - Rate limiting, auth, tenant context
8. **Séparation des Responsabilités** - Controller → Service → Model

Le hook analysera automatiquement chaque modification de code backend selon ces standards et fournira des suggestions d'amélioration spécifiques et actionnables, en maintenant la cohérence avec les patterns établis dans le projet.