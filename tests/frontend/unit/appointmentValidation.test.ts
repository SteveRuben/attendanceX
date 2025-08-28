// tests/frontend/unit/appointmentValidation.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AppointmentValidator, 
  AppointmentErrorHandler,
  AppointmentConsistencyChecker,
  ValidationError,
  AppointmentData,
  BookingRules,
  WorkingHours,
  ExistingAppointment
} from '../../../frontend/src/utils/appointmentValidation';
import { addDays, format } from 'date-fns';

describe('AppointmentValidator', () => {
  let validator: AppointmentValidator;
  let mockBookingRules: BookingRules;
  let mockWorkingHours: WorkingHours[];
  let mockExistingAppointments: ExistingAppointment[];

  beforeEach(() => {
    mockBookingRules = {
      advanceBookingDays: 30,
      cancellationHours: 24,
      allowSameDayBooking: false,
      requireConfirmation: true,
      maxBookingsPerDay: 10,
      bufferTimeBetweenAppointments: 15
    };

    mockWorkingHours = [
      {
        day: 'Lundi',
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      },
      {
        day: 'Mardi',
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      },
      {
        day: 'Samedi',
        enabled: false,
        startTime: '09:00',
        endTime: '17:00'
      },
      {
        day: 'Dimanche',
        enabled: false,
        startTime: '09:00',
        endTime: '17:00'
      }
    ];

    mockExistingAppointments = [
      {
        id: 'apt-1',
        dateTime: '2024-01-15T10:00:00Z',
        duration: 30,
        practitionerId: 'prac-1',
        status: 'confirmed'
      }
    ];

    validator = new AppointmentValidator(
      mockBookingRules,
      mockWorkingHours,
      mockExistingAppointments
    );
  });

  describe('validateAppointment', () => {
    it('should validate a correct appointment', () => {
      const tomorrow = addDays(new Date(), 1);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(tomorrow, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30,
        clientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+33123456789'
        }
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const appointmentData: AppointmentData = {
        serviceId: '',
        practitionerId: '',
        dateTime: '',
        duration: 0
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'serviceId')).toBe(true);
      expect(errors.some(e => e.field === 'practitionerId')).toBe(true);
      expect(errors.some(e => e.field === 'dateTime')).toBe(true);
      expect(errors.some(e => e.field === 'duration')).toBe(true);
    });

    it('should validate client information for public bookings', () => {
      const tomorrow = addDays(new Date(), 1);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(tomorrow, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30,
        clientInfo: {
          name: '',
          email: 'invalid-email',
          phone: 'invalid-phone'
        }
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.field === 'clientInfo.name')).toBe(true);
      expect(errors.some(e => e.field === 'clientInfo.email')).toBe(true);
      expect(errors.some(e => e.field === 'clientInfo.phone')).toBe(true);
    });

    it('should reject past dates', () => {
      const yesterday = addDays(new Date(), -1);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(yesterday, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'PAST_DATE')).toBe(true);
    });

    it('should reject same day booking when not allowed', () => {
      const today = new Date();
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(today, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'SAME_DAY_BOOKING_NOT_ALLOWED')).toBe(true);
    });

    it('should reject appointments beyond advance booking limit', () => {
      const farFuture = addDays(new Date(), 40);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(farFuture, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'ADVANCE_BOOKING_LIMIT_EXCEEDED')).toBe(true);
    });

    it('should detect appointment conflicts', () => {
      const conflictDate = new Date('2024-01-15T10:15:00Z'); // Overlaps with existing appointment
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: conflictDate.toISOString(),
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'APPOINTMENT_CONFLICT')).toBe(true);
    });

    it('should reject appointments on non-working days', () => {
      // Find next Saturday
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay()));
      
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(nextSaturday, "yyyy-MM-dd'T'14:00:00'Z'"),
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'NON_WORKING_DAY')).toBe(true);
    });

    it('should reject appointments outside working hours', () => {
      const tomorrow = addDays(new Date(), 1);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(tomorrow, "yyyy-MM-dd'T'08:00:00'Z'"), // Before 9 AM
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'OUTSIDE_WORKING_HOURS')).toBe(true);
    });

    it('should reject appointments during break time', () => {
      const tomorrow = addDays(new Date(), 1);
      const appointmentData: AppointmentData = {
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: format(tomorrow, "yyyy-MM-dd'T'12:30:00'Z'"), // During lunch break
        duration: 30
      };

      const errors = validator.validateAppointment(appointmentData);
      expect(errors.some(e => e.code === 'DURING_BREAK_TIME')).toBe(true);
    });
  });

  describe('validateCancellation', () => {
    it('should allow cancellation within deadline', () => {
      const futureDate = addDays(new Date(), 2);
      const errors = validator.validateCancellation(futureDate.toISOString());
      expect(errors).toHaveLength(0);
    });

    it('should reject cancellation past deadline', () => {
      const nearFuture = new Date();
      nearFuture.setHours(nearFuture.getHours() + 12); // 12 hours from now (less than 24h)
      
      const errors = validator.validateCancellation(nearFuture.toISOString());
      expect(errors.some(e => e.code === 'CANCELLATION_DEADLINE_EXCEEDED')).toBe(true);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return available time slots', () => {
      const tomorrow = addDays(new Date(), 1);
      const dateString = format(tomorrow, 'yyyy-MM-dd');
      
      const slots = validator.getAvailableSlots(dateString, 'prac-2', 30);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots).toContain('09:00');
      expect(slots).toContain('14:00');
    });

    it('should exclude conflicting time slots', () => {
      const dateString = '2024-01-15'; // Date with existing appointment
      
      const slots = validator.getAvailableSlots(dateString, 'prac-1', 30);
      expect(slots).not.toContain('10:00'); // Should be excluded due to conflict
    });

    it('should exclude break time slots', () => {
      const tomorrow = addDays(new Date(), 1);
      const dateString = format(tomorrow, 'yyyy-MM-dd');
      
      const slots = validator.getAvailableSlots(dateString, 'prac-1', 60);
      expect(slots).not.toContain('12:00'); // Should be excluded due to break
    });
  });
});

describe('AppointmentErrorHandler', () => {
  describe('handleValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors: ValidationError[] = [
        { field: 'email', message: 'Email is required', code: 'REQUIRED_FIELD' },
        { field: 'phone', message: 'Phone is invalid', code: 'INVALID_PHONE' }
      ];

      const result = AppointmentErrorHandler.handleValidationErrors(errors);
      expect(result).toContain('Email is required');
      expect(result).toContain('Phone is invalid');
    });

    it('should return empty string for no errors', () => {
      const result = AppointmentErrorHandler.handleValidationErrors([]);
      expect(result).toBe('');
    });
  });

  describe('handleApiError', () => {
    it('should handle network errors', () => {
      const error = { code: 'NETWORK_ERROR' };
      const result = AppointmentErrorHandler.handleApiError(error);
      expect(result).toContain('connexion');
    });

    it('should handle validation errors', () => {
      const error = { code: 'VALIDATION_ERROR' };
      const result = AppointmentErrorHandler.handleApiError(error);
      expect(result).toContain('Données invalides');
    });

    it('should handle unknown errors', () => {
      const error = { code: 'UNKNOWN_ERROR' };
      const result = AppointmentErrorHandler.handleApiError(error);
      expect(result).toContain('erreur inattendue');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(AppointmentErrorHandler.isRetryableError({ code: 'NETWORK_ERROR' })).toBe(true);
      expect(AppointmentErrorHandler.isRetryableError({ code: 'TIMEOUT' })).toBe(true);
      expect(AppointmentErrorHandler.isRetryableError({ status: 500 })).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      expect(AppointmentErrorHandler.isRetryableError({ code: 'VALIDATION_ERROR' })).toBe(false);
      expect(AppointmentErrorHandler.isRetryableError({ status: 400 })).toBe(false);
      expect(AppointmentErrorHandler.isRetryableError({ status: 404 })).toBe(false);
    });
  });
});

describe('AppointmentConsistencyChecker', () => {
  describe('checkAppointmentIntegrity', () => {
    it('should detect missing client data', () => {
      const appointment = {
        clientId: 'client-1',
        client: null
      };

      const errors = AppointmentConsistencyChecker.checkAppointmentIntegrity(appointment);
      expect(errors.some(e => e.code === 'MISSING_CLIENT_DATA')).toBe(true);
    });

    it('should detect duration mismatch', () => {
      const appointment = {
        duration: 30,
        service: { duration: 45 }
      };

      const errors = AppointmentConsistencyChecker.checkAppointmentIntegrity(appointment);
      expect(errors.some(e => e.code === 'DURATION_MISMATCH')).toBe(true);
    });

    it('should pass for consistent data', () => {
      const appointment = {
        clientId: 'client-1',
        client: { id: 'client-1', name: 'John Doe' },
        duration: 30,
        service: { duration: 30 }
      };

      const errors = AppointmentConsistencyChecker.checkAppointmentIntegrity(appointment);
      expect(errors).toHaveLength(0);
    });
  });

  describe('checkNotificationConsistency', () => {
    it('should detect missing confirmation for confirmed appointment', () => {
      const appointment = {
        status: 'confirmed',
        confirmationSent: false
      };

      const errors = AppointmentConsistencyChecker.checkNotificationConsistency(appointment);
      expect(errors.some(e => e.code === 'MISSING_CONFIRMATION')).toBe(true);
    });

    it('should pass for consistent notification state', () => {
      const appointment = {
        status: 'confirmed',
        confirmationSent: true
      };

      const errors = AppointmentConsistencyChecker.checkNotificationConsistency(appointment);
      expect(errors).toHaveLength(0);
    });
  });
});