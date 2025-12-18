/**
 * Service d'approbation pour les feuilles de temps
 */

import { collections } from '../../config/database';
import { ApprovalWorkflowModel, ApprovalWorkflow, ApprovalLevel } from '../../models/approval-workflow.model';
import { ValidationError } from '../../models/base.model';
import { UserService } from '../user/user.service';
import { ApprovalConfigService } from '../config/approval-config.service';

export interface ApprovalRequest {
  timesheetId: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  timesheetData: ApprovalWorkflow['timesheetData'];
  approvers: Omit<ApprovalLevel, 'status' | 'assignedAt' | 'respondedAt'>[];
  autoEscalationDays?: number;
  allowDelegation?: boolean;
  requireComments?: boolean;
}

export interface ApprovalResponse {
  workflowId: string;
  action: 'approve' | 'reject' | 'delegate';
  approverId: string;
  comments?: string;
  reason?: string;
  delegateToId?: string;
}

export class ApprovalService {
  private approvalConfigService: ApprovalConfigService;

  constructor() {
    this.approvalConfigService = new ApprovalConfigService();
  }

  // ==================== Soumission pour approbation ====================

  /**
   * Soumettre une feuille de temps pour approbation
   */
  async submitForApproval(
    tenantId: string,
    request: ApprovalRequest,
    submittedBy: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      // Vérifier qu'il n'y a pas déjà un workflow en cours
      const existingWorkflow = await this.getActiveWorkflowForTimesheet(tenantId, request.timesheetId);
      if (existingWorkflow) {
        throw new ValidationError('Approval workflow already exists for this timesheet');
      }

      // Préparer les approbateurs avec les statuts initiaux
      const approvers: ApprovalLevel[] = request.approvers.map((approver, index) => ({
        ...approver,
        level: index + 1,
        status: index === 0 ? 'pending' : 'pending', // Tous en attente initialement
        assignedAt: index === 0 ? new Date() : new Date() // Le premier est assigné immédiatement
      }));

      // Créer le workflow
      const workflow = new ApprovalWorkflowModel({
        tenantId,
        timesheetId: request.timesheetId,
        employeeId: request.employeeId,
        periodStart: request.periodStart,
        periodEnd: request.periodEnd,
        status: 'pending',
        currentLevel: 1,
        totalLevels: request.approvers.length,
        approvers,
        history: [],
        submittedAt: new Date(),
        submittedBy,
        timesheetData: request.timesheetData,
        autoEscalationDays: request.autoEscalationDays || 3,
        allowDelegation: request.allowDelegation !== undefined ? request.allowDelegation : true,
        requireComments: request.requireComments !== undefined ? request.requireComments : false
      });

      // Ajouter l'action de soumission à l'historique
      workflow.addComment(submittedBy, 'Timesheet submitted for approval');

      await workflow.validate();

      // Sauvegarder en base
      const docRef = await collections.approval_workflows.add(workflow.toFirestore());
      workflow.update({ id: docRef.id });

      return workflow;
    } catch (error) {
      throw new Error(`Failed to submit for approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approuver une feuille de temps
   */
  async approveTimesheet(
    tenantId: string,
    workflowId: string,
    approverId: string,
    comments?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      if (workflow.isCompleted) {
        throw new ValidationError('Workflow is already completed');
      }

      // Vérifier que l'utilisateur peut approuver
      const currentApprover = workflow.getCurrentApprover();
      if (!currentApprover || currentApprover.approverId !== approverId) {
        throw new ValidationError('User is not authorized to approve at this level');
      }

      // Effectuer l'approbation
      workflow.approve(approverId, comments);

      // Sauvegarder les changements
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to approve timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rejeter une feuille de temps
   */
  async rejectTimesheet(
    tenantId: string,
    workflowId: string,
    approverId: string,
    reason: string,
    comments?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      if (workflow.isCompleted) {
        throw new ValidationError('Workflow is already completed');
      }

      // Vérifier que l'utilisateur peut rejeter
      const currentApprover = workflow.getCurrentApprover();
      if (!currentApprover || currentApprover.approverId !== approverId) {
        throw new ValidationError('User is not authorized to reject at this level');
      }

      // Effectuer le rejet
      workflow.reject(approverId, reason, comments);

      // Sauvegarder les changements
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to reject timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
 
  * Déléguer une approbation
   */
  async delegateApproval(
    tenantId: string,
    workflowId: string,
    approverId: string,
    delegateToId: string,
    comments?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      if (workflow.isCompleted) {
        throw new ValidationError('Workflow is already completed');
      }

      if (!workflow.getData().allowDelegation) {
        throw new ValidationError('Delegation is not allowed for this workflow');
      }

      // Vérifier que l'utilisateur peut déléguer
      const currentApprover = workflow.getCurrentApprover();
      if (!currentApprover || currentApprover.approverId !== approverId) {
        throw new ValidationError('User is not authorized to delegate at this level');
      }

      // TODO: Obtenir les informations du délégué depuis le service utilisateur
      const delegateInfo = await this.getUserInfo(tenantId, delegateToId);

      // Effectuer la délégation
      workflow.delegate(approverId, delegateToId, comments);

      // Mettre à jour les informations du délégué
      const updatedApprover = workflow.getCurrentApprover();
      if (updatedApprover) {
        updatedApprover.approverName = delegateInfo.name;
        updatedApprover.approverEmail = delegateInfo.email;
      }

      // Sauvegarder les changements
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to delegate approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des escalations ====================

  /**
   * Escalader une approbation
   */
  async escalateApproval(
    tenantId: string,
    workflowId: string,
    escalatedBy: string,
    escalateToId: string,
    reason?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      if (workflow.isCompleted) {
        throw new ValidationError('Workflow is already completed');
      }

      // TODO: Obtenir les informations de l'escalade depuis le service utilisateur
      const escalateInfo = await this.getUserInfo(tenantId, escalateToId);

      // Effectuer l'escalation
      workflow.escalate(escalatedBy, escalateToId, reason);

      // Mettre à jour les informations de l'escalade
      const updatedApprover = workflow.getCurrentApprover();
      if (updatedApprover) {
        updatedApprover.approverName = escalateInfo.name;
        updatedApprover.approverEmail = escalateInfo.email;
      }

      // Sauvegarder les changements
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to escalate approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traiter les escalations automatiques
   */
  async processAutoEscalations(tenantId: string): Promise<ApprovalWorkflowModel[]> {
    try {
      // Trouver tous les workflows qui nécessitent une escalation
      const overdueWorkflows = await this.getOverdueWorkflows(tenantId);
      const escalatedWorkflows: ApprovalWorkflowModel[] = [];

      for (const workflow of overdueWorkflows) {
        if (workflow.needsEscalation) {
          try {
            // TODO: Déterminer l'escalade selon la hiérarchie organisationnelle
            const escalateToId = await this.getEscalationTarget(tenantId, workflow.getCurrentApprover()?.approverId);

            if (escalateToId) {
              const escalatedWorkflow = await this.escalateApproval(
                tenantId,
                workflow.id!,
                'system',
                escalateToId,
                'Automatic escalation due to timeout'
              );
              escalatedWorkflows.push(escalatedWorkflow);
            }
          } catch (error) {
            console.error(`Failed to auto-escalate workflow ${workflow.id}:`, error);
          }
        }
      }

      return escalatedWorkflows;
    } catch (error) {
      throw new Error(`Failed to process auto escalations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des approbateurs ====================

  /**
   * Obtenir les approbateurs pour un employé
   */
  async getApproversForEmployee(tenantId: string, employeeId: string): Promise<ApprovalLevel[]> {
    try {
      // Essayer d'abord d'obtenir l'approbateur spécifique à l'employé
      const employeeApprover = await this.approvalConfigService.getApproverForEmployee(tenantId, employeeId);

      if (employeeApprover) {
        return [{
          level: 1,
          approverId: employeeApprover.id,
          approverName: employeeApprover.name,
          approverEmail: employeeApprover.email,
          status: 'pending',
          assignedAt: new Date()
        }];
      }

      // Sinon, utiliser l'approbateur par défaut
      const defaultApprover = await this.getDefaultApprover(tenantId);

      if (!defaultApprover) {
        throw new ValidationError('No approver configured for employee');
      }

      return [{
        level: 1,
        approverId: defaultApprover.id,
        approverName: defaultApprover.name,
        approverEmail: defaultApprover.email,
        status: 'pending',
        assignedAt: new Date()
      }];
    } catch (error) {
      throw new Error(`Failed to get approvers for employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Définir les approbateurs pour un employé
   */
  async setApproversForEmployee(
    tenantId: string,
    employeeId: string,
    approverIds: string[],
    setBy: string
  ): Promise<void> {
    try {
      // TODO: Implémenter la sauvegarde des approbateurs dans une collection dédiée
      // Pour l'instant, cette méthode est un placeholder
      console.log(`Setting approvers for employee ${employeeId}:`, approverIds);
    } catch (error) {
      throw new Error(`Failed to set approvers for employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Requêtes et recherches ====================

  /**
   * Obtenir un workflow par ID
   */
  async getWorkflow(tenantId: string, workflowId: string): Promise<ApprovalWorkflowModel | null> {
    try {
      const doc = await collections.approval_workflows.doc(workflowId).get();

      if (!doc.exists) {
        return null;
      }

      const workflow = ApprovalWorkflowModel.fromFirestore(doc);

      // Vérifier que le workflow appartient au bon tenant
      if (workflow && workflow.getData().tenantId !== tenantId) {
        return null;
      }

      return workflow;
    } catch (error) {
      throw new Error(`Failed to get workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le workflow actif pour une feuille de temps
   */
  async getActiveWorkflowForTimesheet(tenantId: string, timesheetId: string): Promise<ApprovalWorkflowModel | null> {
    try {
      const query = await collections.approval_workflows
        .where('tenantId', '==', tenantId)
        .where('timesheetId', '==', timesheetId)
        .where('status', 'in', ['pending', 'in_progress', 'escalated'])
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      return ApprovalWorkflowModel.fromFirestore(query.docs[0]);
    } catch (error) {
      throw new Error(`Failed to get active workflow for timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les workflows en attente pour un approbateur
   */
  async getPendingWorkflowsForApprover(tenantId: string, approverId: string): Promise<ApprovalWorkflowModel[]> {
    try {
      const query = await collections.approval_workflows
        .where('tenantId', '==', tenantId)
        .where('status', 'in', ['pending', 'in_progress', 'escalated'])
        .get();

      const workflows: ApprovalWorkflowModel[] = [];

      for (const doc of query.docs) {
        const workflow = ApprovalWorkflowModel.fromFirestore(doc);
        if (workflow) {
          const currentApprover = workflow.getCurrentApprover();
          if (currentApprover && currentApprover.approverId === approverId) {
            workflows.push(workflow);
          }
        }
      }

      return workflows.sort((a, b) => a.getData().submittedAt.getTime() - b.getData().submittedAt.getTime());
    } catch (error) {
      throw new Error(`Failed to get pending workflows for approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les workflows pour un employé
   */
  async getWorkflowsForEmployee(
    tenantId: string,
    employeeId: string,
    status?: string,
    limit: number = 50
  ): Promise<ApprovalWorkflowModel[]> {
    try {
      let query = collections.approval_workflows
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId);

      if (status) {
        query = query.where('status', '==', status);
      }

      const result = await query
        .orderBy('submittedAt', 'desc')
        .limit(limit)
        .get();

      return result.docs
        .map(doc => ApprovalWorkflowModel.fromFirestore(doc))
        .filter(workflow => workflow !== null) as ApprovalWorkflowModel[];
    } catch (error) {
      throw new Error(`Failed to get workflows for employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les workflows en retard
   */
  async getOverdueWorkflows(tenantId: string): Promise<ApprovalWorkflowModel[]> {
    try {
      const query = await collections.approval_workflows
        .where('tenantId', '==', tenantId)
        .where('status', 'in', ['pending', 'in_progress'])
        .get();

      const workflows: ApprovalWorkflowModel[] = [];

      for (const doc of query.docs) {
        const workflow = ApprovalWorkflowModel.fromFirestore(doc);
        if (workflow && workflow.needsEscalation) {
          workflows.push(workflow);
        }
      }

      return workflows;
    } catch (error) {
      throw new Error(`Failed to get overdue workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Statistiques et rapports ====================

  /**
   * Obtenir les statistiques d'approbation
   */
  async getApprovalStatistics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    escalated: number;
    averageApprovalTime: number;
    approvalRate: number;
    escalationRate: number;
  }> {
    try {
      let query = collections.approval_workflows
        .where('tenantId', '==', tenantId);

      if (startDate) {
        query = query.where('submittedAt', '>=', startDate);
      }

      if (endDate) {
        query = query.where('submittedAt', '<=', endDate);
      }

      const result = await query.get();
      const workflows = result.docs
        .map(doc => ApprovalWorkflowModel.fromFirestore(doc))
        .filter(workflow => workflow !== null) as ApprovalWorkflowModel[];

      const stats = {
        total: workflows.length,
        approved: 0,
        rejected: 0,
        pending: 0,
        escalated: 0,
        averageApprovalTime: 0,
        approvalRate: 0,
        escalationRate: 0
      };

      let totalApprovalTime = 0;
      let completedCount = 0;

      workflows.forEach(workflow => {
        const status = workflow.status;

        switch (status) {
          case 'approved':
            stats.approved++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'escalated':
            stats.escalated++;
            break;
          default:
            stats.pending++;
        }

        if (workflow.isCompleted && workflow.getData().completedAt) {
          const approvalTime = workflow.getData().completedAt!.getTime() - workflow.getData().submittedAt.getTime();
          totalApprovalTime += approvalTime;
          completedCount++;
        }
      });

      if (completedCount > 0) {
        stats.averageApprovalTime = Math.floor(totalApprovalTime / completedCount / (1000 * 60 * 60 * 24)); // en jours
      }

      if (stats.total > 0) {
        stats.approvalRate = Math.round((stats.approved / stats.total) * 100);
        stats.escalationRate = Math.round((stats.escalated / stats.total) * 100);
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to get approval statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires privées ====================

  private async updateWorkflow(workflow: ApprovalWorkflowModel): Promise<void> {
    if (!workflow.id) {
      throw new ValidationError('Workflow ID is required for update');
    }

    await collections.approval_workflows
      .doc(workflow.id)
      .update(workflow.toFirestore());
  }

  private async getUserInfo(tenantId: string, userId: string): Promise<{ name: string; email: string }> {
    try {
      const user = await UserService.getUserById(userId, tenantId);

      if (!user) {
        console.warn(`User not found: ${userId} in tenant ${tenantId}`);
        return {
          name: `User ${userId}`,
          email: `user${userId}@example.com`
        };
      }

      // Construire le nom complet
      let name = user.displayName;
      if (!name && (user.firstName || user.lastName)) {
        name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
      if (!name) {
        name = user.email.split('@')[0];
      }

      return {
        name: name || `User ${userId}`,
        email: user.email
      };
    } catch (error) {
      console.error(`Error getting user info for ${userId}:`, error);
      return {
        name: `User ${userId}`,
        email: `user${userId}@example.com`
      };
    }
  }

  private async getDefaultApprover(tenantId: string): Promise<{ id: string; name: string; email: string } | null> {
    try {
      return await this.approvalConfigService.getDefaultApprover(tenantId);
    } catch (error) {
      console.error(`Error getting default approver for tenant ${tenantId}:`, error);
      return null;
    }
  }

  private async getEscalationTarget(tenantId: string, currentApproverId?: string): Promise<string | null> {
    try {
      return await this.approvalConfigService.getEscalationTarget(tenantId, currentApproverId);
    } catch (error) {
      console.error(`Error getting escalation target for tenant ${tenantId}:`, error);
      return null;
    }
  }

  // ==================== Méthodes d'administration ====================

  /**
   * Annuler un workflow
   */
  async cancelWorkflow(
    tenantId: string,
    workflowId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      if (workflow.isCompleted) {
        throw new ValidationError('Cannot cancel completed workflow');
      }

      workflow.cancel(cancelledBy, reason);
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to cancel workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ajouter un commentaire à un workflow
   */
  async addComment(
    tenantId: string,
    workflowId: string,
    userId: string,
    comment: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      const workflow = await this.getWorkflow(tenantId, workflowId);

      if (!workflow) {
        throw new ValidationError('Workflow not found');
      }

      workflow.addComment(userId, comment);
      await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}