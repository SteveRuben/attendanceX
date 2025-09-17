/**
 * Service pour la gestion des rendez-vous
 */

import { apiService } from './api';

// Types locaux pour les rendez-vous
export interface Appointment {
  id: string;
  organizationId: string;
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentData {
  clientId: string;
  practitionerId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
}

export interface UpdateAppointmentData {
  date?: string;
  startTime?: string;
  duration?: number;
  serviceId?: string;
  practitionerId?: string;
  notes?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
}

export interface AppointmentFilters {
  startDate?: string;
  endDate?: string;
  practitionerId?: string;
  serviceId?: string;
  clientId?: string;
  status?: string[];
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  practitionerId: string;
  serviceId?: string;
}

export interface PublicBookingData {
  clientData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    preferences?: {
      reminderMethod?: 'email' | 'sms' | 'both';
      language?: string;
      timezone?: string;
    };
  };
  appointmentData: {
    date: string;
    startTime: string;
    serviceId: string;
    practitionerId?: string;
    notes?: string;
  };
}

class AppointmentService {
  private readonly basePath = '/api/appointments';

  /**
   * Créer un nouveau rendez-vous
   */
  async createAppointment(organizationId: string, data: CreateAppointmentData) {
    return apiService.post<Appointment>(`${this.basePath}/${organizationId}`, data);
  }

  /**
   * Récupérer les rendez-vous avec filtres
   */
  async getAppointments(organizationId: string, filters?: AppointmentFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const queryString = params.toString();
    const url = `${this.basePath}/${organizationId}${queryString ? `?${queryString}` : ''}`;

    return apiService.get<{
      data: Appointment[];
      count: number;
    }>(url);
  }

  /**
   * Récupérer un rendez-vous par ID
   */
  async getAppointmentById(organizationId: string, appointmentId: string) {
    return apiService.get<Appointment>(`${this.basePath}/${organizationId}/${appointmentId}`);
  }

  /**
   * Mettre à jour un rendez-vous
   */
  async updateAppointment(organizationId: string, appointmentId: string, data: UpdateAppointmentData) {
    return apiService.put<Appointment>(`${this.basePath}/${organizationId}/${appointmentId}`, data);
  }

  /**
   * Supprimer un rendez-vous
   */
  async deleteAppointment(organizationId: string, appointmentId: string, reason?: string) {
    if (reason) {
      // If we need to send a reason, use a POST request to a delete endpoint
      return apiService.post(`${this.basePath}/${organizationId}/${appointmentId}/delete`, { reason });
    } else {
      // Simple delete without body data
      return apiService.delete(`${this.basePath}/${organizationId}/${appointmentId}`);
    }
  }

  /**
   * Mettre à jour le statut d'un rendez-vous
   */
  async updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    status: Appointment['status'],
    reason?: string
  ) {
    return apiService.patch<Appointment>(
      `${this.basePath}/${organizationId}/${appointmentId}/status`,
      { status, reason }
    );
  }

  /**
   * Confirmer un rendez-vous
   */
  async confirmAppointment(organizationId: string, appointmentId: string) {
    return apiService.post<Appointment>(`${this.basePath}/${organizationId}/${appointmentId}/confirm`);
  }

  /**
   * Terminer un rendez-vous
   */
  async completeAppointment(organizationId: string, appointmentId: string, notes?: string) {
    return apiService.post<Appointment>(
      `${this.basePath}/${organizationId}/${appointmentId}/complete`,
      { notes }
    );
  }

  /**
   * Annuler un rendez-vous
   */
  async cancelAppointment(organizationId: string, appointmentId: string, reason?: string) {
    return apiService.post<Appointment>(
      `${this.basePath}/${organizationId}/${appointmentId}/cancel`,
      { reason }
    );
  }

  /**
   * Marquer un rendez-vous comme absent
   */
  async markAsNoShow(organizationId: string, appointmentId: string) {
    return apiService.post<Appointment>(`${this.basePath}/${organizationId}/${appointmentId}/no-show`);
  }

  /**
   * Récupérer les créneaux disponibles (protégé)
   */
  async getAvailableSlots(
    organizationId: string,
    practitionerId: string,
    date: string,
    serviceId?: string,
    duration?: number
  ) {
    const params = new URLSearchParams({
      practitionerId,
      date,
      ...(serviceId && { serviceId }),
      ...(duration && { duration: duration.toString() })
    });

    return apiService.get<AvailableSlot[]>(
      `${this.basePath}/${organizationId}/available-slots?${params.toString()}`
    );
  }

  /**
   * Récupérer les créneaux disponibles pour réservation publique
   */
  async getPublicAvailableSlots(
    organizationId: string,
    date: string,
    serviceId?: string,
    practitionerId?: string
  ) {
    const params = new URLSearchParams({
      date,
      ...(serviceId && { serviceId }),
      ...(practitionerId && { practitionerId })
    });

    return apiService.get<AvailableSlot[]>(
      `${this.basePath}/${organizationId}/public/available-slots?${params.toString()}`
    );
  }

  /**
   * Créer une réservation publique
   */
  async createPublicBooking(organizationId: string, data: PublicBookingData) {
    return apiService.post<{
      appointment: Appointment;
      client: any;
      isNewClient: boolean;
    }>(`${this.basePath}/${organizationId}/public/book`, data);
  }

  /**
   * Modifier une réservation publique
   */
  async modifyPublicBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string,
    updates: Partial<PublicBookingData['appointmentData']>
  ) {
    return apiService.put<Appointment>(
      `${this.basePath}/${organizationId}/public/${appointmentId}/modify`,
      { clientEmail, updates }
    );
  }

  /**
   * Annuler une réservation publique
   */
  async cancelPublicBooking(
    organizationId: string,
    appointmentId: string,
    clientEmail: string,
    reason?: string
  ) {
    return apiService.post<Appointment>(
      `${this.basePath}/${organizationId}/public/${appointmentId}/cancel`,
      { clientEmail, reason }
    );
  }

  /**
   * Récupérer les rendez-vous du jour
   */
  async getTodayAppointments(organizationId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointments(organizationId, {
      startDate: today,
      endDate: today
    });
  }

  /**
   * Récupérer les rendez-vous à venir
   */
  async getUpcomingAppointments(organizationId: string, limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointments(organizationId, {
      startDate: today,
      status: ['scheduled', 'confirmed'],
      limit
    });
  }

  /**
   * Rechercher des rendez-vous
   */
  async searchAppointments(organizationId: string, query: string) {
    return this.getAppointments(organizationId, {
      searchQuery: query
    });
  }
}

export const appointmentService = new AppointmentService();