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
- **Authentification** : Firebase Auth
- **Infrastructure** : Google Cloud Platform

## 📋 Modules Disponibles

### 🏢 Gestion des Organisations
- Création d'organisation à la première connexion
- Gestion des membres et invitations
- Configuration des paramètres organisationnels

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

## 🚀 Installation et Développement

### Prérequis
```bash
node >= 18.0.0
npm >= 8.0.0
firebase-tools
```

### Installation
```bash
# Cloner le repository
git clone [repository-url]
cd attendance-management-system

# Installer les dépendances
npm install

# Configuration Firebase
firebase login
firebase use --add

# Variables d'environnement
cp .env.example .env.local
# Configurer les variables dans .env.local
```

### Développement
```bash
# Démarrer le backend (Firebase Functions)
cd backend/functions
npm run serve

# Démarrer le frontend (dans un autre terminal)
cd frontend
npm start

# Tests
npm test

# Build de production
npm run build
```

## 📚 Documentation

### Spécifications Complètes
Consultez [SPECIFICATIONS.md](./SPECIFICATIONS.md) pour la documentation détaillée de tous les modules.

### Structure du Projet
```
├── backend/
│   ├── functions/          # Firebase Functions
│   └── firestore.rules     # Règles de sécurité Firestore
├── frontend/               # Application React
├── shared/                 # Types et utilitaires partagés
├── tests/                  # Tests automatisés
├── .kiro/specs/           # Spécifications détaillées
└── docs/                  # Documentation technique
```

### Spécifications par Module
- [🏢 Organisation Onboarding](./.kiro/specs/organization-onboarding/)
- [📧 Vérification Email](./.kiro/specs/email-verification-flow/)
- [📅 Gestion Rendez-vous](./.kiro/specs/appointment-management/)
- [👥 Gestion Clients](./.kiro/specs/client-management/)
- [💰 Ventes et Produits](./.kiro/specs/sales-product-management/)
- [🔐 Google Secret Manager](./.kiro/specs/google-secret-manager/)
- [🚀 Production Readiness](./.kiro/specs/production-readiness/)

## 🔧 Configuration

### Variables d'Environnement
```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend
REACT_APP_FIREBASE_CONFIG={"apiKey":"..."}
REACT_APP_API_URL=http://localhost:5001
```

### Déploiement
```bash
# Déploiement Firebase
firebase deploy

# Déploiement frontend (selon l'hébergeur)
npm run build
# Suivre les instructions de votre hébergeur
```

## 🧪 Tests

### Tests Unitaires
```bash
# Backend
cd backend/functions
npm test

# Frontend
cd frontend
npm test

# Tests d'intégration
npm run test:integration
```

### Tests E2E
```bash
# Cypress
npm run test:e2e
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
- **Documentation** des APIs et composants

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
- **Authentification** multi-facteur
- **Chiffrement** des données sensibles
- **Rate limiting** sur les APIs
- **Validation** stricte des entrées
- **Audit logs** des actions critiques
- **Conformité RGPD**

## 📈 Roadmap

### Phase 1 (Q1 2024) ✅
- ✅ Architecture de base
- ✅ Authentification et organisations
- ✅ Gestion de présence basique

### Phase 2 (Q2 2024) 🚧
- 🚧 Gestion des rendez-vous
- 🚧 CRM clients
- 🚧 Interface mobile

### Phase 3 (Q3 2024) 📋
- 📋 Ventes et produits
- 📋 Rapports avancés
- 📋 Intégrations tierces

### Phase 4 (Q4 2024) 🔮
- 🔮 IA et recommandations
- 🔮 API publique
- 🔮 Marketplace d'extensions

## 📞 Support

### Documentation
- [Wiki du projet](./docs/)
- [FAQ](./docs/FAQ.md)
- [Guides utilisateur](./docs/user-guides/)

### Contact
- **Issues** : GitHub Issues pour les bugs et demandes de fonctionnalités
- **Discussions** : GitHub Discussions pour les questions générales
- **Email** : support@attendance-x.com

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

---

*Développé avec ❤️ pour simplifier la gestion d'entreprise*