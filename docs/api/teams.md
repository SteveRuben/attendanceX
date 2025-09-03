# 👥 Teams API

## Vue d'ensemble

L'API Teams d'Attendance-X permet la gestion complète des équipes au sein des organisations avec support pour les templates sectoriels, la gestion des membres, et les statistiques d'équipe.

**Base URL:** `/api` (les routes teams sont intégrées directement)

## Fonctionnalités principales

- 👥 Gestion complète des équipes organisationnelles
- 🏗️ Templates d'équipes par secteur d'activité
- 👤 Gestion des membres et des rôles dans les équipes
- 📊 Statistiques et analytics d'équipe
- 🔄 Affectations en masse et opérations bulk
- 🎯 Création automatique d'équipes par défaut

## Templates d'équipes

### GET /team-templates/status
Vérifie le statut du service de templates d'équipes.

**Permissions requises :** Aucune (endpoint public)

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "version": "1.0.0",
    "availableSectors": [
      "technology",
      "healthcare",
      "education",
      "finance",
      "retail",
      "manufacturing"
    ]
  }
}
```

### GET /team-templates/:sector
Récupère les templates d'équipes pour un secteur spécifique.

**Paramètres de chemin :**
- `sector` (string) - Secteur: `technology`, `healthcare`, `education`, `finance`, `retail`, `manufacturing`

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "sector": "technology",
    "templates": [
      {
        "id": "tech-frontend",
        "name": "Équipe Frontend",
        "description": "Équipe de développement frontend et UI/UX",
        "suggestedRoles": [
          {
            "title": "Frontend Developer",
            "permissions": ["view_events", "manage_own_attendance"]
          },
          {
            "title": "UI/UX Designer",
            "permissions": ["view_events", "manage_own_attendance"]
          },
          {
            "title": "Team Lead",
            "permissions": ["manage_team_events", "view_team_reports"]
          }
        ],
        "defaultPermissions": ["view_events", "manage_own_attendance"],
        "color": "#007bff",
        "icon": "code"
      },
      {
        "id": "tech-backend",
        "name": "Équipe Backend",
        "description": "Équipe de développement backend et infrastructure",
        "suggestedRoles": [
          {
            "title": "Backend Developer",
            "permissions": ["view_events", "manage_own_attendance"]
          },
          {
            "title": "DevOps Engineer",
            "permissions": ["view_events", "manage_own_attendance", "manage_integrations"]
          }
        ],
        "defaultPermissions": ["view_events", "manage_own_attendance"],
        "color": "#28a745",
        "icon": "server"
      }
    ]
  }
}
```

## Gestion des équipes

### POST /organizations/:organizationId/teams
Crée une nouvelle équipe dans l'organisation.

**Permissions requises :** Manager ou Admin

**Paramètres de chemin :**
- `organizationId` (string) - ID de l'organisation

**Requête :**
```json
{
  "name": "Équipe Marketing Digital",
  "description": "Équipe responsable du marketing digital et des réseaux sociaux",
  "color": "#e83e8c",
  "icon": "bullhorn",
  "department": "Marketing",
  "leaderId": "user-123",
  "permissions": [
    "view_events",
    "manage_own_attendance",
    "create_team_events"
  ],
  "settings": {
    "allowSelfJoin": false,
    "requireApproval": true,
    "maxMembers": 15
  }
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "team-456",
    "name": "Équipe Marketing Digital",
    "description": "Équipe responsable du marketing digital et des réseaux sociaux",
    "color": "#e83e8c",
    "icon": "bullhorn",
    "department": "Marketing",
    "leaderId": "user-123",
    "memberCount": 1,
    "organizationId": "org-123",
    "createdAt": "2024-03-15T10:00:00Z",
    "updatedAt": "2024-03-15T10:00:00Z"
  }
}
```

### GET /organizations/:organizationId/teams
Récupère toutes les équipes d'une organisation.

**Permissions requises :** Membre de l'organisation

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20, max: 100)
- `search` (string) - Recherche par nom d'équipe
- `department` (string) - Filtrer par département
- `leaderId` (string) - Filtrer par leader d'équipe
- `sort` (string) - Tri: `name`, `memberCount`, `createdAt`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-456",
      "name": "Équipe Marketing Digital",
      "description": "Équipe responsable du marketing digital",
      "color": "#e83e8c",
      "icon": "bullhorn",
      "department": "Marketing",
      "leader": {
        "id": "user-123",
        "firstName": "Marie",
        "lastName": "Dubois",
        "avatar": "https://storage.example.com/avatars/user-123.jpg"
      },
      "memberCount": 8,
      "activeMembers": 7,
      "permissions": [
        "view_events",
        "manage_own_attendance",
        "create_team_events"
      ],
      "statistics": {
        "averageAttendanceRate": 0.92,
        "totalEvents": 15,
        "completedEvents": 12
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-03-10T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### GET /organizations/:organizationId/teams/:teamId
Récupère les détails d'une équipe spécifique.

**Permissions requises :** Membre de l'organisation

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "team-456",
    "name": "Équipe Marketing Digital",
    "description": "Équipe responsable du marketing digital et des réseaux sociaux",
    "color": "#e83e8c",
    "icon": "bullhorn",
    "department": "Marketing",
    "leader": {
      "id": "user-123",
      "firstName": "Marie",
      "lastName": "Dubois",
      "email": "marie.dubois@techcorp.com",
      "avatar": "https://storage.example.com/avatars/user-123.jpg",
      "joinedAt": "2024-01-15T10:00:00Z"
    },
    "members": [
      {
        "id": "member-789",
        "userId": "user-456",
        "firstName": "Jean",
        "lastName": "Martin",
        "email": "jean.martin@techcorp.com",
        "avatar": "https://storage.example.com/avatars/user-456.jpg",
        "role": "member",
        "permissions": ["view_events", "manage_own_attendance"],
        "joinedAt": "2024-01-20T14:00:00Z",
        "status": "active"
      }
    ],
    "permissions": [
      "view_events",
      "manage_own_attendance",
      "create_team_events"
    ],
    "settings": {
      "allowSelfJoin": false,
      "requireApproval": true,
      "maxMembers": 15
    },
    "statistics": {
      "memberCount": 8,
      "activeMembers": 7,
      "averageAttendanceRate": 0.92,
      "totalEvents": 15,
      "completedEvents": 12,
      "upcomingEvents": 3
    },
    "organizationId": "org-123",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-03-10T14:30:00Z"
  }
}
```

### PUT /organizations/:organizationId/teams/:teamId
Met à jour une équipe.

**Permissions requises :** Manager, Admin, ou Leader de l'équipe

**Requête :**
```json
{
  "name": "Équipe Marketing Digital & Social",
  "description": "Équipe élargie pour le marketing digital",
  "color": "#dc3545",
  "leaderId": "user-789",
  "settings": {
    "maxMembers": 20
  }
}
```

### DELETE /organizations/:organizationId/teams/:teamId
Supprime une équipe.

**Permissions requises :** Admin uniquement

## Gestion des membres d'équipe

### GET /organizations/:organizationId/teams/:teamId/members
Récupère les membres d'une équipe.

**Permissions requises :** Membre de l'organisation

**Paramètres de requête :**
- `page` (number) - Numéro de page
- `limit` (number) - Éléments par page
- `search` (string) - Recherche par nom ou email
- `role` (string) - Filtrer par rôle: `member`, `lead`, `admin`
- `status` (string) - Filtrer par statut: `active`, `inactive`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "member-789",
      "userId": "user-456",
      "firstName": "Jean",
      "lastName": "Martin",
      "email": "jean.martin@techcorp.com",
      "avatar": "https://storage.example.com/avatars/user-456.jpg",
      "role": "member",
      "permissions": ["view_events", "manage_own_attendance"],
      "department": "Marketing",
      "jobTitle": "Marketing Specialist",
      "joinedAt": "2024-01-20T14:00:00Z",
      "status": "active",
      "statistics": {
        "attendanceRate": 0.95,
        "eventsAttended": 12,
        "lastActivity": "2024-03-15T09:30:00Z"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

### POST /organizations/:organizationId/teams/:teamId/members
Ajoute un membre à une équipe.

**Permissions requises :** Manager, Admin, ou Leader de l'équipe

**Requête :**
```json
{
  "userId": "user-789",
  "role": "member",
  "permissions": [
    "view_events",
    "manage_own_attendance"
  ]
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "member-new-123",
    "userId": "user-789",
    "teamId": "team-456",
    "role": "member",
    "joinedAt": "2024-03-15T15:00:00Z",
    "status": "active"
  }
}
```

### PUT /organizations/:organizationId/teams/:teamId/members/:userId
Met à jour le rôle d'un membre dans l'équipe.

**Permissions requises :** Manager, Admin, ou Leader de l'équipe

**Requête :**
```json
{
  "role": "lead",
  "permissions": [
    "view_events",
    "manage_own_attendance",
    "manage_team_events",
    "view_team_reports"
  ]
}
```

### DELETE /organizations/:organizationId/teams/:teamId/members/:userId
Retire un membre d'une équipe.

**Permissions requises :** Manager, Admin, ou Leader de l'équipe

## Statistiques d'équipe

### GET /organizations/:organizationId/teams/:teamId/stats
Récupère les statistiques détaillées d'une équipe.

**Permissions requises :** Membre de l'équipe, Manager, ou Admin

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
      "memberCount": 8,
      "activeMembers": 7,
      "averageAttendanceRate": 0.92,
      "totalEvents": 15,
      "completedEvents": 12,
      "upcomingEvents": 3
    },
    "attendance": {
      "byMember": [
        {
          "userId": "user-456",
          "name": "Jean Martin",
          "attendanceRate": 0.95,
          "eventsAttended": 12,
          "eventsTotal": 13
        }
      ],
      "trends": [
        {
          "date": "2024-03-01",
          "attendanceRate": 0.88,
          "eventsCount": 2
        }
      ]
    },
    "performance": {
      "topPerformers": [
        {
          "userId": "user-456",
          "name": "Jean Martin",
          "score": 0.95
        }
      ],
      "averageRating": 4.3,
      "feedbackCount": 45
    },
    "engagement": {
      "activeParticipation": 0.87,
      "feedbackRate": 0.75,
      "collaborationScore": 4.2
    }
  }
}
```

## Opérations en masse

### GET /organizations/:organizationId/users/:userId/teams
Récupère toutes les équipes d'un utilisateur.

**Permissions requises :** Utilisateur lui-même, Manager, ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-456",
      "name": "Équipe Marketing Digital",
      "role": "member",
      "permissions": ["view_events", "manage_own_attendance"],
      "joinedAt": "2024-01-20T14:00:00Z",
      "status": "active"
    }
  ]
}
```

### POST /organizations/:organizationId/users/:userId/teams/bulk-assign
Affecte un utilisateur à plusieurs équipes.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "teamAssignments": [
    {
      "teamId": "team-456",
      "role": "member",
      "permissions": ["view_events", "manage_own_attendance"]
    },
    {
      "teamId": "team-789",
      "role": "lead",
      "permissions": ["view_events", "manage_own_attendance", "manage_team_events"]
    }
  ]
}
```

### POST /organizations/:organizationId/users/:userId/teams/bulk-remove
Retire un utilisateur de plusieurs équipes.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "teamIds": ["team-456", "team-789"]
}
```

### POST /organizations/:organizationId/teams/bulk-assign
Affectation en masse d'utilisateurs à des équipes.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "assignments": [
    {
      "userId": "user-123",
      "teamId": "team-456",
      "role": "member"
    },
    {
      "userId": "user-456",
      "teamId": "team-789",
      "role": "lead"
    }
  ]
}
```

## Création d'équipes par défaut

### POST /organizations/:organizationId/teams/create-defaults
Crée des équipes par défaut selon le secteur de l'organisation.

**Permissions requises :** Admin

**Requête :**
```json
{
  "sector": "technology",
  "includeTemplates": [
    "tech-frontend",
    "tech-backend",
    "tech-devops",
    "tech-qa"
  ],
  "customizations": {
    "tech-frontend": {
      "name": "Équipe Frontend React",
      "leaderId": "user-123"
    }
  }
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "createdTeams": [
      {
        "id": "team-new-123",
        "name": "Équipe Frontend React",
        "templateId": "tech-frontend",
        "memberCount": 1
      },
      {
        "id": "team-new-456",
        "name": "Équipe Backend",
        "templateId": "tech-backend",
        "memberCount": 1
      }
    ],
    "summary": {
      "totalCreated": 4,
      "totalMembers": 4,
      "errors": []
    }
  }
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `TEAM_NOT_FOUND` | Équipe introuvable |
| `MEMBER_NOT_FOUND` | Membre introuvable |
| `ALREADY_TEAM_MEMBER` | Déjà membre de l'équipe |
| `TEAM_FULL` | Équipe complète |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |
| `INVALID_SECTOR` | Secteur invalide |
| `TEMPLATE_NOT_FOUND` | Template introuvable |
| `LEADER_REQUIRED` | Leader requis pour cette opération |
| `CANNOT_REMOVE_LEADER` | Impossible de retirer le leader |

## Exemples d'utilisation

### Créer une équipe avec template
```javascript
// 1. Récupérer les templates pour le secteur
const templates = await fetch('/api/team-templates/technology');
const { data } = await templates.json();

// 2. Créer l'équipe basée sur un template
const team = await fetch(`/api/organizations/${orgId}/teams`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Équipe Frontend',
    description: data.templates[0].description,
    color: data.templates[0].color,
    permissions: data.templates[0].defaultPermissions
  })
});
```

### Ajouter plusieurs membres à une équipe
```javascript
const members = ['user-123', 'user-456', 'user-789'];

for (const userId of members) {
  await fetch(`/api/organizations/${orgId}/teams/${teamId}/members`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      role: 'member',
      permissions: ['view_events', 'manage_own_attendance']
    })
  });
}
```

### Créer des équipes par défaut
```javascript
const defaultTeams = await fetch(`/api/organizations/${orgId}/teams/create-defaults`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sector: 'technology',
    includeTemplates: ['tech-frontend', 'tech-backend', 'tech-devops']
  })
});

const result = await defaultTeams.json();
console.log(`${result.data.summary.totalCreated} équipes créées`);
```