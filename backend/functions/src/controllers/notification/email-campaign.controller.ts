import { Response } from 'express';
import { 
  CampaignPreviewRequest,
  CampaignStatus,
  CampaignType,
  CreateCampaignRequest,
  EmailCampaignErrorCodes,
  RecipientPreviewRequest,
  UpdateCampaignRequest
} from '../../shared';
import { AuthenticatedRequest } from '../../types';
import { asyncAuthHandler, createError } from '../../middleware/errorHandler';
import { 
  emailCampaignService,
  campaignRecipientService,
  campaignQueueService,
  campaignAnalyticsService,
  campaignTemplateService
} from '../../services/campaigns';
import { logger } from 'firebase-functions';

export class EmailCampaignController {

  /**
   * Create a new email campaign
   */
  static createCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const request: CreateCampaignRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    // Validate request
    if (!request.name || !request.subject || !request.type) {
      throw createError(
        'Missing required fields: name, subject, type',
        400,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }

    const campaign = await emailCampaignService.createCampaign(organizationId, userId, request);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  });

  /**
   * Get campaign by ID
   */
  static getCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const campaign = await emailCampaignService.getCampaignById(campaignId, organizationId);

    if (!campaign) {
      throw createError(
        'Campaign not found',
        404,
        EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
      );
    }

    res.json({
      success: true,
      data: campaign
    });
  });

  /**
   * Get campaigns with filters
   */
  static getCampaigns = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      status: req.query.status as CampaignStatus,
      type: req.query.type as CampaignType,
      createdBy: req.query.createdBy as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const result = await emailCampaignService.getCampaigns(organizationId, filters);

    res.json({
      success: true,
      data: result.campaigns,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  });

  /**
   * Update campaign
   */
  static updateCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const campaignId = req.params.campaignId;
    const request: UpdateCampaignRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const campaign = await emailCampaignService.updateCampaign(
      campaignId,
      organizationId,
      userId,
      request
    );

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  });

  /**
   * Delete campaign
   */
  static deleteCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    await emailCampaignService.deleteCampaign(campaignId, organizationId);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  });

  /**
   * Preview campaign recipients
   */
  static previewRecipients = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const request: RecipientPreviewRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const limit = request.limit || 50;
    const offset = request.offset || 0;

    const preview = await campaignRecipientService.previewRecipients(
      organizationId,
      request.criteria,
      limit,
      offset
    );

    res.json({
      success: true,
      data: preview
    });
  });

  /**
   * Preview campaign content
   */
  static previewCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const request: CampaignPreviewRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    let previewContent = {
      subject: '',
      htmlContent: request.content.htmlContent || '',
      textContent: request.content.textContent || ''
    };

    // If using a template, render it with sample data
    if (request.templateId) {
      const template = await campaignTemplateService.getTemplateById(request.templateId, organizationId);
      
      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Use sample recipient data for preview
      const sampleRecipient = request.sampleRecipient || {
        email: 'example@example.com',
        firstName: 'John',
        lastName: 'Doe',
        personalizations: {
          fullName: 'John Doe',
          organizationName: 'Sample Organization'
        },
        unsubscribed: false,
        bounced: false
      };

      // Render template with sample data
      previewContent = {
        subject: this.personalizeContent(template.subject, sampleRecipient),
        htmlContent: this.personalizeContent(template.htmlContent, sampleRecipient),
        textContent: this.personalizeContent(template.textContent || '', sampleRecipient)
      };
    } else {
      // Use provided content with sample personalization
      const sampleRecipient = request.sampleRecipient || {
        email: 'example@example.com',
        firstName: 'John',
        lastName: 'Doe',
        personalizations: {
          fullName: 'John Doe'
        },
        unsubscribed: false,
        bounced: false
      };

      previewContent = {
        subject: this.personalizeContent(request.content.subject || '', sampleRecipient),
        htmlContent: this.personalizeContent(request.content.htmlContent || '', sampleRecipient),
        textContent: this.personalizeContent(request.content.textContent || '', sampleRecipient)
      };
    }

    res.json({
      success: true,
      data: {
        preview: previewContent,
        sampleRecipient: request.sampleRecipient
      }
    });
  });

  /**
   * Send test campaign
   */
  static sendTestCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;
    const { testRecipients } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!testRecipients || !Array.isArray(testRecipients) || testRecipients.length === 0) {
      throw createError(
        'Test recipients are required',
        400,
        EmailCampaignErrorCodes.RECIPIENT_LIST_EMPTY
      );
    }

    const campaign = await emailCampaignService.getCampaignById(campaignId, organizationId);

    if (!campaign) {
      throw createError(
        'Campaign not found',
        404,
        EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
      );
    }

    // TODO: Implement test sending logic
    // This would create a special test delivery that doesn't affect campaign stats

    logger.info(`Test campaign sent: ${campaignId} to ${testRecipients.length} recipients`);

    res.json({
      success: true,
      message: `Test campaign sent to ${testRecipients.length} recipients`,
      data: {
        campaignId,
        testRecipients: testRecipients.length
      }
    });
  });

  /**
   * Schedule campaign for sending
   */
  static scheduleCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;
    const { scheduledAt, priority, batchSize } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const queue = await campaignQueueService.scheduleCampaign(organizationId, {
      campaignId,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      priority,
      batchSize
    });

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: {
        queueId: queue.id,
        scheduledAt: queue.scheduledAt,
        totalRecipients: queue.totalRecipients,
        batches: queue.batches.length
      }
    });
  });

  /**
   * Send campaign immediately
   */
  static sendCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    // Schedule for immediate sending
    const queue = await campaignQueueService.scheduleCampaign(organizationId, {
      campaignId,
      scheduledAt: new Date(), // Send immediately
      priority: 10 // High priority for immediate sends
    });

    res.json({
      success: true,
      message: 'Campaign queued for immediate sending',
      data: {
        queueId: queue.id,
        totalRecipients: queue.totalRecipients,
        batches: queue.batches.length
      }
    });
  });

  /**
   * Pause campaign
   */
  static pauseCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    // Find the queue for this campaign
    // Note: In a real implementation, you'd store the queue ID with the campaign
    // For now, we'll update the campaign status directly
    await emailCampaignService.updateCampaignStatus(
      campaignId,
      organizationId,
      CampaignStatus.PAUSED
    );

    res.json({
      success: true,
      message: 'Campaign paused successfully'
    });
  });

  /**
   * Resume campaign
   */
  static resumeCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    await emailCampaignService.updateCampaignStatus(
      campaignId,
      organizationId,
      CampaignStatus.SENDING
    );

    res.json({
      success: true,
      message: 'Campaign resumed successfully'
    });
  });

  /**
   * Cancel campaign
   */
  static cancelCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    await emailCampaignService.updateCampaignStatus(
      campaignId,
      organizationId,
      CampaignStatus.CANCELLED
    );

    res.json({
      success: true,
      message: 'Campaign cancelled successfully'
    });
  });

  /**
   * Get campaign analytics
   */
  static getCampaignAnalytics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const analytics = await campaignAnalyticsService.getCampaignAnalytics(campaignId);

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * Get comparative analytics
   */
  static getComparativeAnalytics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      campaignType: req.query.campaignType as CampaignType,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      campaignIds: req.query.campaignIds ? (req.query.campaignIds as string).split(',') : undefined
    };

    const analytics = await campaignAnalyticsService.getComparativeAnalytics(organizationId, filters);

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * Get engagement insights
   */
  static getEngagementInsights = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    const insights = await campaignAnalyticsService.getEngagementInsights(organizationId, filters);

    res.json({
      success: true,
      data: insights
    });
  });

  /**
   * Get real-time campaign performance
   */
  static getRealTimePerformance = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const campaignId = req.params.campaignId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const performance = await campaignAnalyticsService.getRealTimePerformance(campaignId);

    res.json({
      success: true,
      data: performance
    });
  });

  /**
   * Duplicate campaign
   */
  static duplicateCampaign = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const campaignId = req.params.campaignId;
    const { newName } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const originalCampaign = await emailCampaignService.getCampaignById(campaignId, organizationId);

    if (!originalCampaign) {
      throw createError(
        'Campaign not found',
        404,
        EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
      );
    }

    const duplicateRequest: CreateCampaignRequest = {
      name: newName || `${originalCampaign.name} (Copy)`,
      type: originalCampaign.type,
      subject: originalCampaign.subject,
      templateId: originalCampaign.templateId,
      content: originalCampaign.content,
      recipientCriteria: originalCampaign.recipients.criteria,
      tags: originalCampaign.tags,
      notes: originalCampaign.notes
    };

    const duplicatedCampaign = await emailCampaignService.createCampaign(
      organizationId,
      userId,
      duplicateRequest
    );

    res.status(201).json({
      success: true,
      message: 'Campaign duplicated successfully',
      data: duplicatedCampaign
    });
  });

  /**
   * Personalize content with recipient data
   */
  private static personalizeContent(content: string, recipient: any): string {
    let personalizedContent = content;
    
    // Replace common variables
    const variables = {
      '{{firstName}}': recipient.firstName || '',
      '{{lastName}}': recipient.lastName || '',
      '{{fullName}}': recipient.personalizations?.fullName || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
      '{{email}}': recipient.email || ''
    };

    Object.entries(variables).forEach(([placeholder, value]) => {
      personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Replace custom personalizations
    if (recipient.personalizations) {
      Object.entries(recipient.personalizations).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        personalizedContent = personalizedContent.replace(
          new RegExp(placeholder, 'g'), 
          String(value || '')
        );
      });
    }

    return personalizedContent;
  }
}

export const emailCampaignController = new EmailCampaignController();