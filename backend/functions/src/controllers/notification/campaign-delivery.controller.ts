import { Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncAuthHandler, createError } from '../../middleware/errorHandler';
import { campaignTrackingService } from '../../services';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { EmailCampaignErrorCodes } from '../../common/types';

export class CampaignDeliveryController {

  /**
   * Get campaign delivery status
   */
  static getDeliveryStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement campaign delivery status functionality
    res.json({
      success: true,
      message: "Campaign delivery status endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Get campaign queue status
   */
  static getQueueStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement campaign queue status functionality
    res.json({
      success: true,
      message: "Campaign queue status endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Retry failed deliveries
   */
  static retryFailedDeliveries = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement retry failed deliveries functionality
    res.json({
      success: true,
      message: "Retry failed deliveries endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Get email providers status
   */
  static getProvidersStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement email providers status functionality
    res.json({
      success: true,
      message: "Email providers status endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Test email delivery
   */
  static testDelivery = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement test email delivery functionality
    res.json({
      success: true,
      message: "Test email delivery endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Get delivery analytics
   */
  static getDeliveryAnalytics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement delivery analytics functionality
    res.json({
      success: true,
      message: "Delivery analytics endpoint - implementation pending",
      data: {}
    });
  });

  /**
   * Handle tracking pixel requests
   */
  static trackPixel = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pixelId = req.params.pixelId as string;
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
    const linkId = req.params.linkId as string;
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
    const token = req.params.token as string;
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
    const token = req.params.token as string;

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