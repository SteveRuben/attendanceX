import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { BookingService } from "../services/booking.service";
import { ClientService } from "../services/client.service";
import { 
  AppointmentFilters, 
  BookingRequest,
  CreateAppointmentRequest,
  ERROR_CODES,
  UpdateAppointmentRequest
} from "../shared";
import { logger } from "firebase-functions";
import { AuthenticatedRequest } from "../types";
import { AppointmentService } from "../services/appointment/appointment.service";

/**
 * Contrôleur pour la gestion des rendez-vous
 * 
 * Ce contrôleur gère toutes les opérations CRUD sur les rendez-vous,
 * incluant les endpoints protégés pour les praticiens et les endpoints
 * publics pour les réservations clients.
 */
export class AppointmentController {
  private static appointmentService = new AppointmentService();
  private static bookingService = new BookingService();
  private static clientService = new ClientService();

  /**
   * Créer un nouveau rendez-vous (endpoint protégé)
   */
  static createAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const appointmentData: CreateAppointmentRequest = req.body;
    const createdBy = req.user.uid;

    // Validation de l'organisation
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Organization ID is required"
        }
      });
    }

    try {
      const appointment = await AppointmentController.appointmentService.createAppointment(
        appointmentData,
        organizationId,
        createdBy
      );

      logger.info(`Appointment created successfully`, {
        appointmentId: appointment.id,
        organizationId,
        createdBy,
        clientId: appointmentData.clientId
      });

      return res.status(201).json({
        success: true,
        message: "Rendez-vous créé avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error creating appointment:", error);
      
      if (error.message.includes("conflicts detected")) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.APPOINTMENT_CONFLICT,
            message: error.message
          }
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la création du rendez-vous"
        }
      });
    }
  });

  /**
   * Récupérer les rendez-vous avec filtres (endpoint protégé)
   */
  static getAppointments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const filters: AppointmentFilters = req.query as any;

    try {
      // Conversion des dates si présentes
      if (filters.startDate) {
        filters.startDate = new Date(filters.startDate as any);
      }
      if (filters.endDate) {
        filters.endDate = new Date(filters.endDate as any);
      }

      const appointments = await AppointmentController.appointmentService.getAppointments(
        organizationId,
        filters
      );

      // Populate related data for each appointment
      const appointmentsWithDetails = await Promise.all(
        appointments.map(async (appointment) => {
          const appointmentData = appointment.getData();
          
          // Get client details
          const client = await AppointmentController.clientService.getClientById(appointmentData.clientId);
          
          // Get service details (you'll need to implement this)
          // const service = await AppointmentController.serviceService.getServiceById(appointmentData.serviceId);
          
          // Get practitioner details (you'll need to implement this)
          // const practitioner = await AppointmentController.practitionerService.getPractitionerById(appointmentData.practitionerId);
          
          return {
            ...appointmentData,
            client: client ? {
              id: client.getData().id,
              firstName: client.getData().firstName,
              lastName: client.getData().lastName,
              email: client.getData().email,
              phone: client.getData().phone,
              organizationId: client.getData().organizationId,
              preferences: client.getData().preferences,
              createdAt: client.getData().createdAt,
              updatedAt: client.getData().updatedAt
            } : null,
            service: {
              id: appointmentData.serviceId,
              name: 'Service Name', // TODO: Get from service
              description: '',
              duration: appointmentData.duration,
              price: 0,
              organizationId: appointmentData.organizationId,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            practitioner: {
              id: appointmentData.practitionerId,
              firstName: 'Practitioner',
              lastName: 'Name',
              email: 'practitioner@example.com',
              displayName: 'Practitioner Name' // TODO: Get from practitioner service
            }
          };
        })
      );

      return res.json({
        success: true,
        data: appointmentsWithDetails,
        count: appointmentsWithDetails.length
      });
    } catch (error: any) {
      logger.error("Error fetching appointments:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: "Erreur lors de la récupération des rendez-vous"
        }
      });
    }
  });

  /**
   * Récupérer un rendez-vous par ID (endpoint protégé)
   */
  static getAppointmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;

    try {
      const appointment = await AppointmentController.appointmentService.getAppointmentById(
        appointmentId,
        organizationId
      );

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: "Rendez-vous non trouvé"
          }
        });
      }

      return res.json({
        success: true,
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error fetching appointment:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: "Erreur lors de la récupération du rendez-vous"
        }
      });
    }
  });

  /**
   * Mettre à jour un rendez-vous (endpoint protégé)
   */
  static updateAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const updates: UpdateAppointmentRequest = req.body;
    const updatedBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.updateAppointment(
        appointmentId,
        updates,
        organizationId,
        updatedBy
      );

      logger.info(`Appointment updated successfully`, {
        appointmentId,
        organizationId,
        updatedBy,
        updates: Object.keys(updates)
      });

      return res.json({
        success: true,
        message: "Rendez-vous mis à jour avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error updating appointment:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      if (error.message.includes("conflicts detected")) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.APPOINTMENT_CONFLICT,
            message: error.message
          }
        });
      }

      if (error.message.includes("cannot be modified")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la mise à jour du rendez-vous"
        }
      });
    }
  });

  /**
   * Supprimer un rendez-vous (endpoint protégé)
   */
  static deleteAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { reason } = req.body;
    const deletedBy = req.user.uid;

    try {
      await AppointmentController.appointmentService.deleteAppointment(
        appointmentId,
        organizationId,
        deletedBy,
        reason
      );

      logger.info(`Appointment deleted successfully`, {
        appointmentId,
        organizationId,
        deletedBy,
        reason
      });

      return res.json({
        success: true,
        message: "Rendez-vous supprimé avec succès"
      });
    } catch (error: any) {
      logger.error("Error deleting appointment:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la suppression du rendez-vous"
        }
      });
    }
  });

  /**
   * Mettre à jour le statut d'un rendez-vous (endpoint protégé)
   */
  static updateAppointmentStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { status, reason } = req.body;
    const updatedBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.updateAppointmentStatus(
        appointmentId,
        status,
        organizationId,
        updatedBy,
        reason
      );

      logger.info(`Appointment status updated successfully`, {
        appointmentId,
        organizationId,
        updatedBy,
        newStatus: status,
        reason
      });

      return res.json({
        success: true,
        message: "Statut du rendez-vous mis à jour avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error updating appointment status:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      if (error.message.includes("Invalid status transition")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.BAD_REQUEST,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la mise à jour du statut"
        }
      });
    }
  });

  /**
   * Confirmer un rendez-vous (endpoint protégé)
   */
  static confirmAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const confirmedBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.confirmAppointment(
        appointmentId,
        organizationId,
        confirmedBy
      );

      return res.json({
        success: true,
        message: "Rendez-vous confirmé avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error confirming appointment:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la confirmation du rendez-vous"
        }
      });
    }
  });

  /**
   * Terminer un rendez-vous (endpoint protégé)
   */
  static completeAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { notes } = req.body;
    const completedBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.completeAppointment(
        appointmentId,
        organizationId,
        completedBy,
        notes
      );

      return res.json({
        success: true,
        message: "Rendez-vous terminé avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error completing appointment:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la finalisation du rendez-vous"
        }
      });
    }
  });

  /**
   * Annuler un rendez-vous (endpoint protégé)
   */
  static cancelAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.cancelAppointment(
        appointmentId,
        organizationId,
        cancelledBy,
        reason
      );

      return res.json({
        success: true,
        message: "Rendez-vous annulé avec succès",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error cancelling appointment:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      if (error.message.includes("deadline has passed")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.APPOINTMENT_CANCELLATION_DEADLINE,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de l'annulation du rendez-vous"
        }
      });
    }
  });

  /**
   * Marquer un rendez-vous comme absent (endpoint protégé)
   */
  static markAsNoShow = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const markedBy = req.user.uid;

    try {
      const appointment = await AppointmentController.appointmentService.markAsNoShow(
        appointmentId,
        organizationId,
        markedBy
      );

      return res.json({
        success: true,
        message: "Rendez-vous marqué comme absent",
        data: appointment.getData()
      });
    } catch (error: any) {
      logger.error("Error marking appointment as no-show:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors du marquage comme absent"
        }
      });
    }
  });

  /**
   * Récupérer les créneaux disponibles (endpoint protégé)
   */
  static getAvailableSlots = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { organizationId } = req.params;
    const { practitionerId, date, serviceId, duration } = req.query;

    if (!practitionerId || !date) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Practitioner ID and date are required"
        }
      });
    }

    try {
      const slots = await AppointmentController.appointmentService.getAvailableSlots(
        organizationId,
        practitionerId as string,
        date as string,
        serviceId as string,
        duration ? parseInt(duration as string) : undefined
      );

      return res.json({
        success: true,
        data: slots
      });
    } catch (error: any) {
      logger.error("Error fetching available slots:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: "Erreur lors de la récupération des créneaux disponibles"
        }
      });
    }
  });

  // ========== ENDPOINTS PUBLICS POUR LES RÉSERVATIONS ==========

  /**
   * Récupérer les créneaux disponibles pour réservation publique (endpoint public)
   */
  static getPublicAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.params;
    const { date, serviceId, practitionerId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Date is required"
        }
      });
    }

    try {
      const slots = await AppointmentController.bookingService.getAvailableSlots(
        organizationId,
        date as string,
        serviceId as string,
        practitionerId as string
      );

      return res.json({
        success: true,
        data: slots
      });
    } catch (error: any) {
      logger.error("Error fetching public available slots:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: "Erreur lors de la récupération des créneaux disponibles"
        }
      });
    }
  });

  /**
   * Créer une réservation publique (endpoint public)
   */
  static createPublicBooking = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId } = req.params;
    const bookingRequest: BookingRequest = req.body;

    try {
      const result = await AppointmentController.bookingService.createBooking(
        organizationId,
        bookingRequest
      );

      logger.info(`Public booking created successfully`, {
        appointmentId: result.appointment.id,
        organizationId,
        clientEmail: result.client.email,
        isNewClient: result.isNewClient
      });

      return res.status(201).json({
        success: true,
        message: "Réservation créée avec succès",
        data: {
          appointment: result.appointment,
          client: result.client,
          isNewClient: result.isNewClient
        }
      });
    } catch (error: any) {
      logger.error("Error creating public booking:", error);

      if (error.message.includes("not available") || error.message.includes("conflicts")) {
        return res.status(409).json({
          success: false,
          error: {
            code: ERROR_CODES.APPOINTMENT_CONFLICT,
            message: error.message
          }
        });
      }

      if (error.message.includes("advance") || error.message.includes("deadline")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.BOOKING_DEADLINE_PASSED,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la création de la réservation"
        }
      });
    }
  });

  /**
   * Modifier une réservation publique (endpoint public)
   */
  static modifyPublicBooking = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { updates, clientEmail } = req.body;

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Client email is required for booking modification"
        }
      });
    }

    try {
      const appointment = await AppointmentController.bookingService.modifyBooking(
        organizationId,
        appointmentId,
        updates,
        clientEmail
      );

      logger.info(`Public booking modified successfully`, {
        appointmentId,
        organizationId,
        clientEmail,
        updates: Object.keys(updates)
      });

      return res.json({
        success: true,
        message: "Réservation modifiée avec succès",
        data: appointment
      });
    } catch (error: any) {
      logger.error("Error modifying public booking:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.FORBIDDEN,
            message: error.message
          }
        });
      }

      if (error.message.includes("deadline") || error.message.includes("cannot be modified")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.BOOKING_DEADLINE_PASSED,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de la modification de la réservation"
        }
      });
    }
  });

  /**
   * Annuler une réservation publique (endpoint public)
   */
  static cancelPublicBooking = asyncHandler(async (req: Request, res: Response) => {
    const { organizationId, appointmentId } = req.params;
    const { clientEmail, reason } = req.body;

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Client email is required for booking cancellation"
        }
      });
    }

    try {
      const appointment = await AppointmentController.bookingService.cancelBooking(
        organizationId,
        appointmentId,
        clientEmail,
        reason
      );

      logger.info(`Public booking cancelled successfully`, {
        appointmentId,
        organizationId,
        clientEmail,
        reason
      });

      return res.json({
        success: true,
        message: "Réservation annulée avec succès",
        data: appointment
      });
    } catch (error: any) {
      logger.error("Error cancelling public booking:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: error.message
          }
        });
      }

      if (error.message.includes("Unauthorized")) {
        return res.status(403).json({
          success: false,
          error: {
            code: ERROR_CODES.FORBIDDEN,
            message: error.message
          }
        });
      }

      if (error.message.includes("deadline has passed")) {
        return res.status(400).json({
          success: false,
          error: {
            code: ERROR_CODES.APPOINTMENT_CANCELLATION_DEADLINE,
            message: error.message
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: error.message || "Erreur lors de l'annulation de la réservation"
        }
      });
    }
  });
}