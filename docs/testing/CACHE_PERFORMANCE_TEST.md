# 🧪 Tests de Performance du Cache

**Date:** 26 Janvier 2026  
**Objectif:** Mesurer l'impact du cache client et serveur sur les performances

---

## 📊 Métriques à Mesurer

### 1. Cache Client (Frontend)
- **Temps de chargement initial** (sans cache)
- **Temps de chargement avec cache** (hit)
- **Taux de hit du cache**
- **Réduction du nombre d'appels API**

### 2. Cache Serveur (Backend)
- **Temps de réponse API sans cache**
- **Temps de réponse API avec cache**
- **Cold start vs Warm start**
- **Taux de hit du cache serveur**

---

## 🧪 Plan de Test

### Test 1: Performance Cache Client

#### Scénario: Chargement de la page pricing

**Étapes:**
1. Ouvrir la page pricing en navigation privée (pas de cache)
2. Mesurer le temps de chargement des plans
3. Rafraîchir la page (cache actif)
4. Mesurer le temps de chargement avec cache
5. Répéter 10 fois pour avoir une moyenne

**Outils:**
- Chrome DevTools (Network tab)
- Performance tab
- Console logs du cache

**Commandes Console:**
```javascript
// Voir les stats du cache
window.__cache.getStats()

// Voir les clés en cache
window.__cache.keys()

// Vider le cache pour tester
window.__cache.clear()
```

#### Résultats Attendus:
- **Sans cache:** 2-5s (cold start API)
- **Avec cache:** < 100ms (instantané)
- **Réduction:** > 95%

---

### Test 2: Performance Cache Serveur

#### Scénario: Appels API répétés

**Étapes:**
1. Appeler `/public/plans` (cache vide)
2. Mesurer le temps de réponse
3. Appeler `/public/plans` immédiatement après (cache hit)
4. Mesurer le temps de réponse
5. Répéter avec différents endpoints

**Outils:**
- Postman / Thunder Client
- `curl` avec timing
- Firebase Functions logs

**Commandes:**
```bash
# Test sans cache (première requête)
time curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans

# Test avec cache (requête suivante)
time curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans

# Répéter 10 fois
for i in {1..10}; do
  time curl -s https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans > /dev/null
done
```

#### Résultats Attendus:
- **Sans cache (cold start):** 2-5s
- **Sans cache (warm):** 200-500ms
- **Avec cache:** < 50ms
- **Réduction:** > 90%

---

### Test 3: Impact sur l'Expérience Utilisateur

#### Scénario: Navigation complète

**Étapes:**
1. Ouvrir https://attendance-x.vercel.app/
2. Cliquer sur "Pricing"
3. Revenir à l'accueil
4. Retourner sur "Pricing"
5. Mesurer les temps de chargement

**Métriques:**
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)

**Outils:**
- Lighthouse
- Chrome DevTools Performance
- WebPageTest.org

#### Résultats Attendus:
- **TTFB:** < 200ms (avec cache)
- **FCP:** < 1s
- **LCP:** < 2.5s
- **TTI:** < 3s

---

## 📈 Résultats des Tests

### Test 1: Cache Client (À compléter)

| Métrique | Sans Cache | Avec Cache | Amélioration |
|----------|------------|------------|--------------|
| Temps de chargement | ___ ms | ___ ms | ___% |
| Appels API | ___ | ___ | ___% |
| Taille des données | ___ KB | ___ KB | ___% |
| Hit rate | N/A | ___% | N/A |

**Observations:**
- [ ] Cache fonctionne correctement
- [ ] Logs visibles dans la console
- [ ] Stats accessibles via `window.__cache`
- [ ] Cleanup automatique fonctionne

---

### Test 2: Cache Serveur (À compléter)

| Métrique | Cold Start | Warm (no cache) | Warm (cache) | Amélioration |
|----------|------------|-----------------|--------------|--------------|
| Temps de réponse | ___ ms | ___ ms | ___ ms | ___% |
| Logs "Cache HIT" | Non | Non | Oui | N/A |
| Logs "Cache MISS" | Oui | Oui | Non | N/A |

**Observations:**
- [ ] Cache serveur actif
- [ ] Logs visibles dans Firebase Functions
- [ ] TTL de 1 heure respecté
- [ ] Pas d'erreurs

---

### Test 3: Lighthouse Score (À compléter)

| Métrique | Avant Cache | Après Cache | Amélioration |
|----------|-------------|-------------|--------------|
| Performance | ___ | ___ | +___ |
| Accessibility | ___ | ___ | +___ |
| Best Practices | ___ | ___ | +___ |
| SEO | ___ | ___ | +___ |

**URL testée:** https://attendance-x.vercel.app/pricing

---

## 🔍 Instructions de Test Détaillées

### Pour le Cache Client

#### 1. Ouvrir la Console DevTools
```
F12 → Console
```

#### 2. Vérifier que le cache est disponible
```javascript
console.log('Cache disponible:', typeof window.__cache !== 'undefined');
```

#### 3. Vider le cache pour commencer
```javascript
window.__cache.clear();
console.log('Cache vidé');
```

#### 4. Charger la page pricing
```
Naviguer vers /pricing
```

#### 5. Vérifier les logs du cache
```
Chercher dans la console:
- "📦 Cache SET: plans-..."
- "❌ Cache MISS: plans-..."
```

#### 6. Rafraîchir la page
```
F5 ou Ctrl+R
```

#### 7. Vérifier le cache hit
```
Chercher dans la console:
- "✅ Cache HIT: plans-..."
```

#### 8. Voir les statistiques
```javascript
const stats = window.__cache.getStats();
console.table(stats);
```

**Résultat attendu:**
```javascript
{
  hits: 1,
  misses: 1,
  sets: 1,
  size: 1,
  hitRate: 50
}
```

---

### Pour le Cache Serveur

#### 1. Ouvrir Firebase Console
```
https://console.firebase.google.com/
→ Projet: attendance-management-syst
→ Functions
→ Logs
```

#### 2. Filtrer les logs
```
Rechercher: "Cache"
```

#### 3. Faire une requête API
```bash
curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans
```

#### 4. Vérifier les logs
```
Chercher:
- "❌ Cache MISS: Generating plans data"
- "💾 Plans cached for 1 hour"
```

#### 5. Faire une deuxième requête immédiatement
```bash
curl https://api-rvnxjp7idq-ew.a.run.app/v1/public/plans
```

#### 6. Vérifier le cache hit
```
Chercher:
- "✅ Cache HIT: Returning cached plans"
```

---

## 📊 Analyse des Résultats

### Critères de Succès

#### Cache Client
- ✅ Hit rate > 80% après quelques navigations
- ✅ Temps de chargement < 100ms avec cache
- ✅ Réduction des appels API > 80%
- ✅ Pas d'erreurs dans la console

#### Cache Serveur
- ✅ Temps de réponse < 50ms avec cache
- ✅ Logs "Cache HIT" visibles
- ✅ TTL respecté (1 heure)
- ✅ Pas d'erreurs dans les logs

#### Impact Global
- ✅ Lighthouse Performance > 90
- ✅ TTFB < 200ms
- ✅ LCP < 2.5s
- ✅ Expérience utilisateur fluide

---

## 🐛 Problèmes Potentiels

### Cache Client

**Problème:** Cache ne fonctionne pas
- Vérifier que `window.__cache` existe
- Vérifier les logs de la console
- Vider le cache et réessayer

**Problème:** Hit rate trop faible
- Vérifier le TTL (10 minutes par défaut)
- Vérifier que les clés sont cohérentes
- Vérifier le cleanup automatique

### Cache Serveur

**Problème:** Pas de logs "Cache HIT"
- Vérifier que le code est déployé
- Vérifier l'import de `memoryCache`
- Vérifier les logs Firebase

**Problème:** Cache expire trop vite
- Vérifier le TTL (1 heure configuré)
- Vérifier que l'instance reste chaude
- Considérer augmenter le TTL

---

## 📝 Rapport de Test

### Informations Générales
- **Date du test:** ___________
- **Testeur:** ___________
- **Environnement:** Production / Staging
- **Navigateur:** Chrome / Firefox / Safari
- **Version:** ___________

### Résultats Globaux
- [ ] Cache client fonctionne
- [ ] Cache serveur fonctionne
- [ ] Performance améliorée
- [ ] Pas de régression
- [ ] Prêt pour la production

### Recommandations
1. ___________
2. ___________
3. ___________

### Prochaines Étapes
1. ___________
2. ___________
3. ___________

---

## 🔗 Liens Utiles

### Code
- [Cache Client](../../frontend-v2/src/lib/cache.ts)
- [Cache Serveur](../../backend/functions/src/utils/cache.ts)
- [Route Plans](../../backend/functions/src/routes/public/tenant-registration.routes.ts)

### Monitoring
- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Analytics](https://vercel.com/tryptich/attendance-x)
- [Google PageSpeed](https://pagespeed.web.dev/)

### Documentation
- [Performance Analysis](../analysis/PERFORMANCE_ANALYSIS.md)
- [Deployment Guide](../deployment/README.md)

---

**Dernière mise à jour:** 26 Janvier 2026  
**Status:** Prêt pour les tests
