import { collections } from "../../config/database";
import { logger } from "firebase-functions";
import { 
  FormSubmission, 
  WebhookPayload, 
  WebhookEventType, 
  WebhookProcessingResult,
  AutoRegistrationConfig 
} from "../../common/types/form-builder.types";
import { eventRegistrationService } from "../registration/event-registration.service";
import { webhookLogService } from "./webhook-log.service";
import { ValidationError } from "../../utils/common/errors";
import { FormSubmissionModel } from "../../models/form-submission.model";

export class WebhookService {

  /**
   * Process form submission webhook
   */
  async processFormSubmission(
    payload: WebhookPayload,
    sourceIp: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Log webhook reception
      await this.logWebhookEvent(payload, sourceIp);

      // Validate payload
      this.validateWebhookPayload(payload);

      // Process based on event type
      switch (payload.event) {
        case WebhookEventType.FORM_SUBMITTED:
          return await this.handleFormSubmission(payload);
        
        case WebhookEventType.TICKET_CREATED:
        case WebhookEventType.TICKET_CANCELLED:
        case WebhookEventType.TICKET_USED:
          return await this.handleTicketEvent(payload);
        
        case WebhookEventType.EVENT_REMINDER:
          return await this.handleEventReminder(payload);
        
        default:
          logger.warn(`⚠️ Unhandled webhook event: ${payload.event}`);
          return {
            success: true,
            message: 'Event not handled'
          };
      }

    } catch (error: any) {
      logger.error(`❌ Webhook processing failed`, {
        event: payload.event,
        tenantId: payload.data.tenantId,
        error: error.message
      });

      return {
        success: false,
        message: 'Webhook processing failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Handle form submission event
   */
  private async handleFormSubmission(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    const { data } = payload;

    // Store form submission
    await this.storeFormSubmission(data.formSubmission);

    // If it's an event registration, process automatically
    if (data.eventId) {
      return await this.processEventRegistration(data);
    }

    // Generic form processing
    return {
      success: true,
      message: 'Form submission processed successfully'
    };
  }

  /**
   * Process event registration from form submission
   */
  private async processEventRegistration(
    data: WebhookPayload['data']
  ): Promise<WebhookProcessingResult> {
    try {
      // Default configuration
      const defaultConfig: AutoRegistrationConfig = {
        eventId: data.eventId!,
        tenantId: data.tenantId,
        autoGenerateTicket: true,
        autoSendEmail: true,
        requireApproval: false,
        emailOptions: {
          includeCalendarInvite: true,
          includeEventDetails: true,
        }
      };

      // Merge with provided config
      const config = { ...defaultConfig, ...data.config };

      logger.info(`🎫 Processing event registration via webhook`, {
        submissionId: data.formSubmission.id,
        eventId: config.eventId,
        tenantId: config.tenantId
      });

      // Process registration
      const result = await eventRegistrationService.processEventRegistration(
        data.formSubmission,
        config,
        'webhook-system'
      );

      if (result.success) {
        return {
          success: true,
          message: 'Event registration processed successfully',
          data: {
            ticketGenerated: !!result.ticket,
            ticketId: result.ticket?.id,
            ticketNumber: result.ticket?.ticketNumber,
            emailSent: result.emailSent,
            warnings: result.warnings
          }
        };
      } else {
        return {
          success: false,
          message: 'Registration processing failed',
          errors: result.errors
        };
      }

    } catch (error: any) {
      logger.error(`❌ Error processing event registration webhook`, {
        submissionId: data.formSubmission.id,
        eventId: data.eventId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Handle ticket events
   */
  private async handleTicketEvent(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    // TODO: Implement ticket event handling
    logger.info(`🎫 Processing ticket event: ${payload.event}`, {
      event: payload.event,
      tenantId: payload.data.tenantId
    });

    return {
      success: true,
      message: 'Ticket event processed'
    };
  }

  /**
   * Handle event reminder
   */
  private async handleEventReminder(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    // TODO: Implement event reminder handling
    logger.info(`⏰ Processing event reminder: ${payload.event}`, {
      event: payload.event,
      tenantId: payload.data.tenantId
    });

    return {
      success: true,
      message: 'Event reminder processed'
    };
  }

  /**
   * Store form submission in database using model
   */
  private async storeFormSubmission(submission: FormSubmission): Promise<void> {
    try {
      // Check if submission already exists to prevent duplicates
      const existingDoc = await collections.form_submissions.doc(submission.id).get();
      if (existingDoc.exists) {
        logger.warn(`📝 Form submission already exists: ${submission.id}`);
        return;
      }

      // Create model and validate
      const submissionModel = new FormSubmissionModel({
        ...submission,
        submittedAt: new Date(submission.submittedAt)
      });

      await submissionModel.validate();

      // Save to database
      await collections.form_submissions.doc(submission.id).set(submissionModel.toFirestore());

      logger.info(`📝 Form submission stored`, {
        submissionId: submission.id,
        formId: submission.formId,
        tenantId: submission.tenantId
      });

    } catch (error: any) {
      logger.error(`❌ Error storing form submission`, {
        submissionId: submission.id,
        error: error.message
      });
      throw new ValidationError(`Failed to store form submission: ${error.message}`);
    }
  }

  /**
   * Log webhook event for audit trail using model
   */
  private async logWebhookEvent(payload: WebhookPayload, sourceIp: string): Promise<string | null> {
    try {
      const logId = await webhookLogService.createWebhookLog({
        event: payload.event,
        tenantId: payload.data.tenantId,
        formId: payload.data.formId,
        eventId: payload.data.eventId,
        sourceIp,
        timestamp: new Date(payload.timestamp),
        signature: payload.signature
      });

      logger.info(`📋 Webhook event logged`, {
        logId,
        event: payload.event,
        tenantId: payload.data.tenantId
      });

      return logId;

    } catch (error: any) {
      logger.warn(`⚠️ Failed to log webhook event`, {
        event: payload.event,
        error: error.message
      });
      // Don't throw - logging failure shouldn't stop processing
      return null;
    }
  }

  /**
   * Validate webhook payload
   */
  private validateWebhookPayload(payload: WebhookPayload): void {
    if (!payload.event) {
      throw new ValidationError('Missing event type');
    }

    if (!payload.data) {
      throw new ValidationError('Missing webhook data');
    }

    if (!payload.data.tenantId) {
      throw new ValidationError('Missing tenant ID');
    }

    if (!payload.data.formSubmission) {
      throw new ValidationError('Missing form submission data');
    }

    if (!payload.timestamp) {
      throw new ValidationError('Missing timestamp');
    }

    // Validate timestamp is not too old (prevent replay attacks)
    const webhookTime = new Date(payload.timestamp);
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now.getTime() - webhookTime.getTime() > maxAge) {
      throw new ValidationError('Webhook timestamp too old');
    }
  }

  /**
   * Validate webhook signature (if provided)
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // TODO: Implement signature validation
    // This would typically use HMAC-SHA256 or similar
    return true;
  }
}

export const webhookService = new WebhookService();