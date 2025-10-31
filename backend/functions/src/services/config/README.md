# Services de Configuration des Feuilles de Temps

Ce module contient tous les services nécessaires pour configurer et gérer les paramètres des feuilles de temps dans l'application.

## Services Disponibles

### 1. TimesheetConfigService

Service principal pour la gestion des paramètres de configuration des feuilles de temps.

**Fonctionnalités :**
- Configuration des périodes de saisie (hebdomadaire, bi-hebdomadaire, mensuelle)
- Gestion des règles d'heures supplémentaires
- Configuration des règles de validation
- Paramétrage du workflow d'approbation
- Gestion des notifications
- Configuration de la sécurité et du verrouillage

**Exemple d'utilisation :**
```typescript
const configService = new TimesheetConfigService(db);

// Obtenir les paramètres actuels
const settings = await configService.getTimesheetSettings('tenant-1');

// Configurer les heures supplémentaires
await configService.configureOvertimeRules('tenant-1', {
  enabled: true,
  dailyThreshold: 8,
  weeklyThreshold: 40,
  multiplier: 1.5
}, 'admin-user');

// Valider une entrée de temps
const validation = await configService.validateTimeEntryAgainstConfig('tenant-1', {
  date: '2024-01-15',
  duration: 480, // 8 heures en minutes
  description: 'Travail sur le projet',
  projectId: 'project-1',
  billable: true
});
```

### 2. RateManagementService

Service pour la gestion des taux horaires avec support de l'historique et de la hiérarchie.

**Fonctionnalités :**
- Taux par défaut de l'organisation
- Taux spécifiques par employé
- Taux spécifiques par projet
- Taux combinés employé-projet
- Calcul automatique des coûts
- Gestion de l'historique des taux

**Hiérarchie des taux (du plus spécifique au plus général) :**
1. Taux Employé-Projet
2. Taux Employé
3. Taux Projet
4. Taux par défaut

**Exemple d'utilisation :**
```typescript
const rateService = new RateManagementService(db);

// Définir le taux par défaut
await rateService.setDefaultRate('tenant-1', 50, 'EUR', 'admin-user');

// Définir un taux spécifique pour un employé
await rateService.setEmployeeRate('tenant-1', 'employee-1', 60, 'admin-user', 70);

// Calculer le taux applicable
const rates = await rateService.calculateApplicableRate(
  'tenant-1', 
  'employee-1', 
  'project-1'
);

// Calculer le coût d'une entrée
const cost = await rateService.calculateEntryCost(
  'tenant-1',
  'employee-1',
  'project-1',
  480, // 8 heures
  false // pas d'heures supplémentaires
);
```

### 3. TimesheetPermissionsService

Service pour la gestion des permissions spécifiques aux feuilles de temps.

**Fonctionnalités :**
- Permissions granulaires par utilisateur
- Permissions par défaut selon les rôles
- Restrictions temporelles et par projet
- Gestion des approbateurs
- Audit des permissions

**Permissions disponibles :**
- Gestion des entrées de temps (création, édition, suppression)
- Gestion des feuilles de temps (visualisation, soumission)
- Approbation et rejet
- Gestion des projets et activités
- Rapports et analytics
- Administration

**Exemple d'utilisation :**
```typescript
const permissionsService = new TimesheetPermissionsService(db);

// Définir les permissions d'un utilisateur
await permissionsService.setUserPermissions('tenant-1', 'user-1', {
  canCreateTimeEntry: true,
  canEditOwnTimeEntry: true,
  canApproveTimesheet: true
}, {
  allowedProjectIds: ['project-1', 'project-2'],
  maxDailyHours: 10
}, 'admin-user', 'manager');

// Vérifier une permission
const canApprove = await permissionsService.hasPermission(
  'tenant-1', 
  'user-1', 
  'canApproveTimesheet'
);

// Vérifier l'accès à un projet
const canAccess = await permissionsService.canAccessProject(
  'tenant-1', 
  'user-1', 
  'project-1'
);
```

### 4. TimesheetConfigurationManager

Service principal qui combine tous les services de configuration pour une gestion centralisée.

**Fonctionnalités :**
- Initialisation complète d'un nouveau tenant
- Résumé de configuration
- Validation de configuration
- Gestion centralisée

**Exemple d'utilisation :**
```typescript
const configManager = new TimesheetConfigurationManager(db);

// Initialiser un nouveau tenant
const config = await configManager.initializeTenantConfiguration('tenant-1', 'admin-user', {
  defaultRate: 55,
  currency: 'EUR',
  periodType: 'weekly',
  enableOvertime: true,
  requireApproval: true
});

// Obtenir un résumé complet
const summary = await configManager.getTenantConfigurationSummary('tenant-1');

// Valider la configuration
const validation = await configManager.validateTenantConfiguration('tenant-1');
```

## Structure des Données

### TimesheetSettings
```typescript
interface TimesheetSettings {
  tenantId: string;
  defaultPeriodType: 'weekly' | 'bi-weekly' | 'monthly' | 'custom';
  allowCustomPeriods: boolean;
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  
  overtimeRules: {
    enabled: boolean;
    dailyThreshold: number;
    weeklyThreshold: number;
    multiplier: number;
    autoCalculate: boolean;
  };
  
  validationRules: {
    maxDailyHours: number;
    maxWeeklyHours: number;
    requireDescription: boolean;
    minDescriptionLength: number;
    requireProjectForBillable: boolean;
    requireActivityCode: boolean;
    allowFutureEntries: boolean;
    maxFutureDays: number;
    allowWeekendWork: boolean;
  };
  
  approvalWorkflow: {
    enabled: boolean;
    requireApprovalForAll: boolean;
    autoApproveThreshold: number;
    approvalLevels: number;
    escalationDays: number;
    allowSelfApproval: boolean;
  };
  
  // ... autres propriétés
}
```

### HourlyRate
```typescript
interface HourlyRate {
  tenantId: string;
  employeeId?: string;
  projectId?: string;
  activityCodeId?: string;
  
  standardRate: number;
  overtimeRate?: number;
  billableRate?: number;
  
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  currency: string;
  rateType: 'default' | 'employee' | 'project' | 'activity' | 'employee_project' | 'employee_activity';
}
```

### TimesheetPermission
```typescript
interface TimesheetPermission {
  tenantId: string;
  userId: string;
  roleId?: string;
  
  permissions: {
    canCreateTimeEntry: boolean;
    canEditOwnTimeEntry: boolean;
    canEditOthersTimeEntry: boolean;
    canApproveTimesheet: boolean;
    // ... autres permissions
  };
  
  restrictions: {
    maxDailyHours?: number;
    allowedProjectIds?: string[];
    canApproveForUserIds?: string[];
    // ... autres restrictions
  };
}
```

## Bonnes Pratiques

### 1. Initialisation d'un Tenant
```typescript
// Toujours utiliser le ConfigurationManager pour l'initialisation
const configManager = new TimesheetConfigurationManager(db);
await configManager.initializeTenantConfiguration(tenantId, adminUserId, options);
```

### 2. Validation des Entrées
```typescript
// Toujours valider avant de sauvegarder
const validation = await configService.validateTimeEntryAgainstConfig(tenantId, entryData);
if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

### 3. Gestion des Permissions
```typescript
// Vérifier les permissions avant les opérations sensibles
const canEdit = await permissionsService.canEditTimeEntry(
  tenantId, userId, entryOwnerId, entryDate, isSubmitted
);
if (!canEdit) {
  throw new Error('Insufficient permissions');
}
```

### 4. Calcul des Coûts
```typescript
// Utiliser le service de taux pour les calculs
const cost = await rateService.calculateEntryCost(
  tenantId, employeeId, projectId, duration, isOvertime, date
);
```

## Intégration avec les Autres Services

Ces services de configuration sont conçus pour être utilisés par :
- **TimesheetService** : Validation et calculs
- **TimeEntryService** : Validation des entrées
- **ApprovalService** : Vérification des permissions d'approbation
- **ReportingService** : Calculs de coûts et permissions d'accès
- **API Controllers** : Validation des requêtes

## Tests et Validation

Pour tester la configuration :

```typescript
// Valider la configuration complète
const validation = await configManager.validateTenantConfiguration(tenantId);
console.log('Configuration valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Suggestions:', validation.suggestions);
```

## Migration et Mise à Jour

Lors de la mise à jour des paramètres :

1. **Sauvegarder** la configuration actuelle
2. **Valider** les nouveaux paramètres
3. **Appliquer** les changements
4. **Vérifier** l'intégrité post-migration

```typescript
// Exporter la configuration actuelle
const currentConfig = await configService.exportConfiguration(tenantId);

// Appliquer les nouveaux paramètres
await configService.updateTimesheetSettings(tenantId, newSettings, userId);

// Valider la nouvelle configuration
const validation = await configManager.validateTenantConfiguration(tenantId);
```