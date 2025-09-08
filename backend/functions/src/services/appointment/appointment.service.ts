import { 
  Appointment, 
  APPOINTMENT_CONFLICT_MESSAGES, 
  APPOINTMENT_CONFLICT_TYPES, 
  APPOINTMENT_STATUSES, 
  AppointmentConflict,
  AppointmentFilters,
  AppointmentStatus,
  AvailableSlot,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from "../../shared";
import { getFirestore } from "firebase-admin/firestore";
import { 
  CollectionReference, 
  Query, 
  Timestamp
} from "firebase-admin/firestore";
import { AppointmentModel } from "../../models/appointment.model";
import { OrganizationAppointmentSettingsModel } from "../../models/organization-appointment-settings.model";
import { ClientModel } from "../../models/client.model";

/**
 * Service de gestion des rendez-vous
 * 
 * Ce service gère toutes les opérations CRUD sur les rendez-vous,
 * la vérification de disponibilité, la détection de conflits,
 * et la gestion des statuts.
 */
export class AppointmentService {
  private appointmentsCollection: CollectionReference;
  private clientsCollection: CollectionReference;
  private settingsCollection: CollectionReference;

  constructor() {
    const db = getFirestore();
    this.appointmentsCollection = db.collection('appointments');
    this.clientsCollection = db.collection('clients');
    this.settingsCollection = db.collection('organization_appointment_settings');
  }

  /**
   * Crée un nouveau rendez-vous
   */
  async createAppointment(
    request: CreateAppointmentRequest, 
    organizationId: string,
    createdBy: string
  ): Promise<AppointmentModel> {
    // Validation des données d'entrée
    await this.validateCreateRequest(request, organizationId);

    // Vérification de disponibilité et détection de conflits
    const defaultDuration = 30; // minutes
    const conflicts = await this.checkAvailability(
      organizationId,
      request.practitionerId,
      request.date,
      request.startTime,
      defaultDuration
    );

    if (conflicts.length > 0) {
      throw new Error(`Appointment conflicts detected: ${conflicts.map(c => c.message).join(', ')}`);
    }

    // Création du modèle d'appointment
    const appointmentData: Partial<Appointment> = {
      ...request,
      organizationId,
      duration: defaultDuration,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      date: new Date(request.date),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const appointmentModel = new AppointmentModel(appointmentData);
    await appointmentModel.validate();

    // Sauvegarde en base
    const docRef = await this.appointmentsCollection.add(appointmentModel.toFirestore());
    appointmentModel.update({ id: docRef.id }, {
      action: "created",
      performedBy: createdBy,
      reason: "Appointment created"
    });

    await docRef.update(appointmentModel.toFirestore());

    return appointmentModel;
  }

  /**
   * Met à jour un rendez-vous existant
   */
  async updateAppointment(
    appointmentId: string,
    updates: UpdateAppointmentRequest,
    organizationId: string,
    updatedBy: string
  ): Promise<AppointmentModel> {
    // Récupération du rendez-vous existant
    const existingAppointment = await this.getAppointmentById(appointmentId, organizationId);
    if (!existingAppointment) {
      throw new Error("Appointment not found");
    }

    // Vérification des permissions de modification
    if (!existingAppointment.canBeModified()) {
      throw new Error("This appointment cannot be modified");
    }

    // Si on modifie la date/heure, vérifier la disponibilité
    if (updates.date || updates.startTime || updates.duration) {
      const newDate = updates.date || existingAppointment.getData().date.toISOString().split('T')[0];
      const newStartTime = updates.startTime || existingAppointment.getData().startTime;
      const newDuration = updates.duration || existingAppointment.getData().duration;
      const practitionerId = updates.practitionerId || existingAppointment.getData().practitionerId;

      const conflicts = await this.checkAvailability(
        organizationId,
        practitionerId,
        newDate,
        newStartTime,
        newDuration,
        appointmentId // Exclure le rendez-vous actuel de la vérification
      );

      if (conflicts.length > 0) {
        throw new Error(`Appointment conflicts detected: ${conflicts.map(c => c.message).join(', ')}`);
      }
    }

    // Application des mises à jour
    const updateData: Partial<Appointment> = {};
    if (updates.date) {updateData.date = new Date(updates.date);}
    if (updates.startTime) {updateData.startTime = updates.startTime;}
    if (updates.duration) {updateData.duration = updates.duration;}
    if (updates.serviceId) {updateData.serviceId = updates.serviceId;}
    if (updates.practitionerId) {updateData.practitionerId = updates.practitionerId;}
    if (updates.notes !== undefined) {updateData.notes = updates.notes;}
    if (updates.status) {updateData.status = updates.status;}

    existingAppointment.update(updateData, {
      action: "updated",
      performedBy: updatedBy,
      reason: "Appointment updated"
    });

    await existingAppointment.validate();

    // Sauvegarde en base
    const docRef = this.appointmentsCollection.doc(appointmentId);
    await docRef.update(existingAppointment.toFirestore());

    return existingAppointment;
  }

  /**
   * Supprime un rendez-vous
   */
  async deleteAppointment(
    appointmentId: string,
    organizationId: string,
    deletedBy: string,
    reason?: string
  ): Promise<void> {
    const appointment = await this.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Marquer comme supprimé plutôt que de supprimer physiquement
    appointment.update({ 
      status: APPOINTMENT_STATUSES.CANCELLED 
    }, {
      action: "cancelled",
      performedBy: deletedBy,
      reason: reason || "Appointment deleted"
    });

    const docRef = this.appointmentsCollection.doc(appointmentId);
    await docRef.update(appointment.toFirestore());
  }

  /**
   * Récupère un rendez-vous par ID
   */
  async getAppointmentById(
    appointmentId: string, 
    organizationId: string
  ): Promise<AppointmentModel | null> {
    const doc = await this.appointmentsCollection.doc(appointmentId).get();
    
    if (!doc.exists) {
      return null;
    }

    const appointment = AppointmentModel.fromFirestore(doc);
    if (!appointment || appointment.getData().organizationId !== organizationId) {
      return null;
    }

    return appointment;
  }

  /**
   * Récupère les rendez-vous avec filtres
   */
  async getAppointments(
    organizationId: string,
    filters: AppointmentFilters = {}
  ): Promise<AppointmentModel[]> {
    let query: Query = this.appointmentsCollection
      .where('organizationId', '==', organizationId);

    // Application des filtres
    if (filters.startDate) {
      query = query.where('date', '>=', Timestamp.fromDate(filters.startDate));
    }

    if (filters.endDate) {
      query = query.where('date', '<=', Timestamp.fromDate(filters.endDate));
    }

    if (filters.practitionerId) {
      query = query.where('practitionerId', '==', filters.practitionerId);
    }

    if (filters.serviceId) {
      query = query.where('serviceId', '==', filters.serviceId);
    }

    if (filters.clientId) {
      query = query.where('clientId', '==', filters.clientId);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }

    // Tri par date et heure
    query = query.orderBy('date', 'asc').orderBy('startTime', 'asc');

    const snapshot = await query.get();
    const appointments = snapshot.docs
      .map(doc => AppointmentModel.fromFirestore(doc))
      .filter(appointment => appointment !== null) as AppointmentModel[];

    // Filtrage par recherche textuelle si nécessaire
    if (filters.searchQuery) {
      const searchQuery = filters.searchQuery.toLowerCase();
      return appointments.filter(appointment => {
        const data = appointment.getData();
        return (
          data.notes?.toLowerCase().includes(searchQuery) ||
          data.clientId.toLowerCase().includes(searchQuery) ||
          data.serviceId.toLowerCase().includes(searchQuery)
        );
      });
    }

    return appointments;
  }

  /**
   * Vérifie la disponibilité et détecte les conflits
   */
  async checkAvailability(
    organizationId: string,
    practitionerId: string,
    date: string,
    startTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<AppointmentConflict[]> {
    const conflicts: AppointmentConflict[] = [];
    const appointmentDate = new Date(date);

    // 1. Vérifier les horaires d'ouverture
    const workingHoursConflict = await this.checkWorkingHours(
      organizationId, 
      appointmentDate, 
      startTime, 
      duration
    );
    if (workingHoursConflict) {
      conflicts.push(workingHoursConflict);
    }

    // 2. Vérifier les conflits avec d'autres rendez-vous
    const timeConflicts = await this.checkTimeConflicts(
      organizationId,
      practitionerId,
      appointmentDate,
      startTime,
      duration,
      excludeAppointmentId
    );
    conflicts.push(...timeConflicts);

    return conflicts;
  }

  /**
   * Vérifie les horaires d'ouverture
   */
  private async checkWorkingHours(
    organizationId: string,
    date: Date,
    startTime: string,
    duration: number
  ): Promise<AppointmentConflict | null> {
    const settingsDoc = await this.settingsCollection.doc(organizationId).get();
    if (!settingsDoc.exists) {
      return null; // Pas de restrictions si pas de paramètres
    }

    const settings = OrganizationAppointmentSettingsModel.fromFirestore(settingsDoc);
    if (!settings) {
      return null;
    }

    const dayOfWeek = this.getDayOfWeek(date);
    const workingHours = settings.getWorkingHoursForDay(dayOfWeek);

    if (!workingHours) {
      return {
        type: APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS,
        message: APPOINTMENT_CONFLICT_MESSAGES[APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS]
      };
    }

    // Calculer l'heure de fin du rendez-vous
    const endTime = this.calculateEndTime(startTime, duration);

    // Vérifier si le rendez-vous est dans les horaires
    if (startTime < workingHours.start || endTime > workingHours.end) {
      return {
        type: APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS,
        message: APPOINTMENT_CONFLICT_MESSAGES[APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS]
      };
    }

    return null;
  }

  /**
   * Vérifie les conflits de temps avec d'autres rendez-vous
   */
  private async checkTimeConflicts(
    organizationId: string,
    practitionerId: string,
    date: Date,
    startTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<AppointmentConflict[]> {
    const conflicts: AppointmentConflict[] = [];

    // Récupérer tous les rendez-vous du praticien pour cette date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query: Query = this.appointmentsCollection
      .where('organizationId', '==', organizationId)
      .where('practitionerId', '==', practitionerId)
      .where('date', '>=', Timestamp.fromDate(startOfDay))
      .where('date', '<=', Timestamp.fromDate(endOfDay))
      .where('status', 'in', [
        APPOINTMENT_STATUSES.SCHEDULED,
        APPOINTMENT_STATUSES.CONFIRMED
      ]);

    const snapshot = await query.get();
    const existingAppointments = snapshot.docs
      .map(doc => AppointmentModel.fromFirestore(doc))
      .filter(appointment => 
        appointment !== null && 
        appointment.id !== excludeAppointmentId
      ) as AppointmentModel[];

    // Créer un rendez-vous temporaire pour la vérification
    const tempAppointment = new AppointmentModel({
      organizationId,
      practitionerId,
      date,
      startTime,
      duration,
      clientId: 'temp',
      serviceId: 'temp',
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: []
    });

    // Vérifier les conflits avec chaque rendez-vous existant
    for (const existingAppointment of existingAppointments) {
      if (tempAppointment.hasTimeConflict(existingAppointment.getData())) {
        conflicts.push({
          type: APPOINTMENT_CONFLICT_TYPES.TIME_OVERLAP,
          message: APPOINTMENT_CONFLICT_MESSAGES[APPOINTMENT_CONFLICT_TYPES.TIME_OVERLAP],
          conflictingAppointmentId: existingAppointment.id
        });
      }
    }

    return conflicts;
  }

  /**
   * Met à jour le statut d'un rendez-vous
   */
  async updateAppointmentStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    organizationId: string,
    updatedBy: string,
    reason?: string
  ): Promise<AppointmentModel> {
    const appointment = await this.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Validation des transitions de statut
    this.validateStatusTransition(appointment.getData().status, newStatus);

    appointment.updateStatus(newStatus, updatedBy, reason);
    await appointment.validate();

    // Sauvegarde en base
    const docRef = this.appointmentsCollection.doc(appointmentId);
    await docRef.update(appointment.toFirestore());

    return appointment;
  }

  /**
   * Confirme un rendez-vous
   */
  async confirmAppointment(
    appointmentId: string,
    organizationId: string,
    confirmedBy: string
  ): Promise<AppointmentModel> {
    return this.updateAppointmentStatus(
      appointmentId,
      APPOINTMENT_STATUSES.CONFIRMED,
      organizationId,
      confirmedBy,
      "Appointment confirmed"
    );
  }

  /**
   * Termine un rendez-vous
   */
  async completeAppointment(
    appointmentId: string,
    organizationId: string,
    completedBy: string,
    notes?: string
  ): Promise<AppointmentModel> {
    const appointment = await this.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    const updates: Partial<Appointment> = { 
      status: APPOINTMENT_STATUSES.COMPLETED 
    };
    if (notes) {
      updates.notes = notes;
    }

    appointment.update(updates, {
      action: "appointment_completed",
      performedBy: completedBy,
      reason: "Appointment completed"
    });

    await appointment.validate();

    const docRef = this.appointmentsCollection.doc(appointmentId);
    await docRef.update(appointment.toFirestore());

    return appointment;
  }

  /**
   * Annule un rendez-vous
   */
  async cancelAppointment(
    appointmentId: string,
    organizationId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<AppointmentModel> {
    const appointment = await this.getAppointmentById(appointmentId, organizationId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Vérifier si l'annulation est possible
    const settings = await this.getOrganizationSettings(organizationId);
    const cancellationDeadline = settings?.getData().bookingRules.cancellationDeadlineHours || 24;

    if (!appointment.canBeCancelled(cancellationDeadline)) {
      throw new Error("Cancellation deadline has passed");
    }

    return this.updateAppointmentStatus(
      appointmentId,
      APPOINTMENT_STATUSES.CANCELLED,
      organizationId,
      cancelledBy,
      reason || "Appointment cancelled"
    );
  }

  /**
   * Marque un rendez-vous comme absent
   */
  async markAsNoShow(
    appointmentId: string,
    organizationId: string,
    markedBy: string
  ): Promise<AppointmentModel> {
    return this.updateAppointmentStatus(
      appointmentId,
      APPOINTMENT_STATUSES.NO_SHOW,
      organizationId,
      markedBy,
      "Client did not show up"
    );
  }

  /**
   * Récupère les créneaux disponibles pour une date donnée
   */
  async getAvailableSlots(
    organizationId: string,
    practitionerId: string,
    date: string,
    serviceId?: string,
    duration?: number
  ): Promise<AvailableSlot[]> {
    const appointmentDate = new Date(date);
    const slotDuration = duration || 30;

    // Récupérer les paramètres de l'organisation
    const settings = await this.getOrganizationSettings(organizationId);
    if (!settings) {
      return [];
    }

    const dayOfWeek = this.getDayOfWeek(appointmentDate);
    const workingHours = settings.getWorkingHoursForDay(dayOfWeek);
    
    if (!workingHours) {
      return []; // Pas ouvert ce jour-là
    }

    // Récupérer les rendez-vous existants pour cette date
    const existingAppointments = await this.getAppointments(organizationId, {
      startDate: appointmentDate,
      endDate: appointmentDate,
      practitionerId,
      status: [APPOINTMENT_STATUSES.SCHEDULED, APPOINTMENT_STATUSES.CONFIRMED]
    });

    // Générer les créneaux disponibles
    const availableSlots: AvailableSlot[] = [];
    const bufferTime = settings.getData().bufferTimeBetweenAppointments;
    
    let currentTime = this.timeToMinutes(workingHours.start);
    const endTime = this.timeToMinutes(workingHours.end);

    while (currentTime + slotDuration <= endTime) {
      const slotStartTime = this.minutesToTime(currentTime);
      const slotEndTime = this.minutesToTime(currentTime + slotDuration);

      // Vérifier s'il y a conflit avec un rendez-vous existant
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = this.timeToMinutes(appointment.getData().startTime);
        const appointmentEnd = appointmentStart + appointment.getData().duration;
        
        return currentTime < appointmentEnd && (currentTime + slotDuration) > appointmentStart;
      });

      if (!hasConflict) {
        availableSlots.push({
          date,
          startTime: slotStartTime,
          endTime: slotEndTime,
          duration: slotDuration,
          practitionerId,
          serviceId
        });
      }

      // Passer au créneau suivant (avec temps de battement)
      currentTime += slotDuration + bufferTime;
    }

    return availableSlots;
  }

  // Méthodes utilitaires privées

  /**
   * Valide une demande de création de rendez-vous
   */
  private async validateCreateRequest(
    request: CreateAppointmentRequest,
    organizationId: string
  ): Promise<void> {
    // Vérifier que le client existe
    const clientDoc = await this.clientsCollection.doc(request.clientId).get();
    if (!clientDoc.exists) {
      throw new Error("Client not found");
    }

    const client = ClientModel.fromFirestore(clientDoc);
    if (!client || client.getData().organizationId !== organizationId) {
      throw new Error("Client not found in organization");
    }

    // Validation des données de base
    if (!request.date || !request.startTime) {
      throw new Error("Date and start time are required");
    }

    // Validation du format de date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.date)) {
      throw new Error("Invalid date format (expected YYYY-MM-DD)");
    }

    // Validation du format d'heure
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(request.startTime)) {
      throw new Error("Invalid time format (expected HH:MM)");
    }

    // Vérifier que la date est dans le futur
    const appointmentDate = new Date(request.date);
    if (appointmentDate <= new Date()) {
      throw new Error("Appointment date must be in the future");
    }
  }

  /**
   * Valide les transitions de statut
   */
  private validateStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus
  ): void {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [APPOINTMENT_STATUSES.SCHEDULED]: [
        APPOINTMENT_STATUSES.CONFIRMED,
        APPOINTMENT_STATUSES.CANCELLED,
        APPOINTMENT_STATUSES.NO_SHOW
      ],
      [APPOINTMENT_STATUSES.CONFIRMED]: [
        APPOINTMENT_STATUSES.COMPLETED,
        APPOINTMENT_STATUSES.CANCELLED,
        APPOINTMENT_STATUSES.NO_SHOW
      ],
      [APPOINTMENT_STATUSES.COMPLETED]: [], // État final
      [APPOINTMENT_STATUSES.CANCELLED]: [], // État final
      [APPOINTMENT_STATUSES.NO_SHOW]: []    // État final
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
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
   * Calcule l'heure de fin à partir de l'heure de début et de la durée
   */
  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  /**
   * Convertit une heure au format HH:MM en minutes depuis minuit
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convertit des minutes depuis minuit en format HH:MM
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Récupère le jour de la semaine en anglais
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }
}