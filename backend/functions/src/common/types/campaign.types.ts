// backend/functions/src/common/types/campaign.types.ts - Types pour l'intégration campagnes-événements

export interface EventCampaignRequest {
  eventId: string;
  tenantId: string;
  notificationMethods: {
    email?: {
      enabled: boolean;
      generateQR: boolean;
      templateId?: string;
    };
    sms?: {
      enabled: boolean;
      generatePIN: boolean;
      templateId?: string;
    };
  };
  scheduledAt?: Date;
  reminderSettings?: {
    send24hBefore: boolean;
    send1hBefore: boolean;
  };
}

export interface ParticipantAccessCodes {
  userId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  preferredMethod: 'email' | 'sms' | 'both';
  qrCode?: {
    qrCodeId: string;
    imageBase64: string;
    url: string;
    expiresAt: string;
  };
  pinCode?: {
    code: string;
    expiresAt: string;
  };
}

export interface EventCampaign {
  id: string;
  eventId: string;
  tenantId: string;
  emailCampaignId?: string;
  smsCampaignId?: string;
  participantCount: number;
  qrCodesGenerated: number;
  pinCodesGenerated: number;
  createdAt: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  errors?: string[];
}

export interface CampaignWithEvent {
  id: string;
  name: string;
  type: string;
  subject: string;
  eventId?: string;
  eventIntegration?: {
    generateQRCodes: boolean;
    generatePINCodes: boolean;
    qrExpirationHours: number;
    pinExpirationMinutes: number;
  };
  content: {
    htmlContent?: string;
    textContent?: string;
    templateData?: Record<string, any>;
  };
  recipientCriteria: {
    teams?: string[];
    roles?: string[];
    departments?: string[];
    eventParticipants?: string[];
    customFilters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    excludeUnsubscribed?: boolean;
    includeInactive?: boolean;
  };
  scheduledAt?: string;
  tags?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
}

export interface PINCode {
  id: string;
  eventId: string;
  userId: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: string;
}

export interface AccessCodeValidationResult {
  valid: boolean;
  message?: string;
  participantId?: string;
  checkInRecord?: {
    id: string;
    eventId: string;
    userId: string;
    method: 'qr_code' | 'pin_code';
    timestamp: string;
    status: 'checked_in' | 'late';
  };
}

export interface EventCampaignAnalytics {
  campaignId: string;
  eventId: string;
  totalParticipants: number;
  qrCodesGenerated: number;
  pinCodesGenerated: number;
  emailsSent: number;
  smsSent: number;
  deliveryRate: number;
  emailsOpened: number;
  smsOpened: number;
  openRate: number;
  qrCodesUsed: number;
  pinCodesUsed: number;
  usageRate: number;
  averageUsageDelay: number;
  peakUsageTime: string;
}

export interface CreateEventCampaignRequest {
  type: 'confirmation' | 'reminder' | 'update' | 'cancellation';
  notificationMethods: {
    email?: {
      enabled: boolean;
      generateQR: boolean;
      templateId?: string;
    };
    sms?: {
      enabled: boolean;
      generatePIN: boolean;
      templateId?: string;
    };
  };
  scheduledAt?: string;
  customMessage?: string;
  reminderSettings?: {
    send24hBefore: boolean;
    send1hBefore: boolean;
  };
}

export interface EventCampaignResponse {
  campaignId: string;
  participants: ParticipantWithCodes[];
  emailCampaignId?: string;
  smsCampaignId?: string;
  qrCodesGenerated: number;
  pinCodesGenerated: number;
  scheduledAt?: string;
  status: string;
}