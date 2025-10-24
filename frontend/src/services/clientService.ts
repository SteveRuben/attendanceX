import { apiService } from './api';
import {
  type Client,
  type ClientPreferences
} from '../shared';

// Local request types since they're not defined in shared package
export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferences?: Partial<ClientPreferences>;
}

export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  preferences?: Partial<ClientPreferences>;
}

export interface ClientFilters {
  search?: string;
  reminderMethod?: string;
  language?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ClientListResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClientAppointmentHistory {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  upcomingAppointments: number;
  lastAppointmentDate?: Date;
  nextAppointmentDate?: Date;
  averageRating?: number;
  preferredServices: string[];
  preferredPractitioners: string[];
}

/**
 * Service for client management
 * Handles all client-related API calls with proper error handling and loading states
 */
export class ClientService {
  private readonly baseUrl = '/clients';

  /**
   * Get clients with optional filters
   */
  async getClients(
    organizationId: string,
    filters?: ClientFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ClientListResponse> {
    try {
      const params: Record<string, any> = {
        page,
        limit
      };

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof Date) {
              params[key] = value.toISOString();
            } else {
              params[key] = value;
            }
          }
        });
      }

      const response = await apiService.get<{
        data: Client[];
        count: number;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`${this.baseUrl}/${organizationId}`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch clients');
      }

      return {
        clients: response.data.data,
        pagination: response.data.pagination || {
          page,
          limit,
          total: response.data.count || response.data.data.length,
          totalPages: Math.ceil((response.data.count || response.data.data.length) / limit)
        }
      };
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      throw new Error(error.message || 'Failed to fetch clients');
    }
  }

  /**
   * Get client by ID
   */
  async getClientById(
    organizationId: string,
    clientId: string
  ): Promise<Client> {
    try {
      const response = await apiService.get<{
        data: Client;
      }>(`${this.baseUrl}/${organizationId}/${clientId}`);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch client');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching client:', error);
      throw new Error(error.message || 'Failed to fetch client');
    }
  }

  /**
   * Create new client
   */
  async createClient(
    organizationId: string,
    clientData: CreateClientRequest
  ): Promise<Client> {
    try {
      const response = await apiService.post<{
        data: Client;
      }>(`${this.baseUrl}/${organizationId}`, clientData);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create client');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw new Error(error.message || 'Failed to create client');
    }
  }

  /**
   * Update client
   */
  async updateClient(
    organizationId: string,
    clientId: string,
    updates: UpdateClientRequest
  ): Promise<Client> {
    try {
      const response = await apiService.put<{
        data: Client;
      }>(`${this.baseUrl}/${organizationId}/${clientId}`, updates);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update client');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error updating client:', error);
      throw new Error(error.message || 'Failed to update client');
    }
  }

  /**
   * Delete client
   */
  async deleteClient(
    organizationId: string,
    clientId: string
  ): Promise<void> {
    try {
      const response = await apiService.delete(`${this.baseUrl}/${organizationId}/${clientId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete client');
      }
    } catch (error: any) {
      console.error('Error deleting client:', error);
      throw new Error(error.message || 'Failed to delete client');
    }
  }

  /**
   * Get client appointment history
   */
  async getClientHistory(
    organizationId: string,
    clientId: string
  ): Promise<ClientAppointmentHistory> {
    try {
      const response = await apiService.get<{
        data: ClientAppointmentHistory;
      }>(`${this.baseUrl}/${organizationId}/${clientId}/history`);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch client history');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching client history:', error);
      throw new Error(error.message || 'Failed to fetch client history');
    }
  }

  /**
   * Get client appointments
   */
  async getClientAppointments(
    organizationId: string,
    clientId: string,
    filters?: {
      status?: string[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    try {
      const params: Record<string, any> = {};

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params[key] = value.join(',');
            } else if (value instanceof Date) {
              params[key] = value.toISOString();
            } else {
              params[key] = value;
            }
          }
        });
      }

      const response = await apiService.get<{
        data: any[];
      }>(`${this.baseUrl}/${organizationId}/${clientId}/appointments`, params);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch client appointments');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching client appointments:', error);
      throw new Error(error.message || 'Failed to fetch client appointments');
    }
  }

  /**
   * Update client preferences
   */
  async updateClientPreferences(
    organizationId: string,
    clientId: string,
    preferences: {
      reminderMethod?: string;
      language?: string;
      timezone?: string;
      notifications?: {
        email?: boolean;
        sms?: boolean;
        push?: boolean;
      };
    }
  ): Promise<Client> {
    try {
      const response = await apiService.put<{
        data: Client;
      }>(`${this.baseUrl}/${organizationId}/${clientId}/preferences`, { preferences });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update client preferences');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error updating client preferences:', error);
      throw new Error(error.message || 'Failed to update client preferences');
    }
  }

  /**
   * Search clients by contact info
   */
  async searchClients(
    organizationId: string,
    query: string
  ): Promise<Client[]> {
    try {
      const response = await apiService.get<{
        data: Client[];
      }>(`${this.baseUrl}/${organizationId}/search`, { q: query });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search clients');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error searching clients:', error);
      throw new Error(error.message || 'Failed to search clients');
    }
  }

  /**
   * Export clients data
   */
  async exportClients(
    organizationId: string,
    format: 'csv' | 'excel' = 'csv',
    filters?: ClientFilters
  ): Promise<void> {
    try {
      const params: Record<string, any> = { format };

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof Date) {
              params[key] = value.toISOString();
            } else {
              params[key] = value;
            }
          }
        });
      }

      // Build URL with parameters
      const url = new URL(`${window.location.origin}/api${this.baseUrl}/${organizationId}/export`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });

      // Make direct fetch request for blob response
      const token = localStorage.getItem('accessToken'); // Using localStorage directly for now
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `clients-export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      console.error('Error exporting clients:', error);
      throw new Error(error.message || 'Failed to export clients');
    }
  }
}

export const clientService = new ClientService();