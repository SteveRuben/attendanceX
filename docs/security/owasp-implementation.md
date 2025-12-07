# OWASP Top 10 - Guide d'Implémentation pour AttendanceX

> 📚 **Navigation** : [Retour à la documentation sécurité](./README.md) | [Vue d'ensemble](./security-overview.md) | [Checklist](./owasp-checklist.md)

## Vue d'ensemble

Ce document détaille l'implémentation des recommandations OWASP Top 10 (2021) pour sécuriser AttendanceX. Chaque vulnérabilité est analysée avec son état actuel, les risques, et les solutions concrètes à implémenter.

## OWASP Top 10 (2021)

1. A01:2021 – Broken Access Control
2. A02:2021 – Cryptographic Failures
3. A03:2021 – Injection
4. A04:2021 – Insecure Design
5. A05:2021 – Security Misconfiguration
6. A06:2021 – Vulnerable and Outdated Components
7. A07:2021 – Identification and Authentication Failures
8. A08:2021 – Software and Data Integrity Failures
9. A09:2021 – Security Logging and Monitoring Failures
10. A10:2021 – Server-Side Request Forgery (SSRF)

---

## A01: Broken Access Control ⚠️

### Description
Les failles de contrôle d'accès permettent aux utilisateurs d'agir en dehors de leurs permissions prévues. C'est la vulnérabilité #1 en 2021.

### Risques pour AttendanceX
- Accès non autorisé aux données d'autres organisations (multi-tenant)
- Élévation de privilèges (participant → admin)
- IDOR : Accès aux présences/événements d'autres utilisateurs
- Bypass des vérifications de rôles

### État Actuel
✅ **Implémenté** :
- Middleware d'authentification JWT
- Vérification basique des rôles
- Isolation par tenantId dans Firestore

⚠️ **À améliorer** :
- Contrôle d'accès granulaire (ReBAC)
- Vérification systématique du tenantId
- Tests d'autorisation complets

### Solution : Implémenter ReBAC

**Voir** : `.kiro/specs/rebac-authorization/` pour la spécification complète

```typescript
// Middleware ReBAC
export const checkPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.uid;
    const resourceId = req.params.id;
    
    const hasPermission = await rebacService.check({
      user: userId,
      relation: action,
      object: `${resource}:${resourceId}`
    });
    
    if (!hasPermission) {
      SecurityLogger.logAccessDenied(userId, resource, action, 'ReBAC check failed');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};

// Utilisation
router.get('/events/:id', 
  authenticate,
  checkPermission('event', 'view'),
  getEvent
);
```

### Tests Requis
```typescript
describe('Access Control', () => {
  it('should deny access to other tenant data', async () => {
    const response = await request(app)
      .get('/api/events/tenant2-event-id')
      .set('Authorization', `Bearer ${tenant1Token}`);
    
    expect(response.status).toBe(403);
  });
  
  it('should prevent privilege escalation', async () => {
    const response = await request(app)
      .post('/api/users/make-admin')
      .set('Authorization', `Bearer ${participantToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

---

## A02: Cryptographic Failures ⚠️

### Description
Échecs liés au chiffrement exposant des données sensibles.

### Risques pour AttendanceX
- Données personnelles (emails, téléphones, adresses) en clair
- Tokens et secrets exposés
- Mots de passe faibles ou mal hashés
- Données en transit non chiffrées

### État Actuel
✅ **Implémenté** :
- Bcrypt pour mots de passe (12 rounds)
- HTTPS en production
- JWT signés

❌ **Manquant** :
- Chiffrement des PII au repos
- Google Secret Manager
- Rotation des clés

### Solution : Service de Chiffrement

```typescript
// backend/functions/src/services/security/encryption.service.ts
import * as crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private key: Buffer;
  
  constructor() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

### Données à Chiffrer
- ✅ Mots de passe (Bcrypt)
- ❌ Numéros de téléphone
- ❌ Adresses postales
- ❌ Informations bancaires (si applicable)
- ❌ Tokens d'intégration
- ❌ Secrets API

### Google Secret Manager

```typescript
// backend/functions/src/services/security/secret-manager.service.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManagerService {
  private client = new SecretManagerServiceClient();
  private projectId = process.env.GOOGLE_CLOUD_PROJECT!;
  
  async getSecret(name: string): Promise<string> {
    const [version] = await this.client.accessSecretVersion({
      name: `projects/${this.projectId}/secrets/${name}/versions/latest`
    });
    
    return version.payload?.data?.toString() || '';
  }
  
  async createSecret(name: string, value: string): Promise<void> {
    await this.client.createSecret({
      parent: `projects/${this.projectId}`,
      secretId: name,
      secret: { replication: { automatic: {} } }
    });
    
    await this.client.addSecretVersion({
      parent: `projects/${this.projectId}/secrets/${name}`,
      payload: { data: Buffer.from(value, 'utf8') }
    });
  }
}
```

---

## A03: Injection ✅

### Description
Injection de code malveillant (SQL, NoSQL, XSS, Command Injection).

### Risques pour AttendanceX
- NoSQL injection dans Firestore
- XSS dans les descriptions d'événements
- Command injection si exécution de commandes shell

### État Actuel
✅ **Bon** :
- Firestore (pas de SQL direct)
- TypeScript avec types stricts
- Validation basique

⚠️ **À améliorer** :
- Validation stricte avec Zod
- Sanitisation HTML
- CSP stricte

### Solution : Validation avec Zod

```typescript
// backend/functions/src/validators/event.validator.ts
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .trim(),
  
  description: z.string()
    .max(5000, 'Description too long')
    .optional()
    .transform(val => val ? sanitizeHtml(val) : val),
  
  startDateTime: z.coerce.date()
    .refine(date => date > new Date(), 'Start date must be in future'),
  
  endDateTime: z.coerce.date(),
  
  location: z.object({
    type: z.enum(['physical', 'virtual', 'hybrid']),
    address: z.string().max(500).optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }),
  
  capacity: z.number()
    .int()
    .positive()
    .max(100000)
    .optional()
}).refine(
  data => data.endDateTime > data.startDateTime,
  { message: 'End date must be after start date' }
);

// Middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};
```

### Sanitisation HTML

```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target'],
    ALLOWED_URI_REGEXP: /^https?:\/\//
  });
}
```

---

## A04: Insecure Design ⚠️

### Description
Failles de conception fondamentales dans l'architecture.

### Risques pour AttendanceX
- Absence de threat modeling
- Pas de rate limiting par utilisateur
- Pas de circuit breaker
- Business logic flaws

### Solution : Patterns Sécurisés

**Rate Limiting par Utilisateur**
```typescript
// backend/functions/src/middleware/user-rate-limit.middleware.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

const userRateLimiter = new RateLimiterMemory({
  points: 100, // 100 requêtes
  duration: 60, // par minute
  blockDuration: 60 * 15 // bloquer 15 minutes
});

export const userRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.uid;
  
  if (!userId) {
    return next();
  }
  
  try {
    await userRateLimiter.consume(userId);
    next();
  } catch {
    SecurityLogger.logSuspiciousActivity(
      userId,
      'Rate limit exceeded',
      'medium',
      { endpoint: req.path }
    );
    
    res.status(429).json({
      error: 'Too many requests, please slow down'
    });
  }
};
```

**Circuit Breaker**
```typescript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const breaker = new CircuitBreaker(externalApiCall, options);

breaker.fallback(() => ({ error: 'Service temporarily unavailable' }));
breaker.on('open', () => logger.error('Circuit breaker opened'));
```

---

## A05: Security Misconfiguration 🟡

### Description
Configuration de sécurité incorrecte ou par défaut.

### État Actuel
✅ **Implémenté** :
- Helmet.js
- CORS configuré
- Variables d'environnement

⚠️ **À améliorer** :
- CSP plus stricte
- Désactiver messages d'erreur détaillés en prod
- Supprimer endpoints de debug

### Solution : Configuration Stricte

```typescript
// backend/functions/src/middleware/security-headers.middleware.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
});

// Gestion des erreurs en production
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
};
```

---

## A06: Vulnerable Components 🟡

### Description
Utilisation de composants avec des vulnérabilités connues.

### Solution : Audit Automatisé

```bash
# Audit npm
npm audit
npm audit fix

# Avec Snyk
npx snyk test
npx snyk monitor

# Dependabot (GitHub)
# Activer dans Settings > Security > Dependabot
```

**CI/CD Integration**
```yaml
# .github/workflows/security.yml
name: Security Audit

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit --audit-level=high
      - run: npx snyk test --severity-threshold=high
```

---

## A07: Authentication Failures 🟢

### Description
Failles d'authentification et de gestion de session.

### État Actuel
✅ **Bon** :
- JWT avec expiration
- Bcrypt (12 rounds)
- Rate limiting sur login
- Validation de force de mot de passe

⚠️ **À ajouter** :
- 2FA obligatoire pour admins
- Account lockout
- Détection credential stuffing

### Solution : 2FA avec TOTP

```typescript
// backend/functions/src/services/auth/two-factor.service.ts
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export class TwoFactorService {
  async setup(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `AttendanceX (${email})`,
      issuer: 'AttendanceX',
      length: 32
    });
    
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    
    await db.collection('users').doc(userId).update({
      twoFactorSecret: encryptionService.encrypt(secret.base32),
      twoFactorEnabled: false
    });
    
    return {
      secret: secret.base32,
      qrCode,
      backupCodes: this.generateBackupCodes()
    };
  }
  
  async verify(userId: string, token: string): Promise<boolean> {
    const user = await db.collection('users').doc(userId).get();
    const encryptedSecret = user.data()?.twoFactorSecret;
    
    if (!encryptedSecret) return false;
    
    const secret = encryptionService.decrypt(encryptedSecret);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
  }
  
  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  }
}
```

---

## A08: Data Integrity Failures ⚠️

### Description
Échecs de vérification de l'intégrité des données et du code.

### Solution : Signatures et Checksums

```typescript
// Signer les données critiques
export function signData(data: any): string {
  const payload = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', process.env.SIGNING_KEY!)
    .update(payload)
    .digest('hex');
  
  return signature;
}

export function verifySignature(data: any, signature: string): boolean {
  const expectedSignature = signData(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Webhook verification
export const verifyWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-signature'] as string;
  const isValid = verifySignature(req.body, signature);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};
```

---

## A09: Logging & Monitoring Failures ⚠️

### Description
Absence de logging et monitoring de sécurité.

### Solution : Security Logger

```typescript
// backend/functions/src/utils/security-logger.ts
import * as logger from 'firebase-functions/logger';

export class SecurityLogger {
  static logAuthEvent(event: string, userId: string | null, success: boolean, metadata?: any) {
    const logData = {
      category: 'authentication',
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
      ip: metadata?.ip,
      userAgent: metadata?.userAgent
    };
    
    if (success) {
      logger.info('Auth Event', logData);
    } else {
      logger.warn('Auth Failure', logData);
    }
  }
  
  static logAccessDenied(userId: string, resource: string, action: string, reason: string) {
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
    
    if (severity === 'critical') {
      this.sendAlert(activity, metadata);
    }
  }
  
  private static async sendAlert(activity: string, metadata: any) {
    // Envoyer alerte (email, Slack, PagerDuty)
  }
}
```

---

## A10: SSRF (Server-Side Request Forgery) ✅

### Description
Forcer le serveur à faire des requêtes non autorisées.

### Solution : Whitelist de Domaines

```typescript
const ALLOWED_DOMAINS = [
  'api.stripe.com',
  'api.twilio.com',
  'api.sendgrid.com'
];

const BLOCKED_IPS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./
];

export function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Bloquer IPs privées
    if (BLOCKED_IPS.some(pattern => pattern.test(parsed.hostname))) {
      return false;
    }
    
    // Whitelist des domaines
    return ALLOWED_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function safeFetch(url: string, options?: RequestInit) {
  if (!isUrlSafe(url)) {
    throw new Error('URL not allowed');
  }
  
  return fetch(url, {
    ...options,
    timeout: 5000 // 5 secondes max
  });
}
```

---

## Plan d'Action Prioritaire

### 🔴 Semaine 1-2 (Critique)
1. ✅ Créer `security.config.ts`
2. ❌ Implémenter `EncryptionService`
3. ❌ Implémenter `TwoFactorService`
4. ❌ Implémenter `SecurityLogger`
5. ❌ Ajouter validation Zod

### 🟡 Semaine 3-4 (Important)
6. ❌ Google Secret Manager
7. ❌ ReBAC complet
8. ❌ Tests de sécurité
9. ❌ Monitoring et alertes
10. ❌ CSP stricte

### 🟢 Mois 2-3 (Recommandé)
11. ❌ Penetration testing
12. ❌ Bug bounty
13. ❌ Security training
14. ❌ Incident response plan
15. ❌ Disaster recovery

## Ressources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
