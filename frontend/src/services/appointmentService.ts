import { apiService } from './apiService';

const API_BASE_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:5001/v1';
import {
  type Appointment,
  type AppointmentFilters,
  type CreateAppointmentRequest,
  type UpdateAppointmentRequest,
  type BookingRequest,
  type AvailableSlot,
  type AppointmentStats,
  type AppointmentConflict,
  type Client,
  type Service
} from '@attendance-x/shared';

// Frontend-specific types
export interface Practitioner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
}

export interface AppointmentWithDetails extends Appointment {
  client: Client;
  service: Service;
  practitioner: Practitioner;
}

export interface AppointmentListResponse {
  appointments: AppointmentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Service for managing appointments
 * Handles all appointment-related API calls with proper error handling and loading states
 */
export class AppointmentService {
  private readonly baseUrl = '/appointments';

  /**
   * Get appointments with optional filters
   */
  async getAppointments(
    organizationId: string,
    filters?: AppointmentFilters
  ): Promise<AppointmentListResponse> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params[key] = value.join(',');
            } else {
              params[key] = value;
            }
          }
        });
      }

      const response = await apiService.get<{
        data: AppointmentWithDetails[];
        count: number;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`${this.baseUrl}/${organizationId}`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch appointments');
      }

      return {
        appointments: response.data.data,
        pagination: response.data.pagination || {
          page: 1,
          limit: response.data.data.length,
          total: response.data.count || response.data.data.length,
          totalPages: 1
        }
      };
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      throw new Error(error.message || 'Failed to fetch appointments');
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(
    organizationId: string,
    appointmentId: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.get<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching appointment:', error);
      throw new Error(error.message || 'Failed to fetch appointment');
    }
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    organizationId: string,
    appointmentData: CreateAppointmentRequest
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.post<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}`,
        appointmentData
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error creating appointment:', error);

      // Handle specific error cases
      if (error.message?.includes('conflict') || error.message?.includes('409')) {
        throw new Error('Appointment time slot is not available');
      }

      if (error.message?.includes('400')) {
        throw new Error('Invalid appointment data');
      }

      throw new Error(error.message || 'Failed to create appointment');
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(
    organizationId: string,
    appointmentId: string,
    updates: UpdateAppointmentRequest
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.put<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}`,
        updates
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating appointment:', error);

      if (error.message?.includes('conflict') || error.message?.includes('409')) {
        throw new Error('Appointment time slot is not available');
      }

      if (error.message?.includes('404')) {
        throw new Error('Appointment not found');
      }

      throw new Error(error.message || 'Failed to update appointment');
    }
  }

  /**
   * Delete an appointment
   */
  async deleteAppointment(
    organizationId: string,
    appointmentId: string,
    reason?: string
  ): Promise<void> {
    try {
      const response = await apiService.delete(
        `${this.baseUrl}/${organizationId}/${appointmentId}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete appointment');
      }
    } catch (error: any) {
      console.error('Error deleting appointment:', error);

      if (error.message?.includes('404')) {
        throw new Error('Appointment not found');
      }

      throw new Error(error.message || 'Failed to delete appointment');
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    status: string,
    reason?: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.put<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}/status`,
        { status, reason }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update appointment status');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      throw new Error(error.message || 'Failed to update appointment status');
    }
  }

  /**
   * Confirm an appointment
   */
  async confirmAppointment(
    organizationId: string,
    appointmentId: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.post<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}/confirm`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to confirm appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      throw new Error(error.message || 'Failed to confirm appointment');
    }
  }

  /**
   * Complete an appointment
   */
  async completeAppointment(
    organizationId: string,
    appointmentId: string,
    notes?: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.post<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}/complete`,
        { notes }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to complete appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      throw new Error(error.message || 'Failed to complete appointment');
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    organizationId: string,
    appointmentId: string,
    reason?: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.post<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}/cancel`,
        { reason }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to cancel appointment');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      throw new Error(error.message || 'Failed to cancel appointment');
    }
  }

  /**
   * Mark appointment as no-show
   */
  async markAsNoShow(
    organizationId: string,
    appointmentId: string
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.post<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/${appointmentId}/no-show`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark appointment as no-show');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error marking appointment as no-show:', error);
      throw new Error(error.message || 'Failed to mark appointment as no-show');
    }
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots(
    organizationId: string,
    practitionerId: string,
    date: string,
    serviceId?: string,
    duration?: number
  ): Promise<AvailableSlot[]> {
    try {
      const params: Record<string, any> = {
        practitionerId,
        date
      };

      if (serviceId) params.serviceId = serviceId;
      if (duration) params.duration = duration;

      const response = await apiService.get<AvailableSlot[]>(
        `${this.baseUrl}/${organizationId}/available-slots`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch available slots');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching available slots:', error);
      throw new Error(error.message || 'Failed to fetch available slots');
    }
  }

  /**
   * Get public available slots (no authentication required)
   */
  async getPublicAvailableSlots(
    organizationId: string,
    date: string,
    serviceId?: string,
    practitionerId?: string
  ): Promise<AvailableSlot[]> {
    try {
      const params: Record<string, any> = { date };

      if (serviceId) params.serviceId = serviceId;
      if (practitionerId) params.practitionerId = practitionerId;

      const response = await apiService.get<AvailableSlot[]>(
        `${this.baseUrl}/${organizationId}/public/available-slots`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch available slots');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching public available slots:', error);
      throw new Error(error.message || 'Failed to fetch available slots');
    }
  }

  /**
   * Create a public booking (no authentication required)
   */
  async createPublicBooking(
    organizationId: string,
    bookingData: BookingRequest
  ): Promise<{
    appointment: AppointmentWithDetails;
    client: any;
    isNewClient: boolean;
  }> {
    try {
      const response = await apiService.post<{
        appointment: AppointmentWithDetails;
        client: any;
        isNewClient: boolean;
      }>(`${this.baseUrl}/${organizationId}/public/book`, bookingData);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create booking');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error creating public booking:', error);

      if (error.message?.includes('conflict') || error.message?.includes('409')) {
        throw new Error('Selected time slot is no longer available');
      }

      if (error.message?.includes('400')) {
        throw new Error('Invalid booking data');
      }

      throw new Error(error.message || 'Failed to create booking');
    }
  }

  /**
   * Modify a public booking
   */
  async modifyPublicBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string,
    updates: Partial<{
      date: string;
      startTime: string;
      serviceId: string;
      notes: string;
    }>
  ): Promise<AppointmentWithDetails> {
    try {
      const response = await apiService.put<AppointmentWithDetails>(
        `${this.baseUrl}/${organizationId}/public/${appointmentId}/modify`,
        { clientEmail, updates }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to modify booking');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error modifying public booking:', error);

      if (error.message?.includes('403')) {
        throw new Error('Invalid email address');
      }

      if (error.message?.includes('404')) {
        throw new Error('Appointment not found');
      }

      throw new Error(error.message || 'Failed to modify booking');
    }
  }

  /**
   * Cancel a public booking
   */
  async cancelPublicBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string,
    reason?: string
  ): Promise<void> {
    try {
      const response = await apiService.post(
        `${this.baseUrl}/${organizationId}/public/${appointmentId}/cancel`,
        { clientEmail, reason }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Error cancelling public booking:', error);

      if (error.message?.includes('403')) {
        throw new Error('Invalid email address');
      }

      if (error.message?.includes('404')) {
        throw new Error('Appointment not found');
      }

      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  // Analytics methods

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      practitionerId?: string;
      serviceId?: string;
      clientId?: string;
      status?: string[];
    }
  ): Promise<AppointmentStats> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params[key] = value.join(',');
            } else {
              params[key] = value;
            }
          }
        });
      }

      const response = await apiService.get<AppointmentStats>(
        `${this.baseUrl}/${organizationId}/analytics/stats`,
        params
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch appointment statistics');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching appointment stats:', error);
      throw new Error(error.message || 'Failed to fetch appointment statistics');
    }
  }

  /**
   * Get attendance rate
   */
  async getAttendanceRate(
    organizationId: string,
    startDate: string,
    endDate: string,
    practitionerId?: string
  ): Promise<number> {
    try {
      const params: Record<string, any> = { startDate, endDate };
      if (practitionerId) params.practitionerId = practitionerId;

      const response = await apiService.get<{
        attendanceRate: number;
        period: { startDate: string; endDate: string };
        practitionerId?: string;
      }>(`${this.baseUrl}/${organizationId}/analytics/attendance-rate`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch attendance rate');
      }

      return response.data.attendanceRate;
    } catch (error: any) {
      console.error('Error fetching attendance rate:', error);
      throw new Error(error.message || 'Failed to fetch attendance rate');
    }
  }

  /**
   * Get cancellation rate
   */
  async getCancellationRate(
    organizationId: string,
    startDate: string,
    endDate: string,
    practitionerId?: string
  ): Promise<number> {
    try {
      const params: Record<string, any> = { startDate, endDate };
      if (practitionerId) params.practitionerId = practitionerId;

      const response = await apiService.get<{
        cancellationRate: number;
        period: { startDate: string; endDate: string };
        practitionerId?: string;
      }>(`${this.baseUrl}/${organizationId}/analytics/cancellation-rate`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch cancellation rate');
      }

      return response.data.cancellationRate;
    } catch (error: any) {
      console.error('Error fetching cancellation rate:', error);
      throw new Error(error.message || 'Failed to fetch cancellation rate');
    }
  }

  /**
   * Get peak hours
   */
  async getPeakHours(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      practitionerId?: string;
      serviceId?: string;
    }
  ): Promise<{ hour: number; count: number; percentage: number }[]> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params[key] = value;
          }
        });
      }

      const response = await apiService.get<{
        peakHours: { hour: number; count: number; percentage: number }[];
        filters: any;
      }>(`${this.baseUrl}/${organizationId}/analytics/peak-hours`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch peak hours');
      }

      return response.data.peakHours;
    } catch (error: any) {
      console.error('Error fetching peak hours:', error);
      throw new Error(error.message || 'Failed to fetch peak hours');
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalAppointments: number;
    attendanceRate: number;
    cancellationRate: number;
    noShowRate: number;
    averageDuration: number;
    topPeakHour: { hour: number; count: number } | null;
    topService: { serviceId: string; serviceName: string; count: number } | null;
    period: { startDate?: string; endDate?: string };
  }> {
    try {
      const params: Record<string, any> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiService.get<{
        totalAppointments: number;
        attendanceRate: number;
        cancellationRate: number;
        noShowRate: number;
        averageDuration: number;
        topPeakHour: { hour: number; count: number } | null;
        topService: { serviceId: string; serviceName: string; count: number } | null;
        period: { startDate?: string; endDate?: string };
      }>(`${this.baseUrl}/${organizationId}/analytics/summary`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch analytics summary');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching analytics summary:', error);
      throw new Error(error.message || 'Failed to fetch analytics summary');
    }
  }

  /**
   * Generate Excel report
   */
  async generateExcelReport(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      practitionerId?: string;
      serviceId?: string;
    }
  ): Promise<Blob> {
    try {
      // Note: This would need special handling for blob responses in apiService
      // For now, we'll use fetch directly
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}${this.baseUrl}/${organizationId}/analytics/reports/excel${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Assuming token is stored here
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate Excel report');
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Error generating Excel report:', error);
      throw new Error(error.message || 'Failed to generate Excel report');
    }
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      practitionerId?: string;
      serviceId?: string;
    }
  ): Promise<Blob> {
    try {
      // Note: This would need special handling for blob responses in apiService
      // For now, we'll use fetch directly
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}${this.baseUrl}/${organizationId}/analytics/reports/pdf${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Assuming token is stored here
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Error generating PDF report:', error);
      throw new Error(error.message || 'Failed to generate PDF report');
    }
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();