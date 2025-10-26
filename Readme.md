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
- **[🚀 Opportunités d'Amélioration](.kiro/specs/system-enhancement-opportunities/)** - Roadmap stratégique 2025-2026
- **[🏗️ Architecture](docs/🏗️%20ARCHITECTURE.md)** - Design et structure du système
- **[�  Guide de Démarrage](docs/🚀%20GETTING_STARTED.md)** - Installation et configuration
- **[🔗 API Documentation](docs/api/README.md)** - Documentation API complète

### Navigation Rapide par Rôle
- **👨‍💼 Administrateurs** : [Architecture](docs/README.md#-architecture--conception) • [API](docs/README.md#-api--intégrations) • [Sécurité](docs/README.md#-sécurité) • [🚀 Roadmap](.kiro/specs/system-enhancement-opportunities/)
- **👨‍💻 Développeurs** : [API](docs/README.md#-api--intégrations) • [Backend](docs/README.md#-backend) • [Tests](docs/README.md#-tests--validation) • [🚀 Spécifications](.kiro/specs/system-enhancement-opportunities/)
- **👥 Managers** : [Guides Utilisateur](docs/README.md#-guides-utilisateur) • [Fonctionnalités](docs/README.md#-services--fonctionnalités) • [🚀 Opportunités](.kiro/specs/system-enhancement-opportunities/)
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
│   ├── system-enhancement-opportunities/  # 🚀 Roadmap 2025-2026
│   └── [autres-specs]/    # Autres spécifications fonctionnelles
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

| Fonctionnalité | Attendance-X | Systeme.io | BambooHR | Workday | ADP | Monday.com |
|---|---|---|---|---|---|---|
| **Multi-tenant** | ✅ Natif | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Gestion RH/Présence** | ✅ Complète | ❌ | ✅ | ✅ | ✅ | ⚠️ Basique |
| **CRM Intégré** | ✅ Natif | ✅ | ⚠️ Basique | ✅ | ❌ | ✅ |
| **E-commerce/Ventes** | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ Basique |
| **Marketing Automation** | ⚠️ Basique | ✅ Avancé | ❌ | ❌ | ❌ | ✅ |
| **Intégrations OAuth** | ✅ Google, MS, Apple | ⚠️ Limitées | ✅ Limitées | ✅ | ✅ | ✅ |
| **Sync bidirectionnelle** | ✅ Temps réel | ❌ | ❌ | ✅ | ❌ | ✅ |
| **API ouverte** | ✅ REST + GraphQL | ⚠️ REST Limitée | ✅ REST | ✅ | ✅ | ✅ |
| **Personnalisation** | ✅ Complète | ⚠️ Templates | ⚠️ Limitée | ⚠️ | ❌ | ✅ |
| **Prix** | 💰 Abordable | 💰💰 | 💰💰 | 💰💰💰 | 💰💰💰 | 💰💰 |
| **Déploiement** | ☁️ Cloud/On-premise | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| **Support mobile** | ✅ PWA + Native | ✅ PWA | ✅ | ✅ | ✅ | ✅ |
| **Analytics IA** | ✅ Intégrées | ⚠️ Basiques | ⚠️ Basiques | ✅ | ✅ | ⚠️ |
| **Conformité RGPD** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Focus Métier** | 🏢 RH + Business | 🛒 Marketing + Ventes | 👥 RH Pure | 🏢 Enterprise RH | 💼 Paie + RH | 📊 Gestion Projet |

### 🎯 **Analyse Comparative Détaillée**

#### **vs Systeme.io** 🛒
**Avantages Attendance-X :**
- ✅ **Gestion RH complète** : Présence, congés, horaires (inexistant chez Systeme.io)
- ✅ **Multi-tenant natif** : Architecture scalable pour entreprises
- ✅ **Sync bidirectionnelle** : Intégrations temps réel avancées
- ✅ **Prix compétitif** : Solution plus abordable
- ✅ **Déploiement flexible** : Cloud + On-premise

**Avantages Systeme.io :**
- 🛒 **Marketing automation** : Funnels, email marketing avancé
- 🎨 **Templates e-commerce** : Boutiques pré-construites

**Positionnement :** Solutions **complémentaires** - Systeme.io pour marketing/ventes, Attendance-X pour gestion RH/business

#### **vs BambooHR** 👥
**Avantages Attendance-X :**
- ✅ **CRM + Ventes intégrés** : Solution business complète
- ✅ **Multi-tenant natif** : Meilleure isolation des données
- ✅ **Sync bidirectionnelle** : Intégrations plus avancées
- ✅ **Prix abordable** : Coût réduit pour PME

#### **vs Workday/ADP** 🏢
**Avantages Attendance-X :**
- ✅ **Personnalisation complète** : Open source vs propriétaire
- ✅ **Prix accessible** : 3-4x moins cher
- ✅ **Déploiement flexible** : Options on-premise
- ✅ **Innovation rapide** : Cycles de développement agiles

#### **vs Monday.com** 📊
**Avantages Attendance-X :**
- ✅ **Gestion RH spécialisée** : Focus métier vs généraliste
- ✅ **Conformité RGPD native** : Sécurité renforcée
- ✅ **Multi-tenant** : Architecture enterprise

### 🏆 **Positionnement Unique**

Attendance-X se positionne comme la **seule solution** offrant :
1. **RH + Business intégré** : Présence, CRM, ventes dans une plateforme
2. **Multi-tenant natif** : Architecture scalable dès la conception
3. **Open source enterprise** : Transparence + personnalisation illimitée
4. **Prix PME** : Accessible aux petites/moyennes entreprises
5. **Innovation IA** : Prédictions et automatisation intelligente

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

## � ÉOpportunités d'Amélioration et Roadmap

### 📋 **[Spécification Complète des Améliorations](.kiro/specs/system-enhancement-opportunities/)**

Une analyse détaillée des opportunités d'amélioration a été réalisée, identifiant 10 domaines clés pour transformer le système en plateforme enterprise leader :

#### 🎯 **Domaines d'Amélioration Prioritaires**

1. **🤖 Intelligence Artificielle & ML** - Prédictions, détection d'anomalies, chatbot intelligent
2. **🏪 Marketplace & Extensions** - Écosystème d'extensions tierces avec SDK public
3. **� Apsplications Mobiles Natives** - Apps iOS/Android avec biométrie et géolocalisation
4. **📊 Analytics Avancées** - Dashboards interactifs et business intelligence
5. **⚙️ Automatisation Workflows** - Moteur no-code pour processus métier
6. **🔒 Sécurité Enterprise** - Certifications SOC2/ISO 27001, conformité renforcée
7. **🔗 Intégrations Enterprise** - SAP, Workday, Active Directory, API GraphQL
8. **🎨 UX Avancée** - Design system, accessibilité, interface vocale
9. **⚡ Performance & Scale** - Support 100k+ utilisateurs, edge computing
10. **� Modnétisation** - Modèles flexibles, white-label, services professionnels

#### � **Investissement et ROI**
- **Budget Total** : $3.05M sur 15 mois
- **ROI Break-even** : 18 mois
- **ROI 3 ans** : 400%+
- **ARR Cible** : $5M+ en fin de roadmap

### � **Nouvelle Roadmap Stratégique (2025-2026)**

### ✅ **Phase Actuelle - Fondations (2024) - TERMINÉE**
- ✅ Architecture multi-tenant native
- ✅ Authentification JWT + 2FA sécurisée
- ✅ Gestion des organisations complète
- ✅ Système de présence robuste
- ✅ API REST avec documentation Swagger
- ✅ Tests automatisés (82% couverture)
- ✅ Intégrations OAuth 2.0 avancées

### 🚧 **Phase 1 - Fondations Avancées (Q1 2025) - PLANIFIÉE**
**Budget : $500k | Objectif : Architecture Microservices + SDK + Mobile MVP**

- 🔄 Migration vers architecture microservices
- 🛠️ SDK public JavaScript/Python avec marketplace
- 📱 Applications mobiles natives iOS/Android MVP
- 🌐 API Gateway avec rate limiting avancé
- 🎯 **Métriques** : 99.9% uptime, <100ms latence, >4.5★ App Stores

### 🚧 **Phase 2 - Intelligence & Analytics (Q2 2025) - VISION**
**Budget : $750k | Objectif : IA/ML + Analytics + Marketplace Opérationnelle**

- 🤖 Module IA avec prédictions 85%+ précision
- 📊 Analytics avancées avec dashboards interactifs
- 🏪 Marketplace avec 100+ extensions disponibles
- 🔍 Détection d'anomalies <5% faux positifs
- 🎯 **Métriques** : $50k+ revenus marketplace mensuel

### 🔮 **Phase 3 - Automatisation & Intégrations (Q3 2025) - VISION**
**Budget : $600k | Objectif : Workflows + Intégrations Enterprise**

- ⚙️ Moteur de workflow no-code visuel
- 🏢 Intégrations SAP, Workday, BambooHR certifiées
- 📍 Géolocalisation et biométrie mobile avancées
- 🔄 Synchronisation offline 99% succès
- 🎯 **Métriques** : 1000+ workflows créés, 20+ intégrations

### 🔮 **Phase 4 - Enterprise & Scale (Q4 2025) - VISION**
**Budget : $800k | Objectif : Certifications + Performance + Innovation**

- 🛡️ Certification SOC2 Type II obtenue
- ⚡ Support 100k+ utilisateurs simultanés
- 🗣️ Interface vocale pour check-in
- 🥽 Réalité augmentée pour navigation
- 🎯 **Métriques** : <50ms P95 latence, 10+ clients enterprise

### 🔮 **Phase 5 - Expansion & Monétisation (Q1 2026) - VISION**
**Budget : $400k | Objectif : White-Label + Expansion Géographique**

- 🏷️ Solutions white-label complètes
- 🌍 Expansion dans 10+ pays
- 🤝 Programme partenaires avec 100+ certifiés
- 💬 Chatbot multilingue 95% satisfaction
- 🎯 **Métriques** : $1M+ revenus white-label annuel

### 📊 **Métriques Actuelles vs Objectifs**

| Métrique | Actuel | Objectif 2026 | Amélioration |
|----------|--------|---------------|--------------|
| **Couverture tests** | 82% | >90% | +8% |
| **Performance API** | <200ms P95 | <50ms P95 | 4x plus rapide |
| **Disponibilité** | 99.9% | 99.99% | 10x moins de downtime |
| **Utilisateurs simultanés** | ~1k | 100k+ | 100x scalabilité |
| **Extensions marketplace** | 0 | 500+ | Écosystème complet |
| **Revenus ARR** | - | $5M+ | Monétisation mature |

### 🎯 **Avantages Concurrentiels Futurs**

Avec cette roadmap, le système deviendra :
- **Plus intelligent** que BambooHR (IA native vs basique)
- **Plus flexible** que Workday (open source vs propriétaire)
- **Plus abordable** que ADP (coût maîtrisé vs licensing élevé)
- **Plus innovant** que Monday.com (fonctionnalités avancées)

### 📋 **Prochaines Étapes**

1. **Consulter la spécification complète** : [📋 Opportunités d'Amélioration](.kiro/specs/system-enhancement-opportunities/)
2. **Choisir une phase** à implémenter en priorité
3. **Commencer l'exécution** des tâches définies
4. **Suivre les métriques** de succès par phase

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
git clone https://github.com/SteveRuben/attendanceX
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
- [🐛 Issues et Support](https://github.com/SteveRuben/attendanceX/issues)

---

**Choisissez votre guide :**
- **Développeur Backend** → [ONBOARDING_BACKEND.md](ONBOARDING_BACKEND.md)
- **Développeur Frontend** → [ONBOARDING_FRONTEND.md](ONBOARDING_FRONTEND.md)