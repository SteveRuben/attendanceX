import { getFirestore } from 'firebase-admin/firestore';
import { qrCodeService } from '../qrcode/qrcode.service';
import { logger } from 'firebase-functions';
import { EventCampaign } from '../../common/types/campaign.types';

export interface EventNotificationRequest {
  eventId: string;
  tenantId: string;
  notificationMethods: {
    email?: {
      enabled: boolean;
      generateQR: boolean;
      templateId?: string;
    };
    sms?: {
      enabled: boolean;
      generatePIN: boolean;
      templateId?: string;
    };
  };
  scheduledAt?: Date;
  reminderSettings?: {
    send24hBefore: boolean;
    send1hBefore: boolean;
  };
}

export interface ParticipantNotificationData {
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  preferredMethod: 'email' | 'sms' | 'both';
  qrCode?: {
    qrCodeId: string;
    imageBase64: string;
    url: string;
    expiresAt: string;
  };
  pinCode?: {
    code: string;
    expiresAt: string;
  };
}

export class EventCampaignService {
  private db = getFirestore();

  /**
   * Créer une campagne de notification pour un événement
   */
  async createEventNotificationCampaign(request: EventNotificationRequest): Promise<{
    campaignId: string;
    participants: ParticipantNotificationData[];
    emailCampaignId?: string;
    smsCampaignId?: string;
  }> {
    try {
      // 1. Récupérer les détails de l'événement
      const event = await this.getEventDetails(request.eventId, request.tenantId);
      if (!event) {
        throw new Error('Event not found');
      }

      // 2. Récupérer les participants
      const participants = await this.getEventParticipants(request.eventId, request.tenantId);
      if (participants.length === 0) {
        throw new Error('No participants found for this event');
      }

      // 3. Générer les codes d'accès selon les méthodes de validation et les préférences
      const participantsWithCodes = await this.generateAccessCodes(
        participants,
        request.eventId,
        event.attendanceSettings,
        request.notificationMethods // Passer les préférences de notification
      );

      // 4. Créer les campagnes selon les méthodes activées
      const campaigns: { emailCampaignId?: string; smsCampaignId?: string } = {};

      if (request.notificationMethods.email?.enabled) {
        campaigns.emailCampaignId = await this.createEmailCampaign(
          event,
          participantsWithCodes.filter(p => p.preferredMethod === 'email' || p.preferredMethod === 'both'),
          request.notificationMethods.email,
          request.scheduledAt
        );
      }

      if (request.notificationMethods.sms?.enabled) {
        campaigns.smsCampaignId = await this.createSMSCampaign(
          event,
          participantsWithCodes.filter(p => p.preferredMethod === 'sms' || p.preferredMethod === 'both'),
          request.notificationMethods.sms,
          request.scheduledAt
        );
      }

      // 5. Créer l'enregistrement de campagne d'événement
      const campaignId = await this.createEventCampaignRecord({
        eventId: request.eventId,
        tenantId: request.tenantId,
        emailCampaignId: campaigns.emailCampaignId,
        smsCampaignId: campaigns.smsCampaignId,
        participantCount: participantsWithCodes.length,
        createdAt: new Date(),
        scheduledAt: request.scheduledAt
      });

      logger.info('Event notification campaign created', {
        campaignId,
        eventId: request.eventId,
        participantCount: participantsWithCodes.length,
        emailEnabled: !!campaigns.emailCampaignId,
        smsEnabled: !!campaigns.smsCampaignId
      });

      return {
        campaignId,
        participants: participantsWithCodes,
        ...campaigns
      };

    } catch (error) {
      logger.error('Error creating event notification campaign', {
        error: error.message,
        eventId: request.eventId,
        tenantId: request.tenantId
      });
      throw error;
    }
  }

  /**
   * Générer les codes d'accès (QR/PIN) individuels pour les participants
   */
  private async generateAccessCodes(
    participants: any[],
    eventId: string,
    attendanceSettings: any,
    notificationMethods?: {
      email?: { enabled: boolean; generateQR: boolean };
      sms?: { enabled: boolean; generatePIN: boolean };
    }
  ): Promise<ParticipantNotificationData[]> {
    const participantsWithCodes: ParticipantNotificationData[] = [];

    for (const participant of participants) {
      const participantData: ParticipantNotificationData = {
        userId: participant.id,
        email: participant.email,
        phone: participant.phone,
        firstName: participant.firstName || participant.name?.split(' ')[0] || '',
        lastName: participant.lastName || participant.name?.split(' ').slice(1).join(' ') || '',
        preferredMethod: this.determinePreferredMethod(participant)
      };

      // Générer QR Code individuel pour chaque participant email
      // SEULEMENT si l'événement a la validation QR activée ET que la génération QR est demandée
      const shouldGenerateQR = (participantData.preferredMethod === 'email' || participantData.preferredMethod === 'both') &&
                               notificationMethods?.email?.enabled &&
                               notificationMethods?.email?.generateQR &&
                               (attendanceSettings?.requireQRCode || attendanceSettings?.allowedMethods?.includes('qr_code'));

      if (shouldGenerateQR) {
        try {
          // Générer un QR code UNIQUE pour ce participant spécifique
          const qrCode = await qrCodeService.generateQRCode({
            type: 'participant',
            eventId,
            userId: participant.id,
            expiresAt: this.calculateQRExpiration(attendanceSettings).toISOString(),
            options: { size: 256, format: 'png' }
          });

          participantData.qrCode = {
            qrCodeId: qrCode.qrCodeId,
            imageBase64: qrCode.imageBase64 || '',
            url: qrCode.url,
            expiresAt: qrCode.expiresAt
          };

          logger.info('Individual QR code generated', {
            participantId: participant.id,
            eventId,
            qrCodeId: qrCode.qrCodeId
          });
        } catch (error) {
          logger.error('Error generating individual QR code for participant', {
            participantId: participant.id,
            eventId,
            error: error.message
          });
        }
      }

      // Générer PIN Code individuel pour chaque participant SMS
      // SEULEMENT si l'événement a la validation PIN activée ET que la génération PIN est demandée
      const shouldGeneratePIN = (participantData.preferredMethod === 'sms' || participantData.preferredMethod === 'both') &&
                                notificationMethods?.sms?.enabled &&
                                notificationMethods?.sms?.generatePIN &&
                                (attendanceSettings?.allowedMethods?.includes('pin_code') || attendanceSettings?.requirePinCode);

      if (shouldGeneratePIN) {
        // Générer un PIN code UNIQUE pour ce participant spécifique
        participantData.pinCode = {
          code: this.generateUniquePinCode(eventId, participant.id),
          expiresAt: this.calculatePinExpiration(attendanceSettings).toISOString()
        };

        // Sauvegarder le PIN individuel en base pour validation ultérieure
        await this.savePinCode(eventId, participant.id, participantData.pinCode);

        logger.info('Individual PIN code generated', {
          participantId: participant.id,
          eventId,
          pinCode: participantData.pinCode.code
        });
      }

      participantsWithCodes.push(participantData);
    }

    return participantsWithCodes;
  }

  /**
   * Créer une campagne email avec QR codes
   */
  private async createEmailCampaign(
    event: any,
    participants: ParticipantNotificationData[],
    emailSettings: any,
    scheduledAt?: Date
  ): Promise<string> {
    const campaignData = {
      name: `Event Notification - ${event.title}`,
      type: 'EVENT_NOTIFICATION',
      subject: `Confirmation: ${event.title}`,
      templateId: emailSettings.templateId || 'event-confirmation-qr',
      content: {
        htmlContent: this.generateEmailTemplate(event, true), // avec QR
        templateData: {
          eventName: event.title,
          eventDate: event.startDateTime,
          eventLocation: event.location?.name || 'TBD',
          organizerName: event.organizerName || 'Event Organizer'
        }
      },
      recipientCriteria: {
        eventParticipants: [event.id],
        excludeUnsubscribed: true
      },
      scheduledAt: scheduledAt?.toISOString(),
      metadata: {
        eventId: event.id,
        notificationType: 'confirmation',
        includesQRCode: true
      }
    };

    // TODO: Intégrer avec le service de campagne email existant
    // const campaign = await emailCampaignService.createCampaign(event.tenantId, event.organizerId, campaignData);
    
    // Pour l'instant, créer un enregistrement temporaire
    const campaignRef = this.db.collection('email_campaigns').doc();
    await campaignRef.set({
      ...campaignData,
      id: campaignRef.id,
      tenantId: event.tenantId,
      createdAt: new Date(),
      status: 'draft',
      participants: participants.map(p => ({
        userId: p.userId,
        email: p.email,
        qrCodeId: p.qrCode?.qrCodeId,
        personalizations: {
          firstName: p.firstName,
          lastName: p.lastName,
          qrCodeImage: p.qrCode?.imageBase64,
          qrCodeUrl: p.qrCode?.url
        }
      }))
    });

    return campaignRef.id;
  }

  /**
   * Créer une campagne SMS avec PIN codes
   */
  private async createSMSCampaign(
    event: any,
    participants: ParticipantNotificationData[],
    smsSettings: any,
    scheduledAt?: Date
  ): Promise<string> {
    const campaignData = {
      name: `SMS Notification - ${event.title}`,
      type: 'EVENT_SMS_NOTIFICATION',
      templateId: smsSettings.templateId || 'event-confirmation-pin',
      content: {
        textContent: this.generateSMSTemplate(event, true), // avec PIN
        templateData: {
          eventName: event.title,
          eventDate: event.startDateTime,
          eventLocation: event.location?.name || 'TBD'
        }
      },
      recipientCriteria: {
        eventParticipants: [event.id],
        excludeUnsubscribed: true
      },
      scheduledAt: scheduledAt?.toISOString(),
      metadata: {
        eventId: event.id,
        notificationType: 'confirmation',
        includesPinCode: true
      }
    };

    // TODO: Intégrer avec le service de campagne SMS
    const campaignRef = this.db.collection('sms_campaigns').doc();
    await campaignRef.set({
      ...campaignData,
      id: campaignRef.id,
      tenantId: event.tenantId,
      createdAt: new Date(),
      status: 'draft',
      participants: participants.map(p => ({
        userId: p.userId,
        phone: p.phone,
        pinCode: p.pinCode?.code,
        personalizations: {
          firstName: p.firstName,
          pinCode: p.pinCode?.code,
          pinExpiry: p.pinCode?.expiresAt
        }
      }))
    });

    return campaignRef.id;
  }

  /**
   * Déterminer la méthode de notification préférée
   */
  determinePreferredMethod(participant: any): 'email' | 'sms' | 'both' {
    // Logique basée sur les préférences utilisateur ou données disponibles
    if (participant.email && participant.phone) {
      return participant.preferences?.notificationMethod || 'both';
    } else if (participant.email) {
      return 'email';
    } else if (participant.phone) {
      return 'sms';
    }
    return 'email'; // par défaut
  }

  /**
   * Générer un code PIN unique à 6 chiffres pour un participant spécifique
   */
  private generateUniquePinCode(eventId: string, userId: string): string {
    // Créer un hash basé sur eventId + userId pour garantir l'unicité
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(`${eventId}-${userId}-${Date.now()}`).digest('hex');
    
    // Extraire 6 chiffres du hash et s'assurer qu'ils commencent par un chiffre non-zéro
    let pinCode = '';
    for (let i = 0; i < hash.length && pinCode.length < 6; i++) {
      const char = hash[i];
      if (/[0-9]/.test(char)) {
        pinCode += char;
      }
    }
    
    // S'assurer que le PIN fait exactement 6 chiffres et ne commence pas par 0
    while (pinCode.length < 6) {
      pinCode += Math.floor(Math.random() * 10).toString();
    }
    
    if (pinCode[0] === '0') {
      pinCode = '1' + pinCode.slice(1);
    }
    
    return pinCode;
  }

  /**
   * Calculer l'expiration du QR code
   */
  private calculateQRExpiration(attendanceSettings: any): Date {
    const hours = attendanceSettings?.qrExpirationHours || 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Calculer l'expiration du PIN code
   */
  private calculatePinExpiration(attendanceSettings: any): Date {
    const minutes = attendanceSettings?.pinExpirationMinutes || 60;
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Sauvegarder le PIN code pour validation ultérieure
   */
  private async savePinCode(eventId: string, userId: string, pinData: any): Promise<void> {
    await this.db.collection('pin_codes').doc(`${eventId}_${userId}`).set({
      eventId,
      userId,
      code: pinData.code,
      expiresAt: pinData.expiresAt,
      createdAt: new Date(),
      isUsed: false
    });
  }

  /**
   * Récupérer les détails de l'événement
   */
  async getEventDetails(eventId: string, tenantId: string): Promise<any> {
    const eventDoc = await this.db
      .collection('tenants')
      .doc(tenantId)
      .collection('events')
      .doc(eventId)
      .get();

    return eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;
  }

  /**
   * Récupérer les participants de l'événement
   */
  async getEventParticipants(eventId: string, tenantId: string): Promise<any[]> {
    // Récupérer l'événement pour obtenir la liste des participants
    const event = await this.getEventDetails(eventId, tenantId);
    if (!event || !event.participants) {
      return [];
    }

    // Récupérer les détails des utilisateurs participants
    const participants = [];
    for (const participantId of event.participants) {
      const userDoc = await this.db
        .collection('tenants')
        .doc(tenantId)
        .collection('users')
        .doc(participantId)
        .get();

      if (userDoc.exists) {
        participants.push({ id: userDoc.id, ...userDoc.data() });
      }
    }

    return participants;
  }

  /**
   * Créer l'enregistrement de campagne d'événement
   */
  private async createEventCampaignRecord(data: any): Promise<string> {
    const campaignRef = this.db.collection('event_campaigns').doc();
    await campaignRef.set({
      ...data,
      id: campaignRef.id
    });
    return campaignRef.id;
  }

  /**
   * Générer le template email avec QR code
   */
  private generateEmailTemplate(event: any, includeQR: boolean): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirmation de votre inscription</h2>
        <h3>{{eventName}}</h3>
        
        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
          <p><strong>Date:</strong> {{eventDate}}</p>
          <p><strong>Lieu:</strong> {{eventLocation}}</p>
          <p><strong>Organisateur:</strong> {{organizerName}}</p>
        </div>

        ${includeQR ? `
        <div style="text-align: center; margin: 30px 0;">
          <h4>Votre QR Code d'accès</h4>
          <img src="data:image/png;base64,{{qrCodeImage}}" alt="QR Code" style="max-width: 200px;">
          <p style="font-size: 12px; color: #666;">
            Présentez ce QR code à l'entrée de l'événement
          </p>
        </div>
        ` : ''}

        <p>Nous avons hâte de vous voir à l'événement !</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          <p>Si vous avez des questions, contactez l'organisateur.</p>
        </div>
      </div>
    `;
  }

  /**
   * Générer le template SMS avec PIN code
   */
  private generateSMSTemplate(event: any, includePIN: boolean): string {
    return `Confirmation: {{eventName}} le {{eventDate}} à {{eventLocation}}. ${includePIN ? 'Votre code PIN: {{pinCode}}. ' : ''}Présentez ce code à l'entrée.`;
  }

  /**
   * Récupérer les campagnes d'un événement
   */
  async getEventCampaigns(eventId: string, tenantId: string): Promise<EventCampaign[]> {
    try {
      const snapshot = await this.db
        .collection('event_campaigns')
        .where('eventId', '==', eventId)
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventCampaign));
    } catch (error) {
      logger.error('Error getting event campaigns', {
        error: error.message,
        eventId,
        tenantId
      });
      return [];
    }
  }

  /**
   * Obtenir les analytics d'une campagne d'événement
   */
  async getEventCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      const campaignDoc = await this.db.collection('event_campaigns').doc(campaignId).get();
      if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignDoc.data() as EventCampaign;

      // TODO: Implémenter les vraies analytics
      return {
        campaignId,
        eventId: campaign.eventId,
        totalParticipants: campaign.participantCount,
        qrCodesGenerated: campaign.qrCodesGenerated,
        pinCodesGenerated: campaign.pinCodesGenerated,
        emailsSent: 0, // TODO: Récupérer depuis le service email
        smsSent: 0, // TODO: Récupérer depuis le service SMS
        deliveryRate: 0,
        emailsOpened: 0,
        smsOpened: 0,
        openRate: 0,
        qrCodesUsed: 0, // TODO: Récupérer depuis QR service
        pinCodesUsed: 0, // TODO: Récupérer depuis PIN service
        usageRate: 0,
        averageUsageDelay: 0,
        peakUsageTime: ''
      };
    } catch (error) {
      logger.error('Error getting event campaign analytics', {
        error: error.message,
        campaignId
      });
      throw error;
    }
  }

  async sendEventCampaigns(campaignId: string): Promise<{
    emailSent: boolean;
    smsSent: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let emailSent = false;
    let smsSent = false;

    try {
      const campaignDoc = await this.db.collection('event_campaigns').doc(campaignId).get();
      if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignDoc.data();

      // Envoyer la campagne email si elle existe
      if (campaign?.emailCampaignId) {
        try {
          // TODO: Intégrer avec le service d'envoi d'email
          // await emailCampaignService.sendCampaign(campaign.emailCampaignId);
          emailSent = true;
        } catch (error) {
          errors.push(`Email campaign error: ${error.message}`);
        }
      }

      // Envoyer la campagne SMS si elle existe
      if (campaign?.smsCampaignId) {
        try {
          // TODO: Intégrer avec le service d'envoi de SMS
          // await smsCampaignService.sendCampaign(campaign.smsCampaignId);
          smsSent = true;
        } catch (error) {
          errors.push(`SMS campaign error: ${error.message}`);
        }
      }

      // Mettre à jour le statut de la campagne
      await this.db.collection('event_campaigns').doc(campaignId).update({
        status: errors.length === 0 ? 'sent' : 'partial_failure',
        sentAt: new Date(),
        emailSent,
        smsSent,
        errors
      });

      return { emailSent, smsSent, errors };

    } catch (error) {
      logger.error('Error sending event campaigns', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }
}

export const eventCampaignService = new EventCampaignService();