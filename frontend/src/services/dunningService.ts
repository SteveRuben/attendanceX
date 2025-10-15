/**
 * Service de gestion des relances côté frontend
 * Gère les processus de recouvrement et les communications avec l'API
 */

import { apiService } from './api';

// Types pour la gestion des relances
export interface DunningProcess {
  id: string;
  tenantId: string;
  invoiceId: string;
  status: DunningStatus;
  currentStep: number;
  totalSteps: number;
  startedAt: Date;
  lastActionAt: Date;
  nextActionAt?: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export enum DunningStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface DunningStep {
  id: string;
  processId: string;
  stepNumber: number;
  type: DunningActionType;
  scheduledAt: Date;
  executedAt?: Date;
  status: DunningStepStatus;
  config: DunningStepConfig;
  result?: DunningStepResult;
}

export enum DunningActionType {
  EMAIL_REMINDER = 'email_reminder',
  SMS_REMINDER = 'sms_reminder',
  PHONE_CALL = 'phone_call',
  FINAL_NOTICE = 'final_notice',
  SUSPEND_SERVICE = 'suspend_service',
  COLLECTION_AGENCY = 'collection_agency',
  WRITE_OFF = 'write_off'
}

export enum DunningStepStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface DunningStepConfig {
  delayDays: number;
  template?: string;
  escalationLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresManualApproval?: boolean;
  metadata?: Record<string, any>;
}

export interface DunningStepResult {
  success: boolean;
  message: string;
  executedAt: Date;
  nextRetryAt?: Date;
  metadata?: Record<string, any>;
}

export interface DunningTemplate {
  id: string;
  name: string;
  description: string;
  steps: DunningTemplateStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DunningTemplateStep {
  stepNumber: number;
  type: DunningActionType;
  delayDays: number;
  escalationLevel: 'low' | 'medium' | 'high' | 'critical';
  template?: string;
  requiresManualApproval?: boolean;
  description?: string;
}

export interface DunningStats {
  period: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  stats: {
    totalProcesses: number;
    activeProcesses: number;
    completedProcesses: number;
    cancelledProcesses: number;
    failedProcesses: number;
    pausedProcesses: number;
    totalAmount: number;
    recoveredAmount: number;
    writtenOffAmount: number;
    recoveryRate: number;
    writeOffRate: number;
  };
}

export interface CreateDunningProcessRequest {
  invoiceId: string;
  templateId?: string;
  customSteps?: DunningTemplateStep[];
}

export interface DunningProcessDetails {
  process: DunningProcess;
  steps: DunningStep[];
  invoice: any; // Type de facture
}

class DunningService {
  private baseUrl = '/api/dunning';

  /**
   * Obtenir tous les processus de relance
   */
  async getDunningProcesses(
    status?: DunningStatus | 'all',
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    processes: DunningProcess[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const response = await apiService.get(`${this.baseUrl}/processes`, { status, limit, offset });

    return {
      ...response.data,
      processes: response.data.processes.map((process: any) => ({
        ...process,
        startedAt: new Date(process.startedAt),
        lastActionAt: new Date(process.lastActionAt),
        nextActionAt: process.nextActionAt ? new Date(process.nextActionAt) : undefined,
        completedAt: process.completedAt ? new Date(process.completedAt) : undefined
      }))
    };
  }

  /**
   * Obtenir un processus de relance spécifique
   */
  async getDunningProcess(processId: string): Promise<DunningProcessDetails> {
    const response = await apiService.get(`${this.baseUrl}/processes/${processId}`);

    return {
      ...response.data,
      process: {
        ...response.data.process,
        startedAt: new Date(response.data.process.startedAt),
        lastActionAt: new Date(response.data.process.lastActionAt),
        nextActionAt: response.data.process.nextActionAt
          ? new Date(response.data.process.nextActionAt)
          : undefined,
        completedAt: response.data.process.completedAt
          ? new Date(response.data.process.completedAt)
          : undefined
      },
      steps: response.data.steps.map((step: any) => ({
        ...step,
        scheduledAt: new Date(step.scheduledAt),
        executedAt: step.executedAt ? new Date(step.executedAt) : undefined,
        result: step.result ? {
          ...step.result,
          executedAt: new Date(step.result.executedAt),
          nextRetryAt: step.result.nextRetryAt ? new Date(step.result.nextRetryAt) : undefined
        } : undefined
      }))
    };
  }

  /**
   * Créer un nouveau processus de relance
   */
  async createDunningProcess(request: CreateDunningProcessRequest): Promise<DunningProcess> {
    const response = await apiService.post(`${this.baseUrl}/processes`, request);

    return {
      ...response.data,
      startedAt: new Date(response.data.startedAt),
      lastActionAt: new Date(response.data.lastActionAt),
      nextActionAt: response.data.nextActionAt ? new Date(response.data.nextActionAt) : undefined,
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined
    };
  }

  /**
   * Exécuter la prochaine étape d'un processus
   */
  async executeNextStep(processId: string): Promise<DunningStepResult> {
    const response = await apiService.post(`${this.baseUrl}/processes/${processId}/execute`);

    return {
      ...response.data,
      executedAt: new Date(response.data.executedAt),
      nextRetryAt: response.data.nextRetryAt ? new Date(response.data.nextRetryAt) : undefined
    };
  }

  /**
   * Suspendre un processus de relance
   */
  async pauseDunningProcess(processId: string, reason?: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/processes/${processId}/pause`, { reason });
  }

  /**
   * Reprendre un processus de relance
   */
  async resumeDunningProcess(processId: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/processes/${processId}/resume`);
  }

  /**
   * Annuler un processus de relance
   */
  async cancelDunningProcess(processId: string, reason?: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/processes/${processId}/cancel`, { reason });
  }

  /**
   * Obtenir les templates de relance disponibles
   */
  async getDunningTemplates(): Promise<DunningTemplate[]> {
    const response = await apiService.get(`${this.baseUrl}/templates`);

    return response.data.templates.map((template: any) => ({
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt)
    }));
  }

  /**
   * Obtenir les statistiques de relance
   */
  async getDunningStats(periodDays: number = 30): Promise<DunningStats> {
    const response = await apiService.get(`${this.baseUrl}/stats`, { period: periodDays });

    return {
      ...response.data,
      period: {
        ...response.data.period,
        startDate: new Date(response.data.period.startDate),
        endDate: new Date(response.data.period.endDate)
      }
    };
  }

  /**
   * Obtenir le libellé d'un type d'action
   */
  getActionTypeLabel(type: DunningActionType): string {
    const labels = {
      [DunningActionType.EMAIL_REMINDER]: 'Rappel par email',
      [DunningActionType.SMS_REMINDER]: 'Rappel par SMS',
      [DunningActionType.PHONE_CALL]: 'Appel téléphonique',
      [DunningActionType.FINAL_NOTICE]: 'Mise en demeure',
      [DunningActionType.SUSPEND_SERVICE]: 'Suspension du service',
      [DunningActionType.COLLECTION_AGENCY]: 'Agence de recouvrement',
      [DunningActionType.WRITE_OFF]: 'Passage en perte'
    };

    return labels[type] || type;
  }

  /**
   * Obtenir le libellé d'un statut de processus
   */
  getStatusLabel(status: DunningStatus): string {
    const labels = {
      [DunningStatus.ACTIVE]: 'Actif',
      [DunningStatus.PAUSED]: 'Suspendu',
      [DunningStatus.COMPLETED]: 'Terminé',
      [DunningStatus.CANCELLED]: 'Annulé',
      [DunningStatus.FAILED]: 'Échoué'
    };

    return labels[status] || status;
  }

  /**
   * Obtenir le libellé d'un statut d'étape
   */
  getStepStatusLabel(status: DunningStepStatus): string {
    const labels = {
      [DunningStepStatus.PENDING]: 'En attente',
      [DunningStepStatus.EXECUTING]: 'En cours',
      [DunningStepStatus.COMPLETED]: 'Terminé',
      [DunningStepStatus.FAILED]: 'Échoué',
      [DunningStepStatus.SKIPPED]: 'Ignoré'
    };

    return labels[status] || status;
  }

  /**
   * Obtenir la couleur d'un niveau d'escalade
   */
  getEscalationColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };

    return colors[level] || 'text-gray-600';
  }

  /**
   * Obtenir la couleur d'un statut de processus
   */
  getStatusColor(status: DunningStatus): string {
    const colors = {
      [DunningStatus.ACTIVE]: 'text-blue-600',
      [DunningStatus.PAUSED]: 'text-yellow-600',
      [DunningStatus.COMPLETED]: 'text-green-600',
      [DunningStatus.CANCELLED]: 'text-gray-600',
      [DunningStatus.FAILED]: 'text-red-600'
    };

    return colors[status] || 'text-gray-600';
  }

  /**
   * Calculer le pourcentage de progression d'un processus
   */
  getProcessProgress(process: DunningProcess): number {
    if (process.totalSteps === 0) return 0;
    return Math.round((process.currentStep / process.totalSteps) * 100);
  }

  /**
   * Vérifier si un processus nécessite une attention
   */
  requiresAttention(process: DunningProcess): boolean {
    return process.status === DunningStatus.FAILED ||
      (process.status === DunningStatus.ACTIVE &&
        process.nextActionAt !== undefined &&
        new Date(process.nextActionAt) < new Date());
  }
}

// Instance singleton
export const dunningService = new DunningService();
export default dunningService;