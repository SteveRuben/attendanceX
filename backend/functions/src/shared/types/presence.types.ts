/**
 * Types pour la gestion de présence
 */

import { BaseEntity } from './common.types';

// Enums pour les statuts de présence
export enum PresenceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EARLY_LEAVE = 'early_leave',
  ON_BREAK = 'on_break',
  OVERTIME = 'overtime'
}

export enum LeaveType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  UNPAID = 'unpaid',
  COMPENSATORY = 'compensatory',
  STUDY = "study"
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum WorkDayType {
  REGULAR = 'regular',
  WEEKEND = 'weekend',
  HOLIDAY = 'holiday',
  HALF_DAY = 'half_day'
}

export enum ScheduleType {
  FIXED = 'fixed',
  FLEXIBLE = 'flexible',
  SHIFT = 'shift',
  REMOTE = 'remote'
}

// Interface pour les coordonnées géographiques
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
  country?: string;
  region?: string;
  city?: string;
}

// Interface pour les employés (extension de User)
export interface Employee extends BaseEntity {
  userId: string;
  employeeId: string;
  organizationId: string;
  departmentId?: string;
  position: string;
  hireDate: Date;
  workScheduleId?: string;
  isActive: boolean;

  // Informations de contact professionnel
  workEmail?: string;
  workPhone?: string;

  // Paramètres de présence
  allowedLocations?: GeoLocation[];
  locationRadius?: number; // en mètres
  requiresGeolocation: boolean;

  // Soldes de congés
  leaveBalances: Record<LeaveType, number>;

  // Propriétés calculées
  workingYears?: number;         // Années de service

  // Métadonnées
  createdBy: string;
  updatedBy?: string;
}

// Interface pour les entrées de présence
export interface PresenceEntry extends BaseEntity {
  employeeId: string;
  organizationId: string;
  date: string; // Format YYYY-MM-DD

  // Heures de pointage
  clockInTime?: Date;
  clockOutTime?: Date;

  // Localisation
  clockInLocation?: GeoLocation;
  clockOutLocation?: GeoLocation;

  // Statut et calculs
  status: PresenceStatus;
  statusLabel?: string;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  actualWorkHours?: number;
  scheduledWorkHours?: number;
  overtimeHours?: number;

  // Propriétés calculées
  totalHours?: number;           // Heures totales travaillées
  effectiveHours?: number;       // Heures effectives (sans pauses)
  totalBreakHours?: number;      // Total des heures de pause

  // Pauses
  breakEntries?: BreakEntry[];
  totalBreakTime?: number;

  // Anomalies
  hasAnomalies?: boolean;
  anomalyTypes?: string[];
  anomalyDetails?: any;

  // Notes et commentaires
  notes?: string;
  managerNotes?: string;

  // creation
  createdBy?: string;
  updatedBy?: string;

  // Validation
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
}

// Interface pour les pauses
export interface BreakEntry {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // en minutes
  type: 'lunch' | 'coffee' | 'personal' | 'other';
  location?: GeoLocation;
}

// Interface pour les horaires de travail
export interface WorkSchedule extends BaseEntity {
  name: string;
  organizationId: string;
  employeeId?: string;
  type: ScheduleType;

  // Horaires par jour de la semaine (0 = dimanche, 6 = samedi)
  weeklySchedule: Record<number, DaySchedule>;
  weeklyPattern?: {
    [dayOfWeek: number]: {
      isWorkDay: boolean;
      startTime: string; // Format HH:MM
      endTime: string;   // Format HH:MM
    };
  };

  // Paramètres généraux
  defaultBreakDuration: number; // en minutes
  maxOvertimeHours: number;
  gracePeriodsMinutes: {
    lateArrival: number;
    earlyDeparture: number;
  };

  // Propriétés calculées
  workingDays?: number[];

  // Validité
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;

  // Métadonnées
  createdBy: string;
  updatedBy?: string;
}

// Interface pour l'horaire d'une journée
export interface DaySchedule {
  isWorkDay: boolean;
  startTime?: string; // Format HH:MM
  endTime?: string; // Format HH:MM
  breakDuration?: number; // en minutes
  type: WorkDayType;

  // Horaires flexibles
  flexibleStartWindow?: {
    earliest: string; // Format HH:MM
    latest: string; // Format HH:MM
  };
  flexibleEndWindow?: {
    earliest: string; // Format HH:MM
    latest: string; // Format HH:MM
  };
}

// Interface pour les demandes de congé
export interface LeaveRequest extends BaseEntity {
  employeeId: string;
  organizationId: string;

  // Détails de la demande
  type: LeaveType;
  startDate: string; // Format YYYY-MM-DD
  endDate: string; // Format YYYY-MM-DD
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';

  // Propriétés calculées
  duration?: number;             // Durée en jours

  // Justification
  reason: string;
  attachments?: string[]; // URLs des documents justificatifs

  // Statut et approbation
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Impact sur les soldes
  deductedFromBalance: boolean;
  balanceImpact: Record<LeaveType, number>;

  // Métadonnées
  submittedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Interface pour les rapports de présence
export interface PresenceReport extends BaseEntity {
  organizationId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';

  // Période couverte
  startDate: string;
  endDate: string;

  // Filtres appliqués
  filters: {
    employeeIds?: string[];
    departmentIds?: string[];
    statuses?: PresenceStatus[];
  };

  // Données du rapport
  summary: PresenceSummary;
  details: PresenceReportEntry[];

  // Génération
  generatedBy: string;
  generatedAt: Date;
  format: 'json' | 'pdf' | 'excel' | 'csv';
  fileUrl?: string;
}

// Interface pour le résumé de présence
export interface PresenceSummary {
  totalEmployees: number;
  totalWorkDays: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalEarlyLeave: number;
  totalOvertimeHours: number;
  averageWorkHours: number;
  attendanceRate: number; // Pourcentage
}

// Interface pour les entrées de rapport détaillé
export interface PresenceReportEntry {
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  status: PresenceStatus;
  actualWorkHours: number;
  scheduledWorkHours?: number;
  overtimeHours: number;
  totalBreakTime: number;
  isLate: boolean;
  isEarlyLeave: boolean;
}

// Interface pour les alertes de présence
export interface PresenceAlert {
  id: string;
  type: 'missed_clock_in' | 'missed_clock_out' | 'overtime' | 'anomaly';
  employeeId: string;
  employeeName: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  
  // Propriétés pour les anomalies
  entryId?: string;
  types?: string[];
  details?: any;
}

// Interface pour le statut de présence en temps réel
export interface PresenceStatusResponse {
  employee: Employee;
  currentStatus: PresenceStatus;
  todayEntry?: PresenceEntry;
  isClocked: boolean;
  workSchedule?: WorkSchedule;
  nextScheduledDay?: Date;
}

// Type pour géolocalisation partielle (utilisé dans les requêtes API)
export interface PartialGeoLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: Date;
}

// Interface pour les requêtes de pointage
export interface ClockInRequest {
  location?: PartialGeoLocation;
  notes?: string;
}

export interface ClockOutRequest {
  location?: PartialGeoLocation;
  notes?: string;
}

// Interface pour les paramètres de requête de présence
export interface PresenceQueryParams {
  employeeId?: string;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  status?: PresenceStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Interface pour les corrections de présence
export interface PresenceCorrection {
  entryId: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  breakEntries?: BreakEntry[];
  notes?: string;
  reason: string;
  correctedBy: string;

  employeeName: string;
  department?: string;
  position: string;

  // Statistiques de présence
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;

  // Heures de travail
  totalWorkHours: number;
  scheduledWorkHours: number;
  overtimeHours: number;

  // Taux de présence
  attendanceRate: number;
  punctualityRate: number;
}

// Interface pour les paramètres de présence de l'organisation
export interface OrganizationPresenceSettings extends BaseEntity {
  organizationId: string;

  // Paramètres généraux
  workingDaysPerWeek: number;
  standardWorkHours: number;

  // Géolocalisation
  requireGeolocation: boolean;
  allowedLocationRadius: number; // en mètres
  organizationLocations: GeoLocation[];

  // Règles de présence
  gracePeriodsMinutes: {
    lateArrival: number;
    earlyDeparture: number;
  };

  // Notifications
  notificationSettings: {
    missedClockIn: boolean;
    missedClockOut: boolean;
    overtime: boolean;
    leaveRequests: boolean;
  };

  // Approbations
  leaveApprovalWorkflow: {
    requiresApproval: boolean;
    approverRoles: string[];
    autoApproveThreshold?: number; // jours
  };

  // Métadonnées
  updatedBy: string;
}

// Types dupliqués supprimés - voir définitions plus haut dans le fichier

export interface LeaveRequestInput {
  type: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  reason: string;
  attachments?: string[];
}

export interface LeaveApprovalInput {
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED;
  rejectionReason?: string;
  notes?: string;
}


export interface PresenceDashboardData {
  summary: PresenceSummary;
  recentEntries: PresenceEntry[];
  pendingLeaveRequests: LeaveRequest[];
  upcomingLeaves: LeaveRequest[];
  alerts: PresenceAlert[];
}

// PresenceAlert déjà défini plus haut dans le fichier

// Export des enums
/* export {
  PresenceStatus,
  LeaveType,
  LeaveStatus,
  WorkDayType,
  ScheduleType
}; */// Interface pour les statistiques de présence des employés
export interface EmployeePresenceStats {
  employeeId: string;
  month: string; // Format YYYY-MM
  totalWorkDays: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalEarlyLeave: number;
  totalOvertimeHours: number;
  totalWorkHours: number;
  averageWorkHours: number;
  attendanceRate: number;
  lastUpdated: Date;
}

// WorkSchedule déjà défini plus haut dans le fichier