# Guide des Permissions à Deux Niveaux

## Vue d'ensemble

Notre système utilise **deux niveaux de permissions** pour un contrôle granulaire :

1. **Rôles Tenant** - Permissions organisationnelles (qui peut faire quoi dans l'organisation)
2. **Rôles Application** - Fonctionnalités disponibles (quelles features sont accessibles)

## Architecture

### Rôles Tenant (Organisationnels)
```typescript
enum TenantRole {
  OWNER = 'owner',        // Propriétaire du tenant
  ADMIN = 'admin',        // Administrateur
  MANAGER = 'manager',    // Manager d'équipe
  MEMBER = 'member',      // Membre régulier
  VIEWER = 'viewer'       // Lecture seule
}
```

### Rôles Application (Fonctionnalités)
```typescript
enum ApplicationRole {
  PREMIUM_USER = 'premium_user',      // Toutes les fonctionnalités
  STANDARD_USER = 'standard_user',    // Fonctionnalités principales
  BASIC_USER = 'basic_user',          // Fonctionnalités de base
  TRIAL_USER = 'trial_user',          // Accès d'essai limité
  RESTRICTED_USER = 'restricted_user' // Très limité
}
```

### Permissions de Fonctionnalités
```typescript
enum FeaturePermission {
  // Présence
  ADVANCED_PRESENCE_TRACKING = 'advanced_presence_tracking',
  BULK_PRESENCE_MANAGEMENT = 'bulk_presence_management',
  PRESENCE_ANALYTICS = 'presence_analytics',
  GEOFENCING = 'geofencing',
  
  // Rapports
  BASIC_REPORTS = 'basic_reports',
  ADVANCED_REPORTS = 'advanced_reports',
  CUSTOM_REPORTS = 'custom_reports',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // Intégrations
  API_ACCESS = 'api_access',
  WEBHOOK_ACCESS = 'webhook_access',
  THIRD_PARTY_INTEGRATIONS = 'third_party_integrations',
  
  // Avancé
  MACHINE_LEARNING_INSIGHTS = 'machine_learning_insights',
  PREDICTIVE_ANALYTICS = 'predictive_analytics',
  CUSTOM_BRANDING = 'custom_branding',
  WHITE_LABELING = 'white_labeling',
  
  // Support
  PRIORITY_SUPPORT = 'priority_support',
  DEDICATED_SUPPORT = 'dedicated_support',
  TRAINING_SESSIONS = 'training_sessions'
}
```

## Utilisation des Middlewares

### 1. Permission de Fonctionnalité Uniquement
```typescript
import { requireFeaturePermission } from '../middleware/dual-permission.middleware';
import { FeaturePermission } from '../shared/types/tenant.types';

router.get('/advanced-analytics',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  requireFeaturePermission(FeaturePermission.MACHINE_LEARNING_INSIGHTS),
  (req, res) => {
    // Accessible seulement si l'utilisateur a la permission ML
    res.json({ insights: ['...'] });
  }
);
```

### 2. Rôle Tenant Uniquement
```typescript
import { requireTenantRole } from '../middleware/dual-permission.middleware';
import { TenantRole } from '../shared/types/tenant.types';

router.post('/manage-team',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  requireTenantRole(TenantRole.MANAGER),
  (req, res) => {
    // Accessible seulement aux managers et plus
    res.json({ message: 'Team management access' });
  }
);
```

### 3. Les Deux Requis (AND)
```typescript
import { requireAdvancedFeature } from '../middleware/dual-permission.middleware';

router.post('/bulk-operations',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  requireAdvancedFeature(
    TenantRole.MANAGER,                           // ET manager+
    FeaturePermission.BULK_PRESENCE_MANAGEMENT    // ET permission bulk
  ),
  (req, res) => {
    // Accessible seulement si les DEUX conditions sont remplies
    res.json({ operations: ['bulk import', 'bulk export'] });
  }
);
```

### 4. Accès Flexible (OR)
```typescript
import { requireDualPermission } from '../middleware/dual-permission.middleware';

router.get('/reports',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  requireDualPermission({
    minimumTenantRole: TenantRole.MANAGER,        // OU manager+
    requiredFeaturePermission: FeaturePermission.BASIC_REPORTS, // OU permission
    requireBoth: false  // OR logic
  }),
  (req, res) => {
    // Accessible si manager OU si a la permission rapports
    res.json({ reports: ['...'] });
  }
);
```

### 5. Dégradation Gracieuse
```typescript
router.get('/dashboard',
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  requireDualPermission({
    minimumTenantRole: TenantRole.MEMBER,
    requiredFeaturePermission: FeaturePermission.ADVANCED_REPORTS,
    gracefulDegradation: true  // Ne pas bloquer, juste limiter
  }),
  (req, res) => {
    const restrictions = req.permissionRestrictions;
    
    const data = { basicStats: {} };
    
    // Ajouter des données avancées seulement si autorisé
    if (!restrictions?.featurePermissionDenied) {
      data.advancedStats = { /* ... */ };
    }
    
    res.json({ data, restrictions });
  }
);
```

## Exemples de Cas d'Usage

### Cas 1: Membre avec Plan Premium
```
Utilisateur: John (MEMBER dans le tenant, PREMIUM_USER application)
- ✅ Peut accéder aux rapports avancés (a la permission)
- ❌ Ne peut pas gérer l'équipe (pas manager)
- ✅ Peut utiliser l'API (a la permission)
```

### Cas 2: Manager avec Plan Basic
```
Utilisateur: Sarah (MANAGER dans le tenant, BASIC_USER application)
- ✅ Peut gérer l'équipe (est manager)
- ❌ Ne peut pas accéder aux rapports avancés (pas la permission)
- ✅ Peut voir les rapports de base (est manager OU a la permission)
```

### Cas 3: Admin avec Plan Standard
```
Utilisateur: Mike (ADMIN dans le tenant, STANDARD_USER application)
- ✅ Peut tout faire au niveau tenant (est admin)
- ✅ Peut accéder aux rapports avancés (a la permission)
- ❌ Ne peut pas utiliser le ML (pas la permission)
```

## Mapping Plan → Rôle Application

```typescript
PlanType.FREE → ApplicationRole.TRIAL_USER
PlanType.BASIC → ApplicationRole.BASIC_USER
PlanType.PRO → ApplicationRole.STANDARD_USER
PlanType.ENTERPRISE → ApplicationRole.PREMIUM_USER
```

## Vérifications Programmatiques

```typescript
import PermissionService from '../services/auth/permission.service';

// Vérifier une permission de fonctionnalité
const canUseML = PermissionService.hasFeaturePermission(
  userContext, 
  FeaturePermission.MACHINE_LEARNING_INSIGHTS
);

// Vérifier un rôle tenant
const canManage = PermissionService.hasTenantPermission(
  userContext, 
  TenantRole.MANAGER
);

// Vérifier l'accès à une fonctionnalité (combiné)
const canAccessAdvancedFeature = PermissionService.canAccessFeature(
  userContext,
  FeaturePermission.ADVANCED_REPORTS,
  TenantRole.MEMBER  // minimum tenant role
);
```

## Bonnes Pratiques

### 1. Utilisez la dégradation gracieuse pour l'UX
```typescript
// ✅ Bon - Montre des fonctionnalités limitées
requireDualPermission({ gracefulDegradation: true })

// ❌ Éviter - Bloque complètement l'accès
requireDualPermission({ gracefulDegradation: false })
```

### 2. Soyez explicite sur les permissions requises
```typescript
// ✅ Bon - Clair sur ce qui est requis
requireAdvancedFeature(TenantRole.MANAGER, FeaturePermission.API_ACCESS)

// ❌ Éviter - Pas clair
requireDualPermission({ /* options complexes */ })
```

### 3. Documentez les cas d'usage
```typescript
// ✅ Bon - Commentaire explicatif
// Seuls les managers avec accès API peuvent créer des webhooks
router.post('/webhooks', 
  requireAdvancedFeature(TenantRole.MANAGER, FeaturePermission.WEBHOOK_ACCESS),
  // ...
);
```

### 4. Gérez les erreurs de permissions
```typescript
// Les middlewares retournent automatiquement des erreurs 403 avec détails
{
  "success": false,
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "Feature permission required: machine_learning_insights",
    "details": {
      "tenantRole": "member",
      "applicationRole": "basic_user",
      "requiredFeaturePermission": "machine_learning_insights"
    }
  }
}
```

## Migration depuis l'Ancien Système

Si vous avez des routes existantes avec des vérifications de rôles simples :

```typescript
// Ancien système
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Admin required' });
}

// Nouveau système
requireTenantRole(TenantRole.ADMIN)
```

Pour des fonctionnalités premium :

```typescript
// Ancien système
if (req.tenantContext.plan.type !== 'enterprise') {
  return res.status(403).json({ error: 'Enterprise plan required' });
}

// Nouveau système
requireFeaturePermission(FeaturePermission.ADVANCED_REPORTS)
```