/**
 * Constantes pour la gestion de présence
 */

import { PresenceStatus, LeaveType, LeaveStatus, WorkDayType, ScheduleType } from '../types/presence.types';

// Statuts de présence avec leurs libellés
export const PRESENCE_STATUS_LABELS: Record<PresenceStatus, string> = {
  [PresenceStatus.PRESENT]: 'Présent',
  [PresenceStatus.ABSENT]: 'Absent',
  [PresenceStatus.LATE]: 'En retard',
  [PresenceStatus.EARLY_LEAVE]: 'Parti tôt',
  [PresenceStatus.ON_BREAK]: 'En pause',
  [PresenceStatus.OVERTIME]: 'Heures supplémentaires'
};

// Types de congés avec leurs libellés
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LeaveType.VACATION]: 'Congés payés',
  [LeaveType.SICK_LEAVE]: 'Congé maladie',
  [LeaveType.PERSONAL]: 'Congé personnel',
  [LeaveType.MATERNITY]: 'Congé maternité',
  [LeaveType.PATERNITY]: 'Congé paternité',
  [LeaveType.BEREAVEMENT]: 'Congé de deuil',
  [LeaveType.UNPAID]: 'Congé sans solde',
  [LeaveType.COMPENSATORY]: 'Congé compensateur',
  [LeaveType.STUDY]: 'Retour aux études'
};

// Statuts des demandes de congé avec leurs libellés
export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: 'En attente',
  [LeaveStatus.APPROVED]: 'Approuvé',
  [LeaveStatus.REJECTED]: 'Rejeté',
  [LeaveStatus.CANCELLED]: 'Annulé'
};

// Types de journées de travail avec leurs libellés
export const WORK_DAY_TYPE_LABELS: Record<WorkDayType, string> = {
  [WorkDayType.REGULAR]: 'Journée normale',
  [WorkDayType.WEEKEND]: 'Week-end',
  [WorkDayType.HOLIDAY]: 'Jour férié',
  [WorkDayType.HALF_DAY]: 'Demi-journée'
};

// Types d'horaires avec leurs libellés
export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  [ScheduleType.FIXED]: 'Horaire fixe',
  [ScheduleType.FLEXIBLE]: 'Horaire flexible',
  [ScheduleType.SHIFT]: 'Travail posté',
  [ScheduleType.REMOTE]: 'Télétravail'
};

// Couleurs pour les statuts de présence (pour l'interface utilisateur)
export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, string> = {
  [PresenceStatus.PRESENT]: '#10B981', // Vert
  [PresenceStatus.ABSENT]: '#EF4444', // Rouge
  [PresenceStatus.LATE]: '#F59E0B', // Orange
  [PresenceStatus.EARLY_LEAVE]: '#F59E0B', // Orange
  [PresenceStatus.ON_BREAK]: '#6B7280', // Gris
  [PresenceStatus.OVERTIME]: '#8B5CF6' // Violet
};

// Couleurs pour les statuts de congé
export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  [LeaveStatus.PENDING]: '#F59E0B', // Orange
  [LeaveStatus.APPROVED]: '#10B981', // Vert
  [LeaveStatus.REJECTED]: '#EF4444', // Rouge
  [LeaveStatus.CANCELLED]: '#6B7280' // Gris
};

// Paramètres par défaut pour les organisations
export const DEFAULT_PRESENCE_SETTINGS = {
  workingDaysPerWeek: 5,
  standardWorkHours: 8,
  requireGeolocation: false,
  allowedLocationRadius: 100, // mètres
  gracePeriodsMinutes: {
    lateArrival: 15,
    earlyDeparture: 15
  },
  notificationSettings: {
    missedClockIn: true,
    missedClockOut: true,
    overtime: true,
    leaveRequests: true
  },
  leaveApprovalWorkflow: {
    requiresApproval: true,
    approverRoles: ['manager', 'hr'],
    autoApproveThreshold: 1 // jour
  }
};

// Horaire de travail par défaut (Lundi-Vendredi, 9h-17h)
export const DEFAULT_WORK_SCHEDULE = {
  name: 'Horaire standard',
  type: ScheduleType.FIXED,
  weeklySchedule: {
    0: { // Dimanche
      isWorkDay: false,
      type: WorkDayType.WEEKEND
    },
    1: { // Lundi
      isWorkDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      type: WorkDayType.REGULAR
    },
    2: { // Mardi
      isWorkDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      type: WorkDayType.REGULAR
    },
    3: { // Mercredi
      isWorkDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      type: WorkDayType.REGULAR
    },
    4: { // Jeudi
      isWorkDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      type: WorkDayType.REGULAR
    },
    5: { // Vendredi
      isWorkDay: true,
      startTime: '09:00',
      endTime: '17:00',
      breakDuration: 60,
      type: WorkDayType.REGULAR
    },
    6: { // Samedi
      isWorkDay: false,
      type: WorkDayType.WEEKEND
    }
  },
  defaultBreakDuration: 60,
  maxOvertimeHours: 4,
  gracePeriodsMinutes: {
    lateArrival: 15,
    earlyDeparture: 15
  }
};

// Soldes de congés par défaut (en jours)
export const DEFAULT_LEAVE_BALANCES: Record<LeaveType, number> = {
  [LeaveType.VACATION]: 25,
  [LeaveType.SICK_LEAVE]: 10,
  [LeaveType.PERSONAL]: 5,
  [LeaveType.MATERNITY]: 0,
  [LeaveType.PATERNITY]: 0,
  [LeaveType.BEREAVEMENT]: 3,
  [LeaveType.UNPAID]: 0,
  [LeaveType.COMPENSATORY]: 0,
  [LeaveType.STUDY]: 0
};

// Limites de validation
export const VALIDATION_LIMITS = {
  maxLocationRadius: 1000, // mètres
  maxOvertimeHours: 12,
  maxBreakDuration: 240, // minutes (4 heures)
  maxLeaveRequestDays: 365,
  maxGracePeriod: 60, // minutes
  minWorkHours: 1,
  maxWorkHours: 16
};

// Messages d'erreur pour la validation
export const PRESENCE_ERROR_MESSAGES = {
  INVALID_LOCATION: 'Localisation invalide ou hors de la zone autorisée',
  ALREADY_CLOCKED_IN: 'Vous êtes déjà pointé(e)',
  NOT_CLOCKED_IN: 'Vous devez d\'abord pointer votre arrivée',
  INVALID_TIME_RANGE: 'Plage horaire invalide',
  OVERLAPPING_LEAVE: 'Cette demande de congé chevauche avec une autre demande',
  INSUFFICIENT_BALANCE: 'Solde de congés insuffisant',
  PAST_DATE_NOT_ALLOWED: 'Les dates passées ne sont pas autorisées',
  WEEKEND_NOT_ALLOWED: 'Les week-ends ne sont pas autorisés pour ce type de congé',
  MAX_DURATION_EXCEEDED: 'Durée maximale dépassée'
};

// Endpoints API pour la gestion de présence
export const PRESENCE_API_ENDPOINTS = {
  // Présence
  CLOCK_IN: '/api/presence/clock-in',
  CLOCK_OUT: '/api/presence/clock-out',
  GET_STATUS: '/api/presence/status',
  GET_ENTRIES: '/api/presence/entries',
  UPDATE_ENTRY: '/api/presence/entries/:id',
  
  // Congés
  LEAVE_REQUESTS: '/api/leave/requests',
  SUBMIT_LEAVE: '/api/leave/submit',
  APPROVE_LEAVE: '/api/leave/:id/approve',
  REJECT_LEAVE: '/api/leave/:id/reject',
  CANCEL_LEAVE: '/api/leave/:id/cancel',
  
  // Horaires
  SCHEDULES: '/api/schedules',
  CREATE_SCHEDULE: '/api/schedules',
  UPDATE_SCHEDULE: '/api/schedules/:id',
  DELETE_SCHEDULE: '/api/schedules/:id',
  
  // Employés
  EMPLOYEES: '/api/employees',
  EMPLOYEE_PRESENCE: '/api/employees/:id/presence',
  EMPLOYEE_SCHEDULE: '/api/employees/:id/schedule',
  
  // Rapports
  REPORTS: '/api/reports/presence',
  GENERATE_REPORT: '/api/reports/presence/generate',
  EXPORT_REPORT: '/api/reports/presence/export',
  
  // Paramètres
  SETTINGS: '/api/presence/settings',
  UPDATE_SETTINGS: '/api/presence/settings'
};

// Types de notifications pour la présence
export const PRESENCE_NOTIFICATION_TYPES = {
  MISSED_CLOCK_IN: 'presence.missed_clock_in',
  MISSED_CLOCK_OUT: 'presence.missed_clock_out',
  OVERTIME_ALERT: 'presence.overtime_alert',
  LEAVE_REQUEST_SUBMITTED: 'leave.request_submitted',
  LEAVE_REQUEST_APPROVED: 'leave.request_approved',
  LEAVE_REQUEST_REJECTED: 'leave.request_rejected',
  LEAVE_REMINDER: 'leave.reminder',
  SCHEDULE_CHANGED: 'schedule.changed',
  CLOCK_OUT_CONFIRMATION: 'presence.clock_out_confirmation',
  VALIDATION_NOTIFICATION: 'presence.validation_notification',
  ANOMALY_ALERT: 'presence.anomaly_alert',
  WELCOME_NOTIFICATION: 'presence.welcome_notification'
};

// Formats de date pour la présence
export const PRESENCE_DATE_FORMATS = {
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'DD/MM/YYYY à HH:mm'
};

// Permissions pour la gestion de présence
export const PRESENCE_PERMISSIONS = {
  // Présence personnelle
  CLOCK_IN_OUT: 'presence.clock_in_out',
  VIEW_OWN_PRESENCE: 'presence.view_own',
  
  // Gestion d'équipe
  VIEW_TEAM_PRESENCE: 'presence.view_team',
  MANAGE_TEAM_PRESENCE: 'presence.manage_team',
  VALIDATE_PRESENCE: 'presence.validate',
  
  // Congés
  REQUEST_LEAVE: 'leave.request',
  APPROVE_LEAVE: 'leave.approve',
  MANAGE_LEAVE_BALANCES: 'leave.manage_balances',
  
  // Horaires
  VIEW_SCHEDULES: 'schedule.view',
  MANAGE_SCHEDULES: 'schedule.manage',
  
  // Rapports
  VIEW_REPORTS: 'reports.view',
  GENERATE_REPORTS: 'reports.generate',
  EXPORT_REPORTS: 'reports.export',
  
  // Administration
  MANAGE_PRESENCE_SETTINGS: 'presence.manage_settings',
  MANAGE_EMPLOYEES: 'employees.manage'
};

export {
  PresenceStatus,
  LeaveType,
  LeaveStatus,
  WorkDayType,
  ScheduleType
};