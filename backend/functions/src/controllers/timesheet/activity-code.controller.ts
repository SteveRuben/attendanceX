/**
 * Contrôleur pour la gestion des codes d'activité
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { activityCodeService } from '../../services';
import { collections } from '../../config/database';

export class ActivityCodeController {
  /**
   * Créer un nouveau code d'activité
   */
  static createActivityCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const activityCodeData = req.body;
    const tenantId = req.tenantId!;
    const createdBy = req.user.uid;

    const activityCode = await activityCodeService.createActivityCode({
      ...activityCodeData,
      tenantId,
      createdBy
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
  static getActivityCodeById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const activityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    res.json({
      success: true,
      data: activityCode.toAPI()
    });
  });

  /**
   * Obtenir la liste des codes d'activité du tenant
   */
  static getTenantActivityCodes = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'name',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc',
      category: req.query.category as string,
      billable: req.query.billable === 'true' ? true : req.query.billable === 'false' ? false : undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      projectSpecific: req.query.projectSpecific === 'true' ? true : req.query.projectSpecific === 'false' ? false : undefined,
      parentId: req.query.parentId as string,
      searchTerm: req.query.search as string,
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
  static getActivityCodeTree = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { category, projectId } = req.query;

    const tree = await activityCodeService.getActivityCodeTree(tenantId, {
      category: category as string,
      projectId: projectId as string
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
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const activityCode = await activityCodeService.updateActivityCode(id, tenantId, updates, updatedBy);

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
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const deletedBy = req.user.uid;

    await activityCodeService.deleteActivityCode(id, tenantId, deletedBy);

    res.json({
      success: true,
      message: 'Code d\'activité supprimé avec succès'
    });
  });

  /**
   * Activer/Désactiver un code d'activité
   */
  static toggleActivityCodeStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { isActive } = req.body;
    const changedBy = req.user.uid;

    const activityCode = await activityCodeService.updateActivityCode(id, tenantId, { isActive }, changedBy);

    res.json({
      success: true,
      message: `Code d'activité ${isActive ? 'activé' : 'désactivé'} avec succès`,
      data: activityCode.toAPI()
    });
  });

  /**
   * Rechercher des codes d'activité
   */
  static searchActivityCodes = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const filters = {
      query: req.query.query as string,
      category: req.query.category as string,
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
  static getActivityCodeCategories = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const categories = await activityCodeService.getCategories(tenantId);

    res.json({
      success: true,
      data: categories
    });
  });

  /**
   * Obtenir les statistiques d'utilisation d'un code d'activité
   */
  static getActivityCodeStats = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    const stats = await activityCodeService.getActivityCodeStats(id, tenantId, {
      startDate: startDate as string,
      endDate: endDate as string
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
    const tenantId = req.tenantId!;
    const importedBy = req.user.uid;

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
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const { newCode, newName } = req.body;
    const createdBy = req.user.uid;

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

    res.status(201).json({
      success: true,
      message: 'Code d\'activité dupliqué avec succès',
      data: activityCode.toAPI()
    });
  });

  /**
   * Obtenir les codes d'activité par projet
   */
  static getProjectActivityCodes = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const tenantId = req.tenantId!;

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
    const { id } = req.params;
    const { projectId } = req.body;
    const tenantId = req.tenantId!;
    const updatedBy = req.user.uid;

    // Validation des paramètres
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Vérifier que le code d'activité existe
    const activityCode = await activityCodeService.getActivityCodeById(id, tenantId);

    // Vérifier que le projet existe et appartient au même tenant
    const projectDoc = await collections.projects.doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const projectData = projectDoc.data();
    if (projectData?.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Project does not belong to your organization'
      });
    }

    // Vérifier si le code d'activité est déjà assigné au projet
    const currentActivityCodes = projectData?.activityCodes || [];
    if (currentActivityCodes.includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'Activity code is already assigned to this project'
      });
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

    return res.json({
      success: true,
      message: 'Code d\'activité assigné au projet avec succès',
      data: {
        activityCode: updatedActivityCode.toAPI(),
        projectId: projectId,
        totalActivityCodes: updatedActivityCodes.length
      }
    });
  });

  /**
   * Retirer un code d'activité d'un projet
   */
  static removeFromProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, projectId } = req.params;
    const tenantId = req.tenantId!;
    const updatedBy = req.user.uid;

    // Vérifier que le code d'activité existe
    await activityCodeService.getActivityCodeById(id, tenantId);

    // Vérifier que le projet existe et appartient au même tenant
    const projectDoc = await collections.projects.doc(projectId).get();
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const projectData = projectDoc.data();
    if (projectData?.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Project does not belong to your organization'
      });
    }

    // Vérifier si le code d'activité est assigné au projet
    const currentActivityCodes = projectData?.activityCodes || [];
    if (!currentActivityCodes.includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'Activity code is not assigned to this project'
      });
    }

    // Vérifier s'il y a des entrées de temps existantes pour ce code d'activité sur ce projet
    const timeEntriesQuery = await collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('projectId', '==', projectId)
      .where('activityCodeId', '==', id)
      .limit(1)
      .get();

    if (!timeEntriesQuery.empty) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove activity code from project: there are existing time entries using this code'
      });
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

    return res.json({
      success: true,
      message: 'Code d\'activité retiré du projet avec succès',
      data: {
        activityCode: updatedActivityCode.toAPI(),
        projectId: projectId,
        totalActivityCodes: updatedActivityCodes.length,
        stillProjectSpecific: otherProjectsQuery.size > 0
      }
    });
  });
}