import { apiService } from './apiService';
import {
  PublicBookingRequest,
  AvailableSlot,
  Service,
  Appointment
} from '@attendance-x/shared';

export interface PublicOrganizationInfo {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  workingHours: {
    [key: string]: {
      start: string;
      end: string;
      isOpen: boolean;
    };
  };
  bookingSettings: {
    advanceBookingDays: number;
    cancellationDeadlineHours: number;
    allowOnlineBooking: boolean;
    requireClientInfo: boolean;
    autoConfirmBookings: boolean;
  };
}

export interface PublicPractitioner {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  specialties?: string[];
  bio?: string;
  avatar?: string;
}

export interface BookingConfirmation {
  appointment: Appointment;
  confirmationCode: string;
  message: string;
}

/**
 * Service for public booking functionality
 * Handles all public-facing booking operations without authentication
 */
export class PublicBookingService {
  private readonly baseUrl = '/public/booking';

  /**
   * Get organization information for public booking
   */
  async getOrganizationInfo(organizationId: string): Promise<PublicOrganizationInfo> {
    try {
      const response = await apiService.get<{
        data: PublicOrganizationInfo;
      }>(`${this.baseUrl}/${organizationId}/info`);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch organization info');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching organization info:', error);
      throw new Error(error.message || 'Failed to fetch organization info');
    }
  }

  /**
   * Get available services for booking
   */
  async getAvailableServices(organizationId: string): Promise<Service[]> {
    try {
      const response = await apiService.get<{
        data: Service[];
      }>(`${this.baseUrl}/${organizationId}/services`);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch services');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching services:', error);
      throw new Error(error.message || 'Failed to fetch services');
    }
  }

  /**
   * Get available practitioners for a service
   */
  async getAvailablePractitioners(
    organizationId: string,
    serviceId?: string
  ): Promise<PublicPractitioner[]> {
    try {
      const params: Record<string, any> = {};
      if (serviceId) {
        params.serviceId = serviceId;
      }

      const response = await apiService.get<{
        data: PublicPractitioner[];
      }>(`${this.baseUrl}/${organizationId}/practitioners`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch practitioners');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching practitioners:', error);
      throw new Error(error.message || 'Failed to fetch practitioners');
    }
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots(
    organizationId: string,
    params: {
      serviceId: string;
      practitionerId?: string;
      date: Date;
      duration?: number;
    }
  ): Promise<AvailableSlot[]> {
    try {
      const queryParams: Record<string, any> = {
        serviceId: params.serviceId,
        date: params.date.toISOString().split('T')[0]
      };

      if (params.practitionerId) {
        queryParams.practitionerId = params.practitionerId;
      }

      if (params.duration) {
        queryParams.duration = params.duration;
      }

      const response = await apiService.get<{
        data: AvailableSlot[];
      }>(`${this.baseUrl}/${organizationId}/slots`, queryParams);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch available slots');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching available slots:', error);
      throw new Error(error.message || 'Failed to fetch available slots');
    }
  }

  /**
   * Create a public booking
   */
  async createBooking(
    organizationId: string,
    bookingData: PublicBookingRequest
  ): Promise<BookingConfirmation> {
    try {
      const response = await apiService.post<{
        data: BookingConfirmation;
      }>(`${this.baseUrl}/${organizationId}/book`, bookingData);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create booking');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error creating booking:', error);
      throw new Error(error.message || 'Failed to create booking');
    }
  }

  /**
   * Get booking details by confirmation code
   */
  async getBookingByConfirmation(
    organizationId: string,
    confirmationCode: string
  ): Promise<Appointment> {
    try {
      const response = await apiService.get<{
        data: Appointment;
      }>(`${this.baseUrl}/${organizationId}/booking/${confirmationCode}`);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Booking not found');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching booking:', error);
      throw new Error(error.message || 'Booking not found');
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    organizationId: string,
    confirmationCode: string,
    reason?: string
  ): Promise<void> {
    try {
      const response = await apiService.post(
        `${this.baseUrl}/${organizationId}/booking/${confirmationCode}/cancel`,
        { reason }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  /**
   * Modify a booking
   */
  async modifyBooking(
    organizationId: string,
    confirmationCode: string,
    modifications: {
      date?: Date;
      startTime?: string;
      notes?: string;
    }
  ): Promise<BookingConfirmation> {
    try {
      const response = await apiService.put<{
        data: BookingConfirmation;
      }>(`${this.baseUrl}/${organizationId}/booking/${confirmationCode}`, modifications);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to modify booking');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error modifying booking:', error);
      throw new Error(error.message || 'Failed to modify booking');
    }
  }
}

export const publicBookingService = new PublicBookingService();