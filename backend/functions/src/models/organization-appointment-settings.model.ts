import { DocumentSnapshot } from "firebase-admin/firestore";
import {
  OrganizationAppointmentSettings,
  WorkingHours,
  BookingRules,
  ReminderConfig,
  AppointmentNotificationTemplate,
  VALIDATION_RULES,
  VALIDATION_PATTERNS,
  WEEKDAYS,
  REMINDER_TYPES,
  SUPPORTED_LANGUAGES,
  APPOINTMENT_DEFAULTS,
  COMMON_TIMEZONES
} from "@attendance-x/shared";
import { BaseModel } from "./base.model";

/**
 * Modèle de données pour les paramètres de rendez-vous d'une organisation
 * 
 * Ce modèle gère la validation, la transformation et la manipulation des paramètres
 * de rendez-vous spécifiques à chaque organisation.
 */
export class OrganizationAppointmentSettingsModel extends BaseModel<OrganizationAppointmentSettings> {
  constructor(data: Partial<OrganizationAppointmentSettings>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const settings = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(settings, [
      "workingHours", "services", "bookingRules", "reminderConfig", 
      "timezone", "defaultAppointmentDuration", "bufferTimeBetweenAppointments"
    ]);

    // Validation des horaires de travail
    await this.validateWorkingHours(settings.workingHours);

    // Validation des règles de réservation
    await this.validateBookingRules(settings.bookingRules);

    // Validation de la configuration des rappels
    await this.validateReminderConfig(settings.reminderConfig);

    // Validation du fuseau horaire
    if (!COMMON_TIMEZONES.includes(settings.timezone as any)) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: settings.timezone });
      } catch (error) {
        throw new Error("Invalid timezone");
      }
    }

    // Validation de la durée par défaut
    this.validateRange(
      settings.defaultAppointmentDuration,
      VALIDATION_RULES.APPOINTMENT.MIN_DURATION_MINUTES,
      VALIDATION_RULES.APPOINTMENT.MAX_DURATION_MINUTES,
      "defaultAppointmentDuration"
    );

    // Validation du temps de battement
    this.validateRange(
      settings.bufferTimeBetweenAppointments,
      VALIDATION_RULES.APPOINTMENT.MIN_BUFFER_MINUTES,
      VALIDATION_RULES.APPOINTMENT.MAX_BUFFER_MINUTES,
      "bufferTimeBetweenAppointments"
    );

    // Validation de l'URL publique si présente
    if (settings.publicBookingUrl) {
      this.validateLength(
        settings.publicBookingUrl,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MIN_LENGTH,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MAX_LENGTH,
        "publicBookingUrl"
      );

      if (!VALIDATION_PATTERNS.PUBLIC_BOOKING_URL.test(settings.publicBookingUrl)) {
        throw new Error("Invalid public booking URL format");
      }
    }

    return true;
  }

  private async validateWorkingHours(workingHours: WorkingHours): Promise<void> {
    const validDays = Object.values(WEEKDAYS);
    
    for (const [day, hours] of Object.entries(workingHours)) {
      if (!validDays.includes(day as any)) {
        throw new Error(`Invalid day: ${day}`);
      }

      if (typeof hours !== 'object' || hours === null) {
        throw new Error(`Working hours for ${day} must be an object`);
      }

      if (typeof hours.isOpen !== 'boolean') {
        throw new Error(`isOpen must be a boolean for ${day}`);
      }

      if (hours.isOpen) {
        if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(hours.start)) {
          throw new Error(`Invalid start time format for ${day}`);
        }

        if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(hours.end)) {
          throw new Error(`Invalid end time format for ${day}`);
        }

        // Vérifier que l'heure de fin est après l'heure de début
        const startMinutes = this.timeToMinutes(hours.start);
        const endMinutes = this.timeToMinutes(hours.end);

        if (endMinutes <= startMinutes) {
          throw new Error(`End time must be after start time for ${day}`);
        }
      }
    }
  }

  private async validateBookingRules(bookingRules: BookingRules): Promise<void> {
    // Validation des jours d'avance pour réserver
    this.validateRange(
      bookingRules.advanceBookingDays,
      VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_ADVANCE_BOOKING_DAYS,
      VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_ADVANCE_BOOKING_DAYS,
      "advanceBookingDays"
    );

    // Validation du délai d'annulation
    this.validateRange(
      bookingRules.cancellationDeadlineHours,
      VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_CANCELLATION_DEADLINE_HOURS,
      VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_CANCELLATION_DEADLINE_HOURS,
      "cancellationDeadlineHours"
    );

    // Validation des champs booléens
    if (typeof bookingRules.allowOnlineBooking !== 'boolean') {
      throw new Error("allowOnlineBooking must be a boolean");
    }

    if (typeof bookingRules.requireConfirmation !== 'boolean') {
      throw new Error("requireConfirmation must be a boolean");
    }

    if (typeof bookingRules.allowSameDayBooking !== 'boolean') {
      throw new Error("allowSameDayBooking must be a boolean");
    }

    // Validation des limites optionnelles
    if (bookingRules.maxAppointmentsPerDay !== undefined) {
      this.validateRange(
        bookingRules.maxAppointmentsPerDay,
        1,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_APPOINTMENTS_PER_DAY,
        "maxAppointmentsPerDay"
      );
    }

    if (bookingRules.minTimeBetweenAppointments !== undefined) {
      this.validateRange(
        bookingRules.minTimeBetweenAppointments,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_TIME_BETWEEN_APPOINTMENTS,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_TIME_BETWEEN_APPOINTMENTS,
        "minTimeBetweenAppointments"
      );
    }
  }

  private async validateReminderConfig(reminderConfig: ReminderConfig): Promise<void> {
    if (typeof reminderConfig.enabled !== 'boolean') {
      throw new Error("reminderConfig.enabled must be a boolean");
    }

    // Validation des délais de rappel
    if (!Array.isArray(reminderConfig.timings)) {
      throw new Error("reminderConfig.timings must be an array");
    }

    if (reminderConfig.timings.length > VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS) {
      throw new Error(`Maximum ${VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS} reminder timings allowed`);
    }

    for (const timing of reminderConfig.timings) {
      this.validateRange(
        timing,
        VALIDATION_RULES.APPOINTMENT.MIN_REMINDER_HOURS,
        VALIDATION_RULES.APPOINTMENT.MAX_REMINDER_HOURS,
        "reminder timing"
      );
    }

    // Validation des templates
    if (!Array.isArray(reminderConfig.templates)) {
      throw new Error("reminderConfig.templates must be an array");
    }

    for (const template of reminderConfig.templates) {
      await this.validateNotificationTemplate(template);
    }

    // Validation des paramètres de retry
    this.validateRange(
      reminderConfig.maxRetries,
      0,
      VALIDATION_RULES.APPOINTMENT.MAX_RETRY_ATTEMPTS,
      "maxRetries"
    );

    this.validateRange(
      reminderConfig.retryIntervalMinutes,
      1,
      1440, // 24 heures max
      "retryIntervalMinutes"
    );
  }

  private async validateNotificationTemplate(template: AppointmentNotificationTemplate): Promise<void> {
    BaseModel.validateRequired(template, ["id", "type", "language", "content", "variables"]);

    // Validation du type
    BaseModel.validateEnum(template.type, REMINDER_TYPES, "template type");

    // Validation de la langue
    BaseModel.validateEnum(template.language, SUPPORTED_LANGUAGES, "template language");

    // Validation du contenu
    if (!template.content || template.content.trim().length === 0) {
      throw new Error("Template content cannot be empty");
    }

    // Validation du sujet pour les emails
    if (template.type === REMINDER_TYPES.EMAIL && template.subject) {
      this.validateLength(template.subject, 1, 200, "email subject");
    }

    // Validation des variables
    if (!Array.isArray(template.variables)) {
      throw new Error("Template variables must be an array");
    }
  }

  toFirestore() {
    const { id, createdAt, updatedAt, ...data } = this.data;
    return this.convertDatesToFirestore({
      ...data,
      createdAt: createdAt || new Date(),
      updatedAt: updatedAt || new Date()
    });
  }

  static fromFirestore(doc: DocumentSnapshot): OrganizationAppointmentSettingsModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = OrganizationAppointmentSettingsModel.prototype.convertDatesFromFirestore(data);

    return new OrganizationAppointmentSettingsModel({
      id: doc.id,
      ...convertedData
    });
  }

  static createDefault(organizationId: string): OrganizationAppointmentSettingsModel {
    const defaultWorkingHours: WorkingHours = {
      [WEEKDAYS.MONDAY]: { start: "09:00", end: "18:00", isOpen: true },
      [WEEKDAYS.TUESDAY]: { start: "09:00", end: "18:00", isOpen: true },
      [WEEKDAYS.WEDNESDAY]: { start: "09:00", end: "18:00", isOpen: true },
      [WEEKDAYS.THURSDAY]: { start: "09:00", end: "18:00", isOpen: true },
      [WEEKDAYS.FRIDAY]: { start: "09:00", end: "18:00", isOpen: true },
      [WEEKDAYS.SATURDAY]: { start: "09:00", end: "12:00", isOpen: false },
      [WEEKDAYS.SUNDAY]: { start: "09:00", end: "12:00", isOpen: false }
    };

    const defaultBookingRules: BookingRules = {
      advanceBookingDays: APPOINTMENT_DEFAULTS.ADVANCE_BOOKING_DAYS,
      cancellationDeadlineHours: APPOINTMENT_DEFAULTS.CANCELLATION_DEADLINE_HOURS,
      allowOnlineBooking: true,
      requireConfirmation: false,
      allowSameDayBooking: true,
      maxAppointmentsPerDay: APPOINTMENT_DEFAULTS.MAX_APPOINTMENTS_PER_DAY
    };

    const defaultReminderConfig: ReminderConfig = {
      enabled: true,
      timings: [...APPOINTMENT_DEFAULTS.REMINDER_TIMINGS_HOURS],
      templates: [],
      maxRetries: APPOINTMENT_DEFAULTS.MAX_REMINDER_RETRIES,
      retryIntervalMinutes: APPOINTMENT_DEFAULTS.RETRY_INTERVAL_MINUTES
    };

    return new OrganizationAppointmentSettingsModel({
      workingHours: defaultWorkingHours,
      services: [],
      bookingRules: defaultBookingRules,
      reminderConfig: defaultReminderConfig,
      timezone: "Europe/Paris",
      defaultAppointmentDuration: APPOINTMENT_DEFAULTS.DURATION_MINUTES,
      bufferTimeBetweenAppointments: APPOINTMENT_DEFAULTS.BUFFER_TIME_MINUTES
    });
  }

  // Méthodes utilitaires

  /**
   * Convertit une heure au format HH:MM en minutes depuis minuit
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }



  /**
   * Vérifie si l'organisation est ouverte un jour donné
   */
  isOpenOnDay(day: string): boolean {
    const dayHours = this.data.workingHours[day];
    return dayHours?.isOpen || false;
  }

  /**
   * Récupère les horaires d'ouverture pour un jour donné
   */
  getWorkingHoursForDay(day: string): { start: string; end: string } | null {
    const dayHours = this.data.workingHours[day];
    if (!dayHours?.isOpen) return null;
    
    return {
      start: dayHours.start,
      end: dayHours.end
    };
  }

  /**
   * Calcule le nombre total d'heures d'ouverture par semaine
   */
  getTotalWeeklyHours(): number {
    let totalMinutes = 0;
    
    for (const dayHours of Object.values(this.data.workingHours)) {
      if (dayHours.isOpen) {
        const startMinutes = this.timeToMinutes(dayHours.start);
        const endMinutes = this.timeToMinutes(dayHours.end);
        totalMinutes += endMinutes - startMinutes;
      }
    }
    
    return totalMinutes / 60; // Convertir en heures
  }

  /**
   * Met à jour les horaires de travail pour un jour spécifique
   */
  updateWorkingHoursForDay(
    day: string, 
    hours: { start: string; end: string; isOpen: boolean },
    updatedBy: string
  ): void {
    if (!Object.values(WEEKDAYS).includes(day as any)) {
      throw new Error(`Invalid day: ${day}`);
    }

    // Validation des nouvelles horaires
    if (hours.isOpen) {
      if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(hours.start) ||
          !VALIDATION_PATTERNS.APPOINTMENT_TIME.test(hours.end)) {
        throw new Error("Invalid time format");
      }

      const startMinutes = this.timeToMinutes(hours.start);
      const endMinutes = this.timeToMinutes(hours.end);

      if (endMinutes <= startMinutes) {
        throw new Error("End time must be after start time");
      }
    }

    const oldHours = { ...this.data.workingHours };
    this.data.workingHours[day] = hours;

    this.update({ workingHours: this.data.workingHours }, {
      action: "working_hours_updated",
      performedBy: updatedBy,
      oldValue: { workingHours: oldHours },
      newValue: { workingHours: this.data.workingHours }
    });
  }

  /**
   * Met à jour les règles de réservation
   */
  updateBookingRules(newRules: Partial<BookingRules>, updatedBy: string): void {
    const oldRules = { ...this.data.bookingRules };
    const updatedRules = { ...this.data.bookingRules, ...newRules };

    // Validation des nouvelles règles
    if (newRules.advanceBookingDays !== undefined) {
      this.validateRange(
        newRules.advanceBookingDays,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_ADVANCE_BOOKING_DAYS,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_ADVANCE_BOOKING_DAYS,
        "advanceBookingDays"
      );
    }

    if (newRules.cancellationDeadlineHours !== undefined) {
      this.validateRange(
        newRules.cancellationDeadlineHours,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_CANCELLATION_DEADLINE_HOURS,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_CANCELLATION_DEADLINE_HOURS,
        "cancellationDeadlineHours"
      );
    }

    this.update({ bookingRules: updatedRules }, {
      action: "booking_rules_updated",
      performedBy: updatedBy,
      oldValue: { bookingRules: oldRules },
      newValue: { bookingRules: updatedRules }
    });
  }

  /**
   * Active ou désactive la réservation en ligne
   */
  setOnlineBookingEnabled(enabled: boolean, updatedBy: string): void {
    const oldRules = { ...this.data.bookingRules };
    this.data.bookingRules.allowOnlineBooking = enabled;

    this.update({ bookingRules: this.data.bookingRules }, {
      action: enabled ? "online_booking_enabled" : "online_booking_disabled",
      performedBy: updatedBy,
      oldValue: { bookingRules: oldRules },
      newValue: { bookingRules: this.data.bookingRules }
    });
  }

  /**
   * Met à jour l'URL publique de réservation
   */
  updatePublicBookingUrl(url: string | undefined, updatedBy: string): void {
    if (url) {
      this.validateLength(
        url,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MIN_LENGTH,
        VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MAX_LENGTH,
        "publicBookingUrl"
      );

      if (!VALIDATION_PATTERNS.PUBLIC_BOOKING_URL.test(url)) {
        throw new Error("Invalid public booking URL format");
      }
    }

    const oldUrl = this.data.publicBookingUrl;

    this.update({ publicBookingUrl: url }, {
      action: "public_url_updated",
      performedBy: updatedBy,
      oldValue: { publicBookingUrl: oldUrl },
      newValue: { publicBookingUrl: url }
    });
  }

  /**
   * Ajoute un template de notification
   */
  addNotificationTemplate(template: AppointmentNotificationTemplate, addedBy: string): void {
    // Vérifier qu'il n'existe pas déjà un template avec le même ID
    const existingTemplate = this.data.reminderConfig.templates.find(t => t.id === template.id);
    if (existingTemplate) {
      throw new Error("A template with this ID already exists");
    }

    const oldTemplates = [...this.data.reminderConfig.templates];
    this.data.reminderConfig.templates.push(template);

    this.update({ reminderConfig: this.data.reminderConfig }, {
      action: "notification_template_added",
      performedBy: addedBy,
      oldValue: { templates: oldTemplates },
      newValue: { templates: this.data.reminderConfig.templates }
    });
  }

  /**
   * Supprime un template de notification
   */
  removeNotificationTemplate(templateId: string, removedBy: string): void {
    const templateIndex = this.data.reminderConfig.templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      throw new Error("Template not found");
    }

    const oldTemplates = [...this.data.reminderConfig.templates];
    this.data.reminderConfig.templates.splice(templateIndex, 1);

    this.update({ reminderConfig: this.data.reminderConfig }, {
      action: "notification_template_removed",
      performedBy: removedBy,
      oldValue: { templates: oldTemplates },
      newValue: { templates: this.data.reminderConfig.templates }
    });
  }

  /**
   * Génère un objet pour l'affichage dans l'interface
   */
  toDisplayObject() {
    return {
      id: this.data.id,
      totalWeeklyHours: this.getTotalWeeklyHours(),
      openDays: Object.entries(this.data.workingHours)
        .filter(([_, hours]) => hours.isOpen)
        .map(([day, _]) => day),
      onlineBookingEnabled: this.data.bookingRules.allowOnlineBooking,
      publicBookingUrl: this.data.publicBookingUrl,
      defaultDuration: this.data.defaultAppointmentDuration,
      bufferTime: this.data.bufferTimeBetweenAppointments,
      timezone: this.data.timezone,
      reminderEnabled: this.data.reminderConfig.enabled,
      reminderCount: this.data.reminderConfig.timings.length,
      templateCount: this.data.reminderConfig.templates.length,
      createdAt: this.data.createdAt || new Date(),
      updatedAt: this.data.updatedAt || new Date()
    };
  }
}