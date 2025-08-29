# 📅 Events API

## Vue d'ensemble

L'API Events d'Attendance-X permet la gestion complète des événements avec support pour la présence, les QR codes, et l'analytics avancé.

## Endpoints principaux

### GET /events
Récupère la liste des événements de l'organisation.

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20, max: 100)
- `search` (string) - Recherche dans le nom et description
- `status` (string) - Filtrer par statut: `draft`, `published`, `ongoing`, `completed`, `cancelled`
- `startDate` (string) - Date de début (ISO 8601)
- `endDate` (string) - Date de fin (ISO 8601)
- `sort` (string) - Tri: `name`, `startDate`, `createdAt` (ajouter `:desc` pour décroissant)

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-123",
      "name": "Formation React Avancé",
      "description": "Formation approfondie sur React et ses écosystèmes",
      "startDate": "2024-03-15T09:00:00Z",
      "endDate": "2024-03-15T17:00:00Z",
      "location": {
        "name": "Salle de conférence A",
        "address": "123 Rue de la Tech, Paris",
        "coordinates": {
          "latitude": 48.8566,
          "longitude": 2.3522
        }
      },
      "status": "published",
      "attendanceSettings": {
        "requiresAttendance": true,
        "allowLateCheckIn": true,
        "lateCheckInGracePeriod": 15,
        "qrCodeEnabled": true,
        "geolocationEnabled": true,
        "geofenceRadius": 100
      },
      "capacity": 50,
      "registeredCount": 32,
      "attendedCount": 28,
      "organizationId": "org-123",
      "createdBy": "user-456",
      "createdAt": "2024-03-01T10:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /events
Crée un nouvel événement.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "name": "Conférence Tech 2024",
  "description": "Conférence annuelle sur les nouvelles technologies",
  "startDate": "2024-06-15T09:00:00Z",
  "endDate": "2024-06-15T18:00:00Z",
  "location": {
    "name": "Centre de congrès",
    "address": "456 Avenue Innovation, Lyon",
    "coordinates": {
      "latitude": 45.7640,
      "longitude": 4.8357
    }
  },
  "capacity": 200,
  "attendanceSettings": {
    "requiresAttendance": true,
    "allowLateCheckIn": true,
    "lateCheckInGracePeriod": 30,
    "qrCodeEnabled": true,
    "geolocationEnabled": true,
    "geofenceRadius": 150
  },
  "tags": ["tech", "innovation", "networking"],
  "isRecurring": false,
  "visibility": "public"
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "event-789",
    "name": "Conférence Tech 2024",
    "qrCode": {
      "id": "qr-abc123",
      "code": "EVT-789-2024",
      "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?data=EVT-789-2024"
    },
    // ... autres propriétés de l'événement
  }
}
```

### GET /events/:id
Récupère les détails d'un événement spécifique.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "event-123",
    "name": "Formation React Avancé",
    // ... propriétés complètes de l'événement
    "participants": [
      {
        "id": "participant-456",
        "userId": "user-789",
        "firstName": "Marie",
        "lastName": "Dubois",
        "email": "marie.dubois@example.com",
        "registrationDate": "2024-03-05T10:00:00Z",
        "attendanceStatus": "present",
        "checkInTime": "2024-03-15T08:55:00Z",
        "checkOutTime": null
      }
    ],
    "analytics": {
      "registrationRate": 0.64,
      "attendanceRate": 0.875,
      "averageRating": 4.2,
      "feedbackCount": 25
    }
  }
}
```

### PUT /events/:id
Met à jour un événement existant.

**Permissions requises :** Manager, Admin, ou créateur de l'événement

### DELETE /events/:id
Supprime un événement.

**Permissions requises :** Permission `manage_events`

## Endpoints spécialisés

### GET /events/my-events
Récupère les événements de l'utilisateur connecté.

**Permissions requises :** Utilisateur authentifié

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20)
- `status` (string) - Filtrer par statut
- `upcoming` (boolean) - Événements à venir uniquement

### GET /events/upcoming
Récupère les événements à venir.

**Permissions requises :** Utilisateur authentifié

**Paramètres de requête :**
- `limit` (number) - Nombre d'événements (défaut: 10, max: 50)

### POST /events/search
Recherche avancée d'événements.

**Permissions requises :** Utilisateur authentifié

**Requête :**
```json
{
  "query": "formation",
  "filters": {
    "type": ["training", "workshop"],
    "status": "published",
    "dateRange": {
      "start": "2024-03-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    },
    "location": "Paris"
  },
  "sort": {
    "field": "startDate",
    "direction": "asc"
  }
}
```

### GET /events/recommendations
Récupère des recommandations d'événements personnalisées.

**Permissions requises :** Utilisateur authentifié

**Paramètres de requête :**
- `limit` (number) - Nombre de recommandations (défaut: 5, max: 20)

### GET /events/stats
Récupère les statistiques des événements.

**Permissions requises :** Permission `view_reports`

**Paramètres de requête :**
- `period` (string) - Période d'analyse
- `organizationId` (string) - ID de l'organisation

### POST /events/check-conflicts
Vérifie les conflits de créneaux pour un événement.

**Permissions requises :** Permission `create_events`

**Requête :**
```json
{
  "startDate": "2024-03-20T09:00:00Z",
  "endDate": "2024-03-20T17:00:00Z",
  "location": "Salle A",
  "excludeEventId": "event-123"
}
```

### POST /events/export
Exporte les données d'événements.

**Permissions requises :** Permission `export_data`

**Requête :**
```json
{
  "format": "csv",
  "filters": {
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-03-31T23:59:59Z"
  },
  "fields": ["name", "startDate", "attendanceCount"]
}
```

### POST /events/bulk-operations
Opérations en masse sur les événements.

**Permissions requises :** Permission `manage_events`

**Requête :**
```json
{
  "operation": "update_status",
  "eventIds": ["event-123", "event-456"],
  "data": {
    "status": "published"
  }
}
```

### POST /events/:id/duplicate
Duplique un événement existant.

**Permissions requises :** Permission `create_events`

**Requête :**
```json
{
  "name": "Formation React Avancé - Session 2",
  "startDate": "2024-04-20T09:00:00Z",
  "endDate": "2024-04-20T17:00:00Z",
  "copyParticipants": false
}
```

### POST /events/:id/status
Met à jour le statut d'un événement.

**Permissions requises :** Permission `manage_events`

**Requête :**
```json
{
  "status": "published",
  "reason": "Event ready for registration"
}
```

## Gestion des participants

### GET /events/:id/participants
Récupère la liste des participants d'un événement.

**Paramètres de requête :**
- `status` - Filtrer par statut: `registered`, `present`, `absent`, `late`
- `search` - Recherche par nom ou email
- `sort` - Tri par: `name`, `registrationDate`, `checkInTime`

### POST /events/:id/participants
Ajoute un participant à un événement.

**Requête :**
```json
{
  "userId": "user-123",
  "role": "attendee",
  "notificationPreferences": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

### POST /events/:id/participants/bulk
Ajoute plusieurs participants via import CSV.

**Requête (multipart/form-data) :**
```
file: participants.csv
```

**Format CSV :**
```csv
firstName,lastName,email,phone,role
Jean,Dupont,jean.dupont@example.com,+33123456789,attendee
Marie,Martin,marie.martin@example.com,+33987654321,speaker
```

### DELETE /events/:id/participants/:participantId
Retire un participant d'un événement.

## Gestion de la présence

### POST /events/:id/attendance/check-in
Enregistre l'arrivée d'un participant.

**Requête :**
```json
{
  "participantId": "participant-123",
  "method": "qr_code",
  "qrCode": "EVT-789-2024",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  },
  "timestamp": "2024-03-15T09:05:00Z"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "attendanceId": "att-456",
    "status": "present",
    "checkInTime": "2024-03-15T09:05:00Z",
    "isLate": true,
    "minutesLate": 5,
    "message": "Présence enregistrée avec succès"
  }
}
```

### POST /events/:id/attendance/check-out
Enregistre le départ d'un participant.

### POST /events/:id/attendance/bulk
Pointage en masse de plusieurs participants.

**Requête :**
```json
{
  "participants": [
    {
      "participantId": "participant-123",
      "status": "present",
      "checkInTime": "2024-03-15T09:00:00Z"
    },
    {
      "participantId": "participant-456",
      "status": "absent"
    }
  ]
}
```

### GET /events/:id/attendance/summary
Récupère un résumé de la présence pour l'événement.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "totalParticipants": 50,
    "presentCount": 42,
    "absentCount": 8,
    "lateCount": 5,
    "attendanceRate": 0.84,
    "averageArrivalTime": "09:12:00",
    "peakArrivalTime": "09:00:00"
  }
}
```

## QR Codes et validation

### GET /events/:id/qr-code
Récupère le QR code de l'événement.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "qr-abc123",
    "code": "EVT-789-2024",
    "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?data=EVT-789-2024",
    "expiresAt": "2024-03-15T23:59:59Z",
    "usageCount": 42,
    "maxUsage": null,
    "isActive": true
  }
}
```

### POST /events/:id/qr-code/regenerate
Génère un nouveau QR code pour l'événement.

### POST /events/:id/qr-code/validate
Valide un QR code pour l'événement.

**Requête :**
```json
{
  "code": "EVT-789-2024",
  "participantId": "participant-123",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  }
}
```

## Analytics et rapports

### GET /events/:id/analytics
Récupère les analytics détaillés d'un événement.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "registrationRate": 0.64,
      "attendanceRate": 0.875,
      "satisfactionScore": 4.2,
      "npsScore": 8.5
    },
    "attendance": {
      "timeline": [
        {
          "time": "09:00:00",
          "cumulativeAttendees": 15
        },
        {
          "time": "09:15:00",
          "cumulativeAttendees": 35
        }
      ],
      "byMethod": {
        "qr_code": 38,
        "manual": 4,
        "geolocation": 0
      }
    },
    "demographics": {
      "ageGroups": {
        "18-25": 12,
        "26-35": 28,
        "36-45": 8,
        "46+": 2
      },
      "departments": {
        "Engineering": 25,
        "Marketing": 15,
        "Sales": 10
      }
    },
    "feedback": {
      "averageRating": 4.2,
      "responseRate": 0.6,
      "topComments": [
        "Excellent contenu, très instructif",
        "Bonne organisation, merci !"
      ]
    }
  }
}
```

### GET /events/:id/reports/attendance
Génère un rapport de présence.

**Paramètres de requête :**
- `format` - Format: `pdf`, `excel`, `csv`
- `includeDetails` - Inclure les détails: `true`, `false`

### GET /events/:id/reports/certificates
Génère les certificats de présence.

## Événements récurrents

### POST /events/:id/recurrence
Configure la récurrence d'un événement.

**Requête :**
```json
{
  "pattern": "weekly",
  "interval": 1,
  "daysOfWeek": [1, 3, 5],
  "endDate": "2024-12-31T23:59:59Z",
  "maxOccurrences": 50,
  "exceptions": ["2024-12-25T00:00:00Z"]
}
```

### GET /events/:id/occurrences
Récupère les occurrences d'un événement récurrent.

## Notifications et rappels

### POST /events/:id/notifications/send
Envoie une notification aux participants.

**Requête :**
```json
{
  "type": "reminder",
  "channels": ["email", "sms"],
  "message": {
    "subject": "Rappel: Formation React demain",
    "body": "N'oubliez pas votre formation React demain à 9h00.",
    "template": "event_reminder"
  },
  "recipients": "all",
  "scheduleFor": "2024-03-14T18:00:00Z"
}
```

### GET /events/:id/notifications/history
Récupère l'historique des notifications envoyées.

## Codes d'erreur

| Code | Description |
|------|-------------|
| `EVENT_NOT_FOUND` | Événement introuvable |
| `EVENT_FULL` | Événement complet |
| `EVENT_CANCELLED` | Événement annulé |
| `REGISTRATION_CLOSED` | Inscriptions fermées |
| `ALREADY_REGISTERED` | Déjà inscrit |
| `INVALID_QR_CODE` | QR code invalide |
| `OUTSIDE_GEOFENCE` | En dehors de la zone autorisée |
| `ATTENDANCE_WINDOW_CLOSED` | Fenêtre de pointage fermée |
| `DUPLICATE_CHECK_IN` | Pointage déjà effectué |

## Exemples d'utilisation

### Créer un événement avec pointage QR
```javascript
const event = await fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Workshop JavaScript',
    startDate: '2024-04-01T14:00:00Z',
    endDate: '2024-04-01T18:00:00Z',
    attendanceSettings: {
      requiresAttendance: true,
      qrCodeEnabled: true,
      geolocationEnabled: true,
      geofenceRadius: 50
    }
  })
});

const { data } = await event.json();
console.log('QR Code:', data.qrCode.imageUrl);
```

### Pointer la présence avec QR code
```javascript
const attendance = await fetch(`/api/events/${eventId}/attendance/check-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    participantId: 'participant-123',
    method: 'qr_code',
    qrCode: 'EVT-789-2024',
    location: {
      latitude: 48.8566,
      longitude: 2.3522
    }
  })
});

const result = await attendance.json();
if (result.success) {
  console.log('Présence enregistrée:', result.data.status);
}
```