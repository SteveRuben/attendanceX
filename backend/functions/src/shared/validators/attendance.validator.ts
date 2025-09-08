// shared/src/validators/attendance-validator.ts
import { z } from 'zod';
import { AttendanceStatus, AttendanceMethod } from '../types';
import { 
  baseIdSchema, 
  coordinatesSchema,
  validateAndFormat 
} from './common-validator';

// Énums pour la validation
const attendanceStatusSchema = z.nativeEnum(AttendanceStatus);
const attendanceMethodSchema = z.nativeEnum(AttendanceMethod);

// Schéma complet présence
export const attendanceSchema = z.object({
  id: baseIdSchema,
  eventId: baseIdSchema,
  userId: baseIdSchema,
  status: attendanceStatusSchema,
  method: attendanceMethodSchema,
  checkInTime: z.date().optional(),
  checkOutTime: z.date().optional(),
  location: coordinatesSchema.optional(),
  validatedBy: baseIdSchema.optional(),
  validatedAt: z.date().optional(),
  note: z.string().max(500).optional(),
  metadata: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(),
    qrCodeId: z.string().optional(),
    accuracy: z.number().optional()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Schéma pour marquer une présence
export const markAttendanceSchema = z.object({
  eventId: baseIdSchema,
  method: attendanceMethodSchema,
  location: coordinatesSchema.optional(),
  qrCodeData: z.string().optional(),
  note: z.string().max(500).optional(),
  checkInTime: z.string().datetime().optional()
}).refine(data => {
  // Si méthode QR Code, le qrCodeData est requis
  if (data.method === AttendanceMethod.QR_CODE) {
    return !!data.qrCodeData;
  }
  // Si méthode géolocalisation, les coordonnées sont requises
  if (data.method === AttendanceMethod.GEOLOCATION) {
    return !!data.location;
  }
  return true;
}, {
  message: 'Données requises manquantes pour la méthode sélectionnée'
});

// Schéma pour valider une présence
export const validateAttendanceSchema = z.object({
  attendanceId: baseIdSchema,
  status: attendanceStatusSchema,
  note: z.string().max(500).optional(),
  notifyUser: z.boolean().default(true)
});

// Schéma pour marquer une absence
export const markAbsenceSchema = z.object({
  eventId: baseIdSchema,
  userId: baseIdSchema,
  reason: z.string().max(500).optional(),
  isExcused: z.boolean().default(false),
  notifyUser: z.boolean().default(true)
});

// Schéma pour rechercher les présences
export const searchAttendancesSchema = z.object({
  eventId: baseIdSchema.optional(),
  userId: baseIdSchema.optional(),
  status: attendanceStatusSchema.optional(),
  method: attendanceMethodSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  needsValidation: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['checkInTime', 'createdAt', 'status']).default('checkInTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Fonctions de validation
export function validateAttendance(data: unknown) {
  return validateAndFormat(attendanceSchema, data);
}

export function validateMarkAttendance(data: unknown) {
  return validateAndFormat(markAttendanceSchema, data);
}

export function validateAttendanceValidation(data: unknown) {
  return validateAndFormat(validateAttendanceSchema, data);
}

export function validateMarkAbsence(data: unknown) {
  return validateAndFormat(markAbsenceSchema, data);
}

export function validateSearchAttendances(data: unknown) {
  return validateAndFormat(searchAttendancesSchema, data);
}

// Validation de la géolocalisation
export function validateLocationAccuracy(
  userLocation: { latitude: number; longitude: number; accuracy?: number },
  eventLocation: { latitude: number; longitude: number },
  maxRadius: number
): { isValid: boolean; distance: number } {
  // Calcul de la distance en mètres (formule haversine simplifiée)
  const R = 6371e3; // Rayon terrestre en mètres
  const φ1 = userLocation.latitude * Math.PI / 180;
  const φ2 = eventLocation.latitude * Math.PI / 180;
  const Δφ = (eventLocation.latitude - userLocation.latitude) * Math.PI / 180;
  const Δλ = (eventLocation.longitude - userLocation.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c;

  return {
    isValid: distance <= maxRadius,
    distance: Math.round(distance)
  };
}