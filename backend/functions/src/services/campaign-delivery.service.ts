import { 
  CampaignDeliveryQueue,
  SendEmailRequest,
  EmailCampaign,
  CampaignDelivery,
  CampaignDeliveryStatus,
  EmailCampaignErrorCodes,
  TrackingEvent,
  TrackingEventType,
  EmailDeliveryStatusType
} from '@attendance-x/shared';
import { collections, generateId } from '../config/database';
import { logger } from 'firebase-functions';
import { createError } from '../middleware/errorHandler';
import { EmailService } from './notification/EmailService';
import { campaignQueueService } from './campaign-queue.service';
import { recipientListManagementService } from './recipient-list-management.service';

export interface DeliveryResult {
  batchId: string;
  totalSent: number;
  successful: number;
  failed: number;
  errors: { email: string; error: string }[];
}

export interface DeliveryOptions {
  respectRateLimits?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  preferredProvider?: string;
}

export class CampaignDeliveryService {
  private readonly emailService = new EmailService();
  // private readonly DEFAULT_MAX_RETRIES = 3; // Commented out as not used
  private readonly DEFAULT_RETRY_DELAY = 5000; // 5 seconds
  private readonly DEFAULT_BATCH_DELAY = 1000; // 1 second between batches

  /**
   * Process campaign delivery queue
   */
  async processDeliveryQueue(
    queueId: string,
    options: DeliveryOptions = {}
  ): Promise<DeliveryResult[]> {
    try {
      const results: DeliveryResult[] = [];
      let hasMoreBatches = true;

      while (hasMoreBatches) {
        const batchResult = await campaignQueueService.processNextBatch(queueId);
        
        if (!batchResult.processed) {
          hasMoreBatches = false;
          break;
        }

        if (batchResult.batchId) {
          const deliveryResult = await this.deliverBatch(queueId, batchResult.batchId, options);
          results.push(deliveryResult);

          // Add delay between batches if rate limiting is enabled
          if (options.respectRateLimits !== false) {
            await this.delay(this.DEFAULT_BATCH_DELAY);
          }
        }
      }

      logger.info(`Completed delivery queue processing: ${queueId} with ${results.length} batches`);
      return results;
    } catch (error) {
      logger.error('Error processing delivery queue:', error);
      throw createError(
        'Failed to process delivery queue',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Deliver a single batch
   */
  async deliverBatch(
    queueId: string,
    batchId: string,
    options: DeliveryOptions = {}
  ): Promise<DeliveryResult> {
    try {
      // Get queue and batch data
      const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
      
      if (!queueDoc.exists) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const queue = queueDoc.data() as CampaignDeliveryQueue;
      const batch = queue.batches.find(b => b.batchId === batchId);

      if (!batch) {
        throw createError(
          'Batch not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      // Get campaign data
      const campaignDoc = await collections.email_campaigns.doc(queue.campaignId).get();
      const campaign = campaignDoc.data() as EmailCampaign;

      const result: DeliveryResult = {
        batchId,
        totalSent: batch.emailRequests.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process each email in the batch
      for (const emailRequest of batch.emailRequests) {
        try {
          // Add tracking data to email request
          const enhancedRequest = await this.enhanceEmailRequest(
            emailRequest,
            campaign,
            queue.organizationId
          );

          // Send email using existing email service
          const deliveryResult = await this.emailService.sendEmail(
            enhancedRequest.to,
            enhancedRequest.subject,
            {
              html: enhancedRequest.htmlContent,
              text: enhancedRequest.textContent
            }
          );

          // Create delivery record
          await this.createDeliveryRecord(
            campaign,
            emailRequest,
            deliveryResult,
            queue.organizationId
          );

          // Track successful delivery
          await this.trackDeliveryEvent(
            deliveryResult.messageId || generateId(),
            TrackingEventType.SENT,
            { batchId, queueId }
          );

          result.successful++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            email: Array.isArray(emailRequest.to) ? emailRequest.to[0] : emailRequest.to,
            error: errorMessage
          });
          result.failed++;

          logger.warn(`Failed to send email to ${emailRequest.to}:`, error);

          // Retry logic
          if (options.maxRetries && options.maxRetries > 0) {
            const retryResult = await this.retryEmailDelivery(
              emailRequest,
              campaign,
              queue.organizationId,
              options.maxRetries,
              options.retryDelay || this.DEFAULT_RETRY_DELAY
            );

            if (retryResult.success) {
              result.successful++;
              result.failed--;
              // Remove from errors
              result.errors = result.errors.filter(e => e.email !== emailRequest.to);
            }
          }
        }

        // Add small delay between emails if rate limiting is enabled
        if (options.respectRateLimits !== false) {
          await this.delay(100); // 100ms between emails
        }
      }

      logger.info(`Batch delivered: ${batchId} - ${result.successful} successful, ${result.failed} failed`);
      return result;
    } catch (error) {
      logger.error('Error delivering batch:', error);
      throw createError(
        'Failed to deliver batch',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, batchId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Enhance email request with tracking data
   */
  private async enhanceEmailRequest(
    emailRequest: SendEmailRequest,
    campaign: EmailCampaign,
    organizationId: string
  ): Promise<SendEmailRequest> {
    // Generate tracking pixel ID
    const trackingPixelId = generateId('pixel_');
    
    // Generate unsubscribe token
    const unsubscribeToken = await recipientListManagementService.generateUnsubscribeToken(
      organizationId,
      Array.isArray(emailRequest.to) ? emailRequest.to[0] : emailRequest.to,
      campaign.id,
      emailRequest.metadata?.recipientId
    );

    // Add tracking pixel to HTML content
    let enhancedHtmlContent = emailRequest.htmlContent;
    if (enhancedHtmlContent) {
      const trackingPixel = `<img src="${process.env.FUNCTIONS_URL}/api/campaigns/tracking/pixel/${trackingPixelId}" width="1" height="1" style="display:none;" />`;
      enhancedHtmlContent += trackingPixel;
    }

    // Add unsubscribe link to content
    const unsubscribeLink = `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`;
    if (enhancedHtmlContent) {
      enhancedHtmlContent = enhancedHtmlContent.replace(
        /{{unsubscribeLink}}/g,
        unsubscribeLink
      );
    }

    // Enhance text content
    let enhancedTextContent = emailRequest.textContent;
    if (enhancedTextContent) {
      enhancedTextContent = enhancedTextContent.replace(
        /{{unsubscribeLink}}/g,
        unsubscribeLink
      );
    }

    return {
      ...emailRequest,
      htmlContent: enhancedHtmlContent,
      textContent: enhancedTextContent,
      metadata: {
        ...emailRequest.metadata,
        trackingId: trackingPixelId,
        unsubscribeToken
        // campaignDelivery: true // Removed as not part of metadata interface
      }
    };
  }

  /**
   * Create delivery record
   */
  private async createDeliveryRecord(
    campaign: EmailCampaign,
    emailRequest: SendEmailRequest,
    deliveryResult: any,
    organizationId: string
  ): Promise<void> {
    try {
      const delivery: CampaignDelivery = {
        id: deliveryResult.messageId || generateId(),
        campaignId: campaign.id,
        recipientUserId: emailRequest.metadata?.recipientId,
        recipientEmail: Array.isArray(emailRequest.to) ? emailRequest.to[0] : emailRequest.to,
        status: EmailDeliveryStatusType.SENT,
        sentAt: new Date(),
        personalizations: emailRequest.templateData || {},
        trackingData: {
          pixelId: emailRequest.metadata?.trackingId || '',
          unsubscribeToken: emailRequest.metadata?.unsubscribeToken || '',
          clickTokens: {} // Will be populated when links are clicked
        },
        campaignContext: {
          campaignName: campaign.name,
          campaignType: campaign.type,
          organizationId
        },
        providerId: deliveryResult.provider,
        messageId: deliveryResult.providerMessageId,
        recipient: '',
        attempts: 0,
        lastAttemptAt: undefined
      };

   
      await collections.campaign_deliveries.doc(deliveryResult.messageId || generateId()).set(delivery);
    } catch (error) {
      logger.error('Error creating delivery record:', error);
      // Don't throw error to avoid breaking delivery flow
    }
  }

  /**
   * Track delivery event
   */
  async trackDeliveryEvent(
    deliveryId: string,
    eventType: TrackingEventType,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const event: TrackingEvent = {
        type: eventType,
        timestamp: new Date(),
        metadata
      };

      // Update delivery record with new event
      await collections.campaign_deliveries.doc(deliveryId).update({
        [`events.${eventType}`]: event,
        updatedAt: new Date()
      });

      // Update campaign statistics
      await this.updateCampaignStats(deliveryId, eventType);
    } catch (error) {
      logger.error('Error tracking delivery event:', error);
      // Don't throw error to avoid breaking delivery flow
    }
  }

  /**
   * Update campaign statistics
   */
  private async updateCampaignStats(
    deliveryId: string,
    eventType: TrackingEventType
  ): Promise<void> {
    try {
      // Get delivery record to find campaign
      const deliveryDoc = await collections.campaign_deliveries.doc(deliveryId).get();
      
      if (!deliveryDoc.exists) {
        return;
      }

      const delivery = deliveryDoc.data() as CampaignDelivery;
      const campaignId = delivery.campaignId;

      // Get current campaign stats
      const campaignDoc = await collections.email_campaigns.doc(campaignId).get();
      
      if (!campaignDoc.exists) {
        return;
      }

      const campaign = campaignDoc.data() as EmailCampaign;
      const stats = { ...campaign.deliveryStats };

      // Update stats based on event type
      switch (eventType) {
        case TrackingEventType.SENT:
          stats.sent++;
          break;
        case TrackingEventType.DELIVERED:
          stats.delivered++;
          break;
        case TrackingEventType.OPENED:
          stats.opened++;
          break;
        case TrackingEventType.CLICKED:
          stats.clicked++;
          break;
        case TrackingEventType.BOUNCED:
          stats.bounced++;
          break;
        case TrackingEventType.UNSUBSCRIBED:
          stats.unsubscribed++;
          break;
      }

      // Calculate rates
      if (stats.sent > 0) {
        stats.deliveryRate = (stats.delivered / stats.sent) * 100;
        stats.bounceRate = (stats.bounced / stats.sent) * 100;
      }

      if (stats.delivered > 0) {
        stats.openRate = (stats.opened / stats.delivered) * 100;
      }

      if (stats.opened > 0) {
        stats.clickRate = (stats.clicked / stats.opened) * 100;
      }

      if (stats.sent > 0) {
        stats.unsubscribeRate = (stats.unsubscribed / stats.sent) * 100;
      }

      // Update campaign
      await collections.email_campaigns.doc(campaignId).update({
        deliveryStats: stats,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating campaign stats:', error);
      // Don't throw error to avoid breaking delivery flow
    }
  }

  /**
   * Retry email delivery
   */
  private async retryEmailDelivery(
    emailRequest: SendEmailRequest,
    campaign: EmailCampaign,
    organizationId: string,
    maxRetries: number,
    retryDelay: number
  ): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.delay(retryDelay * attempt); // Exponential backoff

        const enhancedRequest = await this.enhanceEmailRequest(
          emailRequest,
          campaign,
          organizationId
        );

        const deliveryResult = await this.emailService.sendEmail(
          enhancedRequest.to,
          enhancedRequest.subject,
          {
            html: enhancedRequest.htmlContent,
            text: enhancedRequest.textContent
          }
        );

        await this.createDeliveryRecord(
          campaign,
          emailRequest,
          deliveryResult,
          organizationId
        );

        await this.trackDeliveryEvent(
          deliveryResult.messageId || generateId(),
          TrackingEventType.SENT,
          { retry: attempt }
        );

        logger.info(`Email retry successful for ${emailRequest.to} on attempt ${attempt}`);
        return { success: true };
      } catch (error) {
        logger.warn(`Email retry ${attempt}/${maxRetries} failed for ${emailRequest.to}:`, error);
        
        if (attempt === maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * Handle webhook delivery status updates
   */
  async handleDeliveryWebhook(
    deliveryId: string,
    eventType: TrackingEventType,
    webhookData: any
  ): Promise<void> {
    try {
      // Update delivery status
      const updateData: any = {
        updatedAt: new Date()
      };

      switch (eventType) {
        case TrackingEventType.DELIVERED:
          updateData.status = CampaignDeliveryStatus.DELIVERED;
          updateData.deliveredAt = new Date();
          break;
        case TrackingEventType.BOUNCED:
          updateData.status = CampaignDeliveryStatus.BOUNCED;
          updateData.bouncedAt = new Date();
          updateData.bounceReason = webhookData.reason;
          break;
        case TrackingEventType.OPENED:
          updateData.status = CampaignDeliveryStatus.OPENED;
          updateData.openedAt = new Date();
          break;
        case TrackingEventType.CLICKED:
          updateData.status = CampaignDeliveryStatus.CLICKED;
          updateData.clickedAt = new Date();
          break;
      }

      await collections.campaign_deliveries.doc(deliveryId).update(updateData);

      // Track the event
      await this.trackDeliveryEvent(deliveryId, eventType, webhookData);

      logger.info(`Delivery webhook processed: ${deliveryId} - ${eventType}`);
    } catch (error) {
      logger.error('Error handling delivery webhook:', error);
      throw createError(
        'Failed to handle delivery webhook',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { deliveryId, eventType, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get campaign delivery status
   */
  async getCampaignDeliveryStatus(campaignId: string, organizationId: string): Promise<any> {
    try {
      const deliveriesSnapshot = await collections.campaign_deliveries
        .where('campaignId', '==', campaignId)
        .get();

      const stats = {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        unsubscribed: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        engagementScore: 0
      };

      deliveriesSnapshot.docs.forEach(doc => {
        const delivery = doc.data();
        stats.totalRecipients++;
        
        switch (delivery.status) {
          case EmailDeliveryStatusType.SENT:
            stats.sent++;
            break;
          case EmailDeliveryStatusType.DELIVERED:
            stats.delivered++;
            break;
          case EmailDeliveryStatusType.OPENED:
            stats.opened++;
            break;
          case EmailDeliveryStatusType.CLICKED:
            stats.clicked++;
            break;
          case EmailDeliveryStatusType.BOUNCED:
            stats.bounced++;
            break;
          case EmailDeliveryStatusType.FAILED:
            stats.failed++;
            break;
          case EmailDeliveryStatusType.UNSUBSCRIBED:
            stats.unsubscribed++;
            break;
        }
      });

      // Calculate rates
      if (stats.sent > 0) {
        stats.deliveryRate = (stats.delivered / stats.sent) * 100;
        stats.bounceRate = (stats.bounced / stats.sent) * 100;
        stats.unsubscribeRate = (stats.unsubscribed / stats.sent) * 100;
      }

      if (stats.delivered > 0) {
        stats.openRate = (stats.opened / stats.delivered) * 100;
      }

      if (stats.opened > 0) {
        stats.clickRate = (stats.clicked / stats.opened) * 100;
      }

      // Calculate engagement score
      stats.engagementScore = (stats.openRate * 0.4) + (stats.clickRate * 0.6);

      return stats;
    } catch (error) {
      logger.error('Error getting campaign delivery status:', error);
      throw createError(
        'Failed to get campaign delivery status',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(
    campaignId: string, 
    organizationId: string, 
    maxRetries: number = 3
  ): Promise<{ retriedCount: number; errors: string[] }> {
    try {
      const failedDeliveriesSnapshot = await collections.campaign_deliveries
        .where('campaignId', '==', campaignId)
        .where('status', '==', EmailDeliveryStatusType.FAILED)
        .limit(100) // Limit retries to prevent overload
        .get();

      let retriedCount = 0;
      const errors: string[] = [];

      for (const doc of failedDeliveriesSnapshot.docs) {
        try {
          const delivery = doc.data();
          
          // Check retry count
          if ((delivery.retryCount || 0) >= maxRetries) {
            continue;
          }

          // Retry the delivery
          await this.retryEmailDelivery(
            delivery.originalEmailRequest,
            delivery.campaign,
            delivery.organizationId,
            3, // maxRetries
            this.DEFAULT_RETRY_DELAY
          );

          retriedCount++;
        } catch (error) {
          errors.push(`Failed to retry delivery ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return { retriedCount, errors };
    } catch (error) {
      logger.error('Error retrying failed deliveries:', error);
      throw createError(
        'Failed to retry failed deliveries',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  }

  /**
   * Get email providers status
   */
  async getEmailProvidersStatus(): Promise<Array<{
    provider: string;
    status: 'active' | 'inactive' | 'error';
    lastChecked: Date;
    rateLimits?: {
      current: number;
      limit: number;
      resetTime: Date;
    };
  }>> {
    try {
      // This would typically check the actual provider status
      // For now, return mock data
      return [
        {
          provider: 'sendgrid',
          status: 'active',
          lastChecked: new Date(),
          rateLimits: {
            current: 150,
            limit: 1000,
            resetTime: new Date(Date.now() + 3600000) // 1 hour from now
          }
        },
        {
          provider: 'ses',
          status: 'active',
          lastChecked: new Date(),
          rateLimits: {
            current: 50,
            limit: 200,
            resetTime: new Date(Date.now() + 3600000)
          }
        }
      ];
    } catch (error) {
      logger.error('Error getting email providers status:', error);
      throw createError(
        'Failed to get email providers status',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(options: {
    organizationId: string;
    userId: string;
    testEmail: string;
    campaignId?: string;
    templateId?: string;
    subject?: string;
    content?: {
      htmlContent?: string;
      textContent?: string;
    };
    preferredProvider?: string;
  }): Promise<{ messageId: string; provider: string }> {
    try {
      const emailRequest: SendEmailRequest = {
        to: options.testEmail,
        subject: options.subject || 'Test Email',
        htmlContent: options.content?.htmlContent || '<p>This is a test email.</p>',
        textContent: options.content?.textContent || 'This is a test email.',
        templateId: options.templateId,
        templateData: {
          user: {
            firstName: 'Test',
            lastName: 'User',
            email: options.testEmail
          },
          organization: {
            name: 'Test Organization'
          }
        },
        metadata: {
          userId: options.userId,
          trackingId: `test_${Date.now()}`,
          priority: 1,
          timestamp: new Date(),
          campaignId: options.campaignId,
          organizationId: options.organizationId
          // isTest: true // Removed as not part of metadata interface
        }
      };

      const result = await this.emailService.sendEmail(
        emailRequest.to,
        emailRequest.subject,
        {
          html: emailRequest.htmlContent,
          text: emailRequest.textContent
        }
      );
      
      return {
        messageId: result.messageId,
        provider: result.providerId || 'default'
      };
    } catch (error) {
      logger.error('Error sending test email:', error);
      throw createError(
        'Failed to send test email',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(
    campaignId: string,
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'hour' | 'day' | 'week';
      includeDetails?: boolean;
    }
  ): Promise<any> {
    try {
      let query = collections.campaign_deliveries
        .where('campaignId', '==', campaignId);

      if (options.startDate) {
        query = query.where('createdAt', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('createdAt', '<=', options.endDate);
      }

      const snapshot = await query.get();
      const deliveries = snapshot.docs.map(doc => doc.data());

      // Group by time period
      const groupedData: Record<string, any> = {};
      
      deliveries.forEach(delivery => {
        const date = delivery.createdAt.toDate();
        let key: string;
        
        switch (options.groupBy) {
          case 'hour':
            key = date.toISOString().substring(0, 13);
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().substring(0, 10);
            break;
          case 'day':
          default:
            key = date.toISOString().substring(0, 10);
            break;
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            date: key,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0
          };
        }

        switch (delivery.status) {
          case EmailDeliveryStatusType.SENT:
            groupedData[key].sent++;
            break;
          case EmailDeliveryStatusType.DELIVERED:
            groupedData[key].delivered++;
            break;
          case EmailDeliveryStatusType.OPENED:
            groupedData[key].opened++;
            break;
          case EmailDeliveryStatusType.CLICKED:
            groupedData[key].clicked++;
            break;
          case EmailDeliveryStatusType.BOUNCED:
            groupedData[key].bounced++;
            break;
          case EmailDeliveryStatusType.FAILED:
            groupedData[key].failed++;
            break;
        }
      });

      const analytics = Object.values(groupedData).sort((a: any, b: any) => 
        a.date.localeCompare(b.date)
      );

      return {
        analytics,
        summary: await this.getCampaignDeliveryStatus(campaignId, organizationId),
        includeDetails: options.includeDetails
      };
    } catch (error) {
      logger.error('Error getting delivery analytics:', error);
      throw createError(
        'Failed to get delivery analytics',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED
      );
    }
  }

  /**
   * Get delivery statistics for campaign
   */
  async getCampaignDeliveryStats(campaignId: string): Promise<any> {
    try {
      const deliveriesSnapshot = await collections.campaign_deliveries
        .where('campaignId', '==', campaignId)
        .get();

      const stats = {
        total: deliveriesSnapshot.size,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0
      };

      deliveriesSnapshot.docs.forEach(doc => {
        const delivery = doc.data() as CampaignDelivery;
        
        switch (delivery.status) {
          case EmailDeliveryStatusType.SENT:
            stats.sent++;
            break;
          case EmailDeliveryStatusType.DELIVERED:
            stats.delivered++;
            break;
          case EmailDeliveryStatusType.OPENED:
            stats.opened++;
            break;
          case EmailDeliveryStatusType.CLICKED:
            stats.clicked++;
            break;
          case EmailDeliveryStatusType.BOUNCED:
            stats.bounced++;
            break;
          case EmailDeliveryStatusType.FAILED:
            stats.failed++;
            break;
        }
      });

      return stats;
    } catch (error) {
      logger.error('Error getting campaign delivery stats:', error);
      throw createError(
        'Failed to get delivery stats',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const campaignDeliveryService = new CampaignDeliveryService();