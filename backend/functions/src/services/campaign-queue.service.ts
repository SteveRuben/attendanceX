import { 
  CampaignDeliveryQueue,
  CampaignBatch,
  EmailCampaign,
  CampaignStatus,
  SendEmailRequest,
  EmailCampaignErrorCodes
} from '@attendance-x/shared';
import { collections, generateId } from '../config/database';
import { logger } from 'firebase-functions';
import { createError } from '../middleware/errorHandler';
import { emailCampaignService } from './email-campaign.service';
import { campaignRecipientService } from './campaign-recipient.service';

export interface ScheduleCampaignRequest {
  campaignId: string;
  scheduledAt?: Date;
  priority?: number;
  batchSize?: number;
}

export interface QueueProcessingOptions {
  maxConcurrentBatches?: number;
  respectRateLimits?: boolean;
  preferredProvider?: string;
}

export class CampaignQueueService {

  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_PRIORITY = 5;
  private readonly MAX_PRIORITY = 10;

  /**
   * Schedule campaign for delivery
   */
  async scheduleCampaign(
    organizationId: string,
    request: ScheduleCampaignRequest,
    options: QueueProcessingOptions = {}
  ): Promise<CampaignDeliveryQueue> {
    try {
      // Get campaign
      const campaign = await emailCampaignService.getCampaignById(request.campaignId, organizationId);
      
      if (!campaign) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Validate campaign can be scheduled
      if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
        throw createError(
          'Campaign cannot be scheduled in current status',
          400,
          EmailCampaignErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      // Build recipient list if not already built
      let recipients = campaign.recipients.recipients;
      if (recipients.length === 0) {
        const recipientList = await campaignRecipientService.buildRecipientList(
          organizationId,
          campaign.recipients.criteria,
          campaign.recipients.name
        );
        recipients = recipientList.recipients;

        // Update campaign with recipient count
        await emailCampaignService.updateDeliveryStats(campaign.id, {
          totalRecipients: recipients.length,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          failed: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0
        });
      }

      if (recipients.length === 0) {
        throw createError(
          'Campaign has no recipients',
          400,
          EmailCampaignErrorCodes.RECIPIENT_LIST_EMPTY
        );
      }

      // Create delivery queue
      const batchSize = request.batchSize || this.DEFAULT_BATCH_SIZE;
      const batches = this.createBatches(recipients, batchSize, campaign);

      const deliveryQueue: CampaignDeliveryQueue = {
        campaignId: request.campaignId,
        organizationId,
        priority: Math.min(request.priority || this.DEFAULT_PRIORITY, this.MAX_PRIORITY),
        scheduledAt: request.scheduledAt || new Date(),
        batchSize,
        providerConfig: {
          preferredProvider: options.preferredProvider,
          respectRateLimits: options.respectRateLimits !== false
        },
        batches,
        currentBatchIndex: 0,
        totalRecipients: recipients.length,
        status: 'pending'
      };

      // Save queue to database
      const queueId = generateId('queue_');
      await collections.campaign_delivery_queues.doc(queueId).set({
        ...deliveryQueue,
        id: queueId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update campaign status
      const newStatus = request.scheduledAt && request.scheduledAt > new Date() 
        ? CampaignStatus.SCHEDULED 
        : CampaignStatus.SENDING;
        
      await emailCampaignService.updateCampaignStatus(
        request.campaignId,
        organizationId,
        newStatus
      );

      logger.info(`Campaign scheduled: ${request.campaignId} with ${batches.length} batches`);

      return { ...deliveryQueue, id: queueId };
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Campaign not found') ||
        error.message.includes('Campaign cannot be scheduled') ||
        error.message.includes('Campaign has no recipients')
      )) {
        throw error;
      }
      
      logger.error('Error scheduling campaign:', error);
      throw createError(
        'Failed to schedule campaign',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId: request.campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get pending queues for processing
   */
  async getPendingQueues(
    limit: number = 10,
    organizationId?: string
  ): Promise<CampaignDeliveryQueue[]> {
    try {
      let query = collections.campaign_delivery_queues
        .where('status', '==', 'pending')
        .where('scheduledAt', '<=', new Date())
        .orderBy('scheduledAt', 'asc')
        .orderBy('priority', 'desc')
        .limit(limit);

      if (organizationId) {
        query = query.where('organizationId', '==', organizationId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CampaignDeliveryQueue));
    } catch (error) {
      logger.error('Error getting pending queues:', error);
      throw createError(
        'Failed to get pending queues',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Process next batch in queue
   */
  async processNextBatch(queueId: string): Promise<{ processed: boolean; batchId?: string }> {
    try {
      const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
      
      if (!queueDoc.exists) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const queue = { ...queueDoc.data(), id: queueId } as CampaignDeliveryQueue;

      // Check if queue is in processing state
      if (queue.status !== 'pending' && queue.status !== 'processing') {
        return { processed: false };
      }

      // Check if all batches are processed
      if (queue.currentBatchIndex >= queue.batches.length) {
        await this.completeQueue(queueId);
        return { processed: false };
      }

      // Get current batch
      const currentBatch = queue.batches[queue.currentBatchIndex];
      
      if (currentBatch.status !== 'pending') {
        // Move to next batch
        await this.moveToNextBatch(queueId);
        return { processed: false };
      }

      // Update queue status to processing
      if (queue.status === 'pending') {
        await collections.campaign_delivery_queues.doc(queueId).update({
          status: 'processing',
          updatedAt: new Date()
        });
      }

      // Process current batch
      await this.processBatch(queueId, currentBatch);

      return { processed: true, batchId: currentBatch.batchId };
    } catch (error) {
      logger.error('Error processing next batch:', error);
      
      // Mark queue as failed
      await collections.campaign_delivery_queues.doc(queueId).update({
        status: 'failed',
        updatedAt: new Date()
      }).catch(() => {}); // Ignore update errors

      throw createError(
        'Failed to process batch',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Pause campaign queue
   */
  async pauseQueue(queueId: string, organizationId: string): Promise<void> {
    try {
      const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
      
      if (!queueDoc.exists) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const queue = queueDoc.data() as CampaignDeliveryQueue;
      
      if (queue.organizationId !== organizationId) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      await collections.campaign_delivery_queues.doc(queueId).update({
        status: 'paused',
        updatedAt: new Date()
      });

      // Update campaign status
      await emailCampaignService.updateCampaignStatus(
        queue.campaignId,
        organizationId,
        CampaignStatus.PAUSED
      );

      logger.info(`Campaign queue paused: ${queueId}`);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Queue not found') ||
        error.message.includes('Permission denied')
      )) {
        throw error;
      }
      
      logger.error('Error pausing queue:', error);
      throw createError(
        'Failed to pause queue',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Resume campaign queue
   */
  async resumeQueue(queueId: string, organizationId: string): Promise<void> {
    try {
      const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
      
      if (!queueDoc.exists) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const queue = queueDoc.data() as CampaignDeliveryQueue;
      
      if (queue.organizationId !== organizationId) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      if (queue.status !== 'paused') {
        throw createError(
          'Queue is not paused',
          400,
          EmailCampaignErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      await collections.campaign_delivery_queues.doc(queueId).update({
        status: 'pending',
        updatedAt: new Date()
      });

      // Update campaign status
      await emailCampaignService.updateCampaignStatus(
        queue.campaignId,
        organizationId,
        CampaignStatus.SENDING
      );

      logger.info(`Campaign queue resumed: ${queueId}`);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Queue not found') ||
        error.message.includes('Queue is not paused')
      )) {
        throw error;
      }
      
      logger.error('Error resuming queue:', error);
      throw createError(
        'Failed to resume queue',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Cancel campaign queue
   */
  async cancelQueue(queueId: string, organizationId: string): Promise<void> {
    try {
      const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
      
      if (!queueDoc.exists) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.DELIVERY_FAILED
        );
      }

      const queue = queueDoc.data() as CampaignDeliveryQueue;
      
      if (queue.organizationId !== organizationId) {
        throw createError(
          'Queue not found',
          404,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      await collections.campaign_delivery_queues.doc(queueId).update({
        status: 'cancelled',
        updatedAt: new Date()
      });

      // Update campaign status
      await emailCampaignService.updateCampaignStatus(
        queue.campaignId,
        organizationId,
        CampaignStatus.CANCELLED
      );

      logger.info(`Campaign queue cancelled: ${queueId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Queue not found')) {
        throw error;
      }
      
      logger.error('Error cancelling queue:', error);
      throw createError(
        'Failed to cancel queue',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { queueId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create batches from recipients
   */
  private createBatches(
    recipients: any[],
    batchSize: number,
    campaign: EmailCampaign
  ): CampaignBatch[] {
    const batches: CampaignBatch[] = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batchRecipients = recipients.slice(i, i + batchSize);
      
      const batch: CampaignBatch = {
        batchId: generateId('batch_'),
        recipients: batchRecipients.map(r => r.email),
        emailRequests: this.createEmailRequests(batchRecipients, campaign),
        status: 'pending',
        errors: []
      };
      
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Create email requests for batch
   */
  private createEmailRequests(recipients: any[], campaign: EmailCampaign): SendEmailRequest[] {
    return recipients.map(recipient => ({
      to: recipient.email,
      subject: this.personalizeContent(campaign.subject, recipient),
      htmlContent: campaign.content.htmlContent 
        ? this.personalizeContent(campaign.content.htmlContent, recipient)
        : undefined,
      textContent: campaign.content.textContent
        ? this.personalizeContent(campaign.content.textContent, recipient)
        : undefined,
      templateId: campaign.templateId,
      templateData: {
        ...campaign.content.templateData,
        ...recipient.personalizations
      },
      attachments: campaign.content.attachments,
      metadata: {
        userId: recipient.userId || 'anonymous',
        trackingId: generateId(),
        priority: 5,
        timestamp: new Date(),
        campaignId: campaign.id,
        campaignType: campaign.type,
        recipientId: recipient.userId,
        organizationId: campaign.organizationId
      }
    }));
  }

  /**
   * Personalize content with recipient data
   */
  private personalizeContent(content: string, recipient: any): string {
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

  /**
   * Process a single batch
   */
  private async processBatch(queueId: string, batch: CampaignBatch): Promise<void> {
    try {
      // Update batch status
      await this.updateBatchStatus(queueId, batch.batchId, 'processing');

      // Here we would integrate with the existing EmailService
      // For now, we'll simulate the processing
      logger.info(`Processing batch ${batch.batchId} with ${batch.recipients.length} recipients`);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update batch as completed
      await this.updateBatchStatus(queueId, batch.batchId, 'completed', new Date());

      // Move to next batch
      await this.moveToNextBatch(queueId);
    } catch (error) {
      logger.error(`Error processing batch ${batch.batchId}:`, error);
      
      // Update batch as failed
      await this.updateBatchStatus(
        queueId, 
        batch.batchId, 
        'failed', 
        new Date(),
        [error instanceof Error ? error.message : 'Unknown error']
      );
      
      throw error;
    }
  }

  /**
   * Update batch status
   */
  private async updateBatchStatus(
    queueId: string,
    batchId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    processedAt?: Date,
    errors?: string[]
  ): Promise<void> {
    const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
    const queue = queueDoc.data() as CampaignDeliveryQueue;

    const updatedBatches = queue.batches.map(batch => {
      if (batch.batchId === batchId) {
        return {
          ...batch,
          status,
          processedAt,
          errors: errors || batch.errors
        };
      }
      return batch;
    });

    await collections.campaign_delivery_queues.doc(queueId).update({
      batches: updatedBatches,
      updatedAt: new Date()
    });
  }

  /**
   * Move to next batch
   */
  private async moveToNextBatch(queueId: string): Promise<void> {
    const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
    const queue = queueDoc.data() as CampaignDeliveryQueue;

    const nextBatchIndex = queue.currentBatchIndex + 1;

    await collections.campaign_delivery_queues.doc(queueId).update({
      currentBatchIndex: nextBatchIndex,
      updatedAt: new Date()
    });

    // Check if all batches are completed
    if (nextBatchIndex >= queue.batches.length) {
      await this.completeQueue(queueId);
    }
  }

  /**
   * Get queue status for a specific campaign
   */
  async getQueueStatus(campaignId: string, organizationId: string): Promise<{
    status: string;
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    progress: number;
  }> {
    try {
      const queueSnapshot = await collections.campaign_delivery_queues
        .where('campaignId', '==', campaignId)
        .where('organizationId', '==', organizationId)
        .get();

      if (queueSnapshot.empty) {
        return {
          status: 'not_found',
          totalBatches: 0,
          completedBatches: 0,
          failedBatches: 0,
          progress: 0
        };
      }

      const queue = queueSnapshot.docs[0].data() as CampaignDeliveryQueue;
      const totalBatches = queue.batches.length;
      const completedBatches = queue.batches.filter(b => b.status === 'completed').length;
      const failedBatches = queue.batches.filter(b => b.status === 'failed').length;
      const progress = totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;

      return {
        status: queue.status,
        totalBatches,
        completedBatches,
        failedBatches,
        progress
      };
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw new Error('Failed to get queue status');
    }
  }

  /**
   * Complete queue processing
   */
  private async completeQueue(queueId: string): Promise<void> {
    await collections.campaign_delivery_queues.doc(queueId).update({
      status: 'completed',
      updatedAt: new Date()
    });

    // Update campaign status
    const queueDoc = await collections.campaign_delivery_queues.doc(queueId).get();
    const queue = queueDoc.data() as CampaignDeliveryQueue;

    await emailCampaignService.updateCampaignStatus(
      queue.campaignId,
      queue.organizationId,
      CampaignStatus.SENT
    );

    logger.info(`Campaign queue completed: ${queueId}`);
  }
}

export const campaignQueueService = new CampaignQueueService();