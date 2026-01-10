import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { asyncHandler } from "../../middleware/errorHandler";
import { webhookService } from "../../services/webhook/webhook.service";
import { 
  WebhookPayload
} from "../../common/types/form-builder.types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { collections } from "../../config/database";

interface WebhookRequest extends Request {
  body: WebhookPayload;
  rawBody?: Buffer; // For signature validation
}

export class FormSubmissionWebhookController {

  /**
   * Validate webhook payload and tenant
   */
  private static async validateWebhookPayload(payload: WebhookPayload): Promise<void> {
    // Validate payload structure
    if (!payload || !payload.event || !payload.data) {
      throw new Error("Invalid webhook payload structure");
    }

    // Validate tenant ID is present
    if (!payload.data.tenantId) {
      throw new Error("Missing tenant ID in webhook payload");
    }

    // Verify tenant exists (security check)
    const tenantDoc = await collections.tenants.doc(payload.data.tenantId).get();
    if (!tenantDoc.exists) {
      throw new Error("Invalid tenant ID");
    }

    // Verify tenant is active
    const tenantData = tenantDoc.data();
    if (tenantData?.status !== 'active') {
      throw new Error("Tenant is not active");
    }
  }

  /**
   * Common webhook processing logic
   */
  private static async processWebhook(
    req: WebhookRequest, 
    res: Response, 
    webhookType: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const payload = req.body;
      const sourceIp = req.ip || req.socket.remoteAddress || 'unknown';

      // Validate payload and tenant
      await this.validateWebhookPayload(payload);

      logger.info(`📥 ${webhookType} webhook received: ${payload.event}`, {
        event: payload.event,
        formId: payload.data.formId,
        eventId: payload.data.eventId,
        tenantId: payload.data.tenantId,
        timestamp: payload.timestamp,
        sourceIp
      });

      // Process webhook through service
      const result = await webhookService.processFormSubmission(payload, sourceIp);

      const duration = Date.now() - startTime;
      
      if (result.success) {
        logger.info(`✅ ${webhookType} webhook processed successfully in ${duration}ms`, {
          event: payload.event,
          formId: payload.data.formId,
          eventId: payload.data.eventId,
          tenantId: payload.data.tenantId,
          duration
        });

        res.status(result.data?.ticketGenerated ? 201 : 200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        logger.warn(`⚠️ ${webhookType} webhook processing failed in ${duration}ms`, {
          event: payload.event,
          tenantId: payload.data.tenantId,
          errors: result.errors,
          duration
        });

        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, result.message, result.errors);
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ ${webhookType} webhook processing failed after ${duration}ms`, {
        error: error.message,
        stack: error.stack,
        duration
      });

      if (error.message.includes('Invalid tenant') || error.message.includes('Missing tenant')) {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, `${webhookType} webhook processing failed`);
    }
  }

  /**
   * Process form submission webhook
   */
  static processFormSubmission = asyncHandler(async (req: WebhookRequest, res: Response): Promise<void> => {
    await FormSubmissionWebhookController.processWebhook(req, res, "Form submission");
  });

  /**
   * Process ticket status update webhook
   */
  static processTicketStatusUpdate = asyncHandler(async (req: WebhookRequest, res: Response): Promise<void> => {
    await FormSubmissionWebhookController.processWebhook(req, res, "Ticket status");
  });

  /**
   * Process event reminder webhook
   */
  static processEventReminder = asyncHandler(async (req: WebhookRequest, res: Response): Promise<void> => {
    await FormSubmissionWebhookController.processWebhook(req, res, "Event reminder");
  });
}