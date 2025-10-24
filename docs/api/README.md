# 📚 Attendance-X API Documentation v2.0

## Vue d'ensemble

Bienvenue dans la documentation complète de l'API Attendance-X v2.0. Cette API REST moderne refactorisée fournit tous les outils nécessaires pour gérer efficacement la présence, les événements, et l'engagement des utilisateurs dans votre organisation.

## 🆕 Nouveautés v3.0 - SaaS Multi-Tenant

- **🏢 Architecture SaaS Multi-Tenant** : Isolation complète des données par tenant
- **💳 Gestion des Abonnements** : Plans, facturation automatisée via Stripe
- **🎨 Personnalisation par Tenant** : Branding, domaines personnalisés
- **🔐 Authentification Multi-Tenant** : Contexte tenant, utilisateurs multi-organisations
- **📊 Analytics par Tenant** : Métriques et rapports isolés
- **🛡️ Sécurité Renforcée** : Isolation des données, audit par tenant
- **🧪 Collections Postman v3** : Tests d'isolation et workflows multi-tenant

## 🏗️ Architecture Multi-Tenant

### Isolation des Données
- **Tenant ID automatique** : Toutes les requêtes sont filtrées par tenant
- **Headers requis** : `X-Tenant-ID` pour le contexte
- **Validation stricte** : Accès cross-tenant bloqué (403 Forbidden)

### Plans d'Abonnement
- **Basic** : 50 utilisateurs, fonctionnalités de base
- **Professional** : 200 utilisateurs, analytics avancés, API
- **Enterprise** : Illimité, toutes fonctionnalités, support prioritaire

## 🚀 Démarrage rapide

### Base URL
```
https://api.attendance-x.com/api
```

### Authentification
Toutes les requêtes API nécessitent un token JWT dans l'en-tête Authorization :
```
Authorization: Bearer <your_jwt_token>
```

### Format des réponses
Toutes les réponses suivent le format JSON standardisé :
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... },
  "error": null
}
```

## 📖 Documentation par module

### 🔐 [Authentication](./authentication.md)
Gestion complète de l'authentification avec JWT, 2FA, et sécurité avancée.
- Connexion/déconnexion
- Gestion des tokens
- Authentification à deux facteurs
- Réinitialisation de mot de passe

### 👥 [Users](./users.md)
Gestion des utilisateurs avec profils, équipes, et préférences avancées.
- Profils utilisateur
- Gestion des équipes
- Import/export d'utilisateurs
- Statistiques et analytics

### 🏢 [Organizations](./organizations.md)
Gestion complète des organisations avec paramètres et branding.
- Configuration organisationnelle
- Gestion des membres
- Paramètres et branding
- Analytics organisationnel

### 👥 [Teams](./teams.md)
Gestion des équipes avec templates sectoriels et opérations en masse.
- Templates d'équipes par secteur
- Gestion des membres d'équipe
- Statistiques d'équipe
- Affectations en masse

### 📅 [Events](./events.md)
Gestion complète des événements avec présence et analytics.
- Création et gestion d'événements
- Gestion des participants
- QR codes et validation
- Événements récurrents

### ✅ [Attendance](./attendance.md)
Système complet de gestion de présence avec validation multi-méthodes.
- Validation QR, géolocalisation, manuelle
- Gestion des présences en masse
- Analytics et rapports
- Géofencing intelligent

### 📜 [Certificates](./certificates.md)
Génération et gestion de certificats avec templates personnalisés.
- Génération automatique
- Templates personnalisables
- Validation sécurisée
- Génération en masse

### 📢 [Notifications](./notifications.md)
Système de notifications multi-canaux avec templates et analytics.
- Email, SMS, push notifications
- Templates personnalisables
- Préférences utilisateur
- Analytics de livraison

### 🤖 [ML & Analytics](./ml-analytics.md)
Intelligence artificielle et analytics avancés pour l'optimisation.
- Prédictions de présence
- Recommandations intelligentes
- Détection d'anomalies
- Insights automatisés

### 🔗 [Integrations](./integrations.md)
Connexions avec services externes (Google, Microsoft, Slack, Zoom).
- OAuth sécurisé
- Synchronisation calendriers
- Notifications tierces
- Analytics d'intégration

## 🛠️ Outils et utilitaires

### Collections Postman Multi-Tenant
Collections complètes pour tester l'architecture SaaS multi-tenant :

#### 🏢 Collection SaaS Multi-Tenant
- **Fichier** : [SaaS-Multi-Tenant-APIs.postman_collection.json](./SaaS-Multi-Tenant-APIs.postman_collection.json)
- **Fonctionnalités** : Gestion tenants, abonnements, isolation des données
- **Tests** : Validation automatique de l'isolation

#### 🧪 Tests d'Isolation
- **Fichier** : [Tenant-Isolation-Tests.postman_collection.json](../api-testing/Tenant-Isolation-Tests.postman_collection.json)
- **Objectif** : Vérifier l'isolation des données entre tenants
- **Scénarios** : Cross-tenant access, feature gating, plan limits

#### 📚 Guides
- [Guide Multi-Tenant complet](./multi-tenant-api-guide.md)
- [Guide Collections Postman](./multi-tenant-postman-guide.md)
- [Guide Swagger](./swagger-guide.md)

### Swagger/OpenAPI
Documentation interactive disponible à :
```
https://api.attendance-x.com/api/docs
```

## 📊 Codes de statut HTTP

| Code | Description |
|------|-------------|
| `200` | Succès |
| `201` | Créé avec succès |
| `202` | Accepté (traitement asynchrone) |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Accès refusé |
| `404` | Ressource introuvable |
| `409` | Conflit |
| `422` | Entité non traitable |
| `429` | Trop de requêtes |
| `500` | Erreur serveur |

## 🔒 Sécurité et permissions

### Système de rôles
- **Super Admin** : Accès complet système
- **Admin** : Gestion complète organisation
- **Manager** : Gestion équipes et événements
- **User** : Accès de base

### Rate Limiting
- **Authentification** : 5 tentatives/15min
- **API générale** : 1000 requêtes/heure
- **Uploads** : 10 fichiers/minute

### Permissions granulaires
- `view_events` : Voir les événements
- `manage_events` : Gérer les événements
- `view_reports` : Voir les rapports
- `manage_users` : Gérer les utilisateurs
- `manage_organization` : Gérer l'organisation

## 📈 Pagination

Toutes les listes utilisent la pagination standardisée :

**Paramètres de requête :**
- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (défaut: 20, max: 100)

**Réponse :**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

## 🔍 Filtrage et recherche

### Paramètres communs
- `search` : Recherche textuelle
- `sort` : Tri (ex: `name:asc`, `createdAt:desc`)
- `startDate` / `endDate` : Filtrage par date
- `status` : Filtrage par statut

### Recherche avancée
Utilisez l'endpoint `/search` avec des critères complexes :
```json
{
  "query": "formation",
  "filters": {
    "type": ["training", "workshop"],
    "status": "active",
    "dateRange": {
      "start": "2024-03-01",
      "end": "2024-03-31"
    }
  }
}
```

## 📅 Gestion des dates

Toutes les dates utilisent le format ISO 8601 :
```
2024-03-15T14:30:00Z
```

### Fuseaux horaires
- Les dates sont stockées en UTC
- Les réponses incluent le fuseau horaire
- Utilisez les préférences utilisateur pour l'affichage

## 🔄 Webhooks

Configurez des webhooks pour recevoir des notifications en temps réel :

```json
{
  "url": "https://your-app.com/webhooks/attendance-x",
  "events": [
    "event.created",
    "attendance.updated",
    "certificate.generated"
  ],
  "secret": "your-webhook-secret"
}
```

## 📊 Analytics et métriques

### Endpoints analytics disponibles
- `/analytics/dashboard` : Vue d'ensemble
- `/analytics/attendance` : Métriques de présence
- `/analytics/engagement` : Engagement utilisateur
- `/analytics/performance` : Performance événements

### Formats d'export
- JSON (par défaut)
- CSV
- Excel
- PDF (rapports)

## 🚨 Gestion d'erreurs

### Format d'erreur standardisé
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": {
      "field": "email",
      "reason": "Format d'email invalide"
    },
    "timestamp": "2024-03-15T14:30:00Z",
    "requestId": "req-123456"
  }
}
```

### Codes d'erreur communs
- `VALIDATION_ERROR` : Erreur de validation
- `AUTHENTICATION_FAILED` : Échec d'authentification
- `PERMISSION_DENIED` : Permissions insuffisantes
- `RESOURCE_NOT_FOUND` : Ressource introuvable
- `RATE_LIMIT_EXCEEDED` : Limite de taux dépassée

## 🔧 SDKs et bibliothèques

### JavaScript/TypeScript
```bash
npm install @attendance-x/api-client
```

```javascript
import { AttendanceXClient } from '@attendance-x/api-client';

const client = new AttendanceXClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.attendance-x.com'
});

const events = await client.events.list();
```

### Python
```bash
pip install attendance-x-python
```

```python
from attendance_x import AttendanceXClient

client = AttendanceXClient(api_key='your-api-key')
events = client.events.list()
```

## 📞 Support et ressources

### Documentation technique
- [Guide de démarrage](https://docs.attendance-x.com/getting-started)
- [Exemples de code](https://github.com/attendance-x/examples)
- [FAQ](https://docs.attendance-x.com/faq)

### Support
- **Email** : support@attendance-x.com
- **Chat** : Disponible dans l'interface
- **GitHub** : [Issues et discussions](https://github.com/attendance-x/api)

### Communauté
- [Discord](https://discord.gg/attendance-x)
- [Forum](https://community.attendance-x.com)
- [Blog](https://blog.attendance-x.com)

## 🔄 Changelog et versioning

### Versioning
L'API suit le versioning sémantique (SemVer) :
- **Major** : Changements incompatibles
- **Minor** : Nouvelles fonctionnalités compatibles
- **Patch** : Corrections de bugs

### Version actuelle
**v2.1.0** - Mars 2024

### Changements récents
- ✅ Ajout du système ML/Analytics
- ✅ Amélioration des intégrations
- ✅ Nouveaux templates de certificats
- ✅ Support des notifications push

### Roadmap
- 🔄 API GraphQL
- 🔄 Webhooks v2
- 🔄 Support multi-tenant
- 🔄 Analytics temps réel

---

## 🎯 Exemples d'utilisation

### Créer un événement avec présence
```javascript
// 1. Créer l'événement
const event = await fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Formation React Avancé',
    startDate: '2024-03-20T09:00:00Z',
    endDate: '2024-03-20T17:00:00Z',
    attendanceSettings: {
      requiresAttendance: true,
      qrCodeEnabled: true,
      geolocationEnabled: true
    }
  })
});

// 2. Ajouter des participants
const participants = await fetch(`/api/events/${eventId}/participants/bulk`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  },
  body: formData // CSV des participants
});

// 3. Envoyer des rappels
const notification = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'event_reminder',
    recipients: participants.data,
    template: 'event_reminder_template',
    scheduling: {
      sendAt: '2024-03-19T18:00:00Z'
    }
  })
});
```

### Workflow complet de présence
```javascript
// 1. Valider la présence
const attendance = await fetch('/api/attendance/validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: 'event-123',
    participantId: 'participant-456',
    method: 'qr_code',
    data: {
      qrCode: 'EVT-123-2024',
      location: { latitude: 48.8566, longitude: 2.3522 }
    }
  })
});

// 2. Générer le certificat
if (attendance.data.status === 'present') {
  const certificate = await fetch(`/api/certificates/attendance/${attendance.data.attendanceId}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      templateId: 'default-template',
      sendEmail: true
    })
  });
}

// 3. Envoyer confirmation
const confirmation = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'attendance_confirmation',
    recipients: [{ userId: 'user-123' }],
    template: 'attendance_confirmation_template'
  })
});
```

Cette documentation vous donne tous les outils nécessaires pour intégrer efficacement l'API Attendance-X dans vos applications. Pour des questions spécifiques, consultez la documentation détaillée de chaque module ou contactez notre support.

## 🏗️ Architecture API v2.0

### Organisation par Domaines

L'API v2.0 est organisée en domaines fonctionnels pour une meilleure maintenabilité :

```
📁 Controllers & Routes
├── 🔐 auth/           # Authentification & Sécurité
├── 👥 user/           # Gestion des utilisateurs
├── 🏢 organization/   # Gestion des organisations
├── 📅 event/          # Gestion des événements
├── 📋 appointment/    # Gestion des rendez-vous
├── ✅ attendance/     # Présence & pointage
├── 🔔 notification/   # Notifications & communications
├── 🔗 integration/    # Intégrations tierces
├── 📊 report/         # Rapports & analytics
├── 🎨 branding/       # Personnalisation & branding
├── 💰 billing/        # Facturation & abonnements
└── 🛠️ system/        # Administration système
```

### Endpoints Principaux

#### 🔐 Authentication
- `POST /auth/register` - Inscription utilisateur
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Renouvellement token
- `POST /auth/logout` - Déconnexion
- `POST /auth/2fa/setup` - Configuration 2FA
- `POST /auth/2fa/verify` - Vérification 2FA

#### 👥 Users
- `GET /users` - Liste des utilisateurs
- `POST /users` - Créer un utilisateur
- `GET /users/{id}` - Détails utilisateur
- `PUT /users/{id}` - Modifier utilisateur
- `DELETE /users/{id}` - Supprimer utilisateur
- `POST /users/{id}/invite` - Inviter utilisateur

#### 📅 Events
- `GET /events` - Liste des événements
- `POST /events` - Créer un événement
- `GET /events/{id}` - Détails événement
- `PUT /events/{id}` - Modifier événement
- `DELETE /events/{id}` - Supprimer événement
- `POST /events/{id}/publish` - Publier événement
- `POST /events/{id}/cancel` - Annuler événement

#### ✅ Attendance
- `POST /presence/employees/{id}/clock-in` - Pointer l'arrivée
- `POST /presence/employees/{id}/clock-out` - Pointer la sortie
- `GET /presence/employees/{id}/status` - Statut de présence
- `POST /presence/employees/{id}/breaks/start` - Commencer une pause
- `POST /presence/employees/{id}/breaks/end` - Terminer une pause

#### 🏢 Organizations
- `GET /organizations` - Liste des organisations
- `POST /organizations` - Créer une organisation
- `GET /organizations/{id}` - Détails organisation
- `PUT /organizations/{id}` - Modifier organisation
- `GET /organizations/{id}/members` - Membres de l'organisation
- `POST /organizations/{id}/invite` - Inviter un membre

### Collections de Test

#### Swagger UI Interactive
```
http://localhost:5001/api/docs
```

#### Collection Postman v2
- **Fichier** : `docs/api-testing/attendance-management-v2.postman_collection.json`
- **Variables d'environnement** : Gestion automatique des tokens
- **Tests automatisés** : Validation des réponses
- **Workflows** : Scénarios complets d'utilisation

#### Import Postman
1. Ouvrir Postman
2. Cliquer sur "Import"
3. Sélectionner le fichier `attendance-management-v2.postman_collection.json`
4. Configurer les variables d'environnement :
   - `base_url` : `http://localhost:5001/api`
   - `jwt_token` : (sera rempli automatiquement)
   - `refresh_token` : (sera rempli automatiquement)

### Authentification et Sécurité

#### JWT Tokens
```javascript
// Headers requis
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}

// Structure du token JWT
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "admin",
  "tenantId": "tenant_id",
  "iat": 1640995200,
  "exp": 1641081600
}
```

#### Refresh Tokens
Les tokens d'accès expirent après 24h. Utilisez le refresh token pour obtenir un nouveau token :

```bash
curl -X POST {{base_url}}/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

#### Rate Limiting
- **Authentification** : 5 tentatives par minute
- **API générale** : 100 requêtes par minute
- **Rapports** : 10 générations par heure

### Codes d'Erreur Standardisés

| Code | Description | Action recommandée |
|------|-------------|-------------------|
| `UNAUTHORIZED` | Token manquant ou invalide | Se reconnecter |
| `FORBIDDEN` | Permissions insuffisantes | Vérifier les droits |
| `VALIDATION_ERROR` | Données invalides | Corriger les données |
| `NOT_FOUND` | Ressource introuvable | Vérifier l'ID |
| `RATE_LIMIT_EXCEEDED` | Trop de requêtes | Attendre et réessayer |
| `TENANT_ACCESS_DENIED` | Accès tenant refusé | Vérifier le contexte |

### Pagination Standard

Toutes les listes utilisent la même structure de pagination :

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Filtres et Recherche

#### Paramètres de requête standards
- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (défaut: 20, max: 100)
- `search` : Recherche textuelle
- `sortBy` : Champ de tri
- `sortOrder` : Ordre de tri (`asc` ou `desc`)

#### Filtres spécifiques par endpoint
- **Users** : `role`, `status`, `organizationId`
- **Events** : `type`, `status`, `startDate`, `endDate`
- **Attendance** : `employeeId`, `date`, `status`

### Webhooks (Prochainement)

L'API v2.1 inclura un système de webhooks pour les événements temps réel :

- `user.created` - Nouvel utilisateur
- `event.published` - Événement publié
- `attendance.checked_in` - Pointage d'arrivée
- `organization.member_added` - Nouveau membre

### Migration depuis v1.0

#### Changements Breaking
- **Endpoints** : Nouvelle structure `/domain/resource`
- **Authentication** : Tokens JWT obligatoires
- **Responses** : Format standardisé avec `success` et `data`
- **Errors** : Codes d'erreur normalisés

#### Guide de migration
1. Mettre à jour les URLs des endpoints
2. Adapter la gestion des tokens JWT
3. Modifier le parsing des réponses
4. Implémenter la gestion d'erreurs v2

### Support et Ressources

- **Documentation interactive** : http://localhost:5001/api/docs
- **Collection Postman** : `docs/api-testing/`
- **Exemples de code** : `docs/api/examples/`
- **Guide de migration** : `docs/api/migration-guide.md`
- **Support** : support@attendance-x.com