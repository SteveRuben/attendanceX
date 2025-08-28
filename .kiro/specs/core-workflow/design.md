# Design Document - Core Workflow V1

## Overview

The Core Workflow V1 system is designed as a comprehensive event management platform that enables organizations to create, manage, and track events with sophisticated attendance validation and participant communication features. The system follows a multi-tenant architecture where organizations can manage their teams, create events, handle participant registrations, and validate attendance through multiple methods including QR codes and geolocation.

The design leverages existing APIs and services while introducing new workflow orchestration components to create a seamless user experience from organization setup through event completion and analytics.

## Architecture

### High-Level Architecture

The system follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Dashboard     │ │  Event Wizard   │ │  Attendance     ││
│  │   Components    │ │   Components    │ │   Validation    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Workflow Orchestration Layer              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  Organization   │ │     Event       │ │   Attendance    ││
│  │   Workflow      │ │   Workflow      │ │   Workflow      ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ organizationSvc │ │   eventService  │ │ attendanceService││
│  │ userService     │ │ invitationSvc   │ │ notificationSvc ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│           Firestore Collections & Storage                   │
└─────────────────────────────────────────────────────────────┘
```

### Design Rationale

**Workflow Orchestration Layer**: Introduced to coordinate complex multi-step processes like organization onboarding and event creation. This layer sits between the UI and existing services to manage state transitions and business logic flow, while leveraging the existing type system and validation schemas.

**Existing API Integration**: The design leverages all existing services (organizationService, eventService, attendanceService, notificationService, etc.) and their associated types from the shared package to avoid code duplication and maintain consistency with the current system architecture.

**Type System Consistency**: All components use the existing TypeScript interfaces and enums from shared/src/types/, ensuring type safety and consistency across the application. This includes Organization, Event, EventRegistration, NotificationTemplate, and all related enums and validation schemas.

## Components and Interfaces

### 1. Organization Management Components

#### OrganizationOnboardingWizard
- **Purpose**: Guides new users through organization setup
- **Key Features**: 
  - Multi-step wizard with validation
  - Sector-based templates (utilise SECTOR_TEMPLATES existant)
  - Regional settings configuration avec COMMON_TIMEZONES
  - Owner assignment avec OrganizationRole.OWNER
- **Integration**: Uses organizationService existant et CreateOrganizationRequest

#### TeamManagement
- **Purpose**: Gestion des équipes et affectation des utilisateurs
- **Key Features**:
  - **Création d'équipes** : Structure hiérarchique avec départements
  - **Affectation multi-équipes** : Un utilisateur peut appartenir à plusieurs équipes
  - **Permissions par équipe** : Validation présences, création événements, etc.
  - **Import Excel/CSV** : Import utilisateurs avec affectation automatique aux équipes
  - **Gestion des managers** : Chef d'équipe avec permissions étendues
- **Integration**: Extension des services existants avec gestion des équipes

#### UserManagement (Membres Organisation)
- **Purpose**: Gestion des utilisateurs internes de l'organisation
- **Key Features**:
  - **Import Excel/CSV** : Import en masse avec rôle par défaut CONTRIBUTOR
  - **Mot de passe par défaut** : Configuration lors de l'import, changement obligatoire
  - **Multi-team assignment** : Affectation à plusieurs équipes simultanément
  - **Role-based permissions** avec UserRole existants + permissions équipes
  - **Validation des présences** : Selon les permissions d'équipe et rôle CONTRIBUTOR
- **Integration**: Uses userService, invitationService avec extensions équipes

#### ParticipantManagement (Invités Événements)
- **Purpose**: Gestion des participants externes aux événements
- **Key Features**:
  - **Import CSV/Excel** : Participants avec contact flexible (email/phone)
  - **Distinction interne/externe** : Lien automatique avec utilisateurs existants
  - **Préférences notification** : Email/SMS selon disponibilité contact
  - **Gestion des doublons** : Détection utilisateur interne vs participant externe
- **Integration**: Service dédié participant distinct du userService

### 2. Event Management Components

#### EventCreationWizard
- **Purpose**: Comprehensive event creation with all configuration options
- **Key Features**:
  - Step-by-step event configuration utilisant CreateEventRequest
  - Support des EventType existants (MEETING, TRAINING, CONFERENCE, etc.)
  - EventLocation avec support physical/virtual/hybrid
  - AttendanceSettings avec QR code et géolocalisation
  - EventReminderSettings pour les notifications automatiques
  - Capacity et visibility settings
- **Integration**: Uses eventService existant et createEventSchema pour validation

#### ParticipantListManager
- **Purpose**: Advanced participant management with bulk operations
- **Key Features**:
  - **Import CSV/Excel** : Support des colonnes flexibles (email, phone, firstName, lastName)
  - **Validation des contacts** : Au moins un email OU téléphone requis par invité
  - **Préférences de notification** : Configuration email/SMS par invité ou globale
  - **Bulk actions** utilisant EventRegistration et BulkNotificationRequest
  - **Advanced filtering and search** avec support multi-critères
  - **Duplicate detection** : Détection par email ET/OU téléphone
  - **Support des statuses** existants (pending, confirmed, cancelled, waitlisted)
- **Integration**: Uses invitationService.importInvitations() et notificationService existants

### 3. Attendance Validation Components

#### AttendanceValidationInterface
- **Purpose**: Real-time attendance validation on event day
- **Key Features**:
  - **QR code scanning** automatique
  - **Manual validation** par les membres de l'équipe (rôle MEMBER ou supérieur)
  - **Geolocation verification** avec fallback manuel
  - **Late arrival handling** avec seuils configurables
  - **On-site registration** pour les invités non-inscrits
  - **Bulk validation** pour validation rapide de groupes
  - **Override permissions** pour les ADMIN/MANAGER
- **Integration**: Uses attendanceService avec validation des permissions OrganizationRole

#### QRCodeGenerator
- **Purpose**: Generates unique QR codes for participants
- **Key Features**:
  - Personal QR codes per participant
  - Secure token generation
  - Integration with validation system

### 4. Communication Components

#### NotificationOrchestrator
- **Purpose**: Manages automated and manual notifications
- **Key Features**:
  - **Multi-language support** : Notifications dans les langues supportées (fr, en, es, de, it)
  - **Template management** avec NotificationTemplate par langue
  - **Automatic language detection** : Selon les préférences utilisateur/participant
  - **Scheduled reminder system** utilisant les NotificationType existants
  - **Multi-channel delivery** (NotificationChannel: EMAIL, SMS, PUSH, IN_APP)
  - **Delivery status tracking** avec NotificationStatus
  - **Response processing** et NotificationAction
  - **Support des NotificationPriority** (LOW, MEDIUM, HIGH, URGENT)
- **Integration**: Uses notificationService existant avec extensions multi-langues

### 5. Analytics and Reporting Components

#### EventAnalyticsDashboard
- **Purpose**: Comprehensive event performance tracking
- **Key Features**:
  - Real-time statistics
  - Comparative analysis
  - Export capabilities (PDF, Excel, CSV)
  - Anomaly detection and alerts
- **Integration**: Aggregates data from multiple services

## Processus d'Importation d'Invités

### 1. Upload et Validation
```typescript
// Processus d'importation utilisant le service existant
const importProcess = {
  // 1. Upload du fichier
  uploadFile: (file: File) => invitationService.importInvitations(organizationId, file),
  
  // 2. Validation des données
  validateData: (data: ImportRow[]) => {
    return data.map(row => ({
      ...row,
      isValid: (row.email || row.phone) && validateContactInfo(row),
      errors: validateRow(row)
    }));
  },
  
  // 3. Détection des doublons
  detectDuplicates: (data: ValidatedRow[]) => {
    // Recherche par email ET/OU téléphone
    return findExistingParticipants(data);
  }
};
```

### 2. Structure CSV Supportée (avec langue)
```csv
email,phone,firstName,lastName,notifyByEmail,notifyBySMS,language,role,notes
john@example.com,+33123456789,John,Doe,true,false,en,participant,VIP guest
,+33987654321,Jane,Smith,false,true,fr,participant,No email available
marie@test.com,,Marie,Martin,true,false,fr,speaker,Keynote speaker
carlos@test.com,+34123456789,Carlos,Garcia,true,true,es,participant,Spanish speaker
```

### 3. Règles de Validation
- **Contact requis** : Au moins email OU téléphone
- **Format email** : Validation avec emailSchema existant
- **Format téléphone** : Validation avec phoneSchema existant
- **Préférences notification** : Au moins un canal si contact disponible
- **Doublons** : Détection par email ET téléphone (logique OR)

### 4. Gestion des Notifications Multi-langues
```typescript
// Configuration des notifications lors de l'import
interface ImportNotificationConfig {
  sendWelcomeNotification: boolean;
  channels: NotificationChannel[]; // EMAIL, SMS selon les préférences
  customTemplate?: string;
  scheduleFor?: Date; // Notification différée
  respectQuietHours: boolean;
  languageSettings: {
    defaultLanguage: string; // Langue par défaut de l'organisation
    autoDetectLanguage: boolean; // Détecter selon préférences utilisateur
    fallbackLanguage: string; // Si traduction manquante
    supportedLanguages: string[]; // Langues disponibles pour cette organisation
  };
}

// Service de gestion des notifications multi-langues
interface MultiLanguageNotificationService {
  // Sélection automatique de la langue
  detectUserLanguage(userId?: string, email?: string, phone?: string): Promise<string>;
  
  // Récupération du template dans la bonne langue
  getTemplateInLanguage(
    templateId: string, 
    language: string, 
    fallbackLanguage?: string
  ): Promise<NotificationTemplate>;
  
  // Envoi avec sélection automatique de langue
  sendNotificationWithLanguageDetection(
    notification: SendNotificationRequest,
    recipients: Array<{
      userId?: string;
      email?: string;
      phone?: string;
      preferredLanguage?: string;
    }>
  ): Promise<void>;
}
```

## Processus d'Importation des Utilisateurs (Membres Organisation)

### 1. Structure Excel/CSV pour les Utilisateurs (avec langue)
```csv
email,firstName,lastName,phone,department,jobTitle,systemRole,organizationRole,teams,language,sendWelcomeEmail
john@company.com,John,Doe,+33123456789,IT,Developer,contributor,member,"IT Support;Development",en,true
jane@company.com,Jane,Smith,+33987654321,HR,Manager,contributor,manager,"HR;Management",fr,true
bob@company.com,Bob,Wilson,,Operations,Supervisor,contributor,member,"Operations;Quality",fr,false
maria@company.com,Maria,Garcia,+34123456789,Sales,Representative,contributor,member,"Sales;International",es,true
```

### 2. Distinction Import Utilisateurs vs Participants
```typescript
// UTILISATEURS (Membres organisation avec comptes)
interface UserImportRow {
  email: string; // Obligatoire
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  systemRole?: UserRole; // Rôle système (CONTRIBUTOR par défaut)
  organizationRole: OrganizationRole; // Rôle dans l'organisation
  teams: string[]; // Noms des équipes (créées si inexistantes)
  sendWelcomeEmail: boolean;
}

// PARTICIPANTS (Invités événements, peuvent être externes)
interface ParticipantImportRow {
  email?: string; // Au moins email OU phone requis
  phone?: string;
  firstName?: string;
  lastName?: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  language?: string; // Langue préférée (utilise SUPPORTED_LANGUAGES)
  role?: 'participant' | 'speaker' | 'organizer'; // Rôle dans l'événement
  notes?: string;
}
```

### 3. Configuration d'Import des Utilisateurs
```typescript
interface UserImportConfig {
  defaultRole: UserRole; // CONTRIBUTOR par défaut (rôle système)
  defaultOrganizationRole: OrganizationRole; // MEMBER par défaut (rôle dans l'organisation)
  defaultPassword: string; // Mot de passe temporaire
  passwordPolicy: {
    requireChange: boolean; // true par défaut
    expirationDays: number; // 7 jours par défaut
    minLength: number;
    complexity: boolean;
  };
  teamManagement: {
    defaultTeams: string[]; // Équipes par défaut
    createMissingTeams: boolean; // Créer équipes si inexistantes
    autoAssignByDepartment: boolean; // Assigner selon département
    allowMultipleTeams: boolean; // true par défaut
  };
  notificationSettings: {
    sendCredentials: boolean; // Envoyer email avec identifiants
    sendWelcome: boolean;
    channels: NotificationChannel[];
  };
  organizationSettings: {
    autoActivate: boolean; // Activer automatiquement les comptes
    assignToDefaultDepartment?: string;
  };
}
```

### 4. Permissions de Validation des Présences (Multi-équipes)
```typescript
// Permissions basées sur rôle organisation + équipes
interface AttendanceValidationPermissions {
  canValidateAttendance: boolean; // Calculé selon équipes
  canOverrideValidation: boolean; // MANAGER et plus
  canBulkValidate: boolean; // ADMIN et plus
  canViewAllAttendances: boolean; // Selon permissions existantes
  maxValidationsPerSession?: number; // Limite selon rôle
  allowedTeamEvents: string[]; // Événements des équipes autorisées
}

// Calcul des permissions selon équipes et rôle
function calculateValidationPermissions(
  user: OrganizationUser,
  teams: Team[]
): AttendanceValidationPermissions {
  const userTeams = teams.filter(t => user.teams.includes(t.id));
  const canValidateFromTeams = userTeams.some(t => t.settings.canValidateAttendance);
  
  return {
    canValidateAttendance: canValidateFromTeams || user.role !== OrganizationRole.VIEWER,
    canOverrideValidation: user.role === OrganizationRole.MANAGER || user.role === OrganizationRole.ADMIN,
    canBulkValidate: user.role === OrganizationRole.ADMIN,
    canViewAllAttendances: user.role === OrganizationRole.ADMIN,
    maxValidationsPerSession: getValidationLimitByRole(user.role),
    allowedTeamEvents: userTeams.map(t => t.id)
  };
}
```

## Data Models

Le système utilise les modèles de données existants de l'application, garantissant la cohérence et la réutilisabilité :

### Organization Model (Existant)
```typescript
// Utilise le modèle Organization existant de shared/src/types/organization.types.ts
interface Organization {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  sector: OrganizationSector;
  status: OrganizationStatus;
  settings: OrganizationSettings;
  branding: OrganizationBranding;
  subscription: OrganizationSubscription;
  contactInfo: OrganizationContactInfo;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  memberCount: number;
  maxMembers?: number;
  isActive: boolean;
  features: OrganizationFeatures;
  metadata: Record<string, any>;
}
```

### Event Model (Existant)
```typescript
// Utilise le modèle Event existant de shared/src/types/event.types.ts
interface Event extends BaseEntity {
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  priority: EventPriority;
  organizationId: string;
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  location: EventLocation;
  capacity: number;
  organizerId: string;
  organizerName: string;
  participants: string[];
  confirmedParticipants: string[];
  attendanceSettings: AttendanceSettings;
  qrCode?: string;
  reminderSettings: EventReminderSettings;
  stats: EventStatistics;
  // ... autres propriétés existantes
}
```

### Event Registration Model (Remplacé par EventParticipant)
```typescript
// REMPLACE EventRegistration pour clarifier la distinction
// EventRegistration reste pour la compatibilité mais EventParticipant est le modèle principal
interface EventParticipant {
  id: string;
  eventId: string;
  
  // Distinction utilisateur interne vs participant externe
  userId?: string; // Si c'est un membre de l'organisation
  isInternalUser: boolean; // Calculé automatiquement
  
  // Informations de contact (au moins un requis pour externes)
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  
  // Statut et participation
  status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'absent';
  attendanceStatus?: 'present' | 'absent' | 'late' | 'excused';
  
  // Préférences de notification
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    channels: NotificationChannel[];
    language?: string; // Langue préférée pour les notifications
  };
  
  // Métadonnées
  registeredAt: Date;
  confirmedAt?: Date;
  attendedAt?: Date;
  validatedBy?: string; // ID du membre qui a validé la présence
  validatedAt?: Date;
  qrCode?: string;
  
  // Import et traçabilité
  importSource?: 'manual' | 'csv' | 'excel' | 'api' | 'internal_user';
  importBatchId?: string;
  notes?: string;
  answers?: Record<string, any>; // Réponses aux questions d'inscription
}
```

### Notification Template Model (Existant + Multi-langues)
```typescript
// Utilise le modèle NotificationTemplate existant avec support multi-langues
interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  content: string;
  htmlContent?: string;
  variables: string[];
  channels: NotificationChannel[];
  isActive: boolean;
  priority?: NotificationPriority;
  language: string; // Utilise SUPPORTED_LANGUAGES (fr, en, es, de, it)
  category?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Extension pour la gestion multi-langues
interface MultiLanguageNotificationTemplate {
  baseTemplateId: string;
  organizationId: string;
  type: NotificationType;
  name: string;
  translations: {
    [language: string]: {
      subject: string;
      content: string;
      htmlContent?: string;
    };
  };
  defaultLanguage: string; // Langue par défaut si traduction manquante
  variables: string[];
  channels: NotificationChannel[];
  isActive: boolean;
  priority?: NotificationPriority;
  category?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Extensions Nécessaires

Pour supporter les nouveaux workflows, certains modèles existants nécessitent des extensions pour gérer les équipes multiples et la distinction utilisateur/participant :

#### Distinction Rôles Système vs Organisation
```typescript
// RÔLES SYSTÈME (UserRole) - Permissions globales dans l'application
// CONTRIBUTOR = Rôle par défaut pour les utilisateurs importés
// Permissions : Créer événements, valider présences, voir rapports basiques

// RÔLES ORGANISATION (OrganizationRole) - Permissions dans l'organisation
// MEMBER = Rôle par défaut dans l'organisation
// Permissions : Selon la hiérarchie organisationnelle

interface UserRoleMapping {
  systemRole: UserRole; // CONTRIBUTOR par défaut
  organizationRole: OrganizationRole; // MEMBER par défaut
  effectivePermissions: Permission[]; // Combinaison des deux + équipes
}
```

#### Team Model (Extension)
```typescript
interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  department?: string;
  managerId: string; // Chef d'équipe
  members: string[]; // IDs des utilisateurs
  permissions: string[]; // Permissions spécifiques à l'équipe
  settings: {
    canValidateAttendance: boolean;
    canCreateEvents: boolean;
    canInviteParticipants: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

#### User vs Participant Distinction
```typescript
// UTILISATEUR = Membre de l'organisation avec compte et permissions
interface OrganizationUser extends OrganizationMember {
  // Hérite de OrganizationMember existant
  systemRole: UserRole; // Rôle système (CONTRIBUTOR par défaut)
  // role hérite de OrganizationMember (rôle dans l'organisation)
  teams: string[]; // IDs des équipes auxquelles il appartient
  primaryTeamId?: string; // Équipe principale
  canValidateAttendance: boolean; // Calculé selon les équipes et rôles
  permissions: Permission[]; // Permissions calculées selon systemRole + organizationRole + teams
}

// PARTICIPANT = Invité à un événement (peut être externe)
interface EventParticipant {
  id: string;
  eventId: string;
  // Contact (au moins un requis)
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  // Lien avec utilisateur interne (optionnel)
  userId?: string; // Si c'est un membre de l'organisation
  isInternalUser: boolean; // true si userId existe
  // Statut et préférences
  status: 'invited' | 'confirmed' | 'declined' | 'attended' | 'absent';
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    channels: NotificationChannel[];
  };
  // Métadonnées
  registeredAt: Date;
  confirmedAt?: Date;
  attendedAt?: Date;
  qrCode?: string;
  importSource?: 'manual' | 'csv' | 'excel' | 'api';
  importBatchId?: string;
  notes?: string;
}
```

#### Organization Workflow State
```typescript
interface OrganizationWorkflowState {
  organizationId: string;
  onboardingStep: 'setup' | 'teams_creation' | 'users_import' | 'first_event' | 'completed';
  onboardingProgress: number; // 0-100
  completedSteps: string[];
  nextRecommendedAction?: string;
  lastActivityAt: Date;
}
```

#### User Import State (Membres Organisation)
```typescript
interface UserImportState {
  organizationId: string;
  batchId: string;
  status: 'uploading' | 'validating' | 'processing' | 'completed' | 'failed';
  defaultRole: UserRole; // Par défaut: CONTRIBUTOR (rôle système)
  defaultOrganizationRole: OrganizationRole; // Par défaut: MEMBER (rôle organisation)
  defaultPassword: string; // Mot de passe temporaire
  requirePasswordChange: boolean; // true par défaut
  teamAssignments: {
    defaultTeams: string[]; // Équipes par défaut
    autoAssignByDepartment: boolean;
    createMissingTeams: boolean;
  };
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  createdUsers: number;
  existingUsers: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  duplicates: Array<{
    row: number;
    existingUser: OrganizationMember;
    action: 'skip' | 'update' | 'add_to_teams';
  }>;
}
```

#### Event Creation Workflow State
```typescript
interface EventCreationWorkflowState {
  eventId: string;
  organizationId: string;
  currentStep: 'basic_info' | 'location' | 'participants' | 'settings' | 'review';
  stepProgress: Record<string, boolean>;
  draftData: Partial<CreateEventRequest>;
  lastSavedAt: Date;
}
```

#### Participant Import State
```typescript
interface ParticipantImportState {
  eventId: string;
  batchId: string;
  status: 'uploading' | 'validating' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  duplicates: Array<{
    row: number;
    existingParticipant: EventRegistration;
    action: 'skip' | 'update' | 'create_duplicate';
  }>;
  notificationSettings: {
    defaultChannels: NotificationChannel[];
    sendWelcomeNotification: boolean;
    customMessage?: string;
  };
}
```

## Error Handling

### Validation Errors
- **Organization Setup**: Utilise les validators existants et CreateOrganizationRequest schema
- **Event Creation**: Utilise createEventSchema et validateCreateEvent pour validation complète
- **Registration**: Utilise EventRegistration validation et les règles métier existantes
- **Notifications**: Utilise notificationSchema et les validators de notification existants

### System Errors
- **API Failures**: Graceful degradation with retry mechanisms
- **Notification Failures**: Logging and manual retry options
- **QR Code Issues**: Manual validation fallback
- **Import Errors**: Detailed error reporting with line-by-line feedback

### User Experience Errors
- **Network Issues**: Offline capability for critical functions
- **Permission Errors**: Clear messaging and role-based access control
- **Data Conflicts**: Conflict resolution workflows for imports and updates

## Testing Strategy

### Unit Testing
- **Service Integration**: Test workflow orchestration with existing services (organizationService, eventService, etc.)
- **Component Logic**: Validate wizard flows using existing validation schemas (createEventSchema, notificationSchema)
- **Type Safety**: Ensure all components properly use existing TypeScript interfaces
- **Error Scenarios**: Test all error handling paths using existing ERROR_CODES and validation patterns

### Integration Testing
- **End-to-End Workflows**: Complete organization setup through event completion using existing API endpoints
- **API Integration**: Verify proper integration with all existing services and their response types
- **Cross-Component Communication**: Test data flow between components using existing data models
- **Validation Integration**: Test integration with existing validators and schemas

### User Acceptance Testing
- **Workflow Validation**: Test complete user journeys for each persona
- **Performance Testing**: Validate system performance under load
- **Accessibility Testing**: Ensure compliance with accessibility standards

### Specific Test Scenarios
1. **Organization Onboarding**: Complete wizard flow with team import and configurations
2. **Team Member Import**: Excel/CSV import with default passwords and role assignments
3. **Event Creation**: Multi-step event creation with all attendance methods
4. **Participant Import**: CSV import with email/phone validation and notification preferences
5. **Manual Attendance Validation**: Testing member permissions and validation workflows
6. **Bulk Operations**: CSV import with various data scenarios and error conditions
7. **Attendance Validation**: QR scanning, manual validation by team members, geolocation verification
8. **Notification System**: Scheduled and manual notifications across channels with member credentials
9. **Analytics**: Real-time data updates and report generation

## Implementation Considerations

### Performance Optimizations
- **Lazy Loading**: Load components and data on-demand
- **Caching Strategy**: Cache frequently accessed data (organization settings, templates) using existing caching patterns
- **Real-time Updates**: Use WebSocket connections for live attendance tracking
- **Batch Operations**: Optimize bulk operations using existing batch processing patterns

### Security Measures
- **QR Code Security**: Utilise les EventQRCode existants avec time-limited tokens
- **Role-Based Access**: Strict permission enforcement using ORGANIZATION_PERMISSIONS et DEFAULT_ROLE_PERMISSIONS
- **Data Validation**: Server-side validation using existing validation schemas et validators
- **Audit Logging**: Track all critical operations using OrganizationAuditLog existant

### Scalability Considerations
- **Modular Architecture**: Components can be scaled independently while maintaining type consistency
- **Service Abstraction**: Easy to replace or enhance existing services without breaking type contracts
- **Database Optimization**: Efficient queries using existing Firestore patterns et indexing strategies
- **Type Safety**: Leverage existing TypeScript interfaces pour maintenir la cohérence à l'échelle

### Integration avec l'Existant
- **Shared Types**: Tous les composants utilisent les types partagés de shared/src/types/
- **Validation Consistency**: Utilisation des validators existants pour maintenir la cohérence
- **Service Layer**: Réutilisation des services existants (organizationService, eventService, etc.)
- **Constants**: Utilisation des constantes existantes (ERROR_CODES, VALIDATION_MESSAGES, etc.)

This design provides a comprehensive foundation for implementing the core workflow while leveraging existing infrastructure, maintaining type safety, and ensuring system consistency with the current architecture.