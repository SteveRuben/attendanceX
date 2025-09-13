/**
 * Routes pour la personnalisation des fonctionnalités
 */

import { Router } from 'express';
import { featureCustomizationService } from '../../services/customization/feature-customization.service';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { requireFeature } from '../../middleware/feature-gating.middleware';
import '../types/express';

const router = Router();

// Middleware pour toutes les routes de personnalisation
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * GET /api/feature-customization/features
 * Obtenir les fonctionnalités disponibles
 */
router.get('/features', async (req, res) => {
  try {
    const features = featureCustomizationService.getAvailableFeatures();
    return res.json(features);
  } catch (error) {
    console.error('Error getting available features:', error);
    return res.status(500).json({ error: 'Failed to get available features' });
  }
});

/**
 * GET /api/feature-customization/toggles
 * Obtenir les toggles de fonctionnalités du tenant
 */
router.get('/toggles', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const toggles = await featureCustomizationService.getFeatureToggles(tenantId);
    return res.json(toggles);
  } catch (error) {
    console.error('Error getting feature toggles:', error);
    return res.status(500).json({ error: 'Failed to get feature toggles' });
  }
});

/**
 * PUT /api/feature-customization/toggles/:featureKey
 * Créer ou mettre à jour un toggle de fonctionnalité
 */
router.put('/toggles/:featureKey', requireFeature('advanced_permissions'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { featureKey } = req.params;
    const { enabled, configuration } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled field is required and must be boolean' });
    }

    const toggle = await featureCustomizationService.setFeatureToggle(tenantId, {
      featureKey,
      enabled,
      configuration
    });

    return res.json(toggle);
  } catch (error) {
    console.error('Error setting feature toggle:', error);
    return res.status(500).json({ error: 'Failed to set feature toggle' });
  }
});

/**
 * GET /api/feature-customization/toggles/:featureKey/status
 * Vérifier si une fonctionnalité est activée
 */
router.get('/toggles/:featureKey/status', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { featureKey } = req.params;
    const enabled = await featureCustomizationService.isFeatureEnabled(tenantId, featureKey);

    return res.json({ featureKey, enabled });
  } catch (error) {
    console.error('Error checking feature status:', error);
    return res.status(500).json({ error: 'Failed to check feature status' });
  }
});

/**
 * GET /api/feature-customization/custom-fields
 * Obtenir les champs personnalisés du tenant
 */
router.get('/custom-fields', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { entityType } = req.query;
    const fields = await featureCustomizationService.getCustomFields(
      tenantId, 
      entityType as string
    );

    return res.json(fields);
  } catch (error) {
    console.error('Error getting custom fields:', error);
    return res.status(500).json({ error: 'Failed to get custom fields' });
  }
});

/**
 * POST /api/feature-customization/custom-fields
 * Créer un champ personnalisé
 */
router.post('/custom-fields', requireFeature('custom_fields'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const {
      entityType,
      fieldKey,
      fieldName,
      fieldType,
      required,
      defaultValue,
      options,
      validation,
      displayOrder,
      visible
    } = req.body;

    if (!entityType || !fieldKey || !fieldName || !fieldType) {
      return res.status(400).json({ 
        error: 'Entity type, field key, field name, and field type are required' 
      });
    }

    const field = await featureCustomizationService.createCustomField(tenantId, {
      entityType,
      fieldKey,
      fieldName,
      fieldType,
      required,
      defaultValue,
      options,
      validation,
      displayOrder,
      visible
    });

    return res.status(201).json(field);
  } catch (error) {
    console.error('Error creating custom field:', error);
    return res.status(500).json({ error: 'Failed to create custom field' });
  }
});

/**
 * PUT /api/feature-customization/custom-fields/:fieldId
 * Mettre à jour un champ personnalisé
 */
router.put('/custom-fields/:fieldId', requireFeature('custom_fields'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { fieldId } = req.params;
    const updates = req.body;

    const field = await featureCustomizationService.updateCustomField(tenantId, fieldId, updates);
    return res.json(field);
  } catch (error) {
    console.error('Error updating custom field:', error);
    return res.status(500).json({ error: 'Failed to update custom field' });
  }
});

/**
 * DELETE /api/feature-customization/custom-fields/:fieldId
 * Supprimer un champ personnalisé
 */
router.delete('/custom-fields/:fieldId', requireFeature('custom_fields'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { fieldId } = req.params;
    await featureCustomizationService.deleteCustomField(tenantId, fieldId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

/**
 * GET /api/feature-customization/dashboard-layouts
 * Obtenir les layouts de dashboard du tenant
 */
router.get('/dashboard-layouts', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const layouts = await featureCustomizationService.getDashboardLayouts(tenantId);
    return res.json(layouts);
  } catch (error) {
    console.error('Error getting dashboard layouts:', error);
    return res.status(500).json({ error: 'Failed to get dashboard layouts' });
  }
});

/**
 * POST /api/feature-customization/dashboard-layouts
 * Créer un layout de dashboard
 */
router.post('/dashboard-layouts', requireFeature('custom_dashboards'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { layoutName, isDefault, widgets } = req.body;

    if (!layoutName || !widgets) {
      return res.status(400).json({ error: 'Layout name and widgets are required' });
    }

    const layout = await featureCustomizationService.createDashboardLayout(tenantId, {
      layoutName,
      isDefault,
      widgets
    });

    return res.status(201).json(layout);
  } catch (error) {
    console.error('Error creating dashboard layout:', error);
    return res.status(500).json({ error: 'Failed to create dashboard layout' });
  }
});

/**
 * GET /api/feature-customization/workflows
 * Obtenir les configurations de workflow du tenant
 */
router.get('/workflows', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const workflows = await featureCustomizationService.getWorkflowConfigurations(tenantId);
    return res.json(workflows);
  } catch (error) {
    console.error('Error getting workflow configurations:', error);
    return res.status(500).json({ error: 'Failed to get workflow configurations' });
  }
});

/**
 * POST /api/feature-customization/workflows
 * Créer une configuration de workflow
 */
router.post('/workflows', requireFeature('automated_workflows'), async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { workflowType, steps, enabled } = req.body;

    if (!workflowType || !steps) {
      return res.status(400).json({ error: 'Workflow type and steps are required' });
    }

    const workflow = await featureCustomizationService.createWorkflowConfiguration(tenantId, {
      workflowType,
      steps,
      enabled
    });

    return res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow configuration:', error);
    return res.status(500).json({ error: 'Failed to create workflow configuration' });
  }
});

export default router;