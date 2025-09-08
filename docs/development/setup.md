# Setup Guide

Guide d'installation et de configuration de l'environnement de développement.

## Prérequis

### Outils requis
- **Node.js** : Version 18+ 
- **npm** : Version 8+
- **Firebase CLI** : `npm install -g firebase-tools`
- **Git** : Pour le contrôle de version

### Comptes nécessaires
- **Firebase** : Compte Google avec accès au projet
- **GitHub** : Pour l'accès au repository

## Installation

### 1. Cloner le repository
```bash
git clone https://github.com/company/presence-system.git
cd presence-system
```

### 2. Installer les dépendances
```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend/functions
npm install
```

### 3. Configuration Firebase
```bash
# Login to Firebase
firebase login

# Set project
firebase use --add

# Download service account key
# Place it in backend/functions/serviceAccountKey.json
```

### 4. Variables d'environnement
```bash
# Frontend (.env)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id

# Backend (functions/.env)
FIREBASE_PROJECT_ID=your_project_id
SENDGRID_API_KEY=your_sendgrid_key
```

## Développement local

### Démarrer les émulateurs
```bash
# Depuis la racine du projet
firebase emulators:start
```

### Démarrer le frontend
```bash
cd frontend
npm run dev
```

### Démarrer le backend
```bash
cd backend/functions
npm run serve
```

## Structure du projet

```
presence-system/
├── frontend/           # Application React/Vue
├── backend/           # Cloud Functions
│   ├── functions/     # Code des fonctions
│   └── firestore.*    # Règles et index Firestore
├── docs/             # Documentation
├── tests/            # Tests
└── scripts/          # Scripts utilitaires
```

## Commandes utiles

### Développement
```bash
# Tests
npm test
npm run test:watch

# Linting
npm run lint
npm run lint:fix

# Build
npm run build
```

### Firebase
```bash
# Deploy functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# Deploy all
firebase deploy
```

## Troubleshooting

### Problèmes courants

#### Émulateurs ne démarrent pas
- Vérifier que les ports 5000, 5001, 8080 sont libres
- Redémarrer avec `firebase emulators:start --debug`

#### Erreurs d'authentification
- Vérifier la configuration Firebase
- Régénérer les clés API si nécessaire

#### Problèmes de build
- Nettoyer les node_modules : `rm -rf node_modules && npm install`
- Vérifier les versions Node.js et npm

### Logs et debugging
```bash
# Logs des fonctions
firebase functions:log

# Logs des émulateurs
firebase emulators:start --debug

# Logs de l'application
npm run dev -- --debug
```

## Configuration IDE

### VS Code Extensions
- Firebase
- TypeScript
- ESLint
- Prettier
- GitLens

### Settings recommandés
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```