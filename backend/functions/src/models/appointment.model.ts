import { DocumentSnapshot } from "firebase-admin/firestore";
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentRequest,
  APPOINTMENT_STATUSES,
  VALIDATION_RULES,
  VALIDATION_PATTERNS
} from "@attendance-x/shared";
import { BaseModel } from "./base.model";

/**
 * Modèle de données pour les rendez-vous
 * 
 * Ce modèle gère la validation, la transformation et la manipulation des rendez-vous.
 * Il inclut des méthodes pour valider les créneaux, gérer les conflits, et suivre l'état du rendez-vous.
 */
export class AppointmentModel extends BaseModel<Appointment> {
  constructor(data: Partial<Appointment>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const appointment = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(appointment, [
      "organizationId", "clientId", "practitionerId", "serviceId",
      "date", "startTime", "duration", "status"
    ]);

    // Validation du statut
    BaseModel.validateEnum(appointment.status, APPOINTMENT_STATUSES, "status");

    // Validation de la date
    if (!BaseModel.validateDate(appointment.date)) {
      throw new Error("Invalid appointment date");
    }

    // Validation de l'heure de début
    if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(appointment.startTime)) {
      throw new Error("Invalid start time format (expected HH:MM)");
    }

    // Validation de la durée
    this.validateRange(
      appointment.duration,
      VALIDATION_RULES.APPOINTMENT.MIN_DURATION_MINUTES,
      VALIDATION_RULES.APPOINTMENT.MAX_DURATION_MINUTES,
      "duration"
    );

    // Validation des notes si présentes
    if (appointment.notes) {
      this.validateLength(
        appointment.notes,
        0,
        VALIDATION_RULES.APPOINTMENT.NOTES_MAX_LENGTH,
        "notes"
      );
    }

    // Validation de la date dans le futur (sauf pour les rendez-vous terminés/annulés)
    if (appointment.status === APPOINTMENT_STATUSES.SCHEDULED || 
        appointment.status === APPOINTMENT_STATUSES.CONFIRMED) {
      const appointmentDateTime = this.getAppointmentDateTime();
      if (appointmentDateTime <= new Date()) {
        throw new Error("Appointment date must be in the future for scheduled/confirmed appointments");
      }
    }

    // Validation des rappels
    if (appointment.reminders && Array.isArray(appointment.reminders)) {
      if (appointment.reminders.length > VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS) {
        throw new Error(`Maximum ${VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS} reminders allowed`);
      }
    }

    return true;
  }

  toFirestore() {
    const { id, endTime, ...data } = this.data;
    return this.convertDatesToFirestore({
      ...data,
      reminders: data.reminders || []
    });
  }

  static fromFirestore(doc: DocumentSnapshot): AppointmentModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = AppointmentModel.prototype.convertDatesFromFirestore(data);

    return new AppointmentModel({
      id: doc.id,
      ...convertedData,
      reminders: convertedData.reminders || []
    });
  }

  static fromCreateRequest(request: CreateAppointmentRequest, organizationId: string): AppointmentModel {
    return new AppointmentModel({
      ...request,
      date: new Date(request.date),
      organizationId,
      status: APPOINTMENT_STATUSES.SCHEDULED,
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Méthodes utilitaires

  /**
   * Calcule l'heure de fin du rendez-vous
   */
  getEndTime(): string {
    const [hours, minutes] = this.data.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + this.data.duration;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  /**
   * Combine la date et l'heure de début en un objet Date
   */
  getAppointmentDateTime(): Date {
    const [hours, minutes] = this.data.startTime.split(':').map(Number);
    const dateTime = new Date(this.data.date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  /**
   * Combine la date et l'heure de fin en un objet Date
   */
  getAppointmentEndDateTime(): Date {
    const endTime = this.getEndTime();
    const [hours, minutes] = endTime.split(':').map(Number);
    const dateTime = new Date(this.data.date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime;
  }

  /**
   * Vérifie si le rendez-vous est dans le futur
   */
  isUpcoming(): boolean {
    return this.getAppointmentDateTime() > new Date();
  }

  /**
   * Vérifie si le rendez-vous est en cours
   */
  isOngoing(): boolean {
    const now = new Date();
    const startTime = this.getAppointmentDateTime();
    const endTime = this.getAppointmentEndDateTime();
    return startTime <= now && endTime >= now;
  }

  /**
   * Vérifie si le rendez-vous est passé
   */
  isPast(): boolean {
    return this.getAppointmentEndDateTime() < new Date();
  }

  /**
   * Vérifie si le rendez-vous peut être annulé
   */
  canBeCancelled(cancellationDeadlineHours: number = 24): boolean {
    if (this.data.status === APPOINTMENT_STATUSES.CANCELLED || 
        this.data.status === APPOINTMENT_STATUSES.COMPLETED ||
        this.data.status === APPOINTMENT_STATUSES.NO_SHOW) {
      return false;
    }

    const appointmentTime = this.getAppointmentDateTime();
    const deadlineTime = new Date(appointmentTime.getTime() - (cancellationDeadlineHours * 60 * 60 * 1000));
    
    return new Date() < deadlineTime;
  }

  /**
   * Vérifie si le rendez-vous peut être modifié
   */
  canBeModified(): boolean {
    return this.data.status === APPOINTMENT_STATUSES.SCHEDULED || 
           this.data.status === APPOINTMENT_STATUSES.CONFIRMED;
  }

  /**
   * Vérifie s'il y a conflit avec un autre rendez-vous
   */
  hasTimeConflict(otherAppointment: Appointment): boolean {
    // Vérifier si c'est le même jour et le même praticien
    if (this.data.date.toDateString() !== otherAppointment.date.toDateString() ||
        this.data.practitionerId !== otherAppointment.practitionerId ||
        this.data.id === otherAppointment.id) {
      return false;
    }

    const thisStart = this.getAppointmentDateTime();
    const thisEnd = this.getAppointmentEndDateTime();
    
    const otherModel = new AppointmentModel(otherAppointment);
    const otherStart = otherModel.getAppointmentDateTime();
    const otherEnd = otherModel.getAppointmentEndDateTime();

    // Vérifier le chevauchement
    return thisStart < otherEnd && thisEnd > otherStart;
  }

  /**
   * Met à jour le statut du rendez-vous
   */
  updateStatus(newStatus: AppointmentStatus, updatedBy: string, reason?: string): void {
    const oldStatus = this.data.status;

    this.update({ status: newStatus }, {
      action: "status_changed",
      performedBy: updatedBy,
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      reason
    });
  }

  /**
   * Ajoute un rappel au rendez-vous
   */
  addReminder(reminder: Omit<Appointment['reminders'][0], 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!this.data.reminders) {
      this.data.reminders = [];
    }

    if (this.data.reminders.length >= VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS) {
      throw new Error(`Maximum ${VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS} reminders allowed`);
    }

    const newReminder = {
      ...reminder,
      id: this.generateReminderId(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.data.reminders.push(newReminder);
    this.updateTimestamp();
  }

  /**
   * Met à jour un rappel
   */
  updateReminder(reminderId: string, updates: Partial<Appointment['reminders'][0]>): void {
    if (!this.data.reminders) {
      return;
    }

    const reminderIndex = this.data.reminders.findIndex(r => r.id === reminderId);
    if (reminderIndex === -1) {
      throw new Error("Reminder not found");
    }

    this.data.reminders[reminderIndex] = {
      ...this.data.reminders[reminderIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.updateTimestamp();
  }

  /**
   * Génère un ID unique pour les rappels
   */
  private generateReminderId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcule la durée en heures et minutes
   */
  getDurationFormatted(): string {
    const hours = Math.floor(this.data.duration / 60);
    const minutes = this.data.duration % 60;
    
    if (hours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h${minutes}min`;
    }
  }

  /**
   * Vérifie si le rendez-vous nécessite une confirmation
   */
  needsConfirmation(): boolean {
    return this.data.status === APPOINTMENT_STATUSES.SCHEDULED;
  }

  /**
   * Confirme le rendez-vous
   */
  confirm(confirmedBy: string): void {
    if (this.data.status !== APPOINTMENT_STATUSES.SCHEDULED) {
      throw new Error("Only scheduled appointments can be confirmed");
    }

    this.updateStatus(APPOINTMENT_STATUSES.CONFIRMED, confirmedBy, "Appointment confirmed");
  }

  /**
   * Marque le rendez-vous comme terminé
   */
  complete(completedBy: string, notes?: string): void {
    if (this.data.status !== APPOINTMENT_STATUSES.CONFIRMED && 
        this.data.status !== APPOINTMENT_STATUSES.SCHEDULED) {
      throw new Error("Only confirmed or scheduled appointments can be completed");
    }

    const updates: Partial<Appointment> = { status: APPOINTMENT_STATUSES.COMPLETED };
    if (notes) {
      updates.notes = notes;
    }

    this.update(updates, {
      action: "appointment_completed",
      performedBy: completedBy,
      reason: "Appointment completed"
    });
  }

  /**
   * Annule le rendez-vous
   */
  cancel(cancelledBy: string, reason?: string): void {
    if (!this.canBeCancelled()) {
      throw new Error("This appointment cannot be cancelled");
    }

    this.update({ status: APPOINTMENT_STATUSES.CANCELLED }, {
      action: "appointment_cancelled",
      performedBy: cancelledBy,
      reason: reason || "Appointment cancelled"
    });
  }

  /**
   * Marque le rendez-vous comme absent
   */
  markAsNoShow(markedBy: string): void {
    if (this.data.status !== APPOINTMENT_STATUSES.CONFIRMED && 
        this.data.status !== APPOINTMENT_STATUSES.SCHEDULED) {
      throw new Error("Only confirmed or scheduled appointments can be marked as no-show");
    }

    this.updateStatus(APPOINTMENT_STATUSES.NO_SHOW, markedBy, "Client did not show up");
  }
}