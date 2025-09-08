/**
 * Templates de notifications pour la gestion de présence
 */

import { PRESENCE_NOTIFICATION_TYPES } from '../shared';

export interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  body: string;
  variables: string[];
  channel: 'email' | 'sms' | 'push' | 'all';
  priority: 'low' | 'medium' | 'high';
}

export const DEFAULT_PRESENCE_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Pointage d'arrivée manqué
  {
    id: 'missed_clock_in_employee',
    type: PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_IN,
    title: 'Pointage d\'arrivée manqué',
    body: 'Bonjour {{employeeName}}, vous n\'avez pas encore pointé votre arrivée. Vous êtes en retard de {{minutesLate}} minutes.',
    variables: ['employeeName', 'minutesLate', 'scheduledStartTime'],
    channel: 'push',
    priority: 'medium'
  },
  {
    id: 'missed_clock_in_manager',
    type: 'EMPLOYEE_LATE',
    title: 'Employé en retard',
    body: 'L\'employé {{employeeName}} n\'a pas pointé son arrivée. Retard: {{minutesLate}} minutes.',
    variables: ['employeeName', 'minutesLate', 'scheduledStartTime'],
    channel: 'email',
    priority: 'medium'
  },

  // Pointage de sortie manqué
  {
    id: 'missed_clock_out_employee',
    type: PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_OUT,
    title: 'Pointage de sortie manqué',
    body: 'N\'oubliez pas de pointer votre sortie, {{employeeName}}. Vous travaillez depuis {{hoursWorked}} heures.',
    variables: ['employeeName', 'hoursWorked', 'clockInTime'],
    channel: 'push',
    priority: 'medium'
  },
  {
    id: 'missed_clock_out_manager',
    type: 'EMPLOYEE_OVERTIME_ALERT',
    title: 'Employé en heures supplémentaires',
    body: 'L\'employé {{employeeName}} travaille depuis {{hoursWorked}} heures sans pointer sa sortie.',
    variables: ['employeeName', 'hoursWorked', 'clockInTime'],
    channel: 'email',
    priority: 'high'
  },

  // Heures supplémentaires
  {
    id: 'overtime_alert_employee',
    type: PRESENCE_NOTIFICATION_TYPES.OVERTIME_ALERT,
    title: 'Heures supplémentaires détectées',
    body: 'Vous avez effectué {{overtimeHours}} heures supplémentaires aujourd\'hui, {{employeeName}}.',
    variables: ['employeeName', 'overtimeHours', 'date'],
    channel: 'push',
    priority: 'low'
  },
  {
    id: 'overtime_alert_manager',
    type: 'EMPLOYEE_OVERTIME',
    title: 'Heures supplémentaires employé',
    body: 'L\'employé {{employeeName}} a effectué {{overtimeHours}} heures supplémentaires le {{date}}.',
    variables: ['employeeName', 'overtimeHours', 'date'],
    channel: 'email',
    priority: 'medium'
  },

  // Demandes de congé
  {
    id: 'leave_request_submitted',
    type: PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED,
    title: 'Demande de congé soumise',
    body: 'Votre demande de congé {{leaveType}} du {{startDate}} au {{endDate}} a été soumise avec succès.',
    variables: ['employeeName', 'leaveType', 'startDate', 'endDate', 'totalDays'],
    channel: 'email',
    priority: 'medium'
  },
  {
    id: 'leave_request_pending_manager',
    type: 'LEAVE_REQUEST_PENDING',
    title: 'Nouvelle demande de congé',
    body: '{{employeeName}} a soumis une demande de congé {{leaveType}} du {{startDate}} au {{endDate}} ({{totalDays}} jours).',
    variables: ['employeeName', 'leaveType', 'startDate', 'endDate', 'totalDays'],
    channel: 'email',
    priority: 'medium'
  },
  {
    id: 'leave_request_approved',
    type: PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED,
    title: 'Demande de congé approuvée',
    body: 'Bonne nouvelle ! Votre demande de congé du {{startDate}} au {{endDate}} a été approuvée.',
    variables: ['employeeName', 'leaveType', 'startDate', 'endDate', 'approvedBy'],
    channel: 'email',
    priority: 'medium'
  },
  {
    id: 'leave_request_rejected',
    type: PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED,
    title: 'Demande de congé rejetée',
    body: 'Votre demande de congé du {{startDate}} au {{endDate}} a été rejetée. Raison: {{rejectionReason}}',
    variables: ['employeeName', 'leaveType', 'startDate', 'endDate', 'rejectionReason'],
    channel: 'email',
    priority: 'medium'
  },

  // Rappels de congés
  {
    id: 'leave_reminder',
    type: PRESENCE_NOTIFICATION_TYPES.LEAVE_REMINDER,
    title: 'Rappel: Congés à prendre',
    body: 'Vous avez {{leaveBalance}} jours de {{leaveType}} à prendre avant le {{expirationDate}}.',
    variables: ['employeeName', 'leaveType', 'leaveBalance', 'expirationDate'],
    channel: 'email',
    priority: 'low'
  },

  // Changement d'horaire
  {
    id: 'schedule_changed',
    type: PRESENCE_NOTIFICATION_TYPES.SCHEDULE_CHANGED,
    title: 'Changement d\'horaire',
    body: 'Votre horaire de travail a été modifié. Nouveaux horaires: {{newSchedule}}. Effectif à partir du {{effectiveDate}}.',
    variables: ['employeeName', 'oldSchedule', 'newSchedule', 'effectiveDate'],
    channel: 'email',
    priority: 'high'
  },

  // Rappels généraux
  {
    id: 'daily_reminder',
    type: 'DAILY_REMINDER',
    title: 'Rappel quotidien',
    body: 'N\'oubliez pas de pointer votre arrivée et votre départ aujourd\'hui.',
    variables: ['employeeName'],
    channel: 'push',
    priority: 'low'
  },
  {
    id: 'weekly_summary',
    type: 'WEEKLY_SUMMARY',
    title: 'Résumé hebdomadaire',
    body: 'Cette semaine: {{totalHours}} heures travaillées, {{overtimeHours}} heures supplémentaires.',
    variables: ['employeeName', 'totalHours', 'overtimeHours', 'weekNumber'],
    channel: 'email',
    priority: 'low'
  }
];

// Templates d'emails HTML
export const EMAIL_TEMPLATES = {
  MISSED_CLOCK_IN: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Pointage d'arrivée manqué</h2>
      <p>Bonjour <strong>{{employeeName}}</strong>,</p>
      <p>Nous avons remarqué que vous n'avez pas encore pointé votre arrivée aujourd'hui.</p>
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Heure prévue:</strong> {{scheduledStartTime}}</p>
        <p><strong>Retard actuel:</strong> {{minutesLate}} minutes</p>
      </div>
      <p>Veuillez pointer votre arrivée dès que possible via l'application ou contactez votre manager.</p>
      <p>Cordialement,<br>L'équipe RH</p>
    </div>
  `,

  LEAVE_REQUEST_APPROVED: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Demande de congé approuvée</h2>
      <p>Bonjour <strong>{{employeeName}}</strong>,</p>
      <p>Nous avons le plaisir de vous informer que votre demande de congé a été approuvée.</p>
      <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Type de congé:</strong> {{leaveType}}</p>
        <p><strong>Période:</strong> du {{startDate}} au {{endDate}}</p>
        <p><strong>Durée:</strong> {{totalDays}} jour(s)</p>
        <p><strong>Approuvé par:</strong> {{approvedBy}}</p>
      </div>
      <p>Profitez bien de votre congé !</p>
      <p>Cordialement,<br>L'équipe RH</p>
    </div>
  `,

  OVERTIME_ALERT: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #8b5cf6;">Heures supplémentaires détectées</h2>
      <p>Bonjour <strong>{{employeeName}}</strong>,</p>
      <p>Nous avons détecté que vous avez effectué des heures supplémentaires aujourd'hui.</p>
      <div style="background-color: #ede9fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Date:</strong> {{date}}</p>
        <p><strong>Heures supplémentaires:</strong> {{overtimeHours}} heures</p>
      </div>
      <p>Ces heures seront comptabilisées dans votre relevé mensuel.</p>
      <p>Cordialement,<br>L'équipe RH</p>
    </div>
  `
};

// Configuration des canaux de notification par type
export const NOTIFICATION_CHANNEL_CONFIG = {
  [PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_IN]: ['push', 'sms'],
  [PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_OUT]: ['push'],
  [PRESENCE_NOTIFICATION_TYPES.OVERTIME_ALERT]: ['push', 'email'],
  [PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED]: ['email'],
  [PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED]: ['email', 'push'],
  [PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED]: ['email', 'push'],
  [PRESENCE_NOTIFICATION_TYPES.LEAVE_REMINDER]: ['email'],
  [PRESENCE_NOTIFICATION_TYPES.SCHEDULE_CHANGED]: ['email', 'push']
};

// Délais de notification (en minutes)
export const NOTIFICATION_DELAYS = {
  MISSED_CLOCK_IN: 15, // Après 15 minutes de retard
  MISSED_CLOCK_OUT: 540, // Après 9 heures de travail
  OVERTIME_THRESHOLD: 2, // À partir de 2 heures supplémentaires
  LEAVE_REMINDER_DAYS: 30 // 30 jours avant expiration
};