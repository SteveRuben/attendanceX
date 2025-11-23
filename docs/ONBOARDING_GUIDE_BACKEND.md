# 🚀 Guide d'Onboarding Backend - Attendance Management System

## 📋 Table des Matières

1. [Vue d'ensemble du Backend](#vue-densemble-du-backend)
2. [Architecture Backend](#architecture-backend)
3. [Configuration de développement](#configuration-de-développement)
4. [Structure du projet Backend](#structure-du-projet-backend)
5. [Services et API](#services-et-api)
6. [Base de données et modèles](#base-de-données-et-modèles)
7. [Authentification et sécurité](#authentification-et-sécurité)
8. [Tests Backend](#tests-backend)
9. [Déploiement](#déploiement)
10. [Ressources et documentation](#ressources-et-documentation)

---

## 🎯 Vue d'ensemble du Backend

### Stack Technique Backend
```
Runtime:     Node.js 18+ + TypeScript
Framework:   Firebase Functions + Express.js
Database:    Firestore (NoSQL) + Firebase Auth
API:         REST + Swagger/OpenAPI 3.0
Security:    JWT + 2FA + Rate Limiting + Audit Logs
Testing:     Jest + Supertest + Firebase Emulators
Deployment:  Google Cloud Functions
Monitoring:  Firebase Analytics + Custom Metrics
```

### Architecture SaaS Multi-Tenant
- **Isolation des données** par `tenantId` automatique
- **Plans d'abonnement** avec limites et fonctionnalités
- **Facturation automatisée** via Stripe
- **Services modulaires** avec injection de dépendances
- **Middleware de sécurité** pour chaque requête
- **Audit logs** complets des actions par tenant

### Fonctionnalités Backend Principales
- 🔐 **Authentification JWT** avec refresh tokens et 2FA
- 🏢 **Gestion des tenants** avec onboarding automatisé
- 💳 **Abonnements et facturation** via Stripe
- 👥 **Gestion des utilisateurs** multi-rôles et multi-tenants
- 📅 **Événements** avec participants et récurrence
- ✅ **Présence** avec géolocalisation et validation
- 🔗 **Intégrations OAuth** (Google, Microsoft, Apple, Slack)
- 📊 **Analytics** et rapports en temps réel par tenant
- 🔔 **Notifications** multi-canaux avec branding par tenant---


## 🏗️ Architecture Backend

### Architecture SaaS Multi-Tenant
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Tenant Mgmt   │    │   Subscription  │
│   Rate Limiting │◄──►│   Context       │◄──►│   Management    │
│   Auth + 2FA    │    │   Isolation     │    │   Billing       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │   Data Layer    │
│   Validation    │◄──►│  Business Logic │◄──►│   Firestore     │
│   Error Handling│    │   Integrations  │    │   Collections   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Couches d'Architecture

#### 1. API Gateway Layer
- **Rate Limiting** : Limites par tenant et par plan
- **Authentication** : JWT + 2FA + refresh tokens
- **Tenant Context** : Injection automatique du contexte tenant
- **CORS & Security** : Headers de sécurité et CORS configurables

#### 2. Controllers Layer
- **Request Validation** : Validation Zod des entrées
- **Response Formatting** : Format standardisé des réponses
- **Error Handling** : Gestion centralisée des erreurs
- **Audit Logging** : Logs automatiques des actions

#### 3. Services Layer
- **Business Logic** : Logique métier pure et testable
- **Tenant Isolation** : Filtrage automatique par tenant
- **Feature Gating** : Activation/désactivation par plan
- **External Integrations** : Services tiers (OAuth, Stripe, etc.)

#### 4. Data Access Layer
- **Models** : Représentation des entités métier
- **Repositories** : Accès aux données avec isolation tenant
- **Migrations** : Gestion des changements de schéma
- **Indexes** : Optimisation des requêtes Firestore

---

## ⚙️ Configuration de développement

### Prérequis
```bash
# Versions requises
Node.js >= 18.0.0
npm >= 8.0.0
Firebase CLI >= 12.0.0

# Installation Firebase CLI
npm install -g firebase-tools
firebase login
```

### Installation Backend
```bash
# Cloner le repository
git clone <repository-url>
cd attendance-management-system

# Installer les dépendances backend
cd backend/functions
npm install

# Configuration Firebase
firebase use --add
firebase functions:config:get > .runtimeconfig.json
```

### Variables d'Environnement Backend
```env
# backend/functions/.env

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Multi-Tenant Configuration
TENANT_ISOLATION_ENABLED=true
DEFAULT_PLAN_ID=basic
MAX_TENANTS_PER_USER=5

# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Configuration (Development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@your-domain.com

# OAuth Integrations
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# Development
NODE_ENV=development
PORT=5001
CORS_ORIGIN=http://localhost:3000
DEBUG_MODE=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Security
BCRYPT_ROUNDS=12
AES_ENCRYPTION_KEY=your-32-character-encryption-key
TOTP_SECRET_LENGTH=32
BACKUP_CODES_COUNT=10

# Monitoring & Analytics
ENABLE_ANALYTICS=true
ANALYTICS_SAMPLE_RATE=0.1
LOG_LEVEL=info
```

### Démarrage du Backend
```bash
# Démarrer avec émulateurs Firebase (recommandé)
npm run dev

# Ou démarrer seulement les fonctions
npm run serve

# Démarrer avec debugging
npm run dev:debug

# Services disponibles :
# - API: http://localhost:5001
# - Swagger UI: http://localhost:5001/api/docs
# - Firebase Emulator UI: http://localhost:4000
# - Firestore Emulator: http://localhost:8080
```