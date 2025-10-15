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
Security:    JWT + 2FA + Rate Limiting + Multi-Tenant
Testing:     Jest + Supertest + Firebase Emulators
Deployment:  Google Cloud Functions
Monitoring:  Firebase Analytics + Custom Metrics
```

### Architecture SaaS Multi-Tenant
- **Isolation des données** par `tenantId` automatique dans toutes les requêtes
- **Plans d'abonnement** (Basic, Professional, Enterprise) avec limites
- **Facturation automatisée** via Stripe avec webhooks
- **Onboarding automatisé** des nouveaux tenants
- **Personnalisation** par tenant (branding, domaines, features)
- **Monitoring** et analytics par tenant
- **Scalabilité** horizontale avec isolation des ressources

### Fonctionnalités Backend Principales
- 🔐 **Authentification JWT** avec refresh tokens et 2FA
- 🏢 **Gestion des tenants** avec onboarding et configuration
- 💳 **Abonnements et facturation** via Stripe avec gestion des limites
- 👥 **Gestion des utilisateurs** multi-rôles et multi-tenants
- 📅 **Événements** avec participants, récurrence et notifications
- ✅ **Présence** avec géolocalisation, QR codes et validation
- 🔗 **Intégrations OAuth** (Google, Microsoft, Apple, Slack)
- 📊 **Analytics** et rapports isolés par tenant
- 🔔 **Notifications** multi-canaux avec branding personnalisé
- 🛡️ **Sécurité** avec audit logs et conformité RGPD

---

## 🏗️ Architecture Backend

### Architecture Globale SaaS
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Controllers   │    │    Services     │
│ - Rate Limiting │◄──►│ - Validation    │◄──►│ - Business Logic│
│ - Auth + Tenant │    │ - Error Handling│    │ - Data Access   │
│ - Feature Gates │    │ - Tenant Context│    │ - Integrations  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Database      │◄─────────────┘
                        │ - Firestore     │
                        │ - Multi-Tenant  │
                        │ - Encrypted     │
                        └─────────────────┘
```
### I
solation Multi-Tenant
```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│  Tenant A           │  Tenant B           │  Tenant C       │
│ ┌─────────────┐     │ ┌─────────────┐     │ ┌─────────────┐ │
│ │ Users       │     │ │ Users       │     │ │ Users       │ │
│ │ Events      │     │ │ Events      │     │ │ Events      │ │
│ │ Attendances │     │ │ Attendances │     │ │ Attendances │ │
│ │ Settings    │     │ │ Settings    │     │ │ Settings    │ │
│ │ Subscription│     │ │ Subscription│     │ │ Subscription│ │
│ │ Analytics   │     │ │ Analytics   │     │ │ Analytics   │ │
│ └─────────────┘     │ └─────────────┘     │ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Platform Services                        │
│ - Tenant Management  - Billing & Subscriptions             │
│ - Authentication     - Notifications & Email               │
│ - Analytics Platform - Integrations & OAuth                │
│ - Monitoring & Logs  - Backup & Security                   │
└─────────────────────────────────────────────────────────────┘
```

### Couches d'Architecture

#### 1. API Layer (Routes + Controllers)
- **Routes** : Définition des endpoints REST avec versioning
- **Controllers** : Gestion des requêtes HTTP et validation
- **Middleware** : Authentification, tenant context, rate limiting
- **Error Handling** : Gestion centralisée avec codes d'erreur standardisés

#### 2. Business Logic Layer (Services)
- **Tenant Services** : Gestion des tenants et onboarding
- **Subscription Services** : Plans, facturation, limites d'usage
- **Core Services** : Logique métier (users, events, attendance)
- **Integration Services** : OAuth, notifications, webhooks
- **Analytics Services** : Métriques et rapports par tenant

#### 3. Data Access Layer (Models + Database)
- **Models** : Entités métier avec validation Zod
- **Repositories** : Accès aux données avec isolation tenant
- **Migrations** : Gestion des changements de schéma
- **Indexes** : Optimisation des requêtes multi-tenant

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
DEFAULT_TENANT_PLAN=basic
TENANT_ONBOARDING_ENABLED=true

# Stripe Configuration (SaaS Billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

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
RATE_LIMIT_PER_TENANT=true

# Security
BCRYPT_ROUNDS=12
AES_ENCRYPTION_KEY=your-32-character-encryption-key
AUDIT_LOGS_ENABLED=true

# Features Flags
ENABLE_2FA=true
ENABLE_OAUTH_INTEGRATIONS=true
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
```

### Démarrage du Backend
```bash
# Démarrer avec émulateurs Firebase
npm run dev

# Ou démarrer seulement les fonctions
npm run serve

# Services disponibles :
# - API: http://localhost:5001
# - Swagger UI: http://localhost:5001/api/docs
# - Firebase Emulator: http://localhost:4000
# - Firestore UI: http://localhost:4000/firestore
```