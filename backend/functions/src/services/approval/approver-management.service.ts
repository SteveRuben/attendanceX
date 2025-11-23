/**
 * Service de gestion des approbateurs
 */

import { collections, db } from 'config';
import { ValidationError } from '../../models/base.model';
import { UserService } from '../user/user.service';

// Types pour la gestion des approbateurs
export interface ApproverAssignment {
  id?: string;
  tenantId: string;
  
  // Identification
  employeeId: string;
  approverId: string;
  
  // Hiérarchie
  level: number; // 1 = manager direct, 2 = manager du manager, etc.
  isDefault: boolean; // Approbateur par défaut pour cet employé
  
  // Délégation
  delegateId?: string; // Approbateur délégué temporaire
  delegationStart?: Date;
  delegationEnd?: Date;
  delegationReason?: string;
  
  // Restrictions
  maxApprovalAmount?: number; // Montant maximum approuvable
  allowedProjects?: string[]; // Projets pour lesquels peut approuver
  restrictedProjects?: string[]; // Projets pour lesquels ne peut pas approuver
  
  // Métadonnées
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface ApproverHierarchy {
  employeeId: string;
  levels: {
    level: number;
    approverId: string;
    approverName: string;
    approverEmail: string;
    isActive: boolean;
    isDelegated: boolean;
    delegateId?: string;
    delegateName?: string;
    maxApprovalAmount?: number;
  }[];
}

export class ApproverManagementService {

  constructor() {
  }

  // ==================== Gestion des assignations ====================

  /**
   * Assigner un approbateur à un employé
   */
  async assignApprover(
    tenantId: string,
    employeeId: string,
    approverId: string,
    level: number,
    assignedBy: string,
    options: {
      isDefault?: boolean;
      maxApprovalAmount?: number;
      allowedProjects?: string[];
      restrictedProjects?: string[];
      effectiveFrom?: Date;
    } = {}
  ): Promise<ApproverAssignment> {
    try {
      // Vérifier que l'approbateur n'est pas l'employé lui-même
      if (employeeId === approverId) {
        throw new ValidationError('Employee cannot be their own approver');
      }

      // Désactiver l'ancien approbateur pour ce niveau s'il existe
      await this.deactivateApproverForLevel(tenantId, employeeId, level);

      const assignment: ApproverAssignment = {
        tenantId,
        employeeId,
        approverId,
        level,
        isDefault: options.isDefault || false,
        maxApprovalAmount: options.maxApprovalAmount,
        allowedProjects: options.allowedProjects,
        restrictedProjects: options.restrictedProjects,
        isActive: true,
        effectiveFrom: options.effectiveFrom || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: assignedBy
      };

      const docRef = await collections.approver_assignments.add(assignment);
      
      return {
        ...assignment,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to assign approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir la hiérarchie d'approbation pour un employé
   */
  async getApprovalHierarchy(tenantId: string, employeeId: string): Promise<ApproverHierarchy> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('isActive', '==', true)
        .orderBy('level')
        .get();

      const levels: ApproverHierarchy['levels'] = [];

      for (const doc of query.docs) {
        const assignment = { id: doc.id, ...doc.data() } as ApproverAssignment;
        
        // Vérifier si l'assignation est encore valide
        const now = new Date();
        if (assignment.effectiveTo && assignment.effectiveTo < now) {
          continue;
        }

        // Obtenir les informations de l'approbateur
        const approverInfo = await this.getUserInfo(tenantId, assignment.approverId);
        
        // Vérifier s'il y a une délégation active
        const delegation = await this.getActiveDelegation(tenantId, assignment.approverId);
        
        levels.push({
          level: assignment.level,
          approverId: assignment.approverId,
          approverName: approverInfo.name,
          approverEmail: approverInfo.email,
          isActive: assignment.isActive,
          isDelegated: !!delegation,
          delegateId: delegation?.delegateId,
          delegateName: delegation ? (await this.getUserInfo(tenantId, delegation.delegateId)).name : undefined,
          maxApprovalAmount: assignment.maxApprovalAmount
        });
      }

      return {
        employeeId,
        levels
      };
    } catch (error) {
      throw new Error(`Failed to get approval hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'approbateur effectif pour un niveau donné
   */
  async getEffectiveApprover(
    tenantId: string,
    employeeId: string,
    level: number
  ): Promise<{
    approverId: string;
    approverName: string;
    approverEmail: string;
    isDelegated: boolean;
    originalApproverId?: string;
  } | null> {
    try {
      const hierarchy = await this.getApprovalHierarchy(tenantId, employeeId);
      const levelInfo = hierarchy.levels.find(l => l.level === level);
      
      if (!levelInfo) {
        return null;
      }

      if (levelInfo.isDelegated && levelInfo.delegateId) {
        const delegateInfo = await this.getUserInfo(tenantId, levelInfo.delegateId);
        return {
          approverId: levelInfo.delegateId,
          approverName: delegateInfo.name,
          approverEmail: delegateInfo.email,
          isDelegated: true,
          originalApproverId: levelInfo.approverId
        };
      }

      return {
        approverId: levelInfo.approverId,
        approverName: levelInfo.approverName,
        approverEmail: levelInfo.approverEmail,
        isDelegated: false
      };
    } catch (error) {
      throw new Error(`Failed to get effective approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des délégations ====================

  /**
   * Créer une délégation temporaire
   */
  async createDelegation(
    tenantId: string,
    approverId: string,
    delegateId: string,
    startDate: Date,
    endDate: Date,
    reason: string,
    createdBy: string
  ): Promise<void> {
    try {
      // Vérifier que le délégué n'est pas l'approbateur lui-même
      if (approverId === delegateId) {
        throw new ValidationError('Approver cannot delegate to themselves');
      }

      // Vérifier qu'il n'y a pas déjà une délégation active
      const existingDelegation = await this.getActiveDelegation(tenantId, approverId);
      if (existingDelegation) {
        throw new ValidationError('Active delegation already exists for this approver');
      }

      // Obtenir toutes les assignations de l'approbateur
      const assignments = await this.getAssignmentsForApprover(tenantId, approverId);

      // Créer une délégation pour chaque assignation
      const batch = db.batch();

      for (const assignment of assignments) {
        const delegationRef = collections.approver_assignments.doc();
        
        const delegationAssignment: ApproverAssignment = {
          ...assignment,
          id: undefined,
          approverId: delegateId,
          delegateId: approverId,
          delegationStart: startDate,
          delegationEnd: endDate,
          delegationReason: reason,
          effectiveFrom: startDate,
          effectiveTo: endDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy
        };

        batch.set(delegationRef, delegationAssignment);
      }

      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to create delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Annuler une délégation
   */
  async cancelDelegation(
    tenantId: string,
    approverId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('delegateId', '==', approverId)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      const now = new Date();

      query.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          effectiveTo: now,
          updatedAt: now,
          updatedBy: cancelledBy
        });
      });

      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to cancel delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } 
 /**
   * Obtenir la délégation active pour un approbateur
   */
  async getActiveDelegation(tenantId: string, approverId: string): Promise<{
    delegateId: string;
    delegationStart: Date;
    delegationEnd: Date;
    delegationReason: string;
  } | null> {
    try {
      const now = new Date();
      
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('delegateId', '==', approverId)
        .where('isActive', '==', true)
        .where('delegationStart', '<=', now)
        .where('delegationEnd', '>=', now)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const assignment = query.docs[0].data() as ApproverAssignment;
      
      return {
        delegateId: assignment.approverId,
        delegationStart: assignment.delegationStart!,
        delegationEnd: assignment.delegationEnd!,
        delegationReason: assignment.delegationReason!
      };
    } catch (error) {
      return null;
    }
  }

  // ==================== Gestion des substitutions ====================

  /**
   * Créer une substitution permanente
   */
  async createSubstitution(
    tenantId: string,
    originalApproverId: string,
    substituteId: string,
    reason: string,
    createdBy: string,
    effectiveFrom?: Date
  ): Promise<void> {
    try {
      // Vérifier que le substitut n'est pas l'approbateur original
      if (originalApproverId === substituteId) {
        throw new ValidationError('Approver cannot substitute themselves');
      }

      const effectiveDate = effectiveFrom || new Date();

      // Désactiver toutes les assignations de l'approbateur original
      await this.deactivateApprover(tenantId, originalApproverId, effectiveDate);

      // Obtenir toutes les assignations de l'approbateur original
      const originalAssignments = await this.getAssignmentsForApprover(tenantId, originalApproverId);

      // Créer de nouvelles assignations pour le substitut
      const batch = db.batch();

      for (const assignment of originalAssignments) {
        const substitutionRef = collections.approver_assignments.doc();
        
        const substitutionAssignment: ApproverAssignment = {
          ...assignment,
          id: undefined,
          approverId: substituteId,
          effectiveFrom: effectiveDate,
          effectiveTo: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy
        };

        batch.set(substitutionRef, substitutionAssignment);
      }

      await batch.commit();
    } catch (error) {
      throw new Error(`Failed to create substitution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Requêtes et recherches ====================

  /**
   * Obtenir tous les employés qu'un approbateur peut approuver
   */
  async getEmployeesForApprover(tenantId: string, approverId: string): Promise<{
    employeeId: string;
    level: number;
    maxApprovalAmount?: number;
    allowedProjects?: string[];
    restrictedProjects?: string[];
  }[]> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('approverId', '==', approverId)
        .where('isActive', '==', true)
        .get();

      const employees: any[] = [];
      const now = new Date();

      query.docs.forEach(doc => {
        const assignment = { id: doc.id, ...doc.data() } as ApproverAssignment;
        
        // Vérifier que l'assignation est encore valide
        if (assignment.effectiveTo && assignment.effectiveTo < now) {
          return;
        }

        employees.push({
          employeeId: assignment.employeeId,
          level: assignment.level,
          maxApprovalAmount: assignment.maxApprovalAmount,
          allowedProjects: assignment.allowedProjects,
          restrictedProjects: assignment.restrictedProjects
        });
      });

      return employees;
    } catch (error) {
      throw new Error(`Failed to get employees for approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vérifier si un approbateur peut approuver pour un employé
   */
  async canApproveForEmployee(
    tenantId: string,
    approverId: string,
    employeeId: string,
    level: number,
    projectId?: string,
    amount?: number
  ): Promise<boolean> {
    try {
      const effectiveApprover = await this.getEffectiveApprover(tenantId, employeeId, level);
      
      if (!effectiveApprover || effectiveApprover.approverId !== approverId) {
        return false;
      }

      // Obtenir l'assignation pour vérifier les restrictions
      const assignment = await this.getAssignmentForApprover(tenantId, employeeId, level);
      
      if (!assignment) {
        return false;
      }

      // Vérifier le montant maximum
      if (amount && assignment.maxApprovalAmount && amount > assignment.maxApprovalAmount) {
        return false;
      }

      // Vérifier les restrictions de projet
      if (projectId) {
        if (assignment.restrictedProjects && assignment.restrictedProjects.includes(projectId)) {
          return false;
        }

        if (assignment.allowedProjects && assignment.allowedProjects.length > 0) {
          if (!assignment.allowedProjects.includes(projectId)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir les statistiques d'approbation pour un approbateur
   */
  async getApproverStatistics(
    tenantId: string,
    approverId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalEmployees: number;
    totalDelegations: number;
    averageApprovalTime: number;
    approvalRate: number;
    workload: 'low' | 'medium' | 'high';
  }> {
    try {
      const employees = await this.getEmployeesForApprover(tenantId, approverId);
      
      // TODO: Intégrer avec le service d'approbation pour obtenir les statistiques détaillées
      // Pour l'instant, retourner des statistiques de base
      
      return {
        totalEmployees: employees.length,
        totalDelegations: 0, // À calculer depuis les délégations
        averageApprovalTime: 0, // À calculer depuis l'historique d'approbation
        approvalRate: 0, // À calculer depuis l'historique d'approbation
        workload: employees.length > 10 ? 'high' : employees.length > 5 ? 'medium' : 'low'
      };
    } catch (error) {
      throw new Error(`Failed to get approver statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires privées ====================

  private async deactivateApproverForLevel(
    tenantId: string,
    employeeId: string,
    level: number
  ): Promise<void> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('level', '==', level)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      const now = new Date();

      query.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          effectiveTo: now,
          updatedAt: now
        });
      });

      if (!query.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to deactivate approver for level:', error);
    }
  }

  private async deactivateApprover(
    tenantId: string,
    approverId: string,
    effectiveDate: Date
  ): Promise<void> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('approverId', '==', approverId)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();

      query.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          effectiveTo: effectiveDate,
          updatedAt: new Date()
        });
      });

      if (!query.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Failed to deactivate approver:', error);
    }
  }

  private async getAssignmentsForApprover(
    tenantId: string,
    approverId: string
  ): Promise<ApproverAssignment[]> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('approverId', '==', approverId)
        .where('isActive', '==', true)
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ApproverAssignment));
    } catch (error) {
      return [];
    }
  }

  private async getAssignmentForApprover(
    tenantId: string,
    employeeId: string,
    level: number
  ): Promise<ApproverAssignment | null> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('level', '==', level)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      return {
        id: query.docs[0].id,
        ...query.docs[0].data()
      } as ApproverAssignment;
    } catch (error) {
      return null;
    }
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

  // ==================== Méthodes d'administration ====================

  /**
   * Lister toutes les assignations pour un tenant
   */
  async listAllAssignments(tenantId: string): Promise<ApproverAssignment[]> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .orderBy('employeeId')
        .orderBy('level')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ApproverAssignment));
    } catch (error) {
      throw new Error(`Failed to list all assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer toutes les assignations pour un employé
   */
  async removeAllAssignmentsForEmployee(
    tenantId: string,
    employeeId: string,
    removedBy: string
  ): Promise<void> {
    try {
      const query = await collections.approver_assignments
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      const now = new Date();

      query.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          effectiveTo: now,
          updatedAt: now,
          updatedBy: removedBy
        });
      });

      if (!query.empty) {
        await batch.commit();
      }
    } catch (error) {
      throw new Error(`Failed to remove all assignments for employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider la cohérence de la hiérarchie d'approbation
   */
  async validateApprovalHierarchy(tenantId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const allAssignments = await this.listAllAssignments(tenantId);
      const employeeGroups = new Map<string, ApproverAssignment[]>();

      // Grouper par employé
      allAssignments.forEach(assignment => {
        if (!employeeGroups.has(assignment.employeeId)) {
          employeeGroups.set(assignment.employeeId, []);
        }
        employeeGroups.get(assignment.employeeId)!.push(assignment);
      });

      // Valider chaque hiérarchie d'employé
      employeeGroups.forEach((assignments, employeeId) => {
        const levels = assignments.map(a => a.level).sort((a, b) => a - b);
        
        // Vérifier la continuité des niveaux
        for (let i = 0; i < levels.length - 1; i++) {
          if (levels[i + 1] - levels[i] > 1) {
            warnings.push(`Employee ${employeeId}: Gap in approval levels between ${levels[i]} and ${levels[i + 1]}`);
          }
        }

        // Vérifier les doublons de niveau
        const levelCounts = new Map<number, number>();
        levels.forEach(level => {
          levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
        });

        levelCounts.forEach((count, level) => {
          if (count > 1) {
            errors.push(`Employee ${employeeId}: Multiple approvers assigned to level ${level}`);
          }
        });

        // Vérifier les références circulaires
        assignments.forEach(assignment => {
          if (assignment.employeeId === assignment.approverId) {
            errors.push(`Employee ${employeeId}: Cannot be their own approver`);
          }
        });
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }
}