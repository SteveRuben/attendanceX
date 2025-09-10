// shared/types/event.types.ts

// shared/types/event.types.ts
import type { Address, BaseEntity, GeoPoint } from "./common.types";

export enum EventType {
  MEETING = 'meeting',
  TRAINING = 'training',
  CONFERENCE = 'conference',
  WORKSHOP = 'workshop',
  SEMINAR = 'seminar',
  WEBINAR = 'webinar',
  SOCIAL = 'social',
  TEAM_BUILDING = 'team_building',
  PRESENTATION = 'presentation',
  INTERVIEW = 'interview',
  OTHER = 'other',
  EXAM = "EXAM",
  COURSE = "COURSE"
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  IN_PROGRESS = 'in_progress',
  CONFIRMED = 'confirmed',
  ARCHIVED = 'archived',
  ONGOING = "ONGOING",
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface EventLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  address?: Address;
  room?: string;
  building?: string;
  floor?: string;
  capacity?: number;
  virtualUrl?: string;
  virtualPlatform?: string;
  accessCode?: string;
  instructions?: string;
  checkInRadius?: number; // en mètres pour la géolocalisation
  coordinates?: GeoPoint;
}

export interface RecurrenceSettings {
  type: RecurrenceType;
  interval: number; // tous les X jours/semaines/mois
  endDate?: Date;
  occurrences?: number;
  daysOfWeek?: number[]; // 0-6 (dimanche à samedi)
  dayOfMonth?: number;
  monthOfYear?: number;
  exceptions?: Date[]; // dates d'exception
  customPattern?: string; // pour les récurrences personnalisées
}

export interface AttendanceSettings {
  requireQRCode: boolean;
  requireGeolocation: boolean;
  requireBiometric: boolean;
  lateThresholdMinutes: number;
  earlyThresholdMinutes: number;
  geofenceRadius?: number; // En mètres
  allowManualMarking: boolean;
  requireValidation: boolean;
  required: boolean;
  allowLateCheckIn: boolean;
  allowEarlyCheckOut: boolean;
  requireApproval: boolean;
  autoMarkAbsent: boolean;
  autoMarkAbsentAfterMinutes: number;
  allowSelfCheckIn: boolean;
  allowSelfCheckOut: boolean;
  checkInWindow: {
    beforeMinutes: number;
    afterMinutes: number;
  };
}

export interface EventReminderSettings {
  enabled: boolean;
  intervals: number[]; // minutes avant l'événement
  channels: ('email' | 'sms' | 'push')[];
  customMessage?: string;
  sendToOrganizers: boolean;
  sendToParticipants: boolean;
}

export interface EventStatistics {
  totalInvited: number;
  totalConfirmed: number;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  totalLate: number;
  attendanceRate: number;
  punctualityRate: number;
  avgCheckInTime?: number; // minutes après l'heure de début
  avgDuration?: number; // minutes de présence
}

export interface EventResource {
  id: string;
  name: string;
  type: 'equipment' | 'room' | 'material' | 'service';
  quantity?: number;
  cost?: number;
  supplier?: string;
  notes?: string;
}

export interface Event extends BaseEntity {
  // Informations de base
  title: string;
  description: string;
  type: EventType;
  status: EventStatus;
  priority: EventPriority;
  
  // Organization context
  organizationId: string;
  organizationLogo?: string;
  organizationName?: string;
  
  // Dates et horaires
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  allDay: boolean;
  
  // Récurrence
  recurrence: RecurrenceSettings;
  parentEventId?: string; // pour les événements récurrents
  seriesId?: string; // identifiant de la série d'événements
  
  // Lieu et logistique
  location: EventLocation;
  resources?: EventResource[];
  capacity: number;
  
  // Organisation
  organizerId: string;
  organizerName: string;
  coOrganizers: string[];
  
  // Participants et inscription
  participants: string[]; // IDs des utilisateurs
  confirmedParticipants: string[];
  maxParticipants?: number;
  registrationRequired: boolean;
  registrationDeadline?: Date;
  registrationQuestions?: {
    question: string;
    type: 'text' | 'select' | 'multiselect' | 'boolean';
    options?: string[];
    required: boolean;
  }[];
  waitingList: string[];
  
  // Présences
  attendanceSettings: AttendanceSettings;
  qrCode?: string;
  qrCodeExpiresAt?: Date;
  
  // Classification et métadonnées
  tags: string[];
  category?: string;
  department?: string;
  isPrivate: boolean;
  requiresApproval: boolean;
  
  // Notifications et rappels
  reminderSettings: EventReminderSettings;
  lastReminderSent?: Date;
  remindersSent?: Number;
  
  // Contenu et documents
  agenda?: string;
  documents?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  
  // Statistiques
  stats: EventStatistics;
  
  // Feedback et évaluation
  allowFeedback: boolean;
  feedbackQuestions?: {
    question: string;
    type: 'rating' | 'text' | 'select';
    options?: string[];
  }[];
  
  // Métadonnées système
  lastModifiedBy?: string;
  version: number;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  type: EventType;
  startDateTime: Date;
  endDateTime: Date;
  timezone: string;
  location: EventLocation;
  participants: string[];
  attendanceSettings: AttendanceSettings;
  reminderSettings?: EventReminderSettings;
  recurrence?: RecurrenceSettings;
  maxParticipants?: number;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
  tags?: string[];
  category?: string;
  isPrivate?: boolean;
  priority?: EventPriority;
  resources?: EventResource[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  type?: EventType;
  status?: EventStatus;
  priority?: EventPriority;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: EventLocation;
  participants?: string[];
  attendanceSettings?: AttendanceSettings;
  reminderSettings?: EventReminderSettings;
  maxParticipants?: number;
  tags?: string[];
  category?: string;
  isPrivate?: boolean;
  resources?: EventResource[];
}

export interface EventRegistration extends BaseEntity {
  eventId: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted';
  registeredAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  answers?: Record<string, any>; // réponses aux questions d'inscription
  notes?: string;
}