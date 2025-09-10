// shared/src/types/participant.types.ts - Types pour les participants aux événements

import { AttendanceStatus } from './attendance.types';
import type { BaseEntity } from './common.types';
import { NotificationChannel } from './notification.types';

// PARTICIPANT = Invité à un événement (peut être externe)
export interface EventParticipant extends BaseEntity {
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
  status: ParticipantStatus;
  attendanceStatus?: AttendanceStatus;
  
  // Préférences de notification
  notificationPreferences: ParticipantNotificationPreferences;
  
  // Métadonnées
  registeredAt: Date;
  confirmedAt?: Date;
  attendedAt?: Date;
  validatedBy?: string; // ID du membre qui a validé la présence
  validatedAt?: Date;
  qrCode?: string;
  
  // Import et traçabilité
  importSource?: ImportSource;
  importBatchId?: string;
  notes?: string;
  answers?: Record<string, any>; // Réponses aux questions d'inscription
}

export enum ParticipantStatus {
  INVITED = 'invited',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  ATTENDED = 'attended',
  ABSENT = 'absent'
}



export enum ImportSource {
  MANUAL = 'manual',
  CSV = 'csv',
  EXCEL = 'excel',
  API = 'api',
  INTERNAL_USER = 'internal_user'
}

export interface ParticipantNotificationPreferences {
  email: boolean;
  sms: boolean;
  channels: NotificationChannel[];
  language?: string; // Langue préférée pour les notifications
}

// Types pour l'import des participants
export interface ParticipantImportRow {
  email?: string; // Au moins email OU phone requis
  phone?: string;
  firstName?: string;
  lastName?: string;
  notifyByEmail: boolean;
  notifyBySMS: boolean;
  language?: string; // Langue préférée (utilise SUPPORTED_LANGUAGES)
  role?: ParticipantEventRole; // Rôle dans l'événement
  notes?: string;
}

export enum ParticipantEventRole {
  PARTICIPANT = 'participant',
  SPEAKER = 'speaker',
  ORGANIZER = 'organizer',
  VIP = 'vip'
}

export interface ParticipantImportState {
  eventId: string;
  batchId: string;
  status: ImportStatus;
  totalRows: number;
  processedRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  duplicates: ImportDuplicate[];
  notificationSettings: ImportNotificationSettings;
}

export enum ImportStatus {
  UPLOADING = 'uploading',
  VALIDATING = 'validating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface ImportDuplicate {
  row: number;
  existingParticipant: EventParticipant;
  action: DuplicateAction;
}

export enum DuplicateAction {
  SKIP = 'skip',
  UPDATE = 'update',
  CREATE_DUPLICATE = 'create_duplicate'
}

export interface ImportNotificationSettings {
  defaultChannels: NotificationChannel[];
  sendWelcomeNotification: boolean;
  customMessage?: string;
  defaultLanguage: string;
  autoDetectLanguage: boolean;
  fallbackLanguage: string;
  supportedLanguages: string[];
}

// Requêtes API
export interface CreateParticipantRequest {
  eventId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  notificationPreferences: ParticipantNotificationPreferences;
  role?: ParticipantEventRole;
  notes?: string;
}

export interface UpdateParticipantRequest {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status?: ParticipantStatus;
  notificationPreferences?: Partial<ParticipantNotificationPreferences>;
  notes?: string;
}

export interface BulkParticipantImportRequest {
  eventId: string;
  participants: ParticipantImportRow[];
  notificationSettings: ImportNotificationSettings;
  duplicateHandling: DuplicateAction;
}