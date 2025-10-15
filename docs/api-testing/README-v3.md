# 🧪 Collections de Tests API AttendanceX v3.0

Ce dossier contient les collections Postman pour tester l'API AttendanceX Multi-Tenant avec une couverture complète de tous les endpoints disponibles.

## 🚀 Nouveautés v3.0 ⭐

- ✅ **Couverture complète** : TOUS les endpoints API documentés et testables
- ✅ **Organisation modulaire** : 16 sections logiques pour une navigation facile
- ✅ **Auto-configuration** : Variables automatiquement remplies entre les requêtes
- ✅ **Tests intégrés** : Validation automatique des réponses
- ✅ **Gestion des tokens** : Refresh automatique et gestion des contextes
- ✅ **Routes publiques** : Support complet des endpoints non-authentifiés

## 📋 Collections Disponibles

### 1. Collection Complète v3.0 ⭐ RECOMMANDÉE
- **Fichier** : `AttendanceX-Complete-API-v3.postman_collection.json`
- **Environnement** : `AttendanceX-Complete-Environment-v3.postman_environment.json`
- **Description** : Collection exhaustive couvrant **TOUTES** les routes API disponibles
- **Endpoints** : **120+ endpoints** organisés en 16 sections

#### 📚 Sections Couvertes

| Section | Endpoints | Description |
|---------|-----------|-------------|
| 🔐 **Authentication** | 15 | Login, register, 2FA, password reset, sessions |
| 🏢 **Tenant Management** | 4 | Registration, context switching, validation |
| 👥 **User Management** | 4 | CRUD operations utilisateurs |
| 📧 **User Invitations** | 7 | Single, bulk, CSV import d'invitations |
| 🌐 **Public Invitation Routes** | 3 | Validation, accept, decline (sans auth) |
| 📅 **Events Management** | 5 | CRUD operations événements |
| ✅ **Attendance Management** | 3 | Check-in, listing, vue personnelle |
| 📋 **Appointments** | 3 | Rendez-vous et analytics |
| 🔔 **Notifications** | 3 | Get, mark read, mark all read |
| 💳 **Billing & Subscriptions** | 6 | Dashboard, usage, factures, paiements |
| 📊 **Reports & Analytics** | 5 | Génération, ML insights, prédictions |
| 🔗 **Integrations** | 5 | Configuration, QR codes, testing |
| 🎨 **Branding & Customization** | 8 | Logo, couleurs, domaines personnalisés |
| 📧 **Email Campaigns** | 8 | Templates, envoi, analytics |
| 🔧 **Webhook Management** | 1 | Stripe webhook handler |
| 🌍 **Public Routes** | 1 | Registration publique de tenants |

### 2. Collection Multi-Tenant v2.0 (Legacy)
- **Fichier** : `AttendanceX-MultiTenant-v2.postman_collection.json`
- **Environnement** : `AttendanceX-v2-Environment.postman_environment.json`
- **Description** : Collection précédente pour l'architecture SaaS multi-tenant
- **Status** : Maintenue pour compatibilité

### 3. Tests d'Isolation des Tenants
- **Fichier** : `Tenant-Isolation-Tests.postman_collection.json`
- **Environnement** : `Multi-Tenant-Environment.postman_environment.json`
- **Description** : Tests spécialisés pour vérifier l'isolation des données
- **Fonctionnalités** :
  - ✅ Création de tenants de test
  - 🔒 Vérification de l'isolation des données
  - 🚫 Tests d'accès croisé entre tenants
  - 🎯 Tests des limitations par plan
  - 🧹 Nettoyage automatique des données de test

## 🚀 Configuration Rapide v3.0

### 1. Import Postman (Recommandé)

1. **Importer la collection** : `AttendanceX-Complete-API-v3.postman_collection.json`
2. **Importer l'environnement** : `AttendanceX-Complete-Environment-v3.postman_environment.json`
3. **Sélectionner** l'environnement "AttendanceX Complete Environment v3.0"

### 2. Variables d'environnement

La collection v3.0 utilise ces variables (auto-remplies) :

```json
{
  "baseUrl": "http://localhost:5001/api/v1",
  "testEmail": "test@example.com",
  "testPassword": "TestPassword123!",
  "accessToken": "", // Auto-rempli après login
  "refreshToken": "", // Auto-rempli après login
  "tenantId": "", // Auto-rempli après création tenant
  "userId": "", // Auto-rempli après registration
  "eventId": "", // Auto-rempli après création événement
  "attendanceId": "", // Auto-rempli après check-in
  "appointmentId": "", // Auto-rempli après création RDV
  "invitationId": "", // Auto-rempli après invitation
  "reportId": "", // Auto-rempli après génération rapport
  "campaignId": "", // Auto-rempli après création campagne
  "qrCodeId": "", // Auto-rempli après génération QR
  // ... et plus
}
```

### 3. Workflow Recommandé

#### Étape 1 : Authentification
```
🔐 Authentication > Register User
🔐 Authentication > Login
```

#### Étape 2 : Configuration Tenant
```
🏢 Tenant Management > Register Tenant
🏢 Tenant Management > Switch Tenant Context
```

#### Étape 3 : Gestion des Utilisateurs
```
👥 User Management > Get Users
📧 User Invitations > Send Single Invitation
```

#### Étape 4 : Création de Contenu
```
📅 Events Management > Create Event
📋 Appointments > Create Appointment
```

#### Étape 5 : Gestion des Présences
```
✅ Attendance Management > Check In
🔗 Integrations > Generate QR Code
```

#### Étape 6 : Rapports et Analytics
```
📊 Reports & Analytics > Generate Report
💳 Billing & Subscriptions > Get Billing Dashboard
```

## 🔧 Fonctionnalités Avancées v3.0

### Auto-Configuration des Variables
- **Tokens JWT** : Automatiquement extraits et stockés après login
- **IDs de ressources** : Auto-sauvegardés après création (events, users, etc.)
- **Contexte tenant** : Header X-Tenant-ID ajouté automatiquement
- **Refresh automatique** : Détection d'expiration des tokens

### Tests Automatiques Intégrés
- **Validation des status codes** : Vérification automatique des réponses
- **Extraction des données** : IDs et tokens sauvegardés automatiquement
- **Chaînage des requêtes** : Variables partagées entre les endpoints
- **Gestion d'erreurs** : Tests de cas d'erreur inclus

### Support Multi-Environnement
- **Local** : `http://localhost:5001/api/v1`
- **Development** : Configurable via variables
- **Staging** : Configurable via variables
- **Production** : Configurable via variables

## 📊 Comparaison des Versions

| Fonctionnalité | v2.0 Legacy | v3.0 Complete |
|----------------|-------------|---------------|
| **Endpoints couverts** | ~60 | **120+** |
| **Sections organisées** | 12 | **16** |
| **Routes publiques** | Limitées | **Complètes** |
| **Auto-configuration** | Basique | **Avancée** |
| **Tests automatiques** | Partiels | **Complets** |
| **Documentation** | Basique | **Détaillée** |
| **Gestion des erreurs** | Limitée | **Robuste** |
| **Support multi-tenant** | ✅ | ✅ |
| **Nouveaux modules** | ❌ | **Branding, Campaigns, ML** |

## 🧪 Tests Spécialisés

### Tests d'Isolation Multi-Tenant
Utilisez `Tenant-Isolation-Tests.postman_collection.json` pour :
- Vérifier l'isolation des données entre tenants
- Tester les permissions d'accès croisé
- Valider les limitations par plan d'abonnement
- Nettoyer automatiquement les données de test

### Tests de Performance
- Rate limiting : Validation des limites de requêtes
- Timeout handling : Gestion des timeouts
- Bulk operations : Tests des opérations en lot

### Tests de Sécurité
- Authentication flows : Tous les flux d'authentification
- Token management : Gestion des tokens JWT
- Permission validation : Vérification des permissions

## 🔄 Migration depuis v2.0

### Changements Majeurs v3.0

| Aspect | v2.0 | v3.0 |
|--------|------|------|
| **Couverture API** | Partielle | **Complète** |
| **Organisation** | 12 sections | **16 sections** |
| **Variables** | 10 variables | **20+ variables** |
| **Tests automatiques** | Basiques | **Avancés** |
| **Documentation** | Limitée | **Exhaustive** |

### Guide de Migration

1. **Importer** la nouvelle collection v3.0
2. **Configurer** le nouvel environnement
3. **Tester** les nouveaux endpoints
4. **Migrer** vos tests personnalisés
5. **Archiver** l'ancienne collection v2.0

## 📝 Bonnes Pratiques

### Utilisation des Collections
1. **Commencez toujours** par l'authentification
2. **Utilisez les variables** auto-générées
3. **Respectez l'ordre** des requêtes dans les workflows
4. **Vérifiez les tests** automatiques après chaque requête

### Gestion des Données
1. **Utilisez des données de test** cohérentes
2. **Nettoyez** régulièrement les données de test
3. **Documentez** vos modifications personnalisées
4. **Sauvegardez** vos configurations d'environnement

### Débogage
1. **Consultez la console** Postman pour les logs
2. **Vérifiez les variables** d'environnement
3. **Utilisez les tests** automatiques pour identifier les problèmes
4. **Consultez la documentation** API pour les détails

## 🐛 Dépannage

### Erreurs Communes

#### 401 Unauthorized
- **Cause** : Token expiré ou invalide
- **Solution** : Re-exécuter `Authentication > Login`

#### 403 Forbidden
- **Cause** : Permissions insuffisantes ou mauvais contexte tenant
- **Solution** : Vérifier le contexte tenant et les permissions utilisateur

#### 404 Not Found
- **Cause** : Endpoint inexistant ou ID invalide
- **Solution** : Vérifier l'URL et les variables d'environnement

#### 429 Too Many Requests
- **Cause** : Rate limiting dépassé
- **Solution** : Attendre et respecter les limites de taux

### Variables Manquantes
- **Exécuter** les requêtes de création en premier
- **Vérifier** que les tests automatiques s'exécutent
- **Contrôler** les variables d'environnement

## 📞 Support et Ressources

### Documentation
- **Guide rapide** : [QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md)
- **API Multi-tenant** : [../api/multi-tenant-api-guide.md](../api/multi-tenant-api-guide.md)
- **Guide Postman** : [multi-tenant-postman-guide.md](./multi-tenant-postman-guide.md)

### Outils Complémentaires
- **Newman CLI** : Exécution en ligne de commande
- **CI/CD Integration** : Intégration dans les pipelines
- **Monitoring** : Surveillance des APIs

### Support
- **Issues GitHub** : Créer un ticket avec les logs
- **Documentation** : Consulter les guides détaillés
- **Community** : Forums et discussions

---

**Version** : 3.0.0  
**Dernière mise à jour** : Février 2024  
**Compatibilité** : AttendanceX Multi-Tenant API v3.0+  
**Endpoints couverts** : 120+  
**Sections** : 16  
**Tests automatiques** : ✅ Complets