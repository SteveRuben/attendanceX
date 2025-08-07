# Firestore Collection Schemas - Appointment Management

This document describes the Firestore collection schemas for the appointment management system.

## Collections Overview

### 1. `appointments` Collection

**Purpose**: Stores appointment records

**Document Structure**:
```typescript
{
  // Required fields
  organizationId: string;           // Reference to organization
  clientId: string;                 // Reference to client
  practitionerId: string;           // Reference to practitioner (user)
  serviceId: string;                // Reference to service
  date: Timestamp;                  // Appointment date
  startTime: string;                // Start time in HH:MM format
  duration: number;                 // Duration in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  
  // Optional fields
  notes?: string;                   // Appointment notes
  reminders: Array<{               // Embedded reminders
    id: string;
    appointmentId: string;
    type: 'email' | 'sms';
    scheduledFor: Timestamp;
    status: 'pending' | 'sent' | 'failed';
    content: string;
    sentAt?: Timestamp;
    errorMessage?: string;
    retryCount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }>;
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId + date` (for daily view)
- `organizationId + practitionerId + date` (for practitioner schedule)
- `organizationId + clientId + date DESC` (for client history)
- `organizationId + status + date` (for status filtering)
- `organizationId + serviceId + date` (for service analytics)
- `practitionerId + date + startTime` (for conflict detection)

### 2. `clients` Collection

**Purpose**: Stores client information

**Document Structure**:
```typescript
{
  // Required fields
  organizationId: string;           // Reference to organization
  firstName: string;                // Client first name
  lastName: string;                 // Client last name
  email: string;                    // Client email (unique per organization)
  phone: string;                    // Client phone number
  preferences: {                    // Client preferences
    reminderMethod: 'email' | 'sms' | 'both';
    language: 'fr' | 'en' | 'es' | 'de' | 'it';
    timezone?: string;              // Optional timezone override
  };
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId + email` (for email uniqueness)
- `organizationId + phone` (for phone lookup)
- `organizationId + createdAt DESC` (for recent clients)

### 3. `services` Collection

**Purpose**: Stores service definitions

**Document Structure**:
```typescript
{
  // Required fields
  organizationId: string;           // Reference to organization
  name: string;                     // Service name
  duration: number;                 // Duration in minutes
  color: string;                    // Hex color code for calendar display
  practitioners: string[];          // Array of practitioner IDs
  isActive: boolean;                // Whether service is active
  
  // Optional fields
  description?: string;             // Service description
  price?: number;                   // Price in cents
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId + isActive` (for active services)
- `organizationId + practitioners` (for practitioner services)

### 4. `reminders` Collection

**Purpose**: Stores standalone reminder records (alternative to embedded reminders)

**Document Structure**:
```typescript
{
  // Required fields
  appointmentId: string;            // Reference to appointment
  type: 'email' | 'sms';           // Reminder type
  scheduledFor: Timestamp;          // When to send the reminder
  status: 'pending' | 'sent' | 'failed';
  content: string;                  // Reminder content
  retryCount: number;               // Number of retry attempts
  
  // Optional fields
  sentAt?: Timestamp;               // When reminder was sent
  errorMessage?: string;            // Error message if failed
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `appointmentId + scheduledFor` (for appointment reminders)
- `status + scheduledFor` (for processing pending reminders)
- `type + status + scheduledFor` (for type-specific processing)

### 5. `organization_appointment_settings` Collection

**Purpose**: Stores organization-specific appointment settings

**Document Structure**:
```typescript
{
  // Working hours configuration
  workingHours: {
    [day: string]: {                // monday, tuesday, etc.
      start: string;                // HH:MM format
      end: string;                  // HH:MM format
      isOpen: boolean;              // Whether open on this day
    };
  };
  
  // Services reference (denormalized for performance)
  services: string[];               // Array of service IDs
  
  // Booking rules
  bookingRules: {
    advanceBookingDays: number;     // How far in advance to allow booking
    cancellationDeadlineHours: number; // Cancellation deadline
    allowOnlineBooking: boolean;    // Allow public booking
    requireConfirmation: boolean;   // Require appointment confirmation
    allowSameDayBooking: boolean;   // Allow same-day booking
    maxAppointmentsPerDay?: number; // Optional daily limit
    minTimeBetweenAppointments?: number; // Optional buffer time
  };
  
  // Reminder configuration
  reminderConfig: {
    enabled: boolean;               // Whether reminders are enabled
    timings: number[];              // Hours before appointment [24, 2]
    templates: Array<{              // Notification templates
      id: string;
      type: 'email' | 'sms';
      language: string;
      subject?: string;             // For emails
      content: string;
      variables: string[];          // Available template variables
    }>;
    maxRetries: number;             // Max retry attempts
    retryIntervalMinutes: number;   // Interval between retries
  };
  
  // General settings
  publicBookingUrl?: string;        // Public booking page slug
  timezone: string;                 // Organization timezone
  defaultAppointmentDuration: number; // Default duration in minutes
  bufferTimeBetweenAppointments: number; // Buffer time in minutes
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `organizationId` (one settings document per organization)

## Security Rules

### Appointments
- Read: Organization members, appointment client
- Write: Organization members with appointment management permission
- Create: Organization members, public booking (with validation)
- Delete: Organization admins only

### Clients
- Read: Organization members
- Write: Organization members with client management permission
- Create: Organization members, public booking (limited fields)
- Delete: Organization admins only

### Services
- Read: Organization members, public (for booking)
- Write: Organization members with service management permission
- Create: Organization admins
- Delete: Organization admins

### Reminders
- Read: System only (Cloud Functions)
- Write: System only (Cloud Functions)
- Create: System only (Cloud Functions)
- Delete: System only (Cloud Functions)

### Organization Appointment Settings
- Read: Organization members
- Write: Organization admins
- Create: Organization admins
- Delete: Organization admins

## Data Validation Rules

### Common Validations
- All documents must have valid `createdAt` and `updatedAt` timestamps
- Organization references must exist and be accessible to the user
- String fields must not exceed maximum lengths defined in validation rules
- Enum fields must match predefined values

### Appointment-Specific Validations
- `date` must be a valid future date for new appointments
- `startTime` must match HH:MM format
- `duration` must be between 5 and 480 minutes
- `status` transitions must follow business rules
- Appointments cannot overlap for the same practitioner

### Client-Specific Validations
- `email` must be unique within organization
- `phone` must be valid international format
- `preferences.language` must be supported language
- `preferences.reminderMethod` must be valid method

### Service-Specific Validations
- `name` must be unique within organization
- `color` must be valid hex color
- `practitioners` array must contain valid user IDs
- `price` must be non-negative integer (cents)

## Performance Considerations

### Query Patterns
- Most queries are scoped by `organizationId`
- Date-based queries use compound indexes
- Status filtering uses compound indexes
- Practitioner schedules use compound indexes

### Denormalization
- Service IDs are stored in organization settings for quick access
- Client names could be denormalized in appointments for display
- Practitioner names could be denormalized in appointments for display

### Caching Strategy
- Organization settings should be cached (rarely change)
- Service definitions should be cached
- Working hours should be cached
- Client data can be cached with TTL

## Migration Considerations

### From Existing Systems
- Import appointments with proper status mapping
- Import clients with preference defaults
- Create default services for each organization
- Set up default organization settings

### Future Schema Changes
- Use Firestore's flexible schema for new fields
- Implement gradual migration for breaking changes
- Maintain backward compatibility where possible
- Use Cloud Functions for data transformation