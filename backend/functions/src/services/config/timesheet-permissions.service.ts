/**
 * Service de gestion des permissions pour les feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { ValidationError } from '../../models/base.model';

// Types pour les permissions
export interface TimesheetPermission {
  id?: string;
  tenantId: string;
  
  // Identification
  userId: string;
  roleId?: string; // Référence au système de rôles existant
  
  // Permissions spécifiques aux feuilles de temps
  permissions: {
    // Gestion des entrées de temps
    canCreateTimeEntry: boolean;
    canEditOwnTimeEntry: boolean;
    canEditOthersTimeEntry: boolean;
    canDeleteOwnTimeEntry: boolean;
    canDeleteOthersTimeEntry: boolean;
    
    // Gestion des feuilles de temps
    canViewOwnTimesheet: boolean;
    canViewOthersTimesheet: boolean;
    canSubmitTimesheet: boolean;
    canEditSubmittedTimesheet: boolean;
    canReopenTimesheet: boolean;
    
    // Approbation
    canApproveTimesheet: boolean;
    canRejectTimesheet: boolean;
    canDelegateApproval: boolean;
    canViewApprovalHistory: boolean;
    
    // Projets et activités
    canViewAllProjects: boolean;
    canManageProjects: boolean;
    canAssignProjectsToUsers: boolean;
    canViewProjectBudgets: boolean;
    canManageActivityCodes: boolean;
    
    // Rapports et analytics
    canViewReports: boolean;
    canViewDetailedReports: boolean;
    canExportData: boolean;
    canViewCostInformation: boolean;
    
    // Administration
    canManageSettings: boolean;
    canManageRates: boolean;
    canManageUsers: boolean;
    canViewAuditLogs: boolean;
    canManageIntegrations: boolean;
  };
  
  // Restrictions spécifiques
  restrictions: {
    // Restrictions temporelles
    maxDailyHours?: number;
    maxWeeklyHours?: number;
    canWorkWeekends?: boolean;
    canEnterFutureTime?: boolean;
    maxFutureDays?: number;
    
    // Restrictions de projets
    allowedProjectIds?: string[]; // Si null, accès à tous les projets
    restrictedProjectIds?: string[]; // Projets explicitement interdits
    
    // Restrictions d'activités
    allowedActivityCodeIds?: string[];
    restrictedActivityCodeIds?: string[];
    
    // Restrictions d'approbation
    canApproveForUserIds?: string[]; // Utilisateurs pour lesquels peut approuver
    canApproveForRoleIds?: string[]; // Rôles pour lesquels peut approuver
    maxApprovalAmount?: number; // Montant maximum approuvable
    
    // Restrictions de données
    canViewDataFromDate?: Date; // Date à partir de laquelle peut voir les données
    canEditDataUntilDays?: number; // Nombre de jours après lesquels ne peut plus éditer
  };
  
  // Métadonnées
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

// Permissions par défaut selon les rôles
export const DEFAULT_ROLE_PERMISSIONS = {
  employee: {
    canCreateTimeEntry: true,
    canEditOwnTimeEntry: true,
    canEditOthersTimeEntry: false,
    canDeleteOwnTimeEntry: true,
    canDeleteOthersTimeEntry: false,
    canViewOwnTimesheet: true,
    canViewOthersTimesheet: false,
    canSubmitTimesheet: true,
    canEditSubmittedTimesheet: false,
    canReopenTimesheet: false,
    canApproveTimesheet: false,
    canRejectTimesheet: false,
    canDelegateApproval: false,
    canViewApprovalHistory: false,
    canViewAllProjects: false,
    canManageProjects: false,
    canAssignProjectsToUsers: false,
    canViewProjectBudgets: false,
    canManageActivityCodes: false,
    canViewReports: false,
    canViewDetailedReports: false,
    canExportData: false,
    canViewCostInformation: false,
    canManageSettings: false,
    canManageRates: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageIntegrations: false
  },
  manager: {
    canCreateTimeEntry: true,
    canEditOwnTimeEntry: true,
    canEditOthersTimeEntry: true,
    canDeleteOwnTimeEntry: true,
    canDeleteOthersTimeEntry: true,
    canViewOwnTimesheet: true,
    canViewOthersTimesheet: true,
    canSubmitTimesheet: true,
    canEditSubmittedTimesheet: true,
    canReopenTimesheet: true,
    canApproveTimesheet: true,
    canRejectTimesheet: true,
    canDelegateApproval: true,
    canViewApprovalHistory: true,
    canViewAllProjects: true,
    canManageProjects: false,
    canAssignProjectsToUsers: true,
    canViewProjectBudgets: true,
    canManageActivityCodes: false,
    canViewReports: true,
    canViewDetailedReports: true,
    canExportData: true,
    canViewCostInformation: true,
    canManageSettings: false,
    canManageRates: false,
    canManageUsers: false,
    canViewAuditLogs: false,
    canManageIntegrations: false
  },
  admin: {
    canCreateTimeEntry: true,
    canEditOwnTimeEntry: true,
    canEditOthersTimeEntry: true,
    canDeleteOwnTimeEntry: true,
    canDeleteOthersTimeEntry: true,
    canViewOwnTimesheet: true,
    canViewOthersTimesheet: true,
    canSubmitTimesheet: true,
    canEditSubmittedTimesheet: true,
    canReopenTimesheet: true,
    canApproveTimesheet: true,
    canRejectTimesheet: true,
    canDelegateApproval: true,
    canViewApprovalHistory: true,
    canViewAllProjects: true,
    canManageProjects: true,
    canAssignProjectsToUsers: true,
    canViewProjectBudgets: true,
    canManageActivityCodes: true,
    canViewReports: true,
    canViewDetailedReports: true,
    canExportData: true,
    canViewCostInformation: true,
    canManageSettings: true,
    canManageRates: true,
    canManageUsers: true,
    canViewAuditLogs: true,
    canManageIntegrations: true
  }
};

export class TimesheetPermissionsService {
  private db: firestore.Firestore;
  private permissionsCollection: string = 'timesheet_permissions';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Gestion des permissions ====================

  /**
   * Créer ou mettre à jour les permissions d'un utilisateur
   */
  async setUserPermissions(
    tenantId: string,
    userId: string,
    permissions: Partial<TimesheetPermission['permissions']>,
    restrictions: Partial<TimesheetPermission['restrictions']> = {},
    createdBy: string,
    roleId?: string
  ): Promise<TimesheetPermission> {
    try {
      // Désactiver les anciennes permissions
      await this.deactivateUserPermissions(tenantId, userId);

      // Obtenir les permissions par défaut selon le rôle
      const defaultPermissions = roleId ? this.getDefaultPermissionsForRole(roleId) : DEFAULT_ROLE_PERMISSIONS.employee;

      const permissionData: TimesheetPermission = {
        tenantId,
        userId,
        roleId,
        permissions: {
          ...defaultPermissions,
          ...permissions
        },
        restrictions,
        isActive: true,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.db.collection(this.permissionsCollection).add(permissionData);
      
      return {
        ...permissionData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to set user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les permissions actuelles d'un utilisateur
   */
  async getUserPermissions(tenantId: string, userId: string): Promise<TimesheetPermission | null> {
    try {
      const query = await this.db.collection(this.permissionsCollection)
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        // Créer des permissions par défaut basées sur le rôle de l'utilisateur
        return this.createDefaultUserPermissions(tenantId, userId);
      }

      const doc = query.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as TimesheetPermission;
    } catch (error) {
      throw new Error(`Failed to get user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Vérification des permissions ====================

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  async hasPermission(
    tenantId: string,
    userId: string,
    permission: keyof TimesheetPermission['permissions']
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(tenantId, userId);
      return userPermissions?.permissions[permission] || false;
    } catch (error) {
      return false; // Par sécurité, refuser l'accès en cas d'erreur
    }
  }

  /**
   * Vérifier si un utilisateur peut accéder à un projet
   */
  async canAccessProject(tenantId: string, userId: string, projectId: string): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(tenantId, userId);
      
      if (!userPermissions) {
        return false;
      }

      // Si l'utilisateur peut voir tous les projets
      if (userPermissions.permissions.canViewAllProjects) {
        return true;
      }

      // Vérifier les restrictions spécifiques
      const restrictions = userPermissions.restrictions;

      // Si des projets spécifiques sont autorisés
      if (restrictions.allowedProjectIds && restrictions.allowedProjectIds.length > 0) {
        return restrictions.allowedProjectIds.includes(projectId);
      }

      // Si des projets spécifiques sont interdits
      if (restrictions.restrictedProjectIds && restrictions.restrictedProjectIds.length > 0) {
        return !restrictions.restrictedProjectIds.includes(projectId);
      }

      // Par défaut, autoriser l'accès si aucune restriction spécifique
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérifier si un utilisateur peut approuver pour un autre utilisateur
   */
  async canApproveForUser(
    tenantId: string,
    approverId: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      const approverPermissions = await this.getUserPermissions(tenantId, approverId);
      
      if (!approverPermissions || !approverPermissions.permissions.canApproveTimesheet) {
        return false;
      }

      // Vérifier les restrictions d'approbation
      const restrictions = approverPermissions.restrictions;

      if (restrictions.canApproveForUserIds && restrictions.canApproveForUserIds.length > 0) {
        return restrictions.canApproveForUserIds.includes(targetUserId);
      }

      // TODO: Vérifier les restrictions par rôle
      // if (restrictions.canApproveForRoleIds) { ... }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérifier si un utilisateur peut éditer une entrée de temps
   */
  async canEditTimeEntry(
    tenantId: string,
    userId: string,
    entryOwnerId: string,
    entryDate: Date,
    isSubmitted: boolean = false
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(tenantId, userId);
      
      if (!userPermissions) {
        return false;
      }

      // Si c'est sa propre entrée
      if (userId === entryOwnerId) {
        if (isSubmitted && !userPermissions.permissions.canEditSubmittedTimesheet) {
          return false;
        }
        
        // Vérifier les restrictions temporelles
        if (userPermissions.restrictions.canEditDataUntilDays !== undefined) {
          const daysSinceEntry = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceEntry > userPermissions.restrictions.canEditDataUntilDays) {
            return false;
          }
        }
        
        return userPermissions.permissions.canEditOwnTimeEntry;
      }

      // Si c'est l'entrée d'un autre utilisateur
      return userPermissions.permissions.canEditOthersTimeEntry;
    } catch (error) {
      return false;
    }
  }

  // ==================== Gestion des rôles ====================

  /**
   * Créer des permissions par défaut pour un rôle
   */
  async createRolePermissions(
    tenantId: string,
    roleId: string,
    roleName: string,
    permissions: Partial<TimesheetPermission['permissions']>,
    createdBy: string
  ): Promise<void> {
    try {
      // Obtenir tous les utilisateurs avec ce rôle
      // TODO: Intégrer avec le système de rôles existant
      const usersWithRole = await this.getUsersWithRole(tenantId, roleId);

      // Créer les permissions pour chaque utilisateur
      for (const userId of usersWithRole) {
        await this.setUserPermissions(tenantId, userId, permissions, {}, createdBy, roleId);
      }
    } catch (error) {
      throw new Error(`Failed to create role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les permissions par défaut pour un rôle
   */
  private getDefaultPermissionsForRole(roleId: string): TimesheetPermission['permissions'] {
    // Mapper les rôles aux permissions par défaut
    const roleMapping: Record<string, keyof typeof DEFAULT_ROLE_PERMISSIONS> = {
      'employee': 'employee',
      'manager': 'manager',
      'admin': 'admin',
      'supervisor': 'manager',
      'hr': 'admin'
    };

    const mappedRole = roleMapping[roleId.toLowerCase()] || 'employee';
    return DEFAULT_ROLE_PERMISSIONS[mappedRole];
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Désactiver les permissions actuelles d'un utilisateur
   */
  private async deactivateUserPermissions(tenantId: string, userId: string): Promise<void> {
    try {
      const query = await this.db.collection(this.permissionsCollection)
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const batch = this.db.batch();
      query.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          effectiveTo: new Date(),
          updatedAt: new Date()
        });
      });

      if (!query.empty) {
        await batch.commit();
      }
    } catch (error) {
      // Log l'erreur mais ne pas faire échouer l'opération principale
      console.error('Failed to deactivate user permissions:', error);
    }
  }

  /**
   * Créer des permissions par défaut pour un utilisateur
   */
  private async createDefaultUserPermissions(tenantId: string, userId: string): Promise<TimesheetPermission> {
    try {
      // TODO: Obtenir le rôle de l'utilisateur depuis le système existant
      const userRole = await this.getUserRole(tenantId, userId);
      
      return this.setUserPermissions(
        tenantId,
        userId,
        this.getDefaultPermissionsForRole(userRole || 'employee'),
        {},
        'system',
        userRole
      );
    } catch (error) {
      throw new Error(`Failed to create default user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le rôle d'un utilisateur (à intégrer avec le système existant)
   */
  private async getUserRole(tenantId: string, userId: string): Promise<string | null> {
    try {
      // TODO: Intégrer avec le système de rôles existant
      // Pour l'instant, retourner un rôle par défaut
      return 'employee';
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtenir les utilisateurs avec un rôle spécifique
   */
  private async getUsersWithRole(tenantId: string, roleId: string): Promise<string[]> {
    try {
      // TODO: Intégrer avec le système de rôles existant
      // Pour l'instant, retourner une liste vide
      return [];
    } catch (error) {
      return [];
    }
  }

  // ==================== Méthodes d'administration ====================

  /**
   * Lister toutes les permissions actives pour un tenant
   */
  async listTenantPermissions(tenantId: string): Promise<TimesheetPermission[]> {
    try {
      const query = await this.db.collection(this.permissionsCollection)
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .orderBy('userId')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TimesheetPermission));
    } catch (error) {
      throw new Error(`Failed to list tenant permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un résumé des permissions par rôle
   */
  async getPermissionsSummaryByRole(tenantId: string): Promise<Record<string, {
    userCount: number;
    commonPermissions: string[];
    restrictedUsers: number;
  }>> {
    try {
      const allPermissions = await this.listTenantPermissions(tenantId);
      const summary: Record<string, any> = {};

      allPermissions.forEach(permission => {
        const role = permission.roleId || 'unknown';
        
        if (!summary[role]) {
          summary[role] = {
            userCount: 0,
            permissions: [],
            restrictedUsers: 0
          };
        }

        summary[role].userCount++;
        
        if (Object.keys(permission.restrictions).length > 0) {
          summary[role].restrictedUsers++;
        }

        // Collecter les permissions actives
        Object.entries(permission.permissions).forEach(([key, value]) => {
          if (value) {
            summary[role].permissions.push(key);
          }
        });
      });

      // Calculer les permissions communes par rôle
      Object.keys(summary).forEach(role => {
        const permissionCounts: Record<string, number> = {};
        summary[role].permissions.forEach((perm: string) => {
          permissionCounts[perm] = (permissionCounts[perm] || 0) + 1;
        });

        // Permissions communes = présentes chez au moins 80% des utilisateurs du rôle
        const threshold = Math.ceil(summary[role].userCount * 0.8);
        summary[role].commonPermissions = Object.entries(permissionCounts)
          .filter(([, count]) => count >= threshold)
          .map(([perm]) => perm);

        delete summary[role].permissions; // Nettoyer les données temporaires
      });

      return summary;
    } catch (error) {
      throw new Error(`Failed to get permissions summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Auditer les permissions d'un utilisateur
   */
  async auditUserPermissions(tenantId: string, userId: string): Promise<{
    currentPermissions: TimesheetPermission | null;
    permissionHistory: TimesheetPermission[];
    securityFlags: string[];
    recommendations: string[];
  }> {
    try {
      const currentPermissions = await this.getUserPermissions(tenantId, userId);
      
      // Obtenir l'historique
      const historyQuery = await this.db.collection(this.permissionsCollection)
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .orderBy('effectiveFrom', 'desc')
        .get();

      const permissionHistory = historyQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TimesheetPermission));

      // Analyser les drapeaux de sécurité
      const securityFlags: string[] = [];
      const recommendations: string[] = [];

      if (currentPermissions) {
        // Vérifier les permissions élevées
        if (currentPermissions.permissions.canManageSettings && 
            currentPermissions.permissions.canManageRates &&
            currentPermissions.permissions.canManageUsers) {
          securityFlags.push('User has full administrative permissions');
        }

        // Vérifier les permissions d'édition étendues
        if (currentPermissions.permissions.canEditOthersTimeEntry &&
            currentPermissions.permissions.canDeleteOthersTimeEntry) {
          securityFlags.push('User can modify other users\' time entries');
        }

        // Vérifier l'absence de restrictions
        if (Object.keys(currentPermissions.restrictions).length === 0) {
          recommendations.push('Consider adding time or project restrictions');
        }

        // Vérifier les permissions de coût
        if (currentPermissions.permissions.canViewCostInformation &&
            !currentPermissions.permissions.canViewDetailedReports) {
          recommendations.push('User can view costs but not detailed reports - consider alignment');
        }
      }

      return {
        currentPermissions,
        permissionHistory,
        securityFlags,
        recommendations
      };
    } catch (error) {
      throw new Error(`Failed to audit user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cloner les permissions d'un utilisateur vers un autre
   */
  async cloneUserPermissions(
    tenantId: string,
    sourceUserId: string,
    targetUserId: string,
    clonedBy: string
  ): Promise<TimesheetPermission> {
    try {
      const sourcePermissions = await this.getUserPermissions(tenantId, sourceUserId);
      
      if (!sourcePermissions) {
        throw new ValidationError('Source user permissions not found');
      }

      return this.setUserPermissions(
        tenantId,
        targetUserId,
        sourcePermissions.permissions,
        sourcePermissions.restrictions,
        clonedBy,
        sourcePermissions.roleId
      );
    } catch (error) {
      throw new Error(`Failed to clone user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}