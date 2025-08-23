# Design Document - Amélioration du flux d'appartenance aux organisations

## Overview

Ce design améliore le flux d'onboarding des organisations en gérant mieux les cas où l'utilisateur appartient déjà à une organisation ou a fourni des informations lors de l'inscription. Il introduit une API pour récupérer les organisations d'un utilisateur et améliore l'expérience utilisateur en évitant les duplications et les frictions.

## Architecture

### Composants Frontend

```
OrganizationSetup (amélioré)
├── OrganizationMembershipChecker (nouveau)
├── OrganizationSelector (nouveau)
├── OrganizationForm (existant, amélioré)
└── DashboardRedirect (nouveau)

Dashboard
├── OrganizationSettings (nouveau)
└── OrganizationSwitcher (nouveau)
```

### Composants Backend

```
API Routes (nouveaux/améliorés)
├── GET /users/{userId}/organizations
├── PUT /organizations/{orgId}/members/{userId}
├── POST /organizations/{orgId}/complete-setup
└── GET /organizations/{orgId}/settings

Services
├── OrganizationMembershipService (nouveau)
├── OrganizationService (amélioré)
└── UserService (amélioré)
```

## Components and Interfaces

### 1. OrganizationMembershipChecker

**Responsabilité :** Vérifier l'appartenance d'un utilisateur aux organisations

```typescript
interface OrganizationMembershipChecker {
  checkUserMembership(userId: string): Promise<UserOrganizationMembership[]>;
  handleExistingMembership(memberships: UserOrganizationMembership[]): void;
  redirectToOrganization(organizationId: string): void;
}

interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  isActive: boolean;
  joinedAt: Date;
  isComplete: boolean; // Nouveau : indique si la configuration est complète
}
```

### 2. OrganizationSelector

**Responsabilité :** Permettre à l'utilisateur de choisir parmi plusieurs organisations

```typescript
interface OrganizationSelectorProps {
  memberships: UserOrganizationMembership[];
  onSelect: (organizationId: string) => void;
  onCreateNew: () => void;
}
```

### 3. API /users/{userId}/organizations

**Responsabilité :** Récupérer les organisations d'un utilisateur

```typescript
// Request
GET /users/{userId}/organizations

// Response
interface GetUserOrganizationsResponse {
  success: boolean;
  data: UserOrganizationMembership[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Error Cases
- 404: User not found
- 403: Insufficient permissions
- 500: Server error
```

### 4. OrganizationSettings Component

**Responsabilité :** Gérer les paramètres d'organisation depuis le dashboard

```typescript
interface OrganizationSettingsProps {
  organizationId: string;
  currentUser: User;
  canEdit: boolean;
}

interface OrganizationSettingsState {
  organization: Organization;
  loading: boolean;
  saving: boolean;
  errors: Record<string, string>;
}
```

### 5. Amélioration du flux OrganizationSetup

```typescript
interface OrganizationSetupFlow {
  // Étapes du flux
  steps: [
    'check-membership',      // Nouveau : vérifier l'appartenance
    'select-organization',   // Nouveau : sélectionner si plusieurs
    'complete-setup',        // Nouveau : compléter les données manquantes
    'create-organization',   // Existant : créer nouvelle organisation
    'finalize'              // Existant : finaliser
  ];
  
  // États possibles
  states: [
    'no-membership',         // Aucune organisation
    'single-membership',     // Une organisation
    'multiple-memberships',  // Plusieurs organisations
    'incomplete-setup',      // Configuration incomplète
    'complete-setup'         // Configuration complète
  ];
}
```

## Data Models

### 1. Extension du modèle Organization

```typescript
interface Organization {
  // Champs existants...
  
  // Nouveaux champs
  setupComplete: boolean;
  setupCompletedAt?: Date;
  setupCompletedBy?: string;
  
  // Métadonnées d'inscription
  registrationSource?: 'user-signup' | 'invitation' | 'admin-created';
  registrationData?: {
    originalName?: string;
    userProvidedInfo?: Record<string, any>;
  };
}
```

### 2. Extension du modèle UserOrganizationMembership

```typescript
interface UserOrganizationMembership {
  // Champs existants...
  
  // Nouveaux champs
  setupComplete: boolean;
  setupStep?: string;
  invitationAcceptedAt?: Date;
  lastAccessedAt?: Date;
}
```

## Error Handling

### 1. Gestion des erreurs d'appartenance

```typescript
enum OrganizationMembershipError {
  USER_ALREADY_MEMBER = 'USER_ALREADY_MEMBER',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  SETUP_INCOMPLETE = 'SETUP_INCOMPLETE'
}

interface MembershipErrorHandler {
  handleUserAlreadyMember(error: any): Promise<void>;
  handleSetupIncomplete(organizationId: string): Promise<void>;
  handlePermissionError(): void;
}
```

### 2. Stratégies de récupération

```typescript
interface RecoveryStrategy {
  // Quand l'utilisateur appartient déjà à l'organisation
  completeExistingSetup(userId: string, organizationId: string): Promise<void>;
  
  // Quand les données sont incomplètes
  fillMissingData(organization: Organization, userData: any): Promise<Organization>;
  
  // Quand l'API n'est pas disponible
  fallbackToLocalStorage(): OrganizationData | null;
}
```

## Testing Strategy

### 1. Tests unitaires

```typescript
describe('OrganizationMembershipChecker', () => {
  test('should detect existing membership');
  test('should handle multiple memberships');
  test('should handle no membership');
  test('should handle API errors gracefully');
});

describe('OrganizationSetup Flow', () => {
  test('should pre-fill registration data');
  test('should handle existing membership redirect');
  test('should allow skipping setup');
  test('should complete incomplete setup');
});
```

### 2. Tests d'intégration

```typescript
describe('Organization API Integration', () => {
  test('GET /users/{userId}/organizations returns correct data');
  test('POST /organizations/{orgId}/complete-setup works');
  test('Error handling for non-existent users');
});
```

### 3. Tests E2E

```typescript
describe('Organization Onboarding E2E', () => {
  test('New user creates organization successfully');
  test('Existing member gets redirected correctly');
  test('User with multiple orgs can select');
  test('Skip setup and access later works');
});
```

## Performance Considerations

### 1. Optimisations API

- **Mise en cache** des informations d'appartenance aux organisations
- **Pagination** pour les utilisateurs avec de nombreuses organisations
- **Lazy loading** des détails d'organisation non critiques

### 2. Optimisations Frontend

- **Pré-chargement** des données d'organisation pendant l'authentification
- **État local** pour éviter les appels API répétés
- **Debouncing** pour les validations de formulaire

## Security Considerations

### 1. Contrôle d'accès

- Vérification que l'utilisateur peut accéder aux informations d'organisation
- Validation des permissions pour modifier les paramètres d'organisation
- Protection contre l'énumération d'organisations

### 2. Validation des données

- Sanitisation des noms d'organisation
- Validation des formats d'email et téléphone
- Protection contre l'injection de données malveillantes

## Migration Strategy

### 1. Données existantes

```sql
-- Ajouter les nouveaux champs aux organisations existantes
ALTER TABLE organizations 
ADD COLUMN setup_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN setup_completed_at TIMESTAMP,
ADD COLUMN registration_source VARCHAR(50),
ADD COLUMN registration_data JSONB;

-- Marquer les organisations existantes comme complètes
UPDATE organizations 
SET setup_complete = TRUE, 
    setup_completed_at = created_at 
WHERE created_at < NOW();
```

### 2. Déploiement progressif

1. **Phase 1 :** Déployer la nouvelle API sans l'utiliser
2. **Phase 2 :** Activer la vérification d'appartenance
3. **Phase 3 :** Activer le flux complet avec fallback
4. **Phase 4 :** Supprimer l'ancien code après validation