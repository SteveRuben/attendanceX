/**
 * Validateurs pour la gestion de présence
 */

import { z } from 'zod';
import { PresenceStatus, LeaveType, LeaveStatus, ScheduleType, WorkDayType } from '../types/presence.types';
import { VALIDATION_LIMITS } from '../constants/presence-constants';

// Schéma pour les coordonnées géographiques
const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional()
});

// Schéma plus flexible pour les requêtes API où les coordonnées peuvent être partielles
const PartialGeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional()
}).refine(
  (data) => {
    // Si latitude est fournie, longitude doit l'être aussi et vice versa
    return (data.latitude !== undefined) === (data.longitude !== undefined);
  },
  {
    message: "Si latitude est fournie, longitude doit l'être aussi et vice versa"
  }
);

// Schéma pour les employés
const EmployeeSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  employeeId: z.string().min(1),
  organizationId: z.string().min(1),
  departmentId: z.string().optional(),
  position: z.string().min(1),
  hireDate: z.date(),
  workScheduleId: z.string().optional(),
  isActive: z.boolean(),

  workEmail: z.string().email().optional(),
  workPhone: z.string().optional(),

  allowedLocations: z.array(GeoLocationSchema).optional(),
  locationRadius: z.number().min(1).max(VALIDATION_LIMITS.maxLocationRadius).optional(),
  requiresGeolocation: z.boolean(),

  leaveBalances: z.record(z.nativeEnum(LeaveType), z.number().min(0)),

  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1),
  updatedBy: z.string().optional()
});

// Schéma pour les entrées de pause
const BreakEntrySchema = z.object({
  id: z.string().min(1),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().min(1).max(VALIDATION_LIMITS.maxBreakDuration).optional(),
  type: z.enum(['lunch', 'coffee', 'personal', 'other']),
  location: GeoLocationSchema.optional()
}).refine(data => {
  if (data.endTime && data.startTime) {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: "L'heure de fin doit être postérieure à l'heure de début"
});

// Schéma pour les entrées de présence
const PresenceEntrySchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  organizationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  clockInTime: z.date().optional(),
  clockOutTime: z.date().optional(),

  clockInLocation: GeoLocationSchema.optional(),
  clockOutLocation: GeoLocationSchema.optional(),

  status: z.nativeEnum(PresenceStatus),
  scheduledStartTime: z.date().optional(),
  scheduledEndTime: z.date().optional(),
  actualWorkHours: z.number().min(0).max(VALIDATION_LIMITS.maxWorkHours).optional(),
  scheduledWorkHours: z.number().min(0).max(VALIDATION_LIMITS.maxWorkHours).optional(),
  overtimeHours: z.number().min(0).max(VALIDATION_LIMITS.maxOvertimeHours).optional(),

  breakEntries: z.array(BreakEntrySchema).optional(),
  totalBreakTime: z.number().min(0).optional(),

  notes: z.string().max(500).optional(),
  managerNotes: z.string().max(500).optional(),

  isValidated: z.boolean(),
  validatedBy: z.string().optional(),
  validatedAt: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
}).refine(data => {
  if (data.clockInTime && data.clockOutTime) {
    return data.clockOutTime > data.clockInTime;
  }
  return true;
}, {
  message: "L'heure de sortie doit être postérieure à l'heure d'entrée"
});

// Schéma pour l'horaire d'une journée
const DayScheduleSchema = z.object({
  isWorkDay: z.boolean(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakDuration: z.number().min(0).max(VALIDATION_LIMITS.maxBreakDuration).optional(),
  type: z.nativeEnum(WorkDayType),

  flexibleStartWindow: z.object({
    earliest: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    latest: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional(),
  flexibleEndWindow: z.object({
    earliest: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    latest: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional()
}).refine(data => {
  if (data.isWorkDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  if (data.startTime && data.endTime) {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = Number(start[0]) * 60 + Number(start[1]);
    const endMinutes = Number(end[0]) * 60 + Number(end[1]);
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: "L'heure de fin doit être postérieure à l'heure de début"
});

// Schéma pour les horaires de travail
const WorkScheduleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  organizationId: z.string().min(1),
  type: z.nativeEnum(ScheduleType),

  weeklySchedule: z.record(z.string(), DayScheduleSchema),

  defaultBreakDuration: z.number().min(0).max(VALIDATION_LIMITS.maxBreakDuration),
  maxOvertimeHours: z.number().min(0).max(VALIDATION_LIMITS.maxOvertimeHours),
  gracePeriodsMinutes: z.object({
    lateArrival: z.number().min(0).max(VALIDATION_LIMITS.maxGracePeriod),
    earlyDeparture: z.number().min(0).max(VALIDATION_LIMITS.maxGracePeriod)
  }),

  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(),
  isActive: z.boolean(),

  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().min(1)
}).refine(data => {
  if (data.effectiveTo) {
    return data.effectiveTo > data.effectiveFrom;
  }
  return true;
}, {
  message: "La date de fin doit être postérieure à la date de début"
});

// Schéma pour les demandes de congé
const LeaveRequestSchema = z.object({
  id: z.string().min(1),
  employeeId: z.string().min(1),
  organizationId: z.string().min(1),

  type: z.nativeEnum(LeaveType),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalDays: z.number().min(0.5).max(VALIDATION_LIMITS.maxLeaveRequestDays),
  isHalfDay: z.boolean(),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional(),

  reason: z.string().min(1).max(500),
  attachments: z.array(z.string().url()).optional(),

  status: z.nativeEnum(LeaveStatus),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  rejectionReason: z.string().max(500).optional(),

  deductedFromBalance: z.boolean(),
  balanceImpact: z.record(z.nativeEnum(LeaveType), z.number()),

  createdAt: z.date(),
  updatedAt: z.date(),
  submittedAt: z.date().optional()
}).refine(data => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate >= startDate;
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début"
}).refine(data => {
  if (data.isHalfDay && !data.halfDayPeriod) {
    return false;
  }
  return true;
}, {
  message: "La période de demi-journée doit être spécifiée pour les congés d'une demi-journée"
});

// Schémas pour les requêtes API
const ClockInRequestSchema = z.object({
  location: PartialGeoLocationSchema.optional(),
  notes: z.string().max(500).optional()
});

const ClockOutRequestSchema = z.object({
  location: PartialGeoLocationSchema.optional(),
  notes: z.string().max(500).optional()
});

const PresenceQueryParamsSchema = z.object({
  employeeId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.nativeEnum(PresenceStatus).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const LeaveRequestInputSchema = z.object({
  type: z.nativeEnum(LeaveType),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isHalfDay: z.boolean().optional(),
  halfDayPeriod: z.enum(['morning', 'afternoon']).optional(),
  reason: z.string().min(1).max(500),
  attachments: z.array(z.string().url()).optional()
}).refine(data => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate >= startDate;
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début"
}).refine(data => {
  if (data.isHalfDay && !data.halfDayPeriod) {
    return false;
  }
  return true;
}, {
  message: "La période de demi-journée doit être spécifiée pour les congés d'une demi-journée"
});

const LeaveApprovalInputSchema = z.object({
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(500).optional()
}).refine(data => {
  if (data.status === LeaveStatus.REJECTED && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: "Une raison de rejet doit être fournie pour les demandes rejetées"
});

// Schéma pour les paramètres de présence de l'organisation
const OrganizationPresenceSettingsSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),

  workingDaysPerWeek: z.number().min(1).max(7),
  standardWorkHours: z.number().min(VALIDATION_LIMITS.minWorkHours).max(VALIDATION_LIMITS.maxWorkHours),

  requireGeolocation: z.boolean(),
  allowedLocationRadius: z.number().min(1).max(VALIDATION_LIMITS.maxLocationRadius),
  organizationLocations: z.array(GeoLocationSchema),

  gracePeriodsMinutes: z.object({
    lateArrival: z.number().min(0).max(VALIDATION_LIMITS.maxGracePeriod),
    earlyDeparture: z.number().min(0).max(VALIDATION_LIMITS.maxGracePeriod)
  }),

  notificationSettings: z.object({
    missedClockIn: z.boolean(),
    missedClockOut: z.boolean(),
    overtime: z.boolean(),
    leaveRequests: z.boolean()
  }),

  leaveApprovalWorkflow: z.object({
    requiresApproval: z.boolean(),
    approverRoles: z.array(z.string()),
    autoApproveThreshold: z.number().min(0).optional()
  }),

  createdAt: z.date(),
  updatedAt: z.date(),
  updatedBy: z.string().min(1)
});

// Fonctions de validation utilitaires (commentées car inutilisées)
// const validateTimeRange = (startTime: string, endTime: string): boolean => {
//   const start = startTime.split(':').map(Number);
//   const end = endTime.split(':').map(Number);
//   const startMinutes = Number(start[0]) * 60 + Number(start[1]);
//   const endMinutes = Number(end[0]) * 60 + Number(end[1]);
//   return endMinutes > startMinutes;
// };

// const validateDateRange = (startDate: string, endDate: string): boolean => {
//   const start = new Date(startDate);
//   const end = new Date(endDate);
//   return end >= start;
// };

// const validateGeoLocation = (location: { latitude: number; longitude: number }): boolean => {
//   return (
//     location.latitude >= -90 &&
//     location.latitude <= 90 &&
//     location.longitude >= -180 &&
//     location.longitude <= 180
//   );
// };

// const validateWorkHours = (hours: number): boolean => {
//   return hours >= VALIDATION_LIMITS.minWorkHours && hours <= VALIDATION_LIMITS.maxWorkHours;
// };

// const validateLeaveBalance = (requestedDays: number, availableBalance: number): boolean => {
//   return requestedDays <= availableBalance;
// };

// des schémas
export {
  GeoLocationSchema,
  EmployeeSchema,
  BreakEntrySchema,
  PresenceEntrySchema,
  DayScheduleSchema,
  WorkScheduleSchema,
  LeaveRequestSchema,
  ClockInRequestSchema,
  ClockOutRequestSchema,
  PresenceQueryParamsSchema,
  LeaveRequestInputSchema,
  LeaveApprovalInputSchema,
  OrganizationPresenceSettingsSchema
};