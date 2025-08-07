import { 
  BookingRequest, 
  AvailableSlot,
  Appointment,
  Client,
  Service,
  AppointmentConflict,
  APPOINTMENT_STATUSES,
  VALIDATION_PATTERNS
} from "@attendance-x/shared";
import { AppointmentService } from "./appointment.service";
import { ClientService } from "./client.service";
import { OrganizationAppointmentSettingsModel } from "../models/organization-appointment-settings.model";
import { getFirestore } from "firebase-admin/firestore";
import { 
  CollectionReference} from "firebase-admin/firestore";

/**
 * Service de réservation publique
 * 
 * Ce service gère les opérations de réservation côté client,
 * incluant la vérification de disponibilité, la création de réservations,
 * les modifications et annulations selon les règles de l'organisation.
 */
export class BookingService {
  private appointmentService: AppointmentService;
  private clientService: ClientService;
  private settingsCollection: CollectionReference;
  private servicesCollection: CollectionReference;

  constructor() {
    this.appointmentService = new AppointmentService();
    this.clientService = new ClientService();
    
    const db = getFirestore();
    this.settingsCollection = db.collection('organization_appointment_settings');
    this.servicesCollection = db.collection('services');
  }

  /**
   * Récupère les créneaux disponibles pour une organisation
   */
  async getAvailableSlots(
    organizationId: string,
    date: string,
    serviceId?: string,
    practitionerId?: string
  ): Promise<AvailableSlot[]> {
    // Validation des paramètres
    await this.validateBookingParameters(organizationId, date);

    // Récupération des paramètres de l'organisation
    const settings = await this.getOrganizationSettings(organizationId);
    if (!settings) {
      throw new Error("Organization settings not found");
    }

    // Vérification que la réservation en ligne est activée
    if (!settings.getData().bookingRules.allowOnlineBooking) {
      throw new Error("Online booking is not enabled for this organization");
    }

    // Vérification des règles de réservation à l'avance
    const appointmentDate = new Date(date);
    const now = new Date();
    const daysDifference = Math.ceil((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > settings.getData().bookingRules.advanceBookingDays) {
      throw new Error("Cannot book appointments this far in advance");
    }

    if (!settings.getData().bookingRules.allowSameDayBooking && daysDifference < 1) {
      throw new Error("Same-day booking is not allowed");
    }

    // Récupération du service si spécifié
    let service: Service | null = null;
    let duration = settings.getData().defaultAppointmentDuration;
    
    if (serviceId) {
      service = await this.getServiceById(organizationId, serviceId);
      if (!service) {
        throw new Error("Service not found");
      }
      if (!service.isActive) {
        throw new Error("Service is not available");
      }
      duration = service.duration;
    }

    // Si un praticien est spécifié, vérifier qu'il peut fournir ce service
    if (practitionerId && service) {
      if (!service.practitioners.includes(practitionerId)) {
        throw new Error("This practitioner cannot provide the selected service");
      }
    }

    // Récupération des créneaux disponibles
    if (practitionerId) {
      return this.appointmentService.getAvailableSlots(
        organizationId,
        practitionerId,
        date,
        serviceId,
        duration
      );
    } else {
      // Si aucun praticien spécifié, récupérer les créneaux pour tous les praticiens disponibles
      return this.getAvailableSlotsForAllPractitioners(
        organizationId,
        date,
        service,
        duration
      );
    }
  }

  /**
   * Crée une réservation publique
   */
  async createBooking(
    organizationId: string,
    bookingRequest: BookingRequest
  ): Promise<{ appointment: Appointment; client: Client; isNewClient: boolean }> {
    // Validation des données de réservation
    await this.validateBookingRequest(organizationId, bookingRequest);

    // Récupération des paramètres de l'organisation
    const settings = await this.getOrganizationSettings(organizationId);
    if (!settings) {
      throw new Error("Organization settings not found");
    }

    if (!settings.getData().bookingRules.allowOnlineBooking) {
      throw new Error("Online booking is not enabled for this organization");
    }

    // Vérification de la disponibilité du créneau
    const conflicts = await this.checkSlotAvailability(organizationId, bookingRequest);
    if (conflicts.length > 0) {
      throw new Error(`Booking conflicts: ${conflicts.map(c => c.message).join(', ')}`);
    }

    // Gestion du client (création ou récupération)
    const { client, isNewClient } = await this.getOrCreateClient(
      organizationId,
      bookingRequest.clientData
    );

    // Création du rendez-vous
    const appointmentRequest = {
      clientId: client.id!,
      practitionerId: bookingRequest.appointmentData.practitionerId || await this.selectAvailablePractitioner(
        organizationId,
        bookingRequest.appointmentData.serviceId,
        bookingRequest.appointmentData.date,
        bookingRequest.appointmentData.startTime
      ),
      serviceId: bookingRequest.appointmentData.serviceId,
      date: bookingRequest.appointmentData.date,
      startTime: bookingRequest.appointmentData.startTime,
      notes: bookingRequest.appointmentData.notes
    };

    const appointmentModel = await this.appointmentService.createAppointment(
      appointmentRequest,
      organizationId,
      'public_booking' // Système de réservation publique
    );

    return {
      appointment: appointmentModel.getData(),
      client,
      isNewClient
    };
  }

  /**
   * Modifie une réservation existante
   */
  async modifyBooking(
    organizationId: string,
    appointmentId: string,
    updates: {
      date?: string;
      startTime?: string;
      serviceId?: string;
      practitionerId?: string;
      notes?: string;
    },
    clientEmail: string
  ): Promise<Appointment> {
    // Récupération du rendez-vous
    const appointment = await this.appointmentService.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Vérification que le client peut modifier ce rendez-vous
    const client = await this.clientService.getClientById(appointment.getData().clientId);
    if (!client || client.getData().email.toLowerCase() !== clientEmail.toLowerCase()) {
      throw new Error("Unauthorized to modify this appointment");
    }

    // Vérification des règles de modification
    const settings = await this.getOrganizationSettings(organizationId);
    if (!settings) {
      throw new Error("Organization settings not found");
    }

    const canModify = this.canAppointmentBeModified(appointment.getData(), settings);
    if (!canModify.allowed) {
      throw new Error(canModify.reason);
    }

    // Validation des nouvelles données si fournies
    if (updates.date || updates.startTime || updates.serviceId) {
      const newDate = updates.date || appointment.getData().date.toISOString().split('T')[0];
      const newStartTime = updates.startTime || appointment.getData().startTime;
      const newServiceId = updates.serviceId || appointment.getData().serviceId;

      // Vérification de la disponibilité du nouveau créneau
      const conflicts = await this.checkSlotAvailability(organizationId, {
        clientData: client.getData(),
        appointmentData: {
          date: newDate,
          startTime: newStartTime,
          serviceId: newServiceId,
          practitionerId: updates.practitionerId || appointment.getData().practitionerId,
          notes: updates.notes
        }
      }, appointmentId);

      if (conflicts.length > 0) {
        throw new Error(`Modification conflicts: ${conflicts.map(c => c.message).join(', ')}`);
      }
    }

    // Application des modifications
    const updatedAppointment = await this.appointmentService.updateAppointment(
      appointmentId,
      updates,
      organizationId,
      'client_modification'
    );

    return updatedAppointment.getData();
  }

  /**
   * Annule une réservation
   */
  async cancelBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string,
    reason?: string
  ): Promise<void> {
    // Récupération du rendez-vous
    const appointment = await this.appointmentService.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Vérification que le client peut annuler ce rendez-vous
    const client = await this.clientService.getClientById(appointment.getData().clientId);
    if (!client || client.getData().email.toLowerCase() !== clientEmail.toLowerCase()) {
      throw new Error("Unauthorized to cancel this appointment");
    }

    // Vérification des règles d'annulation
    const settings = await this.getOrganizationSettings(organizationId);
    if (!settings) {
      throw new Error("Organization settings not found");
    }

    const canCancel = this.canAppointmentBeCancelled(appointment.getData(), settings);
    if (!canCancel.allowed) {
      throw new Error(canCancel.reason);
    }

    // Annulation du rendez-vous
    await this.appointmentService.cancelAppointment(
      appointmentId,
      organizationId,
      'client_cancellation',
      reason || 'Cancelled by client'
    );
  }

  /**
   * Confirme une réservation
   */
  async confirmBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string
  ): Promise<Appointment> {
    // Récupération du rendez-vous
    const appointment = await this.appointmentService.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Vérification que le client peut confirmer ce rendez-vous
    const client = await this.clientService.getClientById(appointment.getData().clientId);
    if (!client || client.getData().email.toLowerCase() !== clientEmail.toLowerCase()) {
      throw new Error("Unauthorized to confirm this appointment");
    }

    // Vérification que le rendez-vous peut être confirmé
    if (appointment.getData().status !== APPOINTMENT_STATUSES.SCHEDULED) {
      throw new Error("Appointment cannot be confirmed in its current state");
    }

    // Confirmation du rendez-vous
    const confirmedAppointment = await this.appointmentService.confirmAppointment(
      appointmentId,
      organizationId,
      'client_confirmation'
    );

    return confirmedAppointment.getData();
  }

  // Méthodes privées

  /**
   * Valide les paramètres de base pour la réservation
   */
  private async validateBookingParameters(organizationId: string, date: string): Promise<void> {
    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    if (!VALIDATION_PATTERNS.APPOINTMENT_DATE.test(date)) {
      throw new Error("Invalid date format (expected YYYY-MM-DD)");
    }

    const appointmentDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (appointmentDate < now) {
      throw new Error("Cannot book appointments in the past");
    }
  }

  /**
   * Valide une demande de réservation complète
   */
  private async validateBookingRequest(
    organizationId: string,
    bookingRequest: BookingRequest
  ): Promise<void> {
    // Validation des données client
    const { clientData } = bookingRequest;
    if (!clientData.firstName || !clientData.lastName || !clientData.email || !clientData.phone) {
      throw new Error("Client information is incomplete");
    }

    if (!VALIDATION_PATTERNS.EMAIL.test(clientData.email)) {
      throw new Error("Invalid email format");
    }

    if (!VALIDATION_PATTERNS.PHONE_INTERNATIONAL.test(clientData.phone)) {
      throw new Error("Invalid phone format");
    }

    // Validation des données de rendez-vous
    const { appointmentData } = bookingRequest;
    await this.validateBookingParameters(organizationId, appointmentData.date);

    if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(appointmentData.startTime)) {
      throw new Error("Invalid time format (expected HH:MM)");
    }

    if (!appointmentData.serviceId) {
      throw new Error("Service ID is required");
    }

    // Vérification que le service existe et est actif
    const service = await this.getServiceById(organizationId, appointmentData.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    if (!service.isActive) {
      throw new Error("Service is not available");
    }
  }

  /**
   * Vérifie la disponibilité d'un créneau spécifique
   */
  private async checkSlotAvailability(
    organizationId: string,
    bookingRequest: BookingRequest,
    excludeAppointmentId?: string
  ): Promise<AppointmentConflict[]> {
    const { appointmentData } = bookingRequest;
    
    // Récupération du service pour obtenir la durée
    const service = await this.getServiceById(organizationId, appointmentData.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    // Sélection automatique du praticien si non spécifié
    const practitionerId = appointmentData.practitionerId || 
      await this.selectAvailablePractitioner(
        organizationId,
        appointmentData.serviceId,
        appointmentData.date,
        appointmentData.startTime
      );

    // Vérification de la disponibilité
    return this.appointmentService.checkAvailability(
      organizationId,
      practitionerId,
      appointmentData.date,
      appointmentData.startTime,
      service.duration,
      excludeAppointmentId
    );
  }

  /**
   * Récupère ou crée un client
   */
  private async getOrCreateClient(
    organizationId: string,
    clientData: BookingRequest['clientData']
  ): Promise<{ client: Client; isNewClient: boolean }> {
    // Recherche d'un client existant par email
    let existingClient = await this.clientService.findClientByContact(
      organizationId,
      clientData.email
    );

    if (existingClient) {
      // Mise à jour des informations si nécessaire
      const existingData = existingClient.getData();
      const needsUpdate = 
        existingData.firstName !== clientData.firstName ||
        existingData.lastName !== clientData.lastName ||
        existingData.phone !== clientData.phone;

      if (needsUpdate) {
        const updatedClient = await this.clientService.updateClient(
          existingClient.id!,
          {
            firstName: clientData.firstName,
            lastName: clientData.lastName,
            phone: clientData.phone,
            preferences: {
              ...existingData.preferences,
              ...clientData.preferences
            }
          },
          'public_booking'
        );
        return { client: updatedClient.getData(), isNewClient: false };
      }

      return { client: existingData, isNewClient: false };
    }

    // Création d'un nouveau client
    const newClientModel = await this.clientService.createClient(
      {
        organizationId,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email.toLowerCase().trim(),
        phone: clientData.phone.trim(),
        preferences: {
          reminderMethod: 'email',
          language: 'fr',
          ...clientData.preferences
        }
      },
      'public_booking'
    );

    return { client: newClientModel.getData(), isNewClient: true };
  }

  /**
   * Sélectionne automatiquement un praticien disponible
   */
  private async selectAvailablePractitioner(
    organizationId: string,
    serviceId: string,
    date: string,
    startTime: string
  ): Promise<string> {
    const service = await this.getServiceById(organizationId, serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    // Vérification de la disponibilité pour chaque praticien
    for (const practitionerId of service.practitioners) {
      const conflicts = await this.appointmentService.checkAvailability(
        organizationId,
        practitionerId,
        date,
        startTime,
        service.duration
      );

      if (conflicts.length === 0) {
        return practitionerId;
      }
    }

    throw new Error("No practitioner available for this time slot");
  }

  /**
   * Récupère les créneaux disponibles pour tous les praticiens
   */
  private async getAvailableSlotsForAllPractitioners(
    organizationId: string,
    date: string,
    service: Service | null,
    duration: number
  ): Promise<AvailableSlot[]> {
    const allSlots: AvailableSlot[] = [];

    if (service) {
      // Récupérer les créneaux pour tous les praticiens du service
      for (const practitionerId of service.practitioners) {
        const slots = await this.appointmentService.getAvailableSlots(
          organizationId,
          practitionerId,
          date,
          service.id,
          duration
        );
        allSlots.push(...slots);
      }
    } else {
      // Si aucun service spécifié, récupérer tous les praticiens actifs
      // Cette logique nécessiterait une collection de praticiens
      // Pour l'instant, on retourne un tableau vide
      return [];
    }

    // Tri des créneaux par heure
    return allSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Vérifie si un rendez-vous peut être modifié
   */
  private canAppointmentBeModified(
    appointment: Appointment,
    settings: OrganizationAppointmentSettingsModel
  ): { allowed: boolean; reason?: string } {
    // Vérification du statut
    if (appointment.status !== APPOINTMENT_STATUSES.SCHEDULED && 
        appointment.status !== APPOINTMENT_STATUSES.CONFIRMED) {
      return { allowed: false, reason: "Appointment cannot be modified in its current state" };
    }

    // Vérification du délai de modification (utilise le même délai que l'annulation)
    const now = new Date();
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const deadlineHours = settings.getData().bookingRules.cancellationDeadlineHours;

    if (hoursUntilAppointment < deadlineHours) {
      return { 
        allowed: false, 
        reason: `Modification deadline has passed (${deadlineHours} hours before appointment)` 
      };
    }

    return { allowed: true };
  }

  /**
   * Vérifie si un rendez-vous peut être annulé
   */
  private canAppointmentBeCancelled(
    appointment: Appointment,
    settings: OrganizationAppointmentSettingsModel
  ): { allowed: boolean; reason?: string } {
    // Vérification du statut
    if (appointment.status === APPOINTMENT_STATUSES.COMPLETED || 
        appointment.status === APPOINTMENT_STATUSES.CANCELLED ||
        appointment.status === APPOINTMENT_STATUSES.NO_SHOW) {
      return { allowed: false, reason: "Appointment cannot be cancelled in its current state" };
    }

    // Vérification du délai d'annulation
    const now = new Date();
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const deadlineHours = settings.getData().bookingRules.cancellationDeadlineHours;

    if (hoursUntilAppointment < deadlineHours) {
      return { 
        allowed: false, 
        reason: `Cancellation deadline has passed (${deadlineHours} hours before appointment)` 
      };
    }

    return { allowed: true };
  }

  /**
   * Récupère les paramètres de l'organisation
   */
  private async getOrganizationSettings(
    organizationId: string
  ): Promise<OrganizationAppointmentSettingsModel | null> {
    const doc = await this.settingsCollection.doc(organizationId).get();
    return OrganizationAppointmentSettingsModel.fromFirestore(doc);
  }

  /**
   * Récupère un service par son ID
   */
  private async getServiceById(organizationId: string, serviceId: string): Promise<Service | null> {
    const doc = await this.servicesCollection.doc(serviceId).get();
    if (!doc.exists) {
      return null;
    }

    const serviceData = doc.data() as Service;
    if (serviceData.organizationId !== organizationId) {
      return null;
    }

    return { ...serviceData, id: doc.id };
  }
}