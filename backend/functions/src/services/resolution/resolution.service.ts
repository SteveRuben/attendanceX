import { logger } from "firebase-functions";
import { collections } from "../../config";
import {
  ResolutionModel,
  Resolution,
  CreateResolutionRequest,
  UpdateResolutionRequest,
  ResolutionStatus,
  ResolutionPriority
} from "../../models/resolution.model";
import { EventModel } from "../../models/event.model";
import { UserService } from "../user/user.service";
import { NotificationService } from "../notification/notification.service";
import { NotificationChannel, NotificationPriority } from "common/types";

/**
 * Interface pour les filtres de résolution
 */
interface ResolutionFilters {
  status?: ResolutionStatus;
  assignedTo?: string;
  priority?: ResolutionPriority;
  overdue?: boolean;
}

/**
 * Interface pour les options de pagination et tri
 */
interface QueryOptions {
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * Interface pour les résultats paginés
 */
interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface pour les statistiques des résolutions
 */
interface ResolutionStats {
  total: number;
  byStatus: Record<ResolutionStatus, number>;
  byPriority: Record<ResolutionPriority, number>;
  overdue: number;
  completionRate: number;
  averageCompletionTime: number; // en jours
  myTasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
}

/**
 * Service pour la gestion des résolutions de réunion
 */
export class ResolutionService {

  /**
   * Créer une nouvelle résolution
   */
  static async createResolution(
    request: CreateResolutionRequest,
    createdBy: string,
    tenantId: string
  ): Promise<Resolution> {
    try {
      logger.info(`Creating resolution for event ${request.eventId} by user ${createdBy}`);

      // Vérifier que l'événement existe et est une réunion
      const eventDoc = await collections.events.doc(request.eventId).get();
      if (!eventDoc.exists) {
        throw new Error("Event not found");
      }

      const event = EventModel.fromFirestore(eventDoc);
      if (!event) {
        throw new Error("Event not found");
      }

      // Vérifier que c'est une réunion
      if (!event.isMeeting()) {
        throw new Error("Resolutions can only be created for meeting events");
      }

      // Vérifier les permissions (créateur de l'événement ou participant)
      if (event.getData().organizerId !== createdBy && !event.getData().participants.includes(createdBy)) {
        throw new Error("Permission denied: You must be the event organizer or a participant");
      }

      // Vérifier que les utilisateurs assignés existent
      const assignedUsers = await Promise.all(
        request.assignedTo.map(userId => UserService.getUserById(userId, tenantId))
      );

      const validAssignees = assignedUsers.filter(user => user !== null);
      if (validAssignees.length !== request.assignedTo.length) {
        throw new Error("One or more assigned users not found");
      }

      // Créer le modèle de résolution
      const resolutionModel = ResolutionModel.fromCreateRequest(request, createdBy, tenantId);

      // Valider les données
      await resolutionModel.validate();

      // Ajouter les noms des assignés pour l'affichage
      resolutionModel.getData().assignedToNames = validAssignees.map(user =>
        user?.displayName || user?.email || "Unknown User"
      );

      // Obtenir le nom du créateur
      const creator = await UserService.getUserById(createdBy, tenantId);
      resolutionModel.getData().createdByName = creator?.displayName || creator?.email || "Unknown User";

      // Sauvegarder en base
      const docRef = await collections.resolutions.add(resolutionModel.toFirestore());
      resolutionModel.getData().id = docRef.id;

      logger.info(`Resolution created successfully: ${docRef.id}`);

      // Envoyer des notifications aux assignés
      await this.sendResolutionNotifications(
        resolutionModel.getData(),
        "created",
        createdBy,
        tenantId
      );

      return resolutionModel.getData();

    } catch (error) {
      logger.error("Error creating resolution:", error);
      throw error;
    }
  }

  /**
   * Obtenir les résolutions d'un événement
   */
  static async getEventResolutions(
    eventId: string,
    tenantId: string,
    userId: string,
    filters: ResolutionFilters = {},
    options: QueryOptions
  ): Promise<PaginatedResult<Resolution>> {
    try {
      // Vérifier que l'événement existe et que l'utilisateur a accès
      const eventDoc = await collections.events.doc(eventId).get();
      if (!eventDoc.exists) {
        throw new Error("Event not found");
      }

      const event = EventModel.fromFirestore(eventDoc);
      if (!event) {
        throw new Error("Event not found");
      }

      // Vérifier les permissions
      if (event.getData().organizerId !== userId && !event.getData().participants.includes(userId)) {
        throw new Error("Permission denied: You must be the event organizer or a participant");
      }

      // Construire la requête
      let query = collections.resolutions
        .where("eventId", "==", eventId)
        .where("tenantId", "==", tenantId);

      // Appliquer les filtres
      if (filters.status) {
        query = query.where("status", "==", filters.status);
      }

      if (filters.assignedTo) {
        query = query.where("assignedTo", "array-contains", filters.assignedTo);
      }

      if (filters.priority) {
        query = query.where("priority", "==", filters.priority);
      }

      // Appliquer le tri
      const sortField = this.mapSortField(options.sortBy);
      query = query.orderBy(sortField, options.sortOrder);

      // Appliquer la pagination
      if (options.offset > 0) {
        const offsetQuery = await query.limit(options.offset).get();
        if (!offsetQuery.empty) {
          const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.limit(options.limit + 1).get();
      const hasMore = snapshot.docs.length > options.limit;
      const docs = hasMore ? snapshot.docs.slice(0, options.limit) : snapshot.docs;

      // Convertir en modèles
      const resolutions = docs
        .map(doc => ResolutionModel.fromFirestore(doc))
        .filter(resolution => resolution !== null)
        .map(resolution => resolution!.getData());

      // Filtrer les résolutions en retard si demandé
      let filteredResolutions = resolutions;
      if (filters.overdue) {
        filteredResolutions = resolutions.filter(resolution => {
          return resolution.dueDate &&
            resolution.dueDate < new Date() &&
            resolution.status !== ResolutionStatus.COMPLETED;
        });
      }

      // Obtenir le total (approximatif pour les performances)
      const totalSnapshot = await collections.resolutions
        .where("eventId", "==", eventId)
        .where("tenantId", "==", tenantId)
        .get();

      return {
        items: filteredResolutions,
        total: totalSnapshot.size,
        limit: options.limit,
        offset: options.offset,
        hasMore,
      };

    } catch (error) {
      logger.error("Error getting event resolutions:", error);
      throw error;
    }
  }

  /**
   * Obtenir une résolution par ID
   */
  static async getResolution(
    resolutionId: string,
    tenantId: string,
    userId: string
  ): Promise<Resolution | null> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        return null;
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        return null;
      }

      // Vérifier les permissions
      const canView = await this.canUserAccessResolution(resolution.getData(), userId, tenantId);
      if (!canView) {
        throw new Error("Permission denied: You don't have access to this resolution");
      }

      return resolution.getData();

    } catch (error) {
      logger.error("Error getting resolution:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour une résolution
   */
  static async updateResolution(
    resolutionId: string,
    updateRequest: UpdateResolutionRequest,
    updatedBy: string,
    tenantId: string
  ): Promise<Resolution> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        throw new Error("Resolution not found");
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        throw new Error("Resolution not found");
      }

      // Vérifier les permissions
      if (!resolution.canEdit(updatedBy)) {
        throw new Error("Permission denied: You can only edit resolutions you created or are assigned to");
      }

      // Valider les nouveaux assignés si fournis
      if (updateRequest.assignedTo) {
        const assignedUsers = await Promise.all(
          updateRequest.assignedTo.map(userId => UserService.getUserById(userId, tenantId))
        );

        const validAssignees = assignedUsers.filter(user => user !== null);
        if (validAssignees.length !== updateRequest.assignedTo.length) {
          throw new Error("One or more assigned users not found");
        }

        updateRequest.assignedTo = validAssignees.map(user => user!.id!);
      }

      // Appliquer les mises à jour
      Object.assign(resolution.getData(), updateRequest);
      resolution.getData().updatedAt = new Date();

      // Valider les données mises à jour
      await resolution.validate();

      // Sauvegarder
      await collections.resolutions.doc(resolutionId).update(resolution.toFirestore());

      logger.info(`Resolution ${resolutionId} updated by user ${updatedBy}`);

      // Envoyer des notifications si nécessaire
      if (updateRequest.status || updateRequest.assignedTo) {
        await this.sendResolutionNotifications(
          resolution.getData(),
          "updated",
          updatedBy,
          tenantId
        );
      }

      return resolution.getData();

    } catch (error) {
      logger.error("Error updating resolution:", error);
      throw error;
    }
  }

  /**
   * Supprimer une résolution
   */
  static async deleteResolution(
    resolutionId: string,
    deletedBy: string,
    tenantId: string
  ): Promise<void> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        throw new Error("Resolution not found");
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        throw new Error("Resolution not found");
      }

      // Vérifier les permissions (seul le créateur peut supprimer)
      if (resolution.getData().createdBy !== deletedBy) {
        throw new Error("Permission denied: Only the creator can delete a resolution");
      }

      // Supprimer
      await collections.resolutions.doc(resolutionId).delete();

      logger.info(`Resolution ${resolutionId} deleted by user ${deletedBy}`);

      // Envoyer des notifications
      await this.sendResolutionNotifications(
        resolution.getData(),
        "deleted",
        deletedBy,
        tenantId
      );

    } catch (error) {
      logger.error("Error deleting resolution:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une résolution
   */
  static async updateResolutionStatus(
    resolutionId: string,
    status: ResolutionStatus,
    updatedBy: string,
    tenantId: string
  ): Promise<Resolution> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        throw new Error("Resolution not found");
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        throw new Error("Resolution not found");
      }

      // Vérifier les permissions
      if (!resolution.canEdit(updatedBy)) {
        throw new Error("Permission denied: You can only update resolutions you created or are assigned to");
      }

      // Mettre à jour le statut
      //@ts-ignore
      const oldStatus = resolution.getData().status;
      resolution.getData().status = status;
      resolution.getData().updatedAt = new Date();

      // Auto-update progress based on status
      if (status === ResolutionStatus.COMPLETED) {
        resolution.getData().progress = 100;
      } else if (status === ResolutionStatus.IN_PROGRESS && (resolution.getData().progress || 0) === 0) {
        resolution.getData().progress = 10; // Start with 10% when moving to in progress
      }

      // Sauvegarder
      await collections.resolutions.doc(resolutionId).update(resolution.toFirestore());

      logger.info(`Resolution ${resolutionId} status updated to ${status} by user ${updatedBy}`);

      // Envoyer des notifications
      await this.sendResolutionNotifications(
        resolution.getData(),
        "status_changed",
        updatedBy,
        tenantId
      );

      return resolution.getData();

    } catch (error) {
      logger.error("Error updating resolution status:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour le progrès d'une résolution
   */
  static async updateResolutionProgress(
    resolutionId: string,
    progress: number,
    updatedBy: string,
    tenantId: string
  ): Promise<Resolution> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        throw new Error("Resolution not found");
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        throw new Error("Resolution not found");
      }

      // Vérifier les permissions
      if (!resolution.canEdit(updatedBy)) {
        throw new Error("Permission denied: You can only update resolutions you created or are assigned to");
      }

      // Mettre à jour le progrès
      //@ts-ignore
      const oldProgress = resolution.getData().progress || 0;
      resolution.getData().progress = progress;
      resolution.getData().updatedAt = new Date();

      // Auto-update status based on progress
      if (progress === 100 && resolution.getData().status !== ResolutionStatus.COMPLETED) {
        resolution.getData().status = ResolutionStatus.COMPLETED;
      } else if (progress > 0 && resolution.getData().status === ResolutionStatus.PENDING) {
        resolution.getData().status = ResolutionStatus.IN_PROGRESS;
      }

      // Sauvegarder
      await collections.resolutions.doc(resolutionId).update(resolution.toFirestore());

      logger.info(`Resolution ${resolutionId} progress updated to ${progress}% by user ${updatedBy}`);

      return resolution.getData();

    } catch (error) {
      logger.error("Error updating resolution progress:", error);
      throw error;
    }
  }

  /**
   * Ajouter un commentaire à une résolution
   */
  static async addComment(
    resolutionId: string,
    authorId: string,
    authorName: string,
    content: string,
    tenantId: string
  ): Promise<Resolution> {
    try {
      const doc = await collections.resolutions.doc(resolutionId).get();
      if (!doc.exists) {
        throw new Error("Resolution not found");
      }

      const resolution = ResolutionModel.fromFirestore(doc);
      if (!resolution || resolution.getData().tenantId !== tenantId) {
        throw new Error("Resolution not found");
      }

      // Vérifier les permissions
      const canAccess = await this.canUserAccessResolution(resolution.getData(), authorId, tenantId);
      if (!canAccess) {
        throw new Error("Permission denied: You don't have access to this resolution");
      }

      // Ajouter le commentaire
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        authorId,
        authorName,
        content,
        createdAt: new Date(),
      };

      if (!resolution.getData().comments) {
        resolution.getData().comments = [];
      }

      resolution.getData().comments.push(comment);
      resolution.getData().updatedAt = new Date();

      // Sauvegarder
      await collections.resolutions.doc(resolutionId).update(resolution.toFirestore());

      logger.info(`Comment added to resolution ${resolutionId} by user ${authorId}`);

      return resolution.getData();

    } catch (error) {
      logger.error("Error adding comment:", error);
      throw error;
    }
  }

  /**
   * Obtenir les tâches assignées à un utilisateur
   */
  static async getUserTasks(
    userId: string,
    tenantId: string,
    filters: ResolutionFilters = {},
    options: QueryOptions
  ): Promise<PaginatedResult<Resolution>> {
    try {
      // Construire la requête
      let query = collections.resolutions
        .where("tenantId", "==", tenantId)
        .where("assignedTo", "array-contains", userId);

      // Appliquer les filtres
      if (filters.status) {
        query = query.where("status", "==", filters.status);
      }

      if (filters.priority) {
        query = query.where("priority", "==", filters.priority);
      }

      // Appliquer le tri
      const sortField = this.mapSortField(options.sortBy);
      query = query.orderBy(sortField, options.sortOrder);

      // Appliquer la pagination
      if (options.offset > 0) {
        const offsetQuery = await query.limit(options.offset).get();
        if (!offsetQuery.empty) {
          const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.limit(options.limit + 1).get();
      const hasMore = snapshot.docs.length > options.limit;
      const docs = hasMore ? snapshot.docs.slice(0, options.limit) : snapshot.docs;

      // Convertir en modèles
      const resolutions = docs
        .map(doc => ResolutionModel.fromFirestore(doc))
        .filter(resolution => resolution !== null)
        .map(resolution => resolution!.getData());

      // Filtrer les résolutions en retard si demandé
      let filteredResolutions = resolutions;
      if (filters.overdue) {
        filteredResolutions = resolutions.filter(resolution => {
          return resolution.dueDate &&
            resolution.dueDate < new Date() &&
            resolution.status !== ResolutionStatus.COMPLETED;
        });
      }

      // Obtenir le total
      const totalSnapshot = await collections.resolutions
        .where("tenantId", "==", tenantId)
        .where("assignedTo", "array-contains", userId)
        .get();

      return {
        items: filteredResolutions,
        total: totalSnapshot.size,
        limit: options.limit,
        offset: options.offset,
        hasMore,
      };

    } catch (error) {
      logger.error("Error getting user tasks:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des résolutions
   */
  static async getResolutionStats(
    tenantId: string,
    userId: string,
    eventId?: string,
    period: string = "month"
  ): Promise<ResolutionStats> {
    try {
      // Calculer la période
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Construire la requête de base
      let query = collections.resolutions
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", startDate);

      if (eventId) {
        query = query.where("eventId", "==", eventId);
      }

      const snapshot = await query.get();
      const resolutions = snapshot.docs
        .map(doc => ResolutionModel.fromFirestore(doc))
        .filter(resolution => resolution !== null)
        .map(resolution => resolution!.getData());

      // Calculer les statistiques
      const stats: ResolutionStats = {
        total: resolutions.length,
        byStatus: {
          [ResolutionStatus.PENDING]: 0,
          [ResolutionStatus.IN_PROGRESS]: 0,
          [ResolutionStatus.COMPLETED]: 0,
          [ResolutionStatus.CANCELLED]: 0,
        },
        byPriority: {
          [ResolutionPriority.LOW]: 0,
          [ResolutionPriority.MEDIUM]: 0,
          [ResolutionPriority.HIGH]: 0,
          [ResolutionPriority.URGENT]: 0,
        },
        overdue: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        myTasks: {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          overdue: 0,
        },
      };

      // Calculer les statistiques par statut et priorité
      let completedCount = 0;
      let totalCompletionTime = 0;

      resolutions.forEach(resolution => {
        stats.byStatus[resolution.status]++;
        stats.byPriority[resolution.priority]++;

        // Vérifier si en retard
        if (resolution.dueDate &&
          resolution.dueDate < now &&
          resolution.status !== ResolutionStatus.COMPLETED) {
          stats.overdue++;
        }

        // Calculer le temps de completion
        if (resolution.status === ResolutionStatus.COMPLETED) {
          completedCount++;
          const completionTime = resolution.updatedAt.getTime() - resolution.createdAt.getTime();
          totalCompletionTime += completionTime / (1000 * 60 * 60 * 24); // en jours
        }

        // Statistiques des tâches de l'utilisateur
        if (resolution.assignedTo.includes(userId)) {
          stats.myTasks.total++;

          switch (resolution.status) {
            case ResolutionStatus.PENDING:
              stats.myTasks.pending++;
              break;
            case ResolutionStatus.IN_PROGRESS:
              stats.myTasks.inProgress++;
              break;
            case ResolutionStatus.COMPLETED:
              stats.myTasks.completed++;
              break;
          }

          if (resolution.dueDate &&
            resolution.dueDate < now &&
            resolution.status !== ResolutionStatus.COMPLETED) {
            stats.myTasks.overdue++;
          }
        }
      });

      // Calculer les taux
      if (resolutions.length > 0) {
        stats.completionRate = Math.round((completedCount / resolutions.length) * 100);
      }

      if (completedCount > 0) {
        stats.averageCompletionTime = Math.round(totalCompletionTime / completedCount);
      }

      return stats;

    } catch (error) {
      logger.error("Error getting resolution stats:", error);
      throw error;
    }
  }

  // Méthodes utilitaires privées

  /**
   * Vérifier si un utilisateur peut accéder à une résolution
   */
  private static async canUserAccessResolution(
    resolution: Resolution,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    // Le créateur peut toujours accéder
    if (resolution.createdBy === userId) {
      return true;
    }

    // Les assignés peuvent accéder
    if (resolution.assignedTo.includes(userId)) {
      return true;
    }

    // Vérifier si l'utilisateur est organisateur ou participant de l'événement
    const eventDoc = await collections.events.doc(resolution.eventId).get();
    if (eventDoc.exists) {
      const event = EventModel.fromFirestore(eventDoc);
      if (event) {
        return event.getData().organizerId === userId || event.getData().participants.includes(userId);
      }
    }

    return false;
  }

  /**
   * Envoyer des notifications pour les résolutions
   */
  private static async sendResolutionNotifications(
    resolution: Resolution,
    action: "created" | "updated" | "deleted" | "status_changed",
    performedBy: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Déterminer les destinataires
      const recipients = new Set<string>();

      // Ajouter les assignés
      resolution.assignedTo.forEach(userId => recipients.add(userId));

      // Ajouter le créateur s'il n'est pas celui qui a effectué l'action
      if (resolution.createdBy !== performedBy) {
        recipients.add(resolution.createdBy);
      }

      // Retirer celui qui a effectué l'action
      recipients.delete(performedBy);

      if (recipients.size === 0) {
        return;
      }

      // Créer le message de notification
      let title: string;
      let message: string;

      switch (action) {
        case "created":
          title = "Nouvelle résolution assignée";
          message = `Une nouvelle résolution "${resolution.title}" vous a été assignée.`;
          break;
        case "updated":
          title = "Résolution mise à jour";
          message = `La résolution "${resolution.title}" a été mise à jour.`;
          break;
        case "deleted":
          title = "Résolution supprimée";
          message = `La résolution "${resolution.title}" a été supprimée.`;
          break;
        case "status_changed":
          title = "Statut de résolution modifié";
          message = `Le statut de la résolution "${resolution.title}" est maintenant "${resolution.status}".`;
          break;
      }

      // Envoyer les notifications
      const notificationService = new NotificationService();

      for (const recipientId of recipients) {
        await notificationService.sendNotification({
          userId: recipientId,
          title,
          message,
          type: "resolution" as any,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          priority: NotificationPriority.MEDIUM,
          data: {
            resolutionId: resolution.id,
            eventId: resolution.eventId,
            action,
          },
        });
      }

    } catch (error) {
      logger.error("Error sending resolution notifications:", error);
      // Ne pas faire échouer l'opération principale si les notifications échouent
    }
  }

  /**
   * Mapper les champs de tri
   */
  private static mapSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      dueDate: "dueDate",
      priority: "priority",
      status: "status",
      title: "title",
    };

    return fieldMap[sortBy] || "createdAt";
  }
}