// src/utils/appointmentValidation.ts
import { addHours, isBefore, isAfter, format, parseISO } from 'date-fns';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface AppointmentData {
  clientId?: string;
  serviceId: string;
  practitionerId: string;
  dateTime: string;
  duration: number;
  notes?: string;
  clientInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface BookingRules {
  advanceBookingDays: number;
  cancellationHours: number;
  allowSameDayBooking: boolean;
  requireConfirmation: boolean;
  maxBookingsPerDay: number;
  bufferTimeBetweenAppointments: number;
}

export interface WorkingHours {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface ExistingAppointment {
  id: string;
  dateTime: string;
  duration: number;
  practitionerId: string;
  status: string;
}

export class AppointmentValidator {
  private bookingRules: BookingRules;
  private workingHours: WorkingHours[];
  private existingAppointments: ExistingAppointment[];

  constructor(
    bookingRules: BookingRules,
    workingHours: WorkingHours[],
    existingAppointments: ExistingAppointment[] = []
  ) {
    this.bookingRules = bookingRules;
    this.workingHours = workingHours;
    this.existingAppointments = existingAppointments;
  }

  /**
   * Validate complete appointment data
   */
  validateAppointment(appointment: AppointmentData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic field validation
    errors.push(...this.validateBasicFields(appointment));

    // Date and time validation
    errors.push(...this.validateDateTime(appointment.dateTime));

    // Business rules validation
    errors.push(...this.validateBusinessRules(appointment));

    // Conflict detection
    errors.push(...this.validateConflicts(appointment));

    // Working hours validation
    errors.push(...this.validateWorkingHours(appointment.dateTime, appointment.duration));

    return errors;
  }

  /**
   * Validate basic required fields
   */
  private validateBasicFields(appointment: AppointmentData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!appointment.serviceId) {
      errors.push({
        field: 'serviceId',
        message: 'Le service est obligatoire',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!appointment.practitionerId) {
      errors.push({
        field: 'practitionerId',
        message: 'Le praticien est obligatoire',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!appointment.dateTime) {
      errors.push({
        field: 'dateTime',
        message: 'La date et l\'heure sont obligatoires',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!appointment.duration || appointment.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'La durée doit être supérieure à 0',
        code: 'INVALID_DURATION'
      });
    }

    // Client info validation for public bookings
    if (appointment.clientInfo) {
      if (!appointment.clientInfo.name?.trim()) {
        errors.push({
          field: 'clientInfo.name',
          message: 'Le nom du client est obligatoire',
          code: 'REQUIRED_FIELD'
        });
      }

      if (!appointment.clientInfo.email?.trim()) {
        errors.push({
          field: 'clientInfo.email',
          message: 'L\'email du client est obligatoire',
          code: 'REQUIRED_FIELD'
        });
      } else if (!this.isValidEmail(appointment.clientInfo.email)) {
        errors.push({
          field: 'clientInfo.email',
          message: 'L\'email n\'est pas valide',
          code: 'INVALID_EMAIL'
        });
      }

      if (!appointment.clientInfo.phone?.trim()) {
        errors.push({
          field: 'clientInfo.phone',
          message: 'Le téléphone du client est obligatoire',
          code: 'REQUIRED_FIELD'
        });
      } else if (!this.isValidPhone(appointment.clientInfo.phone)) {
        errors.push({
          field: 'clientInfo.phone',
          message: 'Le numéro de téléphone n\'est pas valide',
          code: 'INVALID_PHONE'
        });
      }
    }

    return errors;
  }

  /**
   * Validate date and time format and logic
   */
  private validateDateTime(dateTime: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      const appointmentDate = parseISO(dateTime);
      const now = new Date();

      // Check if date is valid
      if (isNaN(appointmentDate.getTime())) {
        errors.push({
          field: 'dateTime',
          message: 'La date et l\'heure ne sont pas valides',
          code: 'INVALID_DATETIME'
        });
        return errors;
      }

      // Check if date is in the past
      if (isBefore(appointmentDate, now)) {
        errors.push({
          field: 'dateTime',
          message: 'La date ne peut pas être dans le passé',
          code: 'PAST_DATE'
        });
      }

      // Check same day booking rule
      if (!this.bookingRules.allowSameDayBooking) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (isBefore(appointmentDate, today)) {
          errors.push({
            field: 'dateTime',
            message: 'Les réservations le jour même ne sont pas autorisées',
            code: 'SAME_DAY_BOOKING_NOT_ALLOWED'
          });
        }
      }

      // Check advance booking limit
      const maxAdvanceDate = new Date();
      maxAdvanceDate.setDate(maxAdvanceDate.getDate() + this.bookingRules.advanceBookingDays);
      
      if (isAfter(appointmentDate, maxAdvanceDate)) {
        errors.push({
          field: 'dateTime',
          message: `Les réservations ne peuvent pas être faites plus de ${this.bookingRules.advanceBookingDays} jours à l'avance`,
          code: 'ADVANCE_BOOKING_LIMIT_EXCEEDED'
        });
      }

    } catch (error) {
      errors.push({
        field: 'dateTime',
        message: 'Format de date invalide',
        code: 'INVALID_DATETIME_FORMAT'
      });
    }

    return errors;
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(appointment: AppointmentData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check daily booking limit
    const appointmentDate = parseISO(appointment.dateTime);
    const dayStart = new Date(appointmentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(appointmentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const appointmentsOnSameDay = this.existingAppointments.filter(apt => {
      const aptDate = parseISO(apt.dateTime);
      return aptDate >= dayStart && aptDate <= dayEnd && 
             apt.practitionerId === appointment.practitionerId &&
             apt.status !== 'cancelled';
    });

    if (appointmentsOnSameDay.length >= this.bookingRules.maxBookingsPerDay) {
      errors.push({
        field: 'dateTime',
        message: `Le nombre maximum de rendez-vous par jour (${this.bookingRules.maxBookingsPerDay}) est atteint`,
        code: 'DAILY_BOOKING_LIMIT_EXCEEDED'
      });
    }

    return errors;
  }

  /**
   * Validate conflicts with existing appointments
   */
  private validateConflicts(appointment: AppointmentData): ValidationError[] {
    const errors: ValidationError[] = [];

    const appointmentStart = parseISO(appointment.dateTime);
    const appointmentEnd = addHours(appointmentStart, appointment.duration / 60);

    // Check for overlapping appointments
    const conflicts = this.existingAppointments.filter(existing => {
      if (existing.practitionerId !== appointment.practitionerId || 
          existing.status === 'cancelled') {
        return false;
      }

      const existingStart = parseISO(existing.dateTime);
      const existingEnd = addHours(existingStart, existing.duration / 60);

      // Add buffer time
      const bufferMinutes = this.bookingRules.bufferTimeBetweenAppointments;
      const appointmentStartWithBuffer = new Date(appointmentStart.getTime() - bufferMinutes * 60000);
      const appointmentEndWithBuffer = new Date(appointmentEnd.getTime() + bufferMinutes * 60000);

      // Check for overlap
      return (appointmentStartWithBuffer < existingEnd && appointmentEndWithBuffer > existingStart);
    });

    if (conflicts.length > 0) {
      const conflictTimes = conflicts.map(c => 
        format(parseISO(c.dateTime), 'HH:mm')
      ).join(', ');
      
      errors.push({
        field: 'dateTime',
        message: `Conflit avec un rendez-vous existant à ${conflictTimes}`,
        code: 'APPOINTMENT_CONFLICT'
      });
    }

    return errors;
  }

  /**
   * Validate working hours
   */
  private validateWorkingHours(dateTime: string, duration: number): ValidationError[] {
    const errors: ValidationError[] = [];

    const appointmentStart = parseISO(dateTime);
    const appointmentEnd = addHours(appointmentStart, duration / 60);
    
    const dayOfWeek = appointmentStart.getDay();
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[dayOfWeek];

    const workingDay = this.workingHours.find(wh => wh.day === dayName);

    if (!workingDay || !workingDay.enabled) {
      errors.push({
        field: 'dateTime',
        message: `Le ${dayName.toLowerCase()} n'est pas un jour ouvrable`,
        code: 'NON_WORKING_DAY'
      });
      return errors;
    }

    // Parse working hours
    const [startHour, startMinute] = workingDay.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingDay.endTime.split(':').map(Number);

    const workingStart = new Date(appointmentStart);
    workingStart.setHours(startHour, startMinute, 0, 0);
    
    const workingEnd = new Date(appointmentStart);
    workingEnd.setHours(endHour, endMinute, 0, 0);

    // Check if appointment is within working hours
    if (isBefore(appointmentStart, workingStart) || isAfter(appointmentEnd, workingEnd)) {
      errors.push({
        field: 'dateTime',
        message: `Le rendez-vous doit être entre ${workingDay.startTime} et ${workingDay.endTime}`,
        code: 'OUTSIDE_WORKING_HOURS'
      });
    }

    // Check break time if defined
    if (workingDay.breakStart && workingDay.breakEnd) {
      const [breakStartHour, breakStartMinute] = workingDay.breakStart.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = workingDay.breakEnd.split(':').map(Number);

      const breakStart = new Date(appointmentStart);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
      
      const breakEnd = new Date(appointmentStart);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

      // Check if appointment overlaps with break time
      if (appointmentStart < breakEnd && appointmentEnd > breakStart) {
        errors.push({
          field: 'dateTime',
          message: `Le rendez-vous ne peut pas être pendant la pause (${workingDay.breakStart} - ${workingDay.breakEnd})`,
          code: 'DURING_BREAK_TIME'
        });
      }
    }

    return errors;
  }

  /**
   * Validate cancellation timing
   */
  validateCancellation(appointmentDateTime: string): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
      const appointmentDate = parseISO(appointmentDateTime);
      const now = new Date();
      const cancellationDeadline = new Date(appointmentDate.getTime() - this.bookingRules.cancellationHours * 60 * 60 * 1000);

      if (isAfter(now, cancellationDeadline)) {
        errors.push({
          field: 'cancellation',
          message: `L'annulation doit être faite au moins ${this.bookingRules.cancellationHours}h avant le rendez-vous`,
          code: 'CANCELLATION_DEADLINE_EXCEEDED'
        });
      }
    } catch (error) {
      errors.push({
        field: 'cancellation',
        message: 'Erreur lors de la validation de l\'annulation',
        code: 'CANCELLATION_VALIDATION_ERROR'
      });
    }

    return errors;
  }

  /**
   * Validate rescheduling
   */
  validateRescheduling(currentDateTime: string, newDateTime: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // First validate the cancellation of current appointment
    errors.push(...this.validateCancellation(currentDateTime));

    // Then validate the new appointment time
    const tempAppointment: AppointmentData = {
      serviceId: 'temp',
      practitionerId: 'temp',
      dateTime: newDateTime,
      duration: 30 // Default duration for validation
    };

    errors.push(...this.validateDateTime(newDateTime));
    errors.push(...this.validateWorkingHours(newDateTime, 30));

    return errors;
  }

  /**
   * Check if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if phone number is valid (French format)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^(?:\+33|0)[1-9](?:[0-9]{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Get available time slots for a specific date and practitioner
   */
  getAvailableSlots(date: string, practitionerId: string, duration: number): string[] {
    const slots: string[] = [];
    const targetDate = parseISO(date);
    const dayOfWeek = targetDate.getDay();
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = dayNames[dayOfWeek];

    const workingDay = this.workingHours.find(wh => wh.day === dayName);
    if (!workingDay || !workingDay.enabled) {
      return slots;
    }

    const [startHour, startMinute] = workingDay.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingDay.endTime.split(':').map(Number);

    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    const slotDuration = 15; // 15-minute slots

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);
      
      if (slotEnd <= endTime) {
        // Check if slot is available (no conflicts)
        const hasConflict = this.existingAppointments.some(apt => {
          if (apt.practitionerId !== practitionerId || apt.status === 'cancelled') {
            return false;
          }

          const aptStart = parseISO(apt.dateTime);
          const aptEnd = addHours(aptStart, apt.duration / 60);
          
          return currentTime < aptEnd && slotEnd > aptStart;
        });

        // Check break time
        let isDuringBreak = false;
        if (workingDay.breakStart && workingDay.breakEnd) {
          const [breakStartHour, breakStartMinute] = workingDay.breakStart.split(':').map(Number);
          const [breakEndHour, breakEndMinute] = workingDay.breakEnd.split(':').map(Number);

          const breakStart = new Date(targetDate);
          breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
          
          const breakEnd = new Date(targetDate);
          breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

          isDuringBreak = currentTime < breakEnd && slotEnd > breakStart;
        }

        if (!hasConflict && !isDuringBreak) {
          slots.push(format(currentTime, 'HH:mm'));
        }
      }

      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    return slots;
  }
}

/**
 * Error handler for appointment operations
 */
export class AppointmentErrorHandler {
  static handleValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';

    const errorMessages = errors.map(error => error.message);
    return errorMessages.join('\n');
  }

  static handleApiError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Erreur de connexion. Veuillez vérifier votre connexion internet.';
      case 'TIMEOUT':
        return 'La requête a pris trop de temps. Veuillez réessayer.';
      case 'UNAUTHORIZED':
        return 'Vous n\'êtes pas autorisé à effectuer cette action.';
      case 'FORBIDDEN':
        return 'Accès refusé.';
      case 'NOT_FOUND':
        return 'Ressource non trouvée.';
      case 'CONFLICT':
        return 'Conflit détecté. Veuillez actualiser et réessayer.';
      case 'VALIDATION_ERROR':
        return 'Données invalides. Veuillez vérifier les informations saisies.';
      default:
        return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    }
  }

  static isRetryableError(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'INTERNAL_SERVER_ERROR'];
    return retryableCodes.includes(error.code) || error.status >= 500;
  }
}

/**
 * Data consistency checker
 */
export class AppointmentConsistencyChecker {
  static checkAppointmentIntegrity(appointment: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required relationships
    if (appointment.clientId && !appointment.client) {
      errors.push({
        field: 'client',
        message: 'Informations client manquantes',
        code: 'MISSING_CLIENT_DATA'
      });
    }

    if (appointment.serviceId && !appointment.service) {
      errors.push({
        field: 'service',
        message: 'Informations service manquantes',
        code: 'MISSING_SERVICE_DATA'
      });
    }

    if (appointment.practitionerId && !appointment.practitioner) {
      errors.push({
        field: 'practitioner',
        message: 'Informations praticien manquantes',
        code: 'MISSING_PRACTITIONER_DATA'
      });
    }

    // Check data consistency
    if (appointment.service && appointment.duration !== appointment.service.duration) {
      errors.push({
        field: 'duration',
        message: 'La durée ne correspond pas au service sélectionné',
        code: 'DURATION_MISMATCH'
      });
    }

    return errors;
  }

  static checkNotificationConsistency(appointment: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (appointment.status === 'confirmed' && !appointment.confirmationSent) {
      errors.push({
        field: 'notifications',
        message: 'Confirmation non envoyée pour un rendez-vous confirmé',
        code: 'MISSING_CONFIRMATION'
      });
    }

    return errors;
  }
}