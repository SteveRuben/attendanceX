/**
 * Routes pour la gestion du branding des tenants
 */

import { Router } from 'express';
import { tenantBrandingService } from '../services/branding/tenant-branding.service';
import { tenantContextMiddleware } from '../middleware/tenant-context.middleware';
import { requireFeature } from '../middleware/feature-gating.middleware';

const router = Router();

// Middleware pour toutes les routes de branding
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);
router.use(requireFeature('custom_branding'));

/**
 * GET /api/branding
 * Obtenir le branding du tenant actuel
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const branding = await tenantBrandingService.getTenantBranding(tenantId);
    
    if (!branding) {
      return res.status(404).json({ error: 'Branding not found' });
    }

    return res.json(branding);
  } catch (error) {
    console.error('Error getting tenant branding:', error);
    return res.status(500).json({ error: 'Failed to get tenant branding' });
  }
});

/**
 * PUT /api/branding
 * Mettre à jour le branding du tenant
 */
router.put('/', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const updates = req.body;
    const branding = await tenantBrandingService.updateTenantBranding(tenantId, updates);

    return res.json(branding);
  } catch (error) {
    console.error('Error updating tenant branding:', error);
    return res.status(500).json({ error: 'Failed to update tenant branding' });
  }
});

/**
 * DELETE /api/branding
 * Supprimer le branding du tenant
 */
router.delete('/', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    await tenantBrandingService.deleteTenantBranding(tenantId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tenant branding:', error);
    return res.status(500).json({ error: 'Failed to delete tenant branding' });
  }
});

/**
 * GET /api/branding/themes
 * Obtenir les thèmes prédéfinis
 */
router.get('/themes', async (req, res) => {
  try {
    const themes = tenantBrandingService.getPresetThemes();
     res.json(themes);
  } catch (error) {
    console.error('Error getting preset themes:', error);
    res.status(500).json({ error: 'Failed to get preset themes' });
  }
});

/**
 * POST /api/branding/themes/:themeName
 * Appliquer un thème prédéfini
 */
router.post('/themes/:themeName', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { themeName } = req.params;
    const branding = await tenantBrandingService.applyPresetTheme(tenantId, themeName);

    return res.json(branding);
  } catch (error) {
    console.error('Error applying preset theme:', error);
    return res.status(500).json({ error: 'Failed to apply preset theme' });
  }
});

/**
 * GET /api/branding/css
 * Générer le CSS pour le tenant
 */
router.get('/css', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const css = await tenantBrandingService.generateTenantCss(tenantId);
    
    res.setHeader('Content-Type', 'text/css');
    return res.send(css);

  } catch (error) {
    console.error('Error generating tenant CSS:', error);
    return res.status(500).json({ error: 'Failed to generate tenant CSS' });
  }
});

export default router;