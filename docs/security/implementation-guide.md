# Guide d'Implémentation Sécurité OWASP

## Actions Immédiates (Cette Semaine)

### 1. Chiffrement des Données Sensibles

#### Créer le service de chiffrement

Fichier : `backend/functions/src/utils/encryption.util.ts`

```typescript
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class EncryptionService {
  private key: Buffer;
  
  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  }
  
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Hash pour les données non réversibles
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export const encryptionService = new EncryptionService();
```

#### Utilisation dans les modèles

```typescript
// models/user.model.ts
import { encryptionService } from '../utils/encryption.util';

export class UserModel {
  // Chiffrer les données sensibles avant sauvegarde
  toFirestore() {
    return {
      ...this.data,
      // Chiffrer le numéro de téléphone
      phone: this.data.phone ? 
        encryptionService.encrypt(this.data.phone) : null,
      // Chiffrer l'adresse
      address: this.data.address ? 
        encryptionService.encrypt(JSON.stringify(this.data.address)) : null,
      // Hash de l'email pour recherche
      emailHash: encryptionService.hash(this.data.email.toLowerCase())
    };
  }
  
  // Déchiffrer lors de la lecture
  static fromFirestore(data: any): User {
    return {
      ...data,
      phone: data.phone ? encryptionService.decrypt(data.phone) : null,
      address: data.address ? 
        JSON.parse(encryptionService.decrypt(data.address)) : null
    };
  }
}
```

### 2. Implémenter 2FA Obligatoire

#### Installer les dépendances
```bash
cd backend/functions
npm install speakeasy qrcode @types/speakeasy @types/qrcode
```

#### Service 2FA

Fichier : `backend/functions/src/services/auth/two-factor.service.ts`

```typescript
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { encryptionService } from '../../utils/encryption.util';

export class TwoFactorService {
  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `AttendanceX (${email})`,
      issuer: 'AttendanceX',
      length: 32
    });
    
    // Générer le QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // Sauvegarder le secret chiffré
    await db.collection('users').doc(userId).update({
      twoFactorSecret: encryptionService.encrypt(secret.base32),
      twoFactorEnabled: false, // Pas encore activé
      updatedAt: FieldValue.serverTimestamp()
    });
    
    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      backupCodes: this.generateBackupCodes()
    };
  }
  
  async enable2FA(userId: string, token: string): Promise<boolean> {
    const user = await db.collection('users').doc(userId).get();
    const encryptedSecret = user.data()?.twoFactorSecret;
    
    if (!encryptedSecret) {
      throw new Error('2FA not initialized');
    }
    
    const secret = encryptionService.decrypt(encryptedSecret);
    const isValid = this.verifyToken(secret, token);
    
    if (isValid) {
      await db.collection('users').doc(userId).update({
        twoFactorEnabled: true,
        twoFactorEnabledAt: FieldValue.serverTimestamp()
      });
    }
    
    return isValid;
  }
  
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Tolérance de 30s
    });
  }
  
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
```

### 3. Améliorer la Validation des Entrées

#### Installer Zod
```bash
npm install zod
```

#### Créer les schémas de validation

Fichier : `backend/functions/src/validators/schemas.ts`

```typescript
import { z } from 'zod';

// Schéma utilisateur
export const userSchema = z.object({
  email: z.string().email().max(254),
  displayName: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[\d\s\-()]{10,}$/).optional(),
  role: z.enum(['super_admin', 'admin', 'manager', 'organizer', 'participant'])
});

// Schéma événement
export const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startDateTime: z.date(),
  endDateTime: z.date(),
  location: z.object({
    type: z.enum(['physical', 'virtual', 'hybrid']),
    address: z.string().max(500).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }),
  capacity: z.number().int().positive().max(100000).optional()
}).refine(data => data.endDateTime > data.startDateTime, {
  message: 'End date must be after start date'
});

// Middleware de validation
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};
```

### 4. Implémenter Google Secret Manager

#### Installer le SDK
```bash
npm install @google-cloud/secret-manager
```

#### Service de gestion des secrets

Fichier : `backend/functions/src/services/secrets/secret-manager.service.ts`

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private projectId: string;
  
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT!;
  }
  
  async getSecret(secretName: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    
    try {
      const [version] = await this.client.accessSecretVersion({ name });
      const payload = version.payload?.data?.toString();
      
      if (!payload) {
        throw new Error(`Secret ${secretName} is empty`);
      }
      
      return payload;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }
  
  async createSecret(secretName: string, secretValue: string): Promise<void> {
    const parent = `projects/${this.projectId}`;
    
    // Créer le secret
    await this.client.createSecret({
      parent,
      secretId: secretName,
      secret: {
        replication: {
          automatic: {}
        }
      }
    });
    
    // Ajouter la version
    await this.client.addSecretVersion({
      parent: `${parent}/secrets/${secretName}`,
      payload: {
        data: Buffer.from(secretValue, 'utf8')
      }
    });
  }
}

// Utilisation
const secretManager = new SecretManagerService();

// Au démarrage de l'app
async function loadSecrets() {
  process.env.JWT_SECRET = await secretManager.getSecret('jwt-secret');
  process.env.ENCRYPTION_KEY = await secretManager.getSecret('encryption-key');
  process.env.STRIPE_SECRET_KEY = await secretManager.getSecret('stripe-secret');
}
```

### 5. Améliorer le Logging de Sécurité

Fichier : `backend/functions/src/utils/security-logger.ts`

```typescript
import * as logger from 'firebase-functions/logger';

export class SecurityLogger {
  static logAuthEvent(
    event: string,
    userId: string | null,
    success: boolean,
    metadata?: any
  ) {
    logger.info('Security Event', {
      category: 'authentication',
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    
    // Si échec, logger avec plus de détails
    if (!success) {
      logger.warn('Authentication Failure', {
        event,
        userId,
        ...metadata
      });
    }
  }
  
  static logAccessDenied(
    userId: string,
    resource: string,
    action: string,
    reason: string
  ) {
    logger.warn('Access Denied', {
      category: 'authorization',
      userId,
      resource,
      action,
      reason,
      timestamp: new Date().toISOString()
    });
  }
  
  static logSuspiciousActivity(
    userId: string | null,
    activity: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: any
  ) {
    logger.warn('Suspicious Activity', {
      category: 'security',
      userId,
      activity,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    
    // Alerter si critique
    if (severity === 'critical') {
      // Envoyer une alerte (email, Slack, PagerDuty)
      this.sendSecurityAlert(activity, metadata);
    }
  }
  
  private static async sendSecurityAlert(activity: string, metadata: any) {
    // Implémenter l'envoi d'alerte
    // Email, Slack, PagerDuty, etc.
  }
}
```

## Commandes Utiles

### Générer une clé de chiffrement
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Audit npm
```bash
npm audit
npm audit fix
npm audit fix --force  # Attention: peut casser des choses
```

### Scanner avec Snyk
```bash
npx snyk test
npx snyk monitor
```

### Tests de sécurité
```bash
# Installer OWASP ZAP
# Lancer un scan
zap-cli quick-scan http://localhost:3000

# Ou utiliser l'interface graphique
```

## Checklist de Déploiement Sécurisé

### Avant chaque déploiement
- [ ] `npm audit` sans vulnérabilités critiques
- [ ] Tests de sécurité passent
- [ ] Secrets dans Secret Manager (pas dans .env)
- [ ] HTTPS activé
- [ ] Headers de sécurité configurés
- [ ] Rate limiting activé
- [ ] Logging de sécurité activé
- [ ] Monitoring configuré
- [ ] Backup configuré
- [ ] Incident response plan à jour

### Après chaque déploiement
- [ ] Vérifier les logs d'erreur
- [ ] Vérifier les métriques de sécurité
- [ ] Tester les endpoints critiques
- [ ] Vérifier les alertes
- [ ] Documenter les changements

## Formation Équipe

### Sujets à couvrir
1. OWASP Top 10
2. Secure coding practices
3. Threat modeling
4. Incident response
5. RGPD et conformité

### Ressources
- [OWASP Top 10](https://owasp.org/Top10/)
- [Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Web Security Academy](https://portswigger.net/web-security)

## Prochaines Étapes

1. **Cette semaine** : Implémenter le chiffrement et 2FA
2. **Semaine prochaine** : Google Secret Manager et logging
3. **Mois prochain** : Tests de pénétration et audit
4. **Continu** : Monitoring, mises à jour, formation

## Configuration des Variables d'Environnement

### Fichier `.env` (développement)

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=generate-with-crypto-randomBytes-32-hex

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Database
FIRESTORE_EMULATOR_HOST=localhost:8080

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Environment
NODE_ENV=development
```

### Google Secret Manager (production)

```bash
# Créer les secrets
gcloud secrets create jwt-access-secret --data-file=- <<< "your-production-secret"
gcloud secrets create jwt-refresh-secret --data-file=- <<< "your-production-secret"
gcloud secrets create encryption-key --data-file=- <<< "$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"
gcloud secrets create stripe-secret-key --data-file=- <<< "sk_live_..."

# Donner accès aux Cloud Functions
gcloud secrets add-iam-policy-binding jwt-access-secret \
  --member="serviceAccount:your-project@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Middleware de Sécurité

### Middleware d'authentification amélioré

Fichier : `backend/functions/src/middleware/auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/security.config';
import { SecurityLogger } from '../utils/security-logger';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      SecurityLogger.logAuthEvent('token_missing', null, false, {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET) as any;
      
      // Vérifier si le token est dans la blacklist
      const isBlacklisted = await checkTokenBlacklist(token);
      if (isBlacklisted) {
        SecurityLogger.logAuthEvent('token_blacklisted', decoded.uid, false, {
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          error: 'Token révoqué'
        });
      }
      
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId
      };
      
      SecurityLogger.logAuthEvent('token_verified', decoded.uid, true, {
        ip: req.ip,
        path: req.path
      });
      
      next();
    } catch (error) {
      SecurityLogger.logAuthEvent('token_invalid', null, false, {
        ip: req.ip,
        error: error.message
      });
      return res.status(401).json({
        success: false,
        error: 'Token invalide ou expiré'
      });
    }
  } catch (error) {
    next(error);
  }
};

async function checkTokenBlacklist(token: string): Promise<boolean> {
  // Implémenter la vérification dans Redis ou Firestore
  // Pour l'instant, retourner false
  return false;
}
```

### Middleware d'autorisation avec ReBAC

Fichier : `backend/functions/src/middleware/authorization.middleware.ts`

```typescript
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { SecurityLogger } from '../utils/security-logger';
import { ReBACService } from '../services/rebac/rebac.service';

const rebacService = new ReBACService();

export const authorize = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }
      
      const { uid, tenantId } = req.user;
      const resourceId = req.params.id || req.params.eventId || req.params.organizationId;
      
      // Vérifier la permission avec ReBAC
      const hasPermission = await rebacService.check(
        `user:${uid}`,
        action,
        `${resource}:${resourceId}`
      );
      
      if (!hasPermission) {
        SecurityLogger.logAccessDenied(uid, resource, action, 'ReBAC check failed');
        return res.status(403).json({
          success: false,
          error: 'Accès refusé'
        });
      }
      
      next();
    } catch (error) {
      SecurityLogger.logSuspiciousActivity(
        req.user?.uid || null,
        'authorization_error',
        'medium',
        { error: error.message, resource, action }
      );
      next(error);
    }
  };
};

// Middleware pour vérifier le tenant
export const checkTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
    }
    
    const requestTenantId = req.params.tenantId || req.body.tenantId;
    
    if (requestTenantId && requestTenantId !== req.user.tenantId) {
      SecurityLogger.logSuspiciousActivity(
        req.user.uid,
        'tenant_mismatch',
        'high',
        {
          userTenant: req.user.tenantId,
          requestTenant: requestTenantId,
          ip: req.ip
        }
      );
      return res.status(403).json({
        success: false,
        error: 'Accès refusé à cette organisation'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
```

### Middleware de sanitisation des entrées

Fichier : `backend/functions/src/middleware/sanitize.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitiser le body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitiser les query params
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitiser les params
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

function sanitizeString(str: string): string {
  // Supprimer les balises HTML dangereuses
  let sanitized = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Échapper les caractères spéciaux pour NoSQL injection
  sanitized = sanitized.replace(/[${}]/g, '');
  
  return sanitized;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}
```

## Protection CSRF

### Middleware CSRF

Fichier : `backend/functions/src/middleware/csrf.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'X-CSRF-Token';

export class CSRFProtection {
  private tokens: Map<string, { token: string; expires: number }> = new Map();
  
  generateToken(sessionId: string): string {
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 heure
    
    this.tokens.set(sessionId, { token, expires });
    
    // Nettoyer les tokens expirés
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) {
      return false;
    }
    
    if (stored.expires < Date.now()) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    return stored.token === token;
  }
  
  private cleanupExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

const csrfProtection = new CSRFProtection();

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ignorer les requêtes GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = req.session?.id || req.user?.uid;
  const token = req.headers[CSRF_HEADER.toLowerCase()] as string;
  
  if (!sessionId || !token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token manquant'
    });
  }
  
  if (!csrfProtection.validateToken(sessionId, token)) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token invalide'
    });
  }
  
  next();
};

export const generateCSRFToken = (req: Request, res: Response) => {
  const sessionId = req.session?.id || req.user?.uid;
  
  if (!sessionId) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié'
    });
  }
  
  const token = csrfProtection.generateToken(sessionId);
  
  res.json({
    success: true,
    csrfToken: token
  });
};
```
