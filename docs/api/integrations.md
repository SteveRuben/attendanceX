# 🔗 Integrations API

## Vue d'ensemble

L'API Integrations d'Attendance-X permet la connexion et la synchronisation avec des services externes comme Google Calendar, Microsoft 365, Slack, Zoom, et d'autres plateformes tierces.

**Base URL:** `/api/integrations`

## Fonctionnalités principales

- 🔗 Connexions OAuth sécurisées avec les services externes
- 📅 Synchronisation bidirectionnelle des calendriers
- 💬 Notifications et communications via Slack/Teams
- 🎥 Intégration avec les plateformes de visioconférence
- 📊 Analytics et métriques d'intégration
- 🔄 Synchronisation automatique et manuelle

## Gestion des intégrations

### GET /integrations
Récupère la liste des intégrations de l'organisation.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `provider` (string) - Filtrer par fournisseur: `google`, `microsoft`, `slack`, `zoom`
- `status` (string) - Filtrer par statut: `connected`, `disconnected`, `error`
- `type` (string) - Filtrer par type: `calendar`, `communication`, `video`, `storage`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "int-123",
      "provider": "google",
      "type": "calendar",
      "name": "Google Calendar",
      "status": "connected",
      "connectedAt": "2024-03-01T10:00:00Z",
      "lastSync": "2024-03-15T14:30:00Z",
      "settings": {
        "syncDirection": "bidirectional",
        "autoSync": true,
        "syncInterval": 300,
        "calendarId": "primary"
      },
      "permissions": [
        "read_calendar",
        "write_calendar",
        "manage_events"
      ],
      "statistics": {
        "eventsSynced": 156,
        "lastSyncDuration": "2.3s",
        "errorCount": 0,
        "successRate": 1.0
      },
      "connectedBy": {
        "id": "user-456",
        "name": "Marie Dubois",
        "email": "marie.dubois@techcorp.com"
      }
    },
    {
      "id": "int-456",
      "provider": "slack",
      "type": "communication",
      "name": "Slack Workspace",
      "status": "connected",
      "connectedAt": "2024-02-15T09:00:00Z",
      "lastActivity": "2024-03-15T16:45:00Z",
      "settings": {
        "webhookUrl": "https://hooks.slack.com/services/...",
        "defaultChannel": "#general",
        "notificationTypes": [
          "event_reminders",
          "attendance_alerts",
          "system_notifications"
        ]
      },
      "statistics": {
        "messagesSent": 234,
        "channelsConnected": 5,
        "activeUsers": 45
      }
    }
  ]
}
```

### POST /integrations/:provider/connect
Initie la connexion OAuth avec un fournisseur.

**Permissions requises :** Manager ou Admin

**Paramètres de chemin :**
- `provider` (string) - Fournisseur: `google`, `microsoft`, `slack`, `zoom`

**Requête :**
```json
{
  "scopes": [
    "calendar.read",
    "calendar.write",
    "events.manage"
  ],
  "settings": {
    "syncDirection": "bidirectional",
    "autoSync": true,
    "syncInterval": 300
  },
  "redirectUri": "https://app.attendance-x.com/integrations/callback"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/oauth/authorize?client_id=...",
    "state": "state-token-123",
    "expiresAt": "2024-03-15T15:30:00Z",
    "provider": "google",
    "scopes": [
      "calendar.read",
      "calendar.write",
      "events.manage"
    ]
  }
}
```

### POST /integrations/:provider/callback
Traite le callback OAuth après autorisation.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "code": "oauth_authorization_code",
  "state": "state-token-123"
}
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "integrationId": "int-789",
    "provider": "google",
    "status": "connected",
    "connectedAt": "2024-03-15T15:00:00Z",
    "permissions": [
      "read_calendar",
      "write_calendar",
      "manage_events"
    ],
    "userInfo": {
      "email": "marie.dubois@gmail.com",
      "name": "Marie Dubois",
      "avatar": "https://lh3.googleusercontent.com/..."
    },
    "initialSync": {
      "status": "scheduled",
      "estimatedDuration": "2-5 minutes"
    }
  }
}
```

### PUT /integrations/:id/settings
Met à jour les paramètres d'une intégration.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "syncDirection": "attendance_to_external",
  "autoSync": false,
  "syncInterval": 600,
  "settings": {
    "calendarId": "work@techcorp.com",
    "eventPrefix": "[Attendance-X]",
    "includeDescription": true,
    "syncPrivateEvents": false
  },
  "notifications": {
    "syncErrors": true,
    "syncSuccess": false,
    "weeklyReport": true
  }
}
```

### DELETE /integrations/:id
Déconnecte une intégration.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "integrationId": "int-123",
    "status": "disconnected",
    "disconnectedAt": "2024-03-15T16:00:00Z",
    "cleanupStatus": {
      "eventsRemoved": 45,
      "webhooksDisabled": 3,
      "tokensRevoked": true
    }
  }
}
```

## Synchronisation

### GET /integrations/:id/history
Récupère l'historique de synchronisation.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `limit` (number) - Nombre d'entrées (défaut: 50)
- `status` (string) - Filtrer par statut: `success`, `error`, `partial`
- `startDate` (string) - Date de début
- `endDate` (string) - Date de fin

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "sync-789",
      "startedAt": "2024-03-15T14:30:00Z",
      "completedAt": "2024-03-15T14:32:15Z",
      "status": "success",
      "type": "automatic",
      "direction": "bidirectional",
      "statistics": {
        "eventsProcessed": 23,
        "eventsCreated": 5,
        "eventsUpdated": 12,
        "eventsDeleted": 2,
        "errors": 0
      },
      "duration": "2m 15s",
      "triggeredBy": "scheduled_sync"
    },
    {
      "id": "sync-456",
      "startedAt": "2024-03-15T10:00:00Z",
      "completedAt": "2024-03-15T10:01:45Z",
      "status": "partial",
      "type": "manual",
      "statistics": {
        "eventsProcessed": 15,
        "eventsCreated": 3,
        "eventsUpdated": 8,
        "eventsDeleted": 0,
        "errors": 4
      },
      "errors": [
        {
          "eventId": "event-123",
          "error": "Calendar permission denied",
          "code": "PERMISSION_DENIED"
        }
      ],
      "duration": "1m 45s",
      "triggeredBy": {
        "userId": "user-456",
        "name": "Marie Dubois"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

### POST /integrations/:id/sync
Lance une synchronisation manuelle.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "direction": "bidirectional",
  "scope": "all",
  "options": {
    "forceUpdate": false,
    "dryRun": false,
    "dateRange": {
      "start": "2024-03-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    }
  }
}
```

**Réponse (202) :**
```json
{
  "success": true,
  "data": {
    "syncId": "sync-new-123",
    "status": "started",
    "startedAt": "2024-03-15T16:30:00Z",
    "estimatedDuration": "3-5 minutes",
    "statusUrl": "/api/integrations/int-123/sync/sync-new-123/status"
  }
}
```

### POST /integrations/:id/test
Teste la connexion d'une intégration.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "connectionStatus": "healthy",
    "responseTime": "245ms",
    "permissions": {
      "read_calendar": true,
      "write_calendar": true,
      "manage_events": true
    },
    "apiLimits": {
      "remaining": 9850,
      "resetAt": "2024-03-16T00:00:00Z",
      "dailyLimit": 10000
    },
    "lastError": null,
    "recommendations": [
      "Connection is healthy",
      "All required permissions are granted"
    ]
  }
}
```

## Intégrations spécifiques

### Google Calendar

#### Configuration avancée
```json
{
  "provider": "google",
  "settings": {
    "calendarId": "primary",
    "syncDirection": "bidirectional",
    "eventMapping": {
      "titlePrefix": "[Attendance-X] ",
      "includeAttendees": true,
      "includeDescription": true,
      "includeLocation": true,
      "colorId": "2"
    },
    "filters": {
      "eventTypes": ["training", "meeting", "conference"],
      "excludePrivate": true,
      "minDuration": 30
    },
    "notifications": {
      "reminders": true,
      "reminderMinutes": [15, 60]
    }
  }
}
```

### Microsoft 365

#### Configuration Teams
```json
{
  "provider": "microsoft",
  "settings": {
    "calendarId": "primary",
    "teamsIntegration": {
      "enabled": true,
      "autoCreateMeetings": true,
      "defaultMeetingSettings": {
        "allowAnonymous": false,
        "recordAutomatically": false,
        "allowTranscription": true
      }
    },
    "outlookSettings": {
      "categoryColor": "blue",
      "importance": "normal",
      "showAs": "busy"
    }
  }
}
```

### Slack

#### Configuration des notifications
```json
{
  "provider": "slack",
  "settings": {
    "webhookUrl": "https://hooks.slack.com/services/...",
    "channels": {
      "default": "#general",
      "alerts": "#attendance-alerts",
      "reports": "#reports"
    },
    "messageTemplates": {
      "eventReminder": "📅 Rappel: {eventName} commence dans {timeUntil}",
      "attendanceAlert": "⚠️ Faible taux de présence pour {eventName}: {attendanceRate}%",
      "weeklyReport": "📊 Rapport hebdomadaire de présence"
    },
    "userMentions": {
      "enabled": true,
      "mentionManagers": true,
      "mentionOrganizers": true
    }
  }
}
```

### Zoom

#### Configuration des réunions
```json
{
  "provider": "zoom",
  "settings": {
    "autoCreateMeetings": true,
    "meetingDefaults": {
      "type": "scheduled",
      "duration": 60,
      "timezone": "Europe/Paris",
      "password": true,
      "waitingRoom": true,
      "joinBeforeHost": false,
      "muteUponEntry": true,
      "recordingSettings": {
        "autoRecording": "cloud",
        "recordingAuthentication": true
      }
    },
    "attendanceTracking": {
      "enabled": true,
      "syncAttendance": true,
      "minimumDuration": 30
    }
  }
}
```

## Analytics des intégrations

### GET /integrations/analytics/metrics
Récupère les métriques d'utilisation des intégrations.

**Permissions requises :** Admin

**Paramètres de requête :**
- `period` (string) - Période: `day`, `week`, `month`, `quarter`
- `providers` (string) - Fournisseurs (séparés par virgule)

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalIntegrations": 8,
      "activeIntegrations": 6,
      "totalSyncs": 1234,
      "successRate": 0.96,
      "averageResponseTime": "1.2s"
    },
    "byProvider": {
      "google": {
        "integrations": 3,
        "syncs": 567,
        "successRate": 0.98,
        "averageResponseTime": "0.8s",
        "dataTransferred": "2.3MB"
      },
      "microsoft": {
        "integrations": 2,
        "syncs": 234,
        "successRate": 0.94,
        "averageResponseTime": "1.5s",
        "dataTransferred": "1.8MB"
      },
      "slack": {
        "integrations": 1,
        "syncs": 433,
        "successRate": 0.99,
        "averageResponseTime": "0.3s",
        "messagesSent": 1234
      }
    },
    "trends": {
      "syncVolume": [
        {
          "date": "2024-03-01",
          "syncs": 45,
          "errors": 2
        }
      ],
      "responseTime": [
        {
          "date": "2024-03-01",
          "averageTime": "1.1s"
        }
      ]
    },
    "errors": {
      "totalErrors": 48,
      "errorRate": 0.04,
      "commonErrors": [
        {
          "error": "RATE_LIMIT_EXCEEDED",
          "count": 15,
          "percentage": 0.31
        },
        {
          "error": "PERMISSION_DENIED",
          "count": 12,
          "percentage": 0.25
        }
      ]
    }
  }
}
```

## Webhooks et événements

### Configuration des webhooks
```json
{
  "webhooks": {
    "eventCreated": {
      "enabled": true,
      "url": "https://api.external-service.com/webhooks/event-created",
      "headers": {
        "Authorization": "Bearer token",
        "Content-Type": "application/json"
      },
      "retryPolicy": {
        "maxRetries": 3,
        "backoffMultiplier": 2
      }
    },
    "attendanceUpdated": {
      "enabled": true,
      "url": "https://api.external-service.com/webhooks/attendance",
      "filters": {
        "eventTypes": ["training", "conference"],
        "minAttendanceChange": 0.1
      }
    }
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `INTEGRATION_NOT_FOUND` | Intégration introuvable |
| `PROVIDER_NOT_SUPPORTED` | Fournisseur non supporté |
| `OAUTH_ERROR` | Erreur d'authentification OAuth |
| `PERMISSION_DENIED` | Permissions insuffisantes |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée |
| `SYNC_FAILED` | Échec de la synchronisation |
| `CONNECTION_ERROR` | Erreur de connexion |
| `INVALID_CREDENTIALS` | Identifiants invalides |
| `WEBHOOK_FAILED` | Échec du webhook |
| `API_QUOTA_EXCEEDED` | Quota API dépassé |

## Exemples d'utilisation

### Connecter Google Calendar
```javascript
// 1. Initier la connexion
const connection = await fetch('/api/integrations/google/connect', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scopes: ['calendar.read', 'calendar.write'],
    settings: {
      syncDirection: 'bidirectional',
      autoSync: true
    }
  })
});

const { data } = await connection.json();

// 2. Rediriger vers l'URL d'autorisation
window.location.href = data.authUrl;

// 3. Traiter le callback (côté serveur)
const callback = await fetch('/api/integrations/google/callback', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: authorizationCode,
    state: stateToken
  })
});
```

### Synchroniser manuellement
```javascript
const sync = await fetch(`/api/integrations/${integrationId}/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    direction: 'bidirectional',
    scope: 'all',
    options: {
      forceUpdate: true
    }
  })
});

const result = await sync.json();
console.log('Synchronisation démarrée:', result.data.syncId);

// Vérifier le statut
const checkStatus = async () => {
  const status = await fetch(result.data.statusUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statusData = await status.json();
  
  if (statusData.data.status === 'completed') {
    console.log('Synchronisation terminée');
  } else {
    setTimeout(checkStatus, 5000);
  }
};

checkStatus();
```

### Configurer les notifications Slack
```javascript
const slackConfig = await fetch(`/api/integrations/${slackIntegrationId}/settings`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    settings: {
      channels: {
        default: '#general',
        alerts: '#attendance-alerts'
      },
      messageTemplates: {
        eventReminder: '📅 Rappel: {eventName} commence dans {timeUntil}',
        attendanceAlert: '⚠️ Faible présence: {eventName} ({attendanceRate}%)'
      },
      notifications: {
        eventReminders: true,
        attendanceAlerts: true,
        weeklyReports: true
      }
    }
  })
});
```