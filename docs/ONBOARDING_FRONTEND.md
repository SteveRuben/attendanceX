# 🚀 Guide d'Onboarding Frontend - Attendance Management System

## 📋 Table des Matières

1. [Vue d'ensemble du Frontend](#vue-densemble-du-frontend)
2. [Architecture Frontend](#architecture-frontend)
3. [Configuration de développement](#configuration-de-développement)
4. [Structure du projet Frontend](#structure-du-projet-frontend)
5. [Composants et Pages](#composants-et-pages)
6. [État et gestion des données](#état-et-gestion-des-données)
7. [Authentification et routing](#authentification-et-routing)
8. [Tests Frontend](#tests-frontend)
9. [Build et déploiement](#build-et-déploiement)
10. [Ressources et documentation](#ressources-et-documentation)

---

## 🎯 Vue d'ensemble du Frontend

### Stack Technique Frontend
```
Framework:   React 18 + TypeScript
Build Tool:  Vite (ultra-rapide)
Styling:     Tailwind CSS + Headless UI
State:       Redux Toolkit + RTK Query
Routing:     React Router v6
Forms:       React Hook Form + Zod
Testing:     Jest + Testing Library + Playwright
UI/UX:       Responsive Design + Dark Mode
```

### Architecture SaaS Multi-Tenant
- **Contexte tenant** automatique dans toute l'application
- **Branding dynamique** selon le tenant actuel
- **Feature flags** basés sur le plan d'abonnement
- **Navigation adaptative** selon les permissions
- **Thèmes personnalisés** par tenant
- **Notifications** en temps réel par tenant

### Fonctionnalités Frontend Principales
- 🔐 **Authentification** avec 2FA et gestion multi-tenant
- 🏢 **Onboarding tenant** avec assistant guidé
- 💳 **Gestion d'abonnement** avec interface Stripe
- 👥 **Gestion des utilisateurs** avec invitations
- 📅 **Calendrier d'événements** avec vues multiples
- ✅ **Interface de présence** avec QR codes et géolocalisation
- 🔗 **Configuration des intégrations** OAuth
- 📊 **Tableaux de bord** avec analytics temps réel
- 🔔 **Centre de notifications** multi-canaux
- 🎨 **Personnalisation** du branding et thèmes

---

## 🏗️ Architecture Frontend

### Architecture Globale
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Pages       │    │   Components    │    │    Services     │
│ - Dashboard     │◄──►│ - UI Library    │◄──►│ - API Client    │
│ - Events        │    │ - Forms         │    │ - Auth Service  │
│ - Settings      │    │ - Layout        │    │ - Tenant Context│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Redux Store   │◄─────────────┘
                        │ - Auth State    │
                        │ - Tenant State  │
                        │ - UI State      │
                        └─────────────────┘
```

### Architecture Multi-Tenant
```
┌─────────────────────────────────────────────────────────────┐
│                    Tenant Context Provider                   │
├─────────────────────────────────────────────────────────────┤
│  Tenant A UI        │  Tenant B UI        │  Tenant C UI    │
│ ┌─────────────┐     │ ┌─────────────┐     │ ┌─────────────┐ │
│ │ Blue Theme  │     │ │ Green Theme │     │ │ Purple Theme│ │
│ │ Logo A      │     │ │ Logo B      │     │ │ Logo C      │ │
│ │ Features:   │     │ │ Features:   │     │ │ Features:   │ │
│ │ - Basic     │     │ │ - Pro       │     │ │ - Enterprise│ │
│ │ - 50 Users  │     │ │ - 200 Users │     │ │ - Unlimited │ │
│ └─────────────┘     │ └─────────────┘     │ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Shared Components                        │
│ - Navigation        - Forms            - Modals            │
│ - Tables           - Charts           - Notifications       │
│ - Buttons          - Inputs           - Loading States      │
└─────────────────────────────────────────────────────────────┘
```

### Couches d'Architecture

#### 1. Presentation Layer (Pages + Layout)
- **Pages** : Vues principales de l'application
- **Layout** : Structure commune (header, sidebar, footer)
- **Routing** : Navigation avec protection par rôles
- **Responsive** : Adaptation mobile/desktop

#### 2. Component Layer (UI + Business)
- **UI Components** : Composants réutilisables (buttons, inputs, modals)
- **Business Components** : Logique métier (forms, tables, charts)
- **Tenant Components** : Composants avec branding dynamique
- **Feature Components** : Composants conditionnels selon le plan

#### 3. State Management Layer (Redux + Context)
- **Redux Store** : État global de l'application
- **Tenant Context** : Contexte du tenant actuel
- **Auth Context** : État d'authentification
- **Theme Context** : Thème et branding dynamique

---

## ⚙️ Configuration de développement

### Prérequis
```bash
# Versions requises
Node.js >= 18.0.0
npm >= 8.0.0

# Outils recommandés
VS Code + Extensions React/TypeScript
```

### Installation Frontend
```bash
# Cloner le repository
git clone <repository-url>
cd attendance-management-system

# Installer les dépendances frontend
cd frontend
npm install
```#
## Variables d'Environnement Frontend
```env
# frontend/.env

# API Configuration
VITE_API_URL=http://localhost:5001/api/v1
VITE_API_TIMEOUT=30000

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Multi-Tenant Configuration
VITE_ENABLE_MULTI_TENANT=true
VITE_DEFAULT_THEME=light
VITE_ENABLE_TENANT_BRANDING=true

# Stripe Configuration (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Development
VITE_NODE_ENV=development
VITE_DEBUG=true
VITE_ENABLE_DEVTOOLS=true

# Features Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_INTEGRATIONS=true
VITE_ENABLE_ML_FEATURES=false
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_DARK_MODE=true

# External Services
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
VITE_SENTRY_DSN=your-sentry-dsn
```

### Démarrage du Frontend
```bash
# Démarrer le serveur de développement
npm run dev

# Ou avec hot reload avancé
npm run dev:turbo

# Services disponibles :
# - Frontend: http://localhost:3000
# - Storybook: http://localhost:6006 (si configuré)
```

### Configuration IDE (VS Code)

#### Extensions Recommandées Frontend
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "steoates.autoimport-es6-ts"
  ]
}
```

---

## 📁 Structure du projet Frontend

### Vue d'ensemble Frontend
```
frontend/
├── 📁 public/                     # Assets statiques
│   ├── 📄 index.html              # Template HTML
│   ├── 📁 icons/                  # Icônes et favicons
│   └── 📁 images/                 # Images statiques
├── 📁 src/
│   ├── 📁 components/             # Composants React
│   │   ├── 📁 ui/                 # Composants UI de base
│   │   ├── 📁 forms/              # Formulaires
│   │   ├── 📁 layout/             # Composants de mise en page
│   │   ├── 📁 tenant/             # Composants multi-tenant
│   │   └── 📁 features/           # Composants par fonctionnalité
│   ├── 📁 pages/                  # Pages de l'application
│   │   ├── 📁 auth/               # Pages d'authentification
│   │   ├── 📁 dashboard/          # Tableau de bord
│   │   ├── 📁 events/             # Gestion événements
│   │   ├── 📁 attendance/         # Gestion présence
│   │   ├── 📁 settings/           # Paramètres
│   │   └── 📁 onboarding/         # Onboarding tenant
│   ├── 📁 services/               # Services API
│   │   ├── 📄 api.service.ts      # Client API de base
│   │   ├── 📄 auth.service.ts     # Service authentification
│   │   ├── 📄 tenant.service.ts   # Service tenant
│   │   └── 📄 subscription.service.ts # Service abonnements
│   ├── 📁 store/                  # État Redux
│   │   ├── 📄 store.ts            # Configuration store
│   │   ├── 📁 slices/             # Slices Redux
│   │   └── 📁 api/                # RTK Query APIs
│   ├── 📁 hooks/                  # Hooks personnalisés
│   │   ├── 📄 useAuth.ts          # Hook authentification
│   │   ├── 📄 useTenant.ts        # Hook tenant
│   │   └── 📄 useSubscription.ts  # Hook abonnement
│   ├── 📁 contexts/               # Contextes React
│   │   ├── 📄 TenantContext.tsx   # Contexte tenant
│   │   ├── 📄 ThemeContext.tsx    # Contexte thème
│   │   └── 📄 NotificationContext.tsx # Contexte notifications
│   ├── 📁 utils/                  # Utilitaires
│   │   ├── 📄 date.utils.ts       # Utilitaires dates
│   │   ├── 📄 format.utils.ts     # Formatage
│   │   └── 📄 validation.utils.ts # Validation
│   ├── 📁 types/                  # Types TypeScript
│   │   ├── 📄 api.types.ts        # Types API
│   │   ├── 📄 tenant.types.ts     # Types tenant
│   │   └── 📄 common.types.ts     # Types communs
│   ├── 📁 styles/                 # Styles globaux
│   │   ├── 📄 globals.css         # Styles globaux
│   │   ├── 📄 components.css      # Styles composants
│   │   └── 📄 themes.css          # Thèmes tenant
│   └── 📄 main.tsx                # Point d'entrée
├── 📄 package.json                # Dépendances
├── 📄 vite.config.ts              # Configuration Vite
├── 📄 tailwind.config.ts          # Configuration Tailwind
├── 📄 tsconfig.json               # Configuration TypeScript
└── 📄 .eslintrc.js                # Configuration ESLint
```

### Structure Détaillée des Composants
```
src/components/
├── 📁 ui/                         # Composants UI réutilisables
│   ├── 📄 Button.tsx              # Boutons avec variants
│   ├── 📄 Input.tsx               # Champs de saisie
│   ├── 📄 Modal.tsx               # Modales
│   ├── 📄 Table.tsx               # Tableaux
│   ├── 📄 Card.tsx                # Cartes
│   ├── 📄 Badge.tsx               # Badges et labels
│   ├── 📄 Avatar.tsx              # Avatars utilisateur
│   ├── 📄 Spinner.tsx             # Indicateurs de chargement
│   └── 📄 Toast.tsx               # Notifications toast
├── 📁 forms/                      # Formulaires métier
│   ├── 📄 LoginForm.tsx           # Formulaire de connexion
│   ├── 📄 RegisterForm.tsx        # Formulaire d'inscription
│   ├── 📄 EventForm.tsx           # Formulaire événement
│   ├── 📄 UserForm.tsx            # Formulaire utilisateur
│   └── 📄 SettingsForm.tsx        # Formulaire paramètres
├── 📁 layout/                     # Composants de mise en page
│   ├── 📄 Header.tsx              # En-tête avec navigation
│   ├── 📄 Sidebar.tsx             # Barre latérale
│   ├── 📄 Footer.tsx              # Pied de page
│   ├── 📄 Navigation.tsx          # Navigation principale
│   └── 📄 Breadcrumb.tsx          # Fil d'Ariane
├── 📁 tenant/                     # Composants multi-tenant
│   ├── 📄 TenantSwitcher.tsx      # Sélecteur de tenant
│   ├── 📄 TenantBranding.tsx      # Branding dynamique
│   ├── 📄 FeatureGate.tsx         # Contrôle d'accès aux features
│   ├── 📄 PlanUpgrade.tsx         # Upgrade de plan
│   └── 📄 UsageLimits.tsx         # Affichage des limites
└── 📁 features/                   # Composants par fonctionnalité
    ├── 📁 auth/                   # Authentification
    ├── 📁 dashboard/              # Tableau de bord
    ├── 📁 events/                 # Événements
    ├── 📁 attendance/             # Présence
    ├── 📁 users/                  # Utilisateurs
    ├── 📁 settings/               # Paramètres
    ├── 📁 integrations/           # Intégrations
    ├── 📁 analytics/              # Analytics
    └── 📁 notifications/          # Notifications
```