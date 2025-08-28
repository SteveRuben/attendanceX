// backend/functions/src/services/attendance-alerts.service.ts - Service d'alertes de présence

import { getFirestore } from "firebase-admin/firestore";
import { AttendanceRecord, AttendanceStatus, ERROR_CODES, NotificationChannel, NotificationPriority, NotificationType } from "@attendance-x/shared";
import { EventModel } from "../models/event.model";
import { notificationService } from "./notification";

export interface AttendanceAlert {
  id: string;
  eventId: string;
  type: 'low_attendance' | 'capacity_reached' | 'late_start' | 'high_absence' | 'quorum_not_met' | 'punctuality_issue';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  recipients: string[];
  escalated: boolean;
  escalationLevel: number;
}

export interface AlertRule {
  id: string;
  eventId?: string; // Si null, règle globale
  organizationId: string;
  type: AttendanceAlert['type'];
  threshold: number;
  severity: AttendanceAlert['severity'];
  enabled: boolean;
  recipients: string[];
  escalationRules: {
    timeMinutes: number;
    recipients: string[];
    severity: AttendanceAlert['severity'];
  }[];
  conditions: {
    timeWindow?: { start: number; end: number }; // Minutes depuis le début de l'événement
    minimumParticipants?: number;
    eventTypes?: string[];
  };
}

export class AttendanceAlertsService {
  private readonly db = getFirestore();
  private alertCheckers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Vérifier et générer les alertes pour un événement
   */
  async checkAndGenerateAlerts(eventId: string): Promise<AttendanceAlert[]> {
    try {
      const event = await this.getEventById(eventId);
      const eventData = event.getData();
      
      // Récupérer les règles d'alerte
      const rules = await this.getAlertRules(eventId, eventData.organizationId);
      
      // Récupérer les statistiques actuelles
      const stats = await this.getAttendanceStats(eventId);
      
      const alerts: AttendanceAlert[] = [];
      
      for (const rule of rules) {
        if (!rule.enabled) {continue;}
        
        const alert = await this.evaluateRule(rule, stats, event);
        if (alert) {
          alerts.push(alert);
        }
      }
      
      // Sauvegarder les nouvelles alertes
      for (const alert of alerts) {
        await this.saveAlert(alert);
        await this.sendAlertNotifications(alert);
      }
      
      return alerts;
    } catch (error) {
      console.error('Error checking alerts:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Démarrer la surveillance automatique d'un événement
   */
  startEventMonitoring(eventId: string, intervalMinutes: number = 5): void {
    // Arrêter la surveillance existante si elle existe
    this.stopEventMonitoring(eventId);
    
    const interval = setInterval(async () => {
      try {
        await this.checkAndGenerateAlerts(eventId);
      } catch (error) {
        console.error(`Error in event monitoring for ${eventId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);
    
    this.alertCheckers.set(eventId, interval);
  }

  /**
   * Arrêter la surveillance d'un événement
   */
  stopEventMonitoring(eventId: string): void {
    const interval = this.alertCheckers.get(eventId);
    if (interval) {
      clearInterval(interval);
      this.alertCheckers.delete(eventId);
    }
  }

  /**
   * Acquitter une alerte
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      await this.db.collection('attendance_alerts').doc(alertId).update({
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Créer ou mettre à jour une règle d'alerte
   */
  async createOrUpdateAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    try {
      const ruleId = this.db.collection('alert_rules').doc().id;
      const alertRule: AlertRule = {
        ...rule,
        id: ruleId
      };
      
      await this.db.collection('alert_rules').doc(ruleId).set(alertRule);
      return alertRule;
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les alertes actives d'un événement
   */
  async getActiveAlerts(eventId: string): Promise<AttendanceAlert[]> {
    try {
      const alertsQuery = await this.db
        .collection('attendance_alerts')
        .where('eventId', '==', eventId)
        .where('acknowledged', '==', false)
        .orderBy('timestamp', 'desc')
        .get();

      return alertsQuery.docs.map(doc => doc.data() as AttendanceAlert);
    } catch (error) {
      console.error('Error getting active alerts:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private async evaluateRule(
    rule: AlertRule, 
    stats: any, 
    event: EventModel
  ): Promise<AttendanceAlert | null> {
    const eventData = event.getData();
    const now = new Date();
    const eventStart = eventData.startDateTime;
    const minutesSinceStart = (now.getTime() - eventStart.getTime()) / (1000 * 60);

    // Vérifier les conditions de temps
    if (rule.conditions.timeWindow) {
      const { start, end } = rule.conditions.timeWindow;
      if (minutesSinceStart < start || minutesSinceStart > end) {
        return null;
      }
    }

    // Vérifier si l'alerte existe déjà
    const existingAlert = await this.getExistingAlert(rule.eventId || '', rule.type);
    if (existingAlert && !existingAlert.acknowledged) {
      return null; // Ne pas créer de doublon
    }

    let shouldAlert = false;
    let currentValue = 0;
    let title = '';
    let message = '';

    switch (rule.type) {
      case 'low_attendance':
        currentValue = stats.attendanceRate;
        shouldAlert = currentValue < rule.threshold;
        title = 'Taux de présence faible';
        message = `Le taux de présence (${currentValue.toFixed(1)}%) est inférieur au seuil de ${rule.threshold}%`;
        break;

      case 'capacity_reached':
        currentValue = (stats.totalPresent / eventData.capacity) * 100;
        shouldAlert = currentValue >= rule.threshold;
        title = 'Capacité atteinte';
        message = `La capacité de l'événement est à ${currentValue.toFixed(1)}% (${stats.totalPresent}/${eventData.capacity})`;
        break;

      case 'high_absence':
        currentValue = (stats.totalAbsent / stats.totalInvited) * 100;
        shouldAlert = currentValue > rule.threshold;
        title = 'Taux d\'absence élevé';
        message = `Le taux d'absence (${currentValue.toFixed(1)}%) dépasse le seuil de ${rule.threshold}%`;
        break;

      case 'punctuality_issue':
        currentValue = stats.punctualityRate;
        shouldAlert = currentValue < rule.threshold;
        title = 'Problème de ponctualité';
        message = `Le taux de ponctualité (${currentValue.toFixed(1)}%) est inférieur au seuil de ${rule.threshold}%`;
        break;

      case 'quorum_not_met':
        currentValue = stats.totalPresent + stats.totalLate;
        shouldAlert = currentValue < rule.threshold;
        title = 'Quorum non atteint';
        message = `Le quorum requis (${rule.threshold} participants) n'est pas atteint (${currentValue} présents)`;
        break;
    }

    if (!shouldAlert) {
      return null;
    }

    return {
      id: this.db.collection('attendance_alerts').doc().id,
      eventId: rule.eventId || '',
      type: rule.type,
      severity: rule.severity,
      title,
      message,
      threshold: rule.threshold,
      currentValue,
      timestamp: now,
      acknowledged: false,
      recipients: rule.recipients,
      escalated: false,
      escalationLevel: 0
    };
  }

  private async getAlertRules(eventId: string, organizationId: string): Promise<AlertRule[]> {
    const [eventRules, globalRules] = await Promise.all([
      // Règles spécifiques à l'événement
      this.db
        .collection('alert_rules')
        .where('eventId', '==', eventId)
        .where('enabled', '==', true)
        .get(),
      
      // Règles globales de l'organisation
      this.db
        .collection('alert_rules')
        .where('organizationId', '==', organizationId)
        .where('eventId', '==', null)
        .where('enabled', '==', true)
        .get()
    ]);

    const rules: AlertRule[] = [];
    
    eventRules.docs.forEach(doc => rules.push(doc.data() as AlertRule));
    globalRules.docs.forEach(doc => rules.push(doc.data() as AlertRule));
    
    return rules;
  }

  private async getAttendanceStats(eventId: string): Promise<any> {
    const attendancesQuery = await this.db
      .collection('attendances')
      .where('eventId', '==', eventId)
      .get();

    const attendances = attendancesQuery.docs.map(doc => doc.data() as AttendanceRecord);
    
    const totalInvited = await this.getTotalInvited(eventId);
    const totalPresent = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const totalLate = attendances.filter(a => a.status === AttendanceStatus.LATE).length;
    const totalAbsent = totalInvited - attendances.length;
    
    const attendanceRate = totalInvited > 0 ? ((totalPresent + totalLate) / totalInvited) * 100 : 0;
    const punctualityRate = (totalPresent + totalLate) > 0 ? (totalPresent / (totalPresent + totalLate)) * 100 : 0;

    return {
      totalInvited,
      totalPresent,
      totalLate,
      totalAbsent,
      attendanceRate,
      punctualityRate
    };
  }

  private async getTotalInvited(eventId: string): Promise<number> {
    const event = await this.getEventById(eventId);
    return event.getData().participants?.length || 0;
  }

  private async getExistingAlert(eventId: string, type: string): Promise<AttendanceAlert | null> {
    const alertQuery = await this.db
      .collection('attendance_alerts')
      .where('eventId', '==', eventId)
      .where('type', '==', type)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    return alertQuery.empty ? null : alertQuery.docs[0].data() as AttendanceAlert;
  }

  private async saveAlert(alert: AttendanceAlert): Promise<void> {
    await this.db.collection('attendance_alerts').doc(alert.id).set(alert);
  }

  private async sendAlertNotifications(alert: AttendanceAlert): Promise<void> {
    try {
      for (const recipientId of alert.recipients) {
        await notificationService.sendNotification({
          userId: recipientId,
          type: NotificationType.ATTENDANCE_ALERT,
          title: alert.title,
          message: alert.message,
          priority: alert.severity === 'critical' ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
          data: {
            alertId: alert.id,
            eventId: alert.eventId,
            alertType: alert.type
          },
          channels: [NotificationChannel.EMAIL, NotificationChannel.SMS]
        });
      }
    } catch (error) {
      console.error('Error sending alert notifications:', error);
    }
  }

  private async getEventById(eventId: string): Promise<EventModel> {
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    return EventModel.fromFirestore(eventDoc);
  }

  /**
   * Nettoyer les surveillances lors de l'arrêt du service
   */
  cleanup(): void {
    this.alertCheckers.forEach(interval => clearInterval(interval));
    this.alertCheckers.clear();
  }
}

export const attendanceAlertsService = new AttendanceAlertsService();