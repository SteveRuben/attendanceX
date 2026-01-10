import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { asyncAuthHandler } from '../../middleware/errorHandler';
import { eventCampaignService } from '../../services/campaign/event-campaign.service';
import { pinCodeService } from '../../services/pin/pin-code.service';
import { qrCodeService } from '../../services/qrcode/qrcode.service';
import { ValidationError, NotFoundError } from '../../utils/common/errors';
import { logger } from 'firebase-functions';

export class EventCampaignController {

  /**
   * Créer une campagne de notification pour un événement
   */
  static createEventCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const tenantId = req.tenantContext?.tenantId;
    const userId = req.user.uid;
    const campaignData = req.body;

    if (!tenantId) {
      throw new ValidationError('Tenant ID requis');
    }

    try {
      const result = await eventCampaignService.createEventNotificationCampaign({
        eventId,
        tenantId,
        notificationMethods: campaignData.notificationMethods,
        scheduledAt: campaignData.scheduledAt ? new Date(campaignData.scheduledAt) : undefined,
        reminderSettings: campaignData.reminderSettings
      });

      logger.info('Event campaign created', {
        eventId,
        campaignId: result.campaignId,
        participantCount: result.participants.length,
        userId
      });

      res.status(201).json({
        success: true,
        message: 'Campagne d\'événement créée avec succès',
        data: {
          campaignId: result.campaignId,
          participantCount: result.participants.length,
          qrCodesGenerated: result.participants.filter(p => p.qrCode).length,
          pinCodesGenerated: result.participants.filter(p => p.pinCode).length,
          emailCampaignId: result.emailCampaignId,
          smsCampaignId: result.smsCampaignId
        }
      });

    } catch (error) {
      logger.error('Error creating event campaign', {
        error: error.message,
        eventId,
        tenantId,
        userId
      });
      throw error;
    }
  });

  /**
   * Obtenir les campagnes d'un événement
   */
  static getEventCampaigns = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      throw new ValidationError('Tenant ID requis');
    }

    try {
      const campaigns = await eventCampaignService.getEventCampaigns(eventId, tenantId);

      res.json({
        success: true,
        data: campaigns
      });

    } catch (error) {
      logger.error('Error getting event campaigns', {
        error: error.message,
        eventId,
        tenantId
      });
      throw error;
    }
  });

  /**
   * Envoyer une campagne d'événement
   */
  static sendEventCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { campaignId } = req.params;
    const userId = req.user.uid;

    try {
      const result = await eventCampaignService.sendEventCampaigns(campaignId);

      logger.info('Event campaign sent', {
        campaignId,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        errors: result.errors,
        userId
      });

      res.json({
        success: true,
        message: 'Campagne envoyée avec succès',
        data: {
          emailSent: result.emailSent,
          smsSent: result.smsSent,
          errors: result.errors
        }
      });

    } catch (error) {
      logger.error('Error sending event campaign', {
        error: error.message,
        campaignId,
        userId
      });
      throw error;
    }
  });

  /**
   * Prévisualiser les participants avec codes d'accès
   */
  static previewEventCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const tenantId = req.tenantContext?.tenantId;
    const { notificationMethods } = req.body;

    if (!tenantId) {
      throw new ValidationError('Tenant ID requis');
    }

    try {
      // Récupérer l'événement et ses participants
      const event = await eventCampaignService.getEventDetails(eventId, tenantId);
      if (!event) {
        throw new NotFoundError('Événement non trouvé');
      }

      const participants = await eventCampaignService.getEventParticipants(eventId, tenantId);
      
      // Simuler la génération des codes (sans les sauvegarder)
      const participantsPreview = participants.map(participant => {
        const preferredMethod = eventCampaignService.determinePreferredMethod(participant);
        const preview: any = {
          userId: participant.id,
          email: participant.email,
          phone: participant.phone,
          firstName: participant.firstName || participant.name?.split(' ')[0] || '',
          lastName: participant.lastName || participant.name?.split(' ').slice(1).join(' ') || '',
          preferredMethod
        };

        // Simuler QR code si nécessaire
        if ((preferredMethod === 'email' || preferredMethod === 'both') &&
            notificationMethods?.email?.generateQR &&
            event.attendanceSettings?.requireQRCode) {
          preview.willGenerateQR = true;
        }

        // Simuler PIN code si nécessaire
        if ((preferredMethod === 'sms' || preferredMethod === 'both') &&
            notificationMethods?.sms?.generatePIN &&
            event.attendanceSettings?.requireQRCode) {
          preview.willGeneratePIN = true;
        }

        return preview;
      });

      res.json({
        success: true,
        data: {
          event: {
            id: event.id,
            title: event.title,
            startDateTime: event.startDateTime,
            location: event.location
          },
          participants: participantsPreview,
          summary: {
            totalParticipants: participantsPreview.length,
            willGenerateQR: participantsPreview.filter(p => p.willGenerateQR).length,
            willGeneratePIN: participantsPreview.filter(p => p.willGeneratePIN).length
          }
        }
      });

    } catch (error) {
      logger.error('Error previewing event campaign', {
        error: error.message,
        eventId,
        tenantId
      });
      throw error;
    }
  });

  /**
   * Valider un QR code pour un événement
   */
  static validateQRCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { qrCodeId, location } = req.body;
    const userId = req.user.uid;

    try {
      const result = await qrCodeService.validateQRCode(qrCodeId, userId, location);

      // Vérifier que le QR code correspond à l'événement
      if (result.valid && result.qrCode?.data.eventId !== eventId) {
        res.json({
          success: true,
          data: {
            valid: false,
            message: 'QR code non valide pour cet événement'
          }
        });
        return;
      }

      logger.info('QR code validation attempt', {
        eventId,
        qrCodeId,
        valid: result.valid,
        userId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error validating QR code', {
        error: error.message,
        eventId,
        qrCodeId,
        userId
      });
      throw error;
    }
  });

  /**
   * Valider un PIN code pour un événement
   */
  static validatePINCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;
    const { pinCode, userId: participantId } = req.body;
    const validatorId = req.user.uid;

    try {
      const result = await pinCodeService.validatePINCode(eventId, pinCode, participantId);

      logger.info('PIN code validation attempt', {
        eventId,
        pinCode: pinCode.substring(0, 2) + '****',
        valid: result.valid,
        participantId,
        validatorId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error validating PIN code', {
        error: error.message,
        eventId,
        validatorId
      });
      throw error;
    }
  });

  /**
   * Obtenir les statistiques des codes d'accès d'un événement
   */
  static getAccessCodeStats = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eventId } = req.params;

    try {
      const [qrStats, pinStats] = await Promise.all([
        qrCodeService.getQRCodeStats(eventId),
        pinCodeService.getPINCodeStats(eventId)
      ]);

      res.json({
        success: true,
        data: {
          qrCodes: qrStats,
          pinCodes: pinStats,
          summary: {
            totalCodes: (qrStats.totalQRCodes || 0) + pinStats.total,
            totalUsage: (qrStats.totalUsage || 0) + pinStats.used,
            overallUsageRate: ((qrStats.totalUsage || 0) + pinStats.used) / 
                             (((qrStats.totalQRCodes || 0) + pinStats.total) || 1) * 100
          }
        }
      });

    } catch (error) {
      logger.error('Error getting access code stats', {
        error: error.message,
        eventId
      });
      throw error;
    }
  });

  /**
   * Obtenir les analytics d'une campagne d'événement
   */
  static getEventCampaignAnalytics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { campaignId } = req.params;

    try {
      const analytics = await eventCampaignService.getEventCampaignAnalytics(campaignId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error getting event campaign analytics', {
        error: error.message,
        campaignId
      });
      throw error;
    }
  });
}