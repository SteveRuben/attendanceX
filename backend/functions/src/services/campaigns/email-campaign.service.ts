import { collections, generateId } from '../../config';
import { logger } from 'firebase-functions';
import { createError } from '../../middleware/errorHandler';
import { CampaignDeliveryStats, CampaignStatus, CampaignType, CreateCampaignRequest, EmailCampaign, EmailCampaignErrorCodes, UpdateCampaignRequest } from '../../common/types';

export class EmailCampaignService {
  
  /**
   * Create a new email campaign
   */
  async createCampaign(
    organizationId: string, 
    userId: string, 
    request: CreateCampaignRequest
  ): Promise<EmailCampaign> {
    try {
      const campaignId = generateId('camp_');
      
      // Initialize delivery stats
      const deliveryStats: CampaignDeliveryStats = {
        totalRecipients: 0,
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
        unsubscribeRate: 0,
        engagementScore: 0
      };

      const campaign: EmailCampaign = {
        id: campaignId,
        organizationId,
        name: request.name,
        type: request.type,
        subject: request.subject,
        templateId: request.templateId,
        content: request.content,
        recipients: {
          id: generateId('recip_'),
          name: `${request.name} Recipients`,
          criteria: request.recipientCriteria,
          recipients: [], // Will be populated when campaign is prepared for sending
          totalCount: 0,
          lastUpdated: new Date()
        },
        scheduledAt: request.scheduledAt,
        status: CampaignStatus.DRAFT,
        createdBy: userId,
        deliveryStats,
        tags: request.tags || [],
        notes: request.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await collections.email_campaigns.doc(campaignId).set(campaign);
      
      logger.info(`Campaign created: ${campaignId} for organization: ${organizationId}`);
      
      return campaign;
    } catch (error) {
      logger.error('Error creating campaign:', error);
      throw createError(
        'Failed to create campaign',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string, organizationId: string): Promise<EmailCampaign | null> {
    try {
      const doc = await collections.email_campaigns.doc(campaignId).get();
      
      if (!doc.exists) {
        return null;
      }

      const campaign = doc.data() as EmailCampaign;
      
      // Verify organization access
      if (campaign.organizationId !== organizationId) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      return campaign;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Campaign not found')) {
        throw error;
      }
      
      logger.error('Error getting campaign:', error);
      throw createError(
        'Failed to get campaign',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get campaigns for organization with filters
   */
  async getCampaigns(
    organizationId: string,
    filters?: {
      status?: CampaignStatus;
      type?: CampaignType;
      createdBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ campaigns: EmailCampaign[]; total: number }> {
    try {
      let query = collections.email_campaigns
        .where('organizationId', '==', organizationId)
        .orderBy('createdAt', 'desc');

      // Apply filters
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters?.type) {
        query = query.where('type', '==', filters.type);
      }
      
      if (filters?.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }

      // Apply pagination
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const campaigns = snapshot.docs.map(doc => doc.data() as EmailCampaign);

      // Get total count (without pagination)
      const countQuery = collections.email_campaigns
        .where('organizationId', '==', organizationId);
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return { campaigns, total };
    } catch (error) {
      logger.error('Error getting campaigns:', error);
      throw createError(
        'Failed to get campaigns',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    organizationId: string,
    userId: string,
    request: UpdateCampaignRequest
  ): Promise<EmailCampaign> {
    try {
      const campaign = await this.getCampaignById(campaignId, organizationId);
      
      if (!campaign) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Check if campaign can be updated
      if (campaign.status === CampaignStatus.SENDING || campaign.status === CampaignStatus.SENT) {
        throw createError(
          'Cannot update campaign that is being sent or has been sent',
          400,
          EmailCampaignErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      const updateData: Partial<EmailCampaign> = {
        ...request,
        lastModifiedBy: userId,
        updatedAt: new Date()
      };

      // Update recipient criteria if provided
      if (request.recipientCriteria) {
        updateData.recipients = {
          ...campaign.recipients,
          criteria: request.recipientCriteria,
          lastUpdated: new Date()
        };
      }

      await collections.email_campaigns.doc(campaignId).update(updateData);
      
      // Get updated campaign
      const updatedCampaign = await this.getCampaignById(campaignId, organizationId);
      
      logger.info(`Campaign updated: ${campaignId} by user: ${userId}`);
      
      return updatedCampaign!;
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Campaign not found') ||
        error.message.includes('Cannot update campaign')
      )) {
        throw error;
      }
      
      logger.error('Error updating campaign:', error);
      throw createError(
        'Failed to update campaign',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string, organizationId: string): Promise<void> {
    try {
      const campaign = await this.getCampaignById(campaignId, organizationId);
      
      if (!campaign) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Check if campaign can be deleted
      if (campaign.status === CampaignStatus.SENDING) {
        throw createError(
          'Cannot delete campaign that is currently being sent',
          400,
          EmailCampaignErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      await collections.email_campaigns.doc(campaignId).delete();
      
      logger.info(`Campaign deleted: ${campaignId}`);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Campaign not found') ||
        error.message.includes('Cannot delete campaign')
      )) {
        throw error;
      }
      
      logger.error('Error deleting campaign:', error);
      throw createError(
        'Failed to delete campaign',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    campaignId: string,
    organizationId: string,
    newStatus: CampaignStatus,
    userId?: string
  ): Promise<void> {
    try {
      const campaign = await this.getCampaignById(campaignId, organizationId);
      
      if (!campaign) {
        throw createError(
          'Campaign not found',
          404,
          EmailCampaignErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Validate status transition
      if (!this.isValidStatusTransition(campaign.status, newStatus)) {
        throw createError(
          `Invalid status transition from ${campaign.status} to ${newStatus}`,
          400,
          EmailCampaignErrorCodes.INVALID_STATUS_TRANSITION
        );
      }

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (userId) {
        updateData.lastModifiedBy = userId;
      }

      await collections.email_campaigns.doc(campaignId).update(updateData);
      
      logger.info(`Campaign status updated: ${campaignId} -> ${newStatus}`);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Campaign not found') ||
        error.message.includes('Invalid status transition')
      )) {
        throw error;
      }
      
      logger.error('Error updating campaign status:', error);
      throw createError(
        'Failed to update campaign status',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, newStatus, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update campaign delivery stats
   */
  async updateDeliveryStats(
    campaignId: string,
    stats: Partial<CampaignDeliveryStats>
  ): Promise<void> {
    try {
      const updateData: any = {
        'deliveryStats': stats,
        updatedAt: new Date()
      };

      await collections.email_campaigns.doc(campaignId).update(updateData);
      
      logger.debug(`Campaign delivery stats updated: ${campaignId}`);
    } catch (error) {
      logger.error('Error updating campaign delivery stats:', error);
      throw createError(
        'Failed to update delivery stats',
        500,
        EmailCampaignErrorCodes.DELIVERY_FAILED,
        { campaignId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: CampaignStatus, newStatus: CampaignStatus): boolean {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [
        CampaignStatus.SCHEDULED,
        CampaignStatus.SENDING,
        CampaignStatus.CANCELLED
      ],
      [CampaignStatus.SCHEDULED]: [
        CampaignStatus.SENDING,
        CampaignStatus.CANCELLED,
        CampaignStatus.DRAFT
      ],
      [CampaignStatus.SENDING]: [
        CampaignStatus.SENT,
        CampaignStatus.PAUSED,
        CampaignStatus.FAILED,
        CampaignStatus.CANCELLED
      ],
      [CampaignStatus.PAUSED]: [
        CampaignStatus.SENDING,
        CampaignStatus.CANCELLED
      ],
      [CampaignStatus.SENT]: [], // Final state
      [CampaignStatus.CANCELLED]: [], // Final state
      [CampaignStatus.FAILED]: [
        CampaignStatus.DRAFT,
        CampaignStatus.SCHEDULED
      ]
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

export const emailCampaignService = new EmailCampaignService();