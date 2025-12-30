import {Request, Response} from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { eventService } from "../../services/event/legacy-event.service";
import { meetingLinkService } from "../../services/integrations/meeting-link.service";
import { AuthenticatedRequest } from "../../types";
import { EventStatus, EventType } from "../../common/types";
import { logger } from "firebase-functions";


/**
 * Contrôleur de gestion des événements
 */
export class EventController {
  /**
   * Créer un événement
   */
  static createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizerId = req.user.uid;
    
    // Extract tenantId the same way requireTenantPermission middleware does
    const tenantId = req.params.tenantId
      || req.query.tenantId as string
      || req.body.tenantId
      || req.headers['x-tenant-id'] as string
      || req.tenantContext?.tenant?.id;
    
    const validatedData = req.body;

    // Debug log pour vérifier le tenantId
    console.log('DEBUG - Controller tenantId:', tenantId);
    console.log('DEBUG - req.headers[x-tenant-id]:', req.headers['x-tenant-id']);
    console.log('DEBUG - req.params.tenantId:', req.params.tenantId);
    console.log('DEBUG - req.query.tenantId:', req.query.tenantId);
    console.log('DEBUG - req.body.tenantId:', req.body.tenantId);
    console.log('DEBUG - req.tenantContext:', req.tenantContext);

    // Transform validated data to match CreateEventRequest interface
    const eventData = {
      ...validatedData,
      // Map startDate/endDate from validation to startDateTime/endDateTime for service
      startDateTime: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      endDateTime: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      registrationDeadline: validatedData.registrationDeadline ? new Date(validatedData.registrationDeadline) : undefined,
      // Map isPublic to isPrivate
      isPrivate: validatedData.isPublic !== undefined ? !validatedData.isPublic : undefined,
      // Map inviteParticipants to participants, ensure organizer is included
      participants: validatedData.inviteParticipants && validatedData.inviteParticipants.length > 0 
        ? validatedData.inviteParticipants 
        : [organizerId], // At least include the organizer
      // Transform settings to attendanceSettings (always provide defaults)
      attendanceSettings: validatedData.settings ? {
        requireQRCode: validatedData.settings.allowedMethods?.includes('qr_code') || false,
        requireGeolocation: validatedData.settings.allowedMethods?.includes('geolocation') || false,
        requireBiometric: validatedData.settings.allowedMethods?.includes('biometric') || false,
        lateThresholdMinutes: validatedData.settings.lateThresholdMinutes || 15,
        earlyThresholdMinutes: validatedData.settings.earlyCheckInMinutes || 30,
        geofenceRadius: 100,
        allowManualMarking: validatedData.settings.allowedMethods?.includes('manual') || true,
        requireValidation: validatedData.settings.requireValidation || false,
        required: validatedData.settings.requireValidation || false,
        allowLateCheckIn: validatedData.settings.allowEarlyCheckIn || true,
        allowEarlyCheckOut: true,
        requireApproval: false,
        autoMarkAbsent: validatedData.settings.autoMarkLate || true,
        autoMarkAbsentAfterMinutes: 60,
        allowSelfCheckIn: true,
        allowSelfCheckOut: true,
        checkInWindow: {
          beforeMinutes: validatedData.settings.earlyCheckInMinutes || 30,
          afterMinutes: validatedData.settings.lateThresholdMinutes || 15
        }
      } : {
        // Default attendance settings if none provided
        requireQRCode: false,
        requireGeolocation: false,
        requireBiometric: false,
        lateThresholdMinutes: 15,
        earlyThresholdMinutes: 30,
        geofenceRadius: 100,
        allowManualMarking: true,
        requireValidation: false,
        required: false,
        allowLateCheckIn: true,
        allowEarlyCheckOut: true,
        requireApproval: false,
        autoMarkAbsent: true,
        autoMarkAbsentAfterMinutes: 60,
        allowSelfCheckIn: true,
        allowSelfCheckOut: true,
        checkInWindow: {
          beforeMinutes: 30,
          afterMinutes: 15
        }
      },
      // Remove validation-specific fields
      startDate: undefined,
      endDate: undefined,
      isPublic: undefined,
      inviteParticipants: undefined,
      sendInvitations: undefined,
      settings: undefined,
    };

    // Clean up undefined fields
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined) {
        delete eventData[key];
      }
    });

    // Générer automatiquement un lien de réunion pour les événements virtuels et hybrides
    if (eventData.location?.type === 'virtual' || eventData.location?.type === 'hybrid') {
      try {
        const meetingLinkRequest = {
          eventTitle: eventData.title,
          startDateTime: eventData.startDateTime!,
          endDateTime: eventData.endDateTime!,
          description: eventData.description,
          attendees: eventData.participants || []
        };

        const meetingLink = await meetingLinkService.generateMeetingLink(organizerId, meetingLinkRequest);
        
        if (meetingLink) {
          // Mettre à jour l'URL virtuelle avec le lien généré
          eventData.location.virtualUrl = meetingLink.meetingUrl;
          
          logger.info('Meeting link generated for event', {
            organizerId,
            provider: meetingLink.provider,
            eventTitle: eventData.title
          });
        } else {
          logger.warn('Could not generate meeting link for event', {
            organizerId,
            eventTitle: eventData.title,
            locationType: eventData.location.type
          });
        }
      } catch (error) {
        logger.error('Error generating meeting link during event creation', {
          error,
          organizerId,
          eventTitle: eventData.title
        });
        // Continue with event creation even if meeting link generation fails
      }
    }

    const event = await eventService.createEvent(eventData, organizerId, tenantId);

    res.status(201).json({
      success: true,
      message: "Événement créé avec succès",
      data: event.getData(),
    });
  });

  /**
   * Obtenir un événement par ID
   */
  static getEventById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const userId = req.user?.uid;

    const event = await eventService.getEventById(id, userId);

    res.json({
      success: true,
      data: event.getData(),
    });
  });

  /**
   * Obtenir la liste des événements
   */
  static getEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      type: req.query.type as EventType,
      status: req.query.status as EventStatus,
      organizerId: req.query.organizerId as string,
      participantId: req.query.participantId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      searchTerm: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
      isPrivate: req.query.isPrivate ? req.query.isPrivate === "true" : undefined,
      location: req.query.location as "physical" | "virtual" | "hybrid",
    };

    const userId = req.user?.uid;
    const result = await eventService.getEvents(options, userId);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  });

  /**
   * Obtenir mes événements
   */
  static getMyEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      type: req.query.type as EventType,
      status: req.query.status as EventStatus,
    };

    const result = await eventService.getMyEvents(userId, options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  });

  /**
   * Obtenir les événements à venir
   */
  static getUpcomingEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    const limit = parseInt(req.query.limit as string) || 10;

    const events = await eventService.getUpcomingEvents(userId, limit);

    res.json({
      success: true,
      data: events,
    });
  });

  /**
   * Mettre à jour un événement
   */
  static updateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const event = await eventService.updateEvent(id, updates, updatedBy);

    res.json({
      success: true,
      message: "Événement mis à jour avec succès",
      data: event.getData(),
    });
  });

  /**
   * Changer le statut d'un événement
   */
  static changeEventStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {status, reason} = req.body;
    const updatedBy = req.user.uid;

    const event = await eventService.changeEventStatus(id, status, updatedBy, reason);

    res.json({
      success: true,
      message: "Statut de l'événement modifié",
      data: event.getData(),
    });
  });

  /**
   * Dupliquer un événement
   */
  static duplicateEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const modifications = req.body;
    const duplicatedBy = req.user.uid;

    const event = await eventService.duplicateEvent(id, duplicatedBy, modifications);

    res.json({
      success: true,
      message: "Événement dupliqué avec succès",
      data: event.getData(),
    });
  });

  /**
   * Ajouter un participant
   */
  static addParticipant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {userId} = req.body;
    const addedBy = req.user.uid;

    const event = await eventService.addParticipant(id, userId, addedBy);

    res.json({
      success: true,
      message: "Participant ajouté avec succès",
      data: event.getData(),
    });
  });

  /**
   * Supprimer un participant
   */
  static removeParticipant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id, userId} = req.params;
    const {reason} = req.body;
    const removedBy = req.user.uid;

    const event = await eventService.removeParticipant(id, userId, removedBy, reason);

    res.json({
      success: true,
      message: "Participant supprimé avec succès",
      data: event.getData(),
    });
  });

  /**
   * Confirmer un participant
   */
  static confirmParticipant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id, userId} = req.params;
    const confirmedBy = req.user.uid;

    const event = await eventService.confirmParticipant(id, userId, confirmedBy);

    res.json({
      success: true,
      message: "Participant confirmé avec succès",
      data: event.getData(),
    });
  });

  /**
   * Inviter des participants en masse
   */
  static bulkInviteParticipants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {userIds} = req.body;
    const invitedBy = req.user.uid;

    const result = await eventService.bulkInviteParticipants(id, userIds, invitedBy);

    res.json({
      success: true,
      message: `${result.success.length} participants invités, ${result.failed.length} échecs`,
      data: result,
    });
  });

  /**
   * Vérifier les conflits d'horaires
   */
  static checkScheduleConflicts = asyncHandler(async (req: Request, res: Response) => {
    const {startDateTime, endDateTime, participantIds, location, excludeEventId} = req.body;

    const conflicts = await eventService.checkScheduleConflicts(
      new Date(startDateTime),
      new Date(endDateTime),
      participantIds,
      location,
      excludeEventId
    );

    res.json({
      success: true,
      data: conflicts,
    });
  });

  /**
   * Obtenir les analytics d'un événement
   */
  static getEventAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const analytics = await eventService.getEventAnalytics(id);

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Obtenir les statistiques des événements
   */
  static getEventStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizerId = req.query.organizerId as string || req.user?.uid;

    const stats = await eventService.getEventStats(organizerId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Rechercher des événements
   */
  static searchEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {query: searchQuery, filters} = req.body;
    const userId = req.user?.uid;
    const limit = parseInt(req.query.limit as string) || 20;

    const events = await eventService.searchEvents(searchQuery, filters, userId, limit);

    res.json({
      success: true,
      data: events,
    });
  });

  /**
   * Obtenir des recommandations d'événements
   */
  static getRecommendedEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit as string) || 5;

    const events = await eventService.getRecommendedEvents(userId, limit);

    res.json({
      success: true,
      data: events,
    });
  });

  /**
   * Exporter des événements
   */
  static exportEvents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = req.body;
    const format = req.query.format as "csv" | "json" | "excel" || "csv";
    const requesterId = req.user.uid;

    const result = await eventService.exportEvents(filters, format, requesterId);

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.data);
  });

  /**
   * Opérations en lot sur les événements
   */
  static bulkOperations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const operation = req.body;
    const performedBy = req.user.uid;

    const result = await eventService.bulkUpdateEvents(operation, performedBy);

    res.json({
      success: true,
      message: `Opération effectuée: ${result.success.length} succès, ${result.failed.length} échecs`,
      data: result,
    });
  });
}
