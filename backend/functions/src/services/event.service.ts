// backend/functions/src/services/event.service.ts - PARTIE 1/3

import {getFirestore, FieldValue, Query} from "firebase-admin/firestore";
import {EventModel} from "../models/event.model";
import {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  EventType,
  EventStatus,
  EventLocation,
  RecurrenceSettings,
  AttendanceSettings,
  NotificationType,

  ERROR_CODES,
  VALIDATION_RULES} from "@attendance-x/shared";
import {authService} from "./auth.service";
import {userService} from "./user.service";
import * as crypto from "crypto";

// 🔧 INTERFACES ET TYPES
export interface EventListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  type?: EventType;
  status?: EventStatus;
  organizerId?: string;
  participantId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  tags?: string[];
  isPrivate?: boolean;
  location?: "physical" | "virtual" | "hybrid";
}

export interface EventListResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EventStats {
  total: number;
  byStatus: Record<EventStatus, number>;
  byType: Record<EventType, number>;
  upcoming: number;
  ongoing: number;
  completed: number;
  averageAttendance: number;
  totalParticipants: number;
}

export interface EventConflict {
  eventId: string;
  eventTitle: string;
  startDateTime: Date;
  endDateTime: Date;
  conflictType: "overlap" | "same_time" | "location_conflict";
}

export interface RecurrenceOptions {
  template: EventModel;
  recurrence: RecurrenceSettings;
  maxOccurrences?: number;
  endDate?: Date;
}

export interface BulkEventOperation {
  eventIds: string[];
  operation: "cancel" | "duplicate" | "update_status" | "bulk_invite";
  data?: any;
}

// 🏭 CLASSE PRINCIPALE DU SERVICE
export class EventService {
  private readonly db = getFirestore();

  // 🎯 CRÉATION D'ÉVÉNEMENTS
  async createEvent(
    request: CreateEventRequest,
    organizerId: string
  ): Promise<EventModel> {
    try {
      // Validation des données
      await this.validateCreateEventRequest(request);

      // Vérifier les permissions
      if (!await this.canCreateEvent(organizerId)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Récupérer l'organisateur
      const organizer = await userService.getUserById(organizerId);

      // Vérifier les conflits d'horaires
      const conflicts = await this.checkScheduleConflicts(
        request.startDateTime,
        request.endDateTime,
        request.participants,
        request.location
      );

      if (conflicts.length > 0) {
        // Log des conflits mais permettre la création
        console.warn("Schedule conflicts detected:", conflicts);
      }

      // Créer le modèle d'événement
      const event = EventModel.fromCreateRequest(request, organizerId);
      event.getData().organizerName = organizer.getData().displayName;

      // Générer un QR code si requis
      if (request.attendanceSettings.requireQRCode) {
        const qrData = event.generateSecureQRCode();
        console.log("QR Code generated for event:", event.id);
      }

      // Sauvegarder l'événement
      await this.saveEvent(event);

      // Traiter la récurrence si définie
      if (request.recurrence && request.recurrence.type !== "none") {
        await this.createRecurringEvents(event, request.recurrence);
      }

      // Log de l'audit
      await this.logEventAction("event_created", event.id!, organizerId, {
        type: request.type,
        participantCount: request.participants.length,
        hasRecurrence: request.recurrence?.type !== "none",
      });

      return event;
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // 🔄 GESTION DES ÉVÉNEMENTS RÉCURRENTS
  async createRecurringEvents(
    template: EventModel,
    recurrence: RecurrenceSettings
  ): Promise<EventModel[]> {
    const events: EventModel[] = [];
    const seriesId = crypto.randomUUID();

    // Mettre à jour l'événement template
    template.update({seriesId});
    await this.saveEvent(template);

    const occurrences = this.calculateRecurrenceOccurrences(template, recurrence);

    // Créer en lot pour optimiser
    const batch = this.db.batch();

    for (const occurrence of occurrences) {
      const eventData = {
        ...template.getData(),
        id: undefined,
        startDateTime: occurrence.startDateTime,
        endDateTime: occurrence.endDateTime,
        parentEventId: template.id,
        seriesId,
        status: EventStatus.PUBLISHED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const recurringEvent = new EventModel(eventData);
      const eventRef = this.db.collection("events").doc();

      batch.set(eventRef, recurringEvent.toFirestore());
      events.push(recurringEvent);
    }

    await batch.commit();

    // Log de l'audit
    await this.logEventAction("recurring_events_created", template.id!, template.getData().organizerId, {
      seriesId,
      occurrencesCount: events.length,
      recurrenceType: recurrence.type,
    });

    return events;
  }

  private calculateRecurrenceOccurrences(
    template: EventModel,
    recurrence: RecurrenceSettings
  ): Array<{ startDateTime: Date; endDateTime: Date }> {
    const occurrences = [];
    const templateData = template.getData();
    const duration = templateData.endDateTime.getTime() - templateData.startDateTime.getTime();

    let currentDate = new Date(templateData.startDateTime);
    let count = 0;
    const maxOccurrences = recurrence.occurrences || 52; // Limite par défaut

    while (count < maxOccurrences) {
      // Calculer la prochaine occurrence
      const nextDate = this.getNextRecurrenceDate(currentDate, recurrence);

      if (recurrence.endDate && nextDate > recurrence.endDate) {
        break;
      }

      // Vérifier les exceptions
      const isException = recurrence.exceptions?.some((exception) =>
        this.isSameDay(nextDate, exception)
      );

      if (!isException) {
        occurrences.push({
          startDateTime: new Date(nextDate),
          endDateTime: new Date(nextDate.getTime() + duration),
        });
      }

      currentDate = nextDate;
      count++;
    }

    return occurrences;
  }

  private getNextRecurrenceDate(currentDate: Date, recurrence: RecurrenceSettings): Date {
    const next = new Date(currentDate);

    switch (recurrence.type) {
    case "daily":
      next.setDate(next.getDate() + recurrence.interval);
      break;

    case "weekly":
      next.setDate(next.getDate() + (7 * recurrence.interval));
      break;

    case "monthly":
      next.setMonth(next.getMonth() + recurrence.interval);
      break;

    case "yearly":
      next.setFullYear(next.getFullYear() + recurrence.interval);
      break;

    case "custom":
      // Implémentation personnalisée basée sur customPattern
      // Pour l'instant, par défaut hebdomadaire
      next.setDate(next.getDate() + 7);
      break;
    }

    return next;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // 📋 RÉCUPÉRATION D'ÉVÉNEMENTS
  async getEventById(eventId: string, userId?: string): Promise<EventModel> {
    const eventDoc = await this.db.collection("events").doc(eventId).get();

    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }

    const event = EventModel.fromFirestore(eventDoc);
    if (!event) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }

    // Vérifier les permissions de lecture
    if (userId && !await this.canViewEvent(userId, event)) {
      throw new Error(ERROR_CODES.FORBIDDEN);
    }

    return event;
  }

  async getEvents(options: EventListOptions = {}, requesterId?: string): Promise<EventListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = "startDateTime",
      sortOrder = "asc",
      type,
      status,
      organizerId,
      participantId,
      startDate,
      endDate,
      searchTerm,
      tags,
      isPrivate,
      location,
    } = options;

    // Validation de la pagination
    if (page < 1 || limit < 1 || limit > VALIDATION_RULES.PAGINATION.MAX_LIMIT) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = this.db.collection("events");

    // Filtres de base
    if (type) {
      query = query.where("type", "==", type);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    if (organizerId) {
      query = query.where("organizerId", "==", organizerId);
    }

    if (participantId) {
      query = query.where("participants", "array-contains", participantId);
    }

    if (isPrivate !== undefined) {
      query = query.where("isPrivate", "==", isPrivate);
    }

    if (location) {
      query = query.where("location.type", "==", location);
    }

    // Filtre par plage de dates
    if (startDate) {
      query = query.where("startDateTime", ">=", startDate);
    }

    if (endDate) {
      query = query.where("startDateTime", "<=", endDate);
    }

    // Filtre par tags
    if (tags && tags.length > 0) {
      query = query.where("tags", "array-contains-any", tags);
    }

    // Recherche textuelle (limitation Firestore)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      query = query.where("searchTerms", "array-contains", searchLower);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const events: Event[] = [];

    for (const doc of snapshot.docs) {
      const event = EventModel.fromFirestore(doc);
      if (event && (!requesterId || await this.canViewEvent(requesterId, event))) {
        events.push(event.getData());
      }
    }

    // Compter le total
    const total = await this.countEvents(options, requesterId);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getMyEvents(
    userId: string,
    options: Omit<EventListOptions, "organizerId" | "participantId"> = {}
  ): Promise<EventListResponse> {
    // Récupérer les événements où l'utilisateur est organisateur ou participant
    const [organizedEvents, participatingEvents] = await Promise.all([
      this.getEvents({...options, organizerId: userId}, userId),
      this.getEvents({...options, participantId: userId}, userId),
    ]);

    // Fusionner et dédupliquer
    const eventMap = new Map<string, Event>();

    organizedEvents.events.forEach((event) => eventMap.set(event.id!, event));
    participatingEvents.events.forEach((event) => eventMap.set(event.id!, event));

    const uniqueEvents = Array.from(eventMap.values());

    // Trier selon les options
    const sortBy = options.sortBy || "startDateTime";
    const sortOrder = options.sortOrder || "asc";

    uniqueEvents.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Appliquer la pagination manuellement
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = uniqueEvents.slice(startIndex, endIndex);

    return {
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total: uniqueEvents.length,
        totalPages: Math.ceil(uniqueEvents.length / limit),
        hasNext: endIndex < uniqueEvents.length,
        hasPrev: page > 1,
      },
    };
  }

  async getUpcomingEvents(userId?: string, limit = 10): Promise<Event[]> {
    const now = new Date();
    let query: Query = this.db.collection("events")
      .where("startDateTime", ">", now)
      .where("status", "in", [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS])
      .orderBy("startDateTime", "asc")
      .limit(limit);

    if (userId) {
      // Récupérer les événements où l'utilisateur participe
      query = query.where("participants", "array-contains", userId);
    } else {
      // Événements publics uniquement
      query = query.where("isPrivate", "==", false);
    }

    const snapshot = await query.get();
    const events: Event[] = [];

    for (const doc of snapshot.docs) {
      const event = EventModel.fromFirestore(doc);
      if (event && (!userId || await this.canViewEvent(userId, event))) {
        events.push(event.getData());
      }
    }

    return events;
  }

  // 🔍 VALIDATION ET VÉRIFICATIONS
  private async validateCreateEventRequest(request: CreateEventRequest): Promise<void> {
    // Validation des champs requis
    if (!request.title?.trim()) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!request.description?.trim()) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Validation des longueurs
    if (request.title.length < VALIDATION_RULES.EVENT.TITLE_MIN_LENGTH ||
        request.title.length > VALIDATION_RULES.EVENT.TITLE_MAX_LENGTH) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.description.length > VALIDATION_RULES.EVENT.DESCRIPTION_MAX_LENGTH) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Validation des dates
    if (request.startDateTime >= request.endDateTime) {
      throw new Error(ERROR_CODES.INVALID_DATE_RANGE);
    }

    const now = new Date();
    if (request.startDateTime <= now) {
      throw new Error(ERROR_CODES.INVALID_DATE_RANGE);
    }

    // Validation de la durée
    const durationMinutes = (request.endDateTime.getTime() - request.startDateTime.getTime()) / (1000 * 60);
    if (durationMinutes < VALIDATION_RULES.EVENT.MIN_DURATION_MINUTES) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Validation du type d'événement
    if (!Object.values(EventType).includes(request.type)) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Validation de la localisation
    await this.validateEventLocation(request.location);

    // Validation des participants
    if (request.participants.length === 0) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.maxParticipants && request.participants.length > request.maxParticipants) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Validation des paramètres de présence
    await this.validateAttendanceSettings(request.attendanceSettings);
  }

  private async validateEventLocation(location: EventLocation): Promise<void> {
    if (!location.type) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (location.type === "physical") {
      if (!location.address?.city) {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }
    }

    if (location.type === "virtual") {
      if (!location.virtualUrl) {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }

      // Validation de l'URL
      try {
        new URL(location.virtualUrl);
      } catch {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }
    }

    if (location.type === "hybrid") {
      if (!location.address?.city || !location.virtualUrl) {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }
    }
  }

  private async validateAttendanceSettings(settings: AttendanceSettings): Promise<void> {
    if (settings.lateThresholdMinutes < 0 || settings.lateThresholdMinutes > 180) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (settings.earlyThresholdMinutes < 0 || settings.earlyThresholdMinutes > 180) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (settings.checkInWindow.beforeMinutes < 0 || settings.checkInWindow.beforeMinutes > 1440) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (settings.checkInWindow.afterMinutes < 0 || settings.checkInWindow.afterMinutes > 1440) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }
  }


  // ✏️ MISE À JOUR D'ÉVÉNEMENTS
  async updateEvent(
    eventId: string,
    updates: UpdateEventRequest,
    updatedBy: string
  ): Promise<EventModel> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canEditEvent(updatedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Vérifier si l'événement peut être modifié
    if (!this.canModifyEvent(event)) {
      throw new Error(ERROR_CODES.EVENT_ALREADY_STARTED);
    }

    // Validation des modifications
    await this.validateUpdateRequest(updates, event);

    // Sauvegarder les anciennes valeurs pour l'audit
    const oldValues = {
      title: event.getData().title,
      startDateTime: event.getData().startDateTime,
      endDateTime: event.getData().endDateTime,
      location: event.getData().location,
      maxParticipants: event.getData().maxParticipants,
    };

    // Vérifier les conflits si les dates changent
    if (updates.startDateTime || updates.endDateTime) {
      const newStart = updates.startDateTime || event.getData().startDateTime;
      const newEnd = updates.endDateTime || event.getData().endDateTime;

      const conflicts = await this.checkScheduleConflicts(
        newStart,
        newEnd,
        event.getData().participants,
        updates.location || event.getData().location,
        eventId // Exclure l'événement actuel
      );

      if (conflicts.length > 0) {
        console.warn("Schedule conflicts detected during update:", conflicts);
      }
    }

    // Appliquer les mises à jour
    event.update(updates);

    // Régénérer le QR code si nécessaire
    if (updates.attendanceSettings?.requireQRCode && !event.isQRCodeValid()) {
      event.refreshQRCode();
    }

    await this.saveEvent(event);

    // Notifier les participants des changements importants
    if (this.isSignificantChange(oldValues, updates)) {
      await this.notifyEventUpdate(event, updatedBy, oldValues);
    }

    // Log de l'audit
    await this.logEventAction("bulk_invite_participants", eventId, updatedBy, {
      totalInvited: updates.participants?.length ?? 0,
      successful: updates.participants?.length ?? 0,
      failed: updates.maxParticipants ? updates.maxParticipants - (updates.participants?.length ?? 0) : 0,
    });

    return event;
  }

  // 🔍 DÉTECTION DE CONFLITS
  async checkScheduleConflicts(
    startDateTime: Date,
    endDateTime: Date,
    participantIds: string[],
    location: EventLocation,
    excludeEventId?: string
  ): Promise<EventConflict[]> {
    const conflicts: EventConflict[] = [];

    // Vérifier les conflits pour chaque participant
    for (const participantId of participantIds) {
      const query: Query = this.db.collection("events")
        .where("participants", "array-contains", participantId)
        .where("status", "in", [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS]);

      if (excludeEventId) {
        // Note: Firestore ne supporte pas les requêtes NOT IN,
        // donc on filtre après récupération
      }

      const snapshot = await query.get();

      for (const doc of snapshot.docs) {
        if (excludeEventId && doc.id === excludeEventId) continue;

        const eventData = doc.data() as Event;

        // Vérifier le chevauchement temporel
        if (this.isTimeOverlapping(startDateTime, endDateTime, eventData.startDateTime, eventData.endDateTime)) {
          conflicts.push({
            eventId: doc.id,
            eventTitle: eventData.title,
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime,
            conflictType: "overlap",
          });
        }
      }
    }

    // Vérifier les conflits de lieu (pour les événements physiques)
    if (location.type === "physical" && location.address) {
      const locationConflicts = await this.checkLocationConflicts(
        startDateTime,
        endDateTime,
        location,
        excludeEventId
      );
      conflicts.push(...locationConflicts);
    }

    return conflicts;
  }

  private async checkLocationConflicts(
    startDateTime: Date,
    endDateTime: Date,
    location: EventLocation,
    excludeEventId?: string
  ): Promise<EventConflict[]> {
    const conflicts: EventConflict[] = [];

    // Rechercher les événements dans le même lieu
    const query = this.db.collection("events")
      .where("location.type", "==", "physical")
      .where("status", "in", [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS]);

    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      if (excludeEventId && doc.id === excludeEventId) continue;

      const eventData = doc.data() as Event;

      // Vérifier si c'est le même lieu (approximatif)
      if (this.isSameLocation(location, eventData.location) &&
          this.isTimeOverlapping(startDateTime, endDateTime, eventData.startDateTime, eventData.endDateTime)) {
        conflicts.push({
          eventId: doc.id,
          eventTitle: eventData.title,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          conflictType: "location_conflict",
        });
      }
    }

    return conflicts;
  }

  private isTimeOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  private isSameLocation(loc1: EventLocation, loc2: EventLocation): boolean {
    if (loc1.type !== "physical" || loc2.type !== "physical") return false;

    const addr1 = loc1.address;
    const addr2 = loc2.address;

    if (!addr1 || !addr2) return false;

    // Comparaison simple - en production, utiliser une API de géolocalisation
    return addr1.street === addr2.street &&
           addr1.city === addr2.city &&
           loc1.room === loc2.room;
  }

  // 🔄 GESTION DES CHANGEMENTS DE STATUT
  private async handleStatusChange(
    event: EventModel,
    oldStatus: EventStatus,
    newStatus: EventStatus,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    switch (newStatus) {
    case EventStatus.PUBLISHED:
      await this.handleEventPublished(event, updatedBy);
      break;

    case EventStatus.CANCELLED:
      await this.handleEventCancelled(event, updatedBy, reason);
      break;

    case EventStatus.IN_PROGRESS:
      await this.handleEventStarted(event, updatedBy);
      break;

    case EventStatus.COMPLETED:
      await this.handleEventCompleted(event, updatedBy);
      break;

    case EventStatus.POSTPONED:
      await this.handleEventPostponed(event, updatedBy, reason);
      break;
    }
  }

  private async handleEventPublished(event: EventModel, publishedBy: string): Promise<void> {
    // Vérifier que l'événement peut être publié
    const canPublish = event.canPublish();
    if (!canPublish.canPublish) {
      throw new Error(`Cannot publish event: ${canPublish.reasons.join(", ")}`);
    }

    // Envoyer des notifications aux participants
    await this.notifyEventPublished(event, publishedBy);

    // Programmer les rappels automatiques
    await this.scheduleEventReminders(event);
  }

  private async handleEventCancelled(event: EventModel, cancelledBy: string, reason?: string): Promise<void> {
    // Notifier tous les participants
    await this.notifyEventCancelled(event, cancelledBy, reason);

    // Annuler les rappels programmés
    await this.cancelEventReminders(event.id!);

    // Si c'est un événement récurrent, demander s'il faut annuler toute la série
    if (event.getData().seriesId) {
      // Log pour traitement manuel ou automatique
      console.log(`Recurring event ${event.id} cancelled. Series ID: ${event.getData().seriesId}`);
    }
  }

  private async handleEventStarted(event: EventModel, startedBy: string): Promise<void> {
    // Générer un nouveau QR code pour le check-in
    if (event.getData().attendanceSettings.requireQRCode) {
      event.refreshQRCode();
      await this.saveEvent(event);
    }

    // Notifier les participants que l'événement a commencé
    await this.notifyEventStarted(event);
  }

  private async handleEventCompleted(event: EventModel, completedBy: string): Promise<void> {
    // Calculer les statistiques finales
    await this.calculateFinalEventStats(event);

    // Envoyer les demandes de feedback
    if (event.getData().allowFeedback) {
      await this.sendFeedbackRequests(event);
    }

    // Programmer la génération de rapport post-événement
    await this.schedulePostEventReport(event);
  }

  private async handleEventPostponed(event: EventModel, postponedBy: string, reason?: string): Promise<void> {
    // Notifier tous les participants
    await this.notifyEventPostponed(event, postponedBy, reason);

    // Annuler les rappels programmés
    await this.cancelEventReminders(event.id!);
  }

  // 🔒 VÉRIFICATIONS DE PERMISSIONS
  private async canCreateEvent(userId: string): Promise<boolean> {
    return await authService.hasPermission(userId, "create_events");
  }

  private async canEditEvent(userId: string, event: EventModel): Promise<boolean> {
    const eventData = event.getData();

    // L'organisateur peut toujours modifier
    if (eventData.organizerId === userId) {
      return true;
    }

    // Les co-organisateurs peuvent modifier
    if (eventData.coOrganizers.includes(userId)) {
      return true;
    }

    // Vérifier les permissions globales
    return await authService.hasPermission(userId, "edit_events");
  }

  private async canViewEvent(userId: string, event: EventModel): Promise<boolean> {
    const eventData = event.getData();

    // Événements publics visibles par tous
    if (!eventData.isPrivate) {
      return true;
    }

    // Organisateur et co-organisateurs
    if (eventData.organizerId === userId || eventData.coOrganizers.includes(userId)) {
      return true;
    }

    // Participants
    if (eventData.participants.includes(userId)) {
      return true;
    }

    // Permissions administratives
    return await authService.hasPermission(userId, "view_all_events");
  }

  private async canManageParticipants(userId: string, event: EventModel): Promise<boolean> {
    const eventData = event.getData();

    // Organisateur et co-organisateurs
    if (eventData.organizerId === userId || eventData.coOrganizers.includes(userId)) {
      return true;
    }

    // Permissions administratives
    return await authService.hasPermission(userId, "manage_events");
  }

  // 🛠️ MÉTHODES UTILITAIRES
  private canModifyEvent(event: EventModel): boolean {
    const eventData = event.getData();

    // Ne peut pas modifier un événement terminé ou annulé
    if ([EventStatus.COMPLETED, EventStatus.CANCELLED].includes(eventData.status)) {
      return false;
    }

    // Ne peut pas modifier un événement en cours (sauf certains champs)
    if (eventData.status === EventStatus.IN_PROGRESS) {
      return false;
    }

    return true;
  }

  private isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      [EventStatus.PUBLISHED]: [EventStatus.IN_PROGRESS, EventStatus.CANCELLED, EventStatus.POSTPONED],
      [EventStatus.IN_PROGRESS]: [EventStatus.COMPLETED, EventStatus.CANCELLED],
      [EventStatus.COMPLETED]: [], // Pas de transition depuis completed
      [EventStatus.CANCELLED]: [EventStatus.PUBLISHED], // Possibilité de republier
      [EventStatus.POSTPONED]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
      [EventStatus.CONFIRMED]: [EventStatus.PUBLISHED],
      [EventStatus.ARCHIVED]: [],
      [EventStatus.ONGOING]: [EventStatus.COMPLETED, EventStatus.CANCELLED, EventStatus.ARCHIVED],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private isSignificantChange(oldValues: any, updates: UpdateEventRequest): boolean {
    // Changements considérés comme significatifs
    const significantFields = ["startDateTime", "endDateTime", "location", "status"];

    return significantFields.some((field) =>
      updates[field as keyof UpdateEventRequest] !== undefined &&
      updates[field as keyof UpdateEventRequest] !== oldValues[field]
    );
  }

  // Méthode bulkInviteParticipants du EventService

  async bulkInviteParticipants(
    eventId: string,
    userIds: string[],
    invitedBy: string
  ): Promise<{ success: string[]; failed: Array<{ userId: string; error: string }> }> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canManageParticipants(invitedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    const results = {success: [] as string[], failed: [] as Array<{ userId: string; error: string }>};

    // Traitement en lot avec limitation
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      await Promise.all(batch.map(async (userId) => {
        try {
          await this.addParticipant(eventId, userId, invitedBy);
          results.success.push(userId);
        } catch (error) {
          results.failed.push({
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }));
    }

    // Log de l'audit
    await this.logEventAction("bulk_invite_participants", eventId, invitedBy, {
      totalInvited: userIds.length,
      successful: results.success.length,
      failed: results.failed.length,
    });

    return results;
  }

  async changeEventStatus(
    eventId: string,
    newStatus: EventStatus,
    updatedBy: string,
    reason?: string
  ): Promise<EventModel> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canEditEvent(updatedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    const oldStatus = event.getData().status;

    // Validation des transitions de statut
    if (!this.isValidStatusTransition(oldStatus, newStatus)) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    event.updateStatus(newStatus, updatedBy);
    await this.saveEvent(event);

    // Actions spécifiques selon le nouveau statut
    await this.handleStatusChange(event, oldStatus, newStatus, updatedBy, reason);

    return event;
  }

  async duplicateEvent(
    eventId: string,
    duplicatedBy: string,
    modifications?: Partial<CreateEventRequest>
  ): Promise<EventModel> {
    const originalEvent = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canCreateEvent(duplicatedBy)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    const originalData = originalEvent.getData();

    // Créer les nouvelles données
    const duplicateData: CreateEventRequest = {
      title: modifications?.title || `${originalData.title} (Copie)`,
      description: modifications?.description || originalData.description,
      type: modifications?.type || originalData.type,
      startDateTime: modifications?.startDateTime || new Date(originalData.startDateTime.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 jours
      endDateTime: modifications?.endDateTime || new Date(originalData.endDateTime.getTime() + 7 * 24 * 60 * 60 * 1000),
      timezone: modifications?.timezone || originalData.timezone,
      location: modifications?.location || originalData.location,
      participants: modifications?.participants || [],
      attendanceSettings: modifications?.attendanceSettings || originalData.attendanceSettings,
      reminderSettings: modifications?.reminderSettings || originalData.reminderSettings,
      maxParticipants: modifications?.maxParticipants || originalData.maxParticipants,
      registrationRequired: modifications?.registrationRequired ?? originalData.registrationRequired,
      tags: modifications?.tags || originalData.tags,
      category: modifications?.category || originalData.category,
      isPrivate: modifications?.isPrivate ?? originalData.isPrivate,
      priority: modifications?.priority || originalData.priority,
      resources: modifications?.resources || originalData.resources,
    };

    const duplicatedEvent = await this.createEvent(duplicateData, duplicatedBy);

    // Log de l'audit
    await this.logEventAction("event_duplicated", duplicatedEvent.id!, duplicatedBy, {
      originalEventId: eventId,
      modifications: Object.keys(modifications || {}),
    });

    return duplicatedEvent;
  }

  // 👥 GESTION DES PARTICIPANTS
  async addParticipant(
    eventId: string,
    userId: string,
    addedBy: string
  ): Promise<EventModel> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canManageParticipants(addedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Vérifier que l'utilisateur existe
    await userService.getUserById(userId);

    // Vérifier si l'utilisateur peut être ajouté
    if (!event.canRegister()) {
      throw new Error(ERROR_CODES.REGISTRATION_CLOSED);
    }

    try {
      event.addParticipant(userId);
      await this.saveEvent(event);

      // Envoyer une notification au nouveau participant
      await this.notifyNewParticipant(event, userId, addedBy);

      // Log de l'audit
      await this.logEventAction("participant_added", eventId, addedBy, {
        participantId: userId,
        totalParticipants: event.getData().participants.length,
      });

      return event;
    } catch (error) {
      if (error instanceof Error && error.message === "Event is full, added to waiting list") {
        // Log de la liste d'attente
        await this.logEventAction("participant_waitlisted", eventId, addedBy, {
          participantId: userId,
          waitingListPosition: event.getData().waitingList.length,
        });
      }
      throw error;
    }
  }

  async removeParticipant(
    eventId: string,
    userId: string,
    removedBy: string,
    reason?: string
  ): Promise<EventModel> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canManageParticipants(removedBy, event) && removedBy !== userId) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    event.removeParticipant(userId);
    await this.saveEvent(event);

    // Notifier le participant retiré
    await this.notifyParticipantRemoved(event, userId, removedBy, reason);

    // Log de l'audit
    await this.logEventAction("participant_removed", eventId, removedBy, {
      participantId: userId,
      reason,
      totalParticipants: event.getData().participants.length,
    });

    return event;
  }

  async confirmParticipant(
    eventId: string,
    userId: string,
    confirmedBy: string
  ): Promise<EventModel> {
    const event = await this.getEventById(eventId);

    // Vérifier les permissions
    if (!await this.canManageParticipants(confirmedBy, event) && confirmedBy !== userId) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    event.confirmParticipant(userId);
    await this.saveEvent(event);

    // Log de l'audit
    await this.logEventAction("participant_confirmed", eventId, confirmedBy, {
      participantId: userId,
      totalConfirmed: event.getData().confirmedParticipants.length,
    });

    return event;
  }


  // backend/functions/src/services/event.service.ts - PARTIE 3/3

  // 📊 STATISTIQUES ET ANALYSES
  async getEventStats(organizerId?: string): Promise<EventStats> {
    let baseQuery: Query = this.db.collection("events");

    if (organizerId) {
      baseQuery = baseQuery.where("organizerId", "==", organizerId);
    }

    const [totalEvents, eventsByStatus, eventsByType, upcomingEvents, ongoingEvents, completedEvents] = await Promise.all([
      baseQuery.get(),
      this.getEventsByStatus(organizerId),
      this.getEventsByType(organizerId),
      this.getUpcomingEventsCount(organizerId),
      this.getOngoingEventsCount(organizerId),
      this.getCompletedEventsCount(organizerId),
    ]);

    // Calculer la moyenne de participation
    const attendanceStats = await this.calculateAverageAttendance(organizerId);

    return {
      total: totalEvents.size,
      byStatus: eventsByStatus,
      byType: eventsByType,
      upcoming: upcomingEvents,
      ongoing: ongoingEvents,
      completed: completedEvents,
      averageAttendance: attendanceStats.averageAttendance,
      totalParticipants: attendanceStats.totalParticipants,
    };
  }

  async getEventAnalytics(eventId: string): Promise<any> {
    const event = await this.getEventById(eventId);
    const eventData = event.getData();

    // Récupérer les données de présence
    const attendanceQuery = await this.db
      .collection("attendances")
      .where("eventId", "==", eventId)
      .get();

    const attendances = attendanceQuery.docs.map((doc) => doc.data());

    // Calculer les métriques
    const analytics = {
      event: {
        id: eventData.id,
        title: eventData.title,
        type: eventData.type,
        status: eventData.status,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
      },
      participants: {
        invited: eventData.participants.length,
        confirmed: eventData.confirmedParticipants.length,
        attended: attendances.filter((a) => a.status === "present").length,
        absent: attendances.filter((a) => a.status === "absent").length,
        late: attendances.filter((a) => a.status === "late").length,
        excused: attendances.filter((a) => a.status === "excused").length,
      },
      rates: {
        confirmationRate: eventData.participants.length > 0 ?
          (eventData.confirmedParticipants.length / eventData.participants.length) * 100 :
          0,
        attendanceRate: eventData.stats.attendanceRate,
        punctualityRate: eventData.stats.punctualityRate,
      },
      timing: {
        averageCheckInTime: this.calculateAverageCheckInTime(attendances),
        averageLateness: this.calculateAverageLateness(attendances),
        durationMinutes: event.getDurationMinutes(),
      },
      feedback: await this.getEventFeedbackStats(eventId),
    };

    return analytics;
  }

  private async calculateAverageAttendance(organizerId?: string): Promise<{ averageAttendance: number; totalParticipants: number }> {
    let query: Query = this.db.collection("events")
      .where("status", "==", EventStatus.COMPLETED);

    if (organizerId) {
      query = query.where("organizerId", "==", organizerId);
    }

    const completedEvents = await query.get();
    let totalAttendanceRate = 0;
    let totalParticipants = 0;
    let eventsWithStats = 0;

    completedEvents.docs.forEach((doc) => {
      const eventData = doc.data() as Event;
      if (eventData.stats.attendanceRate > 0) {
        totalAttendanceRate += eventData.stats.attendanceRate;
        totalParticipants += eventData.stats.totalPresent;
        eventsWithStats++;
      }
    });

    return {
      averageAttendance: eventsWithStats > 0 ? totalAttendanceRate / eventsWithStats : 0,
      totalParticipants,
    };
  }

  private calculateAverageCheckInTime(attendances: any[]): number {
    const checkIns = attendances.filter((a) => a.checkInTime && a.status === "present");
    if (checkIns.length === 0) return 0;

    const totalMinutes = checkIns.reduce((sum, attendance) => {
      // Calcul du délai par rapport à l'heure de début (simulation)
      return sum + 5; // Valeur fictive pour l'exemple
    }, 0);

    return totalMinutes / checkIns.length;
  }

  private calculateAverageLateness(attendances: any[]): number {
    const lateAttendances = attendances.filter((a) => a.status === "late" && a.metrics?.lateMinutes);
    if (lateAttendances.length === 0) return 0;

    const totalLateMinutes = lateAttendances.reduce((sum, a) => sum + (a.metrics.lateMinutes || 0), 0);
    return totalLateMinutes / lateAttendances.length;
  }

  private async getEventFeedbackStats(eventId: string): Promise<any> {
    const attendanceQuery = await this.db
      .collection("attendances")
      .where("eventId", "==", eventId)
      .where("feedback", "!=", null)
      .get();

    const feedbacks = attendanceQuery.docs
      .map((doc) => doc.data().feedback)
      .filter((f) => f && f.rating);

    if (feedbacks.length === 0) {
      return {averageRating: 0, totalFeedbacks: 0, recommendationRate: 0};
    }

    const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
    const recommendations = feedbacks.filter((f) => f.wouldRecommend === true).length;
    const recommendationRate = (recommendations / feedbacks.length) * 100;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedbacks: feedbacks.length,
      recommendationRate: Math.round(recommendationRate * 10) / 10,
    };
  }

  // 📅 GESTION DES RAPPELS ET NOTIFICATIONS
  private async scheduleEventReminders(event: EventModel): Promise<void> {
    const eventData = event.getData();

    if (!eventData.reminderSettings.enabled) {
      return;
    }

    const reminders = eventData.reminderSettings.intervals.map((minutesBefore) => ({
      eventId: event.id!,
      scheduledFor: new Date(eventData.startDateTime.getTime() - minutesBefore * 60 * 1000),
      type: NotificationType.EVENT_REMINDER,
      recipients: eventData.reminderSettings.sendToParticipants ? eventData.participants : [],
      organizers: eventData.reminderSettings.sendToOrganizers ? [eventData.organizerId, ...eventData.coOrganizers] : [],
      channels: eventData.reminderSettings.channels,
      customMessage: eventData.reminderSettings.customMessage,
    }));

    // Sauvegarder les rappels programmés
    const batch = this.db.batch();
    reminders.forEach((reminder) => {
      const reminderRef = this.db.collection("scheduled_notifications").doc();
      batch.set(reminderRef, reminder);
    });

    await batch.commit();
  }

  private async cancelEventReminders(eventId: string): Promise<void> {
    const remindersQuery = await this.db
      .collection("scheduled_notifications")
      .where("eventId", "==", eventId)
      .where("sent", "==", false)
      .get();

    if (!remindersQuery.empty) {
      const batch = this.db.batch();
      remindersQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {cancelled: true});
      });
      await batch.commit();
    }
  }

  // 📧 MÉTHODES DE NOTIFICATION (STUBS - À IMPLÉMENTER AVEC NOTIFICATION SERVICE)
  private async notifyEventUpdate(event: EventModel, updatedBy: string, oldValues: any): Promise<void> {
    console.log(`Event ${event.id} updated by ${updatedBy}. Changes:`, oldValues);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyNewParticipant(event: EventModel, userId: string, addedBy: string): Promise<void> {
    console.log(`New participant ${userId} added to event ${event.id} by ${addedBy}`);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyParticipantRemoved(event: EventModel, userId: string, removedBy: string, reason?: string): Promise<void> {
    console.log(`Participant ${userId} removed from event ${event.id} by ${removedBy}. Reason: ${reason}`);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyEventPublished(event: EventModel, publishedBy: string): Promise<void> {
    console.log(`Event ${event.id} published by ${publishedBy}`);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyEventCancelled(event: EventModel, cancelledBy: string, reason?: string): Promise<void> {
    console.log(`Event ${event.id} cancelled by ${cancelledBy}. Reason: ${reason}`);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyEventStarted(event: EventModel): Promise<void> {
    console.log(`Event ${event.id} started`);
    // TODO: Implémenter avec NotificationService
  }

  private async notifyEventPostponed(event: EventModel, postponedBy: string, reason?: string): Promise<void> {
    console.log(`Event ${event.id} postponed by ${postponedBy}. Reason: ${reason}`);
    // TODO: Implémenter avec NotificationService
  }

  private async sendFeedbackRequests(event: EventModel): Promise<void> {
    console.log(`Sending feedback requests for event ${event.id}`);
    // TODO: Implémenter avec NotificationService
  }

  // 📈 MÉTHODES DE CALCUL DE STATISTIQUES
  private async getEventsByStatus(organizerId?: string): Promise<Record<EventStatus, number>> {
    const results: Record<EventStatus, number> = {} as any;

    await Promise.all(
      Object.values(EventStatus).map(async (status) => {
        let query: Query = this.db.collection("events").where("status", "==", status);

        if (organizerId) {
          query = query.where("organizerId", "==", organizerId);
        }

        const snapshot = await query.get();
        results[status] = snapshot.size;
      })
    );

    return results;
  }

  private async getEventsByType(organizerId?: string): Promise<Record<EventType, number>> {
    const results: Record<EventType, number> = {} as any;

    await Promise.all(
      Object.values(EventType).map(async (type) => {
        let query: Query = this.db.collection("events").where("type", "==", type);

        if (organizerId) {
          query = query.where("organizerId", "==", organizerId);
        }

        const snapshot = await query.get();
        results[type] = snapshot.size;
      })
    );

    return results;
  }

  private async getUpcomingEventsCount(organizerId?: string): Promise<number> {
    const now = new Date();
    let query: Query = this.db.collection("events")
      .where("startDateTime", ">", now)
      .where("status", "in", [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS]);

    if (organizerId) {
      query = query.where("organizerId", "==", organizerId);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async getOngoingEventsCount(organizerId?: string): Promise<number> {
    let query: Query = this.db.collection("events")
      .where("status", "==", EventStatus.IN_PROGRESS);

    if (organizerId) {
      query = query.where("organizerId", "==", organizerId);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async getCompletedEventsCount(organizerId?: string): Promise<number> {
    let query: Query = this.db.collection("events")
      .where("status", "==", EventStatus.COMPLETED);

    if (organizerId) {
      query = query.where("organizerId", "==", organizerId);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  // 🗃️ MÉTHODES UTILITAIRES
  private async validateUpdateRequest(updates: UpdateEventRequest, event: EventModel): Promise<void> {
    // Validation similaire à createEvent mais pour les mises à jour
    if (updates.title !== undefined) {
      if (!updates.title.trim() ||
          updates.title.length < VALIDATION_RULES.EVENT.TITLE_MIN_LENGTH ||
          updates.title.length > VALIDATION_RULES.EVENT.TITLE_MAX_LENGTH) {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }
    }

    if (updates.description !== undefined) {
      if (updates.description.length > VALIDATION_RULES.EVENT.DESCRIPTION_MAX_LENGTH) {
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }
    }

    if (updates.startDateTime || updates.endDateTime) {
      const newStart = updates.startDateTime || event.getData().startDateTime;
      const newEnd = updates.endDateTime || event.getData().endDateTime;

      if (newStart >= newEnd) {
        throw new Error(ERROR_CODES.INVALID_DATE_RANGE);
      }

      const now = new Date();
      if (newStart <= now) {
        throw new Error(ERROR_CODES.INVALID_DATE_RANGE);
      }
    }

    if (updates.location) {
      await this.validateEventLocation(updates.location);
    }

    if (updates.attendanceSettings) {
      await this.validateAttendanceSettings(updates.attendanceSettings);
    }
  }

  private async countEvents(options: EventListOptions, requesterId?: string): Promise<number> {
    let query: Query = this.db.collection("events");

    // Appliquer les mêmes filtres que dans getEvents
    const {
      type, status, organizerId, participantId, startDate, endDate,
      tags, isPrivate, location, searchTerm,
    } = options;

    if (type) query = query.where("type", "==", type);
    if (status) query = query.where("status", "==", status);
    if (organizerId) query = query.where("organizerId", "==", organizerId);
    if (participantId) query = query.where("participants", "array-contains", participantId);
    if (isPrivate !== undefined) query = query.where("isPrivate", "==", isPrivate);
    if (location) query = query.where("location.type", "==", location);
    if (startDate) query = query.where("startDateTime", ">=", startDate);
    if (endDate) query = query.where("startDateTime", "<=", endDate);
    if (tags && tags.length > 0) query = query.where("tags", "array-contains-any", tags);
    if (searchTerm) query = query.where("searchTerms", "array-contains", searchTerm.toLowerCase());

    const snapshot = await query.get();

    // Filtrer selon les permissions si nécessaire
    if (requesterId) {
      let count = 0;
      for (const doc of snapshot.docs) {
        const event = EventModel.fromFirestore(doc);
        if (event && await this.canViewEvent(requesterId, event)) {
          count++;
        }
      }
      return count;
    }

    return snapshot.size;
  }

  private async calculateFinalEventStats(event: EventModel): Promise<void> {
    const eventData = event.getData();

    // Récupérer les données de présence
    const attendanceQuery = await this.db
      .collection("attendances")
      .where("eventId", "==", event.id)
      .get();

    const attendances = attendanceQuery.docs.map((doc) => doc.data());

    // Calculer les statistiques finales
    const stats = {
      totalPresent: attendances.filter((a) => a.status === "present").length,
      totalAbsent: attendances.filter((a) => a.status === "absent").length,
      totalLate: attendances.filter((a) => a.status === "late").length,
      totalExcused: attendances.filter((a) => a.status === "excused").length,
      attendanceRate: 0,
      punctualityRate: 0,
    };

    if (eventData.participants.length > 0) {
      stats.attendanceRate = (stats.totalPresent / eventData.participants.length) * 100;
    }

    if (stats.totalPresent > 0) {
      stats.punctualityRate = ((stats.totalPresent - stats.totalLate) / stats.totalPresent) * 100;
    }

    // Mettre à jour l'événement
    event.update({stats: {...eventData.stats, ...stats}});
    await this.saveEvent(event);
  }

  private async schedulePostEventReport(event: EventModel): Promise<void> {
    console.log(`Scheduling post-event report for ${event.id}`);
    // TODO: Implémenter la programmation de rapport avec le service de rapports
  }

  private async saveEvent(event: EventModel): Promise<void> {
    await event.validate();
    await this.db
      .collection("events")
      .doc(event.id!)
      .set(event.toFirestore(), {merge: true});
  }

  private async logEventAction(
    action: string,
    eventId: string,
    performedBy: string,
    details?: any
  ): Promise<void> {
    await this.db.collection("audit_logs").add({
      action,
      targetType: "event",
      targetId: eventId,
      performedBy,
      performedAt: new Date(),
      details,
    });
  }

  // 🧹 MÉTHODES DE NETTOYAGE
  async cleanupExpiredEvents(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours

    // Nettoyer les QR codes expirés
    const expiredQREvents = await this.db
      .collection("events")
      .where("qrCodeExpiresAt", "<", new Date())
      .get();

    const batch = this.db.batch();
    expiredQREvents.docs.forEach((doc) => {
      batch.update(doc.ref, {
        qrCode: FieldValue.delete(),
        qrCodeExpiresAt: FieldValue.delete(),
      });
    });

    await batch.commit();

    // Nettoyer les anciens événements brouillon
    const oldDrafts = await this.db
      .collection("events")
      .where("status", "==", EventStatus.DRAFT)
      .where("createdAt", "<", cutoffDate)
      .get();

    if (!oldDrafts.empty) {
      const deleteBatch = this.db.batch();
      oldDrafts.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
    }
  }

  // 🔄 OPÉRATIONS EN LOT
  async bulkUpdateEvents(
    operation: BulkEventOperation,
    performedBy: string
  ): Promise<{ success: string[]; failed: Array<{ eventId: string; error: string }> }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ eventId: string; error: string }>,
    };

    // Vérifier les permissions globales
    if (!await authService.hasPermission(performedBy, "manage_events")) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Traitement en lot avec limitation
    const batchSize = 10;
    for (let i = 0; i < operation.eventIds.length; i += batchSize) {
      const batch = operation.eventIds.slice(i, i + batchSize);

      await Promise.all(batch.map(async (eventId) => {
        try {
          switch (operation.operation) {
          case "cancel":
            await this.changeEventStatus(eventId, EventStatus.CANCELLED, performedBy, operation.data?.reason);
            break;

          case "duplicate":
            await this.duplicateEvent(eventId, performedBy, operation.data?.modifications);
            break;

          case "update_status":
            await this.changeEventStatus(eventId, operation.data.status, performedBy, operation.data?.reason);
            break;

          case "bulk_invite":
            await this.bulkInviteParticipants(eventId, operation.data.userIds, performedBy);
            break;

          default:
            throw new Error("Unknown bulk operation");
          }

          results.success.push(eventId);
        } catch (error) {
          results.failed.push({
            eventId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }));
    }

    // Log de l'audit
    await this.logEventAction("bulk_operation", "multiple", performedBy, {
      operation: operation.operation,
      totalEvents: operation.eventIds.length,
      successful: results.success.length,
      failed: results.failed.length,
    });

    return results;
  }

  // 🔍 RECHERCHE AVANCÉE
  async searchEvents(
    searchQuery: string,
    filters: {
      types?: EventType[];
      statuses?: EventStatus[];
      dateRange?: { start: Date; end: Date };
      organizerIds?: string[];
      tags?: string[];
      location?: string;
    } = {},
    userId?: string,
    limit = 20
  ): Promise<Event[]> {
    // Recherche textuelle de base (limites de Firestore)
    let query: Query = this.db.collection("events");

    // Filtres
    if (filters.types && filters.types.length > 0) {
      query = query.where("type", "in", filters.types);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.where("status", "in", filters.statuses);
    }

    if (filters.organizerIds && filters.organizerIds.length > 0) {
      query = query.where("organizerId", "in", filters.organizerIds);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.where("tags", "array-contains-any", filters.tags);
    }

    if (filters.dateRange) {
      query = query.where("startDateTime", ">=", filters.dateRange.start)
        .where("startDateTime", "<=", filters.dateRange.end);
    }

    // Recherche textuelle basique
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(" ").filter((term) => term.length > 2);
      if (searchTerms.length > 0) {
        query = query.where("searchTerms", "array-contains-any", searchTerms);
      }
    }

    query = query.orderBy("startDateTime", "desc").limit(limit);

    const snapshot = await query.get();
    const events: Event[] = [];

    for (const doc of snapshot.docs) {
      const event = EventModel.fromFirestore(doc);
      if (event && (!userId || await this.canViewEvent(userId, event))) {
        events.push(event.getData());
      }
    }

    return events;
  }

  // 📅 MÉTHODES SPÉCIALISÉES POUR LES ÉVÉNEMENTS RÉCURRENTS
  async updateRecurringSeries(
    seriesId: string,
    updates: UpdateEventRequest,
    updatedBy: string,
    updateType: "this_only" | "this_and_future" | "all" = "this_and_future"
  ): Promise<EventModel[]> {
    const seriesEvents = await this.db
      .collection("events")
      .where("seriesId", "==", seriesId)
      .orderBy("startDateTime", "asc")
      .get();

    if (seriesEvents.empty) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }

    const events = seriesEvents.docs.map((doc) => EventModel.fromFirestore(doc)).filter((e) => e !== null) as EventModel[];
    const updatedEvents: EventModel[] = [];

    for (const event of events) {
      // Vérifier les permissions pour chaque événement
      if (!await this.canEditEvent(updatedBy, event)) {
        continue;
      }

      // Appliquer les mises à jour selon le type
      if (updateType === "all" ||
          (updateType === "this_and_future" && event.getData().startDateTime >= new Date())) {
        event.update(updates);
        await this.saveEvent(event);
        updatedEvents.push(event);
      }
    }

    // Log de l'audit
    await this.logEventAction("recurring_series_updated", seriesId, updatedBy, {
      updateType,
      eventsUpdated: updatedEvents.length,
      totalInSeries: events.length,
    });

    return updatedEvents;
  }

  async cancelRecurringSeries(
    seriesId: string,
    cancelledBy: string,
    reason?: string,
    cancelType: "this_and_future" | "all" = "this_and_future"
  ): Promise<EventModel[]> {
    const seriesEvents = await this.db
      .collection("events")
      .where("seriesId", "==", seriesId)
      .orderBy("startDateTime", "asc")
      .get();

    if (seriesEvents.empty) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }

    const events = seriesEvents.docs.map((doc) => EventModel.fromFirestore(doc)).filter((e) => e !== null) as EventModel[];
    const cancelledEvents: EventModel[] = [];

    for (const event of events) {
      // Vérifier les permissions
      if (!await this.canEditEvent(cancelledBy, event)) {
        continue;
      }

      // Annuler selon le type
      const shouldCancel = cancelType === "all" ||
                          (cancelType === "this_and_future" && event.getData().startDateTime >= new Date());

      if (shouldCancel && event.getData().status !== EventStatus.CANCELLED) {
        await this.changeEventStatus(event.id!, EventStatus.CANCELLED, cancelledBy, reason);
        cancelledEvents.push(event);
      }
    }

    return cancelledEvents;
  }

  // 📊 MÉTHODES D'EXPORT ET DE RAPPORT
  async exportEvents(
    filters: EventListOptions,
    format: "csv" | "json" | "excel",
    requesterId: string
  ): Promise<{ data: any; filename: string; mimeType: string }> {
    // Vérifier les permissions d'export
    if (!await authService.hasPermission(requesterId, "export_event_data")) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Récupérer tous les événements selon les filtres (sans pagination)
    const events = await this.getEvents({...filters, limit: 10000}, requesterId);

    const timestamp = new Date().toISOString().split("T")[0];

    switch (format) {
    case "json":
      return {
        data: JSON.stringify(events.events, null, 2),
        filename: `events_export_${timestamp}.json`,
        mimeType: "application/json",
      };

    case "csv":
      const csvData = this.convertEventsToCSV(events.events);
      return {
        data: csvData,
        filename: `events_export_${timestamp}.csv`,
        mimeType: "text/csv",
      };

    case "excel":
      // TODO: Implémenter l'export Excel avec une bibliothèque appropriée
      throw new Error("Excel export not implemented yet");

    default:
      throw new Error("Unsupported export format");
    }
  }

  private convertEventsToCSV(events: Event[]): string {
    if (events.length === 0) return "No events to export";

    const headers = [
      "ID", "Title", "Type", "Status", "Start Date", "End Date",
      "Organizer", "Participants Count", "Location Type", "Location Address",
      "Is Private", "Tags", "Created At",
    ];

    const rows = events.map((event) => [
      event.id || "",
      event.title,
      event.type,
      event.status,
      event.startDateTime.toISOString(),
      event.endDateTime.toISOString(),
      event.organizerName,
      event.participants.length.toString(),
      event.location.type,
      event.location.address?.city || "",
      event.isPrivate.toString(),
      event.tags.join(";"),
      event.createdAt.toISOString(),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
  }

  // 🎯 MÉTHODES DE RECOMMANDATIONS
  async getRecommendedEvents(userId: string, limit = 5): Promise<Event[]> {
    // Récupérer l'historique de l'utilisateur
    const userHistory = await this.db
      .collection("attendances")
      .where("userId", "==", userId)
      .limit(50)
      .get();

    const attendedEventIds = userHistory.docs.map((doc) => doc.data().eventId);

    if (attendedEventIds.length === 0) {
      // Utilisateur nouveau - retourner des événements populaires
      return this.getPopularEvents(limit);
    }

    // Analyser les préférences (types d'événements, heures, etc.)
    const preferences = await this.analyzeUserPreferences(attendedEventIds);

    // Recommander des événements similaires
    let query: Query = this.db.collection("events")
      .where("status", "==", EventStatus.PUBLISHED)
      .where("startDateTime", ">", new Date())
      .where("isPrivate", "==", false);

    if (preferences.preferredTypes.length > 0) {
      query = query.where("type", "in", preferences.preferredTypes);
    }

    const snapshot = await query.orderBy("startDateTime", "asc").limit(limit * 2).get();

    const events: Event[] = [];
    for (const doc of snapshot.docs) {
      if (events.length >= limit) break;

      const event = EventModel.fromFirestore(doc);
      if (event && !event.getData().participants.includes(userId)) {
        events.push(event.getData());
      }
    }

    return events;
  }

  private async getPopularEvents(limit: number): Promise<Event[]> {
    const query = await this.db
      .collection("events")
      .where("status", "==", EventStatus.PUBLISHED)
      .where("startDateTime", ">", new Date())
      .where("isPrivate", "==", false)
      .orderBy("stats.totalConfirmed", "desc")
      .limit(limit)
      .get();

    return query.docs
      .map((doc) => EventModel.fromFirestore(doc))
      .filter((event) => event !== null)
      .map((event) => event!.getData());
  }

  private async analyzeUserPreferences(eventIds: string[]): Promise<{ preferredTypes: EventType[] }> {
    const events = await Promise.all(
      eventIds.map((id) => this.db.collection("events").doc(id).get())
    );

    const typeCount: Record<string, number> = {};

    events.forEach((doc) => {
      if (doc.exists) {
        const eventData = doc.data() as Event;
        typeCount[eventData.type] = (typeCount[eventData.type] || 0) + 1;
      }
    });

    // Retourner les types les plus fréquents
    const sortedTypes = Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type as EventType);

    return {preferredTypes: sortedTypes};
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const eventService = new EventService();
