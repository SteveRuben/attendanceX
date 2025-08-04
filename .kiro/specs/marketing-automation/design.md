# Design Document - Marketing Automation

## Overview

Le système de marketing automation permet aux organisations de créer, gérer et automatiser leurs campagnes marketing multi-canaux avec personnalisation avancée, segmentation intelligente, et mesure de performance. L'architecture est conçue pour supporter des volumes importants tout en respectant les réglementations RGPD.

## Architecture

### Architecture Générale

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Campaign Builder] --> B[Email Editor]
        A --> C[Landing Page Builder]
        B --> D[Analytics Dashboard]
        C --> E[Automation Flows]
    end
    
    subgraph "API Gateway"
        F[Authentication Service]
        G[Rate Limiting]
        H[Campaign Routing]
        I[GDPR Compliance]
    end
    
    subgraph "Business Logic Layer"
        J[Campaign Service]
        K[Segmentation Service]
        L[Automation Service]
        M[Content Service]
        N[Analytics Service]
        O[Consent Service]
    end
    
    subgraph "Data Layer"
        P[(Customer DB)]
        Q[(Campaign DB)]
        R[Analytics Store]
        S[Content Storage]
        T[Queue System]
    end
    
    subgraph "External Integrations"
        U[Email Providers]
        V[SMS Gateways]
        W[Social Media APIs]
        X[CRM Systems]
        Y[Analytics Tools]
    end
    
    A --> F
    F --> J
    J --> K
    J --> L
    J --> M
    J --> N
    J --> O
    J --> P
    L --> T
    J --> U
    J --> V
    J --> W
    N --> Y
```

### Diagramme de Flow - Création de Campagne

```mermaid
flowchart TD
    A[Marketeur crée campagne] --> B[Sélection type campagne]
    B --> C{Type de campagne?}
    
    C -->|Email| D[Configuration email]
    C -->|SMS| E[Configuration SMS]
    C -->|Social| F[Configuration réseaux sociaux]
    C -->|Multi-canal| G[Configuration multi-canal]
    
    D --> H[Création contenu email]
    E --> I[Création contenu SMS]
    F --> J[Création contenu social]
    G --> K[Création contenus multiples]
    
    H --> L[Sélection audience]
    I --> L
    J --> L
    K --> L
    
    L --> M[Application critères segmentation]
    M --> N[Calcul taille audience]
    
    N --> O{Audience valide?}
    O -->|Trop petite| P[Ajustement critères]
    O -->|Trop grande| Q[Affinement segmentation]
    O -->|Optimale| R[Validation audience]
    
    P --> M
    Q --> M
    R --> S[Configuration planification]
    
    S --> T{Envoi immédiat?}
    T -->|Oui| U[Validation finale]
    T -->|Non| V[Programmation envoi]
    
    V --> W[Sauvegarde campagne]
    U --> X[Vérification consentements]
    
    X --> Y{Consentements OK?}
    Y -->|Non| Z[Exclusion non-consentants]
    Y -->|Oui| AA[Lancement campagne]
    
    Z --> AA
    AA --> BB[Mise en queue envois]
    BB --> CC[Démarrage tracking]
    
    W --> DD[Campagne programmée]
    CC --> EE[Campagne active]
```

### Diagramme de Flow - Automation Workflow

```mermaid
flowchart TD
    A[Déclencheur activé] --> B{Type de déclencheur?}
    
    B -->|Inscription| C[Nouveau contact]
    B -->|Comportement| D[Action utilisateur]
    B -->|Date| E[Échéance temporelle]
    B -->|Score| F[Seuil atteint]
    
    C --> G[Évaluation conditions]
    D --> G
    E --> G
    F --> G
    
    G --> H{Conditions remplies?}
    H -->|Non| I[Sortie du workflow]
    H -->|Oui| J[Exécution action]
    
    J --> K{Type d'action?}
    K -->|Email| L[Envoi email personnalisé]
    K -->|SMS| M[Envoi SMS]
    K -->|Tag| N[Ajout tag contact]
    K -->|Score| O[Mise à jour score]
    K -->|Attente| P[Délai temporel]
    K -->|Webhook| Q[Appel API externe]
    
    L --> R[Enregistrement interaction]
    M --> R
    N --> R
    O --> R
    Q --> R
    
    P --> S[Attente écoulée]
    S --> T[Prochaine étape workflow]
    
    R --> U{Étape suivante?}
    U -->|Oui| V[Transition vers étape suivante]
    U -->|Non| W[Fin du workflow]
    
    V --> X[Évaluation nouvelles conditions]
    X --> H
    
    I --> Y[Log sortie workflow]
    W --> Z[Log fin workflow]
```

### Diagrammes de Séquence

#### Séquence d'Envoi de Campagne Email

```mermaid
sequenceDiagram
    participant M as Marketer
    participant UI as Campaign UI
    participant G as API Gateway
    participant C as Campaign Service
    participant S as Segmentation Service
    participant Con as Consent Service
    participant Q as Queue System
    participant E as Email Provider
    participant A as Analytics Service
    participant R as Recipient
    
    M->>UI: Lance campagne email
    UI->>G: POST /api/campaigns/{id}/send
    G->>C: Route vers Campaign Service
    
    C->>S: Récupère audience segmentée
    S-->>C: Retourne liste contacts
    
    C->>Con: Vérifie consentements
    Con-->>C: Filtre contacts autorisés
    
    loop Pour chaque contact autorisé
        C->>Q: Ajoute email à la queue
        Q->>E: Traite envoi email
        E->>R: Envoie email personnalisé
        E-->>A: Enregistre événement envoi
        
        alt Email ouvert
            R->>A: Pixel de tracking chargé
            A->>A: Enregistre ouverture
        end
        
        alt Lien cliqué
            R->>A: Clic sur lien tracké
            A->>A: Enregistre clic
        end
    end
    
    C-->>G: Confirme lancement campagne
    G-->>UI: HTTP 200 + statut campagne
    UI-->>M: Affiche confirmation lancement
```

#### Séquence d'Automation Trigger

```mermaid
sequenceDiagram
    participant T as Trigger Event
    participant G as API Gateway
    participant A as Automation Service
    participant S as Segmentation Service
    participant C as Content Service
    participant E as Email Service
    participant D as Database
    participant U as User
    
    T->>G: Événement déclencheur
    G->>A: Route vers Automation Service
    
    A->>D: Récupère workflows actifs
    D-->>A: Retourne workflows correspondants
    
    loop Pour chaque workflow
        A->>S: Évalue conditions segmentation
        S-->>A: Confirme éligibilité
        
        alt Contact éligible
            A->>C: Récupère contenu personnalisé
            C-->>A: Retourne contenu adapté
            
            A->>E: Programme envoi
            E->>U: Envoie message personnalisé
            E-->>A: Confirme envoi
            
            A->>D: Enregistre progression workflow
        else Contact non éligible
            A->>D: Log exclusion
        end
    end
    
    A-->>G: Confirme traitement
    G-->>T: HTTP 200
```

## Components and Interfaces

### Services Backend

#### CampaignService
```typescript
interface CampaignService {
  createCampaign(campaign: CreateCampaignRequest): Promise<Campaign>
  updateCampaign(campaignId: string, updates: UpdateCampaignRequest): Promise<Campaign>
  sendCampaign(campaignId: string, options: SendOptions): Promise<CampaignExecution>
  scheduleCampaign(campaignId: string, schedule: CampaignSchedule): Promise<void>
  getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics>
  duplicateCampaign(campaignId: string): Promise<Campaign>
  pauseCampaign(campaignId: string): Promise<void>
}
```

#### SegmentationService
```typescript
interface SegmentationService {
  createSegment(segment: CreateSegmentRequest): Promise<Segment>
  updateSegment(segmentId: string, updates: UpdateSegmentRequest): Promise<Segment>
  getSegmentContacts(segmentId: string): Promise<Contact[]>
  evaluateSegmentSize(criteria: SegmentCriteria): Promise<number>
  getSegmentAnalytics(segmentId: string): Promise<SegmentAnalytics>
  exportSegment(segmentId: string, format: ExportFormat): Promise<string>
}
```

#### AutomationService
```typescript
interface AutomationService {
  createWorkflow(workflow: CreateWorkflowRequest): Promise<Workflow>
  updateWorkflow(workflowId: string, updates: UpdateWorkflowRequest): Promise<Workflow>
  activateWorkflow(workflowId: string): Promise<void>
  pauseWorkflow(workflowId: string): Promise<void>
  getWorkflowAnalytics(workflowId: string): Promise<WorkflowAnalytics>
  testWorkflow(workflowId: string, testData: TestData): Promise<TestResult>
}
```

### Composants Frontend

#### CampaignBuilder
```typescript
interface CampaignBuilderProps {
  campaignType: CampaignType
  onSave: (campaign: CampaignData) => void
  onPreview: (campaign: CampaignData) => void
  templates: CampaignTemplate[]
  segments: Segment[]
}
```

#### EmailEditor
```typescript
interface EmailEditorProps {
  content?: EmailContent
  templates: EmailTemplate[]
  personalizations: PersonalizationField[]
  onSave: (content: EmailContent) => void
  onPreview: (content: EmailContent) => void
}
```

#### AutomationFlowBuilder
```typescript
interface AutomationFlowBuilderProps {
  workflow?: Workflow
  triggers: TriggerType[]
  actions: ActionType[]
  conditions: ConditionType[]
  onSave: (workflow: WorkflowData) => void
  onTest: (workflow: WorkflowData) => void
}
```

## Data Models

### Core Entities

```typescript
interface Campaign {
  id: string
  organizationId: string
  
  // Basic Info
  name: string
  description?: string
  type: CampaignType
  status: CampaignStatus
  
  // Content
  subject?: string // for email campaigns
  content: CampaignContent
  
  // Audience
  segments: string[]
  totalRecipients: number
  
  // Scheduling
  sendDate?: Date
  timezone: string
  
  // Settings
  settings: CampaignSettings
  
  // Tracking
  trackingEnabled: boolean
  utmParameters?: UTMParameters
  
  // Performance
  stats: CampaignStats
  
  // Metadata
  tags: string[]
  createdBy: string
  
  createdAt: Date
  updatedAt: Date
}

interface Segment {
  id: string
  organizationId: string
  
  // Basic Info
  name: string
  description?: string
  
  // Criteria
  criteria: SegmentCriteria
  
  // Dynamic vs Static
  dynamic: boolean
  lastUpdated?: Date
  
  // Size
  contactCount: number
  estimatedSize?: number
  
  // Performance
  averageEngagement?: number
  conversionRate?: number
  
  // Metadata
  tags: string[]
  createdBy: string
  
  createdAt: Date
  updatedAt: Date
}

interface Workflow {
  id: string
  organizationId: string
  
  // Basic Info
  name: string
  description?: string
  
  // Configuration
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  
  // Status
  status: WorkflowStatus
  
  // Performance
  stats: WorkflowStats
  
  // Settings
  settings: WorkflowSettings
  
  // Metadata
  tags: string[]
  createdBy: string
  
  createdAt: Date
  updatedAt: Date
}

interface Contact {
  id: string
  organizationId: string
  
  // Personal Info
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  
  // Consent
  consents: ConsentRecord[]
  
  // Engagement
  engagementScore: number
  lastActivity?: Date
  
  // Segmentation
  tags: string[]
  customFields: Record<string, any>
  
  // Lifecycle
  lifecycleStage: LifecycleStage
  leadScore?: number
  
  // Communication Preferences
  preferences: CommunicationPreferences
  
  // Tracking
  source: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  
  createdAt: Date
  updatedAt: Date
}
```

### Supporting Types

```typescript
interface CampaignContent {
  // Email specific
  htmlContent?: string
  textContent?: string
  preheader?: string
  
  // SMS specific
  message?: string
  
  // Social specific
  posts?: SocialPost[]
  
  // Landing page specific
  pageContent?: LandingPageContent
  
  // Personalization
  personalizations: PersonalizationRule[]
  
  // Assets
  images: string[]
  attachments?: string[]
}

interface SegmentCriteria {
  conditions: SegmentCondition[]
  logic: 'AND' | 'OR'
  
  // Quick filters
  tags?: string[]
  excludeTags?: string[]
  
  // Behavioral
  engagementLevel?: 'HIGH' | 'MEDIUM' | 'LOW'
  lastActivityDays?: number
  
  // Demographic
  location?: LocationCriteria
  ageRange?: AgeRange
  
  // Transactional
  purchaseHistory?: PurchaseCriteria
  totalSpent?: AmountRange
}

interface SegmentCondition {
  field: string
  operator: ConditionOperator
  value: any
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY'
}

interface WorkflowTrigger {
  type: TriggerType
  configuration: TriggerConfiguration
  
  // Timing
  delay?: number // minutes
  
  // Conditions
  conditions?: WorkflowCondition[]
}

interface WorkflowStep {
  id: string
  type: StepType
  configuration: StepConfiguration
  
  // Flow control
  nextSteps: string[]
  conditions?: WorkflowCondition[]
  
  // Timing
  delay?: number // minutes
  
  // Performance
  stats?: StepStats
}

interface ConsentRecord {
  type: ConsentType
  granted: boolean
  grantedAt?: Date
  revokedAt?: Date
  source: string
  ipAddress?: string
  userAgent?: string
  doubleOptIn?: boolean
}

enum CampaignType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  SOCIAL = 'SOCIAL',
  PUSH = 'PUSH',
  MULTICHANNEL = 'MULTICHANNEL'
}

enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED'
}

enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED'
}

enum TriggerType {
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  LINK_CLICKED = 'LINK_CLICKED',
  FORM_SUBMITTED = 'FORM_SUBMITTED',
  PURCHASE_MADE = 'PURCHASE_MADE',
  DATE_BASED = 'DATE_BASED',
  SCORE_CHANGED = 'SCORE_CHANGED'
}

enum StepType {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_SMS = 'SEND_SMS',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  UPDATE_FIELD = 'UPDATE_FIELD',
  WAIT = 'WAIT',
  CONDITION = 'CONDITION',
  WEBHOOK = 'WEBHOOK'
}

enum ConsentType {
  EMAIL_MARKETING = 'EMAIL_MARKETING',
  SMS_MARKETING = 'SMS_MARKETING',
  PHONE_MARKETING = 'PHONE_MARKETING',
  PROFILING = 'PROFILING',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING'
}
```

## Error Handling

### Stratégie de Gestion d'Erreurs

```typescript
enum MarketingErrorCode {
  INVALID_EMAIL_CONTENT = 'INVALID_EMAIL_CONTENT',
  SEGMENT_TOO_LARGE = 'SEGMENT_TOO_LARGE',
  INSUFFICIENT_CONSENT = 'INSUFFICIENT_CONSENT',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  PERSONALIZATION_ERROR = 'PERSONALIZATION_ERROR',
  WORKFLOW_EXECUTION_FAILED = 'WORKFLOW_EXECUTION_FAILED'
}

interface MarketingError {
  code: MarketingErrorCode
  message: string
  details?: any
  timestamp: Date
  campaignId?: string
  contactId?: string
  workflowId?: string
  recoverable: boolean
  gdprImpact: boolean
}
```

### Gestion des Cas d'Erreur

1. **Erreurs de Conformité RGPD**
   - Validation stricte des consentements
   - Blocage automatique des envois non conformes
   - Audit trail complet

2. **Erreurs de Livraison**
   - Retry avec backoff exponentiel
   - Fallback sur canaux alternatifs
   - Gestion des bounces et suppressions

3. **Erreurs de Personnalisation**
   - Fallback sur contenu générique
   - Validation des données avant envoi
   - Logs détaillés des échecs

## Testing Strategy

### Tests Unitaires
- Logique de segmentation
- Moteur de personnalisation
- Calculs d'engagement

### Tests d'Intégration
- Intégrations email/SMS
- APIs réseaux sociaux
- Webhooks externes

### Tests de Conformité
- Validation RGPD
- Gestion des consentements
- Audit trails

### Tests de Performance
- Envois en masse
- Traitement des workflows
- Optimisation des requêtes