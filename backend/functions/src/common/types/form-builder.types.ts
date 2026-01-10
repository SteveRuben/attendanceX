/**
 * Form Builder Types for Backend
 * Defines interfaces for form submissions and webhook processing
 */

export interface FormSubmission {
  id: string;
  formId: string;
  tenantId: string;
  eventId?: string;
  submittedAt: Date;
  submittedBy?: string;
  data: Record<string, any>;
  status: FormSubmissionStatus;
  metadata?: Record<string, any>;
}

export enum FormSubmissionStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WebhookPayload {
  event: WebhookEventType;
  data: {
    formSubmission: FormSubmission;
    formId: string;
    eventId?: string;
    tenantId: string;
    config?: Partial<AutoRegistrationConfig>;
  };
  timestamp: string;
  signature?: string;
}

export enum WebhookEventType {
  FORM_SUBMITTED = 'form.submitted',
  TICKET_CREATED = 'ticket.created',
  TICKET_CANCELLED = 'ticket.cancelled',
  TICKET_USED = 'ticket.used',
  EVENT_REMINDER = 'event.reminder'
}

export interface AutoRegistrationConfig {
  eventId: string;
  tenantId: string;
  autoGenerateTicket: boolean;
  autoSendEmail: boolean;
  requireApproval: boolean;
  emailOptions: {
    includeCalendarInvite: boolean;
    includeEventDetails: boolean;
    subject?: string;
    message?: string;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  data?: {
    ticketGenerated?: boolean;
    ticketId?: string;
    ticketNumber?: string;
    emailSent?: boolean;
    warnings?: string[];
  };
  errors?: string[];
}