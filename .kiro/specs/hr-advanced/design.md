# Design Document - Ressources Humaines Avancées

## Overview

Le système de RH avancées étend les fonctionnalités de base avec la gestion des paies, évaluations de performance, formation et développement, recrutement, et gestion des talents. L'architecture est conçue pour s'intégrer avec les systèmes existants tout en respectant les réglementations sociales et fiscales.

## Architecture

### Architecture Générale

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[HR Dashboard] --> B[Payroll Interface]
        A --> C[Performance Management]
        B --> D[Training Portal]
        C --> E[Recruitment System]
        D --> F[Employee Self-Service]
    end
    
    subgraph "API Gateway"
        G[Authentication Service]
        H[Rate Limiting]
        I[HR Routing]
        J[Compliance Validation]
    end
    
    subgraph "Business Logic Layer"
        K[Payroll Service]
        L[Performance Service]
        M[Training Service]
        N[Recruitment Service]
        O[Talent Service]
        P[Compliance Service]
    end
    
    subgraph "Data Layer"
        Q[(Employee DB)]
        R[(Payroll DB)]
        S[(Document Storage)]
        T[Audit Trail]
        U[Cache Layer]
    end
    
    subgraph "External Integrations"
        V[Banking Systems]
        W[Tax Authorities]
        X[Training Providers]
        Y[Job Boards]
        Z[Background Check APIs]
    end
    
    A --> G
    F --> G
    G --> K
    K --> L
    K --> M
    K --> N
    K --> O
    K --> P
    K --> Q
    K --> V
    P --> W
    M --> X
    N --> Y
    N --> Z
```

### Diagramme de Flow - Processus de Paie

```mermaid
flowchart TD
    A[Début période paie] --> B[Collecte données présence]
    B --> C[Récupération variables paie]
    
    C --> D[Calcul salaire de base]
    D --> E[Application heures supplémentaires]
    E --> F[Ajout primes et indemnités]
    
    F --> G[Calcul brut total]
    G --> H[Application cotisations sociales]
    H --> I[Calcul impôt sur le revenu]
    
    I --> J[Calcul net à payer]
    J --> K[Génération bulletin paie]
    
    K --> L{Validation RH?}
    L -->|Refus| M[Corrections nécessaires]
    L -->|Approbation| N[Signature électronique]
    
    M --> O[Ajustements manuels]
    O --> D
    
    N --> P[Envoi bulletin employé]
    P --> Q[Génération virements]
    
    Q --> R[Préparation déclarations sociales]
    R --> S[Export comptabilité]
    
    S --> T[Archivage documents]
    T --> U[Mise à jour historique]
    
    U --> V{Tous employés traités?}
    V -->|Non| W[Employé suivant]
    V -->|Oui| X[Clôture période paie]
    
    W --> B
    X --> Y[Transmission déclarations]
    Y --> Z[Paie terminée]
```

### Diagramme de Flow - Processus d'Évaluation

```mermaid
flowchart TD
    A[Lancement campagne évaluation] --> B[Configuration critères]
    B --> C[Sélection employés concernés]
    
    C --> D[Génération formulaires personnalisés]
    D --> E[Notification managers et employés]
    
    E --> F[Auto-évaluation employé]
    F --> G[Évaluation manager]
    
    G --> H{Évaluation 360° activée?}
    H -->|Oui| I[Collecte feedback pairs]
    H -->|Non| J[Compilation résultats]
    
    I --> K[Agrégation feedback 360°]
    K --> J
    
    J --> L[Calcul scores globaux]
    L --> M[Identification écarts performance]
    
    M --> N[Génération recommandations]
    N --> O[Planification entretien]
    
    O --> P[Entretien manager-employé]
    P --> Q[Définition objectifs futurs]
    
    Q --> R[Plan de développement]
    R --> S[Validation finale]
    
    S --> T{Validation OK?}
    T -->|Non| U[Révisions nécessaires]
    T -->|Oui| V[Archivage évaluation]
    
    U --> Q
    V --> W[Mise à jour profil employé]
    W --> X[Déclenchement actions RH]
    
    X --> Y{Actions requises?}
    Y -->|Formation| Z[Inscription formations]
    Y -->|Promotion| AA[Processus promotion]
    Y -->|Amélioration| BB[Plan amélioration]
    Y -->|Aucune| CC[Évaluation terminée]
    
    Z --> CC
    AA --> CC
    BB --> CC
```

### Diagrammes de Séquence

#### Séquence de Calcul de Paie

```mermaid
sequenceDiagram
    participant HR as HR Manager
    participant UI as Payroll UI
    participant G as API Gateway
    participant P as Payroll Service
    participant A as Attendance Service
    participant T as Tax Service
    participant B as Banking Service
    participant D as Database
    participant E as Employee
    
    HR->>UI: Lance calcul paie mensuel
    UI->>G: POST /api/payroll/calculate
    G->>P: Route vers Payroll Service
    
    P->>A: Récupère données présence
    A-->>P: Retourne heures travaillées
    
    P->>D: Récupère variables paie employé
    D-->>P: Retourne salaire, primes, etc.
    
    P->>P: Calcule salaire brut
    
    P->>T: Calcule cotisations et impôts
    T-->>P: Retourne montants déductions
    
    P->>P: Calcule salaire net
    
    P->>D: Sauvegarde bulletin paie
    D-->>P: Confirme sauvegarde
    
    P->>B: Prépare virement bancaire
    B-->>P: Confirme préparation
    
    P-->>G: Retourne bulletin généré
    G-->>UI: HTTP 200 + détails paie
    UI-->>HR: Affiche bulletin pour validation
    
    HR->>UI: Valide et envoie
    UI->>G: POST /api/payroll/send
    G->>P: Confirme envoi
    
    P->>E: Envoie bulletin par email
    P->>B: Exécute virement
    
    P-->>G: Confirme envoi complet
    G-->>UI: HTTP 200
    UI-->>HR: Confirmation envoi
```

#### Séquence de Processus de Recrutement

```mermaid
sequenceDiagram
    participant HR as HR Manager
    participant UI as Recruitment UI
    participant G as API Gateway
    participant R as Recruitment Service
    participant J as Job Board API
    participant C as Candidate
    participant A as ATS System
    participant B as Background Check
    participant M as Manager
    
    HR->>UI: Crée offre d'emploi
    UI->>G: POST /api/recruitment/jobs
    G->>R: Route vers Recruitment Service
    
    R->>A: Enregistre offre dans ATS
    A-->>R: Confirme enregistrement
    
    R->>J: Publie sur job boards
    J-->>R: Confirme publication
    
    R-->>G: Retourne offre créée
    G-->>UI: HTTP 201 + détails offre
    
    Note over C,A: Candidature
    
    C->>A: Postule via job board
    A->>R: Notifie nouvelle candidature
    
    R->>R: Score automatique candidat
    
    alt Score élevé
        R->>HR: Notification candidat prometteur
        HR->>UI: Consulte profil candidat
        
        HR->>UI: Programme entretien
        UI->>G: POST /api/recruitment/interviews
        G->>R: Crée entretien
        
        R->>C: Invitation entretien
        R->>M: Notification entretien manager
        
        Note over M,C: Entretien
        
        M->>UI: Saisit feedback entretien
        UI->>G: POST /api/recruitment/feedback
        G->>R: Enregistre feedback
        
        alt Feedback positif
            R->>B: Lance vérifications background
            B-->>R: Retourne résultats vérification
            
            alt Vérifications OK
                R->>HR: Recommande embauche
                HR->>UI: Génère offre d'emploi
                UI->>C: Envoie offre contractuelle
            end
        end
    end
```

## Components and Interfaces

### Services Backend

#### PayrollService
```typescript
interface PayrollService {
  calculatePayroll(employeeId: string, period: PayrollPeriod): Promise<PayrollCalculation>
  generatePayslip(calculationId: string): Promise<Payslip>
  processPayrollBatch(organizationId: string, period: PayrollPeriod): Promise<BatchResult>
  getPayrollHistory(employeeId: string, period?: DateRange): Promise<PayrollHistory[]>
  exportPayrollData(organizationId: string, period: PayrollPeriod, format: ExportFormat): Promise<Buffer>
  validatePayrollData(data: PayrollData): Promise<ValidationResult>
}
```

#### PerformanceService
```typescript
interface PerformanceService {
  createEvaluationCampaign(campaign: EvaluationCampaign): Promise<Campaign>
  startEvaluation(employeeId: string, campaignId: string): Promise<Evaluation>
  submitEvaluation(evaluationId: string, responses: EvaluationResponse[]): Promise<void>
  calculatePerformanceScore(evaluationId: string): Promise<PerformanceScore>
  generatePerformanceReport(employeeId: string, period: DateRange): Promise<PerformanceReport>
  getPerformanceTrends(organizationId: string, period: DateRange): Promise<PerformanceTrends>
}
```

#### TrainingService
```typescript
interface TrainingService {
  createTrainingProgram(program: TrainingProgram): Promise<Program>
  enrollEmployee(employeeId: string, programId: string): Promise<Enrollment>
  trackProgress(enrollmentId: string): Promise<TrainingProgress>
  generateCertificate(enrollmentId: string): Promise<Certificate>
  getTrainingCatalog(filters?: TrainingFilters): Promise<TrainingCatalog>
  getSkillsMatrix(organizationId: string): Promise<SkillsMatrix>
}
```

### Composants Frontend

#### PayrollDashboard
```typescript
interface PayrollDashboardProps {
  organizationId: string
  period: PayrollPeriod
  employees: Employee[]
  onCalculatePayroll: (employeeIds: string[]) => void
  onExportPayroll: (format: ExportFormat) => void
  onValidatePayroll: (calculationId: string) => void
}
```

#### PerformanceReview
```typescript
interface PerformanceReviewProps {
  evaluation: Evaluation
  employee: Employee
  manager: Employee
  onSubmitReview: (responses: EvaluationResponse[]) => void
  onSaveDraft: (responses: EvaluationResponse[]) => void
  readonly?: boolean
}
```

#### TrainingPortal
```typescript
interface TrainingPortalProps {
  employeeId: string
  availablePrograms: TrainingProgram[]
  enrolledPrograms: Enrollment[]
  onEnroll: (programId: string) => void
  onContinueTraining: (enrollmentId: string) => void
  onRequestCertificate: (enrollmentId: string) => void
}
```

## Data Models

### Core Entities

```typescript
interface Employee {
  id: string
  organizationId: string
  
  // Personal Information
  personalInfo: {
    firstName: string
    lastName: string
    dateOfBirth: Date
    nationality: string
    maritalStatus: MaritalStatus
    dependents: number
    address: Address
    phone: string
    email: string
    emergencyContact: EmergencyContact
  }
  
  // Employment Information
  employment: {
    employeeNumber: string
    startDate: Date
    endDate?: Date
    department: string
    position: string
    level: string
    manager: string
    workLocation: string
    contractType: ContractType
    workingHours: number
    probationEndDate?: Date
  }
  
  // Compensation
  compensation: {
    baseSalary: number
    currency: string
    payFrequency: PayFrequency
    bankAccount: BankAccount
    taxInfo: TaxInformation
    benefits: Benefit[]
  }
  
  // Performance
  performance: {
    currentRating?: PerformanceRating
    lastEvaluationDate?: Date
    goals: Goal[]
    skills: Skill[]
    certifications: Certification[]
  }
  
  // Status
  status: EmployeeStatus
  
  createdAt: Date
  updatedAt: Date
}

interface PayrollCalculation {
  id: string
  employeeId: string
  organizationId: string
  period: PayrollPeriod
  
  // Earnings
  earnings: {
    baseSalary: number
    overtime: number
    bonuses: number
    commissions: number
    allowances: number
    totalGross: number
  }
  
  // Deductions
  deductions: {
    socialSecurity: number
    healthInsurance: number
    retirement: number
    incomeTax: number
    otherDeductions: number
    totalDeductions: number
  }
  
  // Net Pay
  netPay: number
  
  // Hours
  hoursWorked: {
    regular: number
    overtime: number
    vacation: number
    sick: number
    total: number
  }
  
  // Status
  status: PayrollStatus
  calculatedAt: Date
  approvedBy?: string
  approvedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

interface Evaluation {
  id: string
  employeeId: string
  managerId: string
  organizationId: string
  campaignId: string
  
  // Period
  evaluationPeriod: DateRange
  
  // Responses
  selfEvaluation?: EvaluationResponse[]
  managerEvaluation?: EvaluationResponse[]
  peerEvaluations?: PeerEvaluation[]
  
  // Scores
  overallScore?: number
  categoryScores: CategoryScore[]
  
  // Goals
  previousGoals: GoalReview[]
  newGoals: Goal[]
  
  // Development
  developmentPlan?: DevelopmentPlan
  trainingRecommendations: string[]
  
  // Status
  status: EvaluationStatus
  
  // Meetings
  meetingScheduled?: Date
  meetingCompleted?: Date
  meetingNotes?: string
  
  createdAt: Date
  updatedAt: Date
}

interface TrainingProgram {
  id: string
  organizationId: string
  
  // Basic Info
  title: string
  description: string
  category: string
  level: TrainingLevel
  
  // Content
  modules: TrainingModule[]
  duration: number // hours
  format: TrainingFormat
  
  // Requirements
  prerequisites: string[]
  targetAudience: string[]
  maxParticipants?: number
  
  // Certification
  certificateAwarded: boolean
  certificateTemplate?: string
  validityPeriod?: number // months
  
  // Delivery
  instructor?: Instructor
  schedule?: TrainingSchedule[]
  location?: string
  virtualMeetingUrl?: string
  
  // Status
  status: ProgramStatus
  
  // Metadata
  tags: string[]
  createdBy: string
  
  createdAt: Date
  updatedAt: Date
}
```

### Supporting Types

```typescript
interface PayrollPeriod {
  year: number
  month: number
  startDate: Date
  endDate: Date
  payDate: Date
}

interface EvaluationResponse {
  questionId: string
  question: string
  response: any
  score?: number
  comments?: string
}

interface Goal {
  id: string
  title: string
  description: string
  category: GoalCategory
  priority: Priority
  targetDate: Date
  status: GoalStatus
  progress: number // 0-100
  metrics: GoalMetric[]
}

interface Skill {
  id: string
  name: string
  category: string
  level: SkillLevel
  assessedDate?: Date
  certificationRequired: boolean
  expiryDate?: Date
}

interface TrainingModule {
  id: string
  title: string
  description: string
  content: ModuleContent
  duration: number // minutes
  order: number
  mandatory: boolean
  assessmentRequired: boolean
}

interface Benefit {
  type: BenefitType
  name: string
  value: number
  currency?: string
  startDate: Date
  endDate?: Date
  eligibilityRules: string[]
}

enum ContractType {
  PERMANENT = 'PERMANENT',
  TEMPORARY = 'TEMPORARY',
  CONTRACTOR = 'CONTRACTOR',
  INTERN = 'INTERN',
  PART_TIME = 'PART_TIME'
}

enum PayFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY'
}

enum PayrollStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

enum EvaluationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_MEETING = 'PENDING_MEETING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

enum TrainingLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

enum TrainingFormat {
  ONLINE = 'ONLINE',
  CLASSROOM = 'CLASSROOM',
  BLENDED = 'BLENDED',
  WORKSHOP = 'WORKSHOP',
  CONFERENCE = 'CONFERENCE'
}

enum SkillLevel {
  NOVICE = 'NOVICE',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER'
}
```

## Error Handling

### Stratégie de Gestion d'Erreurs

```typescript
enum HRErrorCode {
  PAYROLL_CALCULATION_ERROR = 'PAYROLL_CALCULATION_ERROR',
  INVALID_TAX_CONFIGURATION = 'INVALID_TAX_CONFIGURATION',
  EVALUATION_DEADLINE_PASSED = 'EVALUATION_DEADLINE_PASSED',
  TRAINING_CAPACITY_EXCEEDED = 'TRAINING_CAPACITY_EXCEEDED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  EMPLOYEE_NOT_ELIGIBLE = 'EMPLOYEE_NOT_ELIGIBLE',
  DOCUMENT_GENERATION_FAILED = 'DOCUMENT_GENERATION_FAILED'
}

interface HRError {
  code: HRErrorCode
  message: string
  details?: any
  timestamp: Date
  employeeId?: string
  organizationId?: string
  complianceImpact: boolean
  recoverable: boolean
}
```

### Gestion des Cas d'Erreur

1. **Erreurs de Conformité**
   - Validation stricte des règles légales
   - Blocage des opérations non conformes
   - Audit trail complet

2. **Erreurs de Calcul**
   - Validation croisée des montants
   - Recalcul automatique
   - Alertes sur incohérences

3. **Erreurs de Processus**
   - Workflow de validation
   - Escalade automatique
   - Notifications appropriées

## Testing Strategy

### Tests Unitaires
- Calculs de paie
- Logique d'évaluation
- Algorithmes de matching

### Tests d'Intégration
- Systèmes bancaires
- APIs gouvernementales
- Plateformes de formation

### Tests de Conformité
- Validation réglementaire
- Calculs fiscaux
- Protection des données

### Tests de Performance
- Traitement de paie en masse
- Génération de rapports
- Synchronisations externes