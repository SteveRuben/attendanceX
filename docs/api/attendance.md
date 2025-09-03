# ✅ Attendance API

## Vue d'ensemble

L'API Attendance d'Attendance-X fournit un système complet de gestion de présence avec support pour le pointage QR, la géolocalisation, l'analytics en temps réel, et la gestion des présences multiples.

**Base URL:** `/api/attendances`

## Fonctionnalités principales

- ✅ Validation de présence multi-méthodes (QR, géolocalisation, manuel)
- 📱 Support des QR codes dynamiques et sécurisés
- 🌍 Géolocalisation avec géofencing intelligent
- 📊 Analytics et rapports de présence en temps réel
- 🔄 Gestion des présences multiples et des sessions
- 🎯 Détection automatique des retards et absences
- 📈 Suivi des tendances et patterns de présence

## Validation de présence

### POST /attendances/check-in
Enregistre l'arrivée d'un participant à un événement.

**Méthodes supportées :**
- `qr_code` - Validation par QR code
- `manual` - Pointage manuel par un organisateur
- `geolocation` - Validation par géolocalisation
- `nfc` - Validation par NFC (si supporté)
- `biometric` - Validation biométrique (si configurée)

**Requête :**
```json
{
  "eventId": "event-123",
  "method": "qr_code",
  "qrCode": "EVT-123-2024-ABC",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  },
  "notes": "Arrivée légèrement en retard"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "attendanceId": "att-789",
    "status": "present",
    "checkInTime": "2024-03-15T09:05:00Z",
    "method": "qr_code",
    "isLate": true,
    "minutesLate": 5,
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522,
      "address": "123 Rue de la Tech, Paris"
    },
    "validation": {
      "qrCodeValid": true,
      "locationValid": true,
      "timeValid": true,
      "geofenceValid": true
    },
    "participant": {
      "id": "participant-456",
      "firstName": "Jean",
      "lastName": "Dupont",
      "avatar": "https://storage.example.com/avatars/user-456.jpg"
    },
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé",
      "startTime": "2024-03-15T09:00:00Z"
    },
    "message": "Présence enregistrée avec succès",
    "nextAction": "check_out_available"
  }
}
```

### POST /attendances/check-out
Enregistre la sortie d'un participant.

**Note :** Cette fonctionnalité est intégrée dans le système de check-in. Le check-out se fait automatiquement ou via une seconde validation.

**Requête :**
```json
{
  "eventId": "event-123",
  "method": "qr_code",
  "qrCode": "EVT-123-2024-ABC",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 8
  },
  "feedback": {
    "rating": 5,
    "comment": "Excellente formation, très utile"
  }
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "attendanceId": "att-789",
    "checkOutTime": "2024-03-15T17:30:00Z",
    "duration": "8h25m",
    "status": "completed",
    "isEarlyLeave": false,
    "certificateEligible": true,
    "feedback": {
      "rating": 5,
      "comment": "Excellente formation, très utile",
      "submittedAt": "2024-03-15T17:30:00Z"
    },
    "summary": {
      "totalDuration": "8h25m",
      "effectiveDuration": "8h20m",
      "breaks": 1,
      "breakDuration": "5m"
    }
  }
}
```

## Gestion des présences

### GET /attendances/events/:eventId
Récupère toutes les présences d'un événement.

**Permissions requises :** Manager, Admin, ou organisateur de l'événement

**Paramètres de requête :**
- `status` (string) - Filtrer par statut: `present`, `absent`, `late`, `partial`
- `method` (string) - Filtrer par méthode: `qr_code`, `manual`, `geolocation`
- `search` (string) - Recherche par nom de participant
- `sort` (string) - Tri: `checkInTime`, `name`, `status`
- `export` (string) - Format d'export: `csv`, `excel`, `pdf`

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé",
      "startTime": "2024-03-15T09:00:00Z",
      "endTime": "2024-03-15T17:00:00Z",
      "totalParticipants": 50
    },
    "summary": {
      "totalPresent": 42,
      "totalAbsent": 8,
      "totalLate": 5,
      "attendanceRate": 0.84,
      "averageArrivalTime": "09:12:00",
      "averageDuration": "7h45m"
    },
    "attendances": [
      {
        "id": "att-789",
        "participant": {
          "id": "participant-456",
          "userId": "user-789",
          "firstName": "Jean",
          "lastName": "Dupont",
          "email": "jean.dupont@example.com",
          "avatar": "https://storage.example.com/avatars/user-789.jpg"
        },
        "status": "present",
        "checkInTime": "2024-03-15T09:05:00Z",
        "checkOutTime": "2024-03-15T17:30:00Z",
        "method": "qr_code",
        "duration": "8h25m",
        "isLate": true,
        "minutesLate": 5,
        "location": {
          "checkIn": {
            "latitude": 48.8566,
            "longitude": 2.3522,
            "address": "123 Rue de la Tech, Paris"
          }
        },
        "feedback": {
          "rating": 5,
          "hasComment": true
        },
        "certificateGenerated": true
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 50,
    "totalPages": 1
  }
}
```

### GET /attendances/users/:userId/report
Récupère l'historique de présence d'un utilisateur.

**Permissions requises :** Utilisateur lui-même, Manager, ou Admin

**Paramètres de requête :**
- `startDate` (string) - Date de début (ISO 8601)
- `endDate` (string) - Date de fin (ISO 8601)
- `status` (string) - Filtrer par statut
- `eventType` (string) - Filtrer par type d'événement
- `limit` (number) - Nombre d'éléments (défaut: 20)

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-789",
      "firstName": "Jean",
      "lastName": "Dupont",
      "avatar": "https://storage.example.com/avatars/user-789.jpg"
    },
    "statistics": {
      "totalEvents": 45,
      "attendedEvents": 42,
      "attendanceRate": 0.93,
      "averageRating": 4.6,
      "totalHours": 156.5,
      "certificatesEarned": 38,
      "streak": {
        "current": 12,
        "longest": 28
      }
    },
    "attendances": [
      {
        "id": "att-789",
        "event": {
          "id": "event-123",
          "name": "Formation React Avancé",
          "startTime": "2024-03-15T09:00:00Z",
          "type": "training",
          "location": "Salle A"
        },
        "status": "present",
        "checkInTime": "2024-03-15T09:05:00Z",
        "checkOutTime": "2024-03-15T17:30:00Z",
        "duration": "8h25m",
        "method": "qr_code",
        "isLate": true,
        "minutesLate": 5,
        "feedback": {
          "rating": 5,
          "comment": "Excellente formation"
        },
        "certificateId": "cert-456"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### POST /attendances/:id/validate
Valide ou rejette une présence existante.

**Permissions requises :** Manager, Admin, ou organisateur de l'événement

**Requête :**
```json
{
  "approved": true,
  "notes": "Présence confirmée manuellement"
}
```

## Présences en masse

### POST /attendances/bulk-validate
Validation en masse de présences.

**Permissions requises :** Manager, Admin, ou organisateur de l'événement

**Requête :**
```json
{
  "attendanceIds": ["att-456", "att-789", "att-123"],
  "approved": true,
  "notes": "Validation manuelle après l'événement"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "participantId": "participant-456",
        "status": "success",
        "attendanceId": "att-new-123"
      },
      {
        "participantId": "participant-789",
        "status": "success",
        "attendanceId": "att-new-456"
      }
    ],
    "summary": {
      "totalPresent": 1,
      "totalAbsent": 1,
      "certificatesGenerated": 1
    }
  }
}
```

### POST /attendances/bulk-mark
Marquage en masse de présences.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "operation": "mark_present",
  "eventId": "event-123",
  "userIds": ["user-456", "user-789", "user-123"],
  "notes": "Marquage en masse après l'événement"
}
```

**Opérations disponibles :**
- `mark_present` - Marquer comme présent
- `mark_absent` - Marquer comme absent  
- `mark_late` - Marquer comme en retard

## Analytics et rapports

### GET /attendances/stats
Récupère un résumé analytique des présences.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `period` (string) - Période: `day`, `week`, `month`, `quarter`, `year`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin
- `organizationId` (string) - Filtrer par organisation
- `eventType` (string) - Filtrer par type d'événement

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalEvents": 156,
      "totalAttendances": 3420,
      "averageAttendanceRate": 0.87,
      "totalHours": 12450.5,
      "uniqueParticipants": 234
    },
    "trends": {
      "attendanceRate": [
        {
          "date": "2024-03-01",
          "rate": 0.85,
          "events": 12,
          "attendances": 156
        }
      ],
      "methodUsage": {
        "qr_code": 0.78,
        "manual": 0.15,
        "geolocation": 0.07
      }
    },
    "patterns": {
      "bestDays": ["Tuesday", "Wednesday", "Thursday"],
      "bestTimes": ["09:00-10:00", "14:00-15:00"],
      "seasonality": {
        "spring": 0.89,
        "summer": 0.82,
        "autumn": 0.91,
        "winter": 0.85
      }
    },
    "demographics": {
      "byDepartment": {
        "Engineering": 0.92,
        "Marketing": 0.85,
        "Sales": 0.78
      },
      "byAge": {
        "18-25": 0.88,
        "26-35": 0.91,
        "36-45": 0.85,
        "46+": 0.82
      }
    }
  }
}
```

### POST /attendances/export
Génère un export de présences personnalisé.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "filters": {
    "eventId": "event-123",
    "userId": "user-456",
    "startDate": "2024-03-01T00:00:00Z",
    "endDate": "2024-03-31T23:59:59Z",
    "status": "present"
  },
  "format": "csv"
}
```

## QR Codes et validation

### GET /attendance/qr-codes/:eventId
Récupère les QR codes d'un événement.

**Permissions requises :** Manager, Admin, ou organisateur

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé"
    },
    "qrCodes": [
      {
        "id": "qr-main-123",
        "type": "main",
        "code": "EVT-123-2024-MAIN",
        "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?data=EVT-123-2024-MAIN",
        "isActive": true,
        "usageCount": 42,
        "maxUsage": null,
        "expiresAt": "2024-03-15T23:59:59Z"
      },
      {
        "id": "qr-backup-456",
        "type": "backup",
        "code": "EVT-123-2024-BACKUP",
        "imageUrl": "https://api.qrserver.com/v1/create-qr-code/?data=EVT-123-2024-BACKUP",
        "isActive": false,
        "usageCount": 0,
        "maxUsage": 100
      }
    ]
  }
}
```

### POST /attendance/qr-codes/:eventId/regenerate
Génère de nouveaux QR codes pour un événement.

**Permissions requises :** Manager, Admin, ou organisateur

**Requête :**
```json
{
  "invalidateExisting": true,
  "generateBackup": true,
  "customPrefix": "REACT-TRAINING",
  "expiresAt": "2024-03-15T23:59:59Z"
}
```

### POST /attendance/qr-codes/validate
Valide un QR code sans enregistrer la présence.

**Requête :**
```json
{
  "code": "EVT-123-2024-MAIN",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "timestamp": "2024-03-15T09:05:00Z"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé",
      "startTime": "2024-03-15T09:00:00Z",
      "location": "Salle A"
    },
    "validation": {
      "codeValid": true,
      "timeValid": true,
      "locationValid": true,
      "geofenceValid": true,
      "notExpired": true
    },
    "warnings": [
      "Event started 5 minutes ago"
    ]
  }
}
```

## Géolocalisation et géofencing

### GET /attendance/geofences/:eventId
Récupère les géofences d'un événement.

**Permissions requises :** Manager, Admin, ou organisateur

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "event-123",
      "name": "Formation React Avancé"
    },
    "geofences": [
      {
        "id": "geo-main-123",
        "type": "main",
        "center": {
          "latitude": 48.8566,
          "longitude": 2.3522
        },
        "radius": 100,
        "address": "123 Rue de la Tech, Paris",
        "isActive": true
      },
      {
        "id": "geo-parking-456",
        "type": "parking",
        "center": {
          "latitude": 48.8560,
          "longitude": 2.3518
        },
        "radius": 50,
        "address": "Parking du bâtiment",
        "isActive": true
      }
    ]
  }
}
```

### POST /attendance/geofences/validate
Valide une position géographique.

**Requête :**
```json
{
  "eventId": "event-123",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "accuracy": 10
  }
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "geofence": {
      "id": "geo-main-123",
      "type": "main",
      "distance": 15.5,
      "withinRadius": true
    },
    "location": {
      "address": "123 Rue de la Tech, Paris",
      "accuracy": 10
    }
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `ATTENDANCE_NOT_FOUND` | Présence introuvable |
| `EVENT_NOT_FOUND` | Événement introuvable |
| `PARTICIPANT_NOT_FOUND` | Participant introuvable |
| `INVALID_QR_CODE` | QR code invalide ou expiré |
| `OUTSIDE_GEOFENCE` | En dehors de la zone autorisée |
| `ATTENDANCE_WINDOW_CLOSED` | Fenêtre de pointage fermée |
| `DUPLICATE_CHECK_IN` | Pointage déjà effectué |
| `ALREADY_CHECKED_OUT` | Déjà pointé en sortie |
| `INVALID_METHOD` | Méthode de validation invalide |
| `LOCATION_REQUIRED` | Géolocalisation requise |
| `INSUFFICIENT_ACCURACY` | Précision GPS insuffisante |

## Exemples d'utilisation

### Validation de présence avec QR code
```javascript
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
      qrCode: 'EVT-123-2024-MAIN',
      location: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10
      }
    },
    timestamp: new Date().toISOString()
  })
});

const result = await attendance.json();
if (result.success) {
  console.log('Présence enregistrée:', result.data.status);
  if (result.data.isLate) {
    console.log(`Retard de ${result.data.minutesLate} minutes`);
  }
}
```

### Récupération des présences d'un événement
```javascript
const attendances = await fetch(`/api/attendance/events/${eventId}?status=present&sort=checkInTime`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await attendances.json();
console.log(`Taux de présence: ${data.data.summary.attendanceRate * 100}%`);
console.log(`${data.data.summary.totalPresent} participants présents`);
```

### Validation en masse
```javascript
const bulkAttendances = [
  {
    participantId: 'participant-123',
    status: 'present',
    checkInTime: '2024-03-15T09:00:00Z',
    method: 'manual'
  },
  {
    participantId: 'participant-456',
    status: 'absent',
    reason: 'Maladie'
  }
];

const result = await fetch('/api/attendance/bulk-validate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    eventId: 'event-123',
    attendances: bulkAttendances,
    validatedBy: 'user-admin-123'
  })
});

const response = await result.json();
console.log(`${response.data.successful} présences traitées avec succès`);
``` 