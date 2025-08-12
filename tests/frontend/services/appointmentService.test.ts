// tests/frontend/services/appointmentService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appointmentService } from '../../../frontend/src/services/appointmentService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAppointments', () => {
    it('should fetch appointments successfully', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          clientId: 'client-1',
          serviceId: 'service-1',
          practitionerId: 'prac-1',
          dateTime: '2024-01-15T14:30:00Z',
          status: 'confirmed'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAppointments })
      });

      const result = await appointmentService.getAppointments();

      expect(mockFetch).toHaveBeenCalledWith('/api/appointments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        }
      });

      expect(result.data).toEqual(mockAppointments);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      });

      await expect(appointmentService.getAppointments()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(appointmentService.getAppointments()).rejects.toThrow('Network error');
    });
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      const appointmentData = {
        clientId: 'client-1',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: '2024-01-15T14:30:00Z',
        notes: 'Test appointment'
      };

      const mockResponse = {
        id: 'apt-new',
        ...appointmentData,
        status: 'pending'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await appointmentService.createAppointment(appointmentData);

      expect(mockFetch).toHaveBeenCalledWith('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        },
        body: JSON.stringify(appointmentData)
      });

      expect(result.data).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const appointmentData = {
        clientId: '',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: '2024-01-15T14:30:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          message: 'Validation error',
          errors: [
            { field: 'clientId', message: 'Client is required' }
          ]
        })
      });

      await expect(appointmentService.createAppointment(appointmentData))
        .rejects.toThrow('Validation error');
    });

    it('should handle appointment conflicts', async () => {
      const appointmentData = {
        clientId: 'client-1',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: '2024-01-15T14:30:00Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          message: 'Appointment conflict detected',
          code: 'APPOINTMENT_CONFLICT'
        })
      });

      await expect(appointmentService.createAppointment(appointmentData))
        .rejects.toThrow('Appointment conflict detected');
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment successfully', async () => {
      const appointmentId = 'apt-1';
      const updateData = {
        notes: 'Updated notes',
        status: 'confirmed'
      };

      const mockResponse = {
        id: appointmentId,
        clientId: 'client-1',
        serviceId: 'service-1',
        practitionerId: 'prac-1',
        dateTime: '2024-01-15T14:30:00Z',
        ...updateData
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await appointmentService.updateAppointment(appointmentId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        },
        body: JSON.stringify(updateData)
      });

      expect(result.data).toEqual(mockResponse);
    });

    it('should handle not found errors', async () => {
      const appointmentId = 'non-existent';
      const updateData = { notes: 'Updated notes' };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Appointment not found' })
      });

      await expect(appointmentService.updateAppointment(appointmentId, updateData))
        .rejects.toThrow('Appointment not found');
    });
  });

  describe('deleteAppointment', () => {
    it('should delete appointment successfully', async () => {
      const appointmentId = 'apt-1';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Appointment deleted successfully' })
      });

      await appointmentService.deleteAppointment(appointmentId);

      expect(mockFetch).toHaveBeenCalledWith(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        }
      });
    });

    it('should handle cancellation deadline errors', async () => {
      const appointmentId = 'apt-1';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          message: 'Cancellation deadline exceeded',
          code: 'CANCELLATION_DEADLINE_EXCEEDED'
        })
      });

      await expect(appointmentService.deleteAppointment(appointmentId))
        .rejects.toThrow('Cancellation deadline exceeded');
    });
  });

  describe('getAvailableSlots', () => {
    it('should fetch available slots successfully', async () => {
      const practitionerId = 'prac-1';
      const date = '2024-01-15';
      const serviceId = 'service-1';

      const mockSlots = [
        { time: '09:00', available: true },
        { time: '09:30', available: true },
        { time: '10:00', available: false },
        { time: '10:30', available: true }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSlots })
      });

      const result = await appointmentService.getAvailableSlots(practitionerId, date, serviceId);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/appointments/available-slots?practitionerId=${practitionerId}&date=${date}&serviceId=${serviceId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          }
        }
      );

      expect(result.data).toEqual(mockSlots);
    });

    it('should handle invalid date errors', async () => {
      const practitionerId = 'prac-1';
      const date = 'invalid-date';
      const serviceId = 'service-1';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid date format' })
      });

      await expect(appointmentService.getAvailableSlots(practitionerId, date, serviceId))
        .rejects.toThrow('Invalid date format');
    });
  });

  describe('checkConflicts', () => {
    it('should check for conflicts successfully', async () => {
      const appointmentData = {
        practitionerId: 'prac-1',
        dateTime: '2024-01-15T14:30:00Z',
        duration: 30
      };

      const mockConflicts = [
        {
          id: 'apt-existing',
          dateTime: '2024-01-15T14:45:00Z',
          duration: 30,
          clientName: 'John Doe'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { conflicts: mockConflicts } })
      });

      const result = await appointmentService.checkConflicts(appointmentData);

      expect(mockFetch).toHaveBeenCalledWith('/api/appointments/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        },
        body: JSON.stringify(appointmentData)
      });

      expect(result.data.conflicts).toEqual(mockConflicts);
    });
  });

  describe('rescheduleAppointment', () => {
    it('should reschedule appointment successfully', async () => {
      const appointmentId = 'apt-1';
      const newDateTime = '2024-01-16T15:00:00Z';

      const mockResponse = {
        id: appointmentId,
        dateTime: newDateTime,
        status: 'rescheduled'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      });

      const result = await appointmentService.rescheduleAppointment(appointmentId, newDateTime);

      expect(mockFetch).toHaveBeenCalledWith(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer')
        },
        body: JSON.stringify({ newDateTime })
      });

      expect(result.data).toEqual(mockResponse);
    });

    it('should handle rescheduling conflicts', async () => {
      const appointmentId = 'apt-1';
      const newDateTime = '2024-01-16T15:00:00Z';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          message: 'New time slot is not available',
          code: 'SLOT_NOT_AVAILABLE'
        })
      });

      await expect(appointmentService.rescheduleAppointment(appointmentId, newDateTime))
        .rejects.toThrow('New time slot is not available');
    });
  });

  describe('getAppointmentsByDateRange', () => {
    it('should fetch appointments by date range successfully', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const practitionerId = 'prac-1';

      const mockAppointments = [
        {
          id: 'apt-1',
          dateTime: '2024-01-15T14:30:00Z',
          practitionerId: 'prac-1'
        },
        {
          id: 'apt-2',
          dateTime: '2024-01-20T10:00:00Z',
          practitionerId: 'prac-1'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAppointments })
      });

      const result = await appointmentService.getAppointmentsByDateRange(
        startDate, 
        endDate, 
        practitionerId
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/appointments/date-range?startDate=${startDate}&endDate=${endDate}&practitionerId=${practitionerId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer')
          }
        }
      );

      expect(result.data).toEqual(mockAppointments);
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(appointmentService.getAppointments()).rejects.toThrow('Request timeout');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(appointmentService.getAppointments()).rejects.toThrow('Invalid JSON');
    });

    it('should handle unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(appointmentService.getAppointments()).rejects.toThrow('Unauthorized');
    });
  });
});