// Frontend appointment types matching backend models
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

export type ReminderType = 'email' | 'sms';
export type ReminderStatus = 'pending' | 'sent' | 'failed';
export type ReminderMethod = 'email' | 'sms' | 'both';

// Base entity interface
export interface BaseEntity {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Client interface
export interface Client extends BaseEntity {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferences: ClientPreferences;
  fullName?: string;
}

export interface ClientPreferences {
  reminderMethod: ReminderMethod;
  language: string;
  timezone?: string;
}

// Service interface
export interface Service extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
  duration: number; // in minutes
  price?: number; // in cents
  practitioners: string[];
  color: string;
  isActive: boolean;
}

// Practitioner interface (simplified user)
export interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
}

// Reminder interface
export interface Reminder extends BaseEntity {
  appointmentId: string;
  type: ReminderType;
  scheduledFor: Date;
  status: ReminderStatus;
  content: string;
  sentAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

// Main appointment interface
export interface Appointment extends BaseEntity {
  organizationId: string;
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: Date;
  startTime: string; // Format HH:MM
  duration: number; // in minutes
  status: AppointmentStatus;
  notes?: string;
  reminders: Reminder[];
  endTime?: string; // Calculated field
}

// Extended appointment with populated data
export interface AppointmentWithDetails extends Appointment {
  client: Client;
  service: Service;
  practitioner: Practitioner;
}

// Available slot interface
export interface AvailableSlot {
  date: string; // Format YYYY-MM-DD
  startTime: string; // Format HH:MM
  endTime: string; // Format HH:MM
  duration: number; // in minutes
  practitionerId?: string;
  serviceId?: string;
}

// Appointment filters for API requests
export interface AppointmentFilters {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  practitionerId?: string;
  serviceId?: string;
  clientId?: string;
  status?: AppointmentStatus[];
  searchQuery?: string;
  page?: number;
  limit?: number;
}

// Create appointment request
export interface CreateAppointmentRequest {
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  notes?: string;
}

// Update appointment request
export interface UpdateAppointmentRequest {
  date?: string;
  startTime?: string;
  duration?: number;
  serviceId?: string;
  practitionerId?: string;
  notes?: string;
  status?: AppointmentStatus;
}

// Public booking request
export interface PublicBookingRequest {
  clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    preferences?: Partial<ClientPreferences>;
  };
  appointmentData: {
    date: string;
    startTime: string;
    serviceId: string;
    practitionerId?: string;
    notes?: string;
  };
}

// Appointment conflict
export interface AppointmentConflict {
  type: 'time_overlap' | 'practitioner_unavailable' | 'outside_working_hours' | 'service_unavailable';
  message: string;
  conflictingAppointmentId?: string;
  suggestedAlternatives?: AvailableSlot[];
}

// Appointment statistics
export interface AppointmentStats {
  totalAppointments: number;
  attendanceRate: number;
  cancellationRate: number;
  noShowRate: number;
  averageDuration: number;
  peakHours: { hour: number; count: number }[];
  popularServices: { serviceId: string; serviceName: string; count: number }[];
  monthlyTrends: { month: string; count: number; attendanceRate: number }[];
}

// Form validation states
export interface AppointmentFormData {
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
}

export interface AppointmentFormErrors {
  clientId?: string;
  practitionerId?: string;
  serviceId?: string;
  date?: string;
  startTime?: string;
  notes?: string;
  general?: string;
}

// Loading states
export interface AppointmentLoadingStates {
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  loadingAvailableSlots: boolean;
  loadingStats: boolean;
  confirmingAppointment: boolean;
  completingAppointment: boolean;
  cancellingAppointment: boolean;
  markingNoShow: boolean;
  generatingReport: boolean;
}

// Error handling
export interface AppointmentError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

// Service response wrapper
export interface AppointmentServiceResponse<T> {
  data?: T;
  error?: AppointmentError;
  loading: boolean;
}

// Hook return types for React hooks
export interface UseAppointmentsReturn {
  appointments: AppointmentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: AppointmentError | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface UseAppointmentReturn {
  appointment: AppointmentWithDetails | null;
  loading: boolean;
  error: AppointmentError | null;
  refetch: () => Promise<void>;
  updateStatus: (status: AppointmentStatus, reason?: string) => Promise<void>;
  confirm: () => Promise<void>;
  complete: (notes?: string) => Promise<void>;
  cancel: (reason?: string) => Promise<void>;
  markNoShow: () => Promise<void>;
}

export interface UseAvailableSlotsReturn {
  slots: AvailableSlot[];
  loading: boolean;
  error: AppointmentError | null;
  refetch: (date: string, practitionerId: string, serviceId?: string) => Promise<void>;
}

export interface UseAppointmentStatsReturn {
  stats: AppointmentStats | null;
  loading: boolean;
  error: AppointmentError | null;
  refetch: (filters?: any) => Promise<void>;
}

// API response types
export interface AppointmentListResponse {
  appointments: AppointmentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailableSlot[];
  practitionerId?: string;
  serviceId?: string;
}

// Calendar view types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  appointment: AppointmentWithDetails;
}

export interface CalendarFilters {
  practitionerId?: string;
  serviceId?: string;
  view: 'month' | 'week' | 'day';
  date: Date;
}

// Status colors and labels
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#3B82F6', // blue
  confirmed: '#10B981', // green
  completed: '#059669', // emerald
  cancelled: '#EF4444', // red
  'no-show': '#F59E0B', // amber
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programmé',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  'no-show': 'Absent',
};

// Validation rules
export const APPOINTMENT_VALIDATION_RULES = {
  NOTES_MAX_LENGTH: 1000,
  MIN_DURATION_MINUTES: 5,
  MAX_DURATION_MINUTES: 480,
  MAX_ADVANCE_BOOKING_DAYS: 365,
  MIN_ADVANCE_BOOKING_HOURS: 1,
};

// Time utilities
export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export const WORKING_HOURS_DEFAULT = {
  start: '08:00',
  end: '18:00',
};