// shared/src/validators/event-validator.ts
import { z } from 'zod';
import { EventType, EventStatus, AttendanceMethod } from '../types';
import { 
  baseIdSchema, 
  coordinatesSchema, 
  addressSchema,
  validateAndFormat 
} from './common-validator';

// Énums pour la validation
const eventTypeSchema = z.nativeEnum(EventType);
const eventStatusSchema = z.nativeEnum(EventStatus);
const attendanceMethodSchema = z.nativeEnum(AttendanceMethod);

// Schéma pour les paramètres d'événement
export const eventSettingsSchema = z.object({
  allowedMethods: z.array(attendanceMethodSchema).min(1, 'Au moins une méthode requise'),
  qrCodeSettings: z.object({
    enabled: z.boolean(),
    expiryMinutes: z.number().int().min(5).max(1440).default(60),
    singleUse: z.boolean().default(true)
  }).optional(),
  geolocationSettings: z.object({
    enabled: z.boolean(),
    radius: z.number().int().min(10).max(1000).default(100),
    coordinates: coordinatesSchema
  }).optional(),
  requireValidation: z.boolean().default(false),
  autoMarkLate: z.boolean().default(true),
  lateThresholdMinutes: z.number().int().min(1).max(120).default(15),
  allowEarlyCheckIn: z.boolean().default(true),
  earlyCheckInMinutes: z.number().int().min(0).max(1440).default(30),
  sendReminders: z.boolean().default(true),
  reminderIntervals: z.array(z.number().int().positive()).default([1440, 60, 15])
});

// Schéma complet événement
export const eventSchema = z.object({
  id: baseIdSchema,
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  description: z.string().max(2000, 'Description trop longue').optional(),
  type: eventTypeSchema,
  status: eventStatusSchema,
  organizerId: baseIdSchema,
  startDate: z.date(),
  endDate: z.date(),
  location: z.object({
    name: z.string().min(1, 'Nom du lieu requis'),
    address: addressSchema.optional(),
    coordinates: coordinatesSchema.optional(),
    instructions: z.string().max(500).optional()
  }),
  capacity: z.number().int().positive().optional(),
  isPublic: z.boolean().default(false),
  requiresRegistration: z.boolean().default(true),
  registrationDeadline: z.date().optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  settings: eventSettingsSchema,
  participants: z.array(baseIdSchema).default([]),
  attendanceCount: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date()
}).refine(data => data.endDate > data.startDate, {
  message: 'La date de fin doit être après la date de début',
  path: ['endDate']
}).refine(data => !data.registrationDeadline || data.registrationDeadline <= data.startDate, {
  message: 'La date limite d\'inscription doit être avant le début de l\'événement',
  path: ['registrationDeadline']
});

// Schéma pour créer un événement
export const createEventSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  description: z.string().max(2000).optional(),
  type: eventTypeSchema,
  startDate: z.string().datetime('Date de début invalide'),
  endDate: z.string().datetime('Date de fin invalide'),
  location: z.object({
    name: z.string().min(1, 'Nom du lieu requis'),
    address: addressSchema.optional(),
    coordinates: coordinatesSchema.optional(),
    instructions: z.string().max(500).optional()
  }),
  capacity: z.number().int().positive().optional(),
  isPublic: z.boolean().default(false),
  requiresRegistration: z.boolean().default(true),
  registrationDeadline: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  settings: eventSettingsSchema.optional(),
  inviteParticipants: z.array(z.string().email()).max(1000).default([]),
  sendInvitations: z.boolean().default(true)
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'La date de fin doit être après la date de début',
  path: ['endDate']
});

// Schéma pour mettre à jour un événement
export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: eventTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  location: z.object({
    name: z.string().min(1),
    address: addressSchema.optional(),
    coordinates: coordinatesSchema.optional(),
    instructions: z.string().max(500).optional()
  }).optional(),
  capacity: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  requiresRegistration: z.boolean().optional(),
  registrationDeadline: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  settings: eventSettingsSchema.optional(),
  status: eventStatusSchema.optional(),
  notifyParticipants: z.boolean().default(true)
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'La date de fin doit être après la date de début',
  path: ['endDate']
});

// Schéma pour la recherche d'événements
export const searchEventsSchema = z.object({
  query: z.string().optional(),
  type: eventTypeSchema.optional(),
  status: eventStatusSchema.optional(),
  organizerId: baseIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  hasCapacity: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['startDate', 'title', 'createdAt', 'attendanceCount']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// Fonctions de validation
export function validateEvent(data: unknown) {
  return validateAndFormat(eventSchema, data);
}

export function validateCreateEvent(data: unknown) {
  return validateAndFormat(createEventSchema, data);
}

export function validateUpdateEvent(data: unknown) {
  return validateAndFormat(updateEventSchema, data);
}

export function validateSearchEvents(data: unknown) {
  return validateAndFormat(searchEventsSchema, data);
}

// Validation des conflits d'horaires
export function validateEventScheduleConflict(
  newEvent: { startDate: Date; endDate: Date },
  existingEvents: Array<{ startDate: Date; endDate: Date }>
): boolean {
  return existingEvents.some(event => 
    (newEvent.startDate >= event.startDate && newEvent.startDate < event.endDate) ||
    (newEvent.endDate > event.startDate && newEvent.endDate <= event.endDate) ||
    (newEvent.startDate <= event.startDate && newEvent.endDate >= event.endDate)
  );
}