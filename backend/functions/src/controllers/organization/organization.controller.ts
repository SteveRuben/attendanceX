import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { organizationService } from "../../services/organization/organization.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  OrganizationSettings,
  OrganizationBranding
} from "../../types/organization.types";

export class OrganizationController {

  static createOrganization = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.tenantContext?.tenant?.id;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateOrganizationRequest = req.body;

      // Validation des champs requis
      if (!createRequest.name || !createRequest.displayName || !createRequest.subdomain) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Name, display name, and subdomain are required");
      }

      logger.info(`🚀 Creating organization: ${createRequest.name}`, {
        userId,
        tenantId,
        organizationName: createRequest.name,
        subdomain: createRequest.subdomain
      });

      const organization = await organizationService.createOrganization(createRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Organization created successfully: ${organization.id} in ${duration}ms`, {
        organizationId: organization.id,
        userId,
        tenantId,
        duration
      });

      res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: organization
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error creating organization after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create organization");
    }
  });
  static getOrganization = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.organizationId as string;
      const tenantId = req.tenantContext?.tenant?.id;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const organization = await organizationService.getOrganization(organizationId, tenantId);

      if (!organization) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Organization not found");
      }

      res.json({
        success: true,
        data: organization
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting organization:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get organization");
    }
  });

  static getTenantOrganization = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantContext?.tenant?.id;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const organization = await organizationService.getOrganizationByTenant(tenantId);

      if (!organization) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Organization not found for this tenant");
      }

      res.json({
        success: true,
        data: organization
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting organization by tenant:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get organization");
    }
  });

  static updateOrganization = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.organizationId as string;
      const tenantId = req.tenantContext?.tenant?.id;
      const updateRequest: UpdateOrganizationRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const organization = await organizationService.updateOrganization(organizationId, updateRequest, tenantId);

      logger.info(`✅ Organization updated: ${organizationId}`, {
        organizationId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Organization updated successfully",
        data: organization
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating organization:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update organization");
    }
  });

  static updateOrganizationSettings = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.organizationId as string;
      const tenantId = req.tenantContext?.tenant?.id;
      const settings: Partial<OrganizationSettings> = req.body.settings;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const organization = await organizationService.updateOrganization(organizationId, { settings }, tenantId);

      logger.info(`⚙️ Organization settings updated: ${organizationId}`, {
        organizationId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Organization settings updated successfully",
        data: organization
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating organization settings:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update organization settings");
    }
  });

  static updateOrganizationBranding = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.organizationId as string;
      const tenantId = req.tenantContext?.tenant?.id;
      const branding: Partial<OrganizationBranding> = req.body.branding;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const organization = await organizationService.updateOrganization(organizationId, { branding }, tenantId);

      logger.info(`🎨 Organization branding updated: ${organizationId}`, {
        organizationId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Organization branding updated successfully",
        data: organization
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating organization branding:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update organization branding");
    }
  });

  static deleteOrganization = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.params.organizationId as string;
      const tenantId = req.tenantContext?.tenant?.id;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      await organizationService.deleteOrganization(organizationId, tenantId);

      logger.info(`🗑️ Organization deleted: ${organizationId}`, {
        organizationId,
        tenantId,
        userId: req.user?.uid
      });

      res.json({
        success: true,
        message: "Organization deleted successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error deleting organization:", error);

      if (error.code === 'NOT_FOUND') {
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to delete organization");
    }
  });

  static checkDomainAvailability = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const domain = req.params.domain as string;

      const result = await organizationService.checkDomainAvailability(domain);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error checking domain availability:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to check domain availability");
    }
  });
}