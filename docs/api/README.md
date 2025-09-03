# 📚 Attendance-X API Documentation

## Vue d'ensemble

Bienvenue dans la documentation complète de l'API Attendance-X. Cette API REST moderne fournit tous les outils nécessaires pour gérer efficacement la présence, les événements, et l'engagement des utilisateurs dans votre organisation.

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

### Collection Postman
Une collection Postman complète est disponible avec plus de 150 endpoints :
- [Télécharger la collection](./Core-Workflow-APIs.postman_collection.json)
- [Guide d'utilisation](./swagger-guide.md)

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