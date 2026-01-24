import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { importService } from "../../services/import/import.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  BulkImportRequest,
  ImportType
} from "../../common/types/import.types";

export class ImportController {

  /**
   * Prévisualiser un import CSV
   */
  static previewImport = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const { csvData, type } = req.body;

      if (!csvData || !type) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "CSV data and import type are required");
      }

      if (!Object.values(ImportType).includes(type)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Invalid import type");
      }

      logger.info(`🔍 Previewing import for tenant: ${tenantId}`, {
        type,
        tenantId,
        userId,
        dataLength: csvData.length
      });

      const preview = await importService.previewImport(csvData, type, tenantId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Import preview completed in ${duration}ms`, {
        tenantId,
        type,
        totalRows: preview.validation.totalRows,
        validRows: preview.validation.validRows,
        errors: preview.validation.errors.length,
        warnings: preview.validation.warnings.length,
        duplicates: preview.validation.duplicates.length,
        duration
      });

      res.json({
        success: true,
        data: preview
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error previewing import after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to preview import");
    }
  });

  /**
   * Exécuter un import en lot
   */
  static bulkImport = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const bulkRequest: BulkImportRequest = req.body;

      // Validation des champs requis
      if (!bulkRequest.csvData || !bulkRequest.type || !bulkRequest.options) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "CSV data, type, and options are required");
      }

      if (!Object.values(ImportType).includes(bulkRequest.type)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Invalid import type");
      }

      logger.info(`🚀 Starting bulk import for tenant: ${tenantId}`, {
        type: bulkRequest.type,
        tenantId,
        userId,
        options: bulkRequest.options,
        dataLength: bulkRequest.csvData.length
      });

      const result = await importService.bulkImport(bulkRequest, tenantId, userId);

      const duration = Date.now() - startTime;
      logger.info(`✅ Bulk import completed in ${duration}ms`, {
        tenantId,
        type: bulkRequest.type,
        totalProcessed: result.totalProcessed,
        successCount: result.successCount,
        errorCount: result.errorCount,
        skippedCount: result.skippedCount,
        duration
      });

      res.status(201).json({
        success: true,
        message: `Import completed: ${result.successCount} created, ${result.errorCount} errors, ${result.skippedCount} skipped`,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);

      logger.error(`❌ Error during bulk import after ${duration}ms`, {
        userId,
        tenantId,
        error: error.message,
        duration
      });

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      if (error.code === 'CONFLICT') {
        return errorHandler.sendError(res, ERROR_CODES.CONFLICT, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to process bulk import");
    }
  });

  /**
   * Obtenir les templates CSV pour l'import
   */
  static getImportTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const type = req.params.type as string;

      if (!type || !Object.values(ImportType).includes(type as ImportType)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Valid import type is required");
      }

      const templates = {
        [ImportType.VOLUNTEERS]: {
          headers: ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Département', 'Compétences', 'Notes'],
          example: [
            'Jean', 'Dupont', 'jean.dupont@example.com', '+33123456789', 'Bénévole', 'Logistique', 'Organisation, Communication', 'Disponible le weekend'
          ],
          csvTemplate: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Compétences,Notes\nJean,Dupont,jean.dupont@example.com,+33123456789,Bénévole,Logistique,"Organisation, Communication",Disponible le weekend'
        },
        [ImportType.PARTICIPANTS]: {
          headers: ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Département', 'Notes'],
          example: [
            'Marie', 'Martin', 'marie.martin@example.com', '+33987654321', 'Participant', 'Marketing', 'Intéressée par les ateliers'
          ],
          csvTemplate: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Notes\nMarie,Martin,marie.martin@example.com,+33987654321,Participant,Marketing,Intéressée par les ateliers'
        },
        [ImportType.USERS]: {
          headers: ['Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Département', 'Compétences', 'Notes'],
          example: [
            'Pierre', 'Durand', 'pierre.durand@example.com', '+33555666777', 'Organisateur', 'Direction', 'Management, Planification', 'Responsable événements'
          ],
          csvTemplate: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Compétences,Notes\nPierre,Durand,pierre.durand@example.com,+33555666777,Organisateur,Direction,"Management, Planification",Responsable événements'
        }
      };

      res.json({
        success: true,
        data: templates[type as ImportType]
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting import templates:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get import templates");
    }
  });

  /**
   * Télécharger un template CSV
   */
  static downloadTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const type = req.params.type as string;

      if (!type || !Object.values(ImportType).includes(type as ImportType)) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, "Valid import type is required");
      }

      const templates = {
        [ImportType.VOLUNTEERS]: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Compétences,Notes\nJean,Dupont,jean.dupont@example.com,+33123456789,Bénévole,Logistique,"Organisation, Communication",Disponible le weekend',
        [ImportType.PARTICIPANTS]: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Notes\nMarie,Martin,marie.martin@example.com,+33987654321,Participant,Marketing,Intéressée par les ateliers',
        [ImportType.USERS]: 'Prénom,Nom,Email,Téléphone,Rôle,Département,Compétences,Notes\nPierre,Durand,pierre.durand@example.com,+33555666777,Organisateur,Direction,"Management, Planification",Responsable événements'
      };

      const csvContent = templates[type as ImportType];
      const filename = `template_${type}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

      res.send(csvContent);

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error downloading template:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to download template");
    }
  });

  /**
   * Obtenir l'historique des imports
   */
  static getImportHistory = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const { page = 1, limit = 20, type, status } = req.query;

      const result = await importService.getImportHistory(tenantId, {
        page: Number(page),
        limit: Number(limit),
        type: type as ImportType,
        status: status as string
      });

      res.json({
        success: true,
        data: result.jobs,
        pagination: result.pagination
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting import history:", error);

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get import history");
    }
  });

  /**
   * Obtenir un job d'import spécifique
   */
  static getImportJob = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jobId = req.params.jobId as string;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const job = await importService.getImportJob(jobId, tenantId);

      if (!job) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Import job not found");
      }

      res.json({
        success: true,
        data: job
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting import job:", error);

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get import job");
    }
  });

  /**
   * Annuler un job d'import
   */
  static cancelImportJob = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const jobId = req.params.jobId as string;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      await importService.cancelImportJob(jobId, tenantId, userId);

      res.json({
        success: true,
        message: "Import job cancelled successfully"
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error cancelling import job:", error);

      if (error.code === 'VALIDATION_ERROR') {
        return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, error.message);
      }

      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to cancel import job");
    }
  });
}