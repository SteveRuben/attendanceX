import {Request, Response} from "express";
import {eventService} from "../services/event.service";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthenticatedRequest } from "../middleware/auth";
import { EventStatus, EventType } from "@attendance-x/shared";

/**
 * Contrôleur de gestion des événements
 */
export class EventController {
  /**
   * Créer un événement
   */
  static createEvent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizerId = req.user.uid;
    const eventData = req.body;

    const event = await eventService.createEvent(eventData, organizerId);

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
