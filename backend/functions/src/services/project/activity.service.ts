/**
 * Service pour la gestion des codes d'activité
 */

import { ActivityCodeModel } from '../../models/activity-code.model';
import { 
  ActivityCodeInput, 
  ActivityCodeFilters,
  ActivityCodeTree,
  ActivityStats,
  TimePeriod
} from '../../common/types';
import { ValidationError } from '../../models/base.model';
import { firestore } from 'firebase-admin';

export class ActivityService {
  private db: firestore.Firestore;
  private activityCodesCollection: string = 'activity_codes';
  private timeEntriesCollection: string = 'time_entries';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== CRUD Operations ====================

  /**
   * Créer un nouveau code d'activité
   */
  async createActivityCode(
    tenantId: string,
    codeData: ActivityCodeInput,
    createdBy: string
  ): Promise<ActivityCodeModel> {
    try {
      // Vérifier l'unicité du code dans l'organisation
      await this.validateUniqueActivityCode(tenantId, codeData.code);

      const activityCode = new ActivityCodeModel({
        ...codeData,
        tenantId
      });

      // Si un parent est spécifié, mettre à jour la hiérarchie
      if (codeData.parentId) {
        const parent = await this.getActivityCodeById(codeData.parentId);
        if (!parent) {
          throw new ValidationError('Parent activity code not found');
        }
        
        activityCode.setParent(codeData.parentId, parent.code, parent.name);
      }

      await activityCode.validate();

      const docRef = await this.db.collection(this.activityCodesCollection).add(activityCode.toFirestore());
      activityCode.update({ id: docRef.id });

      return activityCode;
    } catch (error) {
      throw new Error(`Failed to create activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un code d'activité par ID
   */
  async getActivityCodeById(activityCodeId: string): Promise<ActivityCodeModel | null> {
    try {
      const doc = await this.db.collection(this.activityCodesCollection).doc(activityCodeId).get();
      return ActivityCodeModel.fromFirestore(doc);
    } catch (error) {
      throw new Error(`Failed to get activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un code d'activité par code
   */
  async getActivityCodeByCode(tenantId: string, code: string): Promise<ActivityCodeModel | null> {
    try {
      const query = await this.db.collection(this.activityCodesCollection)
        .where('tenantId', '==', tenantId)
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      return ActivityCodeModel.fromFirestore(query.docs[0]);
    } catch (error) {
      throw new Error(`Failed to get activity code by code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lister les codes d'activité avec filtres
   */
  async listActivityCodes(
    tenantId: string,
    filters?: ActivityCodeFilters
  ): Promise<ActivityCodeModel[]> {
    try {
      let query = this.db.collection(this.activityCodesCollection)
        .where('tenantId', '==', tenantId);

      // Appliquer les filtres
      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters?.billable !== undefined) {
        query = query.where('billable', '==', filters.billable);
      }

      if (filters?.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      if (filters?.projectSpecific !== undefined) {
        query = query.where('projectSpecific', '==', filters.projectSpecific);
      }

      query = query.orderBy('category', 'asc').orderBy('code', 'asc');

      const snapshot = await query.get();
      const activityCodes = snapshot.docs
        .map(doc => ActivityCodeModel.fromFirestore(doc))
        .filter(code => code !== null) as ActivityCodeModel[];

      // Filtrer par parent si spécifié (ne peut pas être fait dans la requête Firestore)
      // Cette fonctionnalité sera ajoutée plus tard si nécessaire

      return activityCodes;
    } catch (error) {
      throw new Error(`Failed to list activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour un code d'activité
   */
  async updateActivityCode(
    activityCodeId: string,
    updates: Partial<ActivityCodeInput>,
    updatedBy: string
  ): Promise<ActivityCodeModel> {
    try {
      const activityCode = await this.getActivityCodeById(activityCodeId);
      if (!activityCode) {
        throw new ValidationError('Activity code not found');
      }

      // Vérifier l'unicité du code si il est modifié
      if (updates.code && updates.code !== activityCode.code) {
        await this.validateUniqueActivityCode(activityCode.tenantId, updates.code);
      }

      // Gérer le changement de parent
      if (updates.parentId !== undefined) {
        if (updates.parentId) {
          const parent = await this.getActivityCodeById(updates.parentId);
          if (!parent) {
            throw new ValidationError('Parent activity code not found');
          }
          
          // Vérifier que la hiérarchie est valide
          if (!activityCode.canHaveParent(parent.getData())) {
            throw new ValidationError('Invalid parent-child relationship');
          }
          
          activityCode.setParent(updates.parentId, parent.code, parent.name);
        } else {
          activityCode.removeParent();
        }
      }

      activityCode.updateFromInput(updates);
      await activityCode.validate();

      await this.db.collection(this.activityCodesCollection)
        .doc(activityCodeId)
        .update(activityCode.toFirestore());

      return activityCode;
    } catch (error) {
      throw new Error(`Failed to update activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un code d'activité
   */
  async deleteActivityCode(activityCodeId: string): Promise<void> {
    try {
      const activityCode = await this.getActivityCodeById(activityCodeId);
      if (!activityCode) {
        throw new ValidationError('Activity code not found');
      }

      // Vérifier qu'il n'y a pas d'entrées de temps associées
      const timeEntriesQuery = await this.db.collection(this.timeEntriesCollection)
        .where('activityCodeId', '==', activityCodeId)
        .limit(1)
        .get();

      if (!timeEntriesQuery.empty) {
        throw new ValidationError('Cannot delete activity code with existing time entries');
      }

      // Vérifier qu'il n'y a pas de codes enfants
      const childrenQuery = await this.db.collection(this.activityCodesCollection)
        .where('parentId', '==', activityCodeId)
        .limit(1)
        .get();

      if (!childrenQuery.empty) {
        throw new ValidationError('Cannot delete activity code with child codes');
      }

      await this.db.collection(this.activityCodesCollection).doc(activityCodeId).delete();
    } catch (error) {
      throw new Error(`Failed to delete activity code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion de la hiérarchie ====================

  /**
   * Obtenir la hiérarchie des codes d'activité
   */
  async getActivityHierarchy(tenantId: string): Promise<ActivityCodeTree[]> {
    try {
      const allCodes = await this.listActivityCodes(tenantId, { isActive: true });
      const codesData = allCodes.map(code => code.getData());
      
      return ActivityCodeModel.buildTree(codesData);
    } catch (error) {
      throw new Error(`Failed to get activity hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les codes d'activité parents
   */
  async getParentActivityCodes(tenantId: string): Promise<ActivityCodeModel[]> {
    try {
      const allCodes = await this.listActivityCodes(tenantId, { isActive: true });
      return allCodes.filter(code => !code.parentId);
    } catch (error) {
      throw new Error(`Failed to get parent activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les codes d'activité enfants d'un parent
   */
  async getChildActivityCodes(parentId: string): Promise<ActivityCodeModel[]> {
    try {
      const query = await this.db.collection(this.activityCodesCollection)
        .where('parentId', '==', parentId)
        .where('isActive', '==', true)
        .orderBy('code', 'asc')
        .get();

      return query.docs
        .map(doc => ActivityCodeModel.fromFirestore(doc))
        .filter(code => code !== null) as ActivityCodeModel[];
    } catch (error) {
      throw new Error(`Failed to get child activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider la cohérence de la hiérarchie
   */
  async validateHierarchyConsistency(tenantId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      activityCodeId: string;
      code: string;
      issues: string[];
    }>;
  }> {
    try {
      const allCodes = await this.listActivityCodes(tenantId);
      const codesData = allCodes.map(code => code.getData());
      const issues: Array<{
        activityCodeId: string;
        code: string;
        issues: string[];
      }> = [];

      for (const activityCode of allCodes) {
        const codeIssues = activityCode.validateHierarchyConsistency(codesData);
        
        if (codeIssues.length > 0) {
          issues.push({
            activityCodeId: activityCode.id!,
            code: activityCode.code,
            issues: codeIssues
          });
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      throw new Error(`Failed to validate hierarchy consistency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion par projet ====================

  /**
   * Assigner un code d'activité à un projet
   */
  async assignActivityToProject(
    projectId: string,
    activityCodeId: string
  ): Promise<void> {
    try {
      // Cette méthode sera implémentée dans le ProjectService
      // Pour l'instant, on met à jour juste le flag projectSpecific
      const activityCode = await this.getActivityCodeById(activityCodeId);
      if (!activityCode) {
        throw new ValidationError('Activity code not found');
      }

      activityCode.makeProjectSpecific();

      await this.db.collection(this.activityCodesCollection)
        .doc(activityCodeId)
        .update(activityCode.toFirestore());
    } catch (error) {
      throw new Error(`Failed to assign activity to project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les codes d'activité d'un projet
   */
  async getProjectActivities(projectId: string): Promise<ActivityCodeModel[]> {
    try {
      // Obtenir le projet pour récupérer ses codes d'activité
      const projectDoc = await this.db.collection('projects').doc(projectId).get();
      
      if (!projectDoc.exists) {
        throw new ValidationError('Project not found');
      }

      const projectData = projectDoc.data();
      const activityCodeIds = projectData?.activityCodes || [];

      if (activityCodeIds.length === 0) {
        return [];
      }

      // Obtenir les codes d'activité par batch (Firestore limite à 10 par requête 'in')
      const activityCodes: ActivityCodeModel[] = [];
      
      for (let i = 0; i < activityCodeIds.length; i += 10) {
        const batch = activityCodeIds.slice(i, i + 10);
        const query = await this.db.collection(this.activityCodesCollection)
          .where(firestore.FieldPath.documentId(), 'in', batch)
          .get();

        const batchCodes = query.docs
          .map(doc => ActivityCodeModel.fromFirestore(doc))
          .filter(code => code !== null) as ActivityCodeModel[];

        activityCodes.push(...batchCodes);
      }

      return activityCodes.filter(code => code.isActive);
    } catch (error) {
      throw new Error(`Failed to get project activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Recherche et filtrage ====================

  /**
   * Rechercher des codes d'activité par terme
   */
  async searchActivityCodes(
    tenantId: string,
    searchTerm: string,
    filters?: ActivityCodeFilters,
    limit: number = 20
  ): Promise<ActivityCodeModel[]> {
    try {
      // Obtenir tous les codes d'activité (Firestore ne supporte pas la recherche textuelle native)
      const allCodes = await this.listActivityCodes(tenantId, filters);
      
      // Filtrer par terme de recherche
      const filteredCodes = allCodes.filter(code => 
        code.matchesSearchTerm(searchTerm)
      );

      return filteredCodes.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to search activity codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les codes d'activité par catégorie
   */
  async getActivityCodesByCategory(
    tenantId: string,
    category: string,
    activeOnly: boolean = true
  ): Promise<ActivityCodeModel[]> {
    try {
      const filters: ActivityCodeFilters = { category };
      if (activeOnly) {
        filters.isActive = true;
      }

      return this.listActivityCodes(tenantId, filters);
    } catch (error) {
      throw new Error(`Failed to get activity codes by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir toutes les catégories d'activité
   */
  async getActivityCategories(tenantId: string): Promise<string[]> {
    try {
      const allCodes = await this.listActivityCodes(tenantId, { isActive: true });
      const categories = new Set<string>();
      
      allCodes.forEach(code => {
        categories.add(code.category);
      });

      return Array.from(categories).sort();
    } catch (error) {
      throw new Error(`Failed to get activity categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Analytics ====================

  /**
   * Obtenir la distribution du temps par activité
   */
  async getActivityTimeDistribution(
    tenantId: string,
    period?: TimePeriod
  ): Promise<ActivityStats[]> {
    try {
      let query = this.db.collection(this.timeEntriesCollection)
        .where('tenantId', '==', tenantId);

      if (period?.start) {
        query = query.where('date', '>=', period.start);
      }

      if (period?.end) {
        query = query.where('date', '<=', period.end);
      }

      const snapshot = await query.get();
      const timeEntries = snapshot.docs.map(doc => doc.data());

      // Grouper par code d'activité
      const activityStats = new Map<string, {
        totalHours: number;
        employeeIds: Set<string>;
      }>();

      let totalHours = 0;

      timeEntries.forEach(entry => {
        if (entry.activityCodeId) {
          const hours = entry.duration / 60;
          totalHours += hours;

          if (!activityStats.has(entry.activityCodeId)) {
            activityStats.set(entry.activityCodeId, {
              totalHours: 0,
              employeeIds: new Set()
            });
          }

          const stats = activityStats.get(entry.activityCodeId)!;
          stats.totalHours += hours;
          stats.employeeIds.add(entry.employeeId);
        }
      });

      // Convertir en format de sortie
      const result: ActivityStats[] = [];

      for (const [activityCodeId, stats] of activityStats.entries()) {
        const activityCode = await this.getActivityCodeById(activityCodeId);
        
        if (activityCode) {
          result.push({
            activityCodeId,
            activityName: activityCode.getDisplayName(),
            totalHours: Math.round(stats.totalHours * 100) / 100,
            percentage: totalHours > 0 ? Math.round((stats.totalHours / totalHours) * 10000) / 100 : 0,
            employeeCount: stats.employeeIds.size
          });
        }
      }

      return result.sort((a, b) => b.totalHours - a.totalHours);
    } catch (error) {
      throw new Error(`Failed to get activity time distribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les activités les plus utilisées
   */
  async getTopActivities(
    tenantId: string,
    limit: number = 10,
    period?: TimePeriod
  ): Promise<ActivityStats[]> {
    try {
      const distribution = await this.getActivityTimeDistribution(tenantId, period);
      return distribution.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get top activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques d'utilisation d'un code d'activité
   */
  async getActivityUsageStats(
    activityCodeId: string,
    period?: TimePeriod
  ): Promise<{
    totalHours: number;
    totalEntries: number;
    uniqueEmployees: number;
    averageHoursPerEntry: number;
    mostActiveEmployee: string | null;
  }> {
    try {
      let query = this.db.collection(this.timeEntriesCollection)
        .where('activityCodeId', '==', activityCodeId);

      if (period?.start) {
        query = query.where('date', '>=', period.start);
      }

      if (period?.end) {
        query = query.where('date', '<=', period.end);
      }

      const snapshot = await query.get();
      const timeEntries = snapshot.docs.map(doc => doc.data());

      let totalHours = 0;
      const employeeHours = new Map<string, number>();

      timeEntries.forEach(entry => {
        const hours = entry.duration / 60;
        totalHours += hours;

        const currentHours = employeeHours.get(entry.employeeId) || 0;
        employeeHours.set(entry.employeeId, currentHours + hours);
      });

      // Trouver l'employé le plus actif
      let mostActiveEmployee: string | null = null;
      let maxHours = 0;

      for (const [employeeId, hours] of employeeHours.entries()) {
        if (hours > maxHours) {
          maxHours = hours;
          mostActiveEmployee = employeeId;
        }
      }

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        totalEntries: timeEntries.length,
        uniqueEmployees: employeeHours.size,
        averageHoursPerEntry: timeEntries.length > 0 ? Math.round((totalHours / timeEntries.length) * 100) / 100 : 0,
        mostActiveEmployee
      };
    } catch (error) {
      throw new Error(`Failed to get activity usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires ====================

  /**
   * Valider l'unicité du code d'activité
   */
  private async validateUniqueActivityCode(tenantId: string, code: string): Promise<void> {
    const existingCode = await this.getActivityCodeByCode(tenantId, code);
    if (existingCode) {
      throw new ValidationError(`Activity code '${code}' already exists`);
    }
  }

  /**
   * Activer/désactiver un code d'activité
   */
  async toggleActivityCodeStatus(
    activityCodeId: string,
    updatedBy: string
  ): Promise<ActivityCodeModel> {
    try {
      const activityCode = await this.getActivityCodeById(activityCodeId);
      if (!activityCode) {
        throw new ValidationError('Activity code not found');
      }

      activityCode.toggleActive();

      await this.db.collection(this.activityCodesCollection)
        .doc(activityCodeId)
        .update(activityCode.toFirestore());

      return activityCode;
    } catch (error) {
      throw new Error(`Failed to toggle activity code status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un résumé des codes d'activité
   */
  async getActivityCodesSummary(tenantId: string): Promise<{
    totalCodes: number;
    activeCodes: number;
    billableCodes: number;
    categoriesCount: number;
    hierarchicalCodes: number;
  }> {
    try {
      const allCodes = await this.listActivityCodes(tenantId);
      const categories = new Set<string>();

      let activeCodes = 0;
      let billableCodes = 0;
      let hierarchicalCodes = 0;

      allCodes.forEach(code => {
        categories.add(code.category);
        
        if (code.isActive) {
          activeCodes++;
        }
        
        if (code.billable) {
          billableCodes++;
        }
        
        if (code.parentId) {
          hierarchicalCodes++;
        }
      });

      return {
        totalCodes: allCodes.length,
        activeCodes,
        billableCodes,
        categoriesCount: categories.size,
        hierarchicalCodes
      };
    } catch (error) {
      throw new Error(`Failed to get activity codes summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}