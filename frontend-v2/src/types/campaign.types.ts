// frontend-v2/src/types/campaign.types.ts - Types pour l'intégration campagnes-événements

export type CampaignType = 'newsletter' | 'announcement' | 'reminder' | 'promotional' | 'transactional' | 'event';

export interface Campaign {
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
  createdAt: string;
  updatedAt: string;
  status: string;
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
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  errors?: string[];
}

export interface ParticipantWithCodes {
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
  willGenerateQR?: boolean;
  willGeneratePIN?: boolean;
}

export interface CreateCampaignRequest {
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
    excludeUnsubscribed?: boolean;
    includeInactive?: boolean;
  };
  scheduledAt?: string;
  tags?: string[];
  notes?: string;
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

export interface EventCampaignPreview {
  event: {
    id: string;
    title: string;
    startDateTime: string;
    location?: {
      name: string;
    };
  };
  participants: ParticipantWithCodes[];
  summary: {
    totalParticipants: number;
    willGenerateQR: number;
    willGeneratePIN: number;
  };
}

export interface AccessCodeValidation {
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

export interface CampaignAnalytics {
  campaignId: string;
  eventId?: string;
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

export interface AccessCodeStats {
  qrCodes: {
    totalQRCodes: number;
    activeQRCodes: number;
    totalUsage: number;
    averageUsage: number;
    lastGenerated?: string;
  };
  pinCodes: {
    total: number;
    used: number;
    expired: number;
    active: number;
    usageRate: number;
  };
  summary: {
    totalCodes: number;
    totalUsage: number;
    overallUsageRate: number;
  };
}