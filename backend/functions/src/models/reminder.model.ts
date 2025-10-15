import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { Reminder, ReminderType } from "../common/types";
import { REMINDER_STATUSES, REMINDER_TYPES, VALIDATION_RULES } from "../common/constants";

/**
 * Modèle de données pour les rappels
 * 
 * Ce modèle gère la validation, la transformation et la manipulation des rappels.
 * Il inclut des méthodes pour gérer l'état des rappels et les tentatives d'envoi.
 */
export class ReminderModel extends BaseModel<Reminder> {
  constructor(data: Partial<Reminder>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const reminder = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(reminder, [
      "appointmentId", "type", "scheduledFor", "status", "content", "retryCount"
    ]);

    // Validation du type de rappel
    BaseModel.validateEnum(reminder.type, REMINDER_TYPES, "type");

    // Validation du statut
    BaseModel.validateEnum(reminder.status, REMINDER_STATUSES, "status");

    // Validation de la date de planification
    if (!BaseModel.validateDate(reminder.scheduledFor)) {
      throw new Error("Invalid scheduled date");
    }

    // Validation du contenu
    if (!reminder.content || reminder.content.trim().length === 0) {
      throw new Error("Reminder content cannot be empty");
    }

    // Validation de la longueur du contenu selon le type
    if (reminder.type === REMINDER_TYPES.SMS) {
      // Limite SMS plus stricte
      this.validateLength(
        reminder.content,
        1,
        160, // Limite SMS standard
        "SMS content"
      );
    } else {
      // Limite email plus généreuse
      this.validateLength(
        reminder.content,
        1,
        2000,
        "email content"
      );
    }

    // Validation du nombre de tentatives
    this.validateRange(
      reminder.retryCount,
      0,
      VALIDATION_RULES.APPOINTMENT.MAX_RETRY_ATTEMPTS,
      "retryCount"
    );

    // Validation de la date d'envoi si le statut est "sent"
    if (reminder.status === REMINDER_STATUSES.SENT && !reminder.sentAt) {
      throw new Error("Sent reminders must have a sentAt date");
    }

    // Validation du message d'erreur si le statut est "failed"
    if (reminder.status === REMINDER_STATUSES.FAILED && !reminder.errorMessage) {
      throw new Error("Failed reminders must have an error message");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): ReminderModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = ReminderModel.prototype.convertDatesFromFirestore(data);

    return new ReminderModel({
      id: doc.id,
      ...convertedData
    });
  }

  static createForAppointment(
    appointmentId: string,
    type: ReminderType,
    scheduledFor: Date,
    content: string
  ): ReminderModel {
    return new ReminderModel({
      appointmentId,
      type,
      scheduledFor,
      content,
      status: REMINDER_STATUSES.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Méthodes utilitaires

  /**
   * Vérifie si le rappel est en attente
   */
  isPending(): boolean {
    return this.data.status === REMINDER_STATUSES.PENDING;
  }

  /**
   * Vérifie si le rappel a été envoyé
   */
  isSent(): boolean {
    return this.data.status === REMINDER_STATUSES.SENT;
  }

  /**
   * Vérifie si le rappel a échoué
   */
  isFailed(): boolean {
    return this.data.status === REMINDER_STATUSES.FAILED;
  }

  /**
   * Vérifie si le rappel est prêt à être envoyé
   */
  isReadyToSend(): boolean {
    return this.isPending() && this.data.scheduledFor <= new Date();
  }

  /**
   * Vérifie si le rappel peut être retenté
   */
  canRetry(): boolean {
    return this.isFailed() && 
           this.data.retryCount < VALIDATION_RULES.APPOINTMENT.MAX_RETRY_ATTEMPTS;
  }

  /**
   * Vérifie si le rappel est expiré (trop tard pour l'envoyer)
   */
  isExpired(): boolean {
    // Un rappel est considéré comme expiré s'il est encore en attente
    // mais que l'heure prévue est dépassée de plus d'une heure
    if (!this.isPending()) {return false;}
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.data.scheduledFor < oneHourAgo;
  }

  /**
   * Marque le rappel comme envoyé
   */
  markAsSent(sentBy: string): void {
    if (!this.isPending()) {
      throw new Error("Only pending reminders can be marked as sent");
    }

    this.update({
      status: REMINDER_STATUSES.SENT,
      sentAt: new Date()
    }, {
      action: "reminder_sent",
      performedBy: sentBy,
      oldValue: { status: this.data.status },
      newValue: { status: REMINDER_STATUSES.SENT }
    });
  }

  /**
   * Marque le rappel comme échoué
   */
  markAsFailed(errorMessage: string, failedBy: string): void {
    if (this.isSent()) {
      throw new Error("Sent reminders cannot be marked as failed");
    }

    this.update({
      status: REMINDER_STATUSES.FAILED,
      errorMessage: errorMessage,
      retryCount: this.data.retryCount + 1
    }, {
      action: "reminder_failed",
      performedBy: failedBy,
      oldValue: { 
        status: this.data.status,
        retryCount: this.data.retryCount
      },
      newValue: { 
        status: REMINDER_STATUSES.FAILED,
        retryCount: this.data.retryCount + 1
      },
      reason: errorMessage
    });
  }

  /**
   * Replanifie le rappel pour une nouvelle tentative
   */
  rescheduleForRetry(newScheduledTime: Date, rescheduledBy: string): void {
    if (!this.canRetry()) {
      throw new Error("This reminder cannot be retried");
    }

    this.update({
      status: REMINDER_STATUSES.PENDING,
      scheduledFor: newScheduledTime,
      errorMessage: undefined
    }, {
      action: "reminder_rescheduled",
      performedBy: rescheduledBy,
      oldValue: { 
        status: this.data.status,
        scheduledFor: this.data.scheduledFor
      },
      newValue: { 
        status: REMINDER_STATUSES.PENDING,
        scheduledFor: newScheduledTime
      },
      reason: `Retry attempt ${this.data.retryCount + 1}`
    });
  }

  /**
   * Met à jour le contenu du rappel
   */
  updateContent(newContent: string, updatedBy: string): void {
    if (this.isSent()) {
      throw new Error("Cannot update content of sent reminders");
    }

    // Validation du nouveau contenu
    if (!newContent || newContent.trim().length === 0) {
      throw new Error("Reminder content cannot be empty");
    }

    if (this.data.type === REMINDER_TYPES.SMS && newContent.length > 160) {
      throw new Error("SMS content cannot exceed 160 characters");
    }

    const oldContent = this.data.content;

    this.update({ content: newContent }, {
      action: "reminder_content_updated",
      performedBy: updatedBy,
      oldValue: { content: oldContent },
      newValue: { content: newContent }
    });
  }

  /**
   * Calcule le délai avant l'envoi
   */
  getTimeUntilSend(): number {
    return this.data.scheduledFor.getTime() - Date.now();
  }

  /**
   * Formate le délai avant l'envoi pour l'affichage
   */
  getFormattedTimeUntilSend(): string {
    const msUntilSend = this.getTimeUntilSend();
    
    if (msUntilSend <= 0) {
      return "Maintenant";
    }

    const minutes = Math.floor(msUntilSend / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Dans ${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Dans ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return `Dans ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  /**
   * Génère un objet pour l'affichage dans l'interface
   */
  toDisplayObject() {
    return {
      id: this.data.id,
      appointmentId: this.data.appointmentId,
      type: this.data.type,
      status: this.data.status,
      scheduledFor: this.data.scheduledFor,
      formattedTimeUntilSend: this.getFormattedTimeUntilSend(),
      content: this.data.content,
      retryCount: this.data.retryCount,
      canRetry: this.canRetry(),
      isExpired: this.isExpired(),
      sentAt: this.data.sentAt,
      errorMessage: this.data.errorMessage,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt
    };
  }

  /**
   * Génère les statistiques du rappel
   */
  getStats() {
    return {
      type: this.data.type,
      status: this.data.status,
      retryCount: this.data.retryCount,
      isSuccessful: this.isSent(),
      isFailed: this.isFailed(),
      isPending: this.isPending(),
      timeToSend: this.getTimeUntilSend(),
      contentLength: this.data.content.length
    };
  }

  /**
   * Vérifie si le rappel correspond aux critères de recherche
   */
  matchesSearch(query: string): boolean {
    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) {return true;}

    const searchableFields = [
      this.data.appointmentId,
      this.data.type,
      this.data.status,
      this.data.content,
      this.data.errorMessage
    ];

    return searchableFields.some(field => 
      field?.toLowerCase().includes(searchQuery)
    );
  }

  /**
   * Clone le rappel pour un autre rendez-vous
   */
  cloneForAppointment(newAppointmentId: string): ReminderModel {
    return new ReminderModel({
      appointmentId: newAppointmentId,
      type: this.data.type,
      scheduledFor: this.data.scheduledFor,
      content: this.data.content,
      status: REMINDER_STATUSES.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}