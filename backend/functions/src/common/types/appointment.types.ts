// shared/src/types/appointment.types.ts
import { BaseEntity } from './common.types';

// Statuts des rendez-vous
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';

// Types de rappels
export type ReminderType = 'email' | 'sms';

// Statuts des rappels
export type ReminderStatus = 'pending' | 'sent' | 'failed';

// Méthodes de rappel préférées
export type ReminderMethod = 'email' | 'sms' | 'both';

// Interface principale pour les rendez-vous
export interface Appointment extends BaseEntity {
  organizationId: string;
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: Date;
  startTime: string; // Format HH:MM
  duration: number; // en minutes
  status: AppointmentStatus;
  notes?: string;
  reminders: Reminder[];
  // Champs calculés
  endTime?: string; // Calculé à partir de startTime + duration
}

// Interface pour les clients
export interface Client extends BaseEntity {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferences: ClientPreferences;
  // Champs calculés
  fullName?: string; // firstName + lastName
}

// Préférences client
export interface ClientPreferences {
  reminderMethod: ReminderMethod;
  language: string;
  timezone?: string;
}

// Interface pour les services
export interface Service extends BaseEntity {
  organizationId: string;
  name: string;
  description?: string;
  duration: number; // en minutes
  price?: number; // en centimes pour éviter les problèmes de précision
  practitioners: string[]; // IDs des praticiens autorisés
  color: string; // Code couleur hexadécimal pour l'affichage calendrier
  isActive: boolean;
}

// Interface pour les rappels
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

// Configuration des horaires de travail
export interface WorkingHours {
  [day: string]: {
    start: string; // Format HH:MM
    end: string; // Format HH:MM
    isOpen: boolean;
  };
}

// Règles de réservation
export interface BookingRules {
  advanceBookingDays: number; // Nombre de jours à l'avance pour réserver
  cancellationDeadlineHours: number; // Délai d'annulation en heures
  allowOnlineBooking: boolean;
  requireConfirmation: boolean;
  allowSameDayBooking: boolean;
  maxAppointmentsPerDay?: number;
  minTimeBetweenAppointments?: number; // en minutes
}

// Configuration des rappels
export interface ReminderConfig {
  enabled: boolean;
  timings: number[]; // heures avant le RDV (ex: [24, 2] pour 24h et 2h avant)
  templates: AppointmentNotificationTemplate[];
  maxRetries: number;
  retryIntervalMinutes: number;
}

// Template de notification pour les rendez-vous
export interface AppointmentNotificationTemplate {
  id: string;
  type: ReminderType;
  language: string;
  subject?: string; // Pour les emails
  content: string;
  variables: string[]; // Variables disponibles dans le template
}

// Paramètres d'organisation pour les rendez-vous
export interface OrganizationAppointmentSettings extends BaseEntity {
  workingHours: WorkingHours;
  services: Service[];
  bookingRules: BookingRules;
  reminderConfig: ReminderConfig;
  publicBookingUrl?: string;
  timezone: string;
  defaultAppointmentDuration: number; // en minutes
  bufferTimeBetweenAppointments: number; // en minutes
}

// Interface pour les créneaux disponibles
export interface AvailableSlot {
  date: string; // Format YYYY-MM-DD
  startTime: string; // Format HH:MM
  endTime: string; // Format HH:MM
  duration: number; // en minutes
  practitionerId?: string;
  serviceId?: string;
}

// Interface pour les requêtes de réservation
export interface BookingRequest {
  clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    preferences?: Partial<ClientPreferences>;
  };
  appointmentData: {
    date: string; // Format YYYY-MM-DD
    startTime: string; // Format HH:MM
    serviceId: string;
    practitionerId?: string;
    notes?: string;
  };
}

// Interface pour les filtres de rendez-vous
export interface AppointmentFilters {
  startDate?: Date;
  endDate?: Date;
  practitionerId?: string;
  serviceId?: string;
  clientId?: string;
  status?: AppointmentStatus[];
  searchQuery?: string;
}

// Interface pour les statistiques de rendez-vous
export interface AppointmentStats {
  totalAppointments: number;
  attendanceRate: number; // Pourcentage
  cancellationRate: number; // Pourcentage
  noShowRate: number; // Pourcentage
  averageDuration: number; // en minutes
  peakHours: { hour: number; count: number }[];
  popularServices: { serviceId: string; serviceName: string; count: number }[];
  monthlyTrends: { month: string; count: number; attendanceRate: number }[];
}

// Interface pour les conflits de rendez-vous
export interface AppointmentConflict {
  type: 'time_overlap' | 'practitioner_unavailable' | 'outside_working_hours' | 'service_unavailable';
  message: string;
  conflictingAppointmentId?: string;
  suggestedAlternatives?: AvailableSlot[];
}

// Interface pour les requêtes de modification de rendez-vous
export interface AppointmentUpdateRequest {
  appointmentId: string;
  updates: Partial<{
    date: string;
    startTime: string;
    duration: number;
    serviceId: string;
    practitionerId: string;
    notes: string;
    status: AppointmentStatus;
  }>;
  reason?: string;
}

// Interface pour l'historique des modifications
export interface AppointmentHistory extends BaseEntity {
  appointmentId: string;
  action: 'created' | 'updated' | 'cancelled' | 'completed' | 'rescheduled';
  performedBy: string; // ID de l'utilisateur
  performedByType: 'practitioner' | 'client' | 'system';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
}

// Types pour les requêtes API
export interface CreateAppointmentRequest {
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  startTime?: string;
  duration?: number;
  serviceId?: string;
  practitionerId?: string;
  notes?: string;
  status?: AppointmentStatus;
}

// Types pour les réponses API
export interface AppointmentResponse extends Appointment {
  client: Client;
  service: Service;
  practitioner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailableSlot[];
  practitionerId?: string;
  serviceId?: string;
}