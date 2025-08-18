/**
 * Service API pour la gestion des demandes de congé
 */

import { apiService } from '../apiService';

// Types locaux pour les congés
enum LeaveType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  OTHER = 'other'
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  organizationId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeaveRequestData {
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  daysRequested: number;
  employeeId: string;
  organizationId: string;
  status: 'pending';
  attachments?: string[];
}

export interface UpdateLeaveRequestData {
  status?: 'approved' | 'rejected' | 'cancelled';
  managerNotes?: string;
  approverId?: string;
  reason?: string;
}

export interface LeaveRequestFilters {
  employeeId?: string;
  organizationId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  approverId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveBalances {
  vacation: {
    total: number;
    used: number;
    remaining: number;
  };
  sick: {
    total: number;
    used: number;
    remaining: number;
  };
  personal: {
    total: number;
    used: number;
    remaining: number;
  };
  [key: string]: {
    total: number;
    used: number;
    remaining: number;
  };
}

export interface AvailabilityCheck {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  excludeRequestId?: string;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  conflicts: Array<{
    type: 'leave' | 'schedule' | 'holiday';
    startDate: Date;
    endDate: Date;
    description: string;
  }>;
  suggestions?: Array<{
    startDate: Date;
    endDate: Date;
    reason: string;
  }>;
}

class LeaveApi {
  private readonly basePath = '/api/leave';

  /**
   * Créer une demande de congé
   */
  async createLeaveRequest(data: CreateLeaveRequestData) {
    return apiService.post<LeaveRequest>(`${this.basePath}/requests`, {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString()
    });
  }

  /**
   * Lister les demandes de congé
   */
  async listLeaveRequests(filters: LeaveRequestFilters) {
    return apiService.get<LeaveRequest[]>(`${this.basePath}/requests`, { params: filters });
  }

  /**
   * Obtenir une demande de congé par ID
   */
  async getLeaveRequest(requestId: string) {
    return apiService.get<LeaveRequest>(`${this.basePath}/requests/${requestId}`);
  }

  /**
   * Mettre à jour une demande de congé
   */
  async updateLeaveRequest(requestId: string, data: UpdateLeaveRequestData) {
    return apiService.put<LeaveRequest>(`${this.basePath}/requests/${requestId}`, data);
  }

  /**
   * Supprimer une demande de congé
   */
  async deleteLeaveRequest(requestId: string) {
    return apiService.delete<void>(`${this.basePath}/requests/${requestId}`);
  }

  /**
   * Approuver une demande de congé
   */
  async approveLeaveRequest(requestId: string, managerNotes?: string) {
    return apiService.post<LeaveRequest>(`${this.basePath}/requests/${requestId}/approve`, {
      managerNotes
    });
  }

  /**
   * Rejeter une demande de congé
   */
  async rejectLeaveRequest(requestId: string, managerNotes: string) {
    return apiService.post<LeaveRequest>(`${this.basePath}/requests/${requestId}/reject`, {
      managerNotes
    });
  }

  /**
   * Annuler une demande de congé
   */
  async cancelLeaveRequest(requestId: string) {
    return apiService.post<LeaveRequest>(`${this.basePath}/requests/${requestId}/cancel`);
  }

  /**
   * Obtenir les soldes de congés d'un employé
   */
  async getLeaveBalances(employeeId: string) {
    return apiService.get<LeaveBalances>(`${this.basePath}/employees/${employeeId}/balances`);
  }

  /**
   * Mettre à jour les soldes de congés
   */
  async updateLeaveBalances(employeeId: string, balances: Partial<LeaveBalances>) {
    return apiService.put<LeaveBalances>(`${this.basePath}/employees/${employeeId}/balances`, balances);
  }

  /**
   * Vérifier la disponibilité pour une période
   */
  async checkAvailability(data: AvailabilityCheck) {
    return apiService.post<AvailabilityResult>(`${this.basePath}/check-availability`, {
      ...data,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString()
    });
  }

  /**
   * Obtenir le calendrier des congés
   */
  async getLeaveCalendar(params: {
    organizationId?: string;
    departmentId?: string;
    startDate: string;
    endDate: string;
  }) {
    return apiService.get<Array<{
      employeeId: string;
      employeeName: string;
      leaveRequests: LeaveRequest[];
    }>>(`${this.basePath}/calendar`, { params });
  }

  /**
   * Obtenir les statistiques de congés
   */
  async getLeaveStats(params: {
    organizationId?: string;
    departmentId?: string;
    employeeId?: string;
    period?: 'month' | 'quarter' | 'year';
  }) {
    return apiService.get<{
      totalRequests: number;
      approvedRequests: number;
      rejectedRequests: number;
      pendingRequests: number;
      totalDaysRequested: number;
      totalDaysApproved: number;
      averageRequestDuration: number;
      mostRequestedType: string;
      busyPeriods: Array<{
        startDate: string;
        endDate: string;
        requestCount: number;
      }>;
    }>(`${this.basePath}/stats`, { params });
  }

  /**
   * Obtenir les demandes en attente d'approbation
   */
  async getPendingApprovals(managerId: string) {
    return apiService.get<LeaveRequest[]>(`${this.basePath}/pending-approvals`, {
      params: { managerId }
    });
  }

  /**
   * Traitement en lot des demandes
   */
  async batchProcessRequests(data: {
    requestIds: string[];
    action: 'approve' | 'reject';
    managerNotes?: string;
  }) {
    return apiService.post<{
      processed: number;
      failed: number;
      results: Array<{
        requestId: string;
        success: boolean;
        error?: string;
      }>;
    }>(`${this.basePath}/batch-process`, data);
  }

  /**
   * Exporter les données de congés
   */
  async exportLeaveData(params: {
    organizationId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    format: 'excel' | 'csv' | 'pdf';
    includeBalances?: boolean;
  }) {
    return apiService.post<{
      downloadUrl: string;
      filename: string;
      fileSize: number;
      format: string;
    }>(`${this.basePath}/export`, params);
  }

  /**
   * Obtenir les jours fériés
   */
  async getHolidays(params: {
    organizationId: string;
    year: number;
    country?: string;
  }) {
    return apiService.get<Array<{
      date: string;
      name: string;
      type: 'public' | 'religious' | 'national';
      isRecurring: boolean;
    }>>(`${this.basePath}/holidays`, { params });
  }

  /**
   * Configurer les jours fériés
   */
  async configureHolidays(organizationId: string, holidays: Array<{
    date: string;
    name: string;
    type: 'public' | 'religious' | 'national';
    isRecurring: boolean;
  }>) {
    return apiService.put<void>(`${this.basePath}/organizations/${organizationId}/holidays`, {
      holidays
    });
  }

  /**
   * Obtenir les politiques de congés
   */
  async getLeavePolicies(organizationId: string) {
    return apiService.get<{
      vacation: {
        annualAllowance: number;
        carryOverLimit: number;
        maxConsecutiveDays: number;
        minAdvanceNotice: number;
      };
      sick: {
        annualAllowance: number;
        requiresCertificate: boolean;
        certificateThreshold: number;
      };
      personal: {
        annualAllowance: number;
        maxConsecutiveDays: number;
        minAdvanceNotice: number;
      };
      approvalWorkflow: {
        requiresManagerApproval: boolean;
        requiresHRApproval: boolean;
        autoApprovalThreshold: number;
      };
    }>(`${this.basePath}/organizations/${organizationId}/policies`);
  }

  /**
   * Mettre à jour les politiques de congés
   */
  async updateLeavePolicies(organizationId: string, policies: any) {
    return apiService.put<void>(`${this.basePath}/organizations/${organizationId}/policies`, policies);
  }

  /**
   * Envoyer des rappels pour les demandes en attente
   */
  async sendPendingReminders(organizationId: string) {
    return apiService.post<{
      remindersSent: number;
      errors: string[];
    }>(`${this.basePath}/organizations/${organizationId}/send-reminders`);
  }
}

export const leaveApi = new LeaveApi();