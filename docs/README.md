# Documentation du Système de Gestion des Présences

Bienvenue dans la documentation complète du système de gestion des présences. Cette documentation est organisée par domaines pour faciliter la navigation et la maintenance.

## Structure de la Documentation

### 📚 Backend
- **[API](backend/api/)** - Documentation des endpoints et authentification
  - [Endpoints](backend/api/endpoints.md) - Liste complète des endpoints API
  - [Authentication](backend/api/authentication.md) - Système d'authentification
  - [Rate Limiting](backend/api/rate-limiting.md) - Limitation de débit
- **[Architecture](backend/architecture/)** - Vue d'ensemble et schémas de base de données
  - [Overview](backend/architecture/overview.md) - Vue d'ensemble de l'architecture
  - [Database Schema](backend/architecture/database-schema.md) - Schéma de base de données
  - [Cloud Functions](backend/architecture/cloud-functions.md) - Architecture des fonctions cloud
- **[Services](backend/services/)** - Documentation des services métier
  - [Presence System](backend/services/presence-system.md) - Système de gestion des présences
  - [Notification System](backend/services/notification-system.md) - Système de notifications
  - [Organization Management](backend/services/organization-management.md) - Gestion des organisations
- **[Maintenance](backend/maintenance/)** - Scripts et procédures de maintenance
  - [Deployment](backend/maintenance/deployment.md) - Procédures de déploiement
  - [Monitoring](backend/maintenance/monitoring.md) - Surveillance et métriques
  - [Troubleshooting](backend/maintenance/troubleshooting.md) - Guide de dépannage
  - [Organization Sync Fix](backend/maintenance/organization-sync-fix.md) - Correction synchronisation
  - [Region Optimization](backend/maintenance/region-optimization.md) - Optimisation régionale
  - [Organization Migration Guide](backend/maintenance/organization-migration-guide.md) - Guide de migration
- **[Middleware System](backend/middleware-system.md)** - Système de middlewares harmonisé

### 🧪 Testing
- **[Guide des Tests](testing/)** - Stratégies et procédures de test
  - [Tests Unitaires](testing/unit-testing.md) - Guide des tests unitaires
  - [Tests d'Intégration](testing/integration-testing.md) - Guide des tests d'intégration
  - [Tests E2E](testing/e2e-testing.md) - Guide des tests end-to-end
  - Inclut la documentation des tests backend migrés

### 🛠️ Development
- **[Configuration](development/setup.md)** - Guide d'installation et configuration
- **[Contribution](development/contributing.md)** - Guide de contribution au projet
- **[Standards](development/coding-standards.md)** - Standards de codage et bonnes pratiques

## Liens Rapides

- [🚀 Guide de Démarrage Rapide](development/setup.md)
- [🔧 Configuration de l'Environnement](development/setup.md)
- [📖 API Reference](backend/api/endpoints.md)
- [🏗️ Architecture Overview](backend/architecture/overview.md)
- [🧪 Running Tests](testing/README.md)
- [🔧 Middleware System](backend/middleware-system.md)
- [📊 Monitoring](backend/maintenance/monitoring.md)
- [🚨 Troubleshooting](backend/maintenance/troubleshooting.md)

## Guides de Maintenance

- [🔄 Organization Migration](backend/maintenance/organization-migration-guide.md)
- [🔧 Organization Sync Fix](backend/maintenance/organization-sync-fix.md)
- [🌍 Region Optimization](backend/maintenance/region-optimization.md)
- [🚀 Deployment Guide](backend/maintenance/deployment.md)

## Contribution

Pour contribuer à cette documentation, consultez le [guide de contribution](development/contributing.md).

## Support

Pour toute question ou problème, consultez la section [troubleshooting](backend/maintenance/troubleshooting.md).