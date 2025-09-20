import { getFirestore } from "firebase-admin/firestore";
import { 
  BookingRules,
  OrganizationAppointmentSettings,
  ReminderConfig,
  Service,
  WorkingHours
} from '../../common/types';
import { OrganizationAppointmentSettingsModel } from "../../models/organization-appointment-settings.model";
import { VALIDATION_PATTERNS, VALIDATION_RULES, WEEKDAYS } from "../../common/constants";

/**
 * Service de configuration des paramètres de rendez-vous pour les organisations
 * Gère les horaires de travail, les règles de réservation, les services et les rappels
 */
export class OrganizationConfigurationService {
  private readonly db = getFirestore();

  /**
   * Récupère les paramètres de configuration d'une organisation
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationAppointmentSettings | null> {
    try {
      const doc = await this.db.collection('organization_appointment_settings').doc(organizationId).get();
      
      if (!doc.exists) {
        // Créer des paramètres par défaut si ils n'existent pas
        return await this.createDefaultSettings(organizationId);
      }

      return { id: doc.id, ...doc.data() } as OrganizationAppointmentSettings;
    } catch (error) {
      console.error('Error getting organization settings:', error);
      throw error;
    }
  }

  /**
   * Crée des paramètres par défaut pour une organisation
   */
  async createDefaultSettings(organizationId: string): Promise<OrganizationAppointmentSettings> {
    try {
      const defaultSettings = OrganizationAppointmentSettingsModel.createDefault(organizationId);
      
      await this.db.collection('organization_appointment_settings').doc(organizationId).set(defaultSettings.toFirestore());
      
      return { id: organizationId, ...defaultSettings.getData() };
    } catch (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  }

  /**
   * Met à jour les horaires de travail
   */
  async updateWorkingHours(
    organizationId: string, 
    workingHours: WorkingHours, 
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      const settingsModel = new OrganizationAppointmentSettingsModel(settings);
      
      // Valider les nouveaux horaires
      await this.validateWorkingHours(workingHours);
      
      settingsModel.update({ workingHours }, {
        action: "working_hours_updated",
        performedBy: updatedBy,
        oldValue: { workingHours: settings.workingHours },
        newValue: { workingHours }
      });

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        workingHours,
        updatedAt: new Date()
      });

      return { ...settings, workingHours, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating working hours:', error);
      throw error;
    }
  }

  /**
   * Met à jour les horaires pour un jour spécifique
   */
  async updateWorkingHoursForDay(
    organizationId: string,
    day: string,
    hours: { start: string; end: string; isOpen: boolean },
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      // Valider le jour
      if (!Object.values(WEEKDAYS).includes(day as any)) {
        throw new Error(`Invalid day: ${day}`);
      }

      // Valider les horaires si ouvert
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

      const updatedWorkingHours = {
        ...settings.workingHours,
        [day]: hours
      };

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        workingHours: updatedWorkingHours,
        updatedAt: new Date()
      });

      return { ...settings, workingHours: updatedWorkingHours, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating working hours for day:', error);
      throw error;
    }
  }

  /**
   * Met à jour les règles de réservation
   */
  async updateBookingRules(
    organizationId: string,
    bookingRules: Partial<BookingRules>,
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      // Valider les nouvelles règles
      await this.validateBookingRules(bookingRules);

      const updatedRules = { ...settings.bookingRules, ...bookingRules };

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        bookingRules: updatedRules,
        updatedAt: new Date()
      });

      return { ...settings, bookingRules: updatedRules, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating booking rules:', error);
      throw error;
    }
  }

  /**
   * Active ou désactive la réservation en ligne
   */
  async setOnlineBookingEnabled(
    organizationId: string,
    enabled: boolean,
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      return await this.updateBookingRules(organizationId, { allowOnlineBooking: enabled }, updatedBy);
    } catch (error) {
      console.error('Error setting online booking enabled:', error);
      throw error;
    }
  }

  /**
   * Met à jour la configuration des rappels
   */
  async updateReminderConfig(
    organizationId: string,
    reminderConfig: Partial<ReminderConfig>,
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      // Valider la nouvelle configuration
      const updatedConfig = { ...settings.reminderConfig, ...reminderConfig };
      await this.validateReminderConfig(updatedConfig);

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        reminderConfig: updatedConfig,
        updatedAt: new Date()
      });

      return { ...settings, reminderConfig: updatedConfig, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating reminder config:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau service
   */
  async addService(
    organizationId: string,
    service: Omit<Service, 'id'>,
    addedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      // Générer un ID unique pour le service
      const serviceId = `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newService: Service = { ...service, id: serviceId };

      // Valider le service
      await this.validateService(newService);

      const updatedServices = [...settings.services, newService];

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        services: updatedServices,
        updatedAt: new Date()
      });

      return { ...settings, services: updatedServices, updatedAt: new Date() };
    } catch (error) {
      console.error('Error adding service:', error);
      throw error;
    }
  }

  /**
   * Met à jour un service existant
   */
  async updateService(
    organizationId: string,
    serviceId: string,
    updates: Partial<Omit<Service, 'id'>>,
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      const serviceIndex = settings.services.findIndex(s => s.id === serviceId);
      if (serviceIndex === -1) {
        throw new Error('Service not found');
      }

      const updatedService = { ...settings.services[serviceIndex], ...updates };
      await this.validateService(updatedService);

      const updatedServices = [...settings.services];
      updatedServices[serviceIndex] = updatedService;

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        services: updatedServices,
        updatedAt: new Date()
      });

      return { ...settings, services: updatedServices, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Supprime un service
   */
  async removeService(
    organizationId: string,
    serviceId: string,
    removedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      const updatedServices = settings.services.filter(s => s.id !== serviceId);

      if (updatedServices.length === settings.services.length) {
        throw new Error('Service not found');
      }

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        services: updatedServices,
        updatedAt: new Date()
      });

      return { ...settings, services: updatedServices, updatedAt: new Date() };
    } catch (error) {
      console.error('Error removing service:', error);
      throw error;
    }
  }

  /**
   * Génère une URL publique de réservation
   */
  async generatePublicBookingUrl(
    organizationId: string,
    customSlug?: string
  ): Promise<string> {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'https://app.attendance-x.com';
      let slug = customSlug;

      if (!slug) {
        // Générer un slug unique basé sur l'ID de l'organisation
        slug = `booking-${organizationId.substring(0, 8)}-${Math.random().toString(36).substr(2, 6)}`;
      }

      // Vérifier que le slug n'est pas déjà utilisé
      const existingUrl = await this.checkSlugAvailability(slug);
      if (!existingUrl) {
        throw new Error('Slug already in use');
      }

      const publicUrl = `${baseUrl}/book/${slug}`;

      // Mettre à jour les paramètres avec la nouvelle URL
      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        publicBookingUrl: publicUrl,
        updatedAt: new Date()
      });

      return publicUrl;
    } catch (error) {
      console.error('Error generating public booking URL:', error);
      throw error;
    }
  }

  /**
   * Met à jour l'URL publique de réservation
   */
  async updatePublicBookingUrl(
    organizationId: string,
    url: string | undefined,
    updatedBy: string
  ): Promise<OrganizationAppointmentSettings> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      if (url) {
        // Valider l'URL
        if (url.length < VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MIN_LENGTH ||
            url.length > VALIDATION_RULES.ORGANIZATION_APPOINTMENT.PUBLIC_URL_MAX_LENGTH) {
          throw new Error('Invalid URL length');
        }

        if (!VALIDATION_PATTERNS.PUBLIC_BOOKING_URL.test(url)) {
          throw new Error('Invalid URL format');
        }
      }

      await this.db.collection('organization_appointment_settings').doc(organizationId).update({
        publicBookingUrl: url || null,
        updatedAt: new Date()
      });

      return { ...settings, publicBookingUrl: url, updatedAt: new Date() };
    } catch (error) {
      console.error('Error updating public booking URL:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques de configuration
   */
  async getConfigurationStats(organizationId: string): Promise<{
    totalServices: number;
    totalWeeklyHours: number;
    openDays: number;
    onlineBookingEnabled: boolean;
    reminderEnabled: boolean;
    hasPublicUrl: boolean;
  }> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      if (!settings) {
        throw new Error('Organization settings not found');
      }

      const settingsModel = new OrganizationAppointmentSettingsModel(settings);

      return {
        totalServices: settings.services.length,
        totalWeeklyHours: settingsModel.getTotalWeeklyHours(),
        openDays: Object.values(settings.workingHours).filter((h: any) => h.isOpen).length,
        onlineBookingEnabled: settings.bookingRules.allowOnlineBooking,
        reminderEnabled: settings.reminderConfig.enabled,
        hasPublicUrl: !!settings.publicBookingUrl
      };
    } catch (error) {
      console.error('Error getting configuration stats:', error);
      throw error;
    }
  }

  // Méthodes de validation privées

  private async validateWorkingHours(workingHours: WorkingHours): Promise<void> {
    const validDays = Object.values(WEEKDAYS);
    
    for (const [day, hours] of Object.entries(workingHours)) {
      if (!validDays.includes(day as any)) {
        throw new Error(`Invalid day: ${day}`);
      }

      if (typeof hours !== 'object' || hours === null) {
        throw new Error(`Working hours for ${day} must be an object`);
      }

      const dayHours = hours as { isOpen: boolean; start: string; end: string };

      if (typeof dayHours.isOpen !== 'boolean') {
        throw new Error(`isOpen must be a boolean for ${day}`);
      }

      if (dayHours.isOpen) {
        if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(dayHours.start)) {
          throw new Error(`Invalid start time format for ${day}`);
        }

        if (!VALIDATION_PATTERNS.APPOINTMENT_TIME.test(dayHours.end)) {
          throw new Error(`Invalid end time format for ${day}`);
        }

        const startMinutes = this.timeToMinutes(dayHours.start);
        const endMinutes = this.timeToMinutes(dayHours.end);

        if (endMinutes <= startMinutes) {
          throw new Error(`End time must be after start time for ${day}`);
        }
      }
    }
  }

  private async validateBookingRules(bookingRules: Partial<BookingRules>): Promise<void> {
    if (bookingRules.advanceBookingDays !== undefined) {
      if (bookingRules.advanceBookingDays < VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_ADVANCE_BOOKING_DAYS ||
          bookingRules.advanceBookingDays > VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_ADVANCE_BOOKING_DAYS) {
        throw new Error('Invalid advance booking days');
      }
    }

    if (bookingRules.cancellationDeadlineHours !== undefined) {
      if (bookingRules.cancellationDeadlineHours < VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MIN_CANCELLATION_DEADLINE_HOURS ||
          bookingRules.cancellationDeadlineHours > VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_CANCELLATION_DEADLINE_HOURS) {
        throw new Error('Invalid cancellation deadline hours');
      }
    }

    if (bookingRules.maxAppointmentsPerDay !== undefined) {
      if (bookingRules.maxAppointmentsPerDay < 1 ||
          bookingRules.maxAppointmentsPerDay > VALIDATION_RULES.ORGANIZATION_APPOINTMENT.MAX_APPOINTMENTS_PER_DAY) {
        throw new Error('Invalid max appointments per day');
      }
    }
  }

  private async validateReminderConfig(reminderConfig: ReminderConfig): Promise<void> {
    if (typeof reminderConfig.enabled !== 'boolean') {
      throw new Error('reminderConfig.enabled must be a boolean');
    }

    if (!Array.isArray(reminderConfig.timings)) {
      throw new Error('reminderConfig.timings must be an array');
    }

    if (reminderConfig.timings.length > VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS) {
      throw new Error(`Maximum ${VALIDATION_RULES.APPOINTMENT.MAX_REMINDERS} reminder timings allowed`);
    }

    for (const timing of reminderConfig.timings) {
      if (timing < VALIDATION_RULES.APPOINTMENT.MIN_REMINDER_HOURS ||
          timing > VALIDATION_RULES.APPOINTMENT.MAX_REMINDER_HOURS) {
        throw new Error('Invalid reminder timing');
      }
    }

    if (reminderConfig.maxRetries < 0 || reminderConfig.maxRetries > VALIDATION_RULES.APPOINTMENT.MAX_RETRY_ATTEMPTS) {
      throw new Error('Invalid max retries');
    }

    if (reminderConfig.retryIntervalMinutes < 1 || reminderConfig.retryIntervalMinutes > 1440) {
      throw new Error('Invalid retry interval');
    }
  }

  private async validateService(service: Service): Promise<void> {
    if (!service.name || service.name.trim().length === 0) {
      throw new Error('Service name is required');
    }

    if (service.name.length > 100) {
      throw new Error('Service name too long');
    }

    if (service.duration < VALIDATION_RULES.APPOINTMENT.MIN_DURATION_MINUTES ||
        service.duration > VALIDATION_RULES.APPOINTMENT.MAX_DURATION_MINUTES) {
      throw new Error('Invalid service duration');
    }

    if (service.price !== undefined && service.price < 0) {
      throw new Error('Service price cannot be negative');
    }

    if (service.description && service.description.length > 500) {
      throw new Error('Service description too long');
    }
  }

  private async checkSlugAvailability(slug: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('organization_appointment_settings')
        .where('publicBookingUrl', '>=', slug)
        .where('publicBookingUrl', '<=', slug + '\uf8ff')
        .limit(1)
        .get();

      return snapshot.empty;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return false;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

// Instance singleton
export const organizationConfigurationService = new OrganizationConfigurationService();