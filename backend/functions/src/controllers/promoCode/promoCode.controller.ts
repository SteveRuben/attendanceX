import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncHandler } from "../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../types";
import { 
  CreatePromoCodeRequest, 
  UpdatePromoCodeRequest,
  PromoCodeFilters,
  PromoCodeQueryOptions,
  PromoCodeValidationContext
} from "../../models/promoCode.model";
import { 
  promoCodeService,
  UsageReportFilters
} from "../../services/promoCode/promoCode.service";

/**
 * Contrôleur pour la gestion des codes promotionnels
 */
export class PromoCodeController {

  /**
   * Créer un nouveau code promo
   * POST /api/v1/promo-codes
   */
  static createPromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.uid;
    const createRequest: CreatePromoCodeRequest = req.body;

    logger.info(`Creating promo code: ${createRequest.code} by user ${userId}`);

    // Validation de base
    if (!createRequest.code || !createRequest.name || !createRequest.discountType || !createRequest.discountValue) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: code, name, discountType, discountValue"
      });
    }

    try {
      const promoCode = await promoCodeService.createPromoCode(createRequest, userId);

      logger.info(`Promo code created successfully: ${promoCode.id}`);

      return res.status(201).json({
        success: true,
        data: promoCode,
        message: "Promo code created successfully"
      });

    } catch (error: any) {
      logger.error("Error creating promo code:", error);

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: "A promo code with this code already exists"
        });
      }

      if (error.message.includes("validation")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to create promo code"
      });
    }
  });

  /**
   * Obtenir un code promo par ID
   * GET /api/v1/promo-codes/:promoCodeId
   */
  static getPromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCodeId = req.params.promoCodeId as string;

    try {
      const promoCode = await promoCodeService.getPromoCode(promoCodeId);

      if (!promoCode) {
        return res.status(404).json({
          success: false,
          error: "Promo code not found"
        });
      }

      return res.json({
        success: true,
        data: promoCode
      });

    } catch (error: any) {
      logger.error("Error getting promo code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get promo code"
      });
    }
  });

  /**
   * Lister les codes promo avec filtres et pagination
   * GET /api/v1/promo-codes
   */
  static listPromoCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      isActive,
      discountType,
      tenantId,
      createdBy,
      search,
      limit = "50",
      offset = "0",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    try {
      const filters: PromoCodeFilters = {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        discountType: discountType as any,
        tenantId: tenantId as string,
        createdBy: createdBy as string,
        search: search as string
      };

      const options: PromoCodeQueryOptions = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      };

      const result = await promoCodeService.listPromoCodes(filters, options);

      return res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      logger.error("Error listing promo codes:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to list promo codes"
      });
    }
  });

  /**
   * Mettre à jour un code promo
   * PUT /api/v1/promo-codes/:promoCodeId
   */
  static updatePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCodeId = req.params.promoCodeId as string;
    const updateRequest: UpdatePromoCodeRequest = req.body;

    try {
      const promoCode = await promoCodeService.updatePromoCode(promoCodeId, updateRequest);

      logger.info(`Promo code updated: ${promoCodeId}`);

      return res.json({
        success: true,
        data: promoCode,
        message: "Promo code updated successfully"
      });

    } catch (error: any) {
      logger.error("Error updating promo code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Promo code not found"
        });
      }

      if (error.message.includes("validation")) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to update promo code"
      });
    }
  });

  /**
   * Supprimer un code promo
   * DELETE /api/v1/promo-codes/:promoCodeId
   */
  static deletePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCodeId = req.params.promoCodeId as string;

    try {
      await promoCodeService.deletePromoCode(promoCodeId);

      logger.info(`Promo code deleted: ${promoCodeId}`);

      return res.json({
        success: true,
        message: "Promo code deleted successfully"
      });

    } catch (error: any) {
      logger.error("Error deleting promo code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Promo code not found"
        });
      }

      if (error.message.includes("existing usages")) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete promo code with existing usages. Deactivate it instead."
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to delete promo code"
      });
    }
  });

  /**
   * Valider un code promo
   * POST /api/v1/promo-codes/validate
   */
  static validatePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code, planId, subscriptionAmount } = req.body;
    const userId = req.user!.uid;
    const tenantId = req.tenantContext?.tenantId;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Promo code is required"
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "Tenant context is required"
      });
    }

    try {
      const context: PromoCodeValidationContext = {
        userId,
        tenantId,
        planId,
        subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount) : undefined,
        isNewUser: true // TODO: Déterminer si l'utilisateur est nouveau
      };

      const validationResult = await promoCodeService.validateCode(code, context);

      return res.json({
        success: true,
        data: validationResult
      });

    } catch (error: any) {
      logger.error("Error validating promo code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to validate promo code"
      });
    }
  });

  /**
   * Appliquer un code promo
   * POST /api/v1/promo-codes/apply
   */
  static applyPromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code, subscriptionId, subscriptionAmount } = req.body;
    const userId = req.user!.uid;
    const tenantId = req.tenantContext?.tenantId;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!code || !subscriptionId || !subscriptionAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: code, subscriptionId, subscriptionAmount"
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "Tenant context is required"
      });
    }

    try {
      const applicationResult = await promoCodeService.applyCode(
        code,
        userId,
        subscriptionId,
        tenantId,
        parseFloat(subscriptionAmount),
        ipAddress,
        userAgent
      );

      if (!applicationResult.success) {
        return res.status(400).json({
          success: false,
          error: applicationResult.error,
          errorCode: applicationResult.errorCode
        });
      }

      logger.info(`Promo code applied: ${code} for user ${userId}`);

      return res.json({
        success: true,
        data: {
          promoCodeUsage: applicationResult.promoCodeUsage,
          discountApplied: applicationResult.discountApplied,
          finalAmount: applicationResult.finalAmount
        },
        message: "Promo code applied successfully"
      });

    } catch (error: any) {
      logger.error("Error applying promo code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to apply promo code"
      });
    }
  });

  /**
   * Révoquer l'utilisation d'un code promo
   * DELETE /api/v1/promo-codes/usage/:usageId
   */
  static revokePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const usageId = req.params.usageId as string;

    try {
      await promoCodeService.revokeCode(usageId);

      logger.info(`Promo code usage revoked: ${usageId}`);

      return res.json({
        success: true,
        message: "Promo code usage revoked successfully"
      });

    } catch (error: any) {
      logger.error("Error revoking promo code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Promo code usage not found"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to revoke promo code usage"
      });
    }
  });

  /**
   * Obtenir les statistiques d'un code promo
   * GET /api/v1/promo-codes/:promoCodeId/stats
   */
  static getPromoCodeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCodeId = req.params.promoCodeId as string;

    try {
      const stats = await promoCodeService.getPromoCodeStats(promoCodeId);

      return res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      logger.error("Error getting promo code stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get promo code statistics"
      });
    }
  });

  /**
   * Générer un rapport d'utilisation
   * GET /api/v1/promo-codes/usage-report
   */
  static getUsageReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      promoCodeId,
      userId,
      tenantId,
      dateFrom,
      dateTo
    } = req.query;

    try {
      const filters: UsageReportFilters = {
        promoCodeId: promoCodeId as string,
        userId: userId as string,
        tenantId: tenantId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined
      };

      const report = await promoCodeService.getUsageReport(filters);

      return res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      logger.error("Error generating usage report:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate usage report"
      });
    }
  });

  /**
   * Activer/désactiver un code promo
   * PUT /api/v1/promo-codes/:promoCodeId/toggle
   */
  static togglePromoCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCodeId = req.params.promoCodeId as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "isActive must be a boolean value"
      });
    }

    try {
      const promoCode = await promoCodeService.updatePromoCode(promoCodeId, { isActive });

      logger.info(`Promo code ${isActive ? 'activated' : 'deactivated'}: ${promoCodeId}`);

      return res.json({
        success: true,
        data: promoCode,
        message: `Promo code ${isActive ? 'activated' : 'deactivated'} successfully`
      });

    } catch (error: any) {
      logger.error("Error toggling promo code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          error: "Promo code not found"
        });
      }

      return res.status(500).json({
        success: false,
        error: "Failed to toggle promo code"
      });
    }
  });

  /**
   * Obtenir un code promo par son code (pour validation publique)
   * GET /api/v1/promo-codes/by-code/:code
   */
  static getPromoCodeByCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const code = req.params.code as string;

    try {
      const promoCode = await promoCodeService.getPromoCodeByCode(code);

      if (!promoCode) {
        return res.status(404).json({
          success: false,
          error: "Promo code not found"
        });
      }

      // Retourner seulement les informations publiques
      const publicInfo = {
        id: promoCode.id,
        code: promoCode.code,
        name: promoCode.name,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        isActive: promoCode.isActive,
        validFrom: promoCode.validFrom,
        validUntil: promoCode.validUntil,
        minimumAmount: promoCode.minimumAmount,
        newUsersOnly: promoCode.newUsersOnly
      };

      return res.json({
        success: true,
        data: publicInfo
      });

    } catch (error: any) {
      logger.error("Error getting promo code by code:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to get promo code"
      });
    }
  });

  /**
   * Générer des codes promo en masse
   * POST /api/v1/promo-codes/bulk-generate
   */
  static bulkGeneratePromoCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      baseName,
      count,
      discountType,
      discountValue,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser
    } = req.body;
    const userId = req.user!.uid;

    if (!baseName || !count || !discountType || !discountValue) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: baseName, count, discountType, discountValue"
      });
    }

    if (count > 100) {
      return res.status(400).json({
        success: false,
        error: "Cannot generate more than 100 codes at once"
      });
    }

    try {
      const generatedCodes = [];
      const errors = [];

      for (let i = 1; i <= count; i++) {
        try {
          const codeRequest: CreatePromoCodeRequest = {
            code: `${baseName.toUpperCase()}${i.toString().padStart(3, '0')}`,
            name: `${baseName} - Code ${i}`,
            discountType,
            discountValue,
            validFrom: validFrom ? new Date(validFrom) : new Date(),
            validUntil: validUntil ? new Date(validUntil) : undefined,
            maxUses,
            maxUsesPerUser
          };

          const promoCode = await promoCodeService.createPromoCode(codeRequest, userId);
          generatedCodes.push(promoCode);

        } catch (error: any) {
          errors.push(`Failed to create code ${i}: ${error.message}`);
        }
      }

      logger.info(`Bulk generated ${generatedCodes.length} promo codes, ${errors.length} errors`);

      return res.json({
        success: true,
        data: {
          generated: generatedCodes,
          generatedCount: generatedCodes.length,
          errorCount: errors.length,
          errors: errors.slice(0, 10) // Limiter les erreurs affichées
        },
        message: `Generated ${generatedCodes.length} promo codes successfully`
      });

    } catch (error: any) {
      logger.error("Error in bulk generation:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to generate promo codes"
      });
    }
  });
}