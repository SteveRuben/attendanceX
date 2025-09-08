import { 
  CampaignDelivery,
  CampaignDeliveryStatus,
  EmailCampaignErrorCodes,
  EmailDeliveryStatusType,
  EmailTracking,
  GeoLocation,
  TrackingEvent,
  TrackingEventType,
  UnsubscribeRequest
} from '../../shared';
import { collections, db, generateId } from '../../config';
import { logger } from 'firebase-functions';
import { createError } from '../../middleware/errorHandler';
import { campaignDeliveryService } from './campaign-delivery.service';

export interface TrackingPixelRequest {
  pixelId: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

export interface LinkClickRequest {
  deliveryId: string;
  url: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

export interface TrackingAnalytics {
  totalEvents: number;
  eventsByType: Record<TrackingEventType, number>;
  uniqueOpens: number;
  uniqueClicks: number;
  deviceStats: Record<string, number>;
  locationStats: Record<string, number>;
  timelineData: { timestamp: Date; eventType: TrackingEventType; count: number }[];
}

export class CampaignTrackingService {

  /**
   * Track email open via tracking pixel
   */
  async trackEmailOpen(request: TrackingPixelRequest): Promise<void> {
    try {
      // Find delivery by tracking pixel ID
      const deliverySnapshot = await collections.campaign_deliveries
        .where('trackingData.pixelId', '==', request.pixelId)
        .limit(1)
        .get();

      if (deliverySnapshot.empty) {
        logger.warn(`No delivery found for tracking pixel: ${request.pixelId}`);
        return;
      }

      const deliveryDoc = deliverySnapshot.docs[0];
      const delivery = deliveryDoc.data() as CampaignDelivery;

      // Check if already opened (for unique open tracking)
      const isFirstOpen = delivery.status !== EmailDeliveryStatusType.OPENED;

      // Update delivery status
      await collections.campaign_deliveries.doc(delivery.id!).update({
        status: CampaignDeliveryStatus.OPENED,
        openedAt: new Date(),
        updatedAt: new Date()
      });

      // Create tracking record
      await this.createTrackingRecord(
        delivery.id!,
        TrackingEventType.OPENED,
        {
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          referer: request.referer,
          isFirstOpen
        }
      );

      // Update campaign statistics
      await campaignDeliveryService.trackDeliveryEvent(
        delivery.id!,
        TrackingEventType.OPENED,
        { isFirstOpen }
      );

      logger.info(`Email open tracked: ${delivery.id!} - ${request.pixelId}`);
    } catch (error) {
      logger.error('Error tracking email open:', error);
      // Don't throw error to avoid breaking tracking pixel requests
    }
  }

  /**
   * Track link click
   */
  async trackLinkClick(request: LinkClickRequest): Promise<string> {
    try {
      // Get delivery record
      const deliveryDoc = await collections.campaign_deliveries.doc(request.deliveryId).get();
      
      if (!deliveryDoc.exists) {
        throw createError(
          'Delivery not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const delivery = deliveryDoc.data() as CampaignDelivery;

      // Check if already clicked (for unique click tracking)
      const isFirstClick = delivery.status !== EmailDeliveryStatusType.CLICKED;

      // Update delivery status
      await collections.campaign_deliveries.doc(request.deliveryId).update({
        status: CampaignDeliveryStatus.CLICKED,
        clickedAt: new Date(),
        updatedAt: new Date()
      });

      // Create tracking record
      await this.createTrackingRecord(
        request.deliveryId,
        TrackingEventType.CLICKED,
        {
          url: request.url,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          referer: request.referer,
          isFirstClick
        }
      );

      // Update campaign statistics
      await campaignDeliveryService.trackDeliveryEvent(
        request.deliveryId,
        TrackingEventType.CLICKED,
        { url: request.url, isFirstClick }
      );

      logger.info(`Link click tracked: ${request.deliveryId} - ${request.url}`);

      // Return the original URL for redirect
      return request.url;
    } catch (error) {
      logger.error('Error tracking link click:', error);
      
      if (error instanceof Error && error.message.includes('Delivery not found')) {
        throw error;
      }
      
      throw createError(
        'Failed to track link click',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { deliveryId: request.deliveryId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Track email bounce
   */
  async trackEmailBounce(
    deliveryId: string,
    bounceType: 'hard' | 'soft',
    bounceReason: string,
    webhookData?: any
  ): Promise<void> {
    try {
      // Update delivery status
      await collections.campaign_deliveries.doc(deliveryId).update({
        status: CampaignDeliveryStatus.BOUNCED,
        bouncedAt: new Date(),
        bounceReason,
        bounceType,
        updatedAt: new Date()
      });

      // Create tracking record
      await this.createTrackingRecord(
        deliveryId,
        TrackingEventType.BOUNCED,
        {
          bounceType,
          bounceReason,
          webhookData
        }
      );

      // Update campaign statistics
      await campaignDeliveryService.trackDeliveryEvent(
        deliveryId,
        TrackingEventType.BOUNCED,
        { bounceType, bounceReason }
      );

      // Mark recipient as bounced if hard bounce
      if (bounceType === 'hard') {
        await this.markRecipientAsBounced(deliveryId);
      }

      logger.info(`Email bounce tracked: ${deliveryId} - ${bounceType} - ${bounceReason}`);
    } catch (error) {
      logger.error('Error tracking email bounce:', error);
      throw createError(
        'Failed to track email bounce',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { deliveryId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Track spam complaint
   */
  async trackSpamComplaint(
    deliveryId: string,
    complaintData?: any
  ): Promise<void> {
    try {
      // Update delivery status
      await collections.campaign_deliveries.doc(deliveryId).update({
        status: CampaignDeliveryStatus.BOUNCED, // Treat spam as bounce
        spamComplaintAt: new Date(),
        updatedAt: new Date()
      });

      // Create tracking record
      await this.createTrackingRecord(
        deliveryId,
        TrackingEventType.SPAM_COMPLAINT,
        complaintData
      );

      // Update campaign statistics
      await campaignDeliveryService.trackDeliveryEvent(
        deliveryId,
        TrackingEventType.SPAM_COMPLAINT,
        complaintData
      );

      // Mark recipient as bounced
      await this.markRecipientAsBounced(deliveryId);

      logger.info(`Spam complaint tracked: ${deliveryId}`);
    } catch (error) {
      logger.error('Error tracking spam complaint:', error);
      throw createError(
        'Failed to track spam complaint',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { deliveryId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get tracking analytics for campaign
   */
  async getCampaignTrackingAnalytics(campaignId: string): Promise<TrackingAnalytics> {
    try {
      // Get all tracking records for campaign
      const trackingSnapshot = await collections.email_tracking
        .where('campaignId', '==', campaignId)
        .get();

      const analytics: TrackingAnalytics = {
        totalEvents: 0,
        eventsByType: {
          [TrackingEventType.SENT]: 0,
          [TrackingEventType.DELIVERED]: 0,
          [TrackingEventType.OPENED]: 0,
          [TrackingEventType.CLICKED]: 0,
          [TrackingEventType.BOUNCED]: 0,
          [TrackingEventType.UNSUBSCRIBED]: 0,
          [TrackingEventType.SPAM_COMPLAINT]: 0
        },
        uniqueOpens: 0,
        uniqueClicks: 0,
        deviceStats: {},
        locationStats: {},
        timelineData: []
      };

      const uniqueOpens = new Set<string>();
      const uniqueClicks = new Set<string>();
      const timelineMap = new Map<string, { [key in TrackingEventType]?: number }>();

      trackingSnapshot.docs.forEach(doc => {
        const tracking = doc.data() as EmailTracking;
        
        tracking.events.forEach(event => {
          analytics.totalEvents++;
          analytics.eventsByType[event.type]++;

          // Track unique opens and clicks
          if (event.type === TrackingEventType.OPENED) {
            uniqueOpens.add(tracking.deliveryId);
          }
          if (event.type === TrackingEventType.CLICKED) {
            uniqueClicks.add(tracking.deliveryId);
          }

          // Device stats
          if (tracking.userAgent) {
            const device = this.parseDeviceFromUserAgent(tracking.userAgent);
            analytics.deviceStats[device] = (analytics.deviceStats[device] || 0) + 1;
          }

          // Location stats
          if (tracking.location?.country) {
            const country = tracking.location.country;
            analytics.locationStats[country] = (analytics.locationStats[country] || 0) + 1;
          }

          // Timeline data
          const timeKey = event.timestamp.toISOString().split('T')[0]; // Group by day
          if (!timelineMap.has(timeKey)) {
            timelineMap.set(timeKey, {});
          }
          const dayData = timelineMap.get(timeKey)!;
          dayData[event.type] = (dayData[event.type] || 0) + 1;
        });
      });

      analytics.uniqueOpens = uniqueOpens.size;
      analytics.uniqueClicks = uniqueClicks.size;

      // Convert timeline map to array
      analytics.timelineData = Array.from(timelineMap.entries()).map(([date, events]) => ({
        timestamp: new Date(date),
        eventType: TrackingEventType.OPENED, // Default, will be overridden
        count: Object.values(events).reduce((sum, count) => sum + (count || 0), 0)
      }));

      return analytics;
    } catch (error) {
      logger.error('Error getting campaign tracking analytics:', error);
      throw createError(
        'Failed to get tracking analytics',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get delivery tracking details
   */
  async getDeliveryTracking(deliveryId: string): Promise<EmailTracking | null> {
    try {
      const trackingSnapshot = await collections.email_tracking
        .where('deliveryId', '==', deliveryId)
        .limit(1)
        .get();

      if (trackingSnapshot.empty) {
        return null;
      }

      return trackingSnapshot.docs[0].data() as EmailTracking;
    } catch (error) {
      logger.error('Error getting delivery tracking:', error);
      throw createError(
        'Failed to get delivery tracking',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { deliveryId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create tracking record
   */
  private async createTrackingRecord(
    deliveryId: string,
    eventType: TrackingEventType,
    metadata: any
  ): Promise<void> {
    try {
      const trackingId = generateId('track_');
      
      // Get or create tracking record
      const existingTrackingSnapshot = await collections.email_tracking
        .where('deliveryId', '==', deliveryId)
        .limit(1)
        .get();

      const event: TrackingEvent = {
        type: eventType,
        timestamp: new Date(),
        metadata
      };

      if (existingTrackingSnapshot.empty) {
        // Create new tracking record
        const tracking: EmailTracking = {
          deliveryId,
          trackingPixelId: metadata.pixelId || generateId('pixel_'),
          events: [event],
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          location: await this.getLocationFromIP(metadata.ipAddress)
        };

        await collections.email_tracking.doc(trackingId).set({
          ...tracking,
          id: trackingId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Update existing tracking record
        const existingDoc = existingTrackingSnapshot.docs[0];
        const existingTracking = existingDoc.data() as EmailTracking;

        await collections.email_tracking.doc(existingDoc.id).update({
          events: [...existingTracking.events, event],
          updatedAt: new Date()
        });
      }
    } catch (error) {
      logger.error('Error creating tracking record:', error);
      // Don't throw error to avoid breaking tracking flow
    }
  }

  /**
   * Mark recipient as bounced
   */
  private async markRecipientAsBounced(deliveryId: string): Promise<void> {
    try {
      const deliveryDoc = await collections.campaign_deliveries.doc(deliveryId).get();
      
      if (!deliveryDoc.exists) {
        return;
      }

      const delivery = deliveryDoc.data() as CampaignDelivery;
      
      // Update recipient lists to mark email as bounced
      const recipientListsSnapshot = await collections.campaign_recipient_lists
        .where('organizationId', '==', delivery.campaignContext.organizationId)
        .get();

      const batch = db.batch();

      recipientListsSnapshot.docs.forEach(doc => {
        const listData = doc.data() as any;
        if (listData.recipients) {
          const updatedRecipients = listData.recipients.map((recipient: any) => {
            if (recipient.email === delivery.recipientEmail) {
              return { ...recipient, bounced: true };
            }
            return recipient;
          });

          batch.update(doc.ref, { recipients: updatedRecipients });
        }
      });

      await batch.commit();
    } catch (error) {
      logger.error('Error marking recipient as bounced:', error);
      // Don't throw error to avoid breaking tracking flow
    }
  }

  /**
   * Get location from IP address (mock implementation)
   */
  private async getLocationFromIP(ipAddress?: string): Promise<GeoLocation | undefined> {
    if (!ipAddress) {
      return undefined;
    }

    // In a real implementation, you would use a geolocation service
    // For now, return a mock location
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0
    };
  }

  /**
   * Parse device from user agent (simplified)
   */
  private parseDeviceFromUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  /**
   * Generate tracking pixel response
   */
  generateTrackingPixelResponse(): Buffer {
    // 1x1 transparent PNG pixel
    const pixel = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    return pixel;
  }

  /**
   * Process unsubscribe request
   */
  async processUnsubscribe(request: UnsubscribeRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // This would typically be handled by the recipient list management service
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Unsubscribe processed successfully'
      };
    } catch (error) {
      logger.error('Error processing unsubscribe:', error);
      throw new Error('Failed to process unsubscribe');
    }
  }

  /**
   * Get unsubscribe information
   */
  async getUnsubscribeInfo(token: string): Promise<{
    email: string;
    campaignName?: string;
    organizationName?: string;
  }> {
    try {
      // This would typically decode the token and return unsubscribe info
      // For now, return a placeholder response
      return {
        email: 'placeholder@example.com',
        campaignName: 'Sample Campaign',
        organizationName: 'Sample Organization'
      };
    } catch (error) {
      logger.error('Error getting unsubscribe info:', error);
      throw new Error('Failed to get unsubscribe info');
    }
  }

  /**
   * Clean up old tracking data (GDPR compliance)
   */
  async cleanupOldTrackingData(retentionDays: number = 365): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldTrackingSnapshot = await collections.email_tracking
        .where('createdAt', '<', cutoffDate)
        .limit(500) // Process in batches
        .get();

      if (oldTrackingSnapshot.empty) {
        return;
      }

      const batch = db.batch();
      oldTrackingSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`Cleaned up ${oldTrackingSnapshot.size} old tracking records`);

      // Continue cleanup if there are more records
      if (oldTrackingSnapshot.size === 500) {
        await this.cleanupOldTrackingData(retentionDays);
      }
    } catch (error) {
      logger.error('Error cleaning up old tracking data:', error);
      throw createError(
        'Failed to cleanup tracking data',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
}

export const campaignTrackingService = new CampaignTrackingService();