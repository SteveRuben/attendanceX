# Guide de Test - Navigation par Industrie

## Problème Identifié
La navigation par industrie ne s'affiche pas correctement selon l'industrie configurée.

## État Actuel
✅ **Backend Firebase** : Fonctionne (port 5001 actif)
✅ **Frontend** : Fonctionne (port 3000)
✅ **Système d'industrie** : Implémenté
❓ **Navigation dynamique** : À tester

## Tests à Effectuer

### 1. Vérifier l'État Actuel

#### A. Ouvrir l'application
```
http://localhost:3000/app
```

#### B. Ouvrir la console du navigateur (F12)
Taper les commandes suivantes :

```javascript
// Voir les informations actuelles
getIndustryInfo()

// Voir le tenant actuel
console.log('Current tenant:', localStorage.getItem('currentTenantId'))
```

### 2. Tester le Changement d'Industrie

#### A. Via Console (Méthode Rapide)
```javascript
// Changer vers l'éducation
setIndustry('education')

// Changer vers la santé
setIndustry('healthcare')

// Changer vers l'entreprise
setIndustry('corporate')

// Changer vers la technologie
setIndustry('technology')
```

#### B. Via Interface de Test (Nouveau)
1. Aller sur le dashboard : `http://localhost:3000/app`
2. Chercher le composant "Industry Navigation Test" en bas de page
3. Cliquer sur les boutons d'industrie pour tester

### 3. Vérifier les Changements de Navigation

Après chaque changement d'industrie, vérifier :

#### Navigation pour l'Éducation
- ✅ **Visible** : Dashboard, Events, Attendance, Users
- ✅ **Priorité** : Events, Attendance, Reports, Campaigns
- ❌ **Caché** : Timesheets

#### Navigation pour la Santé
- ✅ **Visible** : Dashboard, Attendance, Users, Reports
- ✅ **Priorité** : Attendance, Timesheets, Reports, Organization
- ❌ **Caché** : Check-in

#### Navigation pour l'Entreprise
- ✅ **Visible** : Dashboard, Timesheets, Attendance, Users
- ✅ **Priorité** : Timesheets, Attendance, Reports, Analytics
- ❌ **Caché** : Aucun

#### Navigation pour la Technologie
- ✅ **Visible** : Dashboard, Timesheets, Users, Analytics
- ✅ **Priorité** : Timesheets, Analytics, Reports, Attendance
- ❌ **Caché** : Aucun

## Diagnostic des Problèmes

### Problème 1 : L'industrie n'est pas définie
**Symptômes** :
- `getIndustryInfo()` montre "Industry: Not set"
- Tous les menus sont visibles

**Solution** :
```javascript
// Définir une industrie
setIndustry('education')
```

### Problème 2 : Les menus ne changent pas
**Symptômes** :
- L'industrie est définie mais les menus restent identiques
- Le composant debug montre la bonne industrie

**Diagnostic** :
1. Vérifier les logs de la console
2. Vérifier que `useIndustryNavigation` fonctionne
3. Vérifier que `filterNavItems` est appelé

**Solution** :
```javascript
// Dans la console, tester le hook
const { industry, navConfig } = useIndustryNavigation()
console.log('Industry:', industry)
console.log('Nav config:', navConfig)
```

### Problème 3 : Erreurs de réseau
**Symptômes** :
- Erreurs 500 ou connection refused
- L'industrie ne se sauvegarde pas

**Solution** :
1. Vérifier que le backend fonctionne :
   ```bash
   # Tester l'API
   curl http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/health
   ```

2. Redémarrer le backend si nécessaire :
   ```bash
   npm run dev:backend
   ```

## Commandes de Debug Utiles

### Backend
```bash
# Vérifier les ports
netstat -an | findstr :5001
netstat -an | findstr :4000

# Redémarrer les émulateurs
firebase emulators:kill
npm run dev:backend

# Logs détaillés
firebase emulators:start --debug
```

### Frontend
```bash
# Redémarrer le frontend
npm run dev:frontend

# Vérifier les erreurs
npm run lint
```

### Console du Navigateur
```javascript
// Informations de debug
getIndustryInfo()

// Changer l'industrie
setIndustry('education')

// Vérifier le tenant
console.log(localStorage.getItem('currentTenantId'))

// Vérifier les erreurs réseau
// Aller dans l'onglet Network des DevTools
```

## Résultats Attendus

### Après `setIndustry('education')` :
1. Page se recharge automatiquement
2. Menu "Timesheets" disparaît
3. Menu "Events" apparaît en priorité
4. Debug widget montre "Industry: education"

### Après `setIndustry('corporate')` :
1. Page se recharge automatiquement
2. Menu "Timesheets" apparaît en priorité
3. Tous les menus sont visibles
4. Debug widget montre "Industry: corporate"

## Prochaines Étapes

1. **Tester avec l'interface** : Utiliser le nouveau composant de test
2. **Vérifier les logs** : Chercher les erreurs dans la console
3. **Tester les API** : Vérifier que les endpoints fonctionnent
4. **Valider les changements** : S'assurer que la navigation change

## Fichiers Modifiés

- ✅ `frontend-v2/src/components/debug/IndustryNavigationTest.tsx` - Nouveau composant de test
- ✅ `frontend-v2/src/pages/app/index.tsx` - Ajout du composant de test
- ✅ `frontend-v2/src/utils/debugIndustry.ts` - Utilitaires de debug console
- ✅ `frontend-v2/src/hooks/useIndustryNavigation.ts` - Hook de navigation
- ✅ `frontend-v2/src/components/navigation/Sidebar.tsx` - Navigation adaptative

## Contact et Support

Si les tests ne fonctionnent pas :
1. Vérifier que le backend est démarré (`npm run dev`)
2. Vérifier les logs dans la console du navigateur
3. Tester les API manuellement
4. Redémarrer complètement le système

Le système devrait maintenant fonctionner correctement !