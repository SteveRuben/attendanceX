# 📁 Organisation du Projet AttendanceX

Ce document décrit l'organisation des dossiers et fichiers du projet.

---

## 📂 Structure Principale

```
attendance-management-system/
├── 📁 backend/              # Backend Firebase Functions
├── 📁 frontend-v2/          # Frontend Next.js
├── 📁 docs/                 # 📚 Documentation complète
├── 📁 tests/                # Tests (backend, frontend, e2e)
├── 📁 scripts/              # Scripts utilitaires
├── 📁 cypress/              # Tests Cypress E2E
├── 📁 curl/                 # Scripts de test API
├── 📁 .github/              # Configuration GitHub Actions
├── 📁 .kiro/                # Configuration Kiro AI
├── 📄 README.md             # README principal
├── 📄 CHANGELOG.md          # Historique des changements
├── 📄 LICENSE               # Licence MIT
└── 📄 package.json          # Configuration npm root
```

---

## 📚 Documentation (docs/)

Toute la documentation est organisée dans le dossier `docs/`:

### Structure de docs/

```
docs/
├── 📄 INDEX.md              # Index de navigation de la documentation
├── 📄 README.md             # README GitHub Pages
│
├── 📁 deployment/           # ⭐ Documentation de déploiement
│   ├── README.md            # Guide principal
│   ├── DEPLOY_NOW.md        # Démarrage rapide
│   ├── DEPLOYMENT_READY.md  # État de préparation
│   ├── DEPLOYMENT_STATUS.md # Statut actuel
│   ├── VERCEL_*.md          # Guides Vercel spécifiques
│   └── ENV_VARS_*.txt       # Variables d'environnement
│
├── 📁 setup/                # Configuration initiale
│   ├── backend-setup.md
│   ├── backend-testing-guide.md
│   └── getting-started.md
│
├── 📁 architecture/         # Architecture système
│   ├── README.md
│   └── backend-architecture-*.md
│
├── 📁 security/             # Sécurité et OWASP
│   ├── README.md
│   ├── owasp-checklist.md
│   └── authentication-security.md
│
├── 📁 features/             # Documentation des fonctionnalités
│   ├── i18n-implementation.md
│   ├── multi-tenant-email-config.md
│   └── ...
│
├── 📁 api/                  # Documentation API
│   ├── README.md
│   └── examples.md
│
├── 📁 fixes/                # Documentation des corrections
│   ├── authentication-fix-summary.md
│   ├── permission-middleware-fix.md
│   └── ...
│
├── 📁 ticketing/            # Système de billetterie
├── 📁 integrations/         # Guides d'intégration
├── 📁 ux-ui/                # Design system
├── 📁 testing/              # Guides de test
├── 📁 debug/                # Guides de débogage
└── 📁 analysis/             # Analyses business
```

---

## 🚀 Backend (backend/)

```
backend/
├── 📁 functions/            # Firebase Cloud Functions
│   ├── 📁 src/              # Code source TypeScript
│   │   ├── 📁 controllers/  # Contrôleurs API
│   │   ├── 📁 services/     # Logique métier
│   │   ├── 📁 models/       # Modèles de données
│   │   ├── 📁 routes/       # Définition des routes
│   │   ├── 📁 middleware/   # Middleware Express
│   │   ├── 📁 types/        # Types TypeScript
│   │   └── 📁 utils/        # Utilitaires
│   │
│   ├── 📁 lib/              # Code compilé JavaScript
│   ├── 📄 package.json      # Dépendances backend
│   ├── 📄 tsconfig.json     # Configuration TypeScript
│   └── 📄 .env              # Variables d'environnement
│
├── 📄 firebase.json         # Configuration Firebase
├── 📄 firestore.rules       # Règles Firestore
└── 📄 firestore.indexes.json # Indexes Firestore
```

---

## 💻 Frontend (frontend-v2/)

```
frontend-v2/
├── 📁 src/
│   ├── 📁 pages/            # Pages Next.js
│   │   ├── 📁 api/          # API routes
│   │   ├── 📁 app/          # Pages application
│   │   ├── 📁 auth/         # Pages authentification
│   │   └── 📁 onboarding/   # Pages onboarding
│   │
│   ├── 📁 components/       # Composants React
│   │   ├── 📁 ui/           # Composants UI de base
│   │   ├── 📁 layout/       # Layout et navigation
│   │   ├── 📁 auth/         # Composants auth
│   │   └── 📁 [feature]/    # Composants par feature
│   │
│   ├── 📁 hooks/            # Hooks React personnalisés
│   ├── 📁 services/         # Services API
│   ├── 📁 contexts/         # Contextes React
│   ├── 📁 utils/            # Utilitaires
│   ├── 📁 types/            # Types TypeScript
│   └── 📁 styles/           # Styles globaux
│
├── 📁 public/               # Fichiers statiques
│   └── 📁 locales/          # Traductions i18n
│       ├── 📁 en/           # Anglais
│       ├── 📁 fr/           # Français
│       ├── 📁 es/           # Espagnol
│       └── 📁 de/           # Allemand
│
├── 📄 package.json          # Dépendances frontend
├── 📄 next.config.js        # Configuration Next.js
├── 📄 next-i18next.config.js # Configuration i18n
├── 📄 tsconfig.json         # Configuration TypeScript
├── 📄 tailwind.config.ts    # Configuration Tailwind
├── 📄 vercel.json           # Configuration Vercel
└── 📄 README.md             # README frontend
```

---

## 🧪 Tests (tests/)

```
tests/
├── 📁 backend/              # Tests backend
│   ├── 📁 unit/             # Tests unitaires
│   ├── 📁 integration/      # Tests d'intégration
│   ├── 📁 e2e/              # Tests end-to-end
│   └── 📄 jest.config.js    # Configuration Jest
│
├── 📁 frontend/             # Tests frontend
│   ├── 📁 components/       # Tests de composants
│   ├── 📁 hooks/            # Tests de hooks
│   └── 📁 services/         # Tests de services
│
└── 📁 e2e/                  # Tests E2E Playwright
```

---

## 🔧 Scripts (scripts/)

```
scripts/
├── 📄 setup.sh              # Script de configuration
├── 📄 deploy.sh             # Script de déploiement
├── 📄 backup.sh             # Script de sauvegarde
└── 📄 README.md             # Documentation des scripts
```

---

## 📝 Fichiers Racine

### Fichiers de Configuration

- **package.json** - Configuration npm root (scripts globaux)
- **package-lock.json** - Lock file npm
- **.gitignore** - Fichiers ignorés par Git
- **cypress.config.js** - Configuration Cypress

### Documentation

- **README.md** - README principal du projet
- **CHANGELOG.md** - Historique des changements
- **CODE_OF_CONDUCT.md** - Code de conduite
- **LICENSE** - Licence MIT
- **ORGANIZATION.md** - Ce fichier

---

## 🗂️ Fichiers Supprimés

Les fichiers suivants ont été supprimés car inutiles:

- ❌ `.lighthouserc.json` - Configuration Lighthouse (non utilisée)
- ❌ `.lighthouserc-mobile.json` - Configuration Lighthouse mobile (non utilisée)
- ❌ `firebase-debug.log` - Fichier de log temporaire

---

## 📖 Navigation Rapide

### Pour Déployer
→ [docs/deployment/DEPLOY_NOW.md](docs/deployment/DEPLOY_NOW.md)

### Pour Configurer le Backend
→ [docs/setup/backend-setup.md](docs/setup/backend-setup.md)

### Pour Développer
→ [docs/INDEX.md](docs/INDEX.md)

### Pour la Sécurité
→ [docs/security/README.md](docs/security/README.md)

---

## 🎯 Bonnes Pratiques

### Documentation

- **Toujours** mettre la documentation dans `docs/`
- **Organiser** par catégorie (deployment, setup, features, etc.)
- **Créer** un README dans chaque sous-dossier
- **Mettre à jour** INDEX.md quand vous ajoutez de la doc

### Code

- **Backend** : Suivre le pattern MVC (routes → controllers → services → models)
- **Frontend** : Composants réutilisables dans `components/ui/`
- **Tests** : Toujours ajouter des tests pour les nouvelles fonctionnalités

### Commits

- **Utiliser** Conventional Commits (feat:, fix:, docs:, etc.)
- **Être** descriptif dans les messages
- **Référencer** les issues si applicable

---

## 🔄 Dernières Modifications

- **Janvier 2026** : Organisation de la documentation de déploiement
- **Janvier 2026** : Nettoyage du dossier root
- **Janvier 2026** : Création de docs/deployment/
- **Janvier 2026** : Ajout de INDEX.md

---

**Version**: 1.0.0  
**Dernière mise à jour**: Janvier 2026
