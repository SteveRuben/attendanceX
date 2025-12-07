# OWASP Security Checklist - AttendanceX

## A01: Broken Access Control ⚠️

### Backend
- [x] Authentification JWT sur toutes les routes protégées
- [x] Middleware de vérification des rôles
- [ ] **Implémenter ReBAC** pour contrôle d'accès granulaire
- [ ] Vérifier l'accès aux ressources par tenantId
- [ ] Tester les élévations de privilèges
- [ ] Implémenter CORS strict
- [ ] Valider les IDs de ressources (pas de IDOR)
- [ ] Limiter les actions par rôle

### Frontend
- [ ] Cacher les éléments UI selon les permissions
- [ ] Ne jamais se fier uniquement au frontend
- [ ] Valider côté serveur toutes les actions

### Tests
- [ ] Tests d'accès non autorisé
- [ ] Tests d'élévation de privilèges
- [ ] Tests IDOR (Insecure Direct Object Reference)

## A02: Cryptographic Failures ⚠️

### Données au Repos
- [x] Mots de passe hashés avec Bcrypt (12 rounds)
- [ ] **Chiffrer les données sensibles** (PII, tokens, secrets)
- [ ] Utiliser Google Secret Manager pour les secrets
- [ ] Chiffrer les backups
- [ ] Rotation des clés de chiffrement

### Données en Transit
- [x] HTTPS obligatoire en production
- [x] TLS 1.2+ uniquement
- [ ] Certificate pinning (mobile app)
- [ ] HSTS headers

### Implémentation
```typescript
// À implémenter
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

## A03: Injection 🟢

### SQL Injection
- [x] Utilisation de Firestore (NoSQL) - Pas de SQL direct
- [x] Paramètres typés avec TypeScript

### NoSQL Injection
- [x] Validation des entrées
- [ ] **Sanitiser toutes les entrées utilisateur**
- [ ] Utiliser des bibliothèques de validation (Zod, Joi)
- [ ] Whitelist des caractères autorisés

### Command Injection
- [ ] Ne jamais exécuter de commandes shell avec input utilisateur
- [ ] Si nécessaire, utiliser une whitelist stricte

### XSS (Cross-Site Scripting)
- [ ] **Échapper toutes les sorties HTML**
- [ ] Content Security Policy stricte
- [ ] Utiliser DOMPurify pour le HTML utilisateur
- [ ] HttpOnly cookies

### Implémentation
```typescript
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Validation avec Zod
const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.date(),
  // ...
});

// Sanitisation HTML
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}
```

## A04: Insecure Design ⚠️

### Architecture
- [x] Multi-tenant avec isolation
- [ ] **Threat modeling** pour chaque fonctionnalité
- [ ] Security by design
- [ ] Principe du moindre privilège
- [ ] Defense in depth

### Patterns Sécurisés
- [ ] Implémenter rate limiting par utilisateur
- [ ] Implémenter circuit breaker
- [ ] Timeout sur toutes les opérations
- [ ] Validation des business rules
- [ ] Audit trail complet

## A05: Security Misconfiguration 🟡

### Configuration
- [x] Helmet.js pour headers de sécurité
- [ ] **Désactiver les messages d'erreur détaillés en production**
- [ ] Supprimer les endpoints de debug en production
- [ ] Configurer CORS strictement
- [ ] Désactiver directory listing
- [ ] Supprimer les fichiers inutiles

### Headers de Sécurité
```typescript
// À améliorer
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // À améliorer
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

### Environnement
- [ ] Variables d'environnement pour tous les secrets
- [ ] Pas de secrets dans le code
- [ ] Pas de secrets dans Git
- [ ] Utiliser Google Secret Manager

## A06: Vulnerable Components 🟡

### Dépendances
- [ ] **Audit npm régulier** : `npm audit`
- [ ] Mettre à jour les dépendances régulièrement
- [ ] Utiliser Dependabot
- [ ] Scanner avec Snyk ou similaire
- [ ] Vérifier les licences

### Commandes
```bash
# Audit des vulnérabilités
npm audit
npm audit fix

# Vérifier les dépendances obsolètes
npm outdated

# Mettre à jour
npm update

# Scanner avec Snyk
npx snyk test
npx snyk monitor
```

## A07: Authentication Failures 🟢

### Authentification
- [x] JWT avec expiration courte (15min)
- [x] Refresh tokens (7 jours)
- [x] Bcrypt pour mots de passe (12 rounds)
- [x] Validation de force de mot de passe
- [x] Rate limiting sur login (5 tentatives/15min)
- [ ] **Implémenter 2FA obligatoire pour admins**
- [ ] Account lockout après X tentatives
- [ ] Détection de credential stuffing
- [ ] Session management sécurisé

### Mots de Passe
- [x] Minimum 8 caractères
- [x] Majuscule, minuscule, chiffre, symbole
- [ ] Vérifier contre liste de mots de passe compromis (Have I Been Pwned API)
- [ ] Forcer le changement de mot de passe périodique
- [ ] Historique des mots de passe (ne pas réutiliser)

### Implémentation 2FA
```typescript
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

export async function generate2FASecret(userId: string, email: string) {
  const secret = speakeasy.generateSecret({
    name: `AttendanceX (${email})`,
    issuer: 'AttendanceX'
  });
  
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Sauvegarder secret.base32 dans Firestore (chiffré)
  await saveUserSecret(userId, encrypt(secret.base32));
  
  return { secret: secret.base32, qrCode };
}

export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
}
```

## A08: Data Integrity Failures ⚠️

### Intégrité des Données
- [ ] **Signer les données critiques** (JWT, tokens)
- [ ] Vérifier l'intégrité des fichiers uploadés
- [ ] Checksum pour les backups
- [ ] Audit trail avec signatures
- [ ] Validation des webhooks (HMAC)

### CI/CD
- [ ] Signer les builds
- [ ] Vérifier les dépendances (lock files)
- [ ] Scanner les images Docker
- [ ] Environnements isolés

## A09: Logging & Monitoring Failures ⚠️

### Logging
- [x] Logging basique avec Firebase Logger
- [ ] **Logger tous les événements de sécurité**
- [ ] Centraliser les logs
- [ ] Rotation des logs
- [ ] Pas de données sensibles dans les logs

### Monitoring
- [ ] **Alertes sur événements suspects**
- [ ] Dashboard de sécurité
- [ ] Détection d'anomalies
- [ ] Incident response plan

### Événements à Logger
```typescript
// À implémenter
const SECURITY_EVENTS = {
  // Authentification
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGIN_LOCKED: 'auth.login.locked',
  LOGOUT: 'auth.logout',
  
  // Autorisation
  ACCESS_DENIED: 'authz.access.denied',
  PRIVILEGE_ESCALATION: 'authz.privilege.escalation',
  
  // Données
  DATA_ACCESS: 'data.access',
  DATA_MODIFICATION: 'data.modification',
  DATA_DELETION: 'data.deletion',
  DATA_EXPORT: 'data.export',
  
  // Sécurité
  RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  INVALID_TOKEN: 'security.token.invalid',
  SUSPICIOUS_ACTIVITY: 'security.suspicious.activity'
};
```

## A10: SSRF (Server-Side Request Forgery) 🟢

### Protection
- [ ] Whitelist des domaines autorisés
- [ ] Pas d'URLs utilisateur dans les requêtes
- [ ] Valider et sanitiser les URLs
- [ ] Bloquer les IPs privées
- [ ] Timeout sur les requêtes externes

### Implémentation
```typescript
const ALLOWED_DOMAINS = [
  'api.stripe.com',
  'api.twilio.com',
  'api.sendgrid.com'
];

export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Bloquer IPs privées
    if (parsed.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
      return false;
    }
    
    // Whitelist des domaines
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

## Plan d'Action Prioritaire

### 🔴 Critique (Semaine 1-2)
1. Implémenter ReBAC pour contrôle d'accès
2. Chiffrer les données sensibles au repos
3. Implémenter 2FA obligatoire pour admins
4. Améliorer le logging de sécurité
5. Audit npm et mise à jour des dépendances

### 🟡 Important (Semaine 3-4)
6. Implémenter Google Secret Manager
7. Améliorer CSP et headers de sécurité
8. Implémenter monitoring et alertes
9. Tests de sécurité automatisés
10. Documentation de sécurité

### 🟢 Recommandé (Mois 2-3)
11. Penetration testing
12. Bug bounty program
13. Security training équipe
14. Incident response plan
15. Disaster recovery plan

## Outils Recommandés

### Scan de Vulnérabilités
- **npm audit** : Vulnérabilités npm
- **Snyk** : Scan continu
- **OWASP ZAP** : Scan d'application web
- **SonarQube** : Qualité et sécurité du code

### Monitoring
- **Firebase Security Rules** : Firestore
- **Cloud Monitoring** : GCP
- **Sentry** : Error tracking
- **LogRocket** : Session replay

### Tests
- **OWASP ZAP** : Tests automatisés
- **Burp Suite** : Tests manuels
- **Postman** : Tests API
- **Jest** : Tests unitaires de sécurité

## Conformité

### RGPD
- [x] Consentement utilisateur
- [x] Droit à l'oubli
- [ ] Chiffrement des données personnelles
- [ ] Audit trail complet
- [ ] Data breach notification plan

### ISO 27001
- [ ] Politique de sécurité
- [ ] Gestion des risques
- [ ] Contrôles de sécurité
- [ ] Audit régulier

## Ressources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
