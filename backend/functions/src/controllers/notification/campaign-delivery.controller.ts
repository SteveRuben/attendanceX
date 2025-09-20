import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler, createError } from '../../middleware/errorHandler';
import { campaignDeliveryService, campaignQueueService, campaignTrackingService } from '../../services';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { EmailCampaignErrorCodes } from '../../common/types';

export class CampaignDeliveryController {

  /**
   * Get campaign delivery status
   */
  static getDeliveryStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { campaignId } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!campaignId) {
      throw createError(
        'Campaign ID is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    const deliveryStatus = await campaignDeliveryService.getCampaignDeliveryStatus(
      campaignId,
      organizationId
    );

    res.json({
      success: true,
      data: deliveryStatus
    });
  });

  /**
   * Get campaign queue status
   */
  static getQueueStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { campaignId } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!campaignId) {
      throw createError(
        'Campaign ID is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    const queueStatus = await campaignQueueService.getQueueStatus(campaignId, organizationId);

    res.json({
      success: true,
      data: queueStatus
    });
  });

  /**
   * Retry failed deliveries
   */
  static retryFailedDeliveries = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { campaignId } = req.params;
    const { maxRetries = 3 } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!campaignId) {
      throw createError(
        'Campaign ID is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    const result = await campaignDeliveryService.retryFailedDeliveries(
      campaignId,
      organizationId,
      maxRetries
    );

    logger.info(`Retry initiated for campaign ${campaignId}: ${result.retriedCount} deliveries by user ${userId}`);

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Get email providers status
   */
  static getProvidersStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const providersStatus = await campaignDeliveryService.getEmailProvidersStatus();

    res.json({
      success: true,
      data: providersStatus
    });
  });

  /**
   * Test email delivery
   */
  static testDelivery = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const {
      testEmail,
      campaignId,
      templateId,
      subject,
      content,
      provider
    } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!testEmail) {
      throw createError(
        'Test email address is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    const result = await campaignDeliveryService.sendTestEmail({
      organizationId,
      userId,
      testEmail,
      campaignId,
      templateId,
      subject,
      content,
      preferredProvider: provider
    });

    logger.info(`Test email sent to ${testEmail} for campaign ${campaignId} by user ${userId}`);

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Get delivery analytics
   */
  static getDeliveryAnalytics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { campaignId } = req.params;
    const {
      startDate,
      endDate,
      groupBy = 'day',
      includeDetails = 'false'
    } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!campaignId) {
      throw createError(
        'Campaign ID is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    const analytics = await campaignDeliveryService.getDeliveryAnalytics(
      campaignId,
      organizationId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        groupBy: groupBy as 'hour' | 'day' | 'week',
        includeDetails: includeDetails === 'true'
      }
    );

    res.json({
      success: true,
      data: analytics
    });
  });

  /**
   * Handle tracking pixel requests
   */
  static trackPixel = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pixelId } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!pixelId) {
      // Return a 1x1 transparent pixel even if pixelId is missing
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.send(pixel);
    }

    try {
      await campaignTrackingService.trackEmailOpen({
        pixelId,
        ipAddress: clientIp,
        userAgent
      });

      logger.debug(`Email open tracked: ${pixelId}`);
    } catch (error) {
      logger.error('Error tracking email open:', error);
      // Don't fail the pixel request even if tracking fails
    }

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.send(pixel);
  });

  /**
   * Handle link click tracking
   */
  static trackClick = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { linkId } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!linkId) {
      throw createError(
        'Link ID is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    try {
      const redirectUrl = await campaignTrackingService.trackLinkClick({
        url: linkId, // Using linkId as url for now
        ipAddress: clientIp,
        userAgent,
        deliveryId: ''
      });

      logger.debug(`Link click tracked: ${linkId}`);

      // Redirect to the original URL
      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error('Error tracking link click:', error);

      // If tracking fails, try to redirect to a fallback URL or show an error
      throw createError(
        'Link not found or expired',
        404,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  });

  /**
   * Handle unsubscribe requests
   */
  static handleUnsubscribe = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;
    const { reason } = req.body;

    if (!token) {
      throw createError(
        'Unsubscribe token is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    try {
      const result = await campaignTrackingService.processUnsubscribe({
        token,
        reason
      });

      logger.info(`Unsubscribe processed for token: ${token}`);

      res.json({
        success: true,
        data: {
          message: result.message
        }
      });
    } catch (error) {
      logger.error('Error processing unsubscribe:', error);
      throw createError(
        'Invalid or expired unsubscribe token',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  });

  /**
   * Get unsubscribe page
   */
  static getUnsubscribePage = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    if (!token) {
      throw createError(
        'Unsubscribe token is required',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }

    try {
      const unsubscribeInfo = await campaignTrackingService.getUnsubscribeInfo(token);

      res.json({
        success: true,
        data: unsubscribeInfo
      });
    } catch (error) {
      logger.error('Error getting unsubscribe info:', error);
      throw createError(
        'Invalid or expired unsubscribe token',
        400,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  });
}