/**
 * Service de personnalisation des fonctionnalités par tenant
 * Gère les toggles de fonctionnalités, champs personnalisés et configurations
 */

import { collections } from '../../config/database';
import { tenantService } from '../tenant/tenant.service';
import { TenantError, TenantErrorCode } from '../../common/types';

export interface FeatureToggle {
  id: string;
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  configuration?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomField {
  id: string;
  tenantId: string;
  entityType: 'user' | 'event' | 'attendance' | 'organization';
  fieldKey: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'textarea';
  required: boolean;
  defaultValue?: any;
  options?: string[]; // Pour les champs select/multiselect
  validation?: FieldValidation;
  displayOrder: number;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
}

export interface DashboardLayout {
  id: string;
  tenantId: string;
  layoutName: string;
  isDefault: boolean;
  widgets: DashboardWidget[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'calendar' | 'custom';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: Record<string, any>;
  visible: boolean;
}

export interface WorkflowConfiguration {
  id: string;
  tenantId: string;
  workflowType: 'event_creation' | 'user_registration' | 'payment_processing' | 'notification';
  steps: WorkflowStep[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'notification' | 'automation' | 'condition';
  configuration: Record<string, any>;
  order: number;
  required: boolean;
}

export interface CreateFeatureToggleRequest {
  featureKey: string;
  enabled: boolean;
  configuration?: Record<string, any>;
}

export interface CreateCustomFieldRequest {
  entityType: 'user' | 'event' | 'attendance' | 'organization';
  fieldKey: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'textarea';
  required?: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
  displayOrder?: number;
  visible?: boolean;
}

export interface CreateDashboardLayoutRequest {
  layoutName: string;
  isDefault?: boolean;
  widgets: Omit<DashboardWidget, 'id'>[];
}

export interface CreateWorkflowRequest {
  workflowType: 'event_creation' | 'user_registration' | 'payment_processing' | 'notification';
  steps: Omit<WorkflowStep, 'id'>[];
  enabled?: boolean;
}

export class FeatureCustomizationService {

  /**
   * Obtenir tous les toggles de fonctionnalités d'un tenant
   */
  async getFeatureToggles(tenantId: string): Promise<FeatureToggle[]> {
    try {
      const snapshot = await collections.feature_toggles
        .where('tenantId', '==', tenantId)
        .orderBy('featureKey')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeatureToggle));
    } catch (error) {
      console.error('Error getting feature toggles:', error);
      return [];
    }
  }

  /**
   * Créer ou mettre à jour un toggle de fonctionnalité
   */
  async setFeatureToggle(tenantId: string, request: CreateFeatureToggleRequest): Promise<FeatureToggle> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Chercher un toggle existant
      const existingSnapshot = await collections.feature_toggles
        .where('tenantId', '==', tenantId)
        .where('featureKey', '==', request.featureKey)
        .limit(1)
        .get();

      const now = new Date();

      if (!existingSnapshot.empty) {
        // Mettre à jour le toggle existant
        const doc = existingSnapshot.docs[0];
        const updates = {
          enabled: request.enabled,
          configuration: request.configuration,
          updatedAt: now
        };

        await collections.feature_toggles.doc(doc.id).update(updates);

        return {
          id: doc.id,
          ...doc.data(),
          ...updates
        } as FeatureToggle;
      } else {
        // Créer un nouveau toggle
        const toggleData: Omit<FeatureToggle, 'id'> = {
          tenantId,
          featureKey: request.featureKey,
          enabled: request.enabled,
          configuration: request.configuration,
          createdAt: now,
          updatedAt: now
        };

        const toggleRef = await collections.feature_toggles.add(toggleData);

        return {
          id: toggleRef.id,
          ...toggleData
        };
      }
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error setting feature toggle:', error);
      throw new TenantError(
        'Failed to set feature toggle',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    try {
      const snapshot = await collections.feature_toggles
        .where('tenantId', '==', tenantId)
        .where('featureKey', '==', featureKey)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return false;
      }

      const toggle = snapshot.docs[0].data() as FeatureToggle;
      return toggle.enabled;
    } catch (error) {
      console.error('Error checking feature toggle:', error);
      return false;
    }
  }

  /**
   * Obtenir les champs personnalisés d'un tenant
   */
  async getCustomFields(tenantId: string, entityType?: string): Promise<CustomField[]> {
    try {
      let query = collections.custom_fields.where('tenantId', '==', tenantId);
      
      if (entityType) {
        query = query.where('entityType', '==', entityType);
      }

      const snapshot = await query
        .orderBy('displayOrder')
        .orderBy('fieldName')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomField));
    } catch (error) {
      console.error('Error getting custom fields:', error);
      return [];
    }
  }

  /**
   * Créer un champ personnalisé
   */
  async createCustomField(tenantId: string, request: CreateCustomFieldRequest): Promise<CustomField> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Vérifier que la clé du champ est unique pour ce tenant et type d'entité
      const existingSnapshot = await collections.custom_fields
        .where('tenantId', '==', tenantId)
        .where('entityType', '==', request.entityType)
        .where('fieldKey', '==', request.fieldKey)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        throw new TenantError(
          'Custom field key already exists',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Obtenir l'ordre d'affichage suivant
      const maxOrderSnapshot = await collections.custom_fields
        .where('tenantId', '==', tenantId)
        .where('entityType', '==', request.entityType)
        .orderBy('displayOrder', 'desc')
        .limit(1)
        .get();

      const nextOrder = maxOrderSnapshot.empty ? 1 : 
        (maxOrderSnapshot.docs[0].data() as CustomField).displayOrder + 1;

      const now = new Date();
      const fieldData: Omit<CustomField, 'id'> = {
        tenantId,
        entityType: request.entityType,
        fieldKey: request.fieldKey,
        fieldName: request.fieldName,
        fieldType: request.fieldType,
        required: request.required ?? false,
        defaultValue: request.defaultValue,
        options: request.options,
        validation: request.validation,
        displayOrder: request.displayOrder ?? nextOrder,
        visible: request.visible ?? true,
        createdAt: now,
        updatedAt: now
      };

      const fieldRef = await collections.custom_fields.add(fieldData);

      return {
        id: fieldRef.id,
        ...fieldData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating custom field:', error);
      throw new TenantError(
        'Failed to create custom field',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Mettre à jour un champ personnalisé
   */
  async updateCustomField(tenantId: string, fieldId: string, updates: Partial<CreateCustomFieldRequest>): Promise<CustomField> {
    try {
      const field = await this.getCustomFieldById(fieldId);
      if (!field || field.tenantId !== tenantId) {
        throw new TenantError(
          'Custom field not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await collections.custom_fields.doc(fieldId).update(updateData);

      return {
        ...field,
        ...updateData
      } as CustomField;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error updating custom field:', error);
      throw new TenantError(
        'Failed to update custom field',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Supprimer un champ personnalisé
   */
  async deleteCustomField(tenantId: string, fieldId: string): Promise<void> {
    try {
      const field = await this.getCustomFieldById(fieldId);
      if (!field || field.tenantId !== tenantId) {
        throw new TenantError(
          'Custom field not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      await collections.custom_fields.doc(fieldId).delete();
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error deleting custom field:', error);
      throw new TenantError(
        'Failed to delete custom field',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les layouts de dashboard d'un tenant
   */
  async getDashboardLayouts(tenantId: string): Promise<DashboardLayout[]> {
    try {
      const snapshot = await collections.dashboard_layouts
        .where('tenantId', '==', tenantId)
        .orderBy('layoutName')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DashboardLayout));
    } catch (error) {
      console.error('Error getting dashboard layouts:', error);
      return [];
    }
  }

  /**
   * Créer un layout de dashboard
   */
  async createDashboardLayout(tenantId: string, request: CreateDashboardLayoutRequest): Promise<DashboardLayout> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Si c'est le layout par défaut, désactiver les autres
      if (request.isDefault) {
        await this.unsetDefaultLayouts(tenantId);
      }

      const now = new Date();
      const widgets = request.widgets.map((widget, index) => ({
        ...widget,
        id: `widget_${Date.now()}_${index}`
      }));

      const layoutData: Omit<DashboardLayout, 'id'> = {
        tenantId,
        layoutName: request.layoutName,
        isDefault: request.isDefault ?? false,
        widgets,
        createdAt: now,
        updatedAt: now
      };

      const layoutRef = await collections.dashboard_layouts.add(layoutData);

      return {
        id: layoutRef.id,
        ...layoutData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating dashboard layout:', error);
      throw new TenantError(
        'Failed to create dashboard layout',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les configurations de workflow d'un tenant
   */
  async getWorkflowConfigurations(tenantId: string): Promise<WorkflowConfiguration[]> {
    try {
      const snapshot = await collections.workflow_configurations
        .where('tenantId', '==', tenantId)
        .orderBy('workflowType')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkflowConfiguration));
    } catch (error) {
      console.error('Error getting workflow configurations:', error);
      return [];
    }
  }

  /**
   * Créer une configuration de workflow
   */
  async createWorkflowConfiguration(tenantId: string, request: CreateWorkflowRequest): Promise<WorkflowConfiguration> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const now = new Date();
      const steps = request.steps.map((step, index) => ({
        ...step,
        id: `step_${Date.now()}_${index}`,
        order: step.order ?? index + 1
      }));

      const workflowData: Omit<WorkflowConfiguration, 'id'> = {
        tenantId,
        workflowType: request.workflowType,
        steps,
        enabled: request.enabled ?? true,
        createdAt: now,
        updatedAt: now
      };

      const workflowRef = await collections.workflow_configurations.add(workflowData);

      return {
        id: workflowRef.id,
        ...workflowData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating workflow configuration:', error);
      throw new TenantError(
        'Failed to create workflow configuration',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les fonctionnalités disponibles
   */
  getAvailableFeatures(): Array<{ key: string; name: string; description: string; category: string }> {
    return [
      {
        key: 'advanced_analytics',
        name: 'Analytics Avancées',
        description: 'Rapports détaillés et tableaux de bord personnalisés',
        category: 'Analytics'
      },
      {
        key: 'custom_branding',
        name: 'Branding Personnalisé',
        description: 'Logos, couleurs et CSS personnalisés',
        category: 'Branding'
      },
      {
        key: 'custom_domains',
        name: 'Domaines Personnalisés',
        description: 'Utiliser votre propre domaine',
        category: 'Branding'
      },
      {
        key: 'api_access',
        name: 'Accès API',
        description: 'Intégrations via API REST',
        category: 'Intégrations'
      },
      {
        key: 'webhooks',
        name: 'Webhooks',
        description: 'Notifications en temps réel',
        category: 'Intégrations'
      },
      {
        key: 'sso_integration',
        name: 'SSO',
        description: 'Single Sign-On avec SAML/OAuth',
        category: 'Sécurité'
      },
      {
        key: 'advanced_permissions',
        name: 'Permissions Avancées',
        description: 'Contrôle granulaire des accès',
        category: 'Sécurité'
      },
      {
        key: 'bulk_operations',
        name: 'Opérations en Masse',
        description: 'Import/export et modifications groupées',
        category: 'Productivité'
      },
      {
        key: 'automated_workflows',
        name: 'Workflows Automatisés',
        description: 'Automatisation des processus métier',
        category: 'Productivité'
      },
      {
        key: 'priority_support',
        name: 'Support Prioritaire',
        description: 'Support technique prioritaire',
        category: 'Support'
      }
    ];
  }

  /**
   * Obtenir un champ personnalisé par ID
   */
  private async getCustomFieldById(fieldId: string): Promise<CustomField | null> {
    try {
      const doc = await collections.custom_fields.doc(fieldId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as CustomField;
    } catch (error) {
      console.error('Error getting custom field by ID:', error);
      return null;
    }
  }

  /**
   * Désactiver tous les layouts par défaut
   */
  private async unsetDefaultLayouts(tenantId: string): Promise<void> {
    try {
      const snapshot = await collections.dashboard_layouts
        .where('tenantId', '==', tenantId)
        .where('isDefault', '==', true)
        .get();

      const batch = collections.dashboard_layouts.firestore.batch();
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false, updatedAt: new Date() });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error unsetting default layouts:', error);
    }
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    feature_toggles: any;
    custom_fields: any;
    dashboard_layouts: any;
    workflow_configurations: any;
  }
}

// Instance singleton
export const featureCustomizationService = new FeatureCustomizationService();
export default featureCustomizationService;