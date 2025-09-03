# 👥 Users API

## Vue d'ensemble

L'API Users d'Attendance-X fournit une gestion complète des utilisateurs avec support pour les profils, les équipes, et les préférences avancées.

## Endpoints principaux

### GET /users
Récupère la liste des utilisateurs de l'organisation.

**Permissions requises :** Permission `view_all_users`

**Paramètres de requête :**
- `page` (number) - Numéro de page (défaut: 1)
- `limit` (number) - Éléments par page (défaut: 20, max: 100)
- `search` (string) - Recherche par nom, email, ou téléphone
- `role` (string) - Filtrer par rôle: `user`, `manager`, `admin`, `super_admin`
- `status` (string) - Filtrer par statut: `active`, `inactive`, `suspended`
- `teamId` (string) - Filtrer par équipe
- `department` (string) - Filtrer par département
- `sort` (string) - Tri: `name`, `email`, `createdAt`, `lastLogin`

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-123",
      "email": "jean.dupont@example.com",
      "firstName": "Jean",
      "lastName": "Dupont",
      "phone": "+33123456789",
      "role": "user",
      "status": "active",
      "avatar": "https://example.com/avatars/jean.jpg",
      "department": "Engineering",
      "jobTitle": "Développeur Senior",
      "organizationId": "org-123",
      "teams": [
        {
          "id": "team-456",
          "name": "Frontend Team",
          "role": "member"
        }
      ],
      "preferences": {
        "language": "fr",
        "timezone": "Europe/Paris",
        "notifications": {
          "email": true,
          "sms": false,
          "push": true
        }
      },
      "lastLogin": "2024-03-15T10:30:00Z",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-03-10T14:20:00Z"
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

### POST /users
Crée un nouveau utilisateur.

**Permissions requises :** Permission `manage_users`

**Requête :**
```json
{
  "email": "marie.martin@example.com",
  "firstName": "Marie",
  "lastName": "Martin",
  "phone": "+33987654321",
  "role": "user",
  "department": "Marketing",
  "jobTitle": "Chef de projet",
  "teamIds": ["team-456", "team-789"],
  "sendInvitation": true,
  "preferences": {
    "language": "fr",
    "timezone": "Europe/Paris"
  }
}
```

**Réponse (201) :**
```json
{
  "success": true,
  "data": {
    "id": "user-789",
    "email": "marie.martin@example.com",
    "firstName": "Marie",
    "lastName": "Martin",
    "status": "pending_verification",
    "invitationToken": "inv-abc123def456",
    "invitationExpiresAt": "2024-03-22T23:59:59Z"
  }
}
```

### GET /users/:id
Récupère les détails d'un utilisateur spécifique.

**Permissions requises :** Permission `view_all_users`

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "jean.dupont@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    "phone": "+33123456789",
    "avatar": "https://example.com/avatars/jean.jpg",
    "role": "user",
    "status": "active",
    "department": "Engineering",
    "jobTitle": "Développeur Senior",
    "bio": "Développeur passionné avec 8 ans d'expérience",
    "skills": ["JavaScript", "React", "Node.js", "TypeScript"],
    "organizationId": "org-123",
    "teams": [
      {
        "id": "team-456",
        "name": "Frontend Team",
        "role": "member",
        "joinedAt": "2024-01-20T10:00:00Z"
      }
    ],
    "preferences": {
      "language": "fr",
      "timezone": "Europe/Paris",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h",
      "notifications": {
        "email": true,
        "sms": false,
        "push": true,
        "eventReminders": true,
        "weeklyReports": false
      },
      "privacy": {
        "profileVisibility": "organization",
        "showEmail": false,
        "showPhone": true
      }
    },
    "statistics": {
      "eventsAttended": 45,
      "attendanceRate": 0.92,
      "averageRating": 4.6,
      "certificatesEarned": 12
    },
    "lastLogin": "2024-03-15T10:30:00Z",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-03-10T14:20:00Z"
  }
}
```

### PUT /users/:id
Met à jour un utilisateur.

**Permissions requises :** Permission `manage_users`

**Requête :**
```json
{
  "firstName": "Jean-Pierre",
  "phone": "+33123456790",
  "department": "Engineering",
  "jobTitle": "Lead Developer",
  "bio": "Lead développeur avec expertise en architecture",
  "skills": ["JavaScript", "React", "Node.js", "TypeScript", "AWS"]
}
```

### DELETE /users/:id
Supprime un utilisateur (soft delete).

**Permissions requises :** Permission `manage_users`

### POST /users/search
Recherche avancée d'utilisateurs.

**Permissions requises :** Permission `view_all_users`

**Requête :**
```json
{
  "query": "jean",
  "filters": {
    "departments": ["Engineering", "Marketing"],
    "roles": ["user", "manager"],
    "status": "active",
    "joinedAfter": "2024-01-01T00:00:00Z"
  },
  "sort": {
    "field": "lastName",
    "direction": "asc"
  },
  "page": 1,
  "limit": 20
}
```

### GET /users/stats
Récupère les statistiques des utilisateurs.

**Permissions requises :** Permission `view_reports`

### POST /users/:id/role
Met à jour le rôle d'un utilisateur.

**Permissions requises :** Rôle `ADMIN` ou `SUPER_ADMIN`

**Requête :**
```json
{
  "role": "manager",
  "reason": "Promotion to team lead"
}
```

### POST /users/:id/status
Met à jour le statut d'un utilisateur.

**Permissions requises :** Permission `manage_users`

**Requête :**
```json
{
  "status": "active",
  "reason": "Account reactivated"
}
```

## Profil utilisateur

### GET /users/me
Récupère le profil de l'utilisateur connecté.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "jean.dupont@example.com",
    "firstName": "Jean",
    "lastName": "Dupont",
    // ... profil complet avec toutes les données
    "organizations": [
      {
        "id": "org-123",
        "name": "TechCorp",
        "role": "user",
        "status": "active",
        "joinedAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

### PUT /users/me
Met à jour le profil de l'utilisateur connecté.

**Requête :**
```json
{
  "firstName": "Jean-Pierre",
  "phone": "+33123456790",
  "bio": "Développeur passionné",
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "preferences": {
    "language": "en",
    "timezone": "Europe/London",
    "notifications": {
      "email": false,
      "push": true
    }
  }
}
```

### POST /users/me/avatar
Upload d'avatar pour l'utilisateur connecté.

**Requête (multipart/form-data) :**
```
avatar: [fichier image]
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://storage.example.com/avatars/user-123.jpg",
    "thumbnailUrl": "https://storage.example.com/avatars/user-123-thumb.jpg"
  }
}
```

## Gestion des équipes

### GET /users/:id/teams
Récupère les équipes d'un utilisateur.

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-456",
      "name": "Frontend Team",
      "description": "Équipe de développement frontend",
      "role": "member",
      "joinedAt": "2024-01-20T10:00:00Z",
      "permissions": ["read", "write"],
      "isActive": true
    }
  ]
}
```

### POST /users/:id/teams
Ajoute un utilisateur à une équipe.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "teamId": "team-789",
  "role": "member",
  "permissions": ["read", "write"]
}
```

### DELETE /users/:id/teams/:teamId
Retire un utilisateur d'une équipe.

## Import et export

### POST /users/import
Import en masse d'utilisateurs via CSV.

**Permissions requises :** Manager ou Admin

**Requête (multipart/form-data) :**
```
file: users.csv
options: {
  "sendInvitations": true,
  "defaultRole": "user",
  "skipDuplicates": true
}
```

**Format CSV :**
```csv
firstName,lastName,email,phone,department,jobTitle,teamName,role
Jean,Dupont,jean.dupont@example.com,+33123456789,Engineering,Developer,Frontend Team,user
Marie,Martin,marie.martin@example.com,+33987654321,Marketing,Manager,Marketing Team,manager
```

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "skipped": 3,
    "errors": 2,
    "details": [
      {
        "row": 1,
        "status": "success",
        "userId": "user-new-123"
      },
      {
        "row": 3,
        "status": "error",
        "message": "Email déjà existant"
      }
    ]
  }
}
```

### GET /users/export
Exporte la liste des utilisateurs.

**Permissions requises :** Manager ou Admin

**Paramètres de requête :**
- `format` - Format: `csv`, `excel`, `json`
- `fields` - Champs à inclure (séparés par virgule)
- `filters` - Filtres à appliquer (JSON encodé)

## Préférences et paramètres

### GET /users/:id/preferences
Récupère les préférences d'un utilisateur.

### PUT /users/:id/preferences
Met à jour les préférences d'un utilisateur.

**Requête :**
```json
{
  "language": "en",
  "timezone": "America/New_York",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "eventReminders": true,
    "weeklyReports": true,
    "marketingEmails": false
  },
  "privacy": {
    "profileVisibility": "team",
    "showEmail": false,
    "showPhone": true,
    "allowDirectMessages": true
  },
  "dashboard": {
    "defaultView": "calendar",
    "showUpcomingEvents": true,
    "showStatistics": true,
    "compactMode": false
  }
}
```

## Invitations

### POST /users/invite
Invite un nouvel utilisateur.

**Permissions requises :** Manager ou Admin

**Requête :**
```json
{
  "email": "nouveau@example.com",
  "firstName": "Nouveau",
  "lastName": "Utilisateur",
  "role": "user",
  "teamIds": ["team-456"],
  "message": "Bienvenue dans notre équipe !",
  "expiresIn": 168
}
```

### GET /users/invitations
Récupère les invitations en attente.

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv-123",
      "email": "nouveau@example.com",
      "firstName": "Nouveau",
      "lastName": "Utilisateur",
      "role": "user",
      "status": "pending",
      "invitedBy": "user-456",
      "invitedAt": "2024-03-10T14:00:00Z",
      "expiresAt": "2024-03-17T14:00:00Z",
      "acceptedAt": null
    }
  ]
}
```

### POST /users/invitations/:id/resend
Renvoie une invitation.

### DELETE /users/invitations/:id
Annule une invitation.

## Gestion des organisations utilisateur

### GET /users/:id/organizations
Récupère les organisations d'un utilisateur.

**Permissions requises :** Utilisateur lui-même ou permissions appropriées

**Réponse (200) :**
```json
{
  "success": true,
  "data": [
    {
      "id": "org-123",
      "name": "TechCorp Solutions",
      "role": "manager",
      "status": "active",
      "joinedAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

### GET /users/:id/organizations/:organizationId
Récupère les détails de l'appartenance à une organisation.

**Permissions requises :** Utilisateur lui-même ou permissions appropriées

### POST /users/:id/complete-setup
Complète la configuration initiale d'un utilisateur.

**Permissions requises :** Utilisateur lui-même

**Requête :**
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+33123456789",
  "preferences": {
    "language": "fr",
    "timezone": "Europe/Paris"
  }
}
```

## Invitations

### POST /users/invitations/accept
Accepte une invitation utilisateur.

**Permissions requises :** Utilisateur authentifié

**Requête :**
```json
{
  "invitationToken": "inv-token-123",
  "password": "SecurePassword123!",
  "firstName": "Jean",
  "lastName": "Dupont"
}
```

## Statistiques et analytics

### GET /users/:id/statistics
Récupère les statistiques d'un utilisateur.

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "overview": {
      "eventsAttended": 45,
      "totalEvents": 52,
      "attendanceRate": 0.865,
      "averageRating": 4.6,
      "certificatesEarned": 12
    },
    "attendance": {
      "thisMonth": 8,
      "lastMonth": 12,
      "trend": "decreasing",
      "streak": 5,
      "longestStreak": 23
    },
    "engagement": {
      "feedbackGiven": 38,
      "averageFeedbackRating": 4.2,
      "questionsAsked": 15,
      "helpfulVotes": 67
    },
    "timeline": [
      {
        "date": "2024-03-01",
        "eventsAttended": 2,
        "hoursSpent": 8
      }
    ]
  }
}
```

### GET /users/analytics/summary
Récupère un résumé analytics des utilisateurs.

**Permissions requises :** Manager ou Admin

**Réponse (200) :**
```json
{
  "success": true,
  "data": {
    "totalUsers": 156,
    "activeUsers": 142,
    "newUsersThisMonth": 12,
    "averageAttendanceRate": 0.78,
    "topPerformers": [
      {
        "userId": "user-123",
        "name": "Jean Dupont",
        "attendanceRate": 0.96,
        "eventsAttended": 45
      }
    ],
    "departmentBreakdown": {
      "Engineering": 45,
      "Marketing": 23,
      "Sales": 18,
      "HR": 8
    },
    "roleDistribution": {
      "user": 134,
      "manager": 18,
      "admin": 4
    }
  }
}
```

## Recherche avancée

### POST /users/search
Recherche avancée d'utilisateurs.

**Requête :**
```json
{
  "query": "jean",
  "filters": {
    "departments": ["Engineering", "Marketing"],
    "roles": ["user", "manager"],
    "skills": ["JavaScript", "React"],
    "teams": ["team-456"],
    "status": "active",
    "joinedAfter": "2024-01-01T00:00:00Z"
  },
  "sort": {
    "field": "attendanceRate",
    "direction": "desc"
  },
  "page": 1,
  "limit": 20
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| `USER_NOT_FOUND` | Utilisateur introuvable |
| `EMAIL_ALREADY_EXISTS` | Email déjà utilisé |
| `INVALID_ROLE` | Rôle invalide |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |
| `USER_INACTIVE` | Utilisateur inactif |
| `INVITATION_EXPIRED` | Invitation expirée |
| `INVITATION_ALREADY_ACCEPTED` | Invitation déjà acceptée |
| `TEAM_NOT_FOUND` | Équipe introuvable |
| `ALREADY_TEAM_MEMBER` | Déjà membre de l'équipe |
| `AVATAR_TOO_LARGE` | Avatar trop volumineux |
| `INVALID_FILE_FORMAT` | Format de fichier invalide |

## Exemples d'utilisation

### Créer un utilisateur avec équipes
```javascript
const user = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'nouveau@example.com',
    firstName: 'Nouveau',
    lastName: 'Utilisateur',
    role: 'user',
    department: 'Engineering',
    teamIds: ['team-456', 'team-789'],
    sendInvitation: true
  })
});

const result = await user.json();
console.log('Utilisateur créé:', result.data.id);
```

### Mettre à jour les préférences
```javascript
const preferences = await fetch('/api/users/me/preferences', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    language: 'en',
    notifications: {
      email: false,
      push: true
    }
  })
});

if (preferences.ok) {
  console.log('Préférences mises à jour');
}
```

### Import CSV d'utilisateurs
```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('options', JSON.stringify({
  sendInvitations: true,
  defaultRole: 'user'
}));

const importResult = await fetch('/api/users/import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await importResult.json();
console.log(`${result.data.imported} utilisateurs importés`);
```