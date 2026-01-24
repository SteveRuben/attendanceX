/**
 * Contrôleur pour la gestion des codes d'activité
 */

import { Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { activityCodeService } from '../../services';
import { collections } from '../../config/database';
import { logger } from 'firebase-functions';
import { AuthErrorHandler } from '../../utils/auth';
import { ERROR_CODES } from '../../common/constants';

export class ActivityCodeController {
  /**
   * Créer un nouveau code d'activité
   */
  static createActivityCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const activityCodeData = req.body;
    const tenantId = req.tenantContext?.tenantId;
    const createdBy = req.user?.uid;

    if (!tenantId || !createdBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    const activityCode = await activityCodeService.createActivityCode({
      ...activityCodeData,
      tenantId,
      createdBy
    });

    logger.info(`🚀 Activity code created: ${activityCode.id}`, {
      activityCodeId: activityCode.id,
      tenantId,
      userId: createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Code d\'activité créé avec succès',
      data: activityCode.toAPI()
    });
  });

  /**
   * Obtenir un code d'activité par ID
   */
  static getActivityCodeById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const activityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    res.json({
      success: true,
      data: activityCode.toAPI()
    });
  });

  /**
   * Obtenir la liste des codes d'activité du tenant
   */
  static getTenantActivityCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'name',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      category: req.query.category as string | undefined,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      projectSpecific: req.query.projectSpecific === 'true' ? true : req.query.projectSpecific === 'false' ? false : undefined,
      parentId: req.query.parentId as string | undefined,
      searchTerm: req.query.search as string | undefined,
      includeInactive: req.query.includeInactive === 'true'
    };

    const result = await activityCodeService.getActivityCodes(tenantId, options);

    res.json({
      success: true,
      data: result.data.map(code => code.toAPI()),
      pagination: result.pagination
    });
  });

  /**
   * Obtenir l'arbre hiérarchique des codes d'activité
   */
  static getActivityCodeTree = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const { category, projectId } = req.query;

    const tree = await activityCodeService.getActivityCodeTree(tenantId, {
      category: category as string | undefined,
      projectId: projectId as string | undefined
    });

    res.json({
      success: true,
      data: tree
    });
  });

  /**
   * Mettre à jour un code d'activité
   */
  static updateActivityCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;
    const updates = req.body;
    const updatedBy = req.user?.uid;

    if (!tenantId || !updatedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    const activityCode = await activityCodeService.updateActivityCode(id, tenantId, updates, updatedBy);

    logger.info(`✅ Activity code updated: ${id}`, {
      activityCodeId: id,
      tenantId,
      userId: updatedBy
    });

    res.json({
      success: true,
      message: 'Code d\'activité mis à jour avec succès',
      data: activityCode.toAPI()
    });
  });

  /**
   * Supprimer un code d'activité
   */
  static deleteActivityCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;
    const deletedBy = req.user?.uid;

    if (!tenantId || !deletedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    await activityCodeService.deleteActivityCode(id, tenantId, deletedBy);

    logger.info(`🗑️ Activity code deleted: ${id}`, {
      activityCodeId: id,
      tenantId,
      userId: deletedBy
    });

    res.json({
      success: true,
      message: 'Code d\'activité supprimé avec succès'
    });
  });

  /**
   * Activer/Désactiver un code d'activité
   */
  static toggleActivityCodeStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;
    const { isActive } = req.body;
    const changedBy = req.user?.uid;

    if (!tenantId || !changedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    const activityCode = await activityCodeService.updateActivityCode(id, tenantId, { isActive }, changedBy);

    logger.info(`✅ Activity code status toggled: ${id}`, {
      activityCodeId: id,
      tenantId,
      userId: changedBy,
      isActive
    });

    res.json({
      success: true,
      message: `Code d'activité ${isActive ? 'activé' : 'désactivé'} avec succès`,
      data: activityCode.toAPI()
    });
  });

  /**
   * Rechercher des codes d'activité
   */
  static searchActivityCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const filters = {
      query: req.query.query as string | undefined,
      category: req.query.category as string | undefined,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      projectSpecific: req.query.projectSpecific === 'true' ? true : req.query.projectSpecific === 'false' ? false : undefined,
      limit: parseInt(req.query.limit as string) || 10
    };

    const activityCodes = await activityCodeService.searchActivityCodes(tenantId, filters);

    res.json({
      success: true,
      data: activityCodes.map(code => code.toAPI())
    });
  });

  /**
   * Obtenir les catégories de codes d'activité
   */
  static getActivityCodeCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const categories = await activityCodeService.getCategories(tenantId);

    res.json({
      success: true,
      data: categories
    });
  });

  /**
   * Obtenir les statistiques d'utilisation d'un code d'activité
   */
  static getActivityCodeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const { startDate, endDate } = req.query;

    const stats = await activityCodeService.getActivityCodeStats(id, tenantId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined
    });

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Import en lot de codes d'activité
   */
  static bulkImportActivityCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { activityCodes } = req.body;
    const tenantId = req.tenantContext?.tenantId;
    const importedBy = req.user?.uid;

    if (!tenantId || !importedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    if (!Array.isArray(activityCodes) || activityCodes.length === 0) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Activity codes array is required');
    }

    const results = {
      imported: [] as any[],
      failed: [] as { entry: any; error: string }[]
    };

    for (const codeData of activityCodes) {
      try {
        const activityCode = await activityCodeService.createActivityCode({
          ...codeData,
          tenantId,
          createdBy: importedBy
        });
        results.imported.push(activityCode.toAPI());
      } catch (error) {
        results.failed.push({
          entry: codeData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`📦 Bulk import completed: ${results.imported.length} imported, ${results.failed.length} failed`, {
      tenantId,
      userId: importedBy,
      totalImported: results.imported.length,
      totalFailed: results.failed.length
    });

    res.status(201).json({
      success: true,
      message: `${results.imported.length} codes d'activité importés avec succès, ${results.failed.length} échecs`,
      data: results
    });
  });

  /**
   * Dupliquer un code d'activité
   */
  static duplicateActivityCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const tenantId = req.tenantContext?.tenantId;
    const { newCode, newName } = req.body;
    const createdBy = req.user?.uid;

    if (!tenantId || !createdBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    // Obtenir le code d'activité original
    const originalCode = await activityCodeService.getActivityCodeById(id, tenantId);
    const originalData = originalCode.getData();

    // Créer le nouveau code d'activité
    const activityCode = await activityCodeService.createActivityCode({
      ...originalData,
      code: newCode || `${originalData.code}_copy`,
      name: newName || `${originalData.name} (Copie)`,
      tenantId,
      createdBy
    });

    logger.info(`📋 Activity code duplicated: ${id} -> ${activityCode.id}`, {
      originalId: id,
      newId: activityCode.id,
      tenantId,
      userId: createdBy
    });

    res.status(201).json({
      success: true,
      message: 'Code d\'activité dupliqué avec succès',
      data: activityCode.toAPI()
    });
  });

  /**
   * Obtenir les codes d'activité par projet
   */
  static getProjectActivityCodes = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.params.projectId as string;
    const tenantId = req.tenantContext?.tenantId;

    if (!tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Tenant context required');
    }

    const tree = await activityCodeService.getActivityCodeTree(tenantId, {
      projectId: projectId
    });

    res.json({
      success: true,
      data: tree
    });
  });

  /**
   * Assigner un code d'activité à un projet
   */
  static assignToProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = req.params.id as string;
    const { projectId } = req.body;
    const tenantId = req.tenantContext?.tenantId;
    const updatedBy = req.user?.uid;

    if (!tenantId || !updatedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    // Validation des paramètres
    if (!projectId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Project ID is required');
    }

    // Vérifier que le code d'activité existe
    const activityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    // Vérifier que le projet existe et appartient au même tenant
    const projectDoc = await collections.projects.doc(projectId).get();
    if (!projectDoc.exists) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, 'Project not found');
    }

    const projectData = projectDoc.data();
    if (projectData?.tenantId !== tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, 'Project does not belong to your organization');
    }

    // Vérifier si le code d'activité est déjà assigné au projet
    const currentActivityCodes = projectData?.activityCodes || [];
    if (currentActivityCodes.includes(id)) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.CONFLICT, 'Activity code is already assigned to this project');
    }

    // Marquer le code d'activité comme spécifique au projet s'il ne l'est pas déjà
    if (!activityCode.getData().projectSpecific) {
      await activityCodeService.updateActivityCode(id, tenantId, {
        projectSpecific: true
      }, updatedBy);
    }

    // Ajouter le code d'activité au projet
    const updatedActivityCodes = [...currentActivityCodes, id];
    await collections.projects.doc(projectId).update({
      activityCodes: updatedActivityCodes,
      updatedAt: new Date()
    });

    // Récupérer le code d'activité mis à jour
    const updatedActivityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    logger.info(`🔗 Activity code assigned to project: ${id} -> ${projectId}`, {
      activityCodeId: id,
      projectId,
      tenantId,
      userId: updatedBy
    });

    return res.json({
      success: true,
      message: 'Code d\'activité assigné au projet avec succès',
      data: {
        activityCode: updatedActivityCode.toAPI(),
        projectId: projectId as string,
        totalActivityCodes: updatedActivityCodes.length
      }
    });
  });

  /**
   * Retirer un code d'activité d'un projet
   */
  static removeFromProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, projectId } = req.params;
    const tenantId = req.tenantContext?.tenantId;
    const updatedBy = req.user?.uid;

    if (!tenantId || !updatedBy) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, 'Authentication and tenant context required');
    }

    // Vérifier que le code d'activité existe
    await activityCodeService.getActivityCodeById(id, tenantId);

    // Vérifier que le projet existe et appartient au même tenant
    const projectDoc = await collections.projects.doc(projectId).get();
    if (!projectDoc.exists) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, 'Project not found');
    }

    const projectData = projectDoc.data();
    if (projectData?.tenantId !== tenantId) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, 'Project does not belong to your organization');
    }

    // Vérifier si le code d'activité est assigné au projet
    const currentActivityCodes = projectData?.activityCodes || [];
    if (!currentActivityCodes.includes(id)) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.VALIDATION_ERROR, 'Activity code is not assigned to this project');
    }

    // Vérifier s'il y a des entrées de temps existantes pour ce code d'activité sur ce projet
    const timeEntriesQuery = await collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('projectId', '==', projectId as string)
      .where('activityCodeId', '==', id)
      .limit(1)
      .get();

    if (!timeEntriesQuery.empty) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      return errorHandler.sendError(res, ERROR_CODES.CONFLICT, 'Cannot remove activity code from project: there are existing time entries using this code');
    }

    // Retirer le code d'activité du projet
    const updatedActivityCodes = currentActivityCodes.filter(codeId => codeId !== id);
    await collections.projects.doc(projectId).update({
      activityCodes: updatedActivityCodes,
      updatedAt: new Date()
    });

    // Vérifier si le code d'activité est encore utilisé dans d'autres projets
    const otherProjectsQuery = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('activityCodes', 'array-contains', id)
      .get();

    // Si le code d'activité n'est plus utilisé dans aucun projet, le marquer comme non spécifique au projet
    if (otherProjectsQuery.empty) {
      await activityCodeService.updateActivityCode(id, tenantId, {
        projectSpecific: false
      }, updatedBy);
    }

    // Récupérer le code d'activité mis à jour
    const updatedActivityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    logger.info(`🔓 Activity code removed from project: ${id} <- ${projectId}`, {
      activityCodeId: id,
      projectId,
      tenantId,
      userId: updatedBy,
      stillProjectSpecific: otherProjectsQuery.size > 0
    });

    return res.json({
      success: true,
      message: 'Code d\'activité retiré du projet avec succès',
      data: {
        activityCode: updatedActivityCode.toAPI(),
        projectId: projectId as string,
        totalActivityCodes: updatedActivityCodes.length,
        stillProjectSpecific: otherProjectsQuery.size > 0
      }
    });
  });
}