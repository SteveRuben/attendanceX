import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { eventGeneratorService } from "../../services/ai/event-generator.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";

export interface GenerateEventRequestBody {
  naturalLanguageInput: string;
  preferences?: {
    defaultBudget?: number;
    preferredVenues?: string[];
    defaultDuration?: number;
  };
}

export interface CreateEventFromGeneratedRequestBody {
  generatedEventData: any; // GeneratedEventData from openai.service
}

export interface RefineEventRequestBody {
  refinementPrompt: string;
}

export class EventGenerationController {

  static generateEvent = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { naturalLanguageInput, preferences }: GenerateEventRequestBody = req.body;

      // Validation des champs requis
      if (!naturalLanguageInput || naturalLanguageInput.trim().length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Natural language input is required");
      }

      if (naturalLanguageInput.length > 1000) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Input too long (max 1000 characters)");
      }

      logger.info(`🤖 Generating event from AI`, {
        userId,
        tenantId,
        inputLength: naturalLanguageInput.length,
        hasPreferences: !!preferences
      });

      const generatedEvent = await eventGeneratorService.generateEvent({
        naturalLanguageInput,
        tenantId,
        userId,
        preferences
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ Event generated successfully in ${duration}ms`, {
        userId,
        tenantId,
        duration,
        confidence: generatedEvent.metadata.confidence,
        eventType: generatedEvent.event.type,
        tasksCount: generatedEvent.event.tasks.length
      });

      res.status(200).json({
        success: true,
        message: "Event generated successfully",
        data: generatedEvent
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error generating event after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.message.includes('OpenAI')) {
        return errorHandler.sendError(res, ERROR_CODES.EXTERNAL_SERVICE_ERROR, "AI service temporarily unavailable");
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to generate event");
    }
  });

  static createEventFromGenerated = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { generatedEventData }: CreateEventFromGeneratedRequestBody = req.body;

      if (!generatedEventData) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Generated event data is required");
      }

      logger.info(`📝 Creating event from AI-generated data`, {
        userId,
        tenantId,
        eventTitle: generatedEventData.title,
        eventType: generatedEventData.type
      });

      const eventId = await eventGeneratorService.createEventFromGenerated(
        generatedEventData,
        tenantId,
        userId
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ Event created from AI generation in ${duration}ms`, {
        eventId,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Event created successfully from AI generation",
        data: {
          eventId,
          title: generatedEventData.title,
          type: generatedEventData.type
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating event from AI generation after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create event from AI generation");
    }
  });

  static refineEvent = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { refinementPrompt }: RefineEventRequestBody = req.body;

      if (!refinementPrompt || refinementPrompt.trim().length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Refinement prompt is required");
      }

      if (!eventId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Event ID is required");
      }

      logger.info(`🔄 Refining event with AI`, {
        eventId,
        userId,
        tenantId,
        promptLength: refinementPrompt.length
      });

      const refinedEvent = await eventGeneratorService.refineEvent(
        eventId,
        refinementPrompt,
        tenantId,
        userId
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ Event refined successfully in ${duration}ms`, {
        eventId,
        userId,
        tenantId,
        duration,
        confidence: refinedEvent.metadata.confidence
      });

      res.status(200).json({
        success: true,
        message: "Event refined successfully",
        data: refinedEvent
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error refining event after ${duration}ms`, {
        eventId,
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.message.includes('not found')) {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Event not found");
      }

      if (error.message.includes('Unauthorized')) {
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Unauthorized access to event");
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to refine event");
    }
  });

  static testAIConnection = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { openAIService } = await import("../../services/ai/openai.service");
      const isConnected = await openAIService.testConnection();

      res.status(200).json({
        success: true,
        data: {
          aiServiceAvailable: isConnected,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error('❌ AI connection test failed', { error: error.message });
      
      return errorHandler.sendError(res, ERROR_CODES.EXTERNAL_SERVICE_ERROR, "AI service connection failed");
    }
  });
}