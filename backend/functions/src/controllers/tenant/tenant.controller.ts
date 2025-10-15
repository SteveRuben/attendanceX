import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { tenantService } from "../../services/tenant/tenant.service";
import { tenantMembershipService } from "../../services/tenant/tenant-membership.service";
import { tenantContextService } from "../../services/tenant/tenant-context.service";
import { authService } from "../../services/auth/auth.service";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { extractClientIp } from "../../utils/validation";
import { TenantRole } from "../../common/types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";

/**
 * Contrôleur pour la gestion multi-tenant
 */
export class TenantController {

  /**
   * Créer un nouveau tenant (organisation)
   */
  static createTenant = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const ipAddress = extractClientIp(req);

    try {
      // Validation des paramètres d'entrée
      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      const { name, slug, industry, size, planId, settings = {} } = req.body;

      // Validation des champs requis
      if (!name || !slug) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Le nom et le slug de l'organisation sont requis");
      }

      logger.info(`🚀 Début de création de tenant: ${name} (${slug}) par ${userId}`, {
        userId,
        name,
        slug,
        industry,
        size,
        planId,
        ipAddress
      });

      // Créer le tenant avec le service tenant
      const tenant = await tenantService.createTenant({
        name,
        slug,
        industry,
        size,
        planId,
        settings: {
          timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: settings.locale || 'fr-FR',
          currency: settings.currency || 'EUR'
        },
        createdBy: userId
      });

      logger.info(`✅ Tenant créé: ${tenant.id}`, { tenantId: tenant.id, userId });

      // Créer le membership pour l'utilisateur créateur (propriétaire)
      const membership = await tenantMembershipService.createMembership({
        tenantId: tenant.id,
        userId,
        role: TenantRole.OWNER,
        invitedBy: userId, // Auto-invitation
        featurePermissions: [] // Les permissions par défaut seront appliquées
      });

      logger.info(`✅ Membership créé: ${membership.id}`, { membershipId: membership.id, tenantId: tenant.id, userId });

      // Générer un nouveau token avec le contexte tenant
      const tenantContext = await tenantContextService.getTenantContext(userId, tenant.id);

      if (!tenantContext) {
        logger.error(`❌ Impossible de récupérer le contexte tenant`, { tenantId: tenant.id, userId });
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la configuration du contexte tenant");
      }

      const newTokens = await authService.generateTokensWithTenantContext(userId, tenantContext);

      const duration = Date.now() - startTime;
      logger.info(`✅ Tenant créé avec succès: ${name} (${tenant.slug}) par ${userId} en ${duration}ms`, {
        tenantId: tenant.id,
        userId,
        duration,
        ipAddress
      });

      // Réponse enrichie pour le frontend
      res.status(201).json({
        success: true,
        message: "Tenant créé avec succès",
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            planId: tenant.planId,
            status: tenant.status,
            settings: tenant.settings,
            createdAt: tenant.createdAt,
            // Informations supplémentaires pour la redirection
            isNewlyCreated: true,
            onboardingCompleted: false,
            onboardingCompletedAt: new Date()
          },
          membership: {
            id: membership.id,
            role: membership.role,
            featurePermissions: membership.featurePermissions,
            joinedAt: membership.joinedAt,
            isActive: membership.isActive
          },
          tenantContext: {
            tenant: {
              id: tenantContext.tenant.id,
              name: tenantContext.tenant.name,
              slug: tenantContext.tenant.slug,
              status: tenantContext.tenant.status,
              planId: tenantContext.tenant.planId,
              settings: tenantContext.tenant.settings
            },
            membership: {
              id: tenantContext.membership.id,
              role: tenantContext.membership.role,
              featurePermissions: tenantContext.membership.featurePermissions,
              isActive: tenantContext.membership.isActive,
              joinedAt: tenantContext.membership.joinedAt
            },
            features: tenantContext.features,
            subscription: tenantContext.subscription,
            plan: tenantContext.plan
          },
          tokens: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresIn: newTokens.expiresIn
          },
          user: {
            id: userId,
            email: req.user.email,
            role: membership.role
          },
          // Informations pour la redirection
          redirectInfo: {
            dashboardUrl: `/dashboard?tenant=${tenant.id}&firstAccess=true`,
            setupComplete: true,
            nextSteps: [
              'Explore your dashboard',
              'Invite team members',
              'Configure your first event'
            ]
          }
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      // Log détaillé de l'erreur
      logger.error(`❌ Erreur lors de la création du tenant après ${duration}ms`, {
        userId,
        error: error.message,
        stack: error.stack,
        code: error.code,
        ipAddress,
        duration
      });

      // Gestion spécifique des erreurs
      if (error.code === 'TENANT_SLUG_EXISTS') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, "Ce nom d'organisation est déjà utilisé", {
          field: 'slug',
          suggestedAction: 'Essayez un autre nom d\'organisation'
        });
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message, {
          validationErrors: error.details || []
        });
      }

      if (error.code === 'PERMISSION_DENIED') {
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permissions insuffisantes pour créer une organisation");
      }

      if (error.code === 'QUOTA_EXCEEDED') {
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Limite d'organisations atteinte pour votre plan", {
          suggestedAction: 'Mettez à niveau votre plan pour créer plus d\'organisations'
        });
      }

      // Erreur générique avec code d'erreur spécifique
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la création de l'organisation", {
        errorCode: 'TENANT_CREATION_FAILED',
        retryable: true,
        suggestedAction: 'Veuillez réessayer ou contacter le support si le problème persiste'
      });
    }
  });

  /**
   * Changer de contexte tenant
   */
  static switchTenantContext = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const ipAddress = extractClientIp(req);

    try {
      const { tenantId } = req.body;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "ID de tenant requis");
      }

      logger.info(`🔄 Début de changement de contexte tenant: ${tenantId} pour ${userId}`, {
        userId,
        tenantId,
        ipAddress
      });

      // Vérifier que l'utilisateur a accès à ce tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        logger.warn(`❌ Accès refusé au tenant: ${tenantId} pour ${userId}`, {
          membershipExists: !!membership,
          isActive: membership?.isActive
        });
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation", {
          errorCode: 'TENANT_ACCESS_DENIED',
          suggestedAction: 'Vérifiez que vous avez bien été invité à cette organisation'
        });
      }

      // Obtenir le contexte tenant complet
      const tenantContext = await tenantContextService.getTenantContext(userId, tenantId);
      if (!tenantContext) {
        logger.error(`❌ Contexte tenant non trouvé: ${tenantId} pour ${userId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Contexte d'organisation non trouvé", {
          errorCode: 'TENANT_CONTEXT_NOT_FOUND',
          retryable: true
        });
      }

      // Générer un nouveau token avec le contexte tenant
      const newTokens = await authService.generateTokensWithTenantContext(userId, tenantContext);

      const duration = Date.now() - startTime;
      logger.info(`✅ Changement de contexte tenant réussi: ${tenantId} pour ${userId} en ${duration}ms`, {
        userId,
        tenantId,
        duration,
        ipAddress
      });

      res.json({
        success: true,
        message: "Contexte d'organisation changé avec succès",
        data: {
          tokens: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresIn: newTokens.expiresIn
          },
          tenantContext: {
            tenantId: tenantContext.tenant.id,
            tenant: {
              id: tenantContext.tenant.id,
              name: tenantContext.tenant.name,
              slug: tenantContext.tenant.slug,
              status: tenantContext.tenant.status
            },
            membership: {
              id: tenantContext.membership.id,
              role: tenantContext.membership.role,
              featurePermissions: tenantContext.membership.featurePermissions,
              isActive: tenantContext.membership.isActive
            },
            features: tenantContext.features
          },
          // Informations pour la redirection
          redirectInfo: {
            dashboardUrl: `/dashboard?tenant=${tenantId}`,
            contextSwitched: true
          }
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Erreur lors du changement de contexte tenant après ${duration}ms`, {
        userId,
        tenantId: req.body.tenantId,
        error: error.message,
        duration,
        ipAddress
      });

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors du changement de contexte", {
        errorCode: 'TENANT_CONTEXT_SWITCH_FAILED',
        retryable: true,
        suggestedAction: 'Veuillez réessayer ou vous reconnecter si le problème persiste'
      });
    }
  });

  /**
   * Valider l'accès à un tenant (pour la redirection post-onboarding)
   */
  static validateTenantAccess = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "ID de tenant requis");
      }

      logger.info(`🔍 Validation d'accès au tenant: ${tenantId} pour ${userId}`);

      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        logger.warn(`❌ Tenant non trouvé: ${tenantId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Organisation non trouvée");
      }

      // Vérifier que l'utilisateur a accès à ce tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership) {
        logger.warn(`❌ Membership non trouvé: ${tenantId} pour ${userId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      if (!membership.isActive) {
        logger.warn(`❌ Membership inactif: ${tenantId} pour ${userId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Votre accès à cette organisation a été désactivé");
      }

      // Vérifier le statut du tenant
      if (tenant.status === 'suspended') {
        logger.warn(`❌ Tenant suspendu: ${tenantId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Cette organisation est temporairement suspendue");
      }

      logger.info(`✅ Accès au tenant validé: ${tenantId} pour ${userId}`);

      res.json({
        success: true,
        message: "Accès au tenant validé",
        data: {
          isValid: true,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status
          },
          membership: {
            id: membership.id,
            role: membership.role,
            featurePermissions: membership.featurePermissions,
            isActive: membership.isActive,
            joinedAt: membership.joinedAt
          },
          accessLevel: membership.role === 'owner' ? 'full' :
            membership.role === 'admin' ? 'admin' : 'member'
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error(`❌ Erreur lors de la validation d'accès au tenant:`, {
        tenantId: req.params.tenantId,
        userId: req.user?.uid,
        error: error.message
      });
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la validation d'accès");
    }
  });

  /**
   * Obtenir les tenants de l'utilisateur
   */
  static getUserTenants = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;

      // Utiliser le service pour obtenir les memberships de l'utilisateur
      const membershipsWithTenants = await tenantMembershipService.getMembershipsByUser(userId);

      // Transformer les données pour l'API
      const tenantMemberships = membershipsWithTenants.map(membership => ({
        id: membership.tenantId,
        name: membership.tenant?.name || 'Tenant inconnu',
        slug: membership.tenant?.slug || '',
        status: membership.tenant?.status || 'unknown',
        role: membership.role,
        featurePermissions: membership.featurePermissions,
        isActive: membership.isActive,
        joinedAt: membership.joinedAt,
        membership: {
          id: membership.id,
          role: membership.role,
          featurePermissions: membership.featurePermissions,
          joinedAt: membership.joinedAt
        }
      }));

      logger.info(`📋 Récupération des tenants pour ${userId}: ${tenantMemberships.length} tenants trouvés`);

      res.json({
        success: true,
        message: "Tenants récupérés avec succès",
        data: tenantMemberships
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la récupération des tenants:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la récupération des tenants");
    }
  });
}