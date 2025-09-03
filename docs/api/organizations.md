# 🏢 Organizations API

## Vue d'ensemble

L'API Organizations d'Attendance-X permet la gestion complète des organisations avec support pour les équipes, les paramètres, et l'analytics organisationnel.

**Base URL:** `/api/organizations`

## Fonctionnalités principales

- 🏢 Gestion complète des organisations
- 👥 Gestion des membres et des rôles
- ⚙️ Configuration des paramètres organisationnels
- 📊 Analytics et rapports organisationnels
- 🎨 Personnalisation et branding
- 🔐 Gestion des permissions et de la sécurité

## Endpoints principaux

### GET /organizations/my-organization
Récupère l'organisation de l'utilisateur connecté.

**Permissions requises :** Utilisateur authentifié

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20, max: 100)
- `search` (string) - Recherche par nom d'organisation
- `status` (string) - Filtrer par statut: `active`, `inactive`, `suspended`
- `sort` (string) - Tri: `name`, `createdAt`, `memberCount`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-123",
      "name": "TechCorp Solutions",
      "description": "Entreprise de développement logiciel",
      "industry": "technology",
      "size": "medium",
      "status": "active",
      "logo": "https://storage.example.com/logos/org-123.png",
      "website": "https://techcorp.example.com",
      "address": {
        "street": "123 Rue de la Tech",
        "city": "Paris",
        "country": "France",
        "postalCode": "75001"
      },
      "settings": {
        "timezone": "Europe/Paris",
        "language": "fr",
        "currency": "EUR",
        "dateFormat": "DD/MM/YYYY"
      },
      "memberCount": 156,
      "teamCount": 12,
      "eventCount": 45,
      "role": "admin",
      "joinedAt": "2024-01-15T09:00:00Z",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### POST /organizations
Crée une nouvelle organisation.

**Permissions requises :** Utilisateur sans organisation (middleware `requireNoOrganization`)

**Requête :**
```json
{
  "name": "Nouvelle Entreprise",
  "description": "Description de l'entreprise",
  "industry": "technology",
  "size": "small",
  "website": "https://nouvelle-entreprise.com",
  "address": {
    "street": "456 Avenue Innovation",
    "city": "Lyon",
    "country": "France",
    "postalCode": "69000"
  },
  "settings": {
    "timezone": "Europe/Paris",
    "language": "fr",
    "currency": "EUR"
  }
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "org-456",
    "name": "Nouvelle Entreprise",
    "status": "active",
    "role": "admin",
    "setupRequired": true,
    "setupSteps": [
      "complete_profile",
      "invite_members",
      "create_teams",
      "configure_settings"
    ]
  }
}
```

### GET /organizations/:id
Récupère les détails d'une organisation spécifique.

**Permissions requises :** Membre de l'organisation

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "org-123",
    "name": "TechCorp Solutions",
    "description": "Entreprise de développement logiciel",
    "industry": "technology",
    "size": "medium",
    "status": "active",
    "logo": "https://storage.example.com/logos/org-123.png",
    "website": "https://techcorp.example.com",
    "address": {
      "street": "123 Rue de la Tech",
      "city": "Paris",
      "country": "France",
      "postalCode": "75001"
    },
    "settings": {
      "timezone": "Europe/Paris",
      "language": "fr",
      "currency": "EUR",
      "dateFormat": "DD/MM/YYYY",
      "workingHours": {
        "start": "09:00",
        "end": "18:00",
        "workingDays": [1, 2, 3, 4, 5]
      },
      "features": {
        "attendance": true,
        "certificates": true,
        "analytics": true,
        "integrations": true
      }
    },
    "branding": {
      "primaryColor": "#007bff",
      "secondaryColor": "#6c757d",
      "logo": "https://storage.example.com/logos/org-123.png",
      "favicon": "https://storage.example.com/favicons/org-123.ico"
    },
    "statistics": {
      "memberCount": 156,
      "teamCount": 12,
      "eventCount": 45,
      "totalAttendance": 1234,
      "averageAttendanceRate": 0.87
    },
    "subscription": {
      "plan": "professional",
      "status": "active",
      "expiresAt": "2024-12-31T23:59:59Z",
      "features": ["unlimited_events", "advanced_analytics", "integrations"]
    },
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-03-10T14:30:00Z"
  }
}
```

### PUT /organizations/:id
Met à jour une organisation.

**Permissions requises :** Admin de l'organisation

## Configuration et templates

### GET /organizations/sector-templates
Récupère la liste des templates de secteur disponibles.

**Permissions requises :** Utilisateur authentifié

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "sector": "technology",
      "name": "Technologie",
      "description": "Entreprises technologiques et startups",
      "defaultTeams": ["Frontend", "Backend", "DevOps", "QA"],
      "defaultRoles": ["Developer", "Team Lead", "Product Manager"]
    },
    {
      "sector": "healthcare",
      "name": "Santé",
      "description": "Établissements de santé et cliniques",
      "defaultTeams": ["Medical", "Nursing", "Administration"],
      "defaultRoles": ["Doctor", "Nurse", "Administrator"]
    }
  ]
}
```

### GET /organizations/templates
Alias pour `/organizations/sector-templates`.

### GET /organizations/templates/:sector
Récupère un template spécifique par secteur.

**Paramètres de chemin :**
- `sector` (string) - Secteur: `technology`, `healthcare`, `education`, etc.

### POST /organizations/:id/complete-setup
Complète la configuration initiale d'une organisation.

**Permissions requises :** Admin de l'organisation

**Requête :**
```json
{
  "sector": "technology",
  "setupOptions": {
    "createDefaultTeams": true,
    "inviteInitialMembers": true,
    "configureBasicSettings": true
  },
  "initialMembers": [
    {
      "email": "manager@example.com",
      "role": "manager",
      "firstName": "Marie",
      "lastName": "Dubois"
    }
  ]
}
```

**Requête :**
```json
{
  "name": "TechCorp Solutions Updated",
  "description": "Nouvelle description",
  "website": "https://new-website.com",
  "settings": {
    "timezone": "Europe/London",
    "workingHours": {
      "start": "08:30",
      "end": "17:30"
    }
  }
}
```

## Gestion des membres

### GET /organizations/:id/members
Récupère la liste des membres d'une organisation.

**Permissions requises :** Membre de l'organisation

**Paramètres de requête :**
- `page` (number) - Numéro de page
- `limit` (number) - Éléments par page
- `search` (string) - Recherche par nom ou email
- `role` (string) - Filtrer par rôle: `member`, `manager`, `admin`
- `status` (string) - Filtrer par statut: `active`, `inactive`, `pending`
- `teamId` (string) - Filtrer par équipe

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "member-123",
      "userId": "user-456",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@techcorp.com",
      "avatar": "https://storage.example.com/avatars/user-456.jpg",
      "role": "manager",
      "status": "active",
      "department": "Engineering",
      "jobTitle": "Lead Developer",
      "teams": [
        {
          "id": "team-789",
          "name": "Frontend Team",
          "role": "lead"
        }
      ],
      "permissions": [
        "manage_events",
        "view_reports",
        "manage_team_members"
      ],
      "joinedAt": "2024-01-20T10:00:00Z",
      "lastActivity": "2024-03-15T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### POST /organizations/:id/members/invite
Invite un nouveau membre à rejoindre l'organisation.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "email": "nouveau@example.com",
  "firstName": "Nouveau",
  "lastName": "Membre",
  "role": "member",
  "department": "Marketing",
  "jobTitle": "Marketing Specialist",
  "teamIds": ["team-456", "team-789"],
  "permissions": ["view_events", "manage_own_attendance"],
  "message": "Bienvenue dans notre équipe !",
  "expiresIn": 168
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "invitationId": "inv-123",
    "email": "nouveau@example.com",
    "status": "pending",
    "expiresAt": "2024-03-22T14:00:00Z",
    "inviteLink": "https://app.attendance-x.com/invite/inv-123"
  }
}
```

### PUT /organizations/:id/members/:memberId/role
Met à jour le rôle d'un membre.

**Permissions requises :** Admin

**Requête :**
```json
{
  "role": "manager",
  "permissions": [
    "manage_events",
    "view_reports",
    "manage_team_members"
  ]
}
```

### DELETE /organizations/:id/members/:memberId
Retire un membre de l'organisation.

**Permissions requises :** Admin

## Paramètres et configuration

### GET /organizations/:id/settings
Récupère les paramètres de l'organisation.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "general": {
      "timezone": "Europe/Paris",
      "language": "fr",
      "currency": "EUR",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h"
    },
    "workingHours": {
      "start": "09:00",
      "end": "18:00",
      "workingDays": [1, 2, 3, 4, 5],
      "holidays": [
        {
          "date": "2024-12-25",
          "name": "Noël"
        }
      ]
    },
    "attendance": {
      "requireCheckIn": true,
      "requireCheckOut": true,
      "allowLateCheckIn": true,
      "lateGracePeriod": 15,
      "geofenceEnabled": true,
      "geofenceRadius": 100,
      "qrCodeEnabled": true
    },
    "notifications": {
      "emailEnabled": true,
      "smsEnabled": false,
      "pushEnabled": true,
      "reminderSettings": {
        "eventReminders": true,
        "reminderTime": 60
      }
    },
    "security": {
      "require2FA": false,
      "sessionTimeout": 480,
      "passwordPolicy": {
        "minLength": 8,
        "requireUppercase": true,
        "requireNumbers": true,
        "requireSymbols": true
      }
    },
    "integrations": {
      "googleCalendar": {
        "enabled": false,
        "syncEvents": false
      },
      "slack": {
        "enabled": true,
        "webhook": "https://hooks.slack.com/..."
      }
    }
  }
}
```

### PUT /organizations/:id/settings
Met à jour les paramètres de l'organisation.

**Permissions requises :** Admin

**Requête :**
```json
{
  "general": {
    "timezone": "Europe/London",
    "language": "en"
  },
  "attendance": {
    "lateGracePeriod": 30,
    "geofenceRadius": 150
  }
}
```

## Analytics et rapports

### GET /organizations/:id/analytics/dashboard
Récupère les données du tableau de bord analytique.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `period` (string) - Période: `week`, `month`, `quarter`, `year`
- `startDate` (string) - Date de début (ISO 8601)
- `endDate` (string) - Date de fin (ISO 8601)

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMembers": 156,
      "activeMembers": 142,
      "totalEvents": 45,
      "totalAttendance": 1234,
      "averageAttendanceRate": 0.87
    },
    "trends": {
      "memberGrowth": {
        "current": 156,
        "previous": 148,
        "change": 0.054
      },
      "attendanceRate": {
        "current": 0.87,
        "previous": 0.82,
        "change": 0.061
      }
    },
    "charts": {
      "attendanceByMonth": [
        {
          "month": "2024-01",
          "attendance": 234,
          "rate": 0.85
        }
      ],
      "membersByDepartment": {
        "Engineering": 45,
        "Marketing": 23,
        "Sales": 18
      },
      "eventsByType": {
        "training": 25,
        "meeting": 15,
        "conference": 5
      }
    },
    "topPerformers": [
      {
        "userId": "user-123",
        "name": "Jean Dupont",
        "attendanceRate": 0.96,
        "eventsAttended": 42
      }
    ]
  }
}
```

### GET /organizations/:id/analytics/reports
Génère des rapports analytiques personnalisés.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `type` (string) - Type de rapport: `attendance`, `members`, `events`, `performance`
- `format` (string) - Format: `json`, `csv`, `pdf`, `excel`
- `period` (string) - Période d'analyse
- `filters` (string) - Filtres JSON encodés

## Branding et personnalisation

### GET /organizations/:id/branding
Récupère les paramètres de branding.

**Permissions requises :** Manager ou Admin

### PUT /organizations/:id/branding
Met à jour les paramètres de branding.

**Permissions requises :** Admin

**Requête :**
```json
{
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d",
  "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "favicon": "data:image/x-icon;base64,AAABAAEAEBAAAAEAIAAoBAA...",
  "customCSS": ".header { background-color: #007bff; }"
}
```

### POST /organizations/:id/logo
Upload du logo de l'organisation.

**Permissions requises :** Admin

**Requête (multipart/form-data) :**
```
logo: [fichier image]
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `ORGANIZATION_NOT_FOUND` | Organisation introuvable |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |
| `MEMBER_NOT_FOUND` | Membre introuvable |
| `INVITATION_EXPIRED` | Invitation expirée |
| `ALREADY_MEMBER` | Déjà membre de l'organisation |
| `ORGANIZATION_LIMIT_REACHED` | Limite d'organisations atteinte |
| `INVALID_SETTINGS` | Paramètres invalides |
| `BRANDING_UPLOAD_FAILED` | Échec de l'upload du branding |

## Exemples d'utilisation

### Créer une organisation complète
```javascript
const organization = await fetch('/api/organizations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Ma Nouvelle Entreprise',
    industry: 'technology',
    size: 'medium',
    settings: {
      timezone: 'Europe/Paris',
      language: 'fr'
    }
  })
});

const result = await organization.json();
console.log('Organisation créée:', result.data.id);
```

### Inviter des membres en masse
```javascript
const invitations = [
  {
    email: 'user1@example.com',
    firstName: 'User',
    lastName: 'One',
    role: 'member'
  },
  {
    email: 'user2@example.com',
    firstName: 'User',
    lastName: 'Two',
    role: 'manager'
  }
];

for (const invitation of invitations) {
  await fetch(`/api/organizations/${orgId}/members/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(invitation)
  });
}
```

### Récupérer les analytics
```javascript
const analytics = await fetch(`/api/organizations/${orgId}/analytics/dashboard?period=month`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await analytics.json();
console.log('Taux de présence:', data.data.overview.averageAttendanceRate);
```