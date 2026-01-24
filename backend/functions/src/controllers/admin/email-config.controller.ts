import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { emailConfigService } from '../../services/admin/email-config.service';
import { handleControllerError } from '../../middleware/errorHandler';
import { logger } from 'firebase-functions';

/**
 * Récupérer tous les providers email du tenant
 */
export const getEmailProvidersController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantContext?.tenant.id;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
      return;
    }

    logger.info('Getting email providers for tenant', { tenantId });

    const providers = await emailConfigService.getTenantEmailProviders(tenantId);

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

/**
 * Récupérer les types de providers disponibles
 */
export const getAvailableProviderTypesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const providerTypes = await emailConfigService.getAvailableProviderTypes();

    res.json({
      success: true,
      data: providerTypes
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

/**
 * Créer une nouvelle configuration email
 */
export const createEmailProviderController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    const providerData = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
      return;
    }

    logger.info('Creating email provider for tenant', { tenantId, type: providerData.type });

    const provider = await emailConfigService.createTenantEmailProvider(tenantId, providerData);

    res.status(201).json({
      success: true,
      data: provider,
      message: 'Configuration email créée avec succès'
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

/**
 * Mettre à jour une configuration email
 */
export const updateEmailProviderController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    const providerId = req.params.providerId as string;
    const updateData = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
      return;
    }

    logger.info('Updating email provider for tenant', { tenantId, providerId });

    const provider = await emailConfigService.updateTenantEmailProvider(tenantId, providerId, updateData);

    res.json({
      success: true,
      data: provider,
      message: 'Configuration email mise à jour avec succès'
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

/**
 * Supprimer une configuration email
 */
export const deleteEmailProviderController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    const providerId = req.params.providerId as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
      return;
    }

    logger.info('Deleting email provider for tenant', { tenantId, providerId });

    await emailConfigService.deleteTenantEmailProvider(tenantId, providerId);

    res.json({
      success: true,
      message: 'Configuration email supprimée avec succès'
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};

/**
 * Tester une configuration email
 */
export const testEmailProviderController = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantContext?.tenant.id;
    const { type, config, testEmail } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'Tenant context required' }
      });
      return;
    }

    logger.info('Testing email provider for tenant', { tenantId, type });

    const result = await emailConfigService.testEmailProvider(tenantId, type, config, testEmail);

    res.json({
      success: true,
      data: result,
      message: result.success ? 'Test réussi' : 'Test échoué'
    });
  } catch (error) {
    handleControllerError(error, res);
  }
};