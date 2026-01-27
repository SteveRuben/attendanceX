# Issues Critiques Trouvés - Tests E2E Production

**Date:** 27 janvier 2026  
**Tests Exécutés:** 77/330 (23%)  
**Status:** ❌ **ÉCHEC CRITIQUE**

## 🚨 Bugs Critiques (À Corriger Immédiatement)

### 1. API Client Error - TypeError: t.startsWith is not a function

**Sévérité:** 🔴 **CRITIQUE**  
**Impact:** Empêche le chargement des événements et des filtres  
**Fichier:** `frontend-v2/src/services/apiClient.ts`

**Erreur Console:**
```
Error loading events: TypeError: t.startsWith is not a function
    at Object.request (https://attendance-x.vercel.app/_next/static/chunks/pages/_app-3f18f8417b51eb47.js:16:149454)
    at https://attendance-x.vercel.app/_next/static/chunks/7232-3372b7f4d66ff085.js:1:7646
```

**Cause Probable:**
Le code vérifie `t.startsWith()` sur une variable qui n'est pas une string. Probablement dans la fonction `request()` de l'API client.

**Solution:**
```typescript
// Dans apiClient.ts, ligne ~149454
// AVANT (incorrect):
if (endpoint.startsWith('/api/')) { ... }

// APRÈS (correct):
if (typeof endpoint === 'string' && endpoint.startsWith('/api/')) { ... }
```

**Tests Affectés:**
- ❌ All events loading tests
- ❌ All filter tests
- ❌ All search tests

---

### 2. Texte de Titre Incorrect

**Sévérité:** 🟡 **HAUTE**  
**Impact:** Tous les tests qui vérifient le titre échouent  
**Fichier:** `frontend-v2/src/pages/events/index.tsx`

**Attendu:** "Découvrir des Événements"  
**Actuel:** "Découvrez des Événements Incroyables"

**Solution:**
```typescript
// Dans events/index.tsx
// Changer le titre du hero
<h1>Découvrir des Événements</h1>
// OU mettre à jour tous les tests pour utiliser le nouveau texte
```

**Tests Affectés:**
- ❌ smoke.spec.ts: should load the events discovery page
- ❌ smoke.spec.ts: should be responsive on mobile
- ❌ smoke.spec.ts: should have no layout shifts
- ❌ public-events.spec.ts: should display the events discovery page
- ❌ public-events.spec.ts: should have proper heading hierarchy
- ❌ user-journey.spec.ts: mobile responsive experience

---

### 3. Bouton "Se connecter" Manquant

**Sévérité:** 🟡 **HAUTE**  
**Impact:** Navigation cassée  
**Fichier:** `frontend-v2/src/components/layout/PublicLayout.tsx`

**Erreur:**
```
Error: element(s) not found
Locator: getByRole('button', { name: /Se connecter/i })
```

**Cause:**
Le bouton "Se connecter" n'existe pas ou a un texte différent dans la navigation.

**Solution:**
Vérifier le texte exact du bouton dans PublicLayout et s'assurer qu'il correspond.

**Tests Affectés:**
- ❌ smoke.spec.ts: should have working navigation

---

### 4. Panneau de Filtres Non Fonctionnel

**Sévérité:** 🟡 **HAUTE**  
**Impact:** Filtrage des événements impossible  
**Fichier:** `frontend-v2/src/pages/events/index.tsx`

**Erreur:**
```
Error: element(s) not found
Locator: getByText('Catégorie')
```

**Cause:**
Le panneau de filtres ne s'ouvre pas ou les labels sont différents.

**Solution:**
1. Vérifier que le bouton "Filtres" ouvre bien le panneau
2. Vérifier les labels exacts: "Catégorie", "Lieu", "Prix"
3. S'assurer que le panneau est visible après le clic

**Tests Affectés:**
- ❌ smoke.spec.ts: should toggle filters panel
- ❌ public-events.spec.ts: should open and close filters panel

---

## ⚠️ Problèmes de Performance

### 5. Temps de Chargement Excessif (Firefox)

**Sévérité:** 🟠 **MOYENNE**  
**Impact:** Timeouts sur Firefox, mauvaise UX

**Métriques:**
- **Chrome:** ~2.7s (Acceptable)
- **Firefox:** ~15.5s (❌ INACCEPTABLE)
- **Seuil:** < 5s

**Cause Probable:**
- Problème de compatibilité Firefox
- Requêtes API qui bloquent
- Ressources non optimisées

**Solution:**
1. Profiler avec Firefox DevTools
2. Optimiser les requêtes API (batching, cache)
3. Lazy loading des composants lourds
4. Code splitting

**Tests Affectés:**
- ❌ 17 tests de performance sur Firefox (timeouts)

---

## 🐛 Bugs Techniques

### 6. response.timing() Non Supporté

**Sévérité:** 🟢 **BASSE**  
**Impact:** Tests de performance API échouent  
**Fichier:** `frontend-v2/tests/e2e/performance.spec.ts`

**Erreur:**
```
TypeError: response.timing is not a function
```

**Cause:**
La méthode `response.timing()` n'existe pas dans Playwright.

**Solution:**
```typescript
// Utiliser response.timing() correctement
const timing = await response.timing();
// OU utiliser une autre méthode pour mesurer les temps API
```

---

### 7. Mobile Tap Non Supporté

**Sévérité:** 🟢 **BASSE**  
**Impact:** Tests mobile échouent  
**Fichier:** `frontend-v2/tests/e2e/performance.spec.ts`

**Erreur:**
```
Error: The page does not support tap. Use hasTouch context option to enable touch support.
```

**Solution:**
```typescript
// Dans playwright.config.ts, ajouter hasTouch pour mobile
{
  name: 'Mobile Chrome',
  use: { 
    ...devices['Pixel 5'],
    hasTouch: true  // Ajouter cette ligne
  },
}
```

---

### 8. Memory Metrics Non Disponibles

**Sévérité:** 🟢 **BASSE**  
**Impact:** Tests de mémoire échouent  
**Fichier:** `frontend-v2/tests/e2e/performance.spec.ts`

**Erreur:**
```
usedJSHeapSize: 'NaN MB'
Memory increase: NaN%
```

**Cause:**
`performance.memory` n'est pas disponible ou retourne undefined.

**Solution:**
```typescript
// Vérifier la disponibilité avant utilisation
const memory = performance.memory;
if (memory && memory.usedJSHeapSize) {
  // Utiliser les métriques
}
```

---

## 📊 Résumé des Tests

### Tests Exécutés: 77/330 (23%)

| Catégorie | Passés | Échoués | Taux |
|-----------|--------|---------|------|
| Smoke Tests | 5 | 7 | 42% |
| Public Events | 10 | 4 | 71% |
| Performance | 8 | 14 | 36% |
| User Journey | 5 | 2 | 71% |
| **TOTAL** | **28** | **27** | **51%** |

### Bugs par Sévérité

- 🔴 **Critique:** 1 (API Client Error)
- 🟡 **Haute:** 3 (Textes, Navigation, Filtres)
- 🟠 **Moyenne:** 1 (Performance Firefox)
- 🟢 **Basse:** 3 (Tests techniques)

---

## 🎯 Plan d'Action Immédiat

### Phase 1: Bugs Critiques (Aujourd'hui)

1. **✅ PRIORITÉ 1:** Corriger l'erreur API Client `t.startsWith`
   - Fichier: `frontend-v2/src/services/apiClient.ts`
   - Temps estimé: 30 minutes
   - Impact: Débloque tous les tests de chargement

2. **✅ PRIORITÉ 2:** Harmoniser les textes
   - Fichier: `frontend-v2/src/pages/events/index.tsx`
   - Temps estimé: 15 minutes
   - Impact: Débloque 6 tests

3. **✅ PRIORITÉ 3:** Corriger le bouton "Se connecter"
   - Fichier: `frontend-v2/src/components/layout/PublicLayout.tsx`
   - Temps estimé: 15 minutes
   - Impact: Débloque navigation

4. **✅ PRIORITÉ 4:** Réparer le panneau de filtres
   - Fichier: `frontend-v2/src/pages/events/index.tsx`
   - Temps estimé: 30 minutes
   - Impact: Débloque filtrage

### Phase 2: Performance (Cette Semaine)

1. Profiler Firefox et optimiser
2. Implémenter lazy loading
3. Optimiser les requêtes API
4. Activer le cache

### Phase 3: Tests Techniques (Cette Semaine)

1. Corriger les tests de performance
2. Ajouter hasTouch pour mobile
3. Gérer les métriques mémoire

---

## 🔧 Commandes de Test

```bash
# Tester après corrections
cd frontend-v2

# Tests smoke uniquement (rapide)
$env:PLAYWRIGHT_BASE_URL='https://attendance-x.vercel.app'; npx playwright test tests/e2e/smoke.spec.ts

# Tests public events
$env:PLAYWRIGHT_BASE_URL='https://attendance-x.vercel.app'; npx playwright test tests/e2e/public-events.spec.ts

# Tous les tests
$env:PLAYWRIGHT_BASE_URL='https://attendance-x.vercel.app'; npx playwright test
```

---

## 📝 Notes

- Les tests ont été interrompus après 5 minutes (timeout)
- 77 tests sur 330 ont été exécutés (23%)
- Le taux de réussite actuel est de 51%
- **L'application n'est PAS prête pour la production** tant que les bugs critiques ne sont pas corrigés

---

**Prochaine étape:** Corriger les 4 bugs critiques et relancer les tests.

**Responsable:** Équipe Dev  
**Deadline:** Aujourd'hui (27 janvier 2026)
