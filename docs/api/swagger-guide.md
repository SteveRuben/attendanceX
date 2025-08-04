# 📚 Guide Swagger/OpenAPI - Attendance Management System

## 🎯 Vue d'ensemble

Ce guide explique comment utiliser et maintenir la documentation Swagger/OpenAPI pour l'API Attendance Management System.

## 🚀 Accès rapide

### Développement local
```bash
npm run dev
# Puis ouvrir: http://localhost:5001/api/docs
```

### Production
```
https://us-central1-attendance-x.cloudfunctions.net/api/docs
```

## 📋 Commandes disponibles

### Génération de documentation
```bash
# Générer les fichiers de documentation
npm run generate:swagger

# Valider la spécification OpenAPI
npm run validate:swagger

# Exporter la documentation
npm run export:swagger

# Servir avec documentation mise à jour
npm run serve:docs
```

### Développement
```bash
# Mode développement avec rechargement automatique
npm run dev

# Build du projet
npm run build
```

## 🏗️ Structure de la documentation

### Fichiers de configuration
```
backend/functions/src/
├── config/
│   ├── swagger.ts              # Configuration principale OpenAPI
│   └── swagger-ui-config.ts    # Configuration de l'interface Swagger UI
├── middleware/
│   └── swagger.ts              # Middleware pour servir la documentation
└── scripts/
    └── generate-swagger-docs.ts # Script de génération automatique
```

### Fichiers générés
```
docs/api/
├── swagger.json    # Spécification OpenAPI en JSON
├── swagger.yaml    # Spécification OpenAPI en YAML
└── README.md       # Documentation générée automatiquement
```

## ✍️ Comment documenter une route

### 1. Annotation de base
```typescript
/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Récupérer la liste des utilisateurs
 *     description: Retourne une liste paginée des utilisateurs de l'organisation
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *     security:
 *       - BearerAuth: []
 */
router.get('/', UserController.getUsers);
```

### 2. Route avec authentification JWT
```typescript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Connexion utilisateur
 *     description: |
 *       Authentifie un utilisateur et retourne des tokens JWT.
 *       
 *       **Fonctionnalités :**
 *       - Validation des identifiants
 *       - Génération de tokens JWT (access + refresh)
 *       - Gestion de la 2FA si activée
 *       - Rate limiting (5 tentatives/15min)
 *       - Détection d'activité suspecte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *                 description: "Étendre la durée du refresh token"
 *               twoFactorCode:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 description: "Code 2FA si activé"
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: "Token JWT d'accès (24h)"
 *                     refreshToken:
 *                       type: string
 *                       description: "Token de rafraîchissement (7j)"
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     expiresIn:
 *                       type: number
 *                       example: 86400
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: "INVALID_CREDENTIALS"
 *                 message: "Email ou mot de passe incorrect"
 *       423:
 *         description: Compte verrouillé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 code: "ACCOUNT_LOCKED"
 *                 message: "Compte temporairement verrouillé"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/login', AuthController.login);
```

### 3. Route avec validation Zod
```typescript
/**
 * @swagger
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Créer un nouvel événement
 *     description: |
 *       Crée un nouvel événement avec validation complète.
 *       
 *       **Permissions requises :** Manager ou Admin
 *       
 *       **Fonctionnalités :**
 *       - Validation des données avec Zod
 *       - Détection de conflits d'horaires
 *       - Génération de QR code sécurisé
 *       - Support des événements récurrents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEventRequest'
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Conflit d'horaires détecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "SCHEDULE_CONFLICT"
 *                     message:
 *                       type: string
 *                       example: "Conflit d'horaires détecté"
 *                     conflicts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *     security:
 *       - BearerAuth: []
 */
router.post('/', requireRole(['manager', 'admin']), EventController.createEvent);
```

## 🔧 Schémas réutilisables

### Schémas de base
```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         firstName:
 *           type: string
 *           example: "Jean"
 *         lastName:
 *           type: string
 *           example: "Dupont"
 *         role:
 *           type: string
 *           enum: [user, manager, admin, super_admin]
 *           example: "user"
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           example: "active"
 *         organizationId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - email
 *         - firstName
 *         - lastName
 *         - role
 *         - status
 *         - organizationId
 */
```

### Schémas d'erreur
```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: "VALIDATION_ERROR"
 *             message:
 *               type: string
 *               example: "Les données fournies sont invalides"
 *             details:
 *               type: object
 *               additionalProperties: true
 *         timestamp:
 *           type: string
 *           format: date-time
 *         requestId:
 *           type: string
 *           format: uuid
 *       required:
 *         - success
 *         - error
 *         - timestamp
 *         - requestId
 *     
 *     ValidationError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             error:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Erreurs de validation"
 *                 details:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 *                           code:
 *                             type: string
 */
```

## 🔐 Sécurité et authentification

### Configuration JWT
```typescript
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: |
 *         Token JWT d'authentification.
 *         
 *         **Format :** `Bearer <token>`
 *         
 *         **Obtention :** Utilisez l'endpoint `/auth/login` pour obtenir un token.
 *         
 *         **Durée de vie :** 24 heures pour les access tokens.
 *         
 *         **Rafraîchissement :** Utilisez l'endpoint `/auth/refresh-token`.
 */
```

### Réponses d'erreur communes
```typescript
/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Token manquant ou invalide
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             error:
 *               code: "UNAUTHORIZED"
 *               message: "Token d'authentification requis"
 *     
 *     ForbiddenError:
 *       description: Permissions insuffisantes
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             error:
 *               code: "FORBIDDEN"
 *               message: "Permissions insuffisantes"
 *     
 *     RateLimitError:
 *       description: Limite de taux dépassée
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             success: false
 *             error:
 *               code: "RATE_LIMIT_EXCEEDED"
 *               message: "Trop de requêtes, réessayez plus tard"
 *       headers:
 *         X-RateLimit-Limit:
 *           schema:
 *             type: integer
 *           description: Limite de requêtes par fenêtre
 *         X-RateLimit-Remaining:
 *           schema:
 *             type: integer
 *           description: Requêtes restantes dans la fenêtre
 *         X-RateLimit-Reset:
 *           schema:
 *             type: integer
 *           description: Timestamp de réinitialisation de la fenêtre
 */
```

## 📊 Paramètres communs

### Pagination
```typescript
/**
 * @swagger
 * components:
 *   parameters:
 *     PageParam:
 *       name: page
 *       in: query
 *       description: Numéro de page (commence à 1)
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *         example: 1
 *     
 *     LimitParam:
 *       name: limit
 *       in: query
 *       description: Nombre d'éléments par page
 *       required: false
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *         example: 20
 *     
 *     SortParam:
 *       name: sort
 *       in: query
 *       description: |
 *         Champ de tri avec direction optionnelle.
 *         
 *         **Format :** `field` ou `field:direction`
 *         
 *         **Direction :** `asc` (croissant) ou `desc` (décroissant)
 *         
 *         **Exemples :**
 *         - `createdAt` (tri croissant par défaut)
 *         - `createdAt:desc` (tri décroissant)
 *         - `name:asc` (tri croissant par nom)
 *       required: false
 *       schema:
 *         type: string
 *         example: "createdAt:desc"
 */
```

### Filtres
```typescript
/**
 * @swagger
 * components:
 *   parameters:
 *     SearchParam:
 *       name: search
 *       in: query
 *       description: Terme de recherche (recherche dans plusieurs champs)
 *       required: false
 *       schema:
 *         type: string
 *         minLength: 2
 *         example: "jean dupont"
 *     
 *     StatusParam:
 *       name: status
 *       in: query
 *       description: Filtrer par statut
 *       required: false
 *       schema:
 *         type: string
 *         enum: [active, inactive, suspended]
 *         example: "active"
 *     
 *     RoleParam:
 *       name: role
 *       in: query
 *       description: Filtrer par rôle
 *       required: false
 *       schema:
 *         type: string
 *         enum: [user, manager, admin, super_admin]
 *         example: "user"
 */
```

## 🎨 Personnalisation de l'interface

### Configuration Swagger UI
```typescript
// src/config/swagger-ui-config.ts
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1976d2 }
  `,
  customSiteTitle: 'Attendance Management API',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
};
```

## 🚀 Génération automatique

### Script de génération
```bash
# Générer la documentation complète
npm run generate:swagger

# Le script génère automatiquement :
# - docs/api/swagger.json
# - docs/api/swagger.yaml
# - docs/api/README.md (documentation markdown)
```

### Intégration CI/CD
```yaml
# .github/workflows/docs.yml
name: Generate API Documentation
on:
  push:
    branches: [main, develop]
    paths: ['backend/functions/src/**/*.ts']

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run generate:swagger
      - run: npm run validate:swagger
      - name: Commit documentation
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/api/
          git diff --staged --quiet || git commit -m "docs: update API documentation"
          git push
```

## 📝 Bonnes pratiques

### 1. Documentation complète
- **Toujours** documenter les nouveaux endpoints
- **Inclure** des exemples de requêtes/réponses
- **Décrire** les codes d'erreur possibles
- **Spécifier** les permissions requises

### 2. Schémas réutilisables
- **Créer** des schémas pour les objets complexes
- **Réutiliser** les schémas d'erreur communs
- **Définir** des paramètres réutilisables

### 3. Sécurité
- **Documenter** les exigences d'authentification
- **Spécifier** les permissions par endpoint
- **Inclure** les headers de sécurité

### 4. Validation
- **Valider** régulièrement la spécification OpenAPI
- **Tester** les exemples dans Swagger UI
- **Maintenir** la cohérence avec le code

## 🔍 Dépannage

### Problèmes courants

#### Documentation non mise à jour
```bash
# Régénérer la documentation
npm run generate:swagger

# Redémarrer le serveur
npm run dev
```

#### Erreurs de validation OpenAPI
```bash
# Valider la spécification
npm run validate:swagger

# Vérifier les logs pour les erreurs de syntaxe
```

#### Interface Swagger UI ne se charge pas
```bash
# Vérifier que le middleware est bien configuré
# Vérifier les logs du serveur
# S'assurer que le port 5001 est accessible
```

## 📚 Ressources

### Documentation officielle
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [JSDoc to OpenAPI](https://github.com/Surnet/swagger-jsdoc)

### Outils utiles
- [Swagger Editor](https://editor.swagger.io/) - Éditeur en ligne
- [OpenAPI Generator](https://openapi-generator.tech/) - Génération de clients
- [Spectral](https://stoplight.io/open-source/spectral) - Linting OpenAPI

---

**💡 Conseil :** Gardez cette documentation à jour avec les évolutions de l'API pour maintenir une expérience développeur optimale !