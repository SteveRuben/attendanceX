/**
 * Index des services d'approbation pour les feuilles de temps
 */

export { ApprovalService, type ApprovalRequest, type ApprovalResponse } from './approval.service';
export { 
  ApproverManagementService, 
  type ApproverAssignment, 
  type ApproverHierarchy 
} from './approver-management.service';
export { 
  ApprovalNotificationsService, 
  approvalNotificationsService,
  type NotificationTemplate, 
  type NotificationRecipient, 
  type NotificationContext 
} from './approval-notifications.service';

// Service principal qui combine tous les services d'approbation
import { ApprovalService } from './approval.service';
import { ApproverManagementService } from './approver-management.service';
import { approvalNotificationsService } from './approval-notifications.service';
import { ApprovalWorkflowModel } from '../../models/approval-workflow.model';
import { UserService } from '../user/user.service';

export class ApprovalManager {
  public readonly approval: ApprovalService;
  public readonly approvers: ApproverManagementService;
  public readonly notifications = approvalNotificationsService;

  constructor() {
    // TODO: Mettre à jour les autres services pour utiliser les collections centralisées
    this.approval = new ApprovalService();
    this.approvers = new ApproverManagementService();
  }

  /**
   * Workflow complet de soumission avec notifications
   */
  async submitTimesheetForApproval(
    tenantId: string,
    timesheetId: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    timesheetData: any,
    submittedBy: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      // 1. Obtenir la hiérarchie d'approbation
      const hierarchy = await this.approvers.getApprovalHierarchy(tenantId, employeeId);
      
      if (hierarchy.levels.length === 0) {
        throw new Error('No approvers configured for employee');
      }

      // 2. Préparer les approbateurs
      const approvers = hierarchy.levels.map(level => ({
        level: level.level,
        approverId: level.approverId,
        approverName: level.approverName,
        approverEmail: level.approverEmail
      }));

      // 3. Créer le workflow d'approbation
      const workflow = await this.approval.submitForApproval(tenantId, {
        timesheetId,
        employeeId,
        periodStart,
        periodEnd,
        timesheetData,
        approvers
      }, submittedBy);

      // 4. Envoyer les notifications
      const employeeInfo = await this.getUserInfo(tenantId, employeeId);
      const approverInfo = hierarchy.levels[0] ? {
        userId: hierarchy.levels[0].approverId,
        name: hierarchy.levels[0].approverName,
        email: hierarchy.levels[0].approverEmail,
        role: 'approver' as const
      } : undefined;

      await this.notifications.notifySubmission(tenantId, {
        workflow,
        employee: {
          userId: employeeId,
          name: employeeInfo.name,
          email: employeeInfo.email,
          role: 'employee'
        },
        approver: approverInfo
      });

      return workflow;
    } catch (error) {
      throw new Error(`Failed to submit timesheet for approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Workflow complet d'approbation avec notifications
   */
  async approveTimesheetWithNotifications(
    tenantId: string,
    workflowId: string,
    approverId: string,
    comments?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      // 1. Effectuer l'approbation
      const workflow = await this.approval.approveTimesheet(tenantId, workflowId, approverId, comments);

      // 2. Préparer le contexte de notification
      const employeeInfo = await this.getUserInfo(tenantId, workflow.employeeId);
      const approverInfo = await this.getUserInfo(tenantId, approverId);
      
      let nextApproverInfo;
      if (!workflow.isCompleted) {
        const nextApprover = workflow.getNextApprover();
        if (nextApprover) {
          const nextInfo = await this.getUserInfo(tenantId, nextApprover.approverId);
          nextApproverInfo = {
            userId: nextApprover.approverId,
            name: nextInfo.name,
            email: nextInfo.email,
            role: 'approver' as const
          };
        }
      }

      // 3. Envoyer les notifications
      await this.notifications.notifyApproval(tenantId, {
        workflow,
        employee: {
          userId: workflow.employeeId,
          name: employeeInfo.name,
          email: employeeInfo.email,
          role: 'employee'
        },
        approver: {
          userId: approverId,
          name: approverInfo.name,
          email: approverInfo.email,
          role: 'approver'
        },
        nextApprover: nextApproverInfo
      });

      return workflow;
    } catch (error) {
      throw new Error(`Failed to approve timesheet with notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Workflow complet de rejet avec notifications
   */
  async rejectTimesheetWithNotifications(
    tenantId: string,
    workflowId: string,
    approverId: string,
    reason: string,
    comments?: string
  ): Promise<ApprovalWorkflowModel> {
    try {
      // 1. Effectuer le rejet
      const workflow = await this.approval.rejectTimesheet(tenantId, workflowId, approverId, reason, comments);

      // 2. Préparer le contexte de notification
      const employeeInfo = await this.getUserInfo(tenantId, workflow.employeeId);
      const approverInfo = await this.getUserInfo(tenantId, approverId);

      // 3. Envoyer les notifications
      await this.notifications.notifyRejection(tenantId, {
        workflow,
        employee: {
          userId: workflow.employeeId,
          name: employeeInfo.name,
          email: employeeInfo.email,
          role: 'employee'
        },
        approver: {
          userId: approverId,
          name: approverInfo.name,
          email: approverInfo.email,
          role: 'approver'
        }
      }, reason, comments);

      return workflow;
    } catch (error) {
      throw new Error(`Failed to reject timesheet with notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traitement automatique des escalations avec notifications
   */
  async processAutoEscalations(tenantId: string): Promise<ApprovalWorkflowModel[]> {
    try {
      const escalatedWorkflows = await this.approval.processAutoEscalations(tenantId);

      // Envoyer les notifications d'escalation
      for (const workflow of escalatedWorkflows) {
        const employeeInfo = await this.getUserInfo(tenantId, workflow.employeeId);
        const currentApprover = workflow.getCurrentApprover();
        
        if (currentApprover) {
          const escalatedToInfo = await this.getUserInfo(tenantId, currentApprover.approverId);
          
          await this.notifications.notifyEscalation(tenantId, {
            workflow,
            employee: {
              userId: workflow.employeeId,
              name: employeeInfo.name,
              email: employeeInfo.email,
              role: 'employee'
            }
          }, {
            userId: currentApprover.approverId,
            name: escalatedToInfo.name,
            email: escalatedToInfo.email,
            role: 'approver'
          }, 'Automatic escalation due to timeout');
        }
      }

      return escalatedWorkflows;
    } catch (error) {
      throw new Error(`Failed to process auto escalations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le tableau de bord d'approbation pour un utilisateur
   */
  async getApprovalDashboard(tenantId: string, userId: string): Promise<{
    pendingApprovals: ApprovalWorkflowModel[];
    mySubmissions: ApprovalWorkflowModel[];
    statistics: {
      pendingCount: number;
      approvedThisMonth: number;
      rejectedThisMonth: number;
      averageApprovalTime: number;
    };
  }> {
    try {
      // Obtenir les approbations en attente
      const pendingApprovals = await this.approval.getPendingWorkflowsForApprover(tenantId, userId);

      // Obtenir les soumissions de l'utilisateur
      const mySubmissions = await this.approval.getWorkflowsForEmployee(tenantId, userId, undefined, 10);

      // Calculer les statistiques
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyStats = await this.approval.getApprovalStatistics(tenantId, startOfMonth);

      return {
        pendingApprovals,
        mySubmissions,
        statistics: {
          pendingCount: pendingApprovals.length,
          approvedThisMonth: monthlyStats.approved,
          rejectedThisMonth: monthlyStats.rejected,
          averageApprovalTime: monthlyStats.averageApprovalTime
        }
      };
    } catch (error) {
      throw new Error(`Failed to get approval dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthode utilitaire privée
  private async getUserInfo(tenantId: string, userId: string): Promise<{ name: string; email: string }> {
    try {
      const user = await UserService.getUserById(userId, tenantId);
      
      if (!user) {
        // Fallback si l'utilisateur n'est pas trouvé
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
        name = user.email.split('@')[0]; // Utiliser la partie avant @ de l'email
      }

      return {
        name: name || `User ${userId}`,
        email: user.email
      };
    } catch (error) {
      console.error(`Error getting user info for ${userId}:`, error);
      
      // Fallback en cas d'erreur
      return {
        name: `User ${userId}`,
        email: `user${userId}@example.com`
      };
    }
  }
}