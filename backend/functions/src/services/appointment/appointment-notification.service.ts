import { getFirestore } from "firebase-admin/firestore";
import { ClientModel } from "../../models/client.model";
import { EmailService, NotificationService, SmsService } from "../notification";
import { AppointmentModel } from "../../models/appointment.model";
import { appointmentTemplateService } from "./appointment-template.service";
import { ClientService } from "../utility";
import {   Appointment, 
  Client, 
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  OrganizationAppointmentSettings,
  Reminder,
  ReminderStatus } from "../../common/types";

const clientService = new ClientService();

// Helper function to convert ClientModel to Client
const clientModelToClient = (clientModel: ClientModel): Client => {
  const data = clientModel.getData();
  return {
    id: data.id,
    organizationId: data.organizationId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    preferences: data.preferences,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    fullName: `${data.firstName} ${data.lastName}`
  };
};

/**
 * Service de notification spécialisé pour les rendez-vous
 * Gère les rappels automatiques, confirmations et notifications liées aux rendez-vous
 */
export class AppointmentNotificationService {
  private readonly db = getFirestore();
  private readonly notificationService: NotificationService;
  private readonly emailService: EmailService;
  private readonly smsService: SmsService;

  constructor() {
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
    this.smsService = new SmsService();
  }

  /**
   * Planifie les rappels automatiques pour un rendez-vous
   */
  async scheduleReminders(appointment: Appointment): Promise<void> {
    try {
      const appointmentModel = new AppointmentModel(appointment);
      
      // Récupérer les paramètres de l'organisation
      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      if (!orgSettings?.reminderConfig?.enabled) {
        return;
      }

      // Récupérer les informations du client
      const client = await clientService.getClientById(appointment.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      const appointmentDateTime = appointmentModel.getAppointmentDateTime();
      const now = new Date();

      // Créer les rappels selon la configuration
      for (const timingHours of orgSettings.reminderConfig.timings) {
        const reminderTime = new Date(appointmentDateTime.getTime() - (timingHours * 60 * 60 * 1000));
        
        // Ne pas créer de rappels dans le passé
        if (reminderTime <= now) {
          continue;
        }

        // Déterminer les canaux selon les préférences du client
        const channels = this.determineReminderChannels(clientModelToClient(client), orgSettings);

        for (const channel of channels) {
          const reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'> = {
            appointmentId: appointment.id!,
            type: channel === NotificationChannel.EMAIL ? 'email' : 'sms',
            scheduledFor: reminderTime,
            status: 'pending',
            content: await this.generateReminderContent(appointment, clientModelToClient(client), channel, timingHours),
            retryCount: 0
          };

          appointmentModel.addReminder(reminder);
        }
      }

      // Sauvegarder les rappels dans le modèle d'appointment
      await this.db.collection('appointments').doc(appointment.id!).update({
        reminders: appointmentModel.getData().reminders,
        updatedAt: new Date()
      });

      console.log(`Scheduled ${appointmentModel.getData().reminders.length} reminders for appointment ${appointment.id}`);
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  /**
   * Traite les rappels en attente (appelé par une fonction planifiée)
   */
  async processScheduledReminders(): Promise<void> {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Récupérer les rendez-vous avec des rappels à envoyer
      const appointmentsSnapshot = await this.db.collection('appointments')
        .where('reminders', '!=', [])
        .get();

      const remindersToProcess: Array<{
        appointment: Appointment;
        reminder: Reminder;
      }> = [];

      for (const doc of appointmentsSnapshot.docs) {
        const appointment = { id: doc.id, ...doc.data() } as Appointment;
        
        for (const reminder of appointment.reminders) {
          if (reminder.status === 'pending' && 
              reminder.scheduledFor <= fiveMinutesFromNow &&
              reminder.scheduledFor > now) {
            remindersToProcess.push({ appointment, reminder });
          }
        }
      }

      console.log(`Processing ${remindersToProcess.length} scheduled reminders`);

      // Traiter chaque rappel
      for (const { appointment, reminder } of remindersToProcess) {
        await this.sendReminder(appointment, reminder);
      }
    } catch (error) {
      console.error('Error processing scheduled reminders:', error);
      throw error;
    }
  }

  /**
   * Envoie un rappel spécifique
   */
  private async sendReminder(appointment: Appointment, reminder: Reminder): Promise<void> {
    try {
      // Marquer le rappel comme en cours d'envoi
      await this.updateReminderStatus(appointment.id!, reminder.id!, 'pending', {
        processingStartedAt: new Date()
      });

      const client = await clientService.getClientById(appointment.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      let success = false;
      let errorMessage = '';

      const clientData = clientModelToClient(client);
      if (reminder.type === 'email' && clientData.email) {
        try {
          const emailResult = await this.emailService.sendEmail(
            clientData.email,
            await this.getEmailSubject(appointment, reminder),
            {
              html: await this.generateEmailContent(appointment, clientData, reminder),
              text: reminder.content
            },
            {
              userId: clientData.id!,
              trackingId: `appointment-reminder-${appointment.id}-${reminder.id}`
            }
          );
          success = emailResult.success;
          if (!success) {
            errorMessage = emailResult.errors?.join(', ') || 'Email sending failed';
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : 'Email sending error';
        }
      } else if (reminder.type === 'sms' && clientData.phone) {
        try {
          const smsResult = await this.smsService.sendSms(
            clientData.phone,
            reminder.content,
            {
              userId: clientData.id!,
              trackingId: `appointment-reminder-${appointment.id}-${reminder.id}`
            }
          );
          success = smsResult.status === 'sent';
          if (!success) {
            errorMessage = 'SMS sending failed';
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : 'SMS sending error';
        }
      } else {
        errorMessage = `No valid contact method for reminder type: ${reminder.type}`;
      }

      // Mettre à jour le statut du rappel
      if (success) {
        await this.updateReminderStatus(appointment.id!, reminder.id!, 'sent', {
          sentAt: new Date()
        });
      } else {
        const newRetryCount = reminder.retryCount + 1;
        const maxRetries = 3;

        if (newRetryCount < maxRetries) {
          // Programmer un nouveau rappel dans 30 minutes
          const retryTime = new Date(Date.now() + 30 * 60 * 1000);
          await this.updateReminderStatus(appointment.id!, reminder.id!, 'pending', {
            retryCount: newRetryCount,
            scheduledFor: retryTime,
            lastError: errorMessage
          });
        } else {
          await this.updateReminderStatus(appointment.id!, reminder.id!, 'failed', {
            retryCount: newRetryCount,
            errorMessage,
            failedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error(`Error sending reminder ${reminder.id} for appointment ${appointment.id}:`, error);
      await this.updateReminderStatus(appointment.id!, reminder.id!, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date()
      });
    }
  }

  /**
   * Envoie une notification de confirmation de rendez-vous
   */
  async sendAppointmentConfirmation(appointment: Appointment): Promise<void> {
    try {
      const client = await clientService.getClientById(appointment.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      const clientData = clientModelToClient(client);
      const channels = this.determineNotificationChannels(clientData);
      
      // Envoyer par email si disponible
      if (channels.includes(NotificationChannel.EMAIL) && clientData.email) {
        const emailContent = await appointmentTemplateService.generateConfirmationContent(
          appointment,
          clientData,
          'email',
          orgSettings || undefined
        );

        await this.emailService.sendEmail(
          clientData.email,
          emailContent.subject || "Confirmation de rendez-vous",
          {
            html: emailContent.html || emailContent.content,
            text: emailContent.content
          },
          {
            userId: clientData.id!,
            trackingId: `appointment-confirmation-${appointment.id}`
          }
        );
      }

      // Envoyer par SMS si disponible
      if (channels.includes(NotificationChannel.SMS) && clientData.phone) {
        const smsContent = await appointmentTemplateService.generateConfirmationContent(
          appointment,
          clientData,
          'sms',
          orgSettings || undefined
        );

        await this.smsService.sendSms(
          clientData.phone,
          smsContent.content,
          {
            userId: clientData.id!,
            trackingId: `appointment-confirmation-${appointment.id}`
          }
        );
      }

      // Envoyer aussi une notification in-app
      await this.notificationService.sendNotification({
        userId: clientData.id!,
        type: NotificationType.ATTENDANCE_CONFIRMATION,
        title: "Confirmation de rendez-vous",
        message: `Votre rendez-vous du ${this.formatDate(appointment.date)} à ${appointment.startTime} est confirmé.`,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
        data: {
          appointmentId: appointment.id,
          date: appointment.date.toISOString(),
          startTime: appointment.startTime,
          duration: appointment.duration
        },
        sentBy: "system"
      });
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification d'annulation de rendez-vous
   */
  async sendAppointmentCancellation(appointment: Appointment, reason?: string): Promise<void> {
    try {
      const client = await clientService.getClientById(appointment.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      const clientData = clientModelToClient(client);
      
      // Envoyer par email si disponible
      if (clientData.email) {
        const emailContent = await appointmentTemplateService.generateCancellationContent(
          appointment,
          clientData,
          'email',
          reason,
          orgSettings || undefined
        );

        await this.emailService.sendEmail(
          clientData.email,
          emailContent.subject || "Annulation de rendez-vous",
          {
            html: emailContent.html || emailContent.content,
            text: emailContent.content
          },
          {
            userId: clientData.id!,
            trackingId: `appointment-cancellation-${appointment.id}`
          }
        );
      }

      // Envoyer par SMS si disponible
      if (clientData.phone) {
        const smsContent = await appointmentTemplateService.generateCancellationContent(
          appointment,
          clientData,
          'sms',
          reason,
          orgSettings || undefined
        );

        await this.smsService.sendSms(
          clientData.phone,
          smsContent.content,
          {
            userId: clientData.id!,
            trackingId: `appointment-cancellation-${appointment.id}`
          }
        );
      }

      // Envoyer aussi une notification in-app
      const message = `Votre rendez-vous du ${this.formatDate(appointment.date)} à ${appointment.startTime} a été annulé.${reason ? ` Raison: ${reason}` : ''}`;
      
      await this.notificationService.sendNotification({
        userId: clientData.id!,
        type: NotificationType.EVENT_CANCELLED,
        title: "Rendez-vous annulé",
        message,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
        data: {
          appointmentId: appointment.id,
          reason: reason || 'Non spécifiée'
        },
        sentBy: "system"
      });
    } catch (error) {
      console.error('Error sending appointment cancellation:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification de modification de rendez-vous
   */
  async sendAppointmentUpdate(
    oldAppointment: Appointment, 
    newAppointment: Appointment, 
    changes: string[]
  ): Promise<void> {
    try {
      const client = await clientService.getClientById(newAppointment.clientId);
      if (!client) {
        throw new Error("Client not found");
      }

      const clientData = clientModelToClient(client);
      const channels = this.determineNotificationChannels(clientData);
      const changesText = changes.join(', ');
      
      await this.notificationService.sendNotification({
        userId: clientData.id!,
        type: NotificationType.EVENT_UPDATED,
        title: "Rendez-vous modifié",
        message: `Votre rendez-vous a été modifié. Changements: ${changesText}`,
        channels,
        priority: NotificationPriority.NORMAL,
        data: {
          appointmentId: newAppointment.id,
          changes,
          oldDate: oldAppointment.date.toISOString(),
          newDate: newAppointment.date.toISOString(),
          oldStartTime: oldAppointment.startTime,
          newStartTime: newAppointment.startTime
        },
        sentBy: "system"
      });
    } catch (error) {
      console.error('Error sending appointment update:', error);
      throw error;
    }
  }

  // Méthodes utilitaires privées

  private async getOrganizationSettings(organizationId: string): Promise<OrganizationAppointmentSettings | null> {
    try {
      const doc = await this.db.collection('organization_appointment_settings').doc(organizationId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as OrganizationAppointmentSettings;
    } catch (error) {
      console.error('Error getting organization settings:', error);
      return null;
    }
  }

  private determineReminderChannels(client: Client, orgSettings: OrganizationAppointmentSettings): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    
    // Utiliser les préférences du client
    switch (client.preferences.reminderMethod) {
      case 'email':
        if (client.email) {channels.push(NotificationChannel.EMAIL);}
        break;
      case 'sms':
        if (client.phone) {channels.push(NotificationChannel.SMS);}
        break;
      case 'both':
        if (client.email) {channels.push(NotificationChannel.EMAIL);}
        if (client.phone) {channels.push(NotificationChannel.SMS);}
        break;
    }

    // Si aucun canal n'est disponible, utiliser email par défaut
    if (channels.length === 0 && client.email) {
      channels.push(NotificationChannel.EMAIL);
    }

    return channels;
  }

  private determineNotificationChannels(client: Client): NotificationChannel[] {
    const channels: NotificationChannel[] = [];
    
    if (client.email) {channels.push(NotificationChannel.EMAIL);}
    if (client.phone) {channels.push(NotificationChannel.SMS);}
    
    return channels;
  }

  private async generateReminderContent(
    appointment: Appointment, 
    client: Client, 
    channel: NotificationChannel,
    hoursBeforeAppointment: number
  ): Promise<string> {
    try {
      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      const channelType = channel === NotificationChannel.EMAIL ? 'email' : 'sms';
      
      const content = await appointmentTemplateService.generateReminderContent(
        appointment,
        client,
        channelType,
        hoursBeforeAppointment,
        orgSettings || undefined
      );
      
      return content.content;
    } catch (error) {
      console.error('Error generating reminder content:', error);
      // Fallback vers le contenu simple
      const appointmentModel = new AppointmentModel(appointment);
      const timeText = hoursBeforeAppointment === 24 ? "demain" : `dans ${hoursBeforeAppointment}h`;
      
      return `Bonjour ${client.firstName},\n\nRappel: Vous avez un rendez-vous ${timeText} le ${this.formatDate(appointment.date)} à ${appointment.startTime} (durée: ${appointmentModel.getDurationFormatted()}).\n\nMerci de confirmer votre présence.`;
    }
  }

  private async generateEmailContent(appointment: Appointment, client: Client, reminder: Reminder): Promise<string> {
    try {
      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      
      // Déterminer le type de rappel selon le timing
      const reminderTime = new Date(reminder.scheduledFor);
      const appointmentTime = new AppointmentModel(appointment).getAppointmentDateTime();
      const hoursBeforeAppointment = Math.round((appointmentTime.getTime() - reminderTime.getTime()) / (1000 * 60 * 60));
      
      const content = await appointmentTemplateService.generateReminderContent(
        appointment,
        client,
        'email',
        hoursBeforeAppointment,
        orgSettings || undefined
      );
      
      return content.html || content.content;
    } catch (error) {
      console.error('Error generating email content:', error);
      // Fallback vers le contenu simple
      const appointmentModel = new AppointmentModel(appointment);
      
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Rappel de rendez-vous</h2>
          <p>Bonjour ${client.firstName},</p>
          <p>${reminder.content}</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Détails du rendez-vous</h3>
            <p><strong>Date:</strong> ${this.formatDate(appointment.date)}</p>
            <p><strong>Heure:</strong> ${appointment.startTime}</p>
            <p><strong>Durée:</strong> ${appointmentModel.getDurationFormatted()}</p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          
          <p>Si vous ne pouvez pas vous présenter, merci de nous prévenir au plus tôt.</p>
          <p>Cordialement,<br>L'équipe</p>
        </div>
      `;
    }
  }

  private async getEmailSubject(appointment: Appointment, reminder: Reminder): Promise<string> {
    try {
      const client = await clientService.getClientById(appointment.clientId);
      if (!client) {
        return `Rappel: Rendez-vous du ${this.formatDate(appointment.date)} à ${appointment.startTime}`;
      }

      const orgSettings = await this.getOrganizationSettings(appointment.organizationId);
      
      // Déterminer le type de rappel selon le timing
      const reminderTime = new Date(reminder.scheduledFor);
      const appointmentTime = new AppointmentModel(appointment).getAppointmentDateTime();
      const hoursBeforeAppointment = Math.round((appointmentTime.getTime() - reminderTime.getTime()) / (1000 * 60 * 60));
      
      const clientData = clientModelToClient(client);
      const content = await appointmentTemplateService.generateReminderContent(
        appointment,
        clientData,
        'email',
        hoursBeforeAppointment,
        orgSettings || undefined
      );
      
      return content.subject || `Rappel: Rendez-vous du ${this.formatDate(appointment.date)} à ${appointment.startTime}`;
    } catch (error) {
      console.error('Error generating email subject:', error);
      return `Rappel: Rendez-vous du ${this.formatDate(appointment.date)} à ${appointment.startTime}`;
    }
  }

  private async updateReminderStatus(
    appointmentId: string, 
    reminderId: string, 
    status: ReminderStatus,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const appointmentRef = this.db.collection('appointments').doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();
    
    if (!appointmentDoc.exists) {
      throw new Error("Appointment not found");
    }

    const appointment = appointmentDoc.data() as Appointment;
    const reminderIndex = appointment.reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex === -1) {
      throw new Error("Reminder not found");
    }

    appointment.reminders[reminderIndex] = {
      ...appointment.reminders[reminderIndex],
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    await appointmentRef.update({
      reminders: appointment.reminders,
      updatedAt: new Date()
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Annule tous les rappels en attente pour un rendez-vous
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    try {
      const appointmentRef = this.db.collection('appointments').doc(appointmentId);
      const appointmentDoc = await appointmentRef.get();
      
      if (!appointmentDoc.exists) {
        return;
      }

      const appointment = appointmentDoc.data() as Appointment;
      const updatedReminders = appointment.reminders.map(reminder => ({
        ...reminder,
        status: reminder.status === 'pending' ? 'failed' as ReminderStatus : reminder.status,
        errorMessage: reminder.status === 'pending' ? 'Cancelled due to appointment cancellation' : reminder.errorMessage,
        updatedAt: new Date()
      }));

      await appointmentRef.update({
        reminders: updatedReminders,
        updatedAt: new Date()
      });

      console.log(`Cancelled reminders for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error cancelling reminders:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques des notifications pour un rendez-vous
   */
  async getReminderStats(appointmentId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      const appointmentDoc = await this.db.collection('appointments').doc(appointmentId).get();
      
      if (!appointmentDoc.exists) {
        throw new Error("Appointment not found");
      }

      const appointment = appointmentDoc.data() as Appointment;
      const reminders = appointment.reminders || [];

      return {
        total: reminders.length,
        sent: reminders.filter(r => r.status === 'sent').length,
        failed: reminders.filter(r => r.status === 'failed').length,
        pending: reminders.filter(r => r.status === 'pending').length
      };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      throw error;
    }
  }
}

// Instance singleton
export const appointmentNotificationService = new AppointmentNotificationService();