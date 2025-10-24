// Campaign Services Domain
// Centralized exports for all campaign-related services

export { EmailCampaignService, emailCampaignService } from './email-campaign.service';
export { CampaignDeliveryService, campaignDeliveryService } from './campaign-delivery.service';
export { CampaignAnalyticsService, campaignAnalyticsService } from './campaign-analytics.service';
export { CampaignQueueService, campaignQueueService } from './campaign-queue.service';
export { CampaignRecipientService, campaignRecipientService } from './campaign-recipient.service';
export { CampaignTemplateService, campaignTemplateService } from './campaign-template.service';
export { CampaignTrackingService, campaignTrackingService } from './campaign-tracking.service';
export { RecipientListManagementService, recipientListManagementService } from './recipient-list-management.service';

// Re-export types if needed
export type {
  EmailCampaign,
  CampaignStatus,
  CampaignType,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignDeliveryStats,
  CampaignRecipientList,
  EmailRecipient
} from '../../common/types';