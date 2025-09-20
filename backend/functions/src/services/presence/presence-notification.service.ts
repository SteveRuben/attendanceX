/**
 * Service de notifications pour la gestion de présence
 */

import { logger } from 'firebase-functions';
import { collections, db } from '../../config/database';
import { Employee, LeaveRequest, PresenceEntry, PresenceStatus } from '../../common/types';
import { PRESENCE_NOTIFICATION_TYPES } from '../../common/constants';


export interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  body: string;
  variables: string[];
}

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  preferredChannel: 'email' | 'sms' | 'push' | 'all';
}

export interface PresenceNotificationData {
  employeeId: string;
  employeeName: string;
  organizationId: string;
  date: string;
  clockInTime?: Date;
  clockOutTime?: Date;
  overtimeHours?: number;
  status?: PresenceStatus;
  leaveRequest?: LeaveRequest;
}

class PresenceNotificationService {
  private readonly templatesCollection = 'notification_templates';
  private readonly notificationsCollection = 'notifications';

  /**
   * Envoyer une notification de pointage manqué
   */
  async sendMissedClockInNotification(
    employee: Employee,
    scheduledStartTime: Date,
    currentTime: Date
  ): Promise<void> {
    try {
      const minutesLate = Math.floor((currentTime.getTime() - scheduledStartTime.getTime()) / (1000 * 60));
      
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`, // TODO: Récupérer le nom complet
        organizationId: employee.organizationId,
        date: new Date().toISOString().split('T')[0]
      };

      // const template = await this.getNotificationTemplate(PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_IN);
      
      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_IN,
        title: 'Pointage d\'arrivée manqué',
        body: `Vous n'avez pas encore pointé votre arrivée. Vous êtes en retard de ${minutesLate} minutes.`,
        data: notificationData,
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'push' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(notification);

      // Notifier aussi le manager si retard > 30 minutes
      if (minutesLate > 30) {
        await this.notifyManager(employee, 'EMPLOYEE_LATE', {
          ...notificationData,
          minutesLate
        });
      }

      logger.info('Missed clock-in notification sent', { 
        employeeId: employee.id, 
        minutesLate 
      });

    } catch (error) {
      logger.error('Failed to send missed clock-in notification', { error, employeeId: employee.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification de pointage de sortie manqué
   */
  async sendMissedClockOutNotification(
    employee: Employee,
    clockInTime: Date,
    currentTime: Date
  ): Promise<void> {
    try {
      const hoursWorked = Math.floor((currentTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60));
      
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`,
        organizationId: employee.organizationId,
        date: new Date().toISOString().split('T')[0],
        clockInTime
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.MISSED_CLOCK_OUT,
        title: 'Pointage de sortie manqué',
        body: `N'oubliez pas de pointer votre sortie. Vous travaillez depuis ${hoursWorked} heures.`,
        data: notificationData,
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'push' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(notification);

      // Notifier le manager si plus de 12 heures
      if (hoursWorked > 12) {
        await this.notifyManager(employee, 'EMPLOYEE_OVERTIME_ALERT', {
          ...notificationData,
          hoursWorked
        });
      }

      logger.info('Missed clock-out notification sent', { 
        employeeId: employee.id, 
        hoursWorked 
      });

    } catch (error) {
      logger.error('Failed to send missed clock-out notification', { error, employeeId: employee.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification d'heures supplémentaires
   */
  async sendOvertimeAlert(
    employee: Employee,
    presenceEntry: PresenceEntry
  ): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`,
        organizationId: employee.organizationId,
        date: presenceEntry.date,
        overtimeHours: presenceEntry.overtimeHours,
        status: presenceEntry.status
      };

      // Notifier l'employé
      const employeeNotification = {
        type: PRESENCE_NOTIFICATION_TYPES.OVERTIME_ALERT,
        title: 'Heures supplémentaires détectées',
        body: `Vous avez effectué ${presenceEntry.overtimeHours?.toFixed(1)} heures supplémentaires aujourd'hui.`,
        data: notificationData,
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'push' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'low' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(employeeNotification);

      // Notifier le manager
      await this.notifyManager(employee, 'EMPLOYEE_OVERTIME', notificationData);

      logger.info('Overtime alert sent', { 
        employeeId: employee.id, 
        overtimeHours: presenceEntry.overtimeHours 
      });

    } catch (error) {
      logger.error('Failed to send overtime alert', { error, employeeId: employee.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification d'approbation de congé
   */
  async sendLeaveApprovalNotification(leaveRequest: LeaveRequest): Promise<void> {
    try {
      // Récupérer l'employé
      const employeeDoc = await db.collection('employees').doc(leaveRequest.employeeId).get();
      if (!employeeDoc.exists) {
        logger.warn('Employee not found for leave approval notification', { employeeId: leaveRequest.employeeId });
        return;
      }

      const employee = employeeDoc.data() as Employee;
      await this.sendLeaveRequestNotification(employee, leaveRequest, 'approved');

      logger.info('Leave approval notification sent', { 
        employeeId: leaveRequest.employeeId,
        leaveRequestId: leaveRequest.id 
      });

    } catch (error) {
      logger.error('Failed to send leave approval notification', { error, leaveRequestId: leaveRequest.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification de rejet de congé
   */
  async sendLeaveRejectionNotification(leaveRequest: LeaveRequest): Promise<void> {
    try {
      // Récupérer l'employé
      const employeeDoc = await db.collection('employees').doc(leaveRequest.employeeId).get();
      if (!employeeDoc.exists) {
        logger.warn('Employee not found for leave rejection notification', { employeeId: leaveRequest.employeeId });
        return;
      }

      const employee = employeeDoc.data() as Employee;
      await this.sendLeaveRequestNotification(employee, leaveRequest, 'rejected');

      logger.info('Leave rejection notification sent', { 
        employeeId: leaveRequest.employeeId,
        leaveRequestId: leaveRequest.id 
      });

    } catch (error) {
      logger.error('Failed to send leave rejection notification', { error, leaveRequestId: leaveRequest.id });
      throw error;
    }
  }

  /**
   * Envoyer un rappel de pointage de sortie manqué
   */
  async sendMissedClockOutReminder(entry: PresenceEntry): Promise<void> {
    try {
      // Récupérer l'employé
      const employeeDoc = await db.collection('employees').doc(entry.employeeId).get();
      if (!employeeDoc.exists) {
        logger.warn('Employee not found for missed clock-out reminder', { employeeId: entry.employeeId });
        return;
      }

      const employee = employeeDoc.data() as Employee;
      const clockInTime = entry.clockInTime || new Date();
      const currentTime = new Date();

      await this.sendMissedClockOutNotification(employee, clockInTime, currentTime);

      logger.info('Missed clock-out reminder sent', { 
        employeeId: entry.employeeId,
        entryId: entry.id 
      });

    } catch (error) {
      logger.error('Failed to send missed clock-out reminder', { error, entryId: entry.id });
      throw error;
    }
  }

  /**
   * Envoyer une confirmation de pointage de sortie
   */
  async sendClockOutConfirmation(entry: PresenceEntry): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: entry.employeeId,
        employeeName: `${entry.employeeId}`, // TODO: Récupérer le nom complet
        organizationId: entry.organizationId,
        date: entry.date,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.CLOCK_OUT_CONFIRMATION,
        title: 'Pointage de sortie confirmé',
        body: `Votre pointage de sortie a été enregistré avec succès.`,
        data: notificationData,
        recipients: [
          {
            userId: entry.employeeId,
            preferredChannel: 'push' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'low' as const,
        organizationId: entry.organizationId
      };

      await this.sendNotification(notification);

      logger.info('Clock-out confirmation sent', { 
        employeeId: entry.employeeId,
        entryId: entry.id 
      });

    } catch (error) {
      logger.error('Failed to send clock-out confirmation', { error, entryId: entry.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification de validation
   */
  async sendValidationNotification(entry: PresenceEntry): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: entry.employeeId,
        employeeName: `${entry.employeeId}`, // TODO: Récupérer le nom complet
        organizationId: entry.organizationId,
        date: entry.date,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.VALIDATION_NOTIFICATION,
        title: 'Présence validée',
        body: `Votre présence du ${entry.date} a été validée par votre manager.`,
        data: notificationData,
        recipients: [
          {
            userId: entry.employeeId,
            preferredChannel: 'push' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: entry.organizationId
      };

      await this.sendNotification(notification);

      logger.info('Validation notification sent', { 
        employeeId: entry.employeeId,
        entryId: entry.id 
      });

    } catch (error) {
      logger.error('Failed to send validation notification', { error, entryId: entry.id });
      throw error;
    }
  }

  /**
   * Envoyer une alerte d'anomalie
   */
  async sendAnomalyAlert(entry: PresenceEntry, anomaly: any): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: entry.employeeId,
        employeeName: `${entry.employeeId}`, // TODO: Récupérer le nom complet
        organizationId: entry.organizationId,
        date: entry.date,
        status: entry.status
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.ANOMALY_ALERT,
        title: 'Anomalie de présence détectée',
        body: `Une anomalie a été détectée dans la présence de l'employé.`,
        data: {
          ...notificationData,
          anomaly
        },
        recipients: [
          {
            userId: 'manager', // TODO: Récupérer le manager réel
            preferredChannel: 'email' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'high' as const,
        organizationId: entry.organizationId
      };

      await this.sendNotification(notification);

      logger.info('Anomaly alert sent', { 
        employeeId: entry.employeeId,
        entryId: entry.id,
        severity: anomaly.severity 
      });

    } catch (error) {
      logger.error('Failed to send anomaly alert', { error, entryId: entry.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification de bienvenue
   */
  async sendWelcomeNotification(employee: Employee): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`,
        organizationId: employee.organizationId,
        date: new Date().toISOString().split('T')[0]
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.WELCOME_NOTIFICATION,
        title: 'Bienvenue dans le système de présence',
        body: `Bienvenue ! Voici comment utiliser le système de pointage.`,
        data: notificationData,
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'email' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(notification);

      logger.info('Welcome notification sent', { 
        employeeId: employee.id 
      });

    } catch (error) {
      logger.error('Failed to send welcome notification', { error, employeeId: employee.id });
      throw error;
    }
  }

  /**
   * Envoyer une notification de demande de congé
   */
  async sendLeaveRequestNotification(
    employee: Employee,
    leaveRequest: LeaveRequest,
    action: 'submitted' | 'approved' | 'rejected'
  ): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`,
        organizationId: employee.organizationId,
        date: new Date().toISOString().split('T')[0],
        leaveRequest
      };

      let notificationType: string;
      let title: string;
      let body: string;

      switch (action) {
        case 'submitted':
          notificationType = PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_SUBMITTED;
          title = 'Demande de congé soumise';
          body = `Votre demande de congé du ${leaveRequest.startDate} au ${leaveRequest.endDate} a été soumise.`;
          break;
        case 'approved':
          notificationType = PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_APPROVED;
          title = 'Demande de congé approuvée';
          body = `Votre demande de congé du ${leaveRequest.startDate} au ${leaveRequest.endDate} a été approuvée.`;
          break;
        case 'rejected':
          notificationType = PRESENCE_NOTIFICATION_TYPES.LEAVE_REQUEST_REJECTED;
          title = 'Demande de congé rejetée';
          body = `Votre demande de congé du ${leaveRequest.startDate} au ${leaveRequest.endDate} a été rejetée.`;
          if (leaveRequest.rejectionReason) {
            body += ` Raison: ${leaveRequest.rejectionReason}`;
          }
          break;
      }

      const notification = {
        type: notificationType,
        title,
        body,
        data: notificationData,
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'email' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(notification);

      // Si c'est une soumission, notifier le manager
      if (action === 'submitted') {
        await this.notifyManager(employee, 'LEAVE_REQUEST_PENDING', notificationData);
      }

      logger.info('Leave request notification sent', { 
        employeeId: employee.id, 
        action,
        leaveRequestId: leaveRequest.id 
      });

    } catch (error) {
      logger.error('Failed to send leave request notification', { error, employeeId: employee.id, action });
      throw error;
    }
  }

  /**
   * Envoyer des rappels de congés à prendre
   */
  async sendLeaveReminders(organizationId: string): Promise<void> {
    try {
      // Récupérer les employés avec des congés qui expirent bientôt
      const employeesQuery = collections.employees
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const employeesSnapshot = await employeesQuery.get();
      const reminders: any[] = [];

      employeesSnapshot.forEach(doc => {
        const employee = doc.data() as Employee;
        
        // Vérifier les soldes de congés
        Object.entries(employee.leaveBalances).forEach(([leaveType, balance]) => {
          const numericBalance = balance as number;
          if (numericBalance > 0) {
            // Exemple: rappel si plus de 20 jours de congés non pris
            if (numericBalance > 20) {
              reminders.push({
                employee,
                leaveType,
                balance: numericBalance
              });
            }
          }
        });
      });

      // Envoyer les rappels
      for (const reminder of reminders) {
        const notification = {
          type: PRESENCE_NOTIFICATION_TYPES.LEAVE_REMINDER,
          title: 'Rappel: Congés à prendre',
          body: `Vous avez ${reminder.balance} jours de ${reminder.leaveType} à prendre avant la fin de l'année.`,
          data: {
            employeeId: reminder.employee.id,
            employeeName: reminder.employee.userId,
            organizationId,
            date: new Date().toISOString().split('T')[0],
            leaveType: reminder.leaveType,
            balance: reminder.balance
          },
          recipients: [
            {
              userId: reminder.employee.userId,
              email: reminder.employee.workEmail,
              preferredChannel: 'email' as const
            }
          ],
          scheduledFor: new Date(),
          priority: 'low' as const,
          organizationId
        };

        await this.sendNotification(notification);
      }

      logger.info('Leave reminders sent', { organizationId, remindersCount: reminders.length });

    } catch (error) {
      logger.error('Failed to send leave reminders', { error, organizationId });
      throw error;
    }
  }

  /**
   * Envoyer une notification de changement d'horaire
   */
  async sendScheduleChangeNotification(
    employee: Employee,
    oldSchedule: any,
    newSchedule: any,
    effectiveDate: Date
  ): Promise<void> {
    try {
      const notificationData: PresenceNotificationData = {
        employeeId: employee.id!,
        employeeName: `${employee.userId}`,
        organizationId: employee.organizationId,
        date: effectiveDate.toISOString().split('T')[0]
      };

      const notification = {
        type: PRESENCE_NOTIFICATION_TYPES.SCHEDULE_CHANGED,
        title: 'Changement d\'horaire',
        body: `Votre horaire de travail a été modifié. Les nouveaux horaires prennent effet le ${effectiveDate.toLocaleDateString()}.`,
        data: {
          ...notificationData,
          oldSchedule,
          newSchedule
        },
        recipients: [
          {
            userId: employee.userId,
            email: employee.workEmail,
            preferredChannel: 'email' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'high' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(notification);

      logger.info('Schedule change notification sent', { 
        employeeId: employee.id,
        effectiveDate 
      });

    } catch (error) {
      logger.error('Failed to send schedule change notification', { error, employeeId: employee.id });
      throw error;
    }
  }

  /**
   * Traitement automatique des notifications quotidiennes
   */
  async processDailyNotifications(organizationId: string): Promise<{
    missedClockIns: number;
    missedClockOuts: number;
    overtimeAlerts: number;
    leaveReminders: number;
  }> {
    try {
      logger.info('Processing daily notifications', { organizationId });

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      let missedClockIns = 0;
      let missedClockOuts = 0;
      let overtimeAlerts = 0;

      // Récupérer toutes les entrées de présence d'aujourd'hui
      const presenceQuery = collections.presence_entries
        .where('organizationId', '==', organizationId)
        .where('date', '==', today);

      const presenceSnapshot = await presenceQuery.get();

      for (const doc of presenceSnapshot.docs) {
        const entry = doc.data() as PresenceEntry;
        
        // Récupérer l'employé
        const employeeDoc = await collections.employees.doc(entry.employeeId).get();
        if (!employeeDoc.exists) {continue;}
        
        const employee = employeeDoc.data() as Employee;

        // Vérifier les pointages manqués
        if (!entry.clockInTime && entry.scheduledStartTime) {
          const scheduledStart = new Date(entry.scheduledStartTime);
          const minutesLate = (now.getTime() - scheduledStart.getTime()) / (1000 * 60);
          
          // Envoyer notification si plus de 15 minutes de retard
          if (minutesLate > 15) {
            await this.sendMissedClockInNotification(employee, scheduledStart, now);
            missedClockIns++;
          }
        }

        // Vérifier les sorties manquées
        if (entry.clockInTime && !entry.clockOutTime) {
          const clockInTime = new Date(entry.clockInTime);
          const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          
          // Envoyer notification si plus de 9 heures de travail
          if (hoursWorked > 9) {
            await this.sendMissedClockOutNotification(employee, clockInTime, now);
            missedClockOuts++;
          }
        }

        // Vérifier les heures supplémentaires
        if (entry.overtimeHours && entry.overtimeHours > 2) {
          await this.sendOvertimeAlert(employee, entry);
          overtimeAlerts++;
        }
      }

      // Envoyer les rappels de congés (une fois par semaine)
      const dayOfWeek = now.getDay();
      let leaveReminders = 0;
      if (dayOfWeek === 1) { // Lundi
        await this.sendLeaveReminders(organizationId);
        leaveReminders = 1; // Indicateur que les rappels ont été envoyés
      }

      logger.info('Daily notifications processed', {
        organizationId,
        missedClockIns,
        missedClockOuts,
        overtimeAlerts,
        leaveReminders
      });

      return {
        missedClockIns,
        missedClockOuts,
        overtimeAlerts,
        leaveReminders
      };

    } catch (error) {
      logger.error('Failed to process daily notifications', { error, organizationId });
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private async sendNotification(notification: any): Promise<void> {
    try {
      // Sauvegarder la notification en base
      const docRef = db.collection(this.notificationsCollection).doc();
      await docRef.set({
        ...notification,
        id: docRef.id,
        createdAt: new Date(),
        status: 'pending'
      });

      // TODO: Intégrer avec le service de notifications existant
      // pour l'envoi effectif (email, SMS, push)
      
      logger.debug('Notification saved', { notificationId: docRef.id, type: notification.type });

    } catch (error) {
      logger.error('Failed to send notification', { error, notification });
      throw error;
    }
  }

  private async notifyManager(
    employee: Employee, 
    notificationType: string, 
    data: any
  ): Promise<void> {
    try {
      // TODO: Récupérer le manager de l'employé
      // Pour l'instant, on simule avec un manager générique
      
      const managerNotification = {
        type: notificationType,
        title: 'Alerte équipe',
        body: `Alerte concernant l'employé ${employee.userId}`,
        data: {
          ...data,
          managedEmployeeId: employee.id
        },
        recipients: [
          {
            userId: 'manager', // TODO: ID réel du manager
            preferredChannel: 'email' as const
          }
        ],
        scheduledFor: new Date(),
        priority: 'medium' as const,
        organizationId: employee.organizationId
      };

      await this.sendNotification(managerNotification);

    } catch (error) {
      logger.error('Failed to notify manager', { error, employeeId: employee.id });
    }
  }

  // @ts-ignore
  private async getNotificationTemplate(type: string): Promise<NotificationTemplate | null> {
    try {
      const query = collections[this.templatesCollection]
        .where('type', '==', type)
        .limit(1);

      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as NotificationTemplate;

    } catch (error) {
      logger.error('Failed to get notification template', { error, type });
      return null;
    }
  }
}

export { PresenceNotificationService };
export const presenceNotificationService = new PresenceNotificationService();