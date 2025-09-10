import type { BaseEntity } from './common.types';
import { type EmailTemplate, EmailTemplateCategory, type SendEmailRequest, type EmailDeliveryStatus, EmailDeliveryStatusType, type EmailAttachment } from './email.types';
import type { GeoLocation } from './presence.types';
import { UserRole } from './role.types';

// ==========================================
// Campaign Core Types
// ==========================================

export enum CampaignType {
  ORGANIZATION_ANNOUNCEMENT = 'organization_announcement',
  NEWSLETTER = 'newsletter',
  EVENT_REMINDER = 'event_reminder',
  HR_COMMUNICATION = 'hr_communication',
  ATTENDANCE_REMINDER = 'attendance_reminder',
  CUSTOM = 'custom'
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface CampaignContent {
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
}

/* export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  size: number;
} */

export interface CampaignDeliveryStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  failed: number;
  
  // Calculated rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  engagementScore: number;
}

export interface EmailCampaign extends BaseEntity {
  organizationId: string;
  name: string;
  type: CampaignType;
  subject: string;
  templateId?: string;
  content: CampaignContent;
  recipients: CampaignRecipientList;
  scheduledAt?: Date;
  status: CampaignStatus;
  createdBy: string;
  deliveryStats: CampaignDeliveryStats;
  
  // Integration with existing email system
  emailRequests?: SendEmailRequest[];
  providerConfig?: {
    preferredProvider?: string;
    fallbackProviders?: string[];
  };
  
  // Metadata
  tags?: string[];
  notes?: string;
  lastModifiedBy?: string;
}

// ==========================================
// Recipient Management Types
// ==========================================

export interface CampaignRecipientList {
  id: string;
  name: string;
  criteria: RecipientCriteria;
  recipients: EmailRecipient[];
  totalCount: number;
  lastUpdated: Date;
}

export interface RecipientCriteria {
  teams?: string[];
  roles?: UserRole[];
  departments?: string[];
  eventParticipants?: string[];
  customFilters?: CustomFilter[];
  excludeUnsubscribed: boolean;
  includeInactive?: boolean;
}

export interface CustomFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  value: any;
}

export interface EmailRecipient {
  userId?: string; // Link to Attendance-X user
  email: string;
  firstName: string;
  lastName: string;
  personalizations: Record<string, any>;
  unsubscribed: boolean;
  bounced: boolean;
  lastEngagement?: Date;
}

// ==========================================
// Template Extension Types
// ==========================================

export interface CampaignTemplate extends EmailTemplate {
  // Campaign-specific extensions
  campaignType: CampaignType;
  organizationId?: string; // null for system templates
  isSystemTemplate: boolean;
  isPublicTemplate: boolean;
  
  // Enhanced template features
  previewImages?: string[];
  designMetadata?: {
    colorScheme: string;
    fontFamily: string;
    layout: 'single-column' | 'two-column' | 'newsletter';
    responsive: boolean;
  };
  
  // Campaign-specific variables
  campaignVariables: CampaignVariable[];
  
  // Usage analytics
  campaignUsage: {
    timesUsed: number;
    lastUsedInCampaign?: string;
    avgDeliveryRate?: number;
    avgOpenRate?: number;
    avgClickRate?: number;
  };
}

export interface CampaignVariable {
  name: string;
  type: 'text' | 'image' | 'url' | 'date' | 'user_data' | 'organization_data';
  source?: 'user' | 'organization' | 'event' | 'custom';
  defaultValue?: string;
  required: boolean;
  description?: string;
}

export enum CampaignTemplateCategory {
  // Existing categories from shared types
  NEWSLETTER = EmailTemplateCategory.NEWSLETTER,
  EVENT_INVITATION = EmailTemplateCategory.EVENT_INVITATION,
  EVENT_REMINDER = EmailTemplateCategory.EVENT_REMINDER,
  
  // New campaign-specific categories
  ORGANIZATION_ANNOUNCEMENT = 'organization_announcement',
  HR_COMMUNICATION = 'hr_communication',
  ATTENDANCE_CAMPAIGN = 'attendance_campaign',
  MARKETING_CAMPAIGN = 'marketing_campaign'
}

// ==========================================
// Delivery and Tracking Types
// ==========================================

export interface CampaignDelivery extends EmailDeliveryStatus {
  // Campaign-specific extensions
  id?: string;
  campaignId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  personalizations: Record<string, any>;
  
  // Enhanced tracking
  trackingData: {
    pixelId: string;
    unsubscribeToken: string;
    clickTokens: Record<string, string>; // URL -> tracking token
  };
  
  // Campaign context
  campaignContext: {
    campaignName: string;
    campaignType: CampaignType;
    organizationId: string;
  };
}

export enum CampaignDeliveryStatus {
  // Use existing EmailDeliveryStatusType values
  QUEUED = EmailDeliveryStatusType.QUEUED,
  SENT = EmailDeliveryStatusType.SENT,
  DELIVERED = EmailDeliveryStatusType.DELIVERED,
  BOUNCED = EmailDeliveryStatusType.BOUNCED,
  OPENED = EmailDeliveryStatusType.OPENED,
  CLICKED = EmailDeliveryStatusType.CLICKED,
  UNSUBSCRIBED = EmailDeliveryStatusType.UNSUBSCRIBED,
  FAILED = EmailDeliveryStatusType.FAILED,
  
  // Campaign-specific statuses
  SCHEDULED = 'scheduled',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface CampaignDeliveryQueue {
  id?: string;
  campaignId: string;
  organizationId: string;
  priority: number;
  scheduledAt: Date;
  batchSize: number;
  
  providerConfig: {
    preferredProvider?: string;
    respectRateLimits: boolean;
  };
  
  batches: CampaignBatch[];
  currentBatchIndex: number;
  totalRecipients: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
}

export interface CampaignBatch {
  batchId: string;
  recipients: string[];
  emailRequests: SendEmailRequest[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  errors?: string[];
}

// ==========================================
// Analytics and Tracking Types
// ==========================================

export interface EmailTracking {
  deliveryId: string;
  trackingPixelId: string;
  events: TrackingEvent[];
  ipAddress?: string;
  userAgent?: string;
  location?: GeoLocation;
}

export interface TrackingEvent {
  type: TrackingEventType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum TrackingEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
  SPAM_COMPLAINT = 'spam_complaint'
}

/* export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
} */

export interface CampaignAnalytics {
  campaignId: string;
  organizationId: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  engagementScore: number;
  
  // Time-based analytics
  hourlyStats?: Record<string, number>;
  dailyStats?: Record<string, number>;
  
  // Device and client analytics
  deviceStats?: Record<string, number>;
  clientStats?: Record<string, number>;
  
  // Geographic analytics
  locationStats?: Record<string, number>;
}

// ==========================================
// Request/Response Types
// ==========================================

export interface CreateCampaignRequest {
  name: string;
  type: CampaignType;
  subject: string;
  templateId?: string;
  content: CampaignContent;
  recipientCriteria: RecipientCriteria;
  scheduledAt?: Date;
  tags?: string[];
  notes?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  subject?: string;
  content?: CampaignContent;
  recipientCriteria?: RecipientCriteria;
  scheduledAt?: Date;
  tags?: string[];
  notes?: string;
}

export interface SendCampaignRequest {
  campaignId: string;
  sendImmediately?: boolean;
  testRecipients?: string[]; // For test sends
}

export interface CampaignPreviewRequest {
  templateId?: string;
  content: CampaignContent;
  sampleRecipient?: EmailRecipient;
}

export interface RecipientPreviewRequest {
  criteria: RecipientCriteria;
  limit?: number;
  offset?: number;
}

// ==========================================
// Unsubscribe Management
// ==========================================

export interface EmailUnsubscribe {
  id: string;
  organizationId: string;
  email: string;
  userId?: string;
  reason?: string;
  unsubscribedAt: Date;
  campaignId?: string; // Campaign that triggered unsubscribe
  ipAddress?: string;
  userAgent?: string;
}

export interface UnsubscribeRequest {
  token: string;
  reason?: string;
}

// Template management request types
export interface CreateCampaignTemplateRequest {
  name: string;
  description?: string;
  category: CampaignTemplateCategory;
  campaignType: CampaignType;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: CampaignVariable[];
  isPublicTemplate?: boolean;
  designMetadata?: {
    colorScheme?: string;
    fontFamily?: string;
    layout?: 'single-column' | 'two-column' | 'newsletter';
    responsive?: boolean;
  };
}

export interface UpdateCampaignTemplateRequest {
  name?: string;
  description?: string;
  category?: CampaignTemplateCategory;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: CampaignVariable[];
  isPublicTemplate?: boolean;
  designMetadata?: {
    colorScheme?: string;
    fontFamily?: string;
    layout?: 'single-column' | 'two-column' | 'newsletter';
    responsive?: boolean;
  };
}

export interface TemplatePreviewRequest {
  templateData?: Record<string, any>;
  sampleRecipient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    [key: string]: any;
  };
}

export interface TemplateShareRequest {
  shareLevel: 'organization' | 'public' | 'private';
  permissions?: {
    canEdit?: boolean;
    canDuplicate?: boolean;
  };
}

export interface TemplateDuplicationRequest {
  name: string;
  description?: string;
}

export interface TemplateUsageStats {
  templateId: string;
  timesUsed: number;
  lastUsedInCampaign?: string;
  lastUsedAt?: Date;
  avgDeliveryRate?: number;
  avgOpenRate?: number;
  avgClickRate?: number;
  campaignsUsedIn: {
    campaignId: string;
    campaignName: string;
    usedAt: Date;
    deliveryStats?: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
    };
  }[];
}

// ==========================================
// Error Types
// ==========================================

export enum EmailCampaignErrorCodes {
  INVALID_TEMPLATE = 'EMAIL_CAMPAIGN_INVALID_TEMPLATE',
  RECIPIENT_NOT_FOUND = 'EMAIL_CAMPAIGN_RECIPIENT_NOT_FOUND',
  DELIVERY_FAILED = 'EMAIL_CAMPAIGN_DELIVERY_FAILED',
  RATE_LIMIT_EXCEEDED = 'EMAIL_CAMPAIGN_RATE_LIMIT_EXCEEDED',
  PERMISSION_DENIED = 'EMAIL_CAMPAIGN_PERMISSION_DENIED',
  CAMPAIGN_NOT_FOUND = 'EMAIL_CAMPAIGN_NOT_FOUND',
  INVALID_STATUS_TRANSITION = 'EMAIL_CAMPAIGN_INVALID_STATUS_TRANSITION',
  TEMPLATE_RENDERING_FAILED = 'EMAIL_CAMPAIGN_TEMPLATE_RENDERING_FAILED',
  RECIPIENT_LIST_EMPTY = 'EMAIL_CAMPAIGN_RECIPIENT_LIST_EMPTY',
  UNSUBSCRIBE_TOKEN_INVALID = 'EMAIL_CAMPAIGN_UNSUBSCRIBE_TOKEN_INVALID'
}

export interface EmailCampaignError {
  code: EmailCampaignErrorCodes;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId: string;
}