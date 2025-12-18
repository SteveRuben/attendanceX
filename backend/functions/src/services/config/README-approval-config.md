# Service de Configuration des Approbateurs

Le `ApprovalConfigService` permet de gérer la configuration des approbateurs par défaut et la hiérarchie organisationnelle pour les workflows d'approbation des feuilles de temps.

## Fonctionnalités

### 1. Approbateurs par défaut
- Configuration d'un approbateur principal et secondaire
- Récupération automatique de l'approbateur par défaut

### 2. Hiérarchie organisationnelle
- Définition des relations manager/employé
- Récupération de l'approbateur spécifique à un employé
- Gestion des départements

### 3. Règles d'escalation
- Configuration des escalations automatiques
- Définition des délais d'escalation
- Gestion des cibles d'escalation

## Utilisation

### Configuration initiale

```typescript
import { ApprovalConfigService } from '../config/approval-config.service';

const approvalConfigService = new ApprovalConfigService();

// Définir l'approbateur par défaut
await approvalConfigService.setDefaultApprover(
  'tenant-123',
  {
    userId: 'manager-456',
    name: 'Jean Dupont',
    email: 'jean.dupont@company.com'
  },
  'admin-user-id'
);
```

### Configuration de la hiérarchie

```typescript
// Définir le manager d'un employé
await approvalConfigService.setEmployeeManager(
  'tenant-123',
  'employee-789',
  {
    managerId: 'manager-456',
    managerName: 'Jean Dupont',
    managerEmail: 'jean.dupont@company.com',
    departmentId: 'dept-it',
    departmentName: 'IT Department'
  },
  'admin-user-id'
);
```

### Configuration des escalations

```typescript
// Configurer les règles d'escalation
await approvalConfigService.setEscalationRules(
  'tenant-123',
  {
    enabled: true,
    escalateToUserId: 'director-123',
    escalateToName: 'Marie Martin',
    escalateToEmail: 'marie.martin@company.com',
    escalationDays: 3
  },
  'admin-user-id'
);
```

### Récupération des approbateurs

```typescript
// Obtenir l'approbateur pour un employé spécifique
const approver = await approvalConfigService.getApproverForEmployee(
  'tenant-123',
  'employee-789'
);

// Obtenir l'approbateur par défaut
const defaultApprover = await approvalConfigService.getDefaultApprover('tenant-123');

// Obtenir la cible d'escalation
const escalationTarget = await approvalConfigService.getEscalationTarget(
  'tenant-123',
  'current-approver-id'
);
```

## Intégration avec ApprovalService

Le service d'approbation utilise automatiquement la configuration :

```typescript
// Dans ApprovalService, les méthodes suivantes utilisent maintenant ApprovalConfigService :

// 1. getDefaultApprover() - utilise approvalConfigService.getDefaultApprover()
// 2. getEscalationTarget() - utilise approvalConfigService.getEscalationTarget()
// 3. getApproversForEmployee() - utilise approvalConfigService.getApproverForEmployee()
```

## Structure de données

### ApprovalConfiguration

```typescript
interface ApprovalConfiguration {
  id?: string;
  tenantId: string;
  
  // Approbateurs par défaut
  defaultApprovers: {
    primary: {
      userId: string;
      name: string;
      email: string;
    };
    secondary?: {
      userId: string;
      name: string;
      email: string;
    };
  };
  
  // Règles d'escalation
  escalationRules: {
    enabled: boolean;
    escalateToUserId?: string;
    escalateToName?: string;
    escalateToEmail?: string;
    escalationDays: number;
  };
  
  // Hiérarchie organisationnelle
  organizationalHierarchy: {
    [employeeId: string]: {
      managerId: string;
      managerName: string;
      managerEmail: string;
      departmentId?: string;
      departmentName?: string;
    };
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}
```

## Collection Firestore

Les configurations sont stockées dans la collection `approval_configurations` avec la structure suivante :

```
approval_configurations/
├── {configId}/
    ├── tenantId: string
    ├── defaultApprovers: object
    ├── escalationRules: object
    ├── organizationalHierarchy: object
    ├── createdAt: timestamp
    ├── updatedAt: timestamp
    ├── createdBy: string
    └── updatedBy: string
```

## Validation

Le service inclut une validation complète :
- Vérification des emails
- Validation des délais d'escalation (0-30 jours)
- Contrôle de la cohérence de la hiérarchie
- Validation des champs requis

## Gestion des erreurs

Toutes les méthodes gèrent les erreurs de manière appropriée :
- Retour de `null` pour les approbateurs non trouvés
- Logs d'erreur détaillés
- Messages d'erreur explicites pour les validations

## Méthodes utilitaires

- `getAllApprovers()` : Liste tous les approbateurs configurés
- `getOrganizationalHierarchy()` : Récupère la hiérarchie complète
- `importOrganizationalHierarchy()` : Import en masse de la hiérarchie
- `removeEmployeeFromHierarchy()` : Suppression d'un employé

## Exemple complet

```typescript
// Configuration complète pour un nouveau tenant
const approvalConfigService = new ApprovalConfigService();

// 1. Définir l'approbateur par défaut
await approvalConfigService.setDefaultApprover(
  'tenant-123',
  {
    userId: 'ceo-001',
    name: 'CEO Principal',
    email: 'ceo@company.com'
  },
  'system'
);

// 2. Configurer la hiérarchie
const hierarchy = {
  'emp-001': {
    managerId: 'mgr-001',
    managerName: 'Manager IT',
    managerEmail: 'manager.it@company.com',
    departmentId: 'dept-it',
    departmentName: 'IT'
  },
  'emp-002': {
    managerId: 'mgr-002',
    managerName: 'Manager RH',
    managerEmail: 'manager.rh@company.com',
    departmentId: 'dept-rh',
    departmentName: 'RH'
  }
};

await approvalConfigService.importOrganizationalHierarchy(
  'tenant-123',
  hierarchy,
  'admin'
);

// 3. Configurer les escalations
await approvalConfigService.setEscalationRules(
  'tenant-123',
  {
    enabled: true,
    escalateToUserId: 'ceo-001',
    escalateToName: 'CEO Principal',
    escalateToEmail: 'ceo@company.com',
    escalationDays: 5
  },
  'admin'
);
```