import { TicketModel } from "../../models/ticket.model";
import { collections } from "../../config/database";
import { 
  EventTicket, 
  CreateTicketRequest, 
  UpdateTicketRequest,
  BulkTicketRequest,
  TicketValidationResult,
  TicketStatistics,
  TicketStatus,
  TicketType
} from "../../common/types/ticket.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";
import { tenantEventService } from "../event/tenant-event.service";
import { logger } from "firebase-functions";

export class TicketService {
  
  /**
   * Créer un billet pour un événement
   */
  async createTicket(
    request: CreateTicketRequest, 
    tenantId: string, 
    userId: string
  ): Promise<EventTicket> {
    try {
      // Validation des entrées
      this.validateCreateTicketRequest(request, tenantId, userId);

      // Récupérer les informations de l'événement
      const event = await tenantEventService.getEventById(tenantId, request.eventId);
      if (!event) {
        throw new NotFoundError('Event not found');
      }

      // Vérifier si un billet existe déjà pour ce participant
      const existingTicket = await this.getTicketByParticipant(
        request.eventId, 
        request.participantId, 
        tenantId
      );
      
      if (existingTicket) {
        throw new ConflictError('Ticket already exists for this participant');
      }

      // Vérifier la capacité de l'événement
      if (event.maxParticipants) {
        const ticketCount = await this.getTicketCountForEvent(request.eventId, tenantId);
        if (ticketCount >= event.maxParticipants) {
          throw new ConflictError('Event is at full capacity');
        }
      }

      // Créer le modèle de billet
      const ticketModel = TicketModel.fromCreateRequest({
        ...request,
        tenantId,
        eventTitle: event.title,
        eventDate: event.startDateTime,
        eventLocation: this.formatEventLocation(event.location),
        organizationName: event.organizerName || 'Organization',
        organizationLogo: event.organizationLogo,
        generatedBy: userId
      });

      // Valider le modèle
      await ticketModel.validate();

      // Sauvegarder en base
      const ticketRef = collections.tickets.doc();
      await ticketRef.set(ticketModel.toFirestore());

      // Mettre à jour les statistiques de l'événement
      await this.updateEventParticipants(request.eventId, request.participantId, tenantId);

      logger.info(`✅ Ticket created successfully: ${ticketRef.id}`, {
        ticketId: ticketRef.id,
        eventId: request.eventId,
        participantId: request.participantId,
        tenantId,
        userId
      });

      return {
        id: ticketRef.id,
        ...ticketModel.toAPI()
      } as EventTicket;
      
    } catch (error: any) {
      logger.error(`❌ Error creating ticket`, {
        eventId: request.eventId,
        participantId: request.participantId,
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Créer plusieurs billets en lot
   */
  async createBulkTickets(
    request: BulkTicketRequest,
    tenantId: string,
    userId: string
  ): Promise<EventTicket[]> {
    const tickets: EventTicket[] = [];
    const errors: Array<{ participant: string; error: string }> = [];

    // Récupérer les informations de l'événement une seule fois
    const event = await tenantEventService.getEventById(tenantId, request.eventId);
    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // Traiter chaque participant
    for (const participant of request.participants) {
      try {
        const ticketRequest: CreateTicketRequest = {
          eventId: request.eventId,
          participantId: participant.participantId,
          participantName: participant.participantName,
          participantEmail: participant.participantEmail,
          participantPhone: participant.participantPhone,
          type: participant.type,
          templateId: request.templateId,
          customData: participant.customData,
          registrationData: participant.registrationData
        };

        const ticket = await this.createTicket(ticketRequest, tenantId, userId);
        tickets.push(ticket);

      } catch (error: any) {
        errors.push({
          participant: participant.participantEmail,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      logger.warn(`⚠️ Some tickets failed to create`, {
        eventId: request.eventId,
        successCount: tickets.length,
        errorCount: errors.length,
        errors
      });
    }

    return tickets;
  }

  /**
   * Obtenir un billet par ID
   */
  async getTicketById(ticketId: string, tenantId: string): Promise<EventTicket | null> {
    const doc = await collections.tickets.doc(ticketId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const ticketModel = TicketModel.fromFirestore(doc);
    if (!ticketModel || ticketModel.getData().tenantId !== tenantId) {
      return null;
    }
    
    return ticketModel.toAPI() as EventTicket;
  }

  /**
   * Obtenir un billet par numéro
   */
  async getTicketByNumber(ticketNumber: string, tenantId: string): Promise<EventTicket | null> {
    const snapshot = await collections.tickets
      .where('tenantId', '==', tenantId)
      .where('ticketNumber', '==', ticketNumber)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const ticketModel = TicketModel.fromFirestore(snapshot.docs[0]);
    return ticketModel ? ticketModel.toAPI() as EventTicket : null;
  }

  /**
   * Obtenir un billet par participant
   */
  async getTicketByParticipant(
    eventId: string, 
    participantId: string, 
    tenantId: string
  ): Promise<EventTicket | null> {
    const snapshot = await collections.tickets
      .where('tenantId', '==', tenantId)
      .where('eventId', '==', eventId)
      .where('participantId', '==', participantId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const ticketModel = TicketModel.fromFirestore(snapshot.docs[0]);
    return ticketModel ? ticketModel.toAPI() as EventTicket : null;
  }

  /**
   * Obtenir tous les billets d'un événement avec pagination
   */
  async getTicketsByEvent(
    eventId: string, 
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: TicketStatus;
    } = {}
  ): Promise<{
    tickets: EventTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    let query = collections.tickets
      .where('tenantId', '==', tenantId)
      .where('eventId', '==', eventId);

    if (status) {
      query = query.where('status', '==', status);
    }

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Get paginated results
    const paginatedQuery = query
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit);

    const snapshot = await paginatedQuery.get();
    
    const tickets = snapshot.docs
      .map(doc => TicketModel.fromFirestore(doc))
      .filter(model => model !== null)
      .map(model => model!.toAPI() as EventTicket);

    const totalPages = Math.ceil(total / limit);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Obtenir les billets d'un participant avec pagination
   */
  async getTicketsByParticipant(
    participantId: string, 
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    tickets: EventTicket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = collections.tickets
      .where('tenantId', '==', tenantId)
      .where('participantId', '==', participantId);

    // Get total count
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Get paginated results
    const paginatedQuery = query
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit);

    const snapshot = await paginatedQuery.get();
    
    const tickets = snapshot.docs
      .map(doc => TicketModel.fromFirestore(doc))
      .filter(model => model !== null)
      .map(model => model!.toAPI() as EventTicket);

    const totalPages = Math.ceil(total / limit);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Mettre à jour un billet
   */
  async updateTicket(
    ticketId: string, 
    updates: UpdateTicketRequest, 
    tenantId: string,
    userId: string
  ): Promise<EventTicket> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }
    
    // Appliquer les mises à jour
    const updatedData = {
      ...existing,
      ...updates,
      lastModifiedBy: userId,
      updatedAt: new Date()
    };
    
    const ticketModel = new TicketModel(updatedData);
    await ticketModel.validate();
    
    await collections.tickets.doc(ticketId).update(ticketModel.toFirestore());
    
    logger.info(`✅ Ticket updated: ${ticketId}`, {
      ticketId,
      tenantId,
      userId,
      updates: Object.keys(updates)
    });
    
    return ticketModel.toAPI() as EventTicket;
  }

  /**
   * Annuler un billet
   */
  async cancelTicket(
    ticketId: string, 
    reason: string, 
    tenantId: string,
    userId: string
  ): Promise<EventTicket> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    if (existing.status === TicketStatus.CANCELLED) {
      throw new ConflictError("Ticket is already cancelled");
    }

    if (existing.status === TicketStatus.USED) {
      throw new ConflictError("Cannot cancel a used ticket");
    }

    const ticketModel = new TicketModel(existing);
    ticketModel.cancel(reason, userId);

    await collections.tickets.doc(ticketId).update(ticketModel.toFirestore());

    // Mettre à jour les statistiques de l'événement
    await this.removeEventParticipant(existing.eventId, existing.participantId, tenantId);

    logger.info(`🚫 Ticket cancelled: ${ticketId}`, {
      ticketId,
      reason,
      tenantId,
      userId
    });

    return ticketModel.toAPI() as EventTicket;
  }

  /**
   * Valider un billet (pour le check-in)
   */
  async validateTicket(
    ticketNumber: string, 
    securityCode: string, 
    tenantId: string
  ): Promise<TicketValidationResult> {
    try {
      const ticket = await this.getTicketByNumber(ticketNumber, tenantId);
      
      if (!ticket) {
        return {
          isValid: false,
          error: 'Ticket not found'
        };
      }

      if (ticket.securityCode !== securityCode) {
        return {
          isValid: false,
          error: 'Invalid security code'
        };
      }

      const ticketModel = new TicketModel(ticket);
      
      if (!ticketModel.isValid()) {
        return {
          isValid: false,
          error: 'Ticket is not valid (expired, cancelled, or already used)',
          ticket
        };
      }

      if (!ticketModel.canCheckIn()) {
        return {
          isValid: false,
          error: 'Check-in not allowed for this ticket',
          ticket
        };
      }

      return {
        isValid: true,
        ticket
      };

    } catch (error: any) {
      logger.error('Error validating ticket', {
        ticketNumber,
        tenantId,
        error: error.message
      });

      return {
        isValid: false,
        error: 'Validation error occurred'
      };
    }
  }

  /**
   * Marquer un billet comme utilisé (check-in)
   */
  async checkInTicket(
    ticketId: string, 
    tenantId: string,
    userId: string
  ): Promise<EventTicket> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    const ticketModel = new TicketModel(existing);
    
    if (!ticketModel.canCheckIn()) {
      throw new ConflictError("Check-in not allowed for this ticket");
    }

    ticketModel.markAsUsed();
    ticketModel.getData().lastModifiedBy = userId;

    await collections.tickets.doc(ticketId).update(ticketModel.toFirestore());

    logger.info(`✅ Ticket checked in: ${ticketId}`, {
      ticketId,
      eventId: existing.eventId,
      participantId: existing.participantId,
      tenantId,
      userId
    });

    return ticketModel.toAPI() as EventTicket;
  }

  /**
   * Obtenir les statistiques des billets pour un événement
   */
  async getTicketStatistics(eventId: string, tenantId: string): Promise<TicketStatistics> {
    const ticketsResult = await this.getTicketsByEvent(eventId, tenantId);
    const tickets = ticketsResult.tickets;
    
    const stats: TicketStatistics = {
      total: tickets.length,
      byStatus: {
        [TicketStatus.PENDING]: 0,
        [TicketStatus.CONFIRMED]: 0,
        [TicketStatus.CANCELLED]: 0,
        [TicketStatus.USED]: 0,
        [TicketStatus.EXPIRED]: 0
      },
      byType: {
        [TicketType.STANDARD]: 0,
        [TicketType.VIP]: 0,
        [TicketType.EARLY_BIRD]: 0,
        [TicketType.STUDENT]: 0,
        [TicketType.COMPLIMENTARY]: 0
      },
      emailsSent: 0,
      downloadsCount: 0,
      checkInsCount: 0,
      cancellationsCount: 0,
      validTickets: 0,
      expiredTickets: 0
    };

    tickets.forEach(ticket => {
      // Compter par statut
      stats.byStatus[ticket.status]++;
      
      // Compter par type
      stats.byType[ticket.type]++;
      
      // Autres statistiques
      if (ticket.emailSent) stats.emailsSent++;
      stats.downloadsCount += ticket.downloadCount || 0;
      if (ticket.usedAt) stats.checkInsCount++;
      if (ticket.status === TicketStatus.CANCELLED) stats.cancellationsCount++;
      
      // Billets valides et expirés
      const now = new Date();
      if (ticket.status === TicketStatus.CONFIRMED && ticket.validUntil >= now) {
        stats.validTickets++;
      } else if (ticket.validUntil < now) {
        stats.expiredTickets++;
      }
    });

    return stats;
  }

  /**
   * Marquer un email comme envoyé
   */
  async markEmailSent(ticketId: string, tenantId: string): Promise<void> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    const ticketModel = new TicketModel(existing);
    ticketModel.markEmailSent();

    await collections.tickets.doc(ticketId).update(ticketModel.toFirestore());
  }

  /**
   * Incrémenter le compteur de téléchargements
   */
  async incrementDownloadCount(ticketId: string, tenantId: string): Promise<void> {
    const existing = await this.getTicketById(ticketId, tenantId);
    if (!existing) {
      throw new NotFoundError("Ticket not found");
    }

    const ticketModel = new TicketModel(existing);
    ticketModel.incrementDownloadCount();

    await collections.tickets.doc(ticketId).update(ticketModel.toFirestore());
  }

  // Méthodes privées

  private validateCreateTicketRequest(request: CreateTicketRequest, tenantId: string, userId: string): void {
    if (!request.eventId || typeof request.eventId !== 'string') {
      throw new ValidationError('Event ID is required and must be a string');
    }

    if (!request.participantId || typeof request.participantId !== 'string') {
      throw new ValidationError('Participant ID is required and must be a string');
    }

    if (!request.participantName || typeof request.participantName !== 'string' || request.participantName.trim().length < 2) {
      throw new ValidationError('Participant name is required and must be at least 2 characters');
    }

    if (!request.participantEmail || typeof request.participantEmail !== 'string') {
      throw new ValidationError('Participant email is required');
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.participantEmail)) {
      throw new ValidationError('Invalid email format');
    }

    if (!tenantId || typeof tenantId !== 'string') {
      throw new ValidationError('Tenant ID is required');
    }

    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    // Validation du type de billet si fourni
    if (request.type && !Object.values(TicketType).includes(request.type)) {
      throw new ValidationError('Invalid ticket type');
    }
  }

  private async getTicketCountForEvent(eventId: string, tenantId: string): Promise<number> {
    const snapshot = await collections.tickets
      .where('tenantId', '==', tenantId)
      .where('eventId', '==', eventId)
      .where('status', 'in', [TicketStatus.CONFIRMED, TicketStatus.USED])
      .get();
    
    return snapshot.size;
  }

  private formatEventLocation(location: any): string {
    if (!location) return 'Location TBD';
    
    if (location.type === 'virtual') {
      return 'Virtual Event';
    } else if (location.type === 'hybrid') {
      return location.address ? `${location.address} + Virtual` : 'Hybrid Event';
    } else {
      return location.address || 'Physical Location';
    }
  }

  private async updateEventParticipants(eventId: string, participantId: string, tenantId: string): Promise<void> {
    try {
      // Cette méthode pourrait mettre à jour les participants de l'événement
      // Pour l'instant, on log juste l'action
      logger.info('Event participant added', {
        eventId,
        participantId,
        tenantId
      });
    } catch (error) {
      logger.warn('Failed to update event participants', {
        eventId,
        participantId,
        tenantId,
        error
      });
    }
  }

  private async removeEventParticipant(eventId: string, participantId: string, tenantId: string): Promise<void> {
    try {
      // Cette méthode pourrait retirer le participant de l'événement
      // Pour l'instant, on log juste l'action
      logger.info('Event participant removed', {
        eventId,
        participantId,
        tenantId
      });
    } catch (error) {
      logger.warn('Failed to remove event participant', {
        eventId,
        participantId,
        tenantId,
        error
      });
    }
  }
}

export const ticketService = new TicketService();