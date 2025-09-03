import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { integrationService } from '../services/integration.service';
import { oauthService } from '../services/oauth.service';
import { syncService } from '../services/sync.service';
import { tokenService } from '../services/token.service';
import {
  CompleteOAuthRequest,
  ConnectIntegrationRequest,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationSyncRequest,
  UpdateIntegrationSettingsRequest } from '@attendance-x/shared';
import { logger } from 'firebase-functions';
import { integrationAnalyticsService } from '../services/integration-analytics.service';
import { AuthenticatedRequest } from '../types';
export class IntegrationController {
  /**
   * Obtenir toutes les intégrations d'un utilisateur
   * GET /user/integrations
   */
  static getUserIntegrations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const integrations = await integrationService.getUserIntegrations(userId);

    res.json({
      success: true,
      data: integrations.map(integration => integration.toAPI())
    });
  });

  /**
   * Obtenir une intégration spécifique
   * GET /user/integrations/:id
   */
  static getIntegration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: integration.toAPI()
    });
  });

  /**
   * Initier la connexion OAuth avec un provider
   * POST /user/integrations/:provider/connect
   */
  static connectProvider = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { provider } = req.params;
    const userId = req.user.uid;
    const organizationId = req.organization?.organizationId;
    const connectRequest: ConnectIntegrationRequest = req.body;

    // Valider le provider
    if (!Object.values(IntegrationProvider).includes(provider as IntegrationProvider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider'
      });
    }

    // Vérifier si le provider est activé
    if (!oauthService.isProviderEnabled(provider as IntegrationProvider)) {
      return res.status(400).json({
        success: false,
        message: 'Provider not enabled'
      });
    }

    // Vérifier si l'utilisateur a déjà une intégration avec ce provider
    const existingIntegration = await integrationService.getUserIntegrationByProvider(
      userId,
      provider as IntegrationProvider
    );

    if (existingIntegration) {
      return res.status(409).json({
        success: false,
        message: 'Integration already exists for this provider'
      });
    }

    // Initier le flux OAuth
    const oauthResponse = await oauthService.initiateOAuth({
      ...connectRequest,
      provider: provider as IntegrationProvider
    });

    logger.info('OAuth flow initiated', {
      userId,
      organizationId,
      provider,
      state: oauthResponse.state
    });

    return res.json({
      success: true,
      data: oauthResponse
    });
  });

  /**
   * Compléter la connexion OAuth
   * POST /user/integrations/:provider/callback
   */
  static completeOAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { provider } = req.params;
    const userId = req.user.uid;
    const organizationId = req.organization?.organizationId;
    const completeRequest: CompleteOAuthRequest = req.body;

    try {
      // Compléter le flux OAuth
      const tokens = await oauthService.completeOAuth({
        ...completeRequest,
        provider: provider as IntegrationProvider
      });

      // Obtenir les informations utilisateur du provider
      const userInfo = await oauthService.getUserInfo(
        provider as IntegrationProvider,
        tokens.accessToken
      );

      // Créer l'intégration
      const integration = await integrationService.createIntegration(
        userId,
        organizationId,
        provider as IntegrationProvider,
        tokens.scope.split(' '),
        {
          calendar: true,
          contacts: true,
          email: false,
          files: false,
          tasks: false,
          presence: provider === IntegrationProvider.MICROSOFT,
          autoSync: true,
          syncFrequency: 60 // 1 heure
        },
        {
          userEmail: userInfo.email,
          userName: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
          profilePicture: userInfo.picture,
          timeZone: userInfo.locale,
          locale: userInfo.locale
        }
      );

      // Stocker les tokens de manière sécurisée
      await tokenService.storeTokens(
        integration.id,
        userId,
        provider as IntegrationProvider,
        tokens
      );

      logger.info('Integration created successfully', {
        userId,
        organizationId,
        provider,
        integrationId: integration.id
      });

      res.status(201).json({
        success: true,
        data: integration.toAPI(),
        message: 'Integration connected successfully'
      });

    } catch (error) {
      logger.error('Error completing OAuth', { error, userId, provider });
      
      res.status(400).json({
        success: false,
        message: 'Failed to complete OAuth flow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Mettre à jour les paramètres d'une intégration
   * PUT /user/integrations/:id/settings
   */
  static updateIntegrationSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const updates: UpdateIntegrationSettingsRequest = req.body;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedIntegration = await integrationService.updateIntegrationSettings(id, updates);

    logger.info('Integration settings updated', {
      userId,
      integrationId: id,
      updates
    });

    return res.json({
      success: true,
      data: updatedIntegration.toAPI(),
      message: 'Integration settings updated successfully'
    });
  });

  /**
   * Déconnecter une intégration
   * DELETE /user/integrations/:id
   */
  static disconnectIntegration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Récupérer les tokens pour les révoquer
    try {
      const tokens = await tokenService.getTokens(id);
      if (tokens) {
        await oauthService.revokeToken(
          integration.getData().provider,
          tokens.accessToken
        );
      }
    } catch (error) {
      logger.warn('Failed to revoke tokens during disconnection', { error, integrationId: id });
      // Continue with disconnection even if token revocation fails
    }

    // Supprimer l'intégration
    await integrationService.deleteIntegration(id);

    logger.info('Integration disconnected', {
      userId,
      integrationId: id,
      provider: integration.getData().provider
    });

    return res.json({
      success: true,
      message: 'Integration disconnected successfully'
    });
  });

  /**
   * Obtenir l'historique de synchronisation d'une intégration
   * GET /user/integrations/:id/history
   */
  static getIntegrationHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit as string) || 50;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const history = await syncService.getSyncHistory(id, limit);

    return res.json({
      success: true,
      data: history.map(h => h.toAPI())
    });
  });

  /**
   * Déclencher une synchronisation manuelle
   * POST /user/integrations/:id/sync
   */
  static syncIntegration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;
    const syncRequest: IntegrationSyncRequest = req.body;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Déclencher la synchronisation
    const syncResults = await syncService.syncIntegration(
      id,
      syncRequest.syncTypes,
      syncRequest.force || false
    );

    logger.info('Manual sync triggered', {
      userId,
      integrationId: id,
      syncTypes: syncRequest.syncTypes,
      resultsCount: syncResults.length
    });

    return res.json({
      success: true,
      data: syncResults.map(result => result.toAPI()),
      message: 'Synchronization completed'
    });
  });

  /**
   * Obtenir les statistiques d'utilisation des intégrations
   * GET /user/integrations/stats
   */
  static getIntegrationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;

    const stats = await integrationService.getIntegrationUsageStats(organizationId);

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Tester la connexion d'une intégration
   * POST /user/integrations/:id/test
   */
  static testIntegration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    try {
      // Vérifier les tokens
      const tokens = await tokenService.getTokens(id);
      if (!tokens) {
        throw new Error('No tokens found');
      }

      // Tester l'accès à l'API du provider
      const userInfo = await oauthService.getUserInfo(
        integration.getData().provider,
        tokens.accessToken
      );

      return res.json({
        success: true,
        data: {
          status: 'connected',
          userInfo: {
            email: userInfo.email,
            name: userInfo.name
          },
          tokenExpiry: tokens.expiresAt
        },
        message: 'Integration is working correctly'
      });

    } catch (error) {
      logger.error('Integration test failed', { error, integrationId: id });
      
      return res.status(400).json({
        success: false,
        data: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        message: 'Integration test failed'
      });
    }
  });

  /**
   * Rafraîchir les tokens d'une intégration
   * POST /user/integrations/:id/refresh
   */
  static refreshIntegrationTokens = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;

    const integration = await integrationService.getIntegration(id);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Vérifier que l'intégration appartient à l'utilisateur
    if (integration.getData().userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    try {
      const tokens = await tokenService.getTokens(id);
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Rafraîchir les tokens
      const newTokens = await oauthService.refreshToken(
        integration.getData().provider,
        tokens.refreshToken
      );

      // Mettre à jour les tokens stockés
      await tokenService.updateTokens(id, newTokens);

      logger.info('Tokens refreshed successfully', {
        userId,
        integrationId: id,
        provider: integration.getData().provider
      });

      return res.json({
        success: true,
        data: {
          expiresAt: newTokens.expiresAt
        },
        message: 'Tokens refreshed successfully'
      });

    } catch (error) {
      logger.error('Failed to refresh tokens', { error, integrationId: id });
      
      // Marquer l'intégration comme ayant une erreur
      integration.updateStatus(IntegrationStatus.ERROR, 'Failed to refresh tokens');
      await integrationService.updateIntegrationSettings(id, {});

      return res.status(400).json({
        success: false,
        message: 'Failed to refresh tokens',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Obtenir les métriques d'analytics des intégrations (Admin seulement)
   * GET /user/integrations/analytics/metrics
   */
  static getAnalyticsMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userRole = req.user.role;

    // Vérifier les permissions d'admin
    if (!['admin', 'super_admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Admin role required'
      });
    }

    try {

      // Collecter toutes les métriques
      const [integrationMetrics, userAdoptionMetrics, performanceMetrics] = await Promise.all([
        integrationAnalyticsService.collectIntegrationMetrics(),
        integrationAnalyticsService.collectUserAdoptionMetrics(),
        integrationAnalyticsService.collectPerformanceMetrics()
      ]);

      logger.info('Analytics metrics collected', {
        userId: req.user.uid,
        integrationProvidersCount: integrationMetrics.length,
        totalUsers: userAdoptionMetrics.totalUsers,
        avgResponseTime: performanceMetrics.avgResponseTime
      });

      return res.json({
        success: true,
        data: {
          integrationMetrics,
          userAdoptionMetrics,
          performanceMetrics,
          collectedAt: new Date()
        },
        message: 'Analytics metrics retrieved successfully'
      });

    } catch (error) {
      logger.error('Failed to collect analytics metrics', { error });
      
      return res.status(500).json({
        success: false,
        message: 'Failed to collect analytics metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}