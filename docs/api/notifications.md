# 📢 Notifications API

## Vue d'ensemble

L'API Notifications d'Attendance-X permet la gestion complète des notifications multi-canaux avec support pour l'email, SMS, push notifications, et intégrations tierces.

**Base URL:** `/api/notifications`

## Fonctionnalités principales

- 📧 Notifications email avec templates personnalisables
- 📱 Push notifications pour applications mobiles
- 💬 SMS et notifications via services tiers
- 🔔 Notifications en temps réel via WebSocket
- 📊 Analytics et métriques de livraison
- ⚙️ Préférences utilisateur granulaires
- 🎯 Notifications ciblées et segmentées

## Envoi de notifications

### POST /notifications/send
Envoie une notification à un ou plusieurs destinataires.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "type": "event_reminder",
  "recipients": [
    {
      "userId": "user-123",
      "email": "jean.dupont@example.com",
      "phone": "+33123456789"
    }
  ],
  "channels": ["email", "push"],
  "priority": "normal",
  "content": {
    "subject": "Rappel: Formation React demain",
    "title": "Formation React Avancé",
    "body": "N'oubliez pas votre formation React demain à 9h00 en salle A.",
    "actionUrl": "https://app.attendance-x.com/events/event-123",
    "actionText": "Voir l'événement"
  },
  "template": {
    "id": "event_reminder_template",
    "variables": {
      "eventName": "Formation React Avancé",
      "eventDate": "2024-03-16T09:00:00Z",
      "location": "Salle A",
      "organizerName": "Marie Dubois"
    }
  },
  "scheduling": {
    "sendAt": "2024-03-15T18:00:00Z",
    "timezone": "Europe/Paris"
  },
  "options": {
    "trackOpens": true,
    "trackClicks": true,
    "allowUnsubscribe": true,
    "retryOnFailure": true
  }
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-456",
    "batchId": "batch-789",
    "status": "queued",
    "scheduledFor": "2024-03-15T18:00:00Z",
    "recipients": {
      "total": 1,
      "queued": 1,
      "failed": 0
    },
    "channels": {
      "email": {
        "queued": 1,
        "estimatedDelivery": "2024-03-15T18:01:00Z"
      },
      "push": {
        "queued": 1,
        "estimatedDelivery": "2024-03-15T18:00:30Z"
      }
    },
    "tracking": {
      "trackingId": "track-123",
      "trackingUrl": "https://api.attendance-x.com/notifications/track/track-123"
    }
  }
}
```

### POST /notifications/send-bulk
Envoie des notifications en masse.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "type": "weekly_report",
  "segmentation": {
    "criteria": "user_role",
    "segments": [
      {
        "name": "managers",
        "filter": {
          "roles": ["manager", "admin"]
        },
        "template": "manager_weekly_report",
        "channels": ["email"]
      },
      {
        "name": "users",
        "filter": {
          "roles": ["user"]
        },
        "template": "user_weekly_report",
        "channels": ["email", "push"]
      }
    ]
  },
  "content": {
    "subject": "Rapport hebdomadaire - Semaine {weekNumber}",
    "variables": {
      "weekNumber": 11,
      "startDate": "2024-03-11",
      "endDate": "2024-03-17"
    }
  },
  "scheduling": {
    "sendAt": "2024-03-18T09:00:00Z",
    "timezone": "Europe/Paris"
  },
  "options": {
    "batchSize": 100,
    "delayBetweenBatches": 30,
    "respectUserPreferences": true
  }
}
```

**Réponse (202) :**
```json
{
  "success": true,
  "data": {
    "jobId": "bulk-job-123",
    "status": "processing",
    "totalRecipients": 156,
    "estimatedDuration": "5-10 minutes",
    "segments": {
      "managers": {
        "recipients": 18,
        "channels": ["email"]
      },
      "users": {
        "recipients": 138,
        "channels": ["email", "push"]
      }
    },
    "statusUrl": "/api/notifications/jobs/bulk-job-123/status"
  }
}
```

## Gestion des notifications

### GET /notifications/my-notifications
Récupère les notifications de l'utilisateur connecté.

**Permissions requises :** Utilisateur authentifié

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20)
- `type` (string) - Filtrer par type
- `status` (string) - Filtrer par statut: `queued`, `sent`, `delivered`, `failed`
- `channel` (string) - Filtrer par canal: `email`, `sms`, `push`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin
- `recipientId` (string) - Filtrer par destinataire

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-456",
      "type": "event_reminder",
      "subject": "Rappel: Formation React demain",
      "status": "delivered",
      "priority": "normal",
      "channels": ["email", "push"],
      "recipient": {
        "userId": "user-123",
        "name": "Jean Dupont",
        "email": "jean.dupont@example.com"
      },
      "delivery": {
        "email": {
          "status": "delivered",
          "deliveredAt": "2024-03-15T18:01:23Z",
          "opened": true,
          "openedAt": "2024-03-15T18:15:45Z",
          "clicked": false
        },
        "push": {
          "status": "delivered",
          "deliveredAt": "2024-03-15T18:00:45Z",
          "clicked": true,
          "clickedAt": "2024-03-15T18:16:12Z"
        }
      },
      "template": {
        "id": "event_reminder_template",
        "name": "Rappel d'événement"
      },
      "createdAt": "2024-03-15T17:30:00Z",
      "scheduledFor": "2024-03-15T18:00:00Z",
      "sentAt": "2024-03-15T18:00:15Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1234,
    "totalPages": 62
  }
}
```

### GET /notifications/:id
Récupère les détails d'une notification spécifique.

**Permissions requises :** Manager, Admin, ou destinataire

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "notif-456",
    "type": "event_reminder",
    "subject": "Rappel: Formation React demain",
    "status": "delivered",
    "priority": "normal",
    "content": {
      "subject": "Rappel: Formation React demain",
      "title": "Formation React Avancé",
      "body": "N'oubliez pas votre formation React demain à 9h00 en salle A.",
      "actionUrl": "https://app.attendance-x.com/events/event-123",
      "actionText": "Voir l'événement"
    },
    "recipient": {
      "userId": "user-123",
      "name": "Jean Dupont",
      "email": "jean.dupont@example.com",
      "phone": "+33123456789",
      "preferences": {
        "email": true,
        "sms": false,
        "push": true
      }
    },
    "channels": {
      "email": {
        "status": "delivered",
        "provider": "sendgrid",
        "messageId": "msg-email-789",
        "sentAt": "2024-03-15T18:00:15Z",
        "deliveredAt": "2024-03-15T18:01:23Z",
        "tracking": {
          "opened": true,
          "openedAt": "2024-03-15T18:15:45Z",
          "openCount": 2,
          "clicked": false,
          "clickCount": 0,
          "unsubscribed": false
        }
      },
      "push": {
        "status": "delivered",
        "provider": "firebase",
        "messageId": "msg-push-456",
        "sentAt": "2024-03-15T18:00:20Z",
        "deliveredAt": "2024-03-15T18:00:45Z",
        "tracking": {
          "clicked": true,
          "clickedAt": "2024-03-15T18:16:12Z"
        }
      }
    },
    "template": {
      "id": "event_reminder_template",
      "name": "Rappel d'événement",
      "version": "1.2.0"
    },
    "context": {
      "eventId": "event-123",
      "organizationId": "org-456",
      "triggeredBy": "scheduled_reminder"
    },
    "createdAt": "2024-03-15T17:30:00Z",
    "scheduledFor": "2024-03-15T18:00:00Z",
    "sentAt": "2024-03-15T18:00:15Z"
  }
}
```

### POST /notifications/mark-read/:id
Marque une notification comme lue.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-456",
    "status": "read",
    "readAt": "2024-03-15T17:45:00Z"
  }
}
```

### POST /notifications/mark-all-read
Marque toutes les notifications comme lues.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "markedCount": 15,
    "markedAt": "2024-03-15T17:45:00Z"
  }
}
```

### DELETE /notifications/:id
Supprime une notification.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-456",
    "status": "deleted",
    "deletedAt": "2024-03-15T17:45:00Z"
  }
}
```

## Templates de notifications

### GET /notifications/templates
Récupère la liste des templates de notifications.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `type` (string) - Filtrer par type
- `channel` (string) - Filtrer par canal
- `language` (string) - Filtrer par langue
- `active` (boolean) - Filtrer par statut actif

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "event_reminder_template",
      "name": "Rappel d'événement",
      "type": "event_reminder",
      "description": "Template pour les rappels d'événements",
      "channels": ["email", "push", "sms"],
      "language": "fr",
      "isActive": true,
      "isDefault": true,
      "variables": [
        {
          "name": "eventName",
          "type": "string",
          "required": true,
          "description": "Nom de l'événement"
        },
        {
          "name": "eventDate",
          "type": "datetime",
          "required": true,
          "description": "Date et heure de l'événement"
        },
        {
          "name": "location",
          "type": "string",
          "required": false,
          "description": "Lieu de l'événement"
        }
      ],
      "content": {
        "email": {
          "subject": "Rappel: {eventName}",
          "html": "<h1>Rappel d'événement</h1><p>N'oubliez pas {eventName} le {eventDate|date} à {location}.</p>",
          "text": "Rappel: N'oubliez pas {eventName} le {eventDate|date} à {location}."
        },
        "push": {
          "title": "Rappel d'événement",
          "body": "{eventName} commence bientôt",
          "icon": "event_reminder",
          "sound": "default"
        },
        "sms": {
          "body": "Rappel: {eventName} le {eventDate|date} à {location}"
        }
      },
      "usageCount": 1234,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z"
    }
  ]
}
```

### POST /notifications/templates
Crée un nouveau template de notification.

**Permissions requises :** Admin

**Requête :**
```json
{
  "name": "Confirmation d'inscription",
  "type": "registration_confirmation",
  "description": "Template pour confirmer les inscriptions",
  "channels": ["email", "push"],
  "language": "fr",
  "variables": [
    {
      "name": "userName",
      "type": "string",
      "required": true
    },
    {
      "name": "eventName",
      "type": "string",
      "required": true
    },
    {
      "name": "registrationDate",
      "type": "datetime",
      "required": true
    }
  ],
  "content": {
    "email": {
      "subject": "Inscription confirmée: {eventName}",
      "html": "<h1>Inscription confirmée</h1><p>Bonjour {userName},</p><p>Votre inscription à {eventName} est confirmée.</p>",
      "text": "Bonjour {userName}, votre inscription à {eventName} est confirmée."
    },
    "push": {
      "title": "Inscription confirmée",
      "body": "Votre inscription à {eventName} est confirmée",
      "icon": "check_circle"
    }
  }
}
```

### PUT /notifications/templates/:id
Met à jour un template de notification.

**Permissions requises :** Admin

### DELETE /notifications/templates/:id
Supprime un template de notification.

**Permissions requises :** Admin

## Notifications spécialisées

### POST /notifications/send-email
Envoie une notification email spécifique.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "recipients": ["user@example.com"],
  "subject": "Sujet de l'email",
  "body": "Contenu de l'email",
  "template": "email_template_id"
}
```

### POST /notifications/send-sms
Envoie une notification SMS.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "recipients": ["+33123456789"],
  "message": "Votre message SMS",
  "template": "sms_template_id"
}
```

### POST /notifications/send-push
Envoie une notification push.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "recipients": ["device_token_123"],
  "title": "Titre de la notification",
  "body": "Corps de la notification",
  "data": {
    "eventId": "event-123"
  }
}
```

### POST /notifications/push/configure
Configure les notifications push pour l'appareil.

**Permissions requises :** Utilisateur authentifié

**Requête :**
```json
{
  "deviceToken": "device_token_123",
  "platform": "ios",
  "appVersion": "1.2.3"
}
```

## Notifications d'événements

### POST /notifications/events/:eventId/reminders
Envoie des rappels pour un événement spécifique.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "reminderType": "24h_before",
  "recipients": "all_participants",
  "customMessage": "N'oubliez pas votre formation demain !"
}
```

## Analytics et statistiques

### GET /notifications/stats
Récupère les statistiques des notifications.

**Permissions requises :** Permission `view_reports`

**Paramètres de requête :**
- `period` (string) - Période: `day`, `week`, `month`
- `type` (string) - Type de notification
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin

### GET /notifications/:id/delivery-status
Récupère le statut de livraison d'une notification.

**Permissions requises :** Permission `send_notifications`

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-456",
    "status": "delivered",
    "deliveredAt": "2024-03-15T18:01:23Z",
    "deliveryDetails": {
      "email": {
        "status": "delivered",
        "opened": true,
        "clicked": false
      },
      "push": {
        "status": "delivered",
        "clicked": true
      }
    }
  }
}
```

## Test et développement

### POST /notifications/test
Envoie une notification de test.

**Permissions requises :** Permission `send_notifications`

**Requête :**
```json
{
  "type": "email",
  "recipient": "test@example.com",
  "template": "test_template",
  "testData": {
    "userName": "Test User",
    "eventName": "Test Event"
  }
}
```

## Webhooks

### POST /notifications/webhooks/:provider
Endpoint webhook pour les fournisseurs de notifications.

**Paramètres de chemin :**
- `provider` (string) - Fournisseur: `sendgrid`, `twilio`, `fcm`, `mailgun`

**Note :** Cet endpoint est utilisé par les fournisseurs externes pour notifier le statut de livraison.

## Préférences utilisateur

### GET /notifications/preferences
Récupère les préférences de notification de l'utilisateur connecté.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "globalSettings": {
      "enabled": true,
      "timezone": "Europe/Paris",
      "quietHours": {
        "enabled": true,
        "start": "22:00",
        "end": "08:00"
      },
      "frequency": {
        "maxPerDay": 10,
        "maxPerHour": 3
      }
    },
    "channels": {
      "email": {
        "enabled": true,
        "address": "jean.dupont@example.com",
        "verified": true,
        "frequency": "immediate"
      },
      "sms": {
        "enabled": false,
        "phone": "+33123456789",
        "verified": true,
        "frequency": "urgent_only"
      },
      "push": {
        "enabled": true,
        "devices": [
          {
            "id": "device-123",
            "name": "iPhone de Jean",
            "platform": "ios",
            "token": "push-token-456",
            "active": true
          }
        ],
        "frequency": "immediate"
      }
    },
    "types": {
      "event_reminder": {
        "enabled": true,
        "channels": ["email", "push"],
        "timing": {
          "advance": [1440, 60],
          "units": "minutes"
        }
      },
      "attendance_confirmation": {
        "enabled": true,
        "channels": ["email"]
      },
      "weekly_report": {
        "enabled": false,
        "channels": []
      },
      "system_alerts": {
        "enabled": true,
        "channels": ["email", "push"],
        "priority": "high_only"
      }
    },
    "unsubscribed": {
      "marketing": true,
      "promotional": true,
      "surveys": false
    },
    "updatedAt": "2024-03-10T14:30:00Z"
  }
}
```

### PUT /notifications/preferences
Met à jour les préférences de notification de l'utilisateur connecté.

**Permissions requises :** Utilisateur authentifié

**Requête :**
```json
{
  "channels": {
    "email": {
      "enabled": true,
      "frequency": "immediate"
    },
    "sms": {
      "enabled": true,
      "frequency": "urgent_only"
    },
    "push": {
      "enabled": true,
      "frequency": "immediate"
    }
  },
  "types": {
    "event_reminder": {
      "enabled": true,
      "channels": ["email", "push"],
      "timing": {
        "advance": [1440, 60]
      }
    },
    "weekly_report": {
      "enabled": true,
      "channels": ["email"]
    }
  },
  "quietHours": {
    "enabled": true,
    "start": "21:00",
    "end": "09:00"
  }
}
```

## Analytics et métriques

### GET /notifications/analytics/summary
Récupère un résumé des analytics de notifications.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `period` (string) - Période: `day`, `week`, `month`, `quarter`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin
- `type` (string) - Filtrer par type
- `channel` (string) - Filtrer par canal

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSent": 15678,
      "totalDelivered": 14234,
      "totalOpened": 8567,
      "totalClicked": 2345,
      "deliveryRate": 0.908,
      "openRate": 0.602,
      "clickRate": 0.274,
      "unsubscribeRate": 0.012
    },
    "byChannel": {
      "email": {
        "sent": 12345,
        "delivered": 11234,
        "opened": 7890,
        "clicked": 2100,
        "bounced": 234,
        "unsubscribed": 45,
        "deliveryRate": 0.910,
        "openRate": 0.703,
        "clickRate": 0.187
      },
      "push": {
        "sent": 2345,
        "delivered": 2100,
        "opened": 567,
        "clicked": 234,
        "deliveryRate": 0.896,
        "openRate": 0.270,
        "clickRate": 0.111
      },
      "sms": {
        "sent": 988,
        "delivered": 900,
        "clicked": 11,
        "deliveryRate": 0.911,
        "clickRate": 0.012
      }
    },
    "byType": {
      "event_reminder": {
        "sent": 8765,
        "openRate": 0.756,
        "clickRate": 0.234
      },
      "attendance_confirmation": {
        "sent": 3456,
        "openRate": 0.623,
        "clickRate": 0.156
      },
      "weekly_report": {
        "sent": 2345,
        "openRate": 0.445,
        "clickRate": 0.089
      }
    },
    "trends": {
      "daily": [
        {
          "date": "2024-03-01",
          "sent": 567,
          "delivered": 523,
          "opened": 312,
          "clicked": 89
        }
      ],
      "hourly": [
        {
          "hour": 9,
          "sent": 234,
          "openRate": 0.678
        }
      ]
    },
    "topPerforming": {
      "templates": [
        {
          "id": "event_reminder_template",
          "name": "Rappel d'événement",
          "openRate": 0.756,
          "clickRate": 0.234
        }
      ],
      "campaigns": [
        {
          "id": "campaign-123",
          "name": "Rappels formation React",
          "openRate": 0.823,
          "clickRate": 0.345
        }
      ]
    }
  }
}
```

### GET /notifications/analytics/delivery-report
Génère un rapport de livraison détaillé.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `format` (string) - Format: `json`, `csv`, `excel`, `pdf`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin
- `includeDetails` (boolean) - Inclure les détails par notification

## Gestion des erreurs et reprises

### GET /notifications/failed
Récupère la liste des notifications échouées.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-failed-123",
      "type": "event_reminder",
      "recipient": {
        "userId": "user-456",
        "email": "invalid@example.com"
      },
      "channel": "email",
      "status": "failed",
      "error": {
        "code": "INVALID_EMAIL",
        "message": "Email address is invalid",
        "details": "The email address 'invalid@example.com' is not valid"
      },
      "attempts": 3,
      "lastAttempt": "2024-03-15T18:30:00Z",
      "nextRetry": null,
      "canRetry": false,
      "failedAt": "2024-03-15T18:30:00Z"
    }
  ]
}
```

### POST /notifications/:id/retry
Relance une notification échouée.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "channel": "email",
  "updateRecipient": {
    "email": "corrected@example.com"
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `NOTIFICATION_NOT_FOUND` | Notification introuvable |
| `TEMPLATE_NOT_FOUND` | Template introuvable |
| `INVALID_RECIPIENT` | Destinataire invalide |
| `CHANNEL_NOT_SUPPORTED` | Canal non supporté |
| `DELIVERY_FAILED` | Échec de livraison |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée |
| `INVALID_TEMPLATE` | Template invalide |
| `UNSUBSCRIBED_RECIPIENT` | Destinataire désabonné |
| `QUOTA_EXCEEDED` | Quota dépassé |
| `PROVIDER_ERROR` | Erreur du fournisseur |

## Exemples d'utilisation

### Envoyer une notification simple
```javascript
const notification = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'event_reminder',
    recipients: [
      {
        userId: 'user-123',
        email: 'jean.dupont@example.com'
      }
    ],
    channels: ['email', 'push'],
    content: {
      subject: 'Rappel: Formation demain',
      body: 'N\'oubliez pas votre formation demain à 9h00.'
    },
    template: {
      id: 'event_reminder_template',
      variables: {
        eventName: 'Formation React',
        eventDate: '2024-03-16T09:00:00Z'
      }
    }
  })
});

const result = await notification.json();
console.log('Notification envoyée:', result.data.notificationId);
```

### Configurer les préférences utilisateur
```javascript
const preferences = await fetch(`/api/notifications/preferences/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channels: {
      email: {
        enabled: true,
        frequency: 'immediate'
      },
      push: {
        enabled: true,
        frequency: 'immediate'
      },
      sms: {
        enabled: false
      }
    },
    types: {
      event_reminder: {
        enabled: true,
        channels: ['email', 'push'],
        timing: {
          advance: [1440, 60] // 24h et 1h avant
        }
      }
    }
  })
});
```

### Créer un template personnalisé
```javascript
const template = await fetch('/api/notifications/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Confirmation personnalisée',
    type: 'custom_confirmation',
    channels: ['email'],
    language: 'fr',
    variables: [
      {
        name: 'userName',
        type: 'string',
        required: true
      },
      {
        name: 'actionName',
        type: 'string',
        required: true
      }
    ],
    content: {
      email: {
        subject: 'Confirmation: {actionName}',
        html: '<h1>Bonjour {userName}</h1><p>Votre action "{actionName}" a été confirmée.</p>',
        text: 'Bonjour {userName}, votre action "{actionName}" a été confirmée.'
      }
    }
  })
});
```