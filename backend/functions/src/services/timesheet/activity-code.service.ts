/**
 * Service pour la gestion des codes d'activité
 */

import { ActivityCodeModel } from '../../models/activity-code.model';
import { ValidationError } from '../../models/base.model';
import { ActivityCodeInput } from '../../common/types';
import { collections } from '../../config/database';

export interface CreateActivityCodeData extends ActivityCodeInput {
  tenantId: string;
  createdBy: string;
}

export interface ActivityCodeFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  category?: string;
  billable?: boolean;
  isActive?: boolean;
  projectSpecific?: boolean;
  parentId?: string;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface ActivityCodeSearchFilters {
  query?: string;
  category?: string;
  billable?: boolean;
  isActive?: boolean;
  projectSpecific?: boolean;
  limit?: number;
}

export class ActivityCodeService {
  private collection = collections.activity_codes;

  /**
   * Créer un nouveau code d'activité
   */
  async createActivityCode(data: CreateActivityCodeData): Promise<ActivityCodeModel> {
    try {
      const activityCode = new ActivityCodeModel(data);
      await activityCode.validate();

      const docRef = await this.collection.add(activityCode.toFirestore());
      const savedDoc = await docRef.get();
      const savedActivityCode = ActivityCodeModel.fromFirestore(savedDoc);
      
      if (!savedActivityCode) {
        throw new Error('Failed to create activity code');
      }

      return savedActivityCode;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un code d'activité par ID
   */
  async getActivityCodeById(id: string, tenantId: string): Promise<ActivityCodeModel> {
    try {
      const doc = await this.collection.doc(id).get();
      const activityCode = ActivityCodeModel.fromFirestore(doc);

      if (!activityCode || activityCode.getData().tenantId !== tenantId) {
        throw new ValidationError('Activity code not found');
      }

      return activityCode;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir la liste des codes d'activité
   */
  async getActivityCodes(tenantId: string, filters: ActivityCodeFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
        category,
        billable,
        isActive,
        projectSpecific,
        parentId,
        searchTerm,
        includeInactive = false
      } = filters;

      let query: FirebaseFirestore.Query = this.collection
        .where('tenantId', '==', tenantId);

      if (category !== undefined && category !== null) {
        query = query.where('category', '==', category);
      }

      if (billable !== undefined && billable !== null) {
        query = query.where('billable', '==', billable);
      }

      if (isActive !== undefined && isActive !== null) {
        query = query.where('isActive', '==', isActive);
      } else if (!includeInactive) {
        query = query.where('isActive', '==', true);
      }

      if (projectSpecific !== undefined && projectSpecific !== null) {
        query = query.where('projectSpecific', '==', projectSpecific);
      }

      if (parentId !== undefined && parentId !== null) {
        query = query.where('parentId', '==', parentId);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      let activityCodes = snapshot.docs
        .map(doc => ActivityCodeModel.fromFirestore(doc))
        .filter(Boolean) as ActivityCodeModel[];

      // Filtres additionnels en mémoire
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        activityCodes = activityCodes.filter(code => {
          const data = code.getData();
          return data.name.toLowerCase().includes(searchLower) ||
                 data.description?.toLowerCase().includes(searchLower) ||
                 data.code?.toLowerCase().includes(searchLower);
        });
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCodes = activityCodes.slice(startIndex, endIndex);

      return {
        data: paginatedCodes,
        pagination: {
          page,
          limit,
          total: activityCodes.length,
          totalPages: Math.ceil(activityCodes.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'arbre hiérarchique des codes d'activité
   */
  async getActivityCodeTree(tenantId: string, filters: { category?: string; projectId?: string } = {}) {
    try {
      const { category, projectId } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true);

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.get();
      const activityCodes = snapshot.docs
        .map(doc => ActivityCodeModel.fromFirestore(doc))
        .filter(Boolean) as ActivityCodeModel[];

      // Filtrer par projet si spécifié
      let filteredCodes = activityCodes;
      if (projectId) {
        // Obtenir les codes d'activité assignés au projet
        const projectDoc = await collections.projects.doc(projectId).get();
        if (projectDoc.exists) {
          const projectData = projectDoc.data();
          const projectActivityCodes = projectData?.activityCodes || [];
          filteredCodes = activityCodes.filter(code => 
            !code.getData().projectSpecific || projectActivityCodes.includes(code.id)
          );
        }
      }

      // Construire l'arbre hiérarchique
      const rootCodes = filteredCodes.filter(code => !code.getData().parentId);
      const buildTree = (parentCodes: ActivityCodeModel[]): any[] => {
        return parentCodes.map(parent => {
          const children = filteredCodes.filter(code => code.getData().parentId === parent.id);
          return {
            ...parent.getData(),
            id: parent.id,
            children: children.length > 0 ? buildTree(children) : []
          };
        });
      };

      return buildTree(rootCodes);
    } catch (error) {
      throw new Error(`Failed to get activity code tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour un code d'activité
   */
  async updateActivityCode(id: string, tenantId: string, updates: Partial<any>, updatedBy: string): Promise<ActivityCodeModel> {
    try {
      const activityCode = await this.getActivityCodeById(id, tenantId);
      
      activityCode.update(updates);
      await activityCode.validate();

      await this.collection.doc(id).update(activityCode.toFirestore());
      
      return await this.getActivityCodeById(id, tenantId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un code d'activité
   */
  async deleteActivityCode(id: string, tenantId: string, deletedBy: string): Promise<void> {
    try {
      await this.getActivityCodeById(id, tenantId);
      
      // Vérifier s'il y a des entrées de temps associées
      const timeEntriesQuery = await collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('activityCodeId', '==', id)
        .limit(1)
        .get();

      if (!timeEntriesQuery.empty) {
        throw new ValidationError('Cannot delete activity code with associated time entries');
      }

      // Vérifier s'il y a des codes enfants
      const childCodesQuery = await this.collection
        .where('tenantId', '==', tenantId)
        .where('parentId', '==', id)
        .limit(1)
        .get();

      if (!childCodesQuery.empty) {
        throw new ValidationError('Cannot delete activity code with child codes');
      }

      await this.collection.doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rechercher des codes d'activité
   */
  async searchActivityCodes(tenantId: string, filters: ActivityCodeSearchFilters = {}): Promise<ActivityCodeModel[]> {
    try {
      const {
        query: searchQuery,
        category,
        billable,
        isActive,
        projectSpecific,
        limit = 10
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      } else {
        query = query.where('isActive', '==', true);
      }

      if (category) {
        query = query.where('category', '==', category);
      }

      if (billable !== undefined) {
        query = query.where('billable', '==', billable);
      }

      if (projectSpecific !== undefined) {
        query = query.where('projectSpecific', '==', projectSpecific);
      }

      query = query.limit(limit);

      const snapshot = await query.get();
      let activityCodes = snapshot.docs
        .map(doc => ActivityCodeModel.fromFirestore(doc))
        .filter(Boolean) as ActivityCodeModel[];

      // Filtres additionnels
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        activityCodes = activityCodes.filter(code => {
          const data = code.getData();
          return data.name.toLowerCase().includes(searchLower) ||
                 data.description?.toLowerCase().includes(searchLower) ||
                 data.code?.toLowerCase().includes(searchLower);
        });
      }

      return activityCodes;
    } catch (error) {
      throw new Error(`Failed to search activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation d'un code d'activité
   */
  async getActivityCodeStats(id: string, tenantId: string, filters: { startDate?: string; endDate?: string } = {}) {
    try {
      await this.getActivityCodeById(id, tenantId);
      const { startDate, endDate } = filters;

      // Obtenir les entrées de temps pour ce code d'activité
      let timeEntriesQuery = collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('activityCodeId', '==', id);

      if (startDate) {
        timeEntriesQuery = timeEntriesQuery.where('date', '>=', startDate);
      }

      if (endDate) {
        timeEntriesQuery = timeEntriesQuery.where('date', '<=', endDate);
      }

      const timeEntriesSnapshot = await timeEntriesQuery.get();
      const timeEntries = timeEntriesSnapshot.docs.map(doc => doc.data());

      const stats = {
        totalTimeEntries: timeEntries.length,
        totalHours: timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        totalBillableHours: timeEntries.filter(entry => entry.billable).reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        totalCost: timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
        uniqueEmployees: [...new Set(timeEntries.map(entry => entry.employeeId))].length,
        uniqueProjects: [...new Set(timeEntries.map(entry => entry.projectId))].length,
        averageHoursPerEntry: 0,
        billablePercentage: 0,
        employeeBreakdown: {} as Record<string, number>,
        projectBreakdown: {} as Record<string, number>
      };

      if (stats.totalTimeEntries > 0) {
        stats.averageHoursPerEntry = stats.totalHours / stats.totalTimeEntries;
      }

      if (stats.totalHours > 0) {
        stats.billablePercentage = (stats.totalBillableHours / stats.totalHours) * 100;
      }

      // Répartition par employé et projet
      timeEntries.forEach(entry => {
        const hours = (entry.duration || 0) / 60;
        
        if (entry.employeeId) {
          stats.employeeBreakdown[entry.employeeId] = (stats.employeeBreakdown[entry.employeeId] || 0) + hours;
        }
        
        if (entry.projectId) {
          stats.projectBreakdown[entry.projectId] = (stats.projectBreakdown[entry.projectId] || 0) + hours;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get activity code stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les catégories disponibles
   */
  async getCategories(tenantId: string): Promise<string[]> {
    try {
      const snapshot = await this.collection
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .get();

      const categories = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });

      return Array.from(categories).sort();
    } catch (error) {
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider la hiérarchie des codes d'activité
   */
  async validateHierarchy(tenantId: string, parentId?: string, childId?: string): Promise<boolean> {
    try {
      if (!parentId || !childId) {
        return true;
      }

      // Vérifier que le parent existe
      await this.getActivityCodeById(parentId, tenantId);
      
      // Vérifier que l'enfant existe
      await this.getActivityCodeById(childId, tenantId);

      // Vérifier qu'il n'y a pas de référence circulaire
      const checkCircularReference = async (currentId: string, targetId: string): Promise<boolean> => {
        if (currentId === targetId) {
          return true; // Référence circulaire détectée
        }

        const currentDoc = await this.collection.doc(currentId).get();
        if (!currentDoc.exists) {
          return false;
        }

        const currentData = currentDoc.data();
        if (currentData?.parentId) {
          return await checkCircularReference(currentData.parentId, targetId);
        }

        return false;
      };

      const hasCircularRef = await checkCircularReference(parentId, childId);
      return !hasCircularRef;
    } catch (error) {
      return false;
    }
  }
}

export const activityCodeService = new ActivityCodeService();