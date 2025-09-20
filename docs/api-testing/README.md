# API Testing - AttendanceX Multi-Tenant v2.0

Cette documentation contient tous les outils pour tester le nouveau système multi-tenant unifié d'AttendanceX v2.0, sans doublons et avec migration automatique.

## 🚀 Nouveautés v2.0

- ✅ **Architecture unifiée** : Plus de doublons entre `/organizations` et `/tenants`
- ✅ **Tests de dépréciation** : Validation automatique des warnings
- ✅ **Scénarios multi-tenant** : Isolation des données testée
- ✅ **Migration automatisée** : Outils d'administration intégrés
- ✅ **Collection Postman** : Tests rapides et complets

## 📁 Fichiers Disponibles

### Collections Postman

| Fichier | Description | Usage |
|---------|-------------|-------|
| `AttendanceX-MultiTenant-v2.postman_collection.json` | **Collection v2.0 unifiée** | Tests complets du nouveau système |
| `attendance-management-v2.postman_collection.json` | Collection legacy | Compatibilité ancienne version |
| `Tenant-Isolation-Tests.postman_collection.json` | Tests d'isolation | Validation multi-tenant |

### Environnements

| Fichier | Description | Usage |
|---------|-------------|-------|
| `AttendanceX-v2-Environment.postman_environment.json` | **Environnement v2.0** | Configuration pour nouveaux tests |
| `Multi-Tenant-Environment.postman_environment.json` | Environnement legacy | Tests de migration |

### Guides

| Fichier | Description |
|---------|-------------|
| `QUICK_TEST_GUIDE.md` | **Guide de test rapide** |
| `POSTMAN_UPDATES.md` | Historique des mises à jour |

## 🚀 Configuration Rapide

### 1. Import Postman (Recommandé v2.0)

1. **Importer** : `AttendanceX-MultiTenant-v2.postman_collection.json`
2. **Environnement** : `AttendanceX-v2-Environment.postman_environment.json`
3. **Sélectionner** l'environnement AttendanceX v2.0

### 2. Variables d'environnement

La collection utilise les variables suivantes que vous devez configurer :

```json
{
  "baseUrl": "http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1",
  "organizationId": "votre-organization-id",
  "eventId": "votre-event-id",
  "teamId": "votre-team-id",
  "userId": "votre-user-id",
  "participantId": "votre-participant-id",
  "authToken": "votre-jwt-token"
}
```

### Authentification

1. **Connexion** : Utilisez d'abord l'endpoint `Authentication > Login` pour obtenir votre token
2. **Token automatique** : Le script de test sauvegarde automatiquement le token dans `authToken`
3. **Bearer Token** : Toutes les requêtes protégées utilisent automatiquement le token

## 📚 Sections de l'API

### 🔐 Authentication
- Login avec email/password
- Récupération automatique du token JWT

### 🏢 Organizations
- Création et gestion des organisations
- Templates par secteur d'activité
- Configuration et setup complet
- Gestion des membres

### 👥 Teams
- Création d'équipes
- Gestion des membres d'équipe
- Permissions et rôles

### 📅 Events
- Création et gestion d'événements
- Paramètres de présence (QR, géolocalisation)
- Analytics et statistiques

### 👤 Participants
- Gestion des participants
- Import CSV en masse
- Préférences de notification

### ✅ Attendance Validation
- Pointage de présence
- Validation par QR code
- Pointage en masse
- Gestion des statuts

### 👨‍💼 User Management
- Gestion des utilisateurs
- Import avec équipes
- Profils et préférences
- Appartenance aux organisations

### 🔔 Notifications
- Notifications multi-langues
- Templates personnalisables
- Canaux multiples (email, SMS, push)

### 📊 Analytics
- Statistiques d'organisation
- Analytics d'événements
- Métriques de participation

### 📋 **NOUVEAU** Appointments Management
- **Création de rendez-vous** avec validation automatique
- **Gestion des créneaux** disponibles
- **Statuts avancés** : scheduled, confirmed, completed, cancelled, no-show
- **Filtrage intelligent** par praticien, service, client, période
- **Actions spécifiques** : confirmer, terminer, annuler, marquer absent

### 🌐 **NOUVEAU** Public Booking
- **Réservation publique** sans authentification
- **Créneaux publics** pour clients externes
- **Modification/annulation** avec email de vérification
- **Gestion automatique** des nouveaux clients

### ⏰ **NOUVEAU** Presence Management
- **Pointage avancé** : arrivée, départ, pauses
- **Géolocalisation** et validation de lieu
- **Détection d'anomalies** automatique
- **Statuts temps réel** des employés présents
- **Résumés d'équipe** et statistiques

### 📈 **NOUVEAU** Presence Reports
- **Génération de rapports** personnalisés
- **Rapports programmés** automatiques
- **Export multi-formats** (PDF, Excel)
- **Analytics avancés** de présence
- **Statistiques détaillées** par période

### 🏆 **NOUVEAU** Certificates
- **Génération automatique** de certificats de présence
- **Templates personnalisables** avec design avancé
- **Validation QR** intégrée
- **Génération en masse** pour événements
- **Téléchargement sécurisé** des certificats

### 👤 **NOUVEAU** User Management Extended
- **Profil utilisateur** complet avec préférences
- **Gestion des appartenances** aux organisations
- **Mise à jour de profil** avec validation
- **Listing avancé** avec tri et pagination

### 🏢 **NOUVEAU** Organization Extended
- **Templates par secteur** (corporate, education, healthcare, etc.)
- **Setup complet** d'organisation avec assistant
- **Configuration avancée** : horaires, fuseaux, langues
- **Gestion des paramètres** organisationnels

### 🤖 **NOUVEAU** Machine Learning & AI
- **Prédictions de présence** basées sur l'IA
- **Recommandations intelligentes** personnalisées
- **Détection d'anomalies** automatique
- **Analytics prédictifs** pour optimiser les événements

### 📱 **NOUVEAU** QR Code Management
- **Génération de QR codes** sécurisés pour événements
- **Validation avancée** avec géolocalisation
- **Contrôles d'usage** : expiration, limite d'utilisation
- **Statistiques d'utilisation** détaillées
- **Gestion du cycle de vie** des codes

### 🔧 **NOUVEAU** System & Health
- **Health checks** complets du système
- **Monitoring** des services
- **Métriques système** en temps réel
- **Status des composants** individuels

## 🔄 Workflow recommandé

### 1. Authentification
```
Authentication > Login
```

### 2. Configuration de base
```
Organizations > Get My Organization
Organizations > Complete Organization Setup (si nécessaire)
Teams > Create Team
```

### 3. Gestion des utilisateurs
```
User Management Extended > Get My Profile
User Management > Import Users with Teams
```

### 4. Création d'événements
```
Events > Create Event
QR Code Management > Generate Event QR Code
```

### 5. Gestion des participants
```
Participants > Create Participant
Participants > Import Participants (CSV)
```

### 6. Gestion de présence
```
Presence Management > Clock In/Out
Attendance Validation > Mark Attendance
QR Code Management > Validate QR Code
```

### 7. Rapports et certificats
```
Presence Reports > Generate Report
Certificates > Generate Attendance Certificate
Analytics > Get Event Analytics
```

## 🧪 Tests automatisés

La collection inclut des scripts de test automatiques qui :

- ✅ Sauvegardent automatiquement les IDs générés
- ✅ Vérifient les codes de statut HTTP
- ✅ Extraient les tokens d'authentification
- ✅ Configurent les variables pour les requêtes suivantes

## 📝 Notes importantes

### Authentification
- Toutes les routes (sauf publiques) nécessitent un token JWT
- Le token est automatiquement inclus via Bearer Auth
- Durée de vie du token : vérifiez la configuration backend

### Rate Limiting
- Certains endpoints ont des limites de taux
- Respectez les délais entre les requêtes intensives
- Les endpoints publics ont des limites plus strictes

### Données de test
- Utilisez des données de test cohérentes
- Les IDs sont automatiquement sauvegardés entre requêtes
- Modifiez les exemples selon votre environnement

### Environnements
- **Local** : `http://localhost:3000/api`
- **Firebase** : `http://127.0.0.1:5001/attendance-management-syst/europe-west1/api/v1`
- **Production** : Configurez selon votre déploiement

## 🆕 Nouveautés v2.0.0

Cette version ajoute plus de **150 nouveaux endpoints** couvrant :

- 📋 **Gestion complète des rendez-vous** avec booking public
- ⏰ **Système de présence avancé** avec géolocalisation
- 📊 **Rapports intelligents** avec IA prédictive
- 🏆 **Certificats automatisés** avec templates personnalisables
- 🤖 **Intelligence artificielle** pour optimiser la présence
- 📱 **QR codes sécurisés** avec contrôles avancés
- 🔧 **Monitoring système** complet

## 🐛 Dépannage

### Erreur 401 Unauthorized
- Vérifiez que le token est valide
- Reconnectez-vous via `Authentication > Login`

### Erreur 404 Not Found
- Vérifiez l'URL de base dans les variables
- Assurez-vous que le service backend est démarré

### Erreur 429 Too Many Requests
- Respectez les limites de taux
- Attendez avant de relancer la requête

### Variables manquantes
- Exécutez d'abord les requêtes de création pour générer les IDs
- Vérifiez que les scripts de test s'exécutent correctement

## 🔄 Migration depuis v1.x

### Changements Majeurs

| v1.x | v2.0 | Status |
|------|------|--------|
| `POST /organizations` | `POST /tenants/register` | ⚠️ Déprécié |
| Inscription avec organisation | Inscription simplifiée | ✅ Nouveau |
| Tokens sans contexte | Tokens avec contexte tenant | ✅ Amélioré |
| Données non isolées | Isolation multi-tenant | ✅ Nouveau |

### Guide de Migration

1. **Tester les nouveaux endpoints** avec la collection v2.0
2. **Vérifier les warnings** de dépréciation
3. **Migrer le code client** vers les nouveaux endpoints
4. **Valider l'isolation** des données multi-tenant

## 📞 Support

- **Guide complet** : [QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md)
- **API Documentation** : [../api/multi-tenant-api-guide.md](../api/multi-tenant-api-guide.md)
- **Issues** : Créer un ticket avec les logs de test

---

**Version** : 2.0.0  
**Dernière mise à jour** : Janvier 2024  
**Compatibilité** : AttendanceX Multi-Tenant API v2.0+