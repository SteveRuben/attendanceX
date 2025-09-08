import { Response } from 'express';
import {
  EmailCampaignErrorCodes,
  RecipientPreviewRequest
} from '../shared';
import { AuthenticatedRequest } from '../types';
import { asyncAuthHandler, createError } from '../middleware/errorHandler';
import { 
  campaignRecipientService,
  recipientListManagementService
} from '../services/campaigns';
import { logger } from 'firebase-functions';

export class CampaignRecipientController {

  /**
   * Preview recipients based on criteria
   */
  static previewRecipients = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    // const userId = req.user.uid; // Commented out as not used
    const request: RecipientPreviewRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!request.criteria) {
      throw createError(
        'Recipient criteria is required',
        400,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }

    const recipients = await campaignRecipientService.getRecipientsByCriteria(
      organizationId,
      request.criteria,
      request.limit || 50
    );

    res.json({
      success: true,
      data: {
        recipients,
        totalCount: recipients.length,
        criteria: request.criteria
      }
    });
  });

  /**
   * Get organization users for recipient selection
   */
  static getOrganizationUsers = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { search, team, role, limit = '100', offset = '0' } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      search: search as string,
      team: team as string,
      role: role as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const users = await campaignRecipientService.getOrganizationUsers(organizationId, filters);

    res.json({
      success: true,
      data: users,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: users.length
      }
    });
  });

  /**
   * Get organization teams for recipient selection
   */
  static getOrganizationTeams = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const teams = await campaignRecipientService.getOrganizationTeams(organizationId);

    res.json({
      success: true,
      data: teams
    });
  });

  /**
   * Get event participants for recipient selection
   */
  static getEventParticipants = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { eventId } = req.params;
    const { status, limit = '100', offset = '0' } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!eventId) {
      throw createError(
        'Event ID is required',
        400,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }

    const filters = {
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const participants = await campaignRecipientService.getEventParticipants(
      organizationId,
      eventId,
      filters
    );

    res.json({
      success: true,
      data: participants,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: participants.length
      }
    });
  });

  /**
   * Import external recipients
   */
  static importRecipients = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
   // const userId = req.user.uid;
    const { recipients, listName, validateEmails = true } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw createError(
        'Recipients array is required and cannot be empty',
        400,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }

    const result = await recipientListManagementService.importRecipients({
      organizationId,
      recipients,
      listName,
      validateEmails
    });

    logger.info(`Recipients imported: ${result.imported} successful, ${result.skipped} skipped, ${result.errors.length} errors`);

    res.status(201).json({
      success: true,
      data: result
    });
  });

  /**
   * Get unsubscribed recipients
   */
  static getUnsubscribedRecipients = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { limit = '50', offset = '0' } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const unsubscribed = await recipientListManagementService.getUnsubscribedEmails(
      organizationId,
      filters.limit,
      filters.offset
    );

    res.json({
      success: true,
      data: unsubscribed.unsubscribes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: unsubscribed.total
      }
    });
  });

  /**
   * Resubscribe a recipient
   */
  static resubscribeRecipient = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { email } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!email) {
      throw createError(
        'Email is required',
        400,
        EmailCampaignErrorCodes.RECIPIENT_NOT_FOUND
      );
    }

    await recipientListManagementService.resubscribeRecipient(organizationId, email, userId);

    logger.info(`Recipient resubscribed: ${email} by user ${userId}`);

    res.json({
      success: true,
      message: 'Recipient resubscribed successfully'
    });
  });

  /**
   * Get recipient statistics
   */
  static getRecipientStats = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const stats = await campaignRecipientService.getRecipientStatistics(organizationId);

    res.json({
      success: true,
      data: stats
    });
  });
}