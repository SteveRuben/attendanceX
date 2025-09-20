# Guide API Multi-Tenant AttendanceX v2.0

## 🚀 Introduction

Ce guide décrit le nouveau système multi-tenant unifié d'AttendanceX v2.0. Cette version élimine les doublons, unifie l'architecture et introduit un système de dépréciation pour une migration en douceur.

## ✨ Nouveautés v2.0

- ✅ **Architecture unifiée** : Plus de doublons entre `/organizations` et `/tenants`
- ✅ **Système de dépréciation** : Migration automatique avec warnings
- ✅ **Authentification JWT** avec contexte tenant intégré
- ✅ **Permissions granulaires** par tenant et rôle
- ✅ **Migration automatisée** des données existantes
- ✅ **Outils d'administration** pour la maintenance

## Changements Majeurs

### 1. Authentification et Contexte Tenant

#### Avant (Single-Tenant)
```http
POST /api/events
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "title": "Réunion équipe",
  "startDate": "2024-01-15T10:00:00Z"
}
```

#### Après (Multi-Tenant)
```http
POST /api/events
Authorization: Bearer jwt_token
X-Tenant-ID: tenant_123
Content-Type: application/json

{
  "title": "Réunion équipe",
  "startDate": "2024-01-15T10:00:00Z"
}
```

**Note importante** : Le header `X-Tenant-ID` est optionnel si le JWT contient déjà l'information du tenant.

### 2. Structure des Réponses

#### Nouvelle Structure Standard
```json
{
  "success": true,
  "data": {
    // Données de la réponse
  },
  "meta": {
    "tenantId": "tenant_123",
    "timestamp": "2024-01-15T10:00:00Z",
    "requestId": "req_456"
  }
}
```

#### Gestion des Erreurs
```json
{
  "success": false,
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "Access denied for tenant",
    "details": {
      "tenantId": "tenant_123",
      "userId": "user_456"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:00:00Z",
    "requestId": "req_789"
  }
}
```

## 🆕 Nouveaux Endpoints Multi-Tenant

### Authentification Simplifiée

#### Inscription sans organisation (Nouveau flux)
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "acceptTerms": true
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Compte créé avec succès. Vérifiez votre email.",
  "data": {
    "email": "john@example.com",
    "verificationSent": true,
    "expiresIn": "24h",
    "canResend": true,
    "actionRequired": true,
    "nextStep": "email_verification"
  }
}
```

### Gestion des Tenants

#### Créer un nouveau tenant (Post-inscription)
```http
POST /api/tenants/register
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "name": "Mon Organisation",
  "slug": "mon-organisation",
  "industry": "technology",
  "size": "10-50",
  "planId": "basic",
  "settings": {
    "timezone": "Europe/Paris",
    "locale": "fr-FR",
    "currency": "EUR"
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Tenant créé avec succès",
  "data": {
    "tenant": {
      "id": "tenant_abc123",
      "name": "Mon Organisation",
      "slug": "mon-organisation",
      "planId": "basic",
      "status": "trial",
      "settings": {
        "timezone": "Europe/Paris",
        "locale": "fr-FR",
        "currency": "EUR"
      },
      "createdAt": "2024-01-15T10:00:00Z"
    },
    "membership": {
      "id": "membership_xyz789",
      "role": "owner",
      "permissions": ["tenant:manage", "users:manage", "events:manage"],
      "joinedAt": "2024-01-15T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### Changer de contexte tenant
```http
POST /api/tenants/switch-context
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "tenantId": "tenant_def456"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Contexte tenant changé avec succès",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "tenantContext": {
      "tenant": {
        "id": "tenant_def456",
        "name": "Autre Organisation",
        "slug": "autre-organisation",
        "status": "active"
      },
      "membership": {
        "id": "membership_abc123",
        "role": "admin",
        "permissions": ["users:manage", "events:manage"],
        "isActive": true
      },
      "features": {
        "attendance": true,
        "events": true,
        "analytics": false
      }
    }
  }
}
```

#### Lister les tenants de l'utilisateur
```http
GET /api/tenants
Authorization: Bearer jwt_token
```

**Réponse :**
```json
{
  "success": true,
  "message": "Tenants récupérés avec succès",
  "data": [
    {
      "id": "tenant_abc123",
      "name": "Mon Organisation",
      "slug": "mon-organisation",
      "status": "active",
      "role": "owner",
      "permissions": ["tenant:manage", "users:manage"],
      "isActive": true,
      "joinedAt": "2024-01-15T10:00:00Z",
      "membership": {
        "id": "membership_xyz789",
        "role": "owner",
        "permissions": ["tenant:manage", "users:manage"],
        "joinedAt": "2024-01-15T10:00:00Z"
      }
    }
  ]
}
```

### Routes Dépréciées (avec Migration Automatique)

#### ⚠️ Créer une organisation (DÉPRÉCIÉ)
```http
POST /api/organizations
Authorization: Bearer jwt_token
Content-Type: application/json
```

**Réponse avec warning :**
```json
{
  "success": true,
  "data": { /* données de l'organisation */ },
  "_deprecated": {
    "warning": "Cette route est dépréciée. Utilisez POST /tenants/register pour créer un nouveau tenant.",
    "version": "2.0.0",
    "sunset": "2024-12-31",
    "replacement": "/api/tenants/register"
  }
}
```

**Headers de dépréciation :**
```http
HTTP/1.1 201 Created
Deprecation: true
Sunset: 2024-12-31T00:00:00Z
Link: </api/tenants/register>; rel="successor-version"
```

### Administration et Migration

#### Exécuter la migration complète (Admin uniquement)
```http
POST /api/admin/migration/run-full
Authorization: Bearer admin_jwt_token
```

**Réponse :**
```json
{
  "success": true,
  "message": "Migration complète terminée",
  "data": {
    "organizationsMigrated": 15,
    "duplicatesCleaned": 8,
    "errors": [],
    "integrity": {
      "valid": true,
      "issues": [],
      "stats": {
        "totalTenants": 15,
        "totalMemberships": 45,
        "orphanedMemberships": 0,
        "inactiveTenants": 2
      }
    }
  }
}
```

#### Valider l'intégrité du système
```http
GET /api/admin/migration/validate-integrity
Authorization: Bearer admin_jwt_token
```

### Gestion des Tenants

#### Obtenir les informations du tenant
```http
GET /api/tenant/info
Authorization: Bearer jwt_token
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "tenant_123",
    "name": "Mon Organisation",
    "slug": "mon-organisation",
    "status": "active",
    "plan": {
      "id": "pro",
      "name": "Professional",
      "limits": {
        "maxUsers": 100,
        "maxEvents": 500,
        "maxStorage": 5000
      }
    },
    "usage": {
      "users": 45,
      "events": 120,
      "storage": 2500
    }
  }
}
```

#### Mettre à jour les paramètres du tenant
```http
PATCH /api/tenant/settings
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "timezone": "Europe/Paris",
  "language": "fr",
  "notifications": {
    "emailEnabled": true,
    "smsEnabled": false
  }
}
```

### Gestion des Utilisateurs Multi-Tenant

#### Inviter un utilisateur
```http
POST /api/tenant/users/invite
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "email": "nouvel.utilisateur@example.com",
  "role": "member",
  "permissions": ["view_events", "create_events"]
}
```

#### Lister les utilisateurs du tenant
```http
GET /api/tenant/users
Authorization: Bearer jwt_token
```

**Paramètres de requête :**
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 20, max: 100)
- `role` : Filtrer par rôle
- `status` : Filtrer par statut (active, invited, suspended)

### Facturation et Abonnements

#### Obtenir les informations de facturation
```http
GET /api/billing/dashboard
Authorization: Bearer jwt_token
```

#### Changer de plan d'abonnement
```http
POST /api/billing/change-plan
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "newPlanId": "enterprise",
  "billingCycle": "yearly",
  "effectiveDate": "2024-02-01T00:00:00Z"
}
```

#### Obtenir l'historique des factures
```http
GET /api/billing/invoices
Authorization: Bearer jwt_token
```

**Paramètres de requête :**
- `page` : Numéro de page
- `limit` : Nombre d'éléments par page
- `status` : Filtrer par statut (paid, open, draft)
- `from` : Date de début (ISO 8601)
- `to` : Date de fin (ISO 8601)

## Modifications des Endpoints Existants

### Événements

#### Créer un événement
```http
POST /api/events
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "title": "Réunion équipe",
  "description": "Réunion hebdomadaire de l'équipe",
  "startDate": "2024-01-15T10:00:00Z",
  "endDate": "2024-01-15T11:00:00Z",
  "location": "Salle de conférence A",
  "attendees": ["user_123", "user_456"]
}
```

**Changements :**
- Le `tenantId` est automatiquement ajouté côté serveur
- Validation des limites du plan (nombre d'événements max)
- Vérification des permissions utilisateur

#### Lister les événements
```http
GET /api/events
Authorization: Bearer jwt_token
```

**Nouveaux paramètres :**
- `includeArchived` : Inclure les événements archivés (défaut: false)
- `createdBy` : Filtrer par créateur (ID utilisateur)

### Utilisateurs

#### Obtenir le profil utilisateur
```http
GET /api/users/profile
Authorization: Bearer jwt_token
```

**Nouvelle réponse :**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "tenant": {
      "id": "tenant_123",
      "name": "Mon Organisation",
      "role": "admin",
      "permissions": ["manage_events", "manage_users"]
    }
  }
}
```

## Gestion des Erreurs

### Codes d'Erreur Spécifiques Multi-Tenant

| Code | Description | Action Recommandée |
|------|-------------|-------------------|
| `TENANT_NOT_FOUND` | Tenant inexistant | Vérifier l'ID du tenant |
| `TENANT_ACCESS_DENIED` | Accès refusé au tenant | Vérifier les permissions utilisateur |
| `TENANT_SUSPENDED` | Tenant suspendu | Contacter l'administrateur |
| `PLAN_LIMIT_EXCEEDED` | Limite du plan dépassée | Mettre à niveau le plan |
| `FEATURE_NOT_AVAILABLE` | Fonctionnalité non disponible | Vérifier le plan d'abonnement |

### Exemples de Gestion d'Erreurs

```javascript
// JavaScript/TypeScript
try {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    switch (result.error.code) {
      case 'PLAN_LIMIT_EXCEEDED':
        // Proposer une mise à niveau du plan
        showUpgradeModal();
        break;
      case 'TENANT_SUSPENDED':
        // Rediriger vers la page de facturation
        window.location.href = '/billing';
        break;
      default:
        // Afficher l'erreur générique
        showError(result.error.message);
    }
  }
} catch (error) {
  console.error('API Error:', error);
}
```

## Rate Limiting

### Limites par Plan

| Plan | Requêtes/minute | Requêtes/heure | Requêtes/jour |
|------|----------------|----------------|---------------|
| Free | 60 | 1,000 | 10,000 |
| Basic | 120 | 5,000 | 50,000 |
| Pro | 300 | 15,000 | 200,000 |
| Enterprise | 1,000 | 50,000 | 1,000,000 |

### Headers de Rate Limiting

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1642248000
X-RateLimit-Plan: pro
```

### Gestion du Rate Limiting

```javascript
const checkRateLimit = (response) => {
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));
  
  if (remaining < 10) {
    const resetTime = new Date(reset * 1000);
    console.warn(`Rate limit bientôt atteint. Reset à ${resetTime}`);
  }
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limit dépassé. Réessayer dans ${retryAfter} secondes`);
  }
};
```

## Webhooks

### Configuration des Webhooks

```http
POST /api/webhooks
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "url": "https://mon-app.com/webhooks/attendance",
  "events": ["event.created", "attendance.recorded"],
  "secret": "webhook_secret_key"
}
```

### Événements Disponibles

| Événement | Description | Payload |
|-----------|-------------|---------|
| `tenant.created` | Nouveau tenant créé | `{tenant, user}` |
| `tenant.suspended` | Tenant suspendu | `{tenant, reason}` |
| `user.invited` | Utilisateur invité | `{user, tenant, invitedBy}` |
| `event.created` | Événement créé | `{event, tenant}` |
| `attendance.recorded` | Présence enregistrée | `{attendance, event, user}` |
| `invoice.paid` | Facture payée | `{invoice, tenant}` |
| `plan.changed` | Plan d'abonnement modifié | `{oldPlan, newPlan, tenant}` |

### Validation des Webhooks

```javascript
const crypto = require('crypto');

const validateWebhook = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};
```

## SDK et Bibliothèques

### JavaScript/TypeScript SDK

```bash
npm install @attendance-x/sdk
```

```javascript
import { AttendanceXClient } from '@attendance-x/sdk';

const client = new AttendanceXClient({
  apiKey: 'your_api_key',
  tenantId: 'your_tenant_id',
  baseURL: 'https://api.attendance-x.com'
});

// Utilisation
const events = await client.events.list();
const newEvent = await client.events.create({
  title: 'Nouvelle réunion',
  startDate: new Date()
});
```

### Python SDK

```bash
pip install attendance-x-sdk
```

```python
from attendance_x import AttendanceXClient

client = AttendanceXClient(
    api_key='your_api_key',
    tenant_id='your_tenant_id',
    base_url='https://api.attendance-x.com'
)

# Utilisation
events = client.events.list()
new_event = client.events.create({
    'title': 'Nouvelle réunion',
    'start_date': '2024-01-15T10:00:00Z'
})
```

## Migration depuis l'API Single-Tenant

### Étapes de Migration

1. **Mise à jour de l'authentification**
   - Ajouter le contexte tenant aux tokens JWT
   - Mettre à jour les headers de requête

2. **Adaptation des endpoints**
   - Vérifier les nouveaux formats de réponse
   - Gérer les nouveaux codes d'erreur

3. **Gestion des permissions**
   - Implémenter la vérification des fonctionnalités par plan
   - Gérer les limites d'usage

4. **Tests**
   - Tester l'isolation des données
   - Valider les permissions multi-tenant

### Script de Migration

```javascript
// Exemple de script de migration
const migrateToMultiTenant = async () => {
  // 1. Mettre à jour les tokens
  const newToken = await refreshTokenWithTenant(oldToken, tenantId);
  
  // 2. Mettre à jour les appels API
  const apiClient = new APIClient({
    token: newToken,
    tenantId: tenantId,
    baseURL: 'https://api.attendance-x.com'
  });
  
  // 3. Tester les fonctionnalités critiques
  await testCriticalFeatures(apiClient);
  
  console.log('Migration terminée avec succès');
};
```

## Support et Ressources

### Documentation Complémentaire
- [Guide d'authentification](./authentication.md)
- [Référence API complète](./api-reference.md)
- [Exemples d'intégration](./integration-examples.md)

### Support Technique
- **Email** : api-support@attendance-x.com
- **Documentation** : https://docs.attendance-x.com
- **Status** : https://status.attendance-x.com

### Communauté
- **GitHub** : https://github.com/attendance-x/api-examples
- **Discord** : https://discord.gg/attendance-x
- **Stack Overflow** : Tag `attendance-x`

## Changelog

### Version 2.0.0 (2024-01-15)
- **BREAKING** : Introduction du multi-tenant
- **BREAKING** : Nouveaux formats de réponse
- **ADDED** : Endpoints de gestion des tenants
- **ADDED** : Système de facturation
- **ADDED** : Webhooks multi-tenant

### Version 2.1.0 (2024-02-01)
- **ADDED** : SDK JavaScript/TypeScript
- **ADDED** : Nouveaux événements webhook
- **IMPROVED** : Performance des requêtes tenant-scoped

### Version 2.2.0 (2024-03-01)
- **ADDED** : SDK Python
- **ADDED** : Endpoints de gestion des relances
- **IMPROVED** : Gestion des erreurs
- **FIXED** : Problèmes de rate limiting