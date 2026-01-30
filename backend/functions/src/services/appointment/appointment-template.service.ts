import { getFirestore } from "firebase-admin/firestore";
import { AppointmentModel } from "../../models/appointment.model";
import { Appointment,
  AppointmentNotificationTemplate,
  Client,
  OrganizationAppointmentSettings,
  Service } from "../../common/types";
import { APPOINTMENT_EMAIL_TEMPLATES, 
  APPOINTMENT_SMS_TEMPLATES, 
  getAppointmentTemplate, 
  processAppointmentTemplate  } from "../notification/templates/appointment-templates";


/**
 * Service de gestion des templates de notification pour les rendez-vous
 */
export class AppointmentTemplateService {
  private readonly db = getFirestore();
  private initialized = false;

  constructor() {
    // ✅ Ne pas initialiser dans le constructeur
    // L'initialisation se fera au premier appel
  }

  /**
   * Initialise les templates par défaut dans Firestore (lazy loading)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const allTemplates = [...APPOINTMENT_EMAIL_TEMPLATES, ...APPOINTMENT_SMS_TEMPLATES];
      
      for (const template of allTemplates) {
        const templateRef = this.db.collection('appointment_notification_templates').doc(template.id);
        const templateDoc = await templateRef.get();
        
        if (!templateDoc.exists) {
          await templateRef.set({
            ...template,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true,
            isActive: true
          });
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing default templates:', error);
      // Ne pas bloquer si l'initialisation échoue
    }
  }

  /**
   * Génère le contenu d'un rappel de rendez-vous
   */
  async generateReminderContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms',
    hoursBeforeAppointment: number,
    organizationSettings?: OrganizationAppointmentSettings
  ): Promise<{ subject?: string; content: string; html?: string }> {
    // ✅ Initialiser au premier appel
    await this.ensureInitialized();
    
    try {
      // Déterminer le type de rappel selon le délai
      const reminderType = hoursBeforeAppointment >= 24 ? 'reminder_24h' : 'reminder_2h';
      
      // Récupérer le template
      const template = await this.getTemplate(reminderType, channel, client.preferences.language || 'fr');
      if (!template) {
        // Fallback vers un template par défaut
        return this.generateFallbackReminderContent(appointment, client, channel, hoursBeforeAppointment);
      }

      // Préparer les variables pour le template
      const variables = await this.prepareTemplateVariables(appointment, client, organizationSettings);
      
      // Traiter le template
      const processed = processAppointmentTemplate(template, variables);
      
      return {
        subject: processed.subject,
        content: processed.content,
        ...(channel === 'email' && { html: processed.content })
      };
    } catch (error) {
      console.error('Error generating reminder content:', error);
      return this.generateFallbackReminderContent(appointment, client, channel, hoursBeforeAppointment);
    }
  }

  /**
   * Génère le contenu d'une confirmation de rendez-vous
   */
  async generateConfirmationContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms',
    organizationSettings?: OrganizationAppointmentSettings
  ): Promise<{ subject?: string; content: string; html?: string }> {
    try {
      const template = await this.getTemplate('confirmation', channel, client.preferences.language || 'fr');
      if (!template) {
        return this.generateFallbackConfirmationContent(appointment, client, channel);
      }

      const variables = await this.prepareTemplateVariables(appointment, client, organizationSettings);
      const processed = processAppointmentTemplate(template, variables);
      
      return {
        subject: processed.subject,
        content: processed.content,
        ...(channel === 'email' && { html: processed.content })
      };
    } catch (error) {
      console.error('Error generating confirmation content:', error);
      return this.generateFallbackConfirmationContent(appointment, client, channel);
    }
  }

  /**
   * Génère le contenu d'une annulation de rendez-vous
   */
  async generateCancellationContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms',
    reason?: string,
    organizationSettings?: OrganizationAppointmentSettings
  ): Promise<{ subject?: string; content: string; html?: string }> {
    try {
      const template = await this.getTemplate('cancellation', channel, client.preferences.language || 'fr');
      if (!template) {
        return this.generateFallbackCancellationContent(appointment, client, channel, reason);
      }

      const variables = await this.prepareTemplateVariables(appointment, client, organizationSettings);
      variables.reason = reason || '';
      
      const processed = processAppointmentTemplate(template, variables);
      
      return {
        subject: processed.subject,
        content: processed.content,
        ...(channel === 'email' && { html: processed.content })
      };
    } catch (error) {
      console.error('Error generating cancellation content:', error);
      return this.generateFallbackCancellationContent(appointment, client, channel, reason);
    }
  }

  /**
   * Récupère un template depuis la base de données
   */
  private async getTemplate(
    type: 'reminder_24h' | 'reminder_2h' | 'confirmation' | 'cancellation',
    channel: 'email' | 'sms',
    language: string = 'fr'
  ): Promise<AppointmentNotificationTemplate | null> {
    try {
      const templateId = `appointment_${type}_${channel}`;
      
      // Chercher d'abord un template personnalisé
      const customTemplateSnapshot = await this.db.collection('appointment_notification_templates')
        .where('id', '==', templateId)
        .where('language', '==', language)
        .where('isActive', '==', true)
        .where('isDefault', '==', false)
        .limit(1)
        .get();

      if (!customTemplateSnapshot.empty) {
        const doc = customTemplateSnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as AppointmentNotificationTemplate;
      }

      // Sinon, utiliser le template par défaut
      const defaultTemplateDoc = await this.db.collection('appointment_notification_templates')
        .doc(templateId)
        .get();

      if (defaultTemplateDoc.exists) {
        return { id: defaultTemplateDoc.id, ...defaultTemplateDoc.data() } as AppointmentNotificationTemplate;
      }

      // Fallback vers les templates en mémoire
      return getAppointmentTemplate(type, channel, language);
    } catch (error) {
      console.error('Error getting template:', error);
      return getAppointmentTemplate(type, channel, language);
    }
  }

  /**
   * Prépare les variables pour le traitement des templates
   */
  private async prepareTemplateVariables(
    appointment: Appointment,
    client: Client,
    organizationSettings?: OrganizationAppointmentSettings
  ): Promise<Record<string, any>> {
    const appointmentModel = new AppointmentModel(appointment);
    
    // Variables de base
    const variables: Record<string, any> = {
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientFullName: `${client.firstName} ${client.lastName}`,
      appointmentDate: this.formatDate(appointment.date),
      startTime: appointment.startTime,
      endTime: appointmentModel.getEndTime(),
      duration: appointmentModel.getDurationFormatted(),
      notes: appointment.notes || '',
      appointmentId: appointment.id
    };

    // Informations sur le service
    try {
      const serviceDoc = await this.db.collection('services').doc(appointment.serviceId).get();
      if (serviceDoc.exists) {
        const service = serviceDoc.data() as Service;
        variables.serviceName = service.name;
        variables.serviceDescription = service.description || '';
        variables.servicePrice = service.price ? `${service.price / 100}€` : '';
      }
    } catch (error) {
      console.error('Error getting service info:', error);
    }

    // Informations sur le praticien
    try {
      const practitionerDoc = await this.db.collection('users').doc(appointment.practitionerId).get();
      if (practitionerDoc.exists) {
        const practitioner = practitionerDoc.data();
        if (practitioner) {
          variables.practitionerName = `${practitioner.firstName} ${practitioner.lastName}`;
          variables.practitionerFirstName = practitioner.firstName;
          variables.practitionerLastName = practitioner.lastName;
        }
      }
    } catch (error) {
      console.error('Error getting practitioner info:', error);
    }

    // Informations sur l'organisation
    try {
      const orgDoc = await this.db.collection('organizations').doc(appointment.organizationId).get();
      if (orgDoc.exists) {
        const organization = orgDoc.data();
        if (organization) {
          variables.organizationName = organization.name || 'Notre équipe';
          variables.organizationPhone = organization.phone || '';
          variables.organizationEmail = organization.email || '';
          variables.address = organization.address || '';
        }
      }
    } catch (error) {
      console.error('Error getting organization info:', error);
      variables.organizationName = 'Notre équipe';
    }

    // URLs d'action
    const baseUrl = process.env.FRONTEND_URL || 'https://app.attendance-x.com';
    variables.confirmationUrl = `${baseUrl}/appointments/${appointment.id}/confirm`;
    variables.rescheduleUrl = `${baseUrl}/appointments/${appointment.id}/reschedule`;
    variables.cancelUrl = `${baseUrl}/appointments/${appointment.id}/cancel`;
    variables.bookingUrl = `${baseUrl}/book/${appointment.organizationId}`;
    variables.calendarUrl = `${baseUrl}/appointments/${appointment.id}/calendar`;

    return variables;
  }

  /**
   * Génère un contenu de rappel de fallback
   */
  private generateFallbackReminderContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms',
    hoursBeforeAppointment: number
  ): { subject?: string; content: string; html?: string } {
    const appointmentModel = new AppointmentModel(appointment);
    const timeText = hoursBeforeAppointment >= 24 ? "demain" : `dans ${hoursBeforeAppointment}h`;
    const dateText = this.formatDate(appointment.date);
    
    if (channel === 'email') {
      return {
        subject: `Rappel: Rendez-vous ${timeText} à ${appointment.startTime}`,
        content: `Bonjour ${client.firstName},\n\nRappel: Vous avez un rendez-vous ${timeText} le ${dateText} à ${appointment.startTime} (durée: ${appointmentModel.getDurationFormatted()}).\n\nMerci de confirmer votre présence.\n\nCordialement`,
        html: `
          <p>Bonjour ${client.firstName},</p>
          <p>Rappel: Vous avez un rendez-vous <strong>${timeText}</strong> le ${dateText} à ${appointment.startTime} (durée: ${appointmentModel.getDurationFormatted()}).</p>
          <p>Merci de confirmer votre présence.</p>
          <p>Cordialement</p>
        `
      };
    } else {
      return {
        content: `Rappel: RDV ${timeText} ${dateText} à ${appointment.startTime} (${appointmentModel.getDurationFormatted()}). Confirmez votre présence.`
      };
    }
  }

  /**
   * Génère un contenu de confirmation de fallback
   */
  private generateFallbackConfirmationContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms'
  ): { subject?: string; content: string; html?: string } {
    const appointmentModel = new AppointmentModel(appointment);
    const dateText = this.formatDate(appointment.date);
    
    if (channel === 'email') {
      return {
        subject: `Confirmation de votre rendez-vous du ${dateText}`,
        content: `Bonjour ${client.firstName},\n\nVotre rendez-vous du ${dateText} à ${appointment.startTime} (durée: ${appointmentModel.getDurationFormatted()}) est confirmé.\n\nMerci de votre confiance.`,
        html: `
          <p>Bonjour ${client.firstName},</p>
          <p>Votre rendez-vous du <strong>${dateText}</strong> à ${appointment.startTime} (durée: ${appointmentModel.getDurationFormatted()}) est confirmé.</p>
          <p>Merci de votre confiance.</p>
        `
      };
    } else {
      return {
        content: `✅ RDV confirmé le ${dateText} à ${appointment.startTime}. Merci!`
      };
    }
  }

  /**
   * Génère un contenu d'annulation de fallback
   */
  private generateFallbackCancellationContent(
    appointment: Appointment,
    client: Client,
    channel: 'email' | 'sms',
    reason?: string
  ): { subject?: string; content: string; html?: string } {
    const dateText = this.formatDate(appointment.date);
    const reasonText = reason ? ` Raison: ${reason}.` : '';
    
    if (channel === 'email') {
      return {
        subject: `Annulation de votre rendez-vous du ${dateText}`,
        content: `Bonjour ${client.firstName},\n\nVotre rendez-vous du ${dateText} à ${appointment.startTime} a été annulé.${reasonText}\n\nNous nous excusons pour la gêne occasionnée.`,
        html: `
          <p>Bonjour ${client.firstName},</p>
          <p>Votre rendez-vous du <strong>${dateText}</strong> à ${appointment.startTime} a été annulé.${reasonText}</p>
          <p>Nous nous excusons pour la gêne occasionnée.</p>
        `
      };
    } else {
      return {
        content: `❌ Votre RDV du ${dateText} à ${appointment.startTime} est annulé.${reasonText}`
      };
    }
  }

  /**
   * Formate une date en français
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Crée ou met à jour un template personnalisé
   */
  async saveCustomTemplate(
    organizationId: string,
    template: Omit<AppointmentNotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const templateData = {
        ...template,
        organizationId,
        isDefault: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection('appointment_notification_templates').add(templateData);
      return docRef.id;
    } catch (error) {
      console.error('Error saving custom template:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les templates d'une organisation
   */
  async getOrganizationTemplates(organizationId: string): Promise<AppointmentNotificationTemplate[]> {
    try {
      const snapshot = await this.db.collection('appointment_notification_templates')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppointmentNotificationTemplate[];
    } catch (error) {
      console.error('Error getting organization templates:', error);
      return [];
    }
  }
}

// Instance singleton
export const appointmentTemplateService = new AppointmentTemplateService();