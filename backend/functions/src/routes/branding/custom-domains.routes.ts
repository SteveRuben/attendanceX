/**
 * Routes pour la gestion des domaines personnalisés
 */

import { Router } from 'express';
import { customDomainService } from '../../services/domain/custom-domain.service';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { requireFeature } from '../../middleware/feature-gating.middleware';

const router = Router();

// Middleware pour toutes les routes de domaines personnalisés
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);
router.use(requireFeature('custom_domains'));

/**
 * GET /api/custom-domains
 * Obtenir tous les domaines du tenant
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const domains = await customDomainService.getTenantDomains(tenantId);
    return res.json(domains);
  } catch (error) {
    console.error('Error getting tenant domains:', error);
    return res.status(500).json({ error: 'Failed to get tenant domains' });
  }
});

/**
 * POST /api/custom-domains
 * Ajouter un nouveau domaine personnalisé
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { domain, type, subdomain, redirectToHttps, wwwRedirect } = req.body;

    if (!domain || !type) {
      return res.status(400).json({ error: 'Domain and type are required' });
    }

    const customDomain = await customDomainService.addCustomDomain(tenantId, {
      domain,
      type,
      subdomain,
      redirectToHttps,
      wwwRedirect
    });

    return res.status(201).json(customDomain);
  } catch (error) {
    console.error('Error adding custom domain:', error);
    return res.status(500).json({ error: 'Failed to add custom domain' });
  }
});

/**
 * GET /api/custom-domains/:domainId
 * Obtenir un domaine spécifique
 */
router.get('/:domainId', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const domainId = req.params.domainId as string;
    const domains = await customDomainService.getTenantDomains(tenantId);
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    return res.json(domain);
  } catch (error) {
    console.error('Error getting domain:', error);
    return res.status(500).json({ error: 'Failed to get domain' });
  }
});

/**
 * POST /api/custom-domains/:domainId/verify
 * Vérifier les enregistrements DNS d'un domaine
 */
router.post('/:domainId/verify', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const domainId = req.params.domainId as string;
    
    // Vérifier que le domaine appartient au tenant
    const domains = await customDomainService.getTenantDomains(tenantId);
    const domain = domains.find(d => d.id === domainId);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const verificationResult = await customDomainService.verifyDNSRecords(domainId);
    return res.json(verificationResult);
  } catch (error) {
    console.error('Error verifying domain:', error);
    return res.status(500).json({ error: 'Failed to verify domain' });
  }
});

/**
 * DELETE /api/custom-domains/:domainId
 * Supprimer un domaine personnalisé
 */
router.delete('/:domainId', async (req, res) => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const domainId = req.params.domainId as string;
    await customDomainService.removeCustomDomain(tenantId, domainId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Error removing custom domain:', error);
    return res.status(500).json({ error: 'Failed to remove custom domain' });
  }
});

export default router;