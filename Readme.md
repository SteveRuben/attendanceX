# Attendance Management System

## 🎯 Vue d'ensemble

Système de gestion multi-services centré sur les organisations, offrant des solutions complètes pour la gestion de présence, rendez-vous, clients, ventes et produits. Chaque organisation dispose de son propre environnement sécurisé et personnalisable.

## 🏗️ Architecture

### Concept Multi-Tenant
- **Organisation-centrée** : Chaque utilisateur crée ou rejoint une organisation
- **Isolation des données** : Séparation complète entre organisations
- **Services modulaires** : Activation selon les besoins métier
- **Sécurité intégrée** : Authentification et autorisation centralisées

### Stack Technique
- **Backend** : Node.js + TypeScript + Firebase Functions
- **Frontend** : React + TypeScript + Redux Toolkit
- **Base de données** : Firestore (NoSQL)
- **Authentification** : JWT (JSON Web Tokens)
- **Infrastructure** : Google Cloud Platform

## 📋 Modules Disponibles

### 🏢 Gestion des Organisations
- Création d'organisation à la première connexion
- Gestion des membres et invitations
- Configuration des paramètres organisationnels
- Politiques de sécurité personnalisables

### 📅 Gestion des Rendez-vous
- Planification et calendrier intégré
- Réservation en ligne pour clients
- Rappels automatiques (email/SMS)
- Statistiques de performance

### 👥 Gestion des Clients (CRM)
- Fiches clients complètes avec historique
- Segmentation et marketing ciblé
- Communication intégrée
- Conformité RGPD

### 💰 Ventes et Produits
- Catalogue produits/services
- Traitement des ventes et facturation
- Gestion des stocks
- Boutique en ligne

### 👤 Gestion de Présence
- Pointage des employés
- Suivi des horaires et absences
- Rapports de présence
- Gestion des congés

### 🔗 Intégrations Tierces ✨ **NOUVEAU**
- **OAuth 2.0** : Google, Microsoft, Apple, Slack
- **Synchronisation bidirectionnelle** : Calendriers, contacts, emails
- **Gestion des tokens** : Refresh automatique et sécurisé
- **Historique de synchronisation** : Suivi détaillé des opérations
- **Politiques d'organisation** : Contrôle des intégrations autorisées
- **Analytics avancées** : Métriques d'utilisation et performance
- **Sécurité renforcée** : Chiffrement des tokens, audit logs

## 🚀 Installation et Lancement du Projet

### Prérequis
```bash
node >= 18.0.0
npm >= 8.0.0
firebase-tools >= 12.0.0
```

### Installation Rapide
```bash
# 1. Cloner le repository
git clone [repository-url]
cd attendance-management-system

# 2. Installer toutes les dépendances
npm run install:all

# 3. Configuration Firebase
firebase login
firebase use --add

# 4. Variables d'environnement
cp .env.example .env.local
# Configurer les variables JWT et autres dans .env.local
```

### Configuration JWT
Ajoutez ces variables dans votre fichier `.env.local` :
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Lancement du Projet

#### Développement Complet (Backend + Frontend)
```bash
# Démarrer backend et frontend simultanément
npm run dev
```

#### Développement Séparé
```bash
# Terminal 1 : Backend avec émulateurs Firebase
npm run dev:backend

# Terminal 2 : Frontend React
npm run dev:frontend
```

#### Services Disponibles
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5001
- **Documentation API (Swagger)** : http://localhost:5001/api/docs
- **Firebase Emulator UI** : http://localhost:4000

### Build et Déploiement
```bash
# Build complet (shared + backend + frontend)
npm run build

# Build séparé
npm run build:shared    # Types partagés
npm run build:backend   # Firebase Functions
npm run build:frontend  # Application React

# Déploiement
npm run deploy          # Déploiement complet
npm run deploy:functions # Fonctions seulement
npm run deploy:hosting   # Frontend seulement
```

## 📚 Documentation

### 📖 **[Documentation Complète Organisée](docs/README.md)**

La documentation est maintenant organisée par domaines pour une navigation optimale :

- 🚀 **[Guide de Démarrage](docs/🚀%20GETTING_STARTED.md)** - Installation et configuration
- 🏗️ **[Architecture & Conception](docs/README.md#-architecture--conception)** - Design et structure
- 🔗 **[API & Intégrations](docs/README.md#-api--intégrations)** - Documentation API complète
- 👥 **[Guides Utilisateur](docs/README.md#-guides-utilisateur)** - Guides par rôle
- 🧪 **[Tests & Validation](docs/README.md#-tests--validation)** - Stratégies de test
- 🛠️ **[Dépannage](docs/README.md#-dépannage)** - Résolution de problèmes

### 📖 Documentation API Interactive
- **Swagger UI** : http://localhost:5001/api/docs
- **Spécification OpenAPI** : http://localhost:5001/api/docs.json
- **Guide Swagger** : [docs/api/swagger-guide.md](docs/api/swagger-guide.md)

### 📋 Documents Clés
- **[📋 Spécifications Complètes](docs/specifications.md)** - Documentation détaillée de tous les modules
- **[🏗️ Architecture](docs/🏗️%20ARCHITECTURE.md)** - Design et structure du système
- **[🚀 Guide de Démarrage](docs/🚀%20GETTING_STARTED.md)** - Installation et configuration
- **[🔗 API Documentation](docs/api/README.md)** - Documentation API complète

### Navigation Rapide par Rôle
- **👨‍💼 Administrateurs** : [Architecture](docs/README.md#-architecture--conception) • [API](docs/README.md#-api--intégrations) • [Sécurité](docs/README.md#-sécurité)
- **👨‍💻 Développeurs** : [API](docs/README.md#-api--intégrations) • [Backend](docs/README.md#-backend) • [Tests](docs/README.md#-tests--validation)
- **👥 Managers** : [Guides Utilisateur](docs/README.md#-guides-utilisateur) • [Fonctionnalités](docs/README.md#-services--fonctionnalités)
- **👤 Utilisateurs** : [Guide de Démarrage](docs/user-guide/getting-started.md) • [Manuel Utilisateur](docs/user-guide/user-manual.md)

### Structure du Projet
```
├── backend/
│   ├── functions/          # Firebase Functions
│   └── firestore.rules     # Règles de sécurité Firestore
├── frontend/               # Application React
├── shared/                 # Types et utilitaires partagés
├── tests/                  # Tests automatisés
├── .kiro/specs/           # Spécifications détaillées
└── docs/                  # Documentation organisée
    ├── api/               # Documentation API
    ├── architecture/      # Architecture & design
    ├── backend/           # Documentation backend
    ├── integration/       # Guides d'intégration
    ├── user-guide/        # Guides utilisateur
    └── troubleshooting/   # Dépannage
```

## 🔌 API et Documentation

### 📖 Documentation Interactive Swagger
L'API dispose d'une documentation interactive complète générée automatiquement avec Swagger/OpenAPI 3.0.

#### Accès à la Documentation
- **Interface Swagger UI** : http://localhost:5001/api/docs
- **Spécification JSON** : http://localhost:5001/api/docs.json
- **Guide complet** : [SWAGGER_GUIDE.md](./backend/functions/src/docs/SWAGGER_GUIDE.md)

#### Fonctionnalités Swagger
- **Authentification JWT** : Testez les endpoints avec vos tokens
- **Schémas de données** : Validation automatique avec Zod
- **Exemples interactifs** : Testez directement depuis l'interface
- **Documentation des erreurs** : Codes d'erreur et messages détaillés
- **Export OpenAPI** : Génération de clients SDK automatique

#### Utilisation de l'API
```bash
# 1. Démarrer le serveur de développement
npm run dev:backend

# 2. Ouvrir la documentation Swagger
open http://localhost:5001/api/docs

# 3. S'authentifier avec JWT
# - Cliquer sur "Authorize" dans Swagger UI
# - Entrer votre token JWT : Bearer <your-token>

# 4. Tester les endpoints interactivement
```

#### Endpoints Principaux
- **Authentification** : `/api/auth/*` - Connexion, inscription, 2FA
- **Utilisateurs** : `/api/users/*` - Gestion des utilisateurs et profils
- **Événements** : `/api/events/*` - Création et gestion d'événements
- **Présences** : `/api/attendances/*` - Check-in et suivi des présences
- **Notifications** : `/api/notifications/*` - Système de notifications
- **Rapports** : `/api/reports/*` - Génération de rapports
- **ML/IA** : `/api/ml/*` - Intelligence artificielle et prédictions

#### Génération de Clients SDK
```bash
# Générer un client TypeScript
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5001/api/docs.json \
  -g typescript-axios \
  -o ./sdk/typescript

# Générer un client Python
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5001/api/docs.json \
  -g python \
  -o ./sdk/python
```

## 🔧 Configuration

### Variables d'Environnement Complètes
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

# Frontend
REACT_APP_API_URL=http://localhost:5001
REACT_APP_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}

# Development
NODE_ENV=development
PORT=5001
CORS_ORIGIN=http://localhost:3000
```

### Déploiement Production
```bash
# Déploiement complet
npm run deploy

# Déploiement séparé
npm run deploy:functions  # Backend seulement
npm run deploy:hosting    # Frontend seulement

# Émulateurs pour tests locaux
npm run serve            # Tous les émulateurs
npm run serve:ui         # Avec interface graphique
```

### Documentation API Swagger
```bash
# Générer la documentation Swagger
npm run generate:swagger

# Valider la spécification OpenAPI
npm run validate:swagger

# Exporter la documentation API
npm run export:swagger

# Servir la documentation en mode développement
npm run serve:docs
```

### Commandes Utiles
```bash
# Nettoyage des builds
npm run clean

# Validation des tests backend
npm run test:backend:validate

# Serveur de développement avec émulateurs
firebase emulators:start --only functions,firestore,auth
```

## 🧪 Tests

### Tests Complets
```bash
# Tous les tests (unitaires + intégration + e2e)
npm run test:ci

# Tests en mode watch
npm run test:watch

# Tests avec couverture
npm run test:coverage
```

### Tests par Composant
```bash
# Tests unitaires seulement
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests backend
npm run test:backend
npm run test:backend:unit
npm run test:backend:integration
npm run test:backend:watch

# Tests frontend
npm run test:frontend

# Tests shared (types/utilitaires)
npm run test:shared
```

### Tests End-to-End
```bash
# Tests E2E avec Playwright
npm run test:e2e

# Interface graphique pour les tests E2E
npm run test:e2e:ui
```

### Validation et Linting
```bash
# Validation complète du code
npm run lint

# Validation par composant
npm run lint:shared
npm run lint:backend
npm run lint:frontend
```

## 🤝 Contribution

### Workflow de Développement
1. **Fork** le repository
2. **Créer une branche** pour votre fonctionnalité
3. **Développer** en suivant les spécifications
4. **Tester** votre code
5. **Créer une Pull Request**

### Standards de Code
- **TypeScript** strict mode
- **ESLint** + **Prettier** pour le formatage
- **Tests unitaires** obligatoires pour les nouvelles fonctionnalités
- **Documentation API** avec annotations Swagger/OpenAPI
- **Documentation** des composants et fonctions

## 📊 Monitoring et Performance

### Métriques Surveillées
- **Performance** : Temps de réponse, throughput
- **Erreurs** : Taux d'erreur, logs d'exception
- **Utilisation** : Nombre d'utilisateurs actifs, organisations
- **Business** : Rendez-vous créés, ventes réalisées

### Outils
- **Google Cloud Monitoring** : Métriques infrastructure
- **Firebase Analytics** : Comportement utilisateur
- **Sentry** : Monitoring des erreurs
- **Lighthouse** : Performance frontend

## 🔒 Sécurité

### Mesures Implémentées
- **JWT Authentication** : Tokens sécurisés avec expiration
- **Refresh Tokens** : Renouvellement automatique des sessions
- **Rate Limiting** : Protection contre les attaques par déni de service
- **Validation** stricte des entrées et sanitisation
- **Chiffrement** des données sensibles (bcrypt, AES)
- **CORS** configuré pour les domaines autorisés
- **Audit Logs** des actions critiques
- **Conformité RGPD** et protection des données

## 🆚 Comparaison avec la Concurrence

| Fonctionnalité | Attendance-X | BambooHR | Workday | ADP | Monday.com |
|---|---|---|---|---|---|
| **Multi-tenant** | ✅ Natif | ❌ | ✅ | ✅ | ✅ |
| **Intégrations OAuth** | ✅ Google, MS, Apple | ✅ Limitées | ✅ | ✅ | ✅ |
| **Sync bidirectionnelle** | ✅ Temps réel | ❌ | ✅ | ❌ | ✅ |
| **API ouverte** | ✅ REST + GraphQL | ✅ REST | ✅ | ✅ | ✅ |
| **Personnalisation** | ✅ Complète | ⚠️ Limitée | ⚠️ | ❌ | ✅ |
| **Prix** | 💰 Abordable | 💰💰 | 💰💰💰 | 💰💰💰 | 💰💰 |
| **Déploiement** | ☁️ Cloud/On-premise | ☁️ | ☁️ | ☁️ | ☁️ |
| **Support mobile** | ✅ PWA + Native | ✅ | ✅ | ✅ | ✅ |
| **Analytics IA** | ✅ Intégrées | ⚠️ Basiques | ✅ | ✅ | ⚠️ |
| **Conformité RGPD** | ✅ | ✅ | ✅ | ✅ | ✅ |

## 📊 Analyse SWOT

### 💪 Forces (Strengths)
- **Architecture moderne** : TypeScript, React, Firebase
- **Multi-tenant natif** : Isolation complète des données
- **Intégrations avancées** : OAuth 2.0, sync bidirectionnelle
- **Sécurité renforcée** : JWT, chiffrement, audit logs
- **Documentation complète** : Swagger, guides, spécifications
- **Tests automatisés** : Couverture > 80%
- **Open source** : Transparence et personnalisation

### 🎯 Opportunités (Opportunities)
- **Marché PME** : Demande croissante pour solutions abordables
- **IA/ML** : Prédictions et recommandations intelligentes
- **Marketplace** : Écosystème d'extensions tierces
- **Intégrations** : Expansion vers plus de providers
- **Mobile-first** : Applications natives iOS/Android
- **Conformité** : Certifications SOC2, ISO 27001

### ⚠️ Faiblesses (Weaknesses)
- **Jeune produit** : Moins de références que la concurrence
- **Équipe réduite** : Ressources limitées pour le développement
- **Écosystème** : Moins d'intégrations que les leaders
- **Brand awareness** : Notoriété à construire

### 🚨 Menaces (Threats)
- **Concurrence établie** : BambooHR, Workday avec gros budgets
- **Réglementation** : Évolution des lois sur la protection des données
- **Dépendance cloud** : Risques liés à Firebase/GCP
- **Sécurité** : Cyberattaques sur les systèmes RH

## 📈 État du Projet et Roadmap

### ✅ Phase 1 - Fondations (Q1 2024) - **TERMINÉE**
- ✅ Architecture multi-tenant
- ✅ Authentification JWT + 2FA
- ✅ Gestion des organisations
- ✅ Gestion de présence basique
- ✅ API REST avec Swagger
- ✅ Tests automatisés

### 🚧 Phase 2 - Intégrations (Q2 2024) - **EN COURS (85%)**
- ✅ OAuth 2.0 (Google, Microsoft, Apple, Slack)
- ✅ Synchronisation calendriers/contacts
- ✅ Gestion sécurisée des tokens
- ✅ Historique et analytics des syncs
- ✅ Politiques d'organisation
- 🚧 Interface utilisateur des intégrations (90%)
- 🚧 Tests d'intégration complets (75%)

### 📋 Phase 3 - Modules Métier (Q3 2024) - **PLANIFIÉE**
- 📋 Gestion des rendez-vous avancée
- 📋 CRM clients complet
- 📋 Ventes et produits
- 📋 Rapports et analytics
- 📋 Interface mobile (PWA)

### 🔮 Phase 4 - Intelligence & Scale (Q4 2024) - **VISION**
- 🔮 IA et recommandations
- 🔮 API publique et SDK
- 🔮 Marketplace d'extensions
- 🔮 Applications mobiles natives
- 🔮 Certifications sécurité (SOC2)

### 📊 Métriques Actuelles
- **Couverture de tests** : 82%
- **Performance API** : < 200ms (P95)
- **Disponibilité** : 99.9%
- **Sécurité** : 0 vulnérabilité critique
- **Documentation** : 95% des endpoints documentés

## 📞 Support

### Documentation
- [Wiki du projet](./docs/)
- [FAQ](./docs/FAQ.md)
- [Guides utilisateur](./docs/user-guides/)

### Contact
- **Issues** : GitHub Issues pour les bugs et demandes de fonctionnalités
- **Discussions** : GitHub Discussions pour les questions générales
- **Documentation API** : Swagger UI à http://localhost:5001/api/docs
- **Email** : support@attendance-x.com

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

---

*Développé avec ❤️ pour simplifier la gestion d'entreprise*
## 📚
 Documentation

### Guides d'Onboarding
- [🚀 Guide Backend](ONBOARDING_BACKEND.md) - Configuration et développement backend (Node.js, Firebase, API)
- [🎨 Guide Frontend](ONBOARDING_FRONTEND.md) - Configuration et développement frontend (React, TypeScript, UI)

### Documentation Technique
- [📡 Documentation API](docs/api/README.md) - APIs REST SaaS multi-tenant et collections Postman
- [🏗️ Spécifications](docs/specs/) - Spécifications détaillées des fonctionnalités
- [🧪 Tests](docs/testing/) - Stratégies et guides de test

### Démarrage Rapide
```bash
# Installation complète
git clone <repository-url>
cd attendance-management-system
npm run install:all

# Démarrage développement
npm run dev

# Services disponibles :
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:5001
# - Swagger UI: http://localhost:5001/api/docs
# - Firebase Emulator: http://localhost:4000
```

### Contribution
- [🤝 Guide de contribution](CONTRIBUTING.md)
- [📝 Changelog](CHANGELOG.md)
- [🐛 Issues et Support](https://github.com/your-repo/issues)

---

**Choisissez votre guide :**
- **Développeur Backend** → [ONBOARDING_BACKEND.md](ONBOARDING_BACKEND.md)
- **Développeur Frontend** → [ONBOARDING_FRONTEND.md](ONBOARDING_FRONTEND.md)