# 🚀 Guide de Déploiement - AttendanceX

> 🎯 **Guide complet** pour déployer AttendanceX de développement à production avec zéro-downtime

## 🌍 Vue d'ensemble des environnements

AttendanceX utilise une stratégie de déploiement **multi-environnements** pour garantir la qualité, la stabilité et la fiabilité du système :

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Développement  │ ──> │     Testing     │ ──> │     Staging     │ ──> │    Production    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
   Local / Dev           Tests Automatisés       Pré-production           Environnement
   Firebase Emulators     Intégration CI          Données réelles           final client
```

Chaque environnement a un objectif spécifique dans le processus de déploiement :

1. **Développement** : Développement local avec émulateurs Firebase
2. **Testing** : Tests automatisés et validation de qualité
3. **Staging** : Environnement miroir de la production pour validation finale
4. **Production** : Environnement live pour les utilisateurs finaux

## 🚀 Configuration des projets Firebase

AttendanceX nécessite la configuration de projets Firebase distincts pour chaque environnement (sauf développement local qui utilise les émulateurs).

### 🔥 **Création des projets Firebase**

1. **Accédez à la [Firebase Console](https://console.firebase.google.com/)**
2. **Créez un nouveau projet pour chaque environnement** :
   - `attendancex-test`
   - `attendancex-staging`
   - `attendancex-prod`

3. **Pour chaque projet, activez les services suivants** :
   - Authentication
   - Firestore Database
   - Storage
   - Functions
   - Hosting

### ⚙️ **Configuration de `.firebaserc`**

Ce fichier définit les projets Firebase associés à chaque environnement :

```json
{
  "projects": {
    "default": "attendancex-dev",
    "testing": "attendancex-test",
    "staging": "attendancex-staging",
    "production": "attendancex-prod"
  }
}
```

### 🔧 **Configuration de `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "backend/functions",
      "codebase": "default",
      "runtime": "nodejs18",
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ],
      "env": {
        "production": {
          "FUNCTIONS_MEMORY": "2GB",
          "FUNCTIONS_TIMEOUT": "540s",
          "FUNCTIONS_MAX_INSTANCES": "100",
          "FUNCTIONS_MIN_INSTANCES": "5",
          "FUNCTIONS_CONCURRENCY": "80"
        },
        "staging": {
          "FUNCTIONS_MEMORY": "1GB", 
          "FUNCTIONS_TIMEOUT": "300s",
          "FUNCTIONS_MAX_INSTANCES": "20"
        }
      }
    }
  ],
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/v1/**",
        "function": {
          "functionId": "api",
          "region": "europe-west1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/v1/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control", 
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options", 
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

## 🔄 Configuration CI/CD avec GitHub Actions

AttendanceX utilise GitHub Actions pour l'intégration et le déploiement continus, permettant une livraison automatisée et fiable.

### 📝 **Workflow de CI/CD**

Créez le fichier `.github/workflows/firebase-deploy.yml` :

```yaml
name: Firebase CI/CD

on:
  push:
    branches:
      - develop
      - staging
      - main
  pull_request:
    branches:
      - develop
      - staging
      - main

jobs:
  lint_and_test:
    name: Lint and Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      # Backend lint and test
      - name: Install backend dependencies
        run: cd backend/functions && npm ci

      - name: Lint backend
        run: cd backend/functions && npm run lint

      - name: Test backend
        run: cd backend/functions && npm run test

      # Frontend lint and test
      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Lint frontend
        run: cd frontend && npm run lint

      - name: Test frontend
        run: cd frontend && npm run test

  build:
    name: Build
    needs: lint_and_test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.pull_request.merged == true)
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      # Build backend
      - name: Install backend dependencies
        run: cd backend/functions && npm ci

      - name: Build backend
        run: cd backend/functions && npm run build

      # Build frontend
      - name: Install frontend dependencies
        run: cd frontend && npm ci

      - name: Build frontend
        run: cd frontend && npm run build

      # Upload artifacts
      - name: Upload backend build
        uses: actions/upload-artifact@v3
        with:
          name: backend-build
          path: backend/functions/lib

      - name: Upload frontend build
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && (github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/staging' || github.ref == 'refs/heads/main')
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Download backend build
        uses: actions/download-artifact@v3
        with:
          name: backend-build
          path: backend/functions/lib

      - name: Download frontend build
        uses: actions/download-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist

      - name: Determine environment
        id: environment
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "::set-output name=env::production"
          elif [ "${{ github.ref }}" = "refs/heads/staging" ]; then
            echo "::set-output name=env::staging"
          else
            echo "::set-output name=env::testing"
          fi

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy to Firebase
        run: |
          firebase use ${{ steps.environment.outputs.env }}
          firebase deploy --only functions,hosting,firestore,storage
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### 🔑 **Configurer les secrets GitHub**

Dans votre dépôt GitHub, allez dans Settings > Secrets et ajoutez les secrets suivants :

1. `FIREBASE_TOKEN` : Token d'authentification Firebase (obtenu via `firebase login:ci`)

## 🚀 Déploiement manuel

### 📋 **Prérequis**

1. **Node.js v18+** installé
2. **Firebase CLI** installé : `npm install -g firebase-tools`
3. **Authentification Firebase** : `firebase login`

### 🚀 **Procédure de déploiement**

#### Déploiement complet

```bash
# Sélectionner l'environnement
firebase use [testing|staging|production]

# Build du backend
cd backend/functions
npm install
npm run build

# Build du frontend
cd ../../frontend
npm install
npm run build

# Déploiement complet
firebase deploy
```

#### Déploiement sélectif

```bash
# Déployer uniquement les fonctions
firebase deploy --only functions

# Déployer uniquement le frontend
firebase deploy --only hosting

# Déployer uniquement les règles Firestore
firebase deploy --only firestore:rules

# Déployer uniquement les index Firestore
firebase deploy --only firestore:indexes

# Déployer uniquement les règles Storage
firebase deploy --only storage
```

### 🚫