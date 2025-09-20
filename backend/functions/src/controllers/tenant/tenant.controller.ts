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
    try {
      const { name, slug, industry: _industry, size: _size, planId = 'basic', settings = {} } = req.body;
      const userId = req.user.uid;
      // @ts-ignore
      const _ipAddress = extractClientIp(req);
      // Note: industry, size, and ipAddress are available but not currently used in tenant creation

      // Créer le tenant avec le service tenant
      const tenant = await tenantService.createTenant({
        name,
        slug,
        planId,
        settings: {
          timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: settings.locale || 'fr-FR',
          currency: settings.currency || 'EUR'
        },
        createdBy: userId
      });

      // Créer le membership pour l'utilisateur créateur (propriétaire)
      const membership = await tenantMembershipService.createMembership({
        tenantId: tenant.id,
        userId,
        role: TenantRole.OWNER,
        invitedBy: userId, // Auto-invitation
        permissions: [] // Les permissions par défaut seront appliquées
      });

      // Générer un nouveau token avec le contexte tenant
      const tenantContext = await tenantContextService.getTenantContext(userId, tenant.id);
      const newTokens = await authService.generateTokensWithTenantContext(userId, tenantContext);

      logger.info(`✅ Tenant créé avec succès: ${name} (${tenant.slug}) par ${userId}`);

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
            createdAt: tenant.createdAt
          },
          membership: {
            id: membership.id,
            role: membership.role,
            permissions: membership.permissions,
            joinedAt: membership.joinedAt
          },
          tokens: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresIn: newTokens.expiresIn
          }
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      if (error.code === 'TENANT_SLUG_EXISTS') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, "Ce nom d'organisation est déjà utilisé");
      }

      logger.error("Erreur lors de la création du tenant:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la création du tenant");
    }
  });

  /**
   * Changer de contexte tenant
   */
  static switchTenantContext = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.body;
      const userId = req.user.uid;

      // Vérifier que l'utilisateur a accès à ce tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à ce tenant");
      }

      // Obtenir le contexte tenant complet
      const tenantContext = await tenantContextService.getTenantContext(userId, tenantId);
      if (!tenantContext) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Contexte tenant non trouvé");
      }

      // Générer un nouveau token avec le contexte tenant
      const newTokens = await authService.generateTokensWithTenantContext(userId, tenantContext);

      logger.info(`🔄 Changement de contexte tenant: ${tenantId} pour ${userId}`);

      res.json({
        success: true,
        message: "Contexte tenant changé avec succès",
        data: {
          token: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: newTokens.expiresIn,
          tenantContext: {
            tenant: {
              id: tenantContext.tenant.id,
              name: tenantContext.tenant.name,
              slug: tenantContext.tenant.slug,
              status: tenantContext.tenant.status
            },
            membership: {
              id: tenantContext.membership.id,
              role: tenantContext.membership.role,
              permissions: tenantContext.membership.permissions,
              isActive: tenantContext.membership.isActive
            },
            features: tenantContext.plan?.features || {}
          }
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors du changement de contexte tenant:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors du changement de contexte");
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
        permissions: membership.permissions,
        isActive: membership.isActive,
        joinedAt: membership.joinedAt,
        membership: {
          id: membership.id,
          role: membership.role,
          permissions: membership.permissions,
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