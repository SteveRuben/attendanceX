import {DocumentSnapshot} from "firebase-admin/firestore";
import {
  Event,
  EventType,
  EventStatus,
  CreateEventRequest,
  EventPriority} from "@attendance-x/shared";
import {BaseModel} from "./base.model";
/**
 * Modèle de données pour les événements
 *
 * Ce modèle gère la validation, la transformation et la manipulation des événements.
 * Il inclut des méthodes pour valider les champs, gérer les participants, et suivre l'état de l'événement.
 */
export class EventModel extends BaseModel<Event> {
  constructor(data: Partial<Event>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const event = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(event, [
      "title", "description", "type", "status",
      "startDateTime", "endDateTime", "organizerId",
    ]);

    // Validation des types enum
    BaseModel.validateEnum(event.type, EventType, "type");
    BaseModel.validateEnum(event.status, EventStatus, "status");

    // Validation des dates
    if (!BaseModel.validateDate(event.startDateTime)) {
      throw new Error("Invalid start date");
    }
    if (!BaseModel.validateDate(event.endDateTime)) {
      throw new Error("Invalid end date");
    }

    // Validation de la logique des dates
    if (event.endDateTime <= event.startDateTime) {
      throw new Error("End date must be after start date");
    }

    // Validation des longueurs
    this.validateLength(event.title, 3, 200, "title");
    this.validateLength(event.description, 10, 2000, "description");

    // Validation du nombre maximum de participants
    if (event.maxParticipants && event.maxParticipants < 1) {
      throw new Error("Maximum participants must be at least 1");
    }

    // Validation de la localisation
    if (!event.location || !event.location.type) {
      throw new Error("Location type is required");
    }

    if (event.location.type === "physical" && !event.location.address) {
      throw new Error("Physical address is required for physical events");
    }

    if (event.location.type === "virtual" && !event.location.virtualUrl) {
      throw new Error("Virtual URL is required for virtual events");
    }

    // Validation des participants
    if (!Array.isArray(event.participants)) {
      throw new Error("Participants must be an array");
    }

    return true;
  }

  toFirestore() {
    const {id, ...data} = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): EventModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = EventModel.prototype.convertDatesFromFirestore(data);

    return new EventModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateEventRequest, organizerId: string): EventModel {
    const defaultStats = {
      totalInvited: request.participants.length,
      totalConfirmed: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalExcused: 0,
      totalLate: 0,
      attendanceRate: 0,
      punctualityRate: 0,
    };

    const defaultReminderSettings = {
      enabled: true,
      intervals: [60, 15], // 1 heure et 15 minutes avant
      channels: ["email" as const],
      sendToOrganizers: true,
      sendToParticipants: true,
    };

    return new EventModel({
      ...request,
      organizerId,
      organizerName: "", // À remplir par le service
      coOrganizers: [],
      status: EventStatus.DRAFT,
      confirmedParticipants: [],
      waitingList: [],
      tags: request.tags || [],
      priority: request.priority || EventPriority.MEDIUM,
      isPrivate: request.isPrivate || false,
      requiresApproval: false,
      reminderSettings: request.reminderSettings || defaultReminderSettings,
      stats: defaultStats,
      allowFeedback: false,
      version: 1,
      allDay: false,
      timezone: request.timezone || "UTC",
    });
  }

  // 🆕 Validation des conflits d'horaires
  hasScheduleConflict(existingEvents: Event[]): boolean {
    return existingEvents.some((event) =>
      event.id !== this.data.id && // Exclure l'événement actuel
      this.isTimeOverlapping(
        this.data.startDateTime,
        this.data.endDateTime,
        event.startDateTime,
        event.endDateTime
      )
    );
  }

  private isTimeOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  // 🆕 Estimation de la durée
  getDurationMinutes(): number {
    return Math.round((this.data.endDateTime.getTime() - this.data.startDateTime.getTime()) / (1000 * 60));
  }


  // Méthodes d'instance
  isActive(): boolean {
    return this.data.status === EventStatus.PUBLISHED || this.data.status === EventStatus.IN_PROGRESS;
  }

  isUpcoming(): boolean {
    return this.data.startDateTime > new Date();
  }

  isOngoing(): boolean {
    const now = new Date();
    return this.data.startDateTime <= now && this.data.endDateTime >= now;
  }

  isPast(): boolean {
    return this.data.endDateTime < new Date();
  }

  // 🆕 Vérification des pré-requis pour publication
  canPublish(): { canPublish: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!this.data.title?.trim()) {
      reasons.push("Titre requis");
    }

    if (!this.data.description?.trim()) {
      reasons.push("Description requise");
    }

    if (this.data.startDateTime <= new Date()) {
      reasons.push("La date de début doit être dans le futur");
    }

    if (!this.data.location?.address && this.data.location?.type === "physical") {
      reasons.push("Adresse requise pour un événement physique");
    }

    if (this.data.participants.length === 0) {
      reasons.push("Au moins un participant requis");
    }

    return {
      canPublish: reasons.length === 0,
      reasons,
    };
  }

  canRegister(): boolean {
    if (!this.isActive() || !this.isUpcoming()) {
      return false;
    }

    if (this.data.registrationDeadline && this.data.registrationDeadline < new Date()) {
      return false;
    }

    if (this.data.maxParticipants && this.data.participants.length >= this.data.maxParticipants) {
      return false;
    }

    return true;
  }

  addParticipant(userId: string): void {
    if (this.data.participants.includes(userId)) {
      throw new Error("User is already a participant");
    }

    if (this.data.maxParticipants && this.data.participants.length >= this.data.maxParticipants) {
      // Ajouter à la liste d'attente
      if (!this.data.waitingList.includes(userId)) {
        this.data.waitingList.push(userId);
      }
      throw new Error("Event is full, added to waiting list");
    }

    this.data.participants.push(userId);
    this.updateStats();
    this.updateTimestamp();
  }

  removeParticipant(userId: string): void {
    const index = this.data.participants.indexOf(userId);
    if (index === -1) {
      throw new Error("User is not a participant");
    }

    this.data.participants.splice(index, 1);

    // Retirer aussi de la liste des confirmés
    const confirmedIndex = this.data.confirmedParticipants.indexOf(userId);
    if (confirmedIndex !== -1) {
      this.data.confirmedParticipants.splice(confirmedIndex, 1);
    }

    // Promouvoir quelqu'un de la liste d'attente
    if (this.data.waitingList.length > 0) {
      const nextUser = this.data.waitingList.shift()!;
      this.data.participants.push(nextUser);
    }

    this.updateStats();
    this.updateTimestamp();
  }

  confirmParticipant(userId: string): void {
    if (!this.data.participants.includes(userId)) {
      throw new Error("User is not a participant");
    }

    if (!this.data.confirmedParticipants.includes(userId)) {
      this.data.confirmedParticipants.push(userId);
      this.updateStats();
      this.updateTimestamp();
    }
  }

  updateStatus(newStatus: EventStatus, updatedBy: string): void {
    const oldStatus = this.data.status;

    this.update({status: newStatus}, {
      action: "status_changed",
      performedBy: updatedBy,
      oldValue: {status: oldStatus},
      newValue: {status: newStatus},
    });
  }

  private updateStats(): void {
    this.data.stats.totalInvited = this.data.participants.length;
    this.data.stats.totalConfirmed = this.data.confirmedParticipants.length;

    // Le taux de présence sera calculé après l'événement
    if (this.data.stats.totalInvited > 0) {
      this.data.stats.attendanceRate = (this.data.stats.totalPresent / this.data.stats.totalInvited) * 100;
    }

    if (this.data.stats.totalPresent > 0) {
      this.data.stats.punctualityRate = ((this.data.stats.totalPresent - this.data.stats.totalLate) / this.data.stats.totalPresent) * 100;
    }
  }

  generateQRCode(): string {
    // Génère un code QR unique pour l'événement
    const eventData = {
      eventId: this.data.id,
      eventTitle: this.data.title,
      timestamp: Date.now(),
    };

    return Buffer.from(JSON.stringify(eventData)).toString("base64");
  }

  isQRCodeValid(): boolean {
    if (!this.data.qrCodeExpiresAt) {
      return false;
    }

    return this.data.qrCodeExpiresAt > new Date();
  }

  refreshQRCode(): void {
    this.data.qrCode = this.generateQRCode();
    this.data.qrCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
    this.updateTimestamp();
  }

  // 🆕 Génération QR Code sécurisée
  generateSecureQRCode(): { qrCode: string; expiresAt: Date } {
    const payload = {
      eventId: this.data.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };

    // TODO: Ajouter signature cryptographique
    const qrCode = Buffer.from(JSON.stringify(payload)).toString("base64");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 heures

    this.update({
      qrCode,
      qrCodeExpiresAt: expiresAt,
    });

    return {qrCode, expiresAt};
  }
}
