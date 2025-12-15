import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { tenantService } from "../../services/tenant/tenant.service";
import { tenantMembershipService } from "../../services/tenant/tenant-membership.service";
import { tenantContextService } from "../../services/tenant/tenant-context.service";
import { authService } from "../../services/auth/auth.service";
import { AuthenticatedRequest } from "../../types";
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

  /**
   * Obtenir le statut d'onboarding d'un tenant
   */
  static getOnboardingStatus = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Récupérer le statut d'onboarding
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      const status = await setupWizardService.getSetupWizardStatus(tenantId);

      // Trouver la prochaine étape non complétée
      let nextStep: any = undefined;
      let nextStepUrl: string | undefined = undefined;
      
      if (!status.isComplete) {
        const steps: any[] = Array.isArray(status.steps) ? status.steps : [];
        // Trouver la première étape non complétée (dans l'ordre)
        const next = steps.find(s => !s.completed);
        
        if (next) {
          nextStep = {
            id: next.id,
            title: next.title,
            description: next.description,
            url: next.url,
            order: next.order,
            required: next.required
          };
          nextStepUrl = next.url;
        }
      }

      logger.info(`📊 Statut d'onboarding récupéré pour tenant ${tenantId}`, {
        tenantId,
        userId,
        isComplete: status.isComplete,
        nextStepId: nextStep?.id,
        currentStep: status.currentStep,
        totalSteps: status.totalSteps,
        completedSteps: status.completedSteps
      });

      res.json({
        success: true,
        data: {
          completed: !!status.isComplete,
          currentStep: status.currentStep,
          totalSteps: status.totalSteps,
          completedSteps: status.completedSteps,
          steps: status.steps,
          ...(nextStep ? { nextStep } : {}),
          ...(nextStepUrl ? { nextStepUrl } : {})
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la récupération du statut d'onboarding:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la récupération du statut d'onboarding");
    }
  });

  /**
   * Obtenir uniquement les étapes d'onboarding
   */
  static getOnboardingSteps = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Récupérer le statut d'onboarding
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      const status = await setupWizardService.getSetupWizardStatus(tenantId);

      logger.info(`📋 Étapes d'onboarding récupérées pour tenant ${tenantId}`, {
        tenantId,
        userId,
        totalSteps: status.steps.length,
        completedSteps: status.completedSteps.length
      });

      res.json({
        success: true,
        data: {
          steps: status.steps
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la récupération des étapes d'onboarding:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la récupération des étapes d'onboarding");
    }
  });

  /**
   * Marquer l'onboarding comme complété
   */
  static completeOnboarding = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Compléter l'onboarding
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      await setupWizardService.completeSetup(tenantId, userId);

      logger.info(`✅ Onboarding complété pour tenant ${tenantId} par ${userId}`, {
        tenantId,
        userId
      });

      res.json({
        success: true,
        message: "Onboarding completed"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la complétion de l'onboarding:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la complétion de l'onboarding");
    }
  });

  /**
   * Mettre à jour les paramètres du tenant
   */
  static updateTenantSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { settings } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Préparer les mises à jour
      const settingsUpdate: any = {};
      if (settings?.timezone) settingsUpdate.timezone = settings.timezone;
      if (settings?.locale) settingsUpdate.locale = settings.locale;
      if (settings?.currency) settingsUpdate.currency = settings.currency;

      const metadataUpdate: any = {};
      if (settings?.dateFormat) metadataUpdate.dateFormat = settings.dateFormat;
      if (settings?.timeFormat) metadataUpdate.timeFormat = settings.timeFormat;

      // Mettre à jour le tenant
      await tenantService.updateTenant(tenantId, {
        ...(Object.keys(settingsUpdate).length ? { settings: settingsUpdate } : {}),
        ...(Object.keys(metadataUpdate).length ? { metadata: metadataUpdate } : {}),
      });

      // Marquer l'étape settings comme complétée
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      
      // Déterminer quelle étape marquer selon les données reçues
      if (settings?.name || settings?.industry || settings?.size) {
        // Si on reçoit des données d'organisation, marquer organization_profile
        await setupWizardService.completeStep(tenantId, 'organization_profile', { settings });
      } else {
        // Sinon, marquer settings (timezone, locale, currency, formats)
        await setupWizardService.completeStep(tenantId, 'settings', { settings });
      }

      logger.info(`⚙️ Paramètres mis à jour pour tenant ${tenantId}`, {
        tenantId,
        userId,
        settingsUpdate,
        metadataUpdate
      });

      res.json({
        success: true,
        message: "Settings updated"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la mise à jour des paramètres:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la mise à jour des paramètres");
    }
  });

  /**
   * Mettre à jour la politique de présence du tenant
   */
  static updateAttendancePolicy = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { policy } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Mettre à jour la politique de présence
      await tenantService.updateTenant(tenantId, {
        metadata: { attendancePolicy: policy }
      });

      // Marquer l'étape attendance_policy comme complétée
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      await setupWizardService.completeStep(tenantId, 'attendance_policy', { policy });

      logger.info(`📋 Politique de présence mise à jour pour tenant ${tenantId}`, {
        tenantId,
        userId,
        policy
      });

      res.json({
        success: true,
        message: "Attendance policy updated"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la mise à jour de la politique de présence:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la mise à jour de la politique de présence");
    }
  });

  /**
   * Obtenir le membership de l'utilisateur pour un tenant
   */
  static getUserMembership = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      logger.info(`📋 Récupération du membership pour tenant ${tenantId} et utilisateur ${userId}`);

      // Récupérer le membership
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);

      if (!membership) {
        logger.warn(`❌ Membership non trouvé: ${tenantId} pour ${userId}`);
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Membership non trouvé pour ce tenant");
      }

      logger.info(`✅ Membership récupéré: ${membership.id}`, {
        tenantId,
        userId,
        role: membership.role,
        isActive: membership.isActive
      });

      res.json({
        success: true,
        data: {
          id: membership.id,
          tenantId: membership.tenantId,
          userId: membership.userId,
          role: membership.role,
          featurePermissions: membership.featurePermissions,
          isActive: membership.isActive,
          joinedAt: membership.joinedAt,
          invitedBy: membership.invitedBy,
          invitedAt: new Date()//membership.invitedAt
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la récupération du membership:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la récupération du membership");
    }
  });

  /**
   * Obtenir les invitations utilisateur d'un tenant
   */
  static getUserInvitations = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req.params;
      const userId = req.user?.uid;

      // Query parameters (déjà validés par le middleware Zod)
      const limit = parseInt(String(req.query.limit || '10'));
      const offset = parseInt(String(req.query.offset || '0'));
      const sortBy = (req.query.sortBy as string || 'createdAt') as 'createdAt' | 'email' | 'status';
      const sortOrder = (req.query.sortOrder as string || 'desc') as 'asc' | 'desc';
      const status = req.query.status as 'pending' | 'accepted' | 'rejected' | 'expired' | undefined;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Vérifier que l'utilisateur a les permissions pour voir les invitations
      if (!['owner', 'admin'].includes(membership.role)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permissions insuffisantes pour voir les invitations");
      }

      // Marquer les invitations expirées avant de récupérer la liste
      const { userInvitationService } = await import("../../services/invitation/user-invitation.service");
      await userInvitationService.markExpiredInvitations(tenantId);

      // Récupérer les invitations via le service
      const result = await userInvitationService.getInvitations({
        tenantId,
        limit,
        offset,
        sortBy,
        sortOrder,
        status
      });

      logger.info(`✅ ${result.invitations.length} invitations récupérées sur ${result.pagination.total}`, {
        tenantId,
        userId,
        total: result.pagination.total,
        returned: result.invitations.length
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la récupération des invitations:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la récupération des invitations");
    }
  });

  /**
   * Inviter plusieurs utilisateurs en masse
   */
  static bulkInviteUsers = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { tenantId } = req.params;
      const { emails } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Vérifier que l'utilisateur a les permissions pour inviter
      if (!['owner', 'admin'].includes(membership.role)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permissions insuffisantes pour inviter des utilisateurs");
      }

      logger.info(`📧 Début d'invitation en masse pour tenant ${tenantId}`, {
        tenantId,
        userId,
        emailCount: emails.length
      });

      // Préparer les invitations
      const invitations = (emails as string[]).map(email => ({
        email,
        firstName: '',
        lastName: '',
        role: 'member' as const
      }));

      // Envoyer les invitations via le service
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      const result = await setupWizardService.inviteUsers(tenantId, invitations, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Invitations en masse traitées pour tenant ${tenantId} en ${duration}ms`, {
        tenantId,
        userId,
        totalEmails: emails.length,
        successful: result.successful || 0,
        failed: result.failed || 0,
        errors: result.errors || [],
        duration
      });

      res.json({
        success: true,
        message: "Invitations processed",
        data: {
          total: emails.length,
          successful: result.successful || [],
          failed: result.failed || [],
          summary: {
            successCount: result.successful || 0,
            failureCount: result.failed || 0
          }
        }
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      
      logger.error(`❌ Erreur lors de l'invitation en masse après ${duration}ms`, {
        tenantId: req.params.tenantId,
        userId: req.user?.uid,
        error: error.message,
        duration
      });

      // Gestion spécifique des erreurs
      if (error.code === 'QUOTA_EXCEEDED') {
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Limite d'invitations atteinte pour votre plan", {
          suggestedAction: 'Mettez à niveau votre plan pour inviter plus d\'utilisateurs'
        });
      }

      if (error.code === 'INVALID_EMAIL') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Un ou plusieurs emails sont invalides", {
          details: error.details || []
        });
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de l'envoi des invitations", {
        errorCode: 'BULK_INVITE_FAILED',
        retryable: true,
        suggestedAction: 'Veuillez réessayer ou contacter le support si le problème persiste'
      });
    }
  });

  /**

   * Supprimer une invitation
   */
  static deleteInvitation = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId, invitationId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Vérifier que l'utilisateur a les permissions pour supprimer des invitations
      if (!['owner', 'admin'].includes(membership.role)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permissions insuffisantes pour supprimer des invitations");
      }

      // Vérifier que l'invitation existe et appartient au tenant
      const { userInvitationService } = await import("../../services/invitation/user-invitation.service");
      const invitation = await userInvitationService.getInvitationById(invitationId);

      if (!invitation) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invitation non trouvée");
      }

      if (invitation.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Cette invitation n'appartient pas à cette organisation");
      }

      // Supprimer l'invitation
      await userInvitationService.deleteInvitation(invitationId);

      logger.info(`🗑️ Invitation supprimée: ${invitationId}`, {
        tenantId,
        invitationId,
        userId,
        deletedEmail: invitation.email
      });

      res.json({
        success: true,
        message: "Invitation supprimée avec succès"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la suppression de l'invitation:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la suppression de l'invitation");
    }
  });

  /**
   * Renvoyer une invitation
   */
  static resendInvitation = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId, invitationId } = req.params;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Vérifier que l'utilisateur a les permissions pour renvoyer des invitations
      if (!['owner', 'admin'].includes(membership.role)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Permissions insuffisantes pour renvoyer des invitations");
      }

      // Vérifier que l'invitation existe et appartient au tenant
      const { userInvitationService } = await import("../../services/invitation/user-invitation.service");
      const invitation = await userInvitationService.getInvitationById(invitationId);

      if (!invitation) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invitation non trouvée");
      }

      if (invitation.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Cette invitation n'appartient pas à cette organisation");
      }

      // Vérifier que l'invitation peut être renvoyée
      if (invitation.status !== 'pending' && invitation.status !== 'expired') {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, `Impossible de renvoyer une invitation avec le statut: ${invitation.status}`);
      }

      // Renvoyer l'invitation
      const updatedInvitation = await userInvitationService.resendInvitation(invitationId);

      logger.info(`📧 Invitation renvoyée: ${invitationId}`, {
        tenantId,
        invitationId,
        userId,
        email: updatedInvitation.email,
        newExpiresAt: updatedInvitation.expiresAt
      });

      res.json({
        success: true,
        message: "Invitation renvoyée avec succès",
        data: {
          invitation: updatedInvitation
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors du renvoi de l'invitation:", error);
      
      if (error.message === 'Invitation not found') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invitation non trouvée");
      }
      
      if (error.message.includes('Cannot resend invitation')) {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors du renvoi de l'invitation");
    }
  });

  /**
   * Marquer une étape d'onboarding comme complétée
   */
  static completeOnboardingStep = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId, stepId } = req.params;
      const { stepData } = req.body;
      const userId = req.user?.uid;

      if (!userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Utilisateur non authentifié");
      }

      // Vérifier l'accès au tenant
      const membership = await tenantMembershipService.getMembershipByUser(tenantId, userId);
      if (!membership || !membership.isActive) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Accès refusé à cette organisation");
      }

      // Marquer l'étape comme complétée
      const { setupWizardService } = await import("../../services/onboarding/setup-wizard.service");
      const status = await setupWizardService.completeStep(tenantId, stepId, stepData);

      logger.info(`✅ Étape d'onboarding complétée: ${stepId} pour tenant ${tenantId}`, {
        tenantId,
        stepId,
        userId,
        isComplete: status.isComplete
      });

      res.json({
        success: true,
        message: "Step completed successfully",
        data: {
          stepId,
          completed: true,
          onboardingComplete: status.isComplete,
          nextStep: status.steps.find(step => !step.completed)
        }
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Erreur lors de la complétion de l'étape d'onboarding:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Erreur lors de la complétion de l'étape d'onboarding");
    }
  });
}