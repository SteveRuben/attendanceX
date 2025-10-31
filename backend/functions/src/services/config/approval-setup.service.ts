/**
 * Service utilitaire pour la configuration initiale des approbateurs
 */

import { ApprovalConfigService } from './approval-config.service';
import { UserService } from '../user/user.service';
import { ValidationError } from '../../models/base.model';

export interface ApprovalSetupOptions {
  // Approbateur par défaut
  defaultApprover: {
    userId: string;
    name?: string;
    email?: string;
  };
  
  // Approbateur secondaire (optionnel)
  secondaryApprover?: {
    userId: string;
    name?: string;
    email?: string;
  };
  
  // Configuration d'escalation
  escalation?: {
    enabled: boolean;
    escalateToUserId?: string;
    escalationDays?: number;
  };
  
  // Import de hiérarchie (optionnel)
  organizationalHierarchy?: {
    [employeeId: string]: {
      managerId: string;
      departmentId?: string;
      departmentName?: string;
    };
  };
}

export class ApprovalSetupService {
  private approvalConfigService: ApprovalConfigService;

  constructor() {
    this.approvalConfigService = new ApprovalConfigService();
  }

  /**
   * Configuration complète des approbateurs pour un tenant
   */
  async setupApprovalConfiguration(
    tenantId: string,
    options: ApprovalSetupOptions,
    setupBy: string
  ): Promise<{
    success: boolean;
    configuration: any;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Valider et enrichir les informations des approbateurs
      const primaryApprover = await this.validateAndEnrichUser(
        tenantId,
        options.defaultApprover,
        'Primary approver'
      );

      // Valider l'approbateur secondaire si fourni
      if (options.secondaryApprover) {
        try {
          await this.validateAndEnrichUser(
            tenantId,
            options.secondaryApprover,
            'Secondary approver'
          );
          // TODO: Implémenter la configuration de l'approbateur secondaire
          warnings.push('Secondary approver validation successful but configuration not yet implemented');
        } catch (error) {
          warnings.push(`Secondary approver validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 2. Configurer l'approbateur par défaut
      await this.approvalConfigService.setDefaultApprover(
        tenantId,
        {
          userId: primaryApprover.id,
          name: primaryApprover.name,
          email: primaryApprover.email
        },
        setupBy
      );

      // 3. Configurer les règles d'escalation si spécifiées
      if (options.escalation) {
        let escalateToUser = null;
        if (options.escalation.escalateToUserId) {
          try {
            escalateToUser = await this.validateAndEnrichUser(
              tenantId,
              { userId: options.escalation.escalateToUserId },
              'Escalation target'
            );
          } catch (error) {
            warnings.push(`Escalation target validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        await this.approvalConfigService.setEscalationRules(
          tenantId,
          {
            enabled: options.escalation.enabled,
            escalateToUserId: escalateToUser?.id,
            escalateToName: escalateToUser?.name,
            escalateToEmail: escalateToUser?.email,
            escalationDays: options.escalation.escalationDays || 3
          },
          setupBy
        );
      }

      // 4. Importer la hiérarchie organisationnelle si fournie
      if (options.organizationalHierarchy) {
        const enrichedHierarchy = await this.enrichOrganizationalHierarchy(
          tenantId,
          options.organizationalHierarchy
        );

        await this.approvalConfigService.importOrganizationalHierarchy(
          tenantId,
          enrichedHierarchy,
          setupBy
        );
      }

      // 5. Récupérer la configuration finale
      const finalConfiguration = await this.approvalConfigService.getApprovalConfiguration(tenantId);

      return {
        success: true,
        configuration: finalConfiguration,
        warnings,
        errors
      };

    } catch (error) {
      errors.push(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        configuration: null,
        warnings,
        errors
      };
    }
  }

  /**
   * Configuration rapide avec un seul approbateur par défaut
   */
  async quickSetupDefaultApprover(
    tenantId: string,
    approverId: string,
    setupBy: string
  ): Promise<{
    success: boolean;
    approver: any;
    error?: string;
  }> {
    try {
      // Valider et enrichir l'utilisateur
      const approver = await this.validateAndEnrichUser(
        tenantId,
        { userId: approverId },
        'Default approver'
      );

      // Configurer comme approbateur par défaut
      await this.approvalConfigService.setDefaultApprover(
        tenantId,
        {
          userId: approver.id,
          name: approver.name,
          email: approver.email
        },
        setupBy
      );

      return {
        success: true,
        approver
      };

    } catch (error) {
      return {
        success: false,
        approver: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Ajouter un employé à la hiérarchie organisationnelle
   */
  async addEmployeeToHierarchy(
    tenantId: string,
    employeeId: string,
    managerId: string,
    departmentInfo: {
      departmentId?: string;
      departmentName?: string;
    },
    updatedBy: string
  ): Promise<{
    success: boolean;
    employee: any;
    manager: any;
    error?: string;
  }> {
    try {
      // Valider l'employé et le manager
      const [employee, manager] = await Promise.all([
        this.validateAndEnrichUser(tenantId, { userId: employeeId }, 'Employee'),
        this.validateAndEnrichUser(tenantId, { userId: managerId }, 'Manager')
      ]);

      // Ajouter à la hiérarchie
      await this.approvalConfigService.setEmployeeManager(
        tenantId,
        employeeId,
        {
          managerId: manager.id,
          managerName: manager.name,
          managerEmail: manager.email,
          departmentId: departmentInfo.departmentId,
          departmentName: departmentInfo.departmentName
        },
        updatedBy
      );

      return {
        success: true,
        employee,
        manager
      };

    } catch (error) {
      return {
        success: false,
        employee: null,
        manager: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Obtenir un résumé de la configuration actuelle
   */
  async getConfigurationSummary(tenantId: string): Promise<{
    hasDefaultApprover: boolean;
    hasEscalationRules: boolean;
    hierarchySize: number;
    approvers: Array<{ id: string; name: string; email: string; role: string }>;
    recommendations: string[];
  }> {
    try {
      const config = await this.approvalConfigService.getApprovalConfiguration(tenantId);
      const allApprovers = await this.approvalConfigService.getAllApprovers(tenantId);
      
      const recommendations: string[] = [];

      if (!config) {
        recommendations.push('No approval configuration found - run initial setup');
        return {
          hasDefaultApprover: false,
          hasEscalationRules: false,
          hierarchySize: 0,
          approvers: [],
          recommendations
        };
      }

      // Analyser la configuration et générer des recommandations
      if (!config.defaultApprovers?.primary) {
        recommendations.push('Set up a default approver for fallback scenarios');
      }

      if (!config.escalationRules?.enabled) {
        recommendations.push('Consider enabling escalation rules for better workflow management');
      }

      const hierarchySize = Object.keys(config.organizationalHierarchy || {}).length;
      if (hierarchySize === 0) {
        recommendations.push('Import organizational hierarchy for automatic approver assignment');
      }

      if (config.escalationRules?.enabled && !config.escalationRules.escalateToUserId) {
        recommendations.push('Configure escalation target for automatic escalations');
      }

      return {
        hasDefaultApprover: !!config.defaultApprovers?.primary,
        hasEscalationRules: config.escalationRules?.enabled || false,
        hierarchySize,
        approvers: allApprovers,
        recommendations
      };

    } catch (error) {
      return {
        hasDefaultApprover: false,
        hasEscalationRules: false,
        hierarchySize: 0,
        approvers: [],
        recommendations: [`Error getting configuration: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Valider et enrichir les informations d'un utilisateur
   */
  private async validateAndEnrichUser(
    tenantId: string,
    userInfo: { userId: string; name?: string; email?: string },
    context: string
  ): Promise<{ id: string; name: string; email: string }> {
    try {
      // Si les informations sont déjà complètes, les valider
      if (userInfo.name && userInfo.email) {
        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userInfo.email)) {
          throw new ValidationError(`${context}: Invalid email format`);
        }

        return {
          id: userInfo.userId,
          name: userInfo.name,
          email: userInfo.email
        };
      }

      // Sinon, récupérer les informations depuis le service utilisateur
      const user = await UserService.getUserById(userInfo.userId, tenantId);
      
      if (!user) {
        throw new ValidationError(`${context}: User not found with ID ${userInfo.userId}`);
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
        id: userInfo.userId,
        name: name || `User ${userInfo.userId}`,
        email: user.email
      };

    } catch (error) {
      throw new ValidationError(`${context} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enrichir la hiérarchie organisationnelle avec les informations des utilisateurs
   */
  private async enrichOrganizationalHierarchy(
    tenantId: string,
    hierarchy: { [employeeId: string]: { managerId: string; departmentId?: string; departmentName?: string } }
  ): Promise<{ [employeeId: string]: { managerId: string; managerName: string; managerEmail: string; departmentId?: string; departmentName?: string } }> {
    const enrichedHierarchy: any = {};

    for (const [employeeId, info] of Object.entries(hierarchy)) {
      try {
        const manager = await this.validateAndEnrichUser(
          tenantId,
          { userId: info.managerId },
          `Manager for employee ${employeeId}`
        );

        enrichedHierarchy[employeeId] = {
          managerId: manager.id,
          managerName: manager.name,
          managerEmail: manager.email,
          departmentId: info.departmentId,
          departmentName: info.departmentName
        };

      } catch (error) {
        console.warn(`Failed to enrich manager info for employee ${employeeId}:`, error);
        // Continuer avec les informations partielles
        enrichedHierarchy[employeeId] = {
          managerId: info.managerId,
          managerName: `Manager ${info.managerId}`,
          managerEmail: `manager${info.managerId}@example.com`,
          departmentId: info.departmentId,
          departmentName: info.departmentName
        };
      }
    }

    return enrichedHierarchy;
  }
}