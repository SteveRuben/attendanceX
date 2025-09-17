/**
 * Service API pour la gestion des horaires de travail
 */

import { apiService } from '../api';

// Types locaux pour les horaires
interface WorkDay {
  dayOfWeek: number; // 0 = dimanche, 1 = lundi, etc.
  isWorkingDay: boolean;
  startTime: string; // format HH:mm
  endTime: string;
  breakDuration?: number; // en minutes
}

interface WorkSchedule {
  id: string;
  name: string;
  organizationId: string;
  employeeId?: string;
  workDays: WorkDay[];
  timezone: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkScheduleData {
  name: string;
  description?: string;
  type: 'fixed' | 'flexible';
  isActive: boolean;
  isDefault?: boolean;
  weeklyPattern: Record<string, WorkDay>;
  lateThresholdMinutes?: number;
  overtimeThresholdMinutes?: number;
  autoBreak?: boolean;
  exceptions?: Array<{
    date: string;
    isWorkDay: boolean;
    startTime?: string;
    endTime?: string;
    reason: string;
  }>;
  organizationId: string;
  assignedEmployees?: string[];
}

export interface UpdateWorkScheduleData extends Partial<CreateWorkScheduleData> { }

export interface ScheduleFilters {
  organizationId?: string;
  isActive?: boolean;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ScheduleConflictCheck {
  employeeIds: string[];
  weeklyPattern: Record<string, WorkDay>;
  exceptions?: Array<{
    date: string;
    isWorkDay: boolean;
    startTime?: string;
    endTime?: string;
  }>;
}

export interface ScheduleConflict {
  employeeId: string;
  employeeName: string;
  conflicts: Array<{
    type: 'overlap' | 'gap' | 'invalid_hours';
    date?: string;
    dayOfWeek?: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

class ScheduleApi {
  private readonly basePath = '/api/schedules';

  /**
   * Créer un horaire de travail
   */
  async createWorkSchedule(data: CreateWorkScheduleData) {
    return apiService.post<WorkSchedule>(`${this.basePath}`, data);
  }

  /**
   * Lister les horaires de travail
   */
  async listWorkSchedules(filters: ScheduleFilters) {
    return apiService.get<WorkSchedule[]>(`${this.basePath}`, filters);
  }

  /**
   * Obtenir un horaire de travail par ID
   */
  async getWorkSchedule(scheduleId: string) {
    return apiService.get<WorkSchedule>(`${this.basePath}/${scheduleId}`);
  }

  /**
   * Mettre à jour un horaire de travail
   */
  async updateWorkSchedule(scheduleId: string, data: UpdateWorkScheduleData) {
    return apiService.put<WorkSchedule>(`${this.basePath}/${scheduleId}`, data);
  }

  /**
   * Supprimer un horaire de travail
   */
  async deleteWorkSchedule(scheduleId: string) {
    return apiService.delete<void>(`${this.basePath}/${scheduleId}`);
  }

  /**
   * Dupliquer un horaire de travail
   */
  async duplicateWorkSchedule(scheduleId: string, newName: string) {
    return apiService.post<WorkSchedule>(`${this.basePath}/${scheduleId}/duplicate`, {
      name: newName
    });
  }

  /**
   * Obtenir l'horaire d'un employé
   */
  async getEmployeeSchedule(employeeId: string) {
    return apiService.get<WorkSchedule>(`${this.basePath}/employees/${employeeId}`);
  }

  /**
   * Assigner un horaire à des employés
   */
  async assignScheduleToEmployees(scheduleId: string, employeeIds: string[]) {
    return apiService.post<WorkSchedule>(`${this.basePath}/${scheduleId}/assign`, {
      employeeIds
    });
  }

  /**
   * Désassigner un horaire d'employés
   */
  async unassignScheduleFromEmployees(scheduleId: string, employeeIds: string[]) {
    return apiService.post<WorkSchedule>(`${this.basePath}/${scheduleId}/unassign`, {
      employeeIds
    });
  }

  /**
   * Obtenir les employés assignés à un horaire
   */
  async getScheduleEmployees(scheduleId: string) {
    return apiService.get<Array<{
      id: string;
      name: string;
      employeeId: string;
      department: string;
      position: string;
      assignedDate: string;
    }>>(`${this.basePath}/${scheduleId}/employees`);
  }

  /**
   * Vérifier les conflits d'horaires
   */
  async checkScheduleConflicts(data: ScheduleConflictCheck) {
    return apiService.post<ScheduleConflict[]>(`${this.basePath}/check-conflicts`, data);
  }

  /**
   * Obtenir les horaires par défaut
   */
  async getDefaultSchedules(organizationId: string) {
    return apiService.get<WorkSchedule[]>(`${this.basePath}/defaults`, { organizationId });
  }

  /**
   * Définir un horaire comme par défaut
   */
  async setDefaultSchedule(scheduleId: string) {
    return apiService.post<WorkSchedule>(`${this.basePath}/${scheduleId}/set-default`);
  }

  /**
   * Obtenir les modèles d'horaires
   */
  async getScheduleTemplates() {
    return apiService.get<Array<{
      id: string;
      name: string;
      description: string;
      type: 'fixed' | 'flexible';
      weeklyPattern: Record<string, WorkDay>;
      category: 'standard' | 'part_time' | 'shift' | 'flexible';
    }>>(`${this.basePath}/templates`);
  }

  /**
   * Créer un horaire à partir d'un modèle
   */
  async createFromTemplate(templateId: string, data: {
    name: string;
    organizationId: string;
    customizations?: Partial<CreateWorkScheduleData>;
  }) {
    return apiService.post<WorkSchedule>(`${this.basePath}/templates/${templateId}/create`, data);
  }

  /**
   * Obtenir les statistiques d'utilisation des horaires
   */
  async getScheduleStats(organizationId: string) {
    return apiService.get<{
      totalSchedules: number;
      activeSchedules: number;
      totalAssignedEmployees: number;
      averageWeeklyHours: number;
      scheduleDistribution: Array<{
        scheduleId: string;
        scheduleName: string;
        employeeCount: number;
        weeklyHours: number;
      }>;
      typeDistribution: {
        fixed: number;
        flexible: number;
      };
    }>(`${this.basePath}/stats`, { organizationId });
  }

  /**
   * Valider un horaire de travail
   */
  async validateSchedule(data: CreateWorkScheduleData) {
    return apiService.post<{
      isValid: boolean;
      errors: Array<{
        field: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
      warnings: Array<{
        field: string;
        message: string;
        suggestion?: string;
      }>;
    }>(`${this.basePath}/validate`, data);
  }

  /**
   * Obtenir l'aperçu d'un horaire
   */
  async getSchedulePreview(scheduleId: string, params: {
    startDate: string;
    endDate: string;
    employeeId?: string;
  }) {
    return apiService.get<Array<{
      date: string;
      dayOfWeek: number;
      isWorkDay: boolean;
      startTime?: string;
      endTime?: string;
      breakDuration?: number;
      totalHours?: number;
      isException?: boolean;
      exceptionReason?: string;
    }>>(`${this.basePath}/${scheduleId}/preview`, params);
  }

  /**
   * Calculer les heures de travail pour une période
   */
  async calculateWorkingHours(scheduleId: string, params: {
    startDate: string;
    endDate: string;
    excludeHolidays?: boolean;
  }) {
    return apiService.get<{
      totalHours: number;
      workingDays: number;
      averageHoursPerDay: number;
      breakdown: Array<{
        date: string;
        hours: number;
        isWorkDay: boolean;
        isHoliday?: boolean;
      }>;
    }>(`${this.basePath}/${scheduleId}/calculate-hours`, params);
  }

  /**
   * Importer des horaires depuis un fichier
   */
  async importSchedules(organizationId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    return apiService.postWithHeaders<{
      imported: number;
      failed: number;
      errors: Array<{
        row: number;
        field: string;
        message: string;
      }>;
    }>(`${this.basePath}/import`, formData, {
      'Content-Type': 'multipart/form-data'
    });
  }

  /**
   * Exporter les horaires
   */
  async exportSchedules(params: {
    organizationId: string;
    scheduleIds?: string[];
    format: 'excel' | 'csv' | 'pdf';
    includeEmployees?: boolean;
    includeStats?: boolean;
  }) {
    return apiService.post<{
      downloadUrl: string;
      filename: string;
      fileSize: number;
      format: string;
    }>(`${this.basePath}/export`, params);
  }

  /**
   * Obtenir l'historique des modifications d'un horaire
   */
  async getScheduleHistory(scheduleId: string) {
    return apiService.get<Array<{
      id: string;
      action: 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned';
      changes: Record<string, { before: any; after: any }>;
      performedBy: string;
      performedAt: string;
      reason?: string;
    }>>(`${this.basePath}/${scheduleId}/history`);
  }

  /**
   * Restaurer une version précédente d'un horaire
   */
  async restoreScheduleVersion(scheduleId: string, versionId: string) {
    return apiService.post<WorkSchedule>(`${this.basePath}/${scheduleId}/restore/${versionId}`);
  }

  /**
   * Obtenir les suggestions d'optimisation
   */
  async getOptimizationSuggestions(organizationId: string) {
    return apiService.get<Array<{
      type: 'efficiency' | 'coverage' | 'cost' | 'compliance';
      priority: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      impact: string;
      suggestedActions: string[];
      affectedSchedules: string[];
    }>>(`${this.basePath}/optimization-suggestions`, { organizationId });
  }

  /**
   * Analyser la couverture des horaires
   */
  async analyzeCoverage(organizationId: string, params: {
    startDate: string;
    endDate: string;
    departmentId?: string;
  }) {
    return apiService.get<{
      totalCoverageHours: number;
      averageCoveragePerDay: number;
      peakHours: Array<{
        hour: number;
        employeeCount: number;
      }>;
      gaps: Array<{
        date: string;
        startTime: string;
        endTime: string;
        severity: 'low' | 'medium' | 'high';
      }>;
      overlaps: Array<{
        date: string;
        startTime: string;
        endTime: string;
        employeeCount: number;
      }>;
    }>(`${this.basePath}/analyze-coverage`, params);
  }
}

export const scheduleApi = new ScheduleApi();