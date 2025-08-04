# Design Document - Gestion des présences aux événements

## Overview

Le système de gestion des présences aux événements permet de tracer précisément qui assiste aux événements, avec des méthodes d'enregistrement multiples (QR codes, NFC, reconnaissance faciale), suivi temps réel, et génération d'attestations. Il fait le pont entre la gestion d'événements et la gestion de présence générale.

## Architecture

### Architecture Générale

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Check-in Interface] --> B[Organizer Dashboard]
        A --> C[Participant Mobile App]
        B --> D[Real-time Analytics]
    end
    
    subgraph "API Gateway"
        E[Authentication Service]
        F[Rate Limiting]
        G[Attendance Routing]
    end
    
    subgraph "Business Logic Layer"
        H[Attendance Service]
        I[Check-in Service]
        J[Validation Service]
        K[Certificate Service]
        L[Analytics Service]
    end
    
    subgraph "Data Layer"
        M[(Firestore)]
        N[(Firebase Storage)]
        O[Redis Cache]
        P[Time Series DB]
    end
    
    subgraph "External Integrations"
        Q[QR Code Generator]
        R[NFC Reader API]
        S[Face Recognition API]
        T[Email Service]
        U[PDF Generator]
    end
    
    A --> E
    B --> E
    E --> H
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    I --> Q
    I --> R
    I --> S
    K --> U
    L --> P
```

### Diagramme de Flow - Processus d'Enregistrement

```mermaid
flowchart TD
    A[Participant arrive à l'événement] --> B{Méthode d'enregistrement?}
    
    B -->|QR Code| C[Scan QR personnel]
    B -->|NFC| D[Tap badge NFC]
    B -->|Reconnaissance faciale| E[Scan visage]
    B -->|Manuel| F[Recherche par nom/email]
    B -->|Badge employé| G[Scan badge organisation]
    
    C --> H[Validation QR code]
    D --> I[Validation badge NFC]
    E --> J[Validation biométrique]
    F --> K[Validation manuelle]
    G --> L[Validation badge employé]
    
    H --> M{Participant inscrit?}
    I --> M
    J --> M
    K --> M
    L --> M
    
    M -->|Non inscrit| N{Inscription sur place autorisée?}
    M -->|Inscrit| O{Déjà enregistré?}
    
    N -->|Non| P[Refus d'accès]
    N -->|Oui| Q{Places disponibles?}
    
    Q -->|Non| R[Ajout liste d'attente]
    Q -->|Oui| S[Inscription express]
    
    O -->|Oui| T[Alerte double enregistrement]
    O -->|Non| U[Enregistrement présence]
    
    S --> U
    U --> V[Génération badge/bracelet]
    U --> W[Mise à jour compteurs temps réel]
    U --> X[Notification organisateur]
    U --> Y[Confirmation participant]
    
    T --> Z{Forcer réenregistrement?}
    Z -->|Oui| U
    Z -->|Non| AA[Maintien statut existant]
    
    P --> BB[Log tentative refusée]
    R --> CC[Notification liste d'attente]
    
    V --> DD[Accès autorisé à l'événement]
    Y --> DD
    AA --> DD
```

### Diagramme de Flow - Suivi Temps Réel

```mermaid
flowchart TD
    A[Événement en cours] --> B[Dashboard temps réel actif]
    
    B --> C[Collecte données présence]
    C --> D[Mise à jour métriques]
    
    D --> E[Calcul statistiques]
    E --> F{Seuils atteints?}
    
    F -->|Capacité max| G[Alerte capacité maximale]
    F -->|Quorum min| H[Alerte quorum minimum]
    F -->|Retards importants| I[Alerte retards]
    F -->|Normal| J[Mise à jour dashboard]
    
    G --> K[Notification organisateur]
    H --> K
    I --> K
    
    K --> L[Actions correctives suggérées]
    J --> M[Affichage temps réel]
    
    L --> N{Action organisateur?}
    N -->|Fermer inscriptions| O[Blocage nouvelles entrées]
    N -->|Ouvrir salle annexe| P[Mise à jour capacité]
    N -->|Reporter début| Q[Notification participants]
    N -->|Aucune| M
    
    O --> M
    P --> M
    Q --> M
    
    M --> R{Événement terminé?}
    R -->|Non| C
    R -->|Oui| S[Génération rapport final]
    
    S --> T[Calcul statistiques finales]
    T --> U[Génération attestations]
    T --> V[Archivage données]
```

### Diagrammes de Séquence

#### Séquence d'Enregistrement QR Code

```mermaid
sequenceDiagram
    participant P as Participant
    participant M as Mobile App
    participant S as Scanner
    participant G as API Gateway
    participant A as Attendance Service
    participant E as Event Service
    participant D as Database
    participant N as Notification Service
    
    P->>M: Ouvre QR code personnel
    P->>S: Présente QR code au scanner
    S->>G: POST /api/attendance/checkin
    G->>A: Route vers Attendance Service
    
    A->>A: Décode et valide QR code
    A->>E: Vérifie inscription événement
    E-->>A: Confirme inscription valide
    
    A->>D: Vérifie présence existante
    D-->>A: Retourne statut présence
    
    alt Première présence
        A->>D: Enregistre check-in
        D-->>A: Confirme enregistrement
        
        A->>N: Déclenche notifications
        N->>P: Confirmation check-in
        N->>E: Notification organisateur
        
        A-->>G: Succès + détails présence
        G-->>S: HTTP 200 + badge info
        S-->>P: Affiche confirmation + badge
        
    else Déjà présent
        A-->>G: Erreur déjà enregistré
        G-->>S: HTTP 409 + détails
        S-->>P: Affiche statut existant
    end
```

#### Séquence de Validation Manuelle

```mermaid
sequenceDiagram
    participant O as Organisateur
    participant UI as Check-in UI
    participant G as API Gateway
    participant A as Attendance Service
    participant V as Validation Service
    participant D as Database
    participant N as Notification Service
    
    O->>UI: Recherche participant
    UI->>G: GET /api/events/{id}/participants?search=
    G->>A: Route vers Attendance Service
    
    A->>D: Recherche participants inscrits
    D-->>A: Retourne résultats recherche
    A-->>G: Liste participants
    G-->>UI: Affiche résultats
    
    O->>UI: Sélectionne participant
    UI->>G: POST /api/attendance/manual-checkin
    G->>A: Route vers Attendance Service
    
    A->>V: Valide permissions organisateur
    V-->>A: Confirme autorisation
    
    A->>D: Enregistre présence manuelle
    D-->>A: Confirme enregistrement
    
    A->>N: Déclenche notifications
    N->>O: Confirmation enregistrement
    
    A-->>G: Succès
    G-->>UI: Mise à jour interface
    UI-->>O: Affiche confirmation
```

## Components and Interfaces

### Services Backend

#### AttendanceService
```typescript
interface AttendanceService {
  checkIn(eventId: string, method: CheckInMethod, data: CheckInData): Promise<AttendanceRecord>
  checkOut(eventId: string, participantId: string): Promise<AttendanceRecord>
  getAttendanceStatus(eventId: string, participantId: string): Promise<AttendanceStatus>
  getRealTimeStats(eventId: string): Promise<RealTimeStats>
  getAttendanceHistory(eventId: string): Promise<AttendanceRecord[]>
  bulkCheckIn(eventId: string, participants: BulkCheckInData[]): Promise<BulkCheckInResult>
}
```

#### ValidationService
```typescript
interface ValidationService {
  validateQRCode(qrCode: string, eventId: string): Promise<ValidationResult>
  validateNFC(nfcData: string, eventId: string): Promise<ValidationResult>
  validateBiometric(biometricData: BiometricData, eventId: string): Promise<ValidationResult>
  validateManualEntry(participantId: string, eventId: string, organizerId: string): Promise<ValidationResult>
}
```

#### CertificateService
```typescript
interface CertificateService {
  generateAttendanceCertificate(attendanceId: string): Promise<Certificate>
  bulkGenerateCertificates(eventId: string): Promise<Certificate[]>
  validateCertificate(certificateId: string): Promise<CertificateValidation>
  customizeCertificateTemplate(organizationId: string, template: CertificateTemplate): Promise<void>
}
```

### Composants Frontend

#### CheckInInterface
```typescript
interface CheckInInterfaceProps {
  eventId: string
  methods: CheckInMethod[]
  onCheckIn: (result: CheckInResult) => void
  onError: (error: CheckInError) => void
  realTimeMode: boolean
}
```

#### AttendanceDashboard
```typescript
interface AttendanceDashboardProps {
  eventId: string
  realTimeStats: RealTimeStats
  attendanceRecords: AttendanceRecord[]
  onExportData: (format: ExportFormat) => void
  onGenerateCertificates: () => void
}
```

#### QRCodeScanner
```typescript
interface QRCodeScannerProps {
  eventId: string
  onScanSuccess: (qrData: string) => void
  onScanError: (error: ScanError) => void
  continuousMode: boolean
  soundEnabled: boolean
}
```

## Data Models

### Core Entities

```typescript
interface AttendanceRecord {
  id: string
  eventId: string
  participantId: string
  organizationId: string
  
  // Check-in Details
  checkInTime: Date
  checkInMethod: CheckInMethod
  checkInLocation?: GeoLocation
  checkInDevice?: DeviceInfo
  checkInBy?: string // ID of person who performed manual check-in
  
  // Check-out Details (optional)
  checkOutTime?: Date
  checkOutMethod?: CheckInMethod
  checkOutLocation?: GeoLocation
  
  // Duration
  duration?: number // minutes
  
  // Validation
  validated: boolean
  validatedBy?: string
  validatedAt?: Date
  validationNotes?: string
  
  // Status
  status: AttendanceStatus
  
  // Additional Data
  customData?: Record<string, any>
  notes?: string
  
  // Metadata
  source: 'QR_CODE' | 'NFC' | 'BIOMETRIC' | 'MANUAL' | 'BULK_IMPORT'
  
  createdAt: Date
  updatedAt: Date
}

interface CheckInMethod {
  type: 'QR_CODE' | 'NFC' | 'BIOMETRIC' | 'MANUAL' | 'BADGE'
  enabled: boolean
  configuration?: {
    // QR Code settings
    qrCodeExpiry?: number // minutes
    qrCodeRefreshInterval?: number // minutes
    
    // NFC settings
    nfcTimeout?: number // seconds
    nfcRetryAttempts?: number
    
    // Biometric settings
    biometricThreshold?: number // confidence level 0-1
    biometricFallback?: boolean
    
    // Manual settings
    requiresApproval?: boolean
    allowedRoles?: string[]
    
    // Badge settings
    badgeTypes?: string[]
    badgeValidation?: 'STRICT' | 'LENIENT'
  }
}

interface RealTimeStats {
  eventId: string
  timestamp: Date
  
  // Capacity
  totalCapacity: number
  currentAttendance: number
  availableSpots: number
  waitlistCount: number
  
  // Registration vs Attendance
  totalRegistered: number
  checkedIn: number
  noShows: number
  attendanceRate: number // percentage
  
  // Timing
  eventStartTime: Date
  eventEndTime?: Date
  averageCheckInTime: number // minutes from event start
  lateArrivals: number
  
  // Methods
  checkInMethodStats: {
    method: CheckInMethod['type']
    count: number
    percentage: number
  }[]
  
  // Trends
  checkInTrend: {
    timestamp: Date
    cumulativeCount: number
  }[]
  
  // Alerts
  activeAlerts: Alert[]
}

interface Certificate {
  id: string
  attendanceRecordId: string
  eventId: string
  participantId: string
  organizationId: string
  
  // Certificate Details
  certificateNumber: string
  issueDate: Date
  validUntil?: Date
  
  // Content
  title: string
  description: string
  participantName: string
  eventTitle: string
  eventDate: Date
  duration?: number // minutes
  
  // Validation
  verificationCode: string
  digitalSignature: string
  
  // Files
  pdfUrl: string
  thumbnailUrl?: string
  
  // Template
  templateId: string
  templateVersion: string
  
  // Status
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  
  createdAt: Date
  updatedAt: Date
}
```

### Supporting Types

```typescript
interface CheckInData {
  // Common
  participantId?: string
  eventId: string
  timestamp: Date
  location?: GeoLocation
  deviceInfo?: DeviceInfo
  
  // Method-specific data
  qrCode?: string
  nfcData?: string
  biometricData?: BiometricData
  manualEntry?: {
    searchTerm: string
    selectedParticipant: string
    performedBy: string
    reason?: string
  }
  badgeData?: {
    badgeId: string
    badgeType: string
    employeeId?: string
  }
}

interface BiometricData {
  type: 'FACE' | 'FINGERPRINT' | 'IRIS'
  data: string // base64 encoded
  confidence: number
  deviceId: string
  timestamp: Date
}

interface ValidationResult {
  valid: boolean
  participantId?: string
  participantInfo?: ParticipantInfo
  errorCode?: ValidationErrorCode
  errorMessage?: string
  warnings?: string[]
  metadata?: Record<string, any>
}

interface Alert {
  id: string
  type: 'CAPACITY_WARNING' | 'CAPACITY_FULL' | 'LOW_ATTENDANCE' | 'TECHNICAL_ISSUE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  actions?: AlertAction[]
}

interface AlertAction {
  id: string
  label: string
  action: string
  parameters?: Record<string, any>
  requiresConfirmation: boolean
}

enum AttendanceStatus {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  LEFT_EARLY = 'LEFT_EARLY',
  PENDING_VALIDATION = 'PENDING_VALIDATION'
}

enum ValidationErrorCode {
  INVALID_QR_CODE = 'INVALID_QR_CODE',
  EXPIRED_QR_CODE = 'EXPIRED_QR_CODE',
  PARTICIPANT_NOT_REGISTERED = 'PARTICIPANT_NOT_REGISTERED',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  EVENT_NOT_STARTED = 'EVENT_NOT_STARTED',
  EVENT_ENDED = 'EVENT_ENDED',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  BIOMETRIC_MATCH_FAILED = 'BIOMETRIC_MATCH_FAILED',
  NFC_READ_ERROR = 'NFC_READ_ERROR',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS'
}
```

## Error Handling

### Stratégie de Gestion d'Erreurs

```typescript
interface AttendanceError {
  code: ValidationErrorCode
  message: string
  details?: any
  timestamp: Date
  eventId?: string
  participantId?: string
  method?: CheckInMethod['type']
  recoverable: boolean
  suggestedActions?: string[]
}
```

### Gestion des Cas d'Erreur

1. **Erreurs de Lecture**
   - Retry automatique pour QR/NFC
   - Fallback sur méthodes alternatives
   - Mode dégradé manuel

2. **Erreurs de Validation**
   - Messages contextuels
   - Suggestions de correction
   - Escalade vers organisateur

3. **Erreurs de Connectivité**
   - Mode hors-ligne avec synchronisation
   - Queue des enregistrements
   - Résolution des conflits

## Testing Strategy

### Tests Unitaires
- Services de validation
- Logique de génération de certificats
- Calculs statistiques temps réel

### Tests d'Intégration
- Intégrations biométriques
- Génération PDF
- Synchronisation temps réel

### Tests End-to-End
- Parcours complet check-in
- Tests multi-méthodes
- Tests de charge sur événements

### Tests de Performance
- Gestion d'affluence massive
- Optimisation temps de réponse
- Scalabilité temps réel