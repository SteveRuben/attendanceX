/**
 * Controller de configuration de billetterie
 * Gère les endpoints HTTP pour les types de billets, codes promo et paramètres
 */

import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { ticketConfigService } from "../../services/ticketing/ticket-config.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateTicketTypeRequest,
  UpdateTicketTypeRequest,
  CreatePromoCodeRequest,
  ValidatePromoCodeRequest,
  CreateTicketingSettingsRequest
} from "../../common/types/ticket-config.types";

export class TicketConfigController {

  // ============================================
  // Ticket Types Endpoints
  // ============================================

  /**
   * Créer un nouveau type de billet
   * POST /api/ticket-config/ticket-types
   */
  static createTicketType = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateTicketTypeRequest = req.body;

      // Validation des champs requis
      if (!createRequest.eventId || !createRequest.name || createRequest.price === undefined || !createRequest.quantity) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, name, price, quantity");
      }

      logger.info(`🎫 Creating ticket type: ${createRequest.name}`, {
        userId,
        tenantId,
        eventId: createRequest.eventId,
        ticketName: createRequest.name
      });

      const ticketType = await ticketConfigService.createTicketType(createRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Ticket type created successfully: ${ticketType.id} in ${duration}ms`, {
        ticketTypeId: ticketType.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Ticket type created successfully",
        data: ticketType
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating ticket type after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create ticket type");
    }
  });

  /**
   * Récupérer un type de billet par ID
   * GET /api/ticket-config/ticket-types/:ticketTypeId
   */
  static getTicketType = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketTypeId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticketType = await ticketConfigService.getTicketType(ticketTypeId, tenantId);

      if (!ticketType) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Ticket type not found");
      }

      res.json({
        success: true,
        data: ticketType
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticket type:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticket type");
    }
  });

  /**
   * Récupérer tous les types de billets d'un événement
   * GET /api/ticket-config/events/:eventId/ticket-types
   */
  static getTicketTypesByEvent = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticketTypes = await ticketConfigService.getTicketTypesWithAvailability(eventId, tenantId);

      res.json({
        success: true,
        data: ticketTypes
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticket types:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticket types");
    }
  });

  /**
   * Mettre à jour un type de billet
   * PUT /api/ticket-config/ticket-types/:ticketTypeId
   */
  static updateTicketType = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketTypeId } = req.params;
      const tenantId = req.user?.tenantId;
      const updateRequest: UpdateTicketTypeRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticketType = await ticketConfigService.updateTicketType(ticketTypeId, updateRequest, tenantId);

      logger.info(`✅ Ticket type updated: ${ticketTypeId}`, {
        ticketTypeId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Ticket type updated successfully",
        data: ticketType
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating ticket type:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update ticket type");
    }
  });

  /**
   * Supprimer un type de billet
   * DELETE /api/ticket-config/ticket-types/:ticketTypeId
   */
  static deleteTicketType = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketTypeId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      await ticketConfigService.deleteTicketType(ticketTypeId, tenantId);

      logger.info(`🗑️ Ticket type deleted: ${ticketTypeId}`, {
        ticketTypeId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Ticket type deleted successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error deleting ticket type:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete ticket type");
    }
  });

  // ============================================
  // Promo Codes Endpoints
  // ============================================

  /**
   * Créer un code promo
   * POST /api/ticket-config/promo-codes
   */
  static createPromoCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreatePromoCodeRequest = req.body;

      // Validation des champs requis
      if (!createRequest.eventId || !createRequest.code || !createRequest.type || createRequest.value === undefined) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: eventId, code, type, value");
      }

      logger.info(`🎟️ Creating promo code: ${createRequest.code}`, {
        userId,
        tenantId,
        eventId: createRequest.eventId,
        code: createRequest.code
      });

      const promoCode = await ticketConfigService.createPromoCode(createRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Promo code created successfully: ${promoCode.id} in ${duration}ms`, {
        promoCodeId: promoCode.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Promo code created successfully",
        data: promoCode
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating promo code after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create promo code");
    }
  });

  /**
   * Valider un code promo
   * POST /api/ticket-config/promo-codes/validate
   */
  static validatePromoCode = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      const validateRequest: ValidatePromoCodeRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      if (!validateRequest.code || !validateRequest.eventId || !validateRequest.ticketTypes) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Missing required fields: code, eventId, ticketTypes");
      }

      const validation = await ticketConfigService.validatePromoCode(validateRequest, tenantId);

      res.json({
        success: true,
        data: validation
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error validating promo code:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to validate promo code");
    }
  });

  // ============================================
  // Ticketing Settings Endpoints
  // ============================================

  /**
   * Créer ou mettre à jour les paramètres de billetterie
   * PUT /api/ticket-config/events/:eventId/settings
   */
  static upsertTicketingSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user?.tenantId;
      const settingsRequest = {
        ...req.body,
        eventId
      } as CreateTicketingSettingsRequest & { eventId: string };

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const settings = await ticketConfigService.upsertTicketingSettings(settingsRequest, tenantId);

      logger.info(`✅ Ticketing settings updated for event: ${eventId}`, {
        eventId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Ticketing settings updated successfully",
        data: settings
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error upserting ticketing settings:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update ticketing settings");
    }
  });

  /**
   * Récupérer les paramètres de billetterie
   * GET /api/ticket-config/events/:eventId/settings
   */
  static getTicketingSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const settings = await ticketConfigService.getTicketingSettings(eventId, tenantId);

      if (!settings) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Ticketing settings not found");
      }

      res.json({
        success: true,
        data: settings
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticketing settings:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticketing settings");
    }
  });

  /**
   * Récupérer la configuration complète de billetterie
   * GET /api/ticket-config/events/:eventId/summary
   */
  static getTicketingConfigSummary = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const summary = await ticketConfigService.getTicketingConfigSummary(eventId, tenantId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticketing config summary:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticketing config summary");
    }
  });
}
