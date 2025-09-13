# 🚀 Guide d'Onboarding - Attendance Management System

## 📋 Table des Matières

1. [Vue d'ensemble du projet](#-vue-densemble-du-projet)
2. [Architecture de la solution](#-architecture-de-la-solution)
3. [État actuel du projet](#-état-actuel-du-projet)
4. [Configuration de développement](#-configuration-de-développement)
5. [Structure du projet](#-structure-du-projet)
6. [Workflow de développement](#-workflow-de-développement)
7. [Tests et validation](#-tests-et-validation)
8. [Déploiement](#-déploiement)
9. [Ressources et documentation](#-ressources-et-documentation)

---

## 🎯 Vue d'ensemble du projet

### Concept Principal
**Attendance Management System** est une plateforme SaaS multi-tenant complète pour la gestion d'entreprise, centrée sur :
- **Gestion de présence** des employés
- **Gestion des rendez-vous** et calendriers
- **CRM clients** intégré
- **Ventes et produits**
- **Intégrations tierces** (OAuth 2.0)

### Philosophie Multi-Tenant
- **Organisation-centrée** : Chaque utilisateur crée ou rejoint une organisation
- **Isolation complète** des données entre organisations
- **Services modulaires** activables selon les besoins
- **Sécurité intégrée** avec authentification JWT + 2FA

### Stack Technique
```
Frontend:  React 18 + TypeScript + Redux Toolkit + Tailwind CSS
Backend:   Node.js + TypeScript + Firebase Functions
Database:  Firestore (NoSQL) + Firebase Auth
API:       REST + GraphQL avec documentation Swagger
Infra:     Google Cloud Platform + Firebase
Tests:     Jest + Playwright + Testing Library
```

---

## 🏗️ Architecture de la solution

### Architecture Globale
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React + TS    │◄──►│ Firebase Funcs  │◄──►│   Firestore     │
│   Port: 3000    │    │   Port: 5001    │    │   NoSQL         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Services      │◄─────────────┘
                        │   - Auth JWT    │
                        │   - Notifications│
                        │   - Integrations │
                        │   - ML/Analytics │
                        └─────────────────┘
```

### Architecture Multi-Tenant
```
Organization A          Organization B          Organization C
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│ Users       │        │ Users       │        │ Users       │
│ Events      │        │ Events      │        │ Events      │
│ Attendances │        │ Attendances │        │ Attendances │
│ Settings    │        │ Settings    │        │ Settings    │
└─────────────┘        └─────────────┘        └─────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                              │
                    ┌─────────────────┐
                    │ Shared Services │
                    │ - Authentication│
                    │ - Notifications │
                    │ - Integrations  │
                    │ - Analytics     │
                    └─────────────────┘
```

### Modules et Services

#### 🔐 Authentification & Sécurité
- **JWT Authentication** avec refresh tokens
- **2FA** (TOTP + backup codes)
- **Rate limiting** et protection DDoS
- **Audit logs** des actions critiques
- **Chiffrement** des données sensibles

#### 👥 Gestion des Utilisateurs
- **Multi-rôles** : Owner, Admin, Manager, Member, Viewer
- **Invitations** et onboarding
- **Profils** personnalisables
- **Permissions** granulaires

#### 🏢 Gestion des Organisations
- **Création** automatique à la première connexion
- **Configuration** des paramètres métier
- **Branding** personnalisé
- **Politiques** de sécurité

#### 📅 Gestion des Événements
- **Création** et planification
- **Participants** et invitations
- **Récurrence** et exceptions
- **Notifications** automatiques

#### ✅ Gestion de Présence
- **Check-in/Check-out** avec géolocalisation
- **Pauses** et temps de travail
- **Validation** par les managers
- **Rapports** de présence

#### 🔗 Intégrations Tierces
- **OAuth 2.0** : Google, Microsoft, Apple, Slack
- **Synchronisation** bidirectionnelle
- **Calendriers** et contacts
- **Tokens** sécurisés avec refresh automatique

---#
# 📊 État actuel du projet

### ✅ Fonctionnalités Terminées (Phase 1 & 2)

#### 🔐 Authentification & Sécurité - **100%**
- ✅ JWT Authentication avec refresh tokens
- ✅ 2FA (TOTP + backup codes)
- ✅ Rate limiting et protection DDoS
- ✅ Audit logs complets
- ✅ Chiffrement bcrypt + AES
- ✅ Validation stricte des entrées (Zod)

#### 👥 Gestion des Utilisateurs - **95%**
- ✅ CRUD utilisateurs complet
- ✅ Système de rôles multi-niveaux
- ✅ Invitations par email
- ✅ Profils personnalisables
- ✅ Vérification email avec rate limiting
- 🚧 Interface utilisateur (90%)

#### 🏢 Gestion des Organisations - **90%**
- ✅ Création automatique d'organisation
- ✅ Gestion des membres et invitations
- ✅ Configuration des paramètres
- ✅ Branding personnalisé
- 🚧 Politiques de sécurité avancées (80%)

#### 📅 Gestion des Événements - **85%**
- ✅ CRUD événements complet
- ✅ Système de participants
- ✅ Récurrence et exceptions
- ✅ Notifications automatiques
- 🚧 Interface calendrier avancée (70%)

#### ✅ Gestion de Présence - **80%**
- ✅ Check-in/Check-out avec géolocalisation
- ✅ Gestion des pauses
- ✅ Validation par managers
- ✅ Rapports de base
- 🚧 Analytics avancées (60%)

#### 🔗 Intégrations Tierces - **85%**
- ✅ OAuth 2.0 (Google, Microsoft, Apple, Slack)
- ✅ Gestion sécurisée des tokens
- ✅ Synchronisation calendriers/contacts
- ✅ Historique des synchronisations
- 🚧 Interface utilisateur (90%)
- 🚧 Tests d'intégration (75%)

#### 📊 API & Documentation - **95%**
- ✅ API REST complète
- ✅ Documentation Swagger interactive
- ✅ Validation automatique (Zod)
- ✅ Codes d'erreur standardisés
- ✅ Exemples et SDK

#### 🧪 Tests & Qualité - **82%**
- ✅ Tests unitaires backend (85%)
- ✅ Tests d'intégration (80%)
- ✅ Tests E2E (75%)
- ✅ Couverture de code > 80%
- 🚧 Tests frontend (70%)

### 🚧 En Cours de Développement

#### 📱 Interface Utilisateur - **75%**
- 🚧 Dashboard principal (80%)
- 🚧 Gestion des événements (85%)
- 🚧 Gestion de présence (70%)
- 🚧 Configuration des intégrations (90%)
- 🚧 Rapports et analytics (60%)

#### 📊 Analytics & Rapports - **60%**
- 🚧 Tableaux de bord temps réel
- 🚧 Rapports personnalisables
- 🚧 Métriques de performance
- 🚧 Prédictions IA/ML

### 📋 À Faire (Phase 3 & 4)

#### 📅 Rendez-vous Avancés - **0%**
- 📋 Réservation en ligne
- 📋 Calendrier public
- 📋 Rappels automatiques
- 📋 Intégration paiements

#### 👥 CRM Clients - **0%**
- 📋 Fiches clients complètes
- 📋 Historique des interactions
- 📋 Segmentation marketing
- 📋 Conformité RGPD

#### 💰 Ventes & Produits - **0%**
- 📋 Catalogue produits/services
- 📋 Gestion des commandes
- 📋 Facturation automatique
- 📋 Gestion des stocks

#### 🤖 Intelligence Artificielle - **0%**
- 📋 Prédictions de présence
- 📋 Recommandations intelligentes
- 📋 Détection d'anomalies
- 📋 Optimisation automatique

#### 📱 Applications Mobiles - **0%**
- 📋 App iOS native
- 📋 App Android native
- 📋 Synchronisation offline
- 📋 Notifications push

---

## ⚙️ Configuration de développement

### Prérequis Système
```bash
# Versions requises
Node.js >= 18.0.0
npm >= 8.0.0
Git >= 2.30.0

# Outils recommandés
Firebase CLI >= 12.0.0
VS Code + Extensions TypeScript
```

### Installation Rapide
```bash
# 1. Cloner le repository
git clone <repository-url>
cd attendance-management-system

# 2. Installer toutes les dépendances
npm run install:all

# 3. Configuration Firebase
firebase login
firebase use --add

# 4. Variables d'environnement
cp .env.example .env.local
# Configurer les variables dans .env.local
```

### Configuration des Variables d'Environnement

#### Backend (.env.local)
```env
# JWT Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com

# Development
NODE_ENV=development
PORT=5001
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
AES_ENCRYPTION_KEY=your-32-character-encryption-key
```

#### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:5001
VITE_API_TIMEOUT=30000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Development
VITE_NODE_ENV=development
VITE_DEBUG=true

# Features Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_INTEGRATIONS=true
VITE_ENABLE_ML_FEATURES=false
```

### Démarrage du Projet

#### Développement Complet
```bash
# Démarrer backend + frontend simultanément
npm run dev

# Services disponibles :
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:5001
# - Swagger UI: http://localhost:5001/api/docs
# - Firebase Emulator: http://localhost:4000
```

#### Développement Séparé
```bash
# Terminal 1 : Backend avec émulateurs Firebase
npm run dev:backend

# Terminal 2 : Frontend React
npm run dev:frontend

# Terminal 3 : Tests en mode watch
npm run test:watch
```

### Configuration IDE (VS Code)

#### Extensions Recommandées
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "firebase.vscode-firebase-explorer",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright"
  ]
}
```

#### Settings.json
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.autoFixOnSave": true,
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

---## 📁
 Structure du projet

### Vue d'ensemble
```
attendance-management-system/
├── 📁 backend/                    # Backend Firebase Functions
│   ├── 📁 functions/              # Code source backend
│   │   ├── 📁 src/
│   │   │   ├── 📁 controllers/    # Contrôleurs API
│   │   │   ├── 📁 services/       # Logique métier
│   │   │   ├── 📁 models/         # Modèles de données
│   │   │   ├── 📁 middleware/     # Middlewares Express
│   │   │   ├── 📁 routes/         # Définition des routes
│   │   │   ├── 📁 shared/         # Types et utilitaires
│   │   │   ├── 📁 config/         # Configuration
│   │   │   └── 📁 docs/           # Documentation API
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   ├── 📄 firebase.json           # Configuration Firebase
│   ├── 📄 firestore.rules         # Règles de sécurité
│   └── 📄 firestore.indexes.json  # Index Firestore
├── 📁 frontend/                   # Application React
│   ├── 📁 src/
│   │   ├── 📁 components/         # Composants React
│   │   ├── 📁 pages/              # Pages de l'application
│   │   ├── 📁 services/           # Services API
│   │   ├── 📁 store/              # État Redux
│   │   ├── 📁 hooks/              # Hooks personnalisés
│   │   ├── 📁 utils/              # Utilitaires
│   │   └── 📁 types/              # Types TypeScript
│   ├── 📄 package.json
│   ├── 📄 vite.config.ts
│   └── 📄 tailwind.config.ts
├── 📁 tests/                      # Tests automatisés
│   ├── 📁 backend/                # Tests backend
│   ├── 📁 frontend/               # Tests frontend
│   ├── 📁 e2e/                    # Tests end-to-end
│   └── 📁 config/                 # Configuration tests
├── 📁 docs/                       # Documentation
│   ├── 📁 api/                    # Documentation API
│   ├── 📁 architecture/           # Architecture
│   ├── 📁 user-guide/             # Guides utilisateur
│   └── 📁 development/            # Guides développement
├── 📁 scripts/                    # Scripts utilitaires
├── 📁 .kiro/                      # Spécifications Kiro
│   └── 📁 specs/                  # Spécifications détaillées
├── 📄 package.json                # Configuration workspace
├── 📄 ONBOARDING_GUIDE.md         # Ce guide
└── 📄 README.md                   # Documentation principale
```

### Backend - Structure Détaillée
```
backend/functions/src/
├── 📁 controllers/                # Contrôleurs API REST
│   ├── 📄 auth.controller.ts      # Authentification
│   ├── 📄 user.controller.ts      # Gestion utilisateurs
│   ├── 📄 organization.controller.ts # Organisations
│   ├── 📄 event.controller.ts     # Événements
│   ├── 📄 presence.controller.ts  # Présences
│   └── 📄 integration.controller.ts # Intégrations
├── 📁 services/                   # Logique métier
│   ├── 📁 auth/                   # Services d'authentification
│   ├── 📁 user/                   # Services utilisateurs
│   ├── 📁 organization/           # Services organisations
│   ├── 📁 event/                  # Services événements
│   ├── 📁 presence/               # Services présences
│   ├── 📁 notification/           # Services notifications
│   ├── 📁 integration/            # Services intégrations
│   └── 📁 base/                   # Services de base
├── 📁 models/                     # Modèles de données
│   ├── 📄 base.model.ts           # Modèle de base
│   ├── 📄 user.model.ts           # Modèle utilisateur
│   ├── 📄 organization.model.ts   # Modèle organisation
│   └── 📄 event.model.ts          # Modèle événement
├── 📁 middleware/                 # Middlewares Express
│   ├── 📄 auth.ts                 # Authentification JWT
│   ├── 📄 validation.ts           # Validation des données
│   ├── 📄 rate-limiting.ts        # Limitation de taux
│   └── 📄 error-handling.ts       # Gestion d'erreurs
├── 📁 routes/                     # Définition des routes
│   ├── 📄 auth.routes.ts          # Routes authentification
│   ├── 📄 users.routes.ts         # Routes utilisateurs
│   ├── 📄 organizations.routes.ts # Routes organisations
│   ├── 📄 events.routes.ts        # Routes événements
│   └── 📄 integrations.routes.ts  # Routes intégrations
├── 📁 shared/                     # Code partagé
│   ├── 📁 types/                  # Types TypeScript
│   ├── 📁 utils/                  # Utilitaires
│   ├── 📁 constants/              # Constantes
│   └── 📁 validators/             # Validateurs Zod
├── 📁 config/                     # Configuration
│   ├── 📄 database.ts             # Configuration DB
│   ├── 📄 auth.ts                 # Configuration auth
│   └── 📄 integrations.ts         # Configuration intégrations
└── 📁 docs/                       # Documentation API
    ├── 📄 swagger.config.ts       # Configuration Swagger
    └── 📄 api-examples.ts         # Exemples API
```

### Frontend - Structure Détaillée
```
frontend/src/
├── 📁 components/                 # Composants React
│   ├── 📁 ui/                     # Composants UI de base
│   ├── 📁 forms/                  # Formulaires
│   ├── 📁 layout/                 # Composants de mise en page
│   ├── 📁 auth/                   # Composants authentification
│   ├── 📁 dashboard/              # Composants tableau de bord
│   ├── 📁 events/                 # Composants événements
│   ├── 📁 presence/               # Composants présence
│   └── 📁 integrations/           # Composants intégrations
├── 📁 pages/                      # Pages de l'application
│   ├── 📄 Login.tsx               # Page de connexion
│   ├── 📄 Dashboard.tsx           # Tableau de bord
│   ├── 📄 Events.tsx              # Gestion événements
│   ├── 📄 Presence.tsx            # Gestion présence
│   └── 📄 Settings.tsx            # Paramètres
├── 📁 services/                   # Services API
│   ├── 📄 api.service.ts          # Service API de base
│   ├── 📄 auth.service.ts         # Service authentification
│   ├── 📄 user.service.ts         # Service utilisateurs
│   ├── 📄 event.service.ts        # Service événements
│   └── 📄 integration.service.ts  # Service intégrations
├── 📁 store/                      # État Redux
│   ├── 📄 store.ts                # Configuration store
│   ├── 📁 slices/                 # Slices Redux
│   │   ├── 📄 auth.slice.ts       # État authentification
│   │   ├── 📄 user.slice.ts       # État utilisateurs
│   │   └── 📄 event.slice.ts      # État événements
│   └── 📁 middleware/             # Middlewares Redux
├── 📁 hooks/                      # Hooks personnalisés
│   ├── 📄 useAuth.ts              # Hook authentification
│   ├── 📄 useApi.ts               # Hook API
│   └── 📄 useLocalStorage.ts      # Hook localStorage
├── 📁 utils/                      # Utilitaires
│   ├── 📄 date.utils.ts           # Utilitaires dates
│   ├── 📄 validation.utils.ts     # Utilitaires validation
│   └── 📄 format.utils.ts         # Utilitaires formatage
└── 📁 types/                      # Types TypeScript
    ├── 📄 api.types.ts            # Types API
    ├── 📄 auth.types.ts           # Types authentification
    └── 📄 common.types.ts         # Types communs
```

### Tests - Structure Détaillée
```
tests/
├── 📁 backend/                    # Tests backend
│   ├── 📁 unit/                   # Tests unitaires
│   │   ├── 📁 services/           # Tests services
│   │   ├── 📁 models/             # Tests modèles
│   │   └── 📁 utils/              # Tests utilitaires
│   ├── 📁 integration/            # Tests d'intégration
│   │   ├── 📁 api/                # Tests API
│   │   ├── 📁 auth/               # Tests authentification
│   │   └── 📁 database/           # Tests base de données
│   └── 📁 fixtures/               # Données de test
├── 📁 frontend/                   # Tests frontend
│   ├── 📁 components/             # Tests composants
│   ├── 📁 pages/                  # Tests pages
│   ├── 📁 services/               # Tests services
│   └── 📁 utils/                  # Tests utilitaires
├── 📁 e2e/                        # Tests end-to-end
│   ├── 📄 auth.spec.ts            # Tests authentification
│   ├── 📄 dashboard.spec.ts       # Tests tableau de bord
│   └── 📄 events.spec.ts          # Tests événements
└── 📁 config/                     # Configuration tests
    ├── 📄 jest.config.js          # Configuration Jest
    ├── 📄 playwright.config.ts    # Configuration Playwright
    └── 📄 setup.ts                # Configuration globale
```

---

## 🔄 Workflow de développement

### Processus de Développement

#### 1. Préparation de l'Environnement
```bash
# Cloner et configurer
git clone <repository-url>
cd attendance-management-system
npm run install:all

# Créer une branche de fonctionnalité
git checkout -b feature/nom-de-la-fonctionnalite

# Démarrer les services de développement
npm run dev
```

#### 2. Développement avec TDD
```bash
# 1. Écrire les tests d'abord
npm run test:watch

# 2. Développer la fonctionnalité
# - Backend : services, contrôleurs, routes
# - Frontend : composants, pages, services

# 3. Valider avec les tests
npm run test:backend
npm run test:frontend
npm run test:e2e
```

#### 3. Validation et Qualité
```bash
# Linting et formatage
npm run lint
npm run format

# Tests complets
npm run test:ci

# Couverture de code
npm run test:coverage

# Build de validation
npm run build
```

#### 4. Documentation
```bash
# Mettre à jour la documentation API (Swagger)
# Les annotations sont automatiquement détectées

# Tester la documentation
open http://localhost:5001/api/docs

# Valider la spécification OpenAPI
npm run validate:swagger
```

#### 5. Commit et Push
```bash
# Commit avec message conventionnel
git add .
git commit -m "feat(events): add recurring events support"

# Push et créer une Pull Request
git push origin feature/nom-de-la-fonctionnalite
```

### Standards de Code

#### Conventions de Nommage
```typescript
// Fichiers : kebab-case
user-service.ts
event-controller.ts

// Classes : PascalCase
class UserService {}
class EventController {}

// Fonctions et variables : camelCase
const getUserById = () => {}
const eventData = {}

// Constantes : SCREAMING_SNAKE_CASE
const API_BASE_URL = 'http://localhost:5001'
const MAX_RETRY_ATTEMPTS = 3

// Types et interfaces : PascalCase
interface User {}
type EventStatus = 'active' | 'inactive'
```

#### Structure des Commits
```bash
# Format : type(scope): description
feat(auth): add 2FA support
fix(events): resolve timezone issue
docs(api): update swagger documentation
test(presence): add integration tests
refactor(user): optimize query performance
```

#### Code Review Checklist
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] Documentation API mise à jour
- [ ] Pas de secrets hardcodés
- [ ] Gestion d'erreurs appropriée
- [ ] Validation des entrées
- [ ] Performance optimisée
- [ ] Sécurité vérifiée
- [ ] Accessibilité respectée

### Debugging et Développement

#### Backend Debugging
```bash
# Logs détaillés
DEBUG=* npm run dev:backend

# Debugging avec VS Code
# Ajouter des breakpoints et utiliser F5

# Monitoring des performances
npm run dev:backend -- --inspect

# Tests avec couverture
npm run test:backend:coverage
```

#### Frontend Debugging
```bash
# Mode développement avec hot reload
npm run dev:frontend

# Debugging Redux DevTools
# Installer l'extension navigateur

# Tests avec interface graphique
npm run test:frontend -- --watch

# Analyse du bundle
npm run build:analyze
```

#### Base de Données (Firestore)
```bash
# Émulateur Firestore avec UI
firebase emulators:start --only firestore

# Interface graphique
open http://localhost:4000

# Export/Import des données
firebase emulators:export ./backup
firebase emulators:import ./backup
```

---## 🧪 Tests 
et validation

### Stratégie de Tests

#### Pyramide des Tests
```
                    🔺 E2E Tests (10%)
                   /   Playwright
                  /    User journeys
                 /     Critical paths
                /
               🔺 Integration Tests (20%)
              /   API endpoints
             /    Database operations
            /     Service interactions
           /
          🔺 Unit Tests (70%)
         /   Functions
        /    Components
       /     Services
      /      Utils
```

#### Types de Tests Implémentés

##### Tests Unitaires (70%)
```bash
# Backend - Services et modèles
npm run test:backend:unit

# Frontend - Composants et hooks
npm run test:frontend:unit

# Couverture cible : > 80%
npm run test:coverage
```

##### Tests d'Intégration (20%)
```bash
# API endpoints complets
npm run test:backend:integration

# Flux utilisateur frontend
npm run test:frontend:integration

# Base de données avec émulateurs
npm run test:db
```

##### Tests End-to-End (10%)
```bash
# Parcours utilisateur critiques
npm run test:e2e

# Interface graphique pour debugging
npm run test:e2e:ui

# Tests sur différents navigateurs
npm run test:e2e:cross-browser
```

### Configuration des Tests

#### Jest (Tests Unitaires & Intégration)
```javascript
// tests/config/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/backend', '<rootDir>/frontend'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'backend/functions/src/**/*.ts',
    'frontend/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

#### Playwright (Tests E2E)
```typescript
// tests/config/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
})
```

### Exemples de Tests

#### Test Unitaire - Service
```typescript
// tests/backend/unit/services/user.service.test.ts
import { UserService } from '../../../../backend/functions/src/services/user.service'
import { UserModel } from '../../../../backend/functions/src/models/user.model'

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    userService = new UserService()
  })

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePassword123!'
      }

      const result = await userService.createUser(userData)

      expect(result).toBeInstanceOf(UserModel)
      expect(result.email).toBe(userData.email)
      expect(result.name).toBe(userData.name)
      expect(result.hashedPassword).toBeDefined()
    })

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'SecurePassword123!'
      }

      await expect(userService.createUser(userData))
        .rejects.toThrow('Invalid email format')
    })
  })
})
```

#### Test d'Intégration - API
```typescript
// tests/backend/integration/api/auth.test.ts
import request from 'supertest'
import { app } from '../../../../backend/functions/src/app'

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePassword123!'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.token).toBeDefined()
    })

    it('should return 400 for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'SecurePassword123!'
      }

      // Premier enregistrement
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      // Tentative de doublon
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('already exists')
    })
  })
})
```

#### Test E2E - Parcours Utilisateur
```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should complete full registration and login flow', async ({ page }) => {
    // Navigation vers la page d'inscription
    await page.goto('/register')
    
    // Remplir le formulaire d'inscription
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="name-input"]', 'Test User')
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!')
    
    // Soumettre le formulaire
    await page.click('[data-testid="register-button"]')
    
    // Vérifier la redirection vers la vérification email
    await expect(page).toHaveURL('/verify-email')
    await expect(page.locator('[data-testid="verification-message"]'))
      .toContainText('Please check your email')
    
    // Simuler la vérification email (en mode test)
    await page.goto('/verify-email?token=test-token')
    
    // Vérifier la redirection vers le dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome, Test User')
  })

  test('should handle login with 2FA', async ({ page }) => {
    // Connexion avec utilisateur ayant 2FA activé
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user-with-2fa@example.com')
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.click('[data-testid="login-button"]')
    
    // Vérifier l'affichage du formulaire 2FA
    await expect(page.locator('[data-testid="2fa-form"]')).toBeVisible()
    
    // Entrer le code 2FA
    await page.fill('[data-testid="2fa-code-input"]', '123456')
    await page.click('[data-testid="verify-2fa-button"]')
    
    // Vérifier l'accès au dashboard
    await expect(page).toHaveURL('/dashboard')
  })
})
```

### Commandes de Tests

#### Tests Complets
```bash
# Tous les tests (CI/CD)
npm run test:ci

# Tests avec couverture
npm run test:coverage

# Tests en mode watch (développement)
npm run test:watch
```

#### Tests par Composant
```bash
# Backend seulement
npm run test:backend
npm run test:backend:unit
npm run test:backend:integration
npm run test:backend:watch

# Frontend seulement
npm run test:frontend
npm run test:frontend:unit
npm run test:frontend:integration

# E2E seulement
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
```

#### Tests par Fonctionnalité
```bash
# Tests d'authentification
npm test -- --testNamePattern="auth"

# Tests d'événements
npm test -- --testNamePattern="event"

# Tests de présence
npm test -- --testNamePattern="presence"

# Tests d'intégrations
npm test -- --testNamePattern="integration"
```

### Métriques de Qualité

#### Couverture de Code Actuelle
```
Backend:
├── Services: 85%
├── Controllers: 80%
├── Models: 90%
├── Middleware: 75%
└── Utils: 95%

Frontend:
├── Components: 70%
├── Services: 85%
├── Hooks: 80%
├── Utils: 90%
└── Store: 75%

Global: 82%
```

#### Objectifs de Couverture
- **Critique** : > 95% (auth, security, payments)
- **Important** : > 85% (core business logic)
- **Standard** : > 80% (UI components, utils)
- **Acceptable** : > 70% (experimental features)

---

## 🚀 Déploiement

### Environnements

#### Développement Local
```bash
# Démarrage complet avec émulateurs
npm run dev

# Services disponibles :
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5001
# - Firestore Emulator: http://localhost:8080
# - Auth Emulator: http://localhost:9099
# - Firebase UI: http://localhost:4000
```

#### Staging (Test)
```bash
# Build et déploiement staging
npm run build
firebase use staging
firebase deploy

# URL staging : https://staging.attendance-x.com
```

#### Production
```bash
# Build optimisé pour production
npm run build:prod

# Déploiement production
firebase use production
npm run deploy:prod

# URL production : https://app.attendance-x.com
```

### Configuration Firebase

#### Projets Firebase
```bash
# Configuration des projets
firebase projects:list

# Ajouter un projet
firebase use --add

# Projets configurés :
# - development (émulateurs locaux)
# - staging (tests)
# - production (live)
```

#### Variables d'Environnement par Projet
```bash
# Staging
firebase functions:config:set \
  jwt.secret="staging-secret" \
  smtp.host="smtp.gmail.com" \
  --project staging

# Production
firebase functions:config:set \
  jwt.secret="production-secret" \
  smtp.host="smtp.sendgrid.net" \
  --project production
```

### Processus de Déploiement

#### 1. Préparation
```bash
# Validation complète
npm run lint
npm run test:ci
npm run build

# Vérification de sécurité
npm audit
npm run security:check
```

#### 2. Déploiement Staging
```bash
# Basculer vers staging
firebase use staging

# Déploiement complet
npm run deploy:staging

# Tests de validation
npm run test:e2e:staging
```

#### 3. Déploiement Production
```bash
# Basculer vers production
firebase use production

# Déploiement par étapes
npm run deploy:functions  # Backend d'abord
npm run deploy:hosting    # Frontend ensuite

# Monitoring post-déploiement
npm run monitor:health
```

### Scripts de Déploiement

#### Package.json Scripts
```json
{
  "scripts": {
    "deploy": "npm run build && firebase deploy",
    "deploy:functions": "npm run build:backend && firebase deploy --only functions",
    "deploy:hosting": "npm run build:frontend && firebase deploy --only hosting",
    "deploy:staging": "firebase use staging && npm run deploy",
    "deploy:prod": "firebase use production && npm run deploy",
    "rollback": "firebase functions:delete --force",
    "monitor:health": "node scripts/health-check.js"
  }
}
```

#### Script de Santé Post-Déploiement
```javascript
// scripts/health-check.js
const axios = require('axios')

async function healthCheck() {
  const endpoints = [
    'https://api.attendance-x.com/health',
    'https://api.attendance-x.com/api/auth/status',
    'https://app.attendance-x.com'
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, { timeout: 10000 })
      console.log(`✅ ${endpoint}: ${response.status}`)
    } catch (error) {
      console.error(`❌ ${endpoint}: ${error.message}`)
      process.exit(1)
    }
  }

  console.log('🎉 All endpoints healthy!')
}

healthCheck()
```

### Monitoring et Alertes

#### Métriques Surveillées
```yaml
# Google Cloud Monitoring
metrics:
  - function_executions
  - function_duration
  - function_errors
  - firestore_reads
  - firestore_writes
  - auth_requests

# Alertes configurées
alerts:
  - error_rate > 5%
  - response_time > 2s
  - function_failures > 10/min
  - storage_usage > 80%
```

#### Logs et Debugging
```bash
# Logs en temps réel
firebase functions:log --follow

# Logs par fonction
firebase functions:log --only functionName

# Logs avec filtres
firebase functions:log --filter "severity>=ERROR"

# Export des logs
gcloud logging read "resource.type=cloud_function" --format=json
```

---## 📚 Ressou
rces et documentation

### Documentation Principale

#### 📖 Guides Essentiels
- **[README.md](./README.md)** - Vue d'ensemble et démarrage rapide
- **[ONBOARDING_GUIDE.md](./ONBOARDING_GUIDE.md)** - Ce guide complet
- **[docs/README.md](./docs/README.md)** - Documentation organisée par domaines
- **[docs/🚀 GETTING_STARTED.md](./docs/🚀%20GETTING_STARTED.md)** - Guide de démarrage détaillé
- **[docs/🏗️ ARCHITECTURE.md](./docs/🏗️%20ARCHITECTURE.md)** - Architecture technique

#### 🔗 API et Intégrations
- **[Swagger UI](http://localhost:5001/api/docs)** - Documentation API interactive
- **[docs/api/README.md](./docs/api/README.md)** - Guide API complet
- **[docs/integration/](./docs/integration/)** - Guides d'intégration
- **[backend/functions/src/docs/](./backend/functions/src/docs/)** - Documentation technique API

#### 👥 Guides Utilisateur
- **[docs/user-guide/](./docs/user-guide/)** - Manuels utilisateur
- **[docs/user-guide/getting-started.md](./docs/user-guide/getting-started.md)** - Premier pas
- **[docs/user-guide/user-manual.md](./docs/user-guide/user-manual.md)** - Manuel complet

#### 🧪 Tests et Validation
- **[docs/testing/](./docs/testing/)** - Stratégies de test
- **[tests/README.md](./tests/README.md)** - Guide des tests
- **[docs/testing/test-strategy.md](./docs/testing/test-strategy.md)** - Stratégie globale

#### 🛠️ Développement
- **[docs/development/](./docs/development/)** - Guides développement
- **[docs/backend/](./docs/backend/)** - Documentation backend
- **[docs/frontend/](./docs/frontend/)** - Documentation frontend

### Spécifications Détaillées (.kiro/specs/)

#### 🎯 Spécifications par Fonctionnalité
```
.kiro/specs/
├── 📁 authentication/           # Authentification et sécurité
│   ├── 📄 requirements.md       # Exigences détaillées
│   ├── 📄 design.md            # Conception technique
│   └── 📄 tasks.md             # Tâches d'implémentation
├── 📁 user-management/         # Gestion des utilisateurs
├── 📁 organization-management/ # Gestion des organisations
├── 📁 event-management/        # Gestion des événements
├── 📁 presence-management/     # Gestion de présence
├── 📁 integrations/           # Intégrations tierces
├── 📁 notifications/          # Système de notifications
└── 📁 reporting/              # Rapports et analytics
```

#### 📋 Format des Spécifications
Chaque fonctionnalité suit le format :
- **requirements.md** : User stories et critères d'acceptation (EARS)
- **design.md** : Architecture, composants, interfaces, modèles de données
- **tasks.md** : Plan d'implémentation avec tâches détaillées

### Outils et Ressources Externes

#### 🛠️ Outils de Développement
- **[Firebase Console](https://console.firebase.google.com/)** - Gestion Firebase
- **[Google Cloud Console](https://console.cloud.google.com/)** - Infrastructure GCP
- **[VS Code](https://code.visualstudio.com/)** - IDE recommandé
- **[Postman](https://www.postman.com/)** - Tests API
- **[Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)** - Développement local

#### 📚 Documentation Technique
- **[Firebase Documentation](https://firebase.google.com/docs)** - Documentation Firebase
- **[React Documentation](https://react.dev/)** - Documentation React
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - Guide TypeScript
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Documentation Tailwind
- **[Jest Documentation](https://jestjs.io/docs/getting-started)** - Tests Jest
- **[Playwright Documentation](https://playwright.dev/)** - Tests E2E

#### 🔧 Outils de Qualité
- **[ESLint](https://eslint.org/)** - Linting JavaScript/TypeScript
- **[Prettier](https://prettier.io/)** - Formatage de code
- **[Zod](https://zod.dev/)** - Validation de schémas
- **[Swagger/OpenAPI](https://swagger.io/)** - Documentation API

### Ressources d'Apprentissage

#### 🎓 Formation Backend
- **Node.js & TypeScript** : Bases du développement backend
- **Firebase Functions** : Fonctions serverless
- **Firestore** : Base de données NoSQL
- **JWT Authentication** : Authentification sécurisée
- **API Design** : Conception d'API REST

#### 🎨 Formation Frontend
- **React & TypeScript** : Développement d'interfaces
- **Redux Toolkit** : Gestion d'état
- **Tailwind CSS** : Styling moderne
- **React Testing Library** : Tests de composants
- **Vite** : Build tool moderne

#### 🔒 Sécurité
- **OWASP Top 10** : Vulnérabilités web courantes
- **JWT Security** : Bonnes pratiques JWT
- **Firebase Security Rules** : Sécurisation Firestore
- **Rate Limiting** : Protection contre les abus
- **Data Encryption** : Chiffrement des données

### Support et Communauté

#### 💬 Canaux de Communication
- **GitHub Issues** : Bugs et demandes de fonctionnalités
- **GitHub Discussions** : Questions et discussions générales
- **Slack Workspace** : Communication équipe (interne)
- **Email Support** : support@attendance-x.com

#### 🆘 Résolution de Problèmes
- **[docs/troubleshooting/](./docs/troubleshooting/)** - Guide de dépannage
- **[docs/troubleshooting/common-issues.md](./docs/troubleshooting/common-issues.md)** - Problèmes courants
- **[docs/troubleshooting/debugging-guide.md](./docs/troubleshooting/debugging-guide.md)** - Guide de debugging

#### 📊 Monitoring et Métriques
- **[Google Cloud Monitoring](https://console.cloud.google.com/monitoring)** - Métriques infrastructure
- **[Firebase Analytics](https://console.firebase.google.com/project/_/analytics)** - Analytics utilisateur
- **[Sentry](https://sentry.io/)** - Monitoring des erreurs (si configuré)

### Checklist d'Onboarding

#### ✅ Configuration Initiale
- [ ] Cloner le repository
- [ ] Installer Node.js >= 18.0.0
- [ ] Installer Firebase CLI
- [ ] Configurer les variables d'environnement
- [ ] Lancer `npm run install:all`
- [ ] Tester `npm run dev`

#### ✅ Environnement de Développement
- [ ] Configurer VS Code avec les extensions recommandées
- [ ] Tester l'accès à Swagger UI (http://localhost:5001/api/docs)
- [ ] Vérifier les émulateurs Firebase (http://localhost:4000)
- [ ] Lancer les tests : `npm run test`
- [ ] Valider le linting : `npm run lint`

#### ✅ Compréhension du Projet
- [ ] Lire la documentation architecture
- [ ] Explorer la structure du code
- [ ] Comprendre le système multi-tenant
- [ ] Étudier les spécifications (.kiro/specs/)
- [ ] Tester les fonctionnalités principales

#### ✅ Premier Développement
- [ ] Créer une branche de test
- [ ] Implémenter une petite fonctionnalité
- [ ] Écrire des tests
- [ ] Créer une Pull Request
- [ ] Passer le code review

### Contacts et Escalade

#### 👨‍💼 Équipe Projet
- **Tech Lead** : [nom] - Architecture et décisions techniques
- **Backend Lead** : [nom] - API et services backend
- **Frontend Lead** : [nom] - Interface utilisateur
- **DevOps** : [nom] - Infrastructure et déploiement
- **QA Lead** : [nom] - Tests et qualité

#### 🚨 Escalade des Problèmes
1. **Niveau 1** : Documentation et guides de dépannage
2. **Niveau 2** : GitHub Issues ou Discussions
3. **Niveau 3** : Contact direct équipe (Slack/Email)
4. **Niveau 4** : Escalade management si critique

---

## 🎯 Prochaines Étapes

### Pour les Nouveaux Développeurs

#### Semaine 1 : Découverte
- [ ] Lire ce guide d'onboarding complet
- [ ] Configurer l'environnement de développement
- [ ] Explorer le code et l'architecture
- [ ] Lancer et tester l'application localement
- [ ] Comprendre le workflow de développement

#### Semaine 2 : Première Contribution
- [ ] Choisir une tâche simple (good first issue)
- [ ] Implémenter la fonctionnalité avec TDD
- [ ] Écrire la documentation nécessaire
- [ ] Créer une Pull Request
- [ ] Intégrer les retours du code review

#### Semaine 3-4 : Montée en Compétences
- [ ] Travailler sur des fonctionnalités plus complexes
- [ ] Contribuer aux tests et à la documentation
- [ ] Participer aux code reviews
- [ ] Proposer des améliorations

### Pour les Contributeurs Expérimentés

#### Objectifs Court Terme (1-3 mois)
- [ ] Finaliser les intégrations OAuth 2.0
- [ ] Améliorer l'interface utilisateur
- [ ] Optimiser les performances
- [ ] Renforcer la couverture de tests

#### Objectifs Moyen Terme (3-6 mois)
- [ ] Implémenter les modules CRM et Ventes
- [ ] Développer les fonctionnalités IA/ML
- [ ] Créer les applications mobiles
- [ ] Obtenir les certifications sécurité

#### Objectifs Long Terme (6-12 mois)
- [ ] Lancer la marketplace d'extensions
- [ ] Développer l'API publique
- [ ] Expansion internationale
- [ ] Partenariats stratégiques

---

## 📞 Besoin d'Aide ?

### Ressources Rapides
- **🚀 Démarrage rapide** : [README.md](./README.md)
- **🏗️ Architecture** : [docs/🏗️ ARCHITECTURE.md](./docs/🏗️%20ARCHITECTURE.md)
- **🔗 API** : http://localhost:5001/api/docs
- **🛠️ Dépannage** : [docs/troubleshooting/](./docs/troubleshooting/)

### Contact
- **Issues GitHub** : Pour les bugs et demandes de fonctionnalités
- **Discussions GitHub** : Pour les questions générales
- **Email** : support@attendance-x.com
- **Documentation** : [docs/README.md](./docs/README.md)

---

*Bienvenue dans l'équipe Attendance Management System ! 🎉*

*Ce guide est maintenu à jour régulièrement. N'hésitez pas à proposer des améliorations via une Pull Request.*