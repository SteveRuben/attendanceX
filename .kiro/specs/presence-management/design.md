# Design Document - Gestion de présence

## Overview

Le système de gestion de présence permet aux organisations de tracer précisément les heures de travail de leurs employés, gérer les congés et absences, et générer des rapports conformes aux obligations légales. L'architecture est conçue pour être scalable, sécurisée, et intégrée avec les systèmes RH et de paie existants.

## Architecture

### Architecture Générale

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Web App React] --> B[Mobile App PWA]
        A --> C[Admin Dashboard]
        B --> D[Employee Portal]
    end
    
    subgraph "API Gateway"
        E[Authentication Service]
        F[Rate Limiting]
        G[Request Routing]
    end
    
    subgraph "Business Logic Layer"
        H[Presence Service]
        I[Schedule Service]
        J[Leave Service]
        K[Report Service]
        L[Notification Service]
    end
    
    subgraph "Data Layer"
        M[(Firestore)]
        N[(Firebase Storage)]
        O[Redis Cache]
    end
    
    subgraph "External Integrations"
        P[Email Service]
        Q[SMS Service]
        R[Geolocation API]
        S[Biometric Devices]
    end
    
    A --> E
    B --> E
    E --> H
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    K --> N
    L --> P
    L --> Q
    H --> R
    H --> S
```

### Diagramme de Flow - Processus de Pointage

```mermaid
flowchart TD
    A[Employé arrive au travail] --> B{Méthode de pointage?}
    
    B -->|Web/Mobile| C[Interface de pointage]
    B -->|QR Code| D[Scan QR personnel]
    B -->|Biométrie| E[Scan empreinte/visage]
    B -->|Badge NFC| F[Tap badge NFC]
    
    C --> G[Vérification géolocalisation]
    D --> G
    E --> G
    F --> G
    
    G --> H{Dans zone autorisée?}
    H -->|Non| I[Alerte géolocalisation]
    H -->|Oui| J[Vérification horaires]
    
    I --> K[Notification manager]
    I --> L[Pointage en attente validation]
    
    J --> M{Dans plage horaire?}
    M -->|Retard| N[Marquage retard]
    M -->|Avance| O[Marquage avance]
    M -->|Normal| P[Pointage normal]
    
    N --> Q[Enregistrement en base]
    O --> Q
    P --> Q
    L --> Q
    
    Q --> R[Mise à jour statut temps réel]
    Q --> S[Calcul heures travaillées]
    Q --> T[Notification confirmée]
    
    R --> U[Dashboard manager mis à jour]
    S --> V[Intégration système paie]
    T --> W[Confirmation employé]
```

### Diagramme de Flow - Gestion des Congés

```mermaid
flowchart TD
    A[Employé fait demande congé] --> B[Sélection dates et type]
    B --> C[Vérification solde congés]
    
    C --> D{Solde suffisant?}
    D -->|Non| E[Erreur solde insuffisant]
    D -->|Oui| F[Vérification conflits planning]
    
    F --> G{Conflits détectés?}
    G -->|Oui| H[Alerte conflits]
    G -->|Non| I[Soumission demande]
    
    H --> J[Suggestions alternatives]
    J --> K{Employé accepte alternative?}
    K -->|Non| L[Annulation demande]
    K -->|Oui| I
    
    I --> M[Notification manager]
    M --> N[Manager consulte demande]
    
    N --> O{Décision manager?}
    O -->|Refus| P[Notification refus + raison]
    O -->|Approbation| Q[Validation demande]
    
    P --> R[Mise à jour statut demande]
    Q --> S[Blocage pointages période]
    Q --> T[Mise à jour planning équipe]
    Q --> U[Notification approbation]
    
    S --> V[Intégration système paie]
    T --> W[Réorganisation planning]
    U --> R
```

### Diagrammes de Séquence

#### Séquence de Pointage Standard

```mermaid
sequenceDiagram
    participant E as Employé
    participant A as App Mobile
    participant G as API Gateway
    participant P as Presence Service
    participant S as Schedule Service
    participant D as Database
    participant N as Notification Service
    participant M as Manager Dashboard
    
    E->>A: Ouvre app et clique "Pointer"
    A->>G: POST /api/presence/clock-in
    G->>P: Valide token et route requête
    
    P->>P: Vérifie géolocalisation
    P->>S: Vérifie horaires employé
    S-->>P: Retourne planning du jour
    
    P->>D: Enregistre pointage
    D-->>P: Confirme enregistrement
    
    P->>N: Déclenche notifications
    N->>M: Met à jour dashboard temps réel
    N->>E: Envoie confirmation
    
    P-->>G: Retourne succès
    G-->>A: HTTP 200 + détails pointage
    A-->>E: Affiche confirmation
```

#### Séquence de Demande de Congé

```mermaid
sequenceDiagram
    participant E as Employé
    participant A as App
    participant G as API Gateway
    participant L as Leave Service
    participant S as Schedule Service
    participant D as Database
    participant N as Notification Service
    participant M as Manager
    
    E->>A: Fait demande de congé
    A->>G: POST /api/leave/request
    G->>L: Route vers service congés
    
    L->>D: Vérifie solde congés employé
    D-->>L: Retourne solde disponible
    
    L->>S: Vérifie conflits planning
    S-->>L: Retourne conflits potentiels
    
    alt Solde insuffisant ou conflits majeurs
        L-->>G: Erreur validation
        G-->>A: HTTP 400 + détails erreur
        A-->>E: Affiche erreur
    else Demande valide
        L->>D: Enregistre demande (statut: pending)
        D-->>L: Confirme enregistrement
        
        L->>N: Notifie manager
        N->>M: Email/notification demande
        
        L-->>G: Succès
        G-->>A: HTTP 201 + ID demande
        A-->>E: Confirmation soumission
    end
```

## Components and Interfaces

### Services Backend

#### PresenceService
```typescript
interface PresenceService {
  clockIn(employeeId: string, location?: GeoLocation): Promise<ClockEntry>
  clockOut(employeeId: string, location?: GeoLocation): Promise<ClockEntry>
  getCurrentStatus(employeeId: string): Promise<PresenceStatus>
  getPresenceHistory(employeeId: string, period: DateRange): Promise<PresenceEntry[]>
  validatePresence(entryId: string, managerId: string): Promise<void>
}
```

#### LeaveService
```typescript
interface LeaveService {
  requestLeave(request: LeaveRequest): Promise<LeaveRequestResult>
  approveLeave(requestId: string, managerId: string): Promise<void>
  rejectLeave(requestId: string, managerId: string, reason: string): Promise<void>
  getLeaveBalance(employeeId: string): Promise<LeaveBalance>
  getLeaveHistory(employeeId: string): Promise<LeaveEntry[]>
}
```

#### ScheduleService
```typescript
interface ScheduleService {
  getEmployeeSchedule(employeeId: string, date: Date): Promise<WorkSchedule>
  updateSchedule(employeeId: string, schedule: WorkSchedule): Promise<void>
  checkScheduleConflicts(employeeId: string, period: DateRange): Promise<Conflict[]>
  getTeamSchedule(teamId: string, period: DateRange): Promise<TeamSchedule>
}
```

### Composants Frontend

#### PresenceTracker
```typescript
interface PresenceTrackerProps {
  employeeId: string
  currentStatus: PresenceStatus
  onClockIn: () => void
  onClockOut: () => void
  geolocationEnabled: boolean
}
```

#### LeaveRequestForm
```typescript
interface LeaveRequestFormProps {
  employeeId: string
  availableBalance: LeaveBalance
  onSubmit: (request: LeaveRequest) => void
  onCancel: () => void
}
```

#### PresenceDashboard
```typescript
interface PresenceDashboardProps {
  teamId: string
  employees: Employee[]
  presenceData: PresenceData[]
  onEmployeeSelect: (employeeId: string) => void
  filters: DashboardFilters
}
```

## Data Models

### Core Entities

```typescript
interface Employee {
  id: string
  organizationId: string
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  workInfo: {
    employeeNumber: string
    department: string
    position: string
    manager: string
    startDate: Date
    contractType: 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE'
  }
  schedule: WorkSchedule
  leaveEntitlements: LeaveEntitlement[]
  settings: EmployeeSettings
  createdAt: Date
  updatedAt: Date
}

interface PresenceEntry {
  id: string
  employeeId: string
  organizationId: string
  date: Date
  clockIn?: {
    timestamp: Date
    location?: GeoLocation
    method: 'WEB' | 'MOBILE' | 'QR' | 'NFC' | 'BIOMETRIC'
    deviceInfo?: DeviceInfo
  }
  clockOut?: {
    timestamp: Date
    location?: GeoLocation
    method: 'WEB' | 'MOBILE' | 'QR' | 'NFC' | 'BIOMETRIC'
    deviceInfo?: DeviceInfo
  }
  totalHours?: number
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'PENDING_VALIDATION'
  breaks: BreakEntry[]
  notes?: string
  validatedBy?: string
  validatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

interface LeaveRequest {
  id: string
  employeeId: string
  organizationId: string
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER'
  startDate: Date
  endDate: Date
  totalDays: number
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  documents?: string[]
  createdAt: Date
  updatedAt: Date
}

interface WorkSchedule {
  id: string
  employeeId: string
  organizationId: string
  name: string
  weeklySchedule: {
    monday?: DaySchedule
    tuesday?: DaySchedule
    wednesday?: DaySchedule
    thursday?: DaySchedule
    friday?: DaySchedule
    saturday?: DaySchedule
    sunday?: DaySchedule
  }
  exceptions: ScheduleException[]
  effectiveFrom: Date
  effectiveTo?: Date
  createdAt: Date
  updatedAt: Date
}

interface DaySchedule {
  workingDay: boolean
  startTime: string // "09:00"
  endTime: string   // "17:00"
  breaks: {
    startTime: string
    endTime: string
    paid: boolean
  }[]
  flexibilityMinutes?: number
}
```

### Supporting Types

```typescript
interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: Date
}

interface DeviceInfo {
  userAgent: string
  platform: string
  deviceId?: string
  ipAddress: string
}

interface BreakEntry {
  startTime: Date
  endTime?: Date
  type: 'LUNCH' | 'COFFEE' | 'PERSONAL' | 'OTHER'
  paid: boolean
}

interface LeaveBalance {
  employeeId: string
  year: number
  entitlements: {
    type: string
    totalDays: number
    usedDays: number
    remainingDays: number
    expiryDate?: Date
  }[]
  updatedAt: Date
}

interface PresenceStatus {
  employeeId: string
  currentStatus: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_BREAK'
  lastActivity?: {
    type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END'
    timestamp: Date
    location?: GeoLocation
  }
  todayHours: number
  weekHours: number
  monthHours: number
}
```

## Error Handling

### Stratégie de Gestion d'Erreurs

```typescript
enum PresenceErrorCode {
  INVALID_GEOLOCATION = 'INVALID_GEOLOCATION',
  ALREADY_CLOCKED_IN = 'ALREADY_CLOCKED_IN',
  NOT_CLOCKED_IN = 'NOT_CLOCKED_IN',
  OUTSIDE_WORK_HOURS = 'OUTSIDE_WORK_HOURS',
  INSUFFICIENT_LEAVE_BALANCE = 'INSUFFICIENT_LEAVE_BALANCE',
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  DEVICE_NOT_AUTHORIZED = 'DEVICE_NOT_AUTHORIZED'
}

interface PresenceError {
  code: PresenceErrorCode
  message: string
  details?: any
  timestamp: Date
  employeeId?: string
}
```

### Gestion des Cas d'Erreur

1. **Erreurs de Géolocalisation**
   - Validation des coordonnées GPS
   - Tolérance configurable par organisation
   - Mode dégradé sans géolocalisation

2. **Erreurs de Connectivité**
   - Mode hors-ligne avec synchronisation
   - Queue des actions en attente
   - Résolution des conflits

3. **Erreurs de Validation**
   - Validation côté client et serveur
   - Messages d'erreur contextuels
   - Suggestions de correction

## Testing Strategy

### Tests Unitaires
- Services métier (PresenceService, LeaveService)
- Utilitaires de calcul (heures, congés)
- Validateurs de données

### Tests d'Intégration
- API endpoints avec base de données
- Intégrations externes (géolocalisation, notifications)
- Workflows complets (pointage, demande congé)

### Tests End-to-End
- Parcours utilisateur complets
- Tests multi-devices
- Tests de performance et charge

### Tests de Sécurité
- Authentification et autorisation
- Validation des données sensibles
- Protection contre les attaques courantes