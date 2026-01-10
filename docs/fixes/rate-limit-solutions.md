# Solutions pour les erreurs 429 (Rate Limit)

## 🚨 Problème
Vous recevez des erreurs 429 "Too Many Requests" lors de l'utilisation de l'application.

## ✅ Solutions implémentées

### 1. **Augmentation des limites de rate limiting**

Les limites ont été augmentées pour les routes les plus utilisées :

#### Routes Check-in
- **Avant** : 10 requêtes/minute
- **Après** : 50 requêtes/minute
- **Fichier** : `backend/functions/src/routes/attendance/attendances.routes.ts`

#### Routes QR Codes
- **Génération** : 20 → 100 requêtes/minute
- **Validation** : 50 → 200 requêtes/minute
- **Fichier** : `backend/functions/src/routes/integration/qrcode.routes.ts`

### 2. **Middleware de rate limiting intelligent**

Un nouveau middleware `smartRateLimit` a été créé qui adapte automatiquement les limites selon l'environnement :

```typescript
// backend/functions/src/middleware/smartRateLimit.ts

// En développement : 10x plus permissif
// En test : 5x plus permissif
// En production : limites normales
```

**Presets disponibles** :
- `frequent` : 100 req/min (opérations fréquentes)
- `normal` : 50 req/min (CRUD standard)
- `strict` : 20 req/min (opérations sensibles)
- `veryStrict` : 5 req/min (bulk operations)

### 3. **Système de retry automatique (Frontend)**

Un utilitaire de retry avec backoff exponentiel a été créé :

```typescript
// frontend-v2/src/utils/retryUtils.ts

// Retry automatique sur erreurs 429 et 5xx
// Backoff exponentiel avec jitter
// Presets : critical, normal, background
```

**Utilisation** :
```typescript
import { withRetry, retryPresets } from '@/utils/retryUtils'

// Retry automatique pour opérations critiques
const result = await withRetry(
  () => apiClient.post('/check-in', data),
  retryPresets.critical
)
```

## 🔧 Actions recommandées

### **Option A : Utiliser le smart rate limiting (Recommandé)**

Remplacer les `rateLimit()` existants par `smartRateLimit()` :

```typescript
// Avant
import { rateLimit } from './rateLimit'
router.post('/check-in', rateLimit({ windowMs: 60000, maxRequests: 10 }))

// Après
import { rateLimitPresets } from './smartRateLimit'
router.post('/check-in', rateLimitPresets.frequent())
```

### **Option B : Désactiver temporairement en développement**

Ajouter une condition dans le middleware de rate limiting :

```typescript
// backend/functions/src/middleware/rateLimit.ts

export function rateLimit(config: RateLimitConfig) {
  // Désactiver en développement
  if (process.env.NODE_ENV === 'development') {
    return (req: Request, res: Response, next: NextFunction) => next()
  }
  
  // ... reste du code
}
```

### **Option C : Augmenter les limites globalement**

Modifier les valeurs par défaut dans le middleware :

```typescript
// Multiplier toutes les limites par 5 ou 10
const adjustedMaxRequests = config.maxRequests * 10
```

## 📊 Monitoring des rate limits

### **Vérifier les limites actuelles**

```bash
# Rechercher toutes les configurations de rate limit
grep -r "rateLimit({" backend/functions/src/routes/
```

### **Logs à surveiller**

Les logs Firebase Functions afficheront :
```
Rate limit check: key=ip_xxx, hitCount=X, maxRequests=Y, remaining=Z
```

### **Headers de réponse**

Les réponses incluent des headers informatifs :
- `X-RateLimit-Limit` : Limite maximale
- `X-RateLimit-Remaining` : Requêtes restantes
- `X-RateLimit-Reset` : Timestamp de reset
- `Retry-After` : Secondes à attendre (sur 429)

## 🎯 Recommandations par type d'opération

### **Check-in / Validation (Haute fréquence)**
```typescript
rateLimitPresets.frequent() // 100 req/min en prod, 2000 en dev
```

### **CRUD standard (Fréquence normale)**
```typescript
rateLimitPresets.normal() // 50 req/min en prod, 500 en dev
```

### **Création / Suppression (Sensible)**
```typescript
rateLimitPresets.strict() // 20 req/min en prod, 100 en dev
```

### **Bulk operations (Très sensible)**
```typescript
rateLimitPresets.veryStrict() // 5 req/min en prod, 10 en dev
```

## 🚀 Déploiement

### **1. Redéployer les fonctions backend**

```bash
cd backend/functions
npm run deploy
```

### **2. Redémarrer le serveur de développement**

```bash
# Backend
cd backend
npm run serve

# Frontend
cd frontend-v2
npm run dev
```

### **3. Vider le cache**

```bash
# Vider le cache Redis/Firestore des rate limits
# (Les limites se réinitialisent automatiquement après la fenêtre de temps)
```

## 🔍 Debugging

### **Identifier quelle route cause le problème**

Regarder les logs de la console frontend :
```javascript
// Les erreurs 429 afficheront l'URL et les headers
console.error('Rate limit exceeded:', error.response)
```

### **Tester les limites**

```bash
# Script de test de charge
for i in {1..100}; do
  curl -X POST http://localhost:5001/api/v1/check-in \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"eventId":"test"}' &
done
```

## 📝 Notes importantes

1. **En production** : Garder des limites raisonnables pour éviter les abus
2. **En développement** : Utiliser des limites plus permissives
3. **Monitoring** : Surveiller les métriques de rate limiting
4. **Alertes** : Configurer des alertes si trop de 429 en production
5. **Documentation** : Documenter les limites dans l'API

## 🆘 Support

Si les erreurs 429 persistent :

1. Vérifier les logs Firebase Functions
2. Vérifier la configuration de l'environnement (`APP_ENV`, `NODE_ENV`)
3. Augmenter temporairement les limites
4. Contacter l'équipe backend pour ajuster les limites globales