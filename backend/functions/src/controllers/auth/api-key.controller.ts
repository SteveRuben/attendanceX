import { Request, Response } from 'express';
import { apiKeyService, CreateApiKeyRequest, UpdateApiKeyRequest } from '../../services/auth/api-key.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { ForbiddenError, ValidationError, NotFoundError } from '../../utils/common/errors';


export class ApiKeyController {
  /**
   * POST /api/tenants/:tenantId/api-keys
   * Créer une nouvelle clé API
   */
  createApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Validation des données d'entrée
    const { name, scopes, expiresInDays, rateLimit, metadata } = req.body as CreateApiKeyRequest;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('API key name is required');
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      throw new ValidationError('At least one scope is required');
    }

    // Valider les scopes
    const validScopes = ['read', 'write', 'admin', 'events', 'attendances', 'reports', 'users', 'integrations'];
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new ValidationError(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    // Valider la durée d'expiration
    if (expiresInDays !== undefined && (expiresInDays <= 0 || expiresInDays > 365)) {
      throw new ValidationError('Expiration must be between 1 and 365 days');
    }

    try {
      const result = await apiKeyService.createApiKey(tenantId, userId, {
        name: name.trim(),
        scopes,
        expiresInDays,
        rateLimit,
        metadata
      });

      res.status(201).json({
        success: true,
        data: {
          apiKey: result.apiKey,
          plainKey: result.plainKey // Retourné une seule fois
        },
        message: 'API key created successfully'
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  });

  /**
   * GET /api/tenants/:tenantId/api-keys
   * Lister les clés API du tenant
   */
  listApiKeys = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Optionnel : filtrer par utilisateur si pas admin
    const filterByUser = req.query.myKeys === 'true';
    const userIdFilter = filterByUser ? userId : undefined;

    try {
      const apiKeys = await apiKeyService.listApiKeys(tenantId, userIdFilter);

      res.json({
        success: true,
        data: apiKeys,
        count: apiKeys.length
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      throw new Error('Failed to list API keys');
    }
  });

  /**
   * GET /api/tenants/:tenantId/api-keys/:keyId
   * Obtenir une clé API spécifique
   */
  getApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, keyId } = req.params;

    try {
      const apiKey = await apiKeyService.getApiKey(tenantId, keyId);

      if (!apiKey) {
        throw new NotFoundError('API key not found');
      }

      res.json({
        success: true,
        data: apiKey
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error getting API key:', error);
      throw new Error('Failed to get API key');
    }
  });

  /**
   * PUT /api/tenants/:tenantId/api-keys/:keyId
   * Mettre à jour une clé API
   */
  updateApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, keyId } = req.params;
    const updateData = req.body as UpdateApiKeyRequest;

    // Validation des scopes si fournis
    if (updateData.scopes) {
      const validScopes = ['read', 'write', 'admin', 'events', 'attendances', 'reports', 'users', 'integrations'];
      const invalidScopes = updateData.scopes.filter(scope => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new ValidationError(`Invalid scopes: ${invalidScopes.join(', ')}`);
      }
    }

    try {
      const updatedApiKey = await apiKeyService.updateApiKey(tenantId, keyId, updateData);

      if (!updatedApiKey) {
        throw new NotFoundError('API key not found');
      }

      res.json({
        success: true,
        data: updatedApiKey,
        message: 'API key updated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error updating API key:', error);
      throw new Error('Failed to update API key');
    }
  });

  /**
   * DELETE /api/tenants/:tenantId/api-keys/:keyId
   * Supprimer une clé API
   */
  deleteApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, keyId } = req.params;

    try {
      const deleted = await apiKeyService.deleteApiKey(tenantId, keyId);

      if (!deleted) {
        throw new NotFoundError('API key not found');
      }

      res.json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error deleting API key:', error);
      throw new Error('Failed to delete API key');
    }
  });

  /**
   * POST /api/tenants/:tenantId/api-keys/:keyId/regenerate
   * Régénérer une clé API
   */
  regenerateApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, keyId } = req.params;

    try {
      const result = await apiKeyService.regenerateApiKey(tenantId, keyId);

      if (!result) {
        throw new NotFoundError('API key not found');
      }

      res.json({
        success: true,
        data: {
          apiKey: result.apiKey,
          plainKey: result.plainKey // Nouvelle clé en clair
        },
        message: 'API key regenerated successfully'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Error regenerating API key:', error);
      throw new Error('Failed to regenerate API key');
    }
  });

  /**
   * GET /api/tenants/:tenantId/api-keys/:keyId/usage
   * Obtenir les statistiques d'usage d'une clé API
   */
  getApiKeyUsage = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, keyId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Valider que la clé existe et appartient au tenant
    const apiKey = await apiKeyService.getApiKey(tenantId, keyId);
    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    try {
      const usage = await apiKeyService.getUsageStats(keyId, days);

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      console.error('Error getting API key usage:', error);
      throw new Error('Failed to get API key usage');
    }
  });

  /**
   * POST /api/auth/validate-key
   * Valider une clé API (endpoint public pour l'authentification)
   */
  validateApiKey = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.body;

    if (!key) {
      throw new ValidationError('API key is required');
    }

    try {
      const apiKey = await apiKeyService.validateApiKey(key);

      if (!apiKey) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired API key'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          keyId: apiKey.id,
          tenantId: apiKey.tenantId,
          userId: apiKey.userId,
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit
        }
      });
    } catch (error) {
      console.error('Error validating API key:', error);
      throw new Error('Failed to validate API key');
    }
  });
}

export const apiKeyController = new ApiKeyController();