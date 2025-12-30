# Guide de Démarrage Backend - AttendanceX

## Problème Identifié
Les logs montrent `ERR_CONNECTION_REFUSED` ce qui signifie que le backend Firebase n'est pas démarré.

## Solution : Démarrer le Backend

### Option 1 : Démarrage Complet (Recommandé)
```bash
# Depuis la racine du projet
npm run dev
```
Cette commande démarre automatiquement :
- Backend Firebase (port 5001)
- Frontend Next.js (port 3000)

### Option 2 : Backend Seulement
```bash
# Démarrer uniquement le backend
npm run dev:backend
```

### Option 3 : Manuel (si les scripts npm ne marchent pas)
```bash
# Aller dans le dossier backend
cd backend

# Démarrer les émulateurs Firebase
firebase emulators:start --debug
```

## Vérification que le Backend Fonctionne

### 1. Vérifier les Ports
- **Backend API** : http://127.0.0.1:5001
- **Firebase UI** : http://localhost:4000
- **Firestore** : http://localhost:4000/firestore
- **Auth** : http://localhost:4000/auth

### 2. Tester une API
Ouvrir dans le navigateur :
```
http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1/health
```

### 3. Vérifier les Logs
Le terminal devrait afficher :
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! View status and logs at http://localhost:4000 │
└─────────────────────────────────────────────────────────────┘
```

## Résolution des Erreurs Communes

### Erreur : "Port already in use"
```bash
# Tuer les processus sur les ports
npx kill-port 5001 4000 9099 8080

# Ou redémarrer les émulateurs
firebase emulators:kill
firebase emulators:start
```

### Erreur : "Firebase CLI not found"
```bash
# Installer Firebase CLI globalement
npm install -g firebase-tools

# Vérifier l'installation
firebase --version
```

### Erreur : "Project not configured"
```bash
# Se connecter à Firebase
firebase login

# Configurer le projet
firebase use --add
```

## Une Fois le Backend Démarré

### Les APIs Suivantes Devraient Fonctionner :
- ✅ `/tenants` - Récupération des tenants
- ✅ `/tenants/{id}` - Détails du tenant (avec industrie)
- ✅ `/tenants/{id}/onboarding-status` - Statut onboarding
- ✅ `/users` - Gestion des utilisateurs
- ✅ `/events` - Gestion des événements
- ✅ `/attendances` - Données de présence

### Les APIs Manquantes (404 Normal) :
- ❌ `/timesheets/*` - Pas encore implémenté
- ❌ `/resolutions/*` - Pas encore implémenté

## Test de la Navigation par Industrie

Une fois le backend démarré :

1. **Ouvrir la console du navigateur**
2. **Taper** : `getIndustryInfo()`
3. **Changer l'industrie** : `setIndustry('education')`
4. **Vérifier** que la navigation change

## Commandes de Debug Utiles

```bash
# Vérifier les processus en cours
netstat -an | findstr :5001
netstat -an | findstr :4000

# Logs détaillés des émulateurs
firebase emulators:start --debug --verbosity=debug

# Redémarrer proprement
firebase emulators:kill
npm run clean
npm run dev:backend
```

## Structure des Données Industrie

L'industrie est récupérée depuis :
```
GET /tenants/{tenantId}
Response: {
  "id": "...",
  "name": "...",
  "settings": {
    "industry": "education",  // ← Ici
    "timezone": "...",
    // ...
  }
}
```

## Prochaines Étapes

1. **Démarrer le backend** avec `npm run dev`
2. **Vérifier** que http://localhost:4000 s'ouvre
3. **Tester** la navigation par industrie via console
4. **Vérifier** que les menus changent selon l'industrie

Le problème principal est simplement que le backend n'est pas démarré !