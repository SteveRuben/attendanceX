# Système de Middlewares Harmonisé

Ce document explique comment utiliser le système de middlewares harmonisé, en particulier le rate limiting.

## Architecture

Le système est organisé en plusieurs couches :

1. **rateLimit.ts** - Middleware de rate limiting personnalisé utilisant Firestore
2. **security.middleware.ts** - Middlewares de sécurité généraux
3. **presence-security.middleware.ts** - Middlewares spécifiques à la présence
4. **index.ts** - Point d'entrée centralisé avec presets
5. **types/middleware.types.ts** - Types TypeScript

## Rate Limiting

### Utilisation de base

```typescript
import { rateLimit, rateLimitConfigs } from './middleware/rateLimit';

// Utiliser une configuration prédéfinie
const authLimit = rateLimit(rateLimitConfigs.auth);

// Configuration personnalisée
const customLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: "Trop de requêtes",
  keyGenerator: (req) => req.ip
});
```

### Configurations disponibles

- `general` - Rate limiting général (100 req/15min)
- `auth` - Authentification (5 req/5min)
- `register` - Inscription (3 req/5min)
- `presenceClocking` - Pointage (5 req/min)
- `presenceManagement` - Gestion présence (20 req/min)
- `presenceReports` - Rapports (3 req/5min)
- `presenceValidation` - Validations (10 req/min)
- `presenceCorrection` - Corrections (5 req/min)

### Environnements

Le système s'adapte automatiquement selon `process.env.APP_ENV` :
- **development** : Limites plus permissives
- **production** : Limites strictes

## Presets de Middlewares

### Utilisation des presets

```typescript
import { middlewarePresets } from './middleware';

// Route publique
app.get('/public', ...middlewarePresets.public, handler);

// Route d'authentification
app.post('/auth/login', ...middlewarePresets.auth, handler);

// Route de présence
app.post('/presence/clock-in', ...middlewarePresets.presence, handler);

// Route de gestion
app.get('/management/reports', ...middlewarePresets.management, handler);

// Route admin
app.delete('/admin/users/:id', ...middlewarePresets.admin, handler);
```

### Presets disponibles

- `public` - Routes publiques sans auth
- `auth` - Routes d'authentification
- `protected` - Routes protégées standard
- `presence` - Routes de présence avec validations spéciales
- `management` - Routes de gestion
- `reports` - Routes de rapports
- `admin` - Routes administrateur

## Middlewares Spécialisés

### Présence

```typescript
import { 
  clockingRateLimit,
  detectSuspiciousClocking,
  validateLocationIntegrity,
  auditPresenceAction 
} from './middleware';

app.post('/presence/clock-in', 
  clockingRateLimit,
  detectSuspiciousClocking,
  validateLocationIntegrity,
  auditPresenceAction,
  handler
);
```

### Sécurité

```typescript
import { 
  authenticateToken,
  authorize,
  validateSensitiveDataAccess 
} from './middleware';

app.get('/sensitive-data',
  authenticateToken,
  authorize(['admin', 'manager']),
  validateSensitiveDataAccess,
  handler
);
```

## Utilitaires

### Combinaison de middlewares

```typescript
import { middlewareUtils } from './middleware';

const combinedMiddleware = middlewareUtils.combine(
  rateLimit(rateLimitConfigs.general),
  authenticateToken,
  validateAccess('resource', 'read')
);

app.get('/resource', combinedMiddleware, handler);
```

### Middleware conditionnel

```typescript
const conditionalAuth = middlewareUtils.conditional(
  (req) => req.path.startsWith('/protected'),
  authenticateToken
);

app.use(conditionalAuth);
```

### Middleware avec timeout

```typescript
const timedMiddleware = middlewareUtils.withTimeout(
  someSlowMiddleware,
  5000 // 5 secondes
);
```

## Configuration

### Variables d'environnement

```env
APP_ENV=development|production
FIRESTORE_EMULATOR_HOST=localhost:8080  # Pour le développement
```

### Personnalisation

Pour ajouter de nouvelles configurations de rate limiting :

```typescript
// Dans rateLimit.ts
export const rateLimitConfigs = {
  // ... configurations existantes
  
  myCustomLimit: {
    windowMs: 60 * 1000,
    maxRequests: isDevelopment ? 100 : 20,
    keyGenerator: (req: Request) => `custom_${req.ip}`,
    message: "Limite personnalisée atteinte"
  }
};
```

## Monitoring et Debugging

### Logs

Le système génère des logs détaillés :

```typescript
// Logs automatiques pour :
- Dépassements de limites
- Activités suspectes
- Erreurs de validation
- Actions sensibles
```

### Nettoyage

```typescript
import { cleanupRateLimits, cleanupSecurityData } from './middleware';

// Nettoyer les anciennes données (à exécuter périodiquement)
await cleanupRateLimits();
cleanupSecurityData();
```

## Migration depuis express-rate-limit

Si vous utilisiez `express-rate-limit` :

```typescript
// Avant
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Après
import { rateLimit, rateLimitConfigs } from './middleware/rateLimit';
const limiter = rateLimit(rateLimitConfigs.general);
// ou
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100  // Note: 'maxRequests' au lieu de 'max'
});
```

## Bonnes Pratiques

1. **Utilisez les presets** quand possible
2. **Adaptez les limites** selon votre usage
3. **Surveillez les logs** pour détecter les abus
4. **Nettoyez régulièrement** les anciennes données
5. **Testez en développement** avec des limites permissives
6. **Utilisez des clés spécifiques** pour un rate limiting précis

## Dépannage

### Problèmes courants

1. **Rate limiting trop strict** : Vérifiez `APP_ENV`
2. **Erreurs Firestore** : Vérifiez la connexion à la base
3. **Types manquants** : Importez depuis `types/middleware.types.ts`
4. **Middlewares non appliqués** : Vérifiez l'ordre d'application

### Debug

```typescript
// Activer les logs détaillés
process.env.DEBUG = 'middleware:*';

// Vérifier l'état du rate limiting
console.log('Rate limit configs:', rateLimitConfigs);
```