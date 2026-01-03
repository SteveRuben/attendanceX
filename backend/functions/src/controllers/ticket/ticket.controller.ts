import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { ticketService } from "../../services/ticket/ticket.service";
import { ticketGeneratorService } from "../../services/ticket/ticket-generator.service";
import { eventRegistrationService } from "../../services/registration/event-registration.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateTicketRequest, 
  UpdateTicketRequest,
  BulkTicketRequest,
  TicketEmailOptions,
  TicketStatus
} from "../../common/types/ticket.types";

export class TicketController {

  /**
   * Créer un billet
   */
  static createTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateTicketRequest = req.body;

      // Validation des champs requis
      if (!createRequest.eventId || !createRequest.participantName || !createRequest.participantEmail) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Event ID, participant name and email are required");
      }

      logger.info(`🎫 Creating ticket for event: ${createRequest.eventId}`, {
        userId,
        tenantId,
        eventId: createRequest.eventId,
        participantEmail: createRequest.participantEmail
      });

      const ticket = await ticketService.createTicket(createRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Ticket created successfully: ${ticket.id} in ${duration}ms`, {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Ticket created successfully",
        data: ticket
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating ticket after ${duration}ms`, {
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

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create ticket");
    }
  });

  /**
   * Créer plusieurs billets en lot
   */
  static createBulkTickets = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const bulkRequest: BulkTicketRequest = req.body;

      if (!bulkRequest.eventId || !bulkRequest.participants || bulkRequest.participants.length === 0) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Event ID and participants are required");
      }

      logger.info(`📋 Creating bulk tickets for event: ${bulkRequest.eventId}`, {
        userId,
        tenantId,
        eventId: bulkRequest.eventId,
        participantsCount: bulkRequest.participants.length
      });

      const tickets = await ticketService.createBulkTickets(bulkRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Bulk tickets created: ${tickets.length} tickets in ${duration}ms`, {
        eventId: bulkRequest.eventId,
        ticketsCount: tickets.length,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: `${tickets.length} tickets created successfully`,
        data: tickets
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating bulk tickets after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create bulk tickets");
    }
  });

  /**
   * Obtenir un billet par ID
   */
  static getTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticket = await ticketService.getTicketById(ticketId, tenantId);

      if (!ticket) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Ticket not found");
      }

      res.json({
        success: true,
        data: ticket
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticket:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticket");
    }
  });

  /**
   * GET /tickets/event/:eventId
   * Get all tickets for an event
   */
  static getTicketsByEvent = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const result = await ticketService.getTicketsByEvent(eventId, tenantId, {
        page: Number(page),
        limit: Math.min(Number(limit), 100), // Max 100 per page
        status: status as TicketStatus
      });

      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting tickets by event:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get tickets");
    }
  });

  /**
   * GET /tickets/participant/:participantId
   * Get all tickets for a participant
   */
  static getTicketsByParticipant = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { participantId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const result = await ticketService.getTicketsByParticipant(participantId, tenantId, {
        page: Number(page),
        limit: Math.min(Number(limit), 100) // Max 100 per page
      });

      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting tickets by participant:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get tickets");
    }
  });


  /**
   * Mettre à jour un billet
   */
  static updateTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;
      const updateRequest: UpdateTicketRequest = req.body;

      if (!tenantId || !userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const ticket = await ticketService.updateTicket(ticketId, updateRequest, tenantId, userId);

      logger.info(`✅ Ticket updated: ${ticketId}`, {
        ticketId,
        tenantId,
        userId
      });

      res.json({
        success: true,
        message: "Ticket updated successfully",
        data: ticket
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating ticket:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update ticket");
    }
  });

  /**
   * Annuler un billet
   */
  static cancelTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const ticket = await ticketService.cancelTicket(ticketId, reason || 'Cancelled by user', tenantId, userId);

      logger.info(`🚫 Ticket cancelled: ${ticketId}`, {
        ticketId,
        reason,
        tenantId,
        userId
      });

      res.json({
        success: true,
        message: "Ticket cancelled successfully",
        data: ticket
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error cancelling ticket:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to cancel ticket");
    }
  });

  /**
   * Valider un billet
   */
  static validateTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketNumber, securityCode } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      if (!ticketNumber || !securityCode) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Ticket number and security code are required");
      }

      const validationResult = await ticketService.validateTicket(ticketNumber, securityCode, tenantId);

      res.json({
        success: true,
        data: validationResult
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error validating ticket:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to validate ticket");
    }
  });

  /**
   * Check-in d'un billet
   */
  static checkInTicket = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const ticket = await ticketService.checkInTicket(ticketId, tenantId, userId);

      logger.info(`✅ Ticket checked in: ${ticketId}`, {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        tenantId,
        userId
      });

      res.json({
        success: true,
        message: "Ticket checked in successfully",
        data: ticket
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error checking in ticket:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to check in ticket");
    }
  });

  /**
   * Télécharger un billet en PDF
   */
  static downloadTicketPDF = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticket = await ticketService.getTicketById(ticketId, tenantId);

      if (!ticket) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Ticket not found");
      }

      // Générer le PDF
      const { pdfBuffer, filename } = await ticketGeneratorService.generateTicketPDF(ticket);

      // Incrémenter le compteur de téléchargements
      await ticketService.incrementDownloadCount(ticketId, tenantId);

      // Définir les headers pour le téléchargement
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      logger.info(`📄 Ticket PDF downloaded: ${ticketId}`, {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        filename,
        tenantId
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error downloading ticket PDF:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to generate ticket PDF");
    }
  });

  /**
   * Envoyer un billet par email
   */
  static sendTicketEmail = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketId } = req.params;
      const emailOptions: TicketEmailOptions = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const ticket = await ticketService.getTicketById(ticketId, tenantId);

      if (!ticket) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Ticket not found");
      }

      const emailSent = await ticketGeneratorService.sendTicketByEmail(ticket, emailOptions, tenantId);

      if (emailSent) {
        logger.info(`📧 Ticket email sent: ${ticketId}`, {
          ticketId,
          ticketNumber: ticket.ticketNumber,
          recipientEmail: ticket.participantEmail,
          tenantId
        });

        res.json({
          success: true,
          message: "Ticket email sent successfully"
        });
      } else {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to send ticket email");
      }

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error sending ticket email:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to send ticket email");
    }
  });

  /**
   * Obtenir les statistiques des billets pour un événement
   */
  static getTicketStatistics = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const statistics = await ticketService.getTicketStatistics(eventId, tenantId);

      res.json({
        success: true,
        data: statistics
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting ticket statistics:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get ticket statistics");
    }
  });

  /**
   * Traiter une inscription d'événement avec génération automatique de billet
   */
  static processEventRegistration = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { formSubmission, config } = req.body;
      const userId = req.user?.uid;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      if (!formSubmission || !config) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Form submission and config are required");
      }

      // Ajouter le tenantId au config
      config.tenantId = tenantId;

      const result = await eventRegistrationService.processEventRegistration(formSubmission, config, userId);

      if (result.success) {
        logger.info(`🎉 Event registration processed successfully`, {
          submissionId: formSubmission.id,
          eventId: config.eventId,
          ticketGenerated: !!result.ticket,
          emailSent: result.emailSent,
          tenantId,
          userId
        });

        res.status(201).json({
          success: true,
          message: "Registration processed successfully",
          data: result
        });
      } else {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, result.errors?.join(', ') || 'Registration failed');
      }

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error processing event registration:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to process registration");
    }
  });
}