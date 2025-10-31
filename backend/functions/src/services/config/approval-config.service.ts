/**
 * Service de configuration des approbateurs
 */

import { collections } from '../../config/database';
import { ValidationError } from '../../models/base.model';

export interface ApprovalConfiguration {
  id?: string;
  tenantId: string;
  
  // Approbateurs par défaut
  defaultApprovers: {
    primary: {
      userId: string;
      name: string;
      email: string;
    };
    secondary?: {
      userId: string;
      name: string;
      email: string;
    };
  };
  
  // Règles d'escalation
  escalationRules: {
    enabled: boolean;
    escalateToUserId?: string;
    escalateToName?: string;
    escalateToEmail?: string;
    escalationDays: number;
  };
  
  // Hiérarchie organisationnelle
  organizationalHierarchy: {
    [employeeId: string]: {
      managerId: string;
      managerName: string;
      managerEmail: string;
      departmentId?: string;
      departmentName?: string;
    };
  };
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export class ApprovalConfigService {

  constructor() {
  }

  // ==================== Gestion des approbateurs par défaut ====================

  /**
   * Obtenir la configuration d'approbation pour un tenant
   */
  async getApprovalConfiguration(tenantId: string): Promise<ApprovalConfiguration | null> {
    try {
      const query = await collections.approval_configurations
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as ApprovalConfiguration;
    } catch (error) {
      throw new Error(`Failed to get approval configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Créer ou mettre à jour la configuration d'approbation
   */
  async setApprovalConfiguration(
    tenantId: string,
    config: Omit<ApprovalConfiguration, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    updatedBy: string
  ): Promise<ApprovalConfiguration> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      const configData = {
        tenantId,
        ...config,
        updatedBy,
        updatedAt: new Date(),
        createdAt: existingConfig?.createdAt || new Date(),
        createdBy: existingConfig?.createdBy || updatedBy
      };

      // Validation
      await this.validateConfiguration(configData);

      if (existingConfig?.id) {
        // Mise à jour
        await collections.approval_configurations
          .doc(existingConfig.id)
          .update(configData);
        
        return {
          ...configData,
          id: existingConfig.id
        };
      } else {
        // Création
        const docRef = await collections.approval_configurations.add(configData);
        
        return {
          ...configData,
          id: docRef.id
        };
      }
    } catch (error) {
      throw new Error(`Failed to set approval configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'approbateur par défaut pour un tenant
   */
  async getDefaultApprover(tenantId: string): Promise<{ id: string; name: string; email: string } | null> {
    try {
      const config = await this.getApprovalConfiguration(tenantId);
      
      if (!config?.defaultApprovers?.primary) {
        return null;
      }

      return {
        id: config.defaultApprovers.primary.userId,
        name: config.defaultApprovers.primary.name,
        email: config.defaultApprovers.primary.email
      };
    } catch (error) {
      console.error(`Error getting default approver for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Définir l'approbateur par défaut
   */
  async setDefaultApprover(
    tenantId: string,
    approver: { userId: string; name: string; email: string },
    updatedBy: string
  ): Promise<void> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      const config = {
        defaultApprovers: {
          primary: approver,
          secondary: existingConfig?.defaultApprovers?.secondary
        },
        escalationRules: existingConfig?.escalationRules || {
          enabled: false,
          escalationDays: 3
        },
        organizationalHierarchy: existingConfig?.organizationalHierarchy || {}
      };

      await this.setApprovalConfiguration(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to set default approver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion de la hiérarchie organisationnelle ====================

  /**
   * Obtenir l'approbateur pour un employé spécifique
   */
  async getApproverForEmployee(
    tenantId: string,
    employeeId: string
  ): Promise<{ id: string; name: string; email: string } | null> {
    try {
      const config = await this.getApprovalConfiguration(tenantId);
      
      if (!config) {
        return null;
      }

      // Vérifier d'abord la hiérarchie organisationnelle
      const hierarchy = config.organizationalHierarchy[employeeId];
      if (hierarchy) {
        return {
          id: hierarchy.managerId,
          name: hierarchy.managerName,
          email: hierarchy.managerEmail
        };
      }

      // Sinon, utiliser l'approbateur par défaut
      return this.getDefaultApprover(tenantId);
    } catch (error) {
      console.error(`Error getting approver for employee ${employeeId}:`, error);
      return null;
    }
  }

  /**
   * Définir le manager d'un employé
   */
  async setEmployeeManager(
    tenantId: string,
    employeeId: string,
    manager: {
      managerId: string;
      managerName: string;
      managerEmail: string;
      departmentId?: string;
      departmentName?: string;
    },
    updatedBy: string
  ): Promise<void> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      const organizationalHierarchy = {
        ...existingConfig?.organizationalHierarchy,
        [employeeId]: manager
      };

      const config = {
        defaultApprovers: existingConfig?.defaultApprovers || {
          primary: { userId: '', name: '', email: '' }
        },
        escalationRules: existingConfig?.escalationRules || {
          enabled: false,
          escalationDays: 3
        },
        organizationalHierarchy
      };

      await this.setApprovalConfiguration(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to set employee manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un employé de la hiérarchie
   */
  async removeEmployeeFromHierarchy(
    tenantId: string,
    employeeId: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      if (!existingConfig?.organizationalHierarchy) {
        return;
      }

      const organizationalHierarchy = { ...existingConfig.organizationalHierarchy };
      delete organizationalHierarchy[employeeId];

      const config = {
        defaultApprovers: existingConfig.defaultApprovers,
        escalationRules: existingConfig.escalationRules,
        organizationalHierarchy
      };

      await this.setApprovalConfiguration(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to remove employee from hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des escalations ====================

  /**
   * Obtenir la cible d'escalation
   */
  async getEscalationTarget(
    tenantId: string,
    currentApproverId?: string
  ): Promise<string | null> {
    try {
      const config = await this.getApprovalConfiguration(tenantId);
      
      if (!config?.escalationRules?.enabled) {
        return null;
      }

      // Si un utilisateur d'escalation spécifique est configuré
      if (config.escalationRules.escalateToUserId) {
        return config.escalationRules.escalateToUserId;
      }

      // Sinon, essayer de trouver le manager du manager actuel
      if (currentApproverId) {
        const managerOfManager = Object.values(config.organizationalHierarchy)
          .find(hierarchy => hierarchy.managerId === currentApproverId);
        
        if (managerOfManager) {
          return managerOfManager.managerId;
        }
      }

      // En dernier recours, utiliser l'approbateur par défaut
      const defaultApprover = await this.getDefaultApprover(tenantId);
      return defaultApprover?.id || null;
    } catch (error) {
      console.error(`Error getting escalation target:`, error);
      return null;
    }
  }

  /**
   * Configurer les règles d'escalation
   */
  async setEscalationRules(
    tenantId: string,
    rules: {
      enabled: boolean;
      escalateToUserId?: string;
      escalateToName?: string;
      escalateToEmail?: string;
      escalationDays: number;
    },
    updatedBy: string
  ): Promise<void> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      const config = {
        defaultApprovers: existingConfig?.defaultApprovers || {
          primary: { userId: '', name: '', email: '' }
        },
        escalationRules: rules,
        organizationalHierarchy: existingConfig?.organizationalHierarchy || {}
      };

      await this.setApprovalConfiguration(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to set escalation rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Obtenir tous les approbateurs configurés pour un tenant
   */
  async getAllApprovers(tenantId: string): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
    try {
      const config = await this.getApprovalConfiguration(tenantId);
      
      if (!config) {
        return [];
      }

      const approvers: Array<{ id: string; name: string; email: string; role: string }> = [];

      // Approbateur principal
      if (config.defaultApprovers?.primary) {
        approvers.push({
          id: config.defaultApprovers.primary.userId,
          name: config.defaultApprovers.primary.name,
          email: config.defaultApprovers.primary.email,
          role: 'primary_default'
        });
      }

      // Approbateur secondaire
      if (config.defaultApprovers?.secondary) {
        approvers.push({
          id: config.defaultApprovers.secondary.userId,
          name: config.defaultApprovers.secondary.name,
          email: config.defaultApprovers.secondary.email,
          role: 'secondary_default'
        });
      }

      // Approbateur d'escalation
      if (config.escalationRules?.escalateToUserId) {
        approvers.push({
          id: config.escalationRules.escalateToUserId,
          name: config.escalationRules.escalateToName || 'Unknown',
          email: config.escalationRules.escalateToEmail || 'unknown@example.com',
          role: 'escalation'
        });
      }

      // Managers dans la hiérarchie
      Object.values(config.organizationalHierarchy).forEach(hierarchy => {
        if (!approvers.find(a => a.id === hierarchy.managerId)) {
          approvers.push({
            id: hierarchy.managerId,
            name: hierarchy.managerName,
            email: hierarchy.managerEmail,
            role: 'manager'
          });
        }
      });

      return approvers;
    } catch (error) {
      throw new Error(`Failed to get all approvers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir la hiérarchie complète pour un tenant
   */
  async getOrganizationalHierarchy(tenantId: string): Promise<ApprovalConfiguration['organizationalHierarchy']> {
    try {
      const config = await this.getApprovalConfiguration(tenantId);
      return config?.organizationalHierarchy || {};
    } catch (error) {
      throw new Error(`Failed to get organizational hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Importer une hiérarchie organisationnelle
   */
  async importOrganizationalHierarchy(
    tenantId: string,
    hierarchy: ApprovalConfiguration['organizationalHierarchy'],
    updatedBy: string
  ): Promise<void> {
    try {
      const existingConfig = await this.getApprovalConfiguration(tenantId);
      
      const config = {
        defaultApprovers: existingConfig?.defaultApprovers || {
          primary: { userId: '', name: '', email: '' }
        },
        escalationRules: existingConfig?.escalationRules || {
          enabled: false,
          escalationDays: 3
        },
        organizationalHierarchy: hierarchy
      };

      await this.setApprovalConfiguration(tenantId, config, updatedBy);
    } catch (error) {
      throw new Error(`Failed to import organizational hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Validation ====================

  private async validateConfiguration(config: ApprovalConfiguration): Promise<void> {
    // Validation des champs requis
    if (!config.tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    if (!config.defaultApprovers?.primary?.userId) {
      throw new ValidationError('Primary default approver is required');
    }

    if (!config.defaultApprovers.primary.name) {
      throw new ValidationError('Primary approver name is required');
    }

    if (!config.defaultApprovers.primary.email) {
      throw new ValidationError('Primary approver email is required');
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.defaultApprovers.primary.email)) {
      throw new ValidationError('Primary approver email is invalid');
    }

    // Validation des règles d'escalation
    if (config.escalationRules.escalationDays < 0 || config.escalationRules.escalationDays > 30) {
      throw new ValidationError('Escalation days must be between 0 and 30');
    }

    // Validation de la hiérarchie organisationnelle
    for (const [employeeId, hierarchy] of Object.entries(config.organizationalHierarchy)) {
      if (!hierarchy.managerId) {
        throw new ValidationError(`Manager ID is required for employee ${employeeId}`);
      }

      if (!hierarchy.managerName) {
        throw new ValidationError(`Manager name is required for employee ${employeeId}`);
      }

      if (!hierarchy.managerEmail) {
        throw new ValidationError(`Manager email is required for employee ${employeeId}`);
      }

      if (!emailRegex.test(hierarchy.managerEmail)) {
        throw new ValidationError(`Manager email is invalid for employee ${employeeId}`);
      }
    }
  }
}