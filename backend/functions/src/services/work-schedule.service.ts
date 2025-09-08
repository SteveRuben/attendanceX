/**
 * Service de gestion des horaires de travail
 */

import { db } from '../config/database';
import { WorkScheduleModel } from '../models/work-schedule.model';
import { 
  DaySchedule, 
  PaginatedResponse, 
  PaginationParams,
  ScheduleType, 
  WorkSchedule
} from '../shared';
import { logger } from 'firebase-functions';
import { Query } from 'firebase-admin/firestore';

// Interfaces pour les options de recherche
export interface WorkScheduleListOptions extends PaginationParams {
  organizationId?: string;
  type?: ScheduleType;
  isActive?: boolean;
  searchTerm?: string;
  effectiveDate?: Date;
}

export interface WorkScheduleCreateRequest {
  name: string;
  organizationId: string;
  type: ScheduleType;
  weeklySchedule: Record<number, DaySchedule>;
  defaultBreakDuration?: number;
  maxOvertimeHours?: number;
  gracePeriodsMinutes?: {
    lateArrival: number;
    earlyDeparture: number;
  };
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy: string;
}

export interface WorkScheduleUpdateRequest {
  name?: string;
  type?: ScheduleType;
  weeklySchedule?: Record<number, DaySchedule>;
  defaultBreakDuration?: number;
  maxOvertimeHours?: number;
  gracePeriodsMinutes?: {
    lateArrival: number;
    earlyDeparture: number;
  };
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive?: boolean;
  updatedBy: string;
}

export interface ScheduleConflictInfo {
  hasConflict: boolean;
  conflictingSchedules: WorkSchedule[];
  conflictPeriods: Array<{
    start: Date;
    end: Date;
    scheduleIds: string[];
  }>;
}

class WorkScheduleService {
  private readonly collectionName = 'work_schedules';

  /**
   * Créer un nouvel horaire de travail
   */
  async createWorkSchedule(data: WorkScheduleCreateRequest): Promise<WorkSchedule> {
    try {
      logger.info('Creating work schedule', { name: data.name, organizationId: data.organizationId });

      // Vérifier l'unicité du nom dans l'organisation
      await this.validateUniqueScheduleName(data.name, data.organizationId);

      // Créer le modèle d'horaire
      const schedule = new WorkScheduleModel(data);
      await schedule.validate();

      // Vérifier les conflits avec les horaires existants
      const conflictInfo = await this.checkScheduleConflicts(schedule, data.organizationId);
      if (conflictInfo.hasConflict) {
        logger.warn('Schedule conflicts detected', { conflicts: conflictInfo.conflictingSchedules.length });
        // Note: On peut choisir de permettre les conflits avec un avertissement
        // ou les interdire complètement selon les besoins métier
      }

      // Sauvegarder en base
      const docRef = db.collection(this.collectionName).doc();
      await docRef.set({
        ...schedule.toFirestore(),
        id: docRef.id
      });

      logger.info('Work schedule created successfully', { id: docRef.id, name: data.name });

      return {
        ...schedule.getData(),
        id: docRef.id
      };
    } catch (error) {
      logger.error('Error creating work schedule', { error, data });
      throw error;
    }
  }

  /**
   * Récupérer un horaire par ID
   */
  async getWorkScheduleById(id: string): Promise<WorkSchedule | null> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      const schedule = WorkScheduleModel.fromFirestore(doc);
      return schedule ? schedule.getData() : null;
    } catch (error) {
      logger.error('Error getting work schedule by ID', { error, id });
      throw error;
    }
  }

  /**
   * Lister les horaires avec pagination et filtres
   */
  async listWorkSchedules(options: WorkScheduleListOptions): Promise<PaginatedResponse<WorkSchedule>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        organizationId,
        type,
        isActive,
        searchTerm,
        effectiveDate
      } = options;

      let query: Query = db.collection(this.collectionName);

      // Filtres
      if (organizationId) {
        query = query.where('organizationId', '==', organizationId);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }

      // Tri
      query = query.orderBy(sortBy, sortOrder);

      // Pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();
      const schedules: WorkSchedule[] = [];

      snapshot.forEach(doc => {
        const schedule = WorkScheduleModel.fromFirestore(doc);
        if (schedule) {
          const scheduleData = schedule.getData();
          
          // Filtrage par date d'efficacité
          if (effectiveDate && !schedule.isEffectiveOn(effectiveDate)) {
            return;
          }

          // Filtrage par terme de recherche
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!scheduleData.name.toLowerCase().includes(term)) {
              return;
            }
          }

          schedules.push(scheduleData);
        }
      });

      // Compter le total pour la pagination
      let countQuery: Query = db.collection(this.collectionName);
      if (organizationId) {
        countQuery = countQuery.where('organizationId', '==', organizationId);
      }
      if (type) {
        countQuery = countQuery.where('type', '==', type);
      }
      if (isActive !== undefined) {
        countQuery = countQuery.where('isActive', '==', isActive);
      }

      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;
      const totalPages = Math.ceil(total / limit);

      return {
        data: schedules,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error listing work schedules', { error, options });
      throw error;
    }
  }

  /**
   * Mettre à jour un horaire de travail
   */
  async updateWorkSchedule(id: string, updates: WorkScheduleUpdateRequest): Promise<WorkSchedule> {
    try {
      logger.info('Updating work schedule', { id, updates });

      const doc = await db.collection(this.collectionName).doc(id).get();
      const schedule = WorkScheduleModel.fromFirestore(doc);

      if (!schedule) {
        throw new Error('Work schedule not found');
      }

      // Vérifier l'unicité du nom si modifié
      if (updates.name && updates.name !== schedule.name) {
        await this.validateUniqueScheduleName(updates.name, schedule.organizationId, id);
      }

      // Appliquer les mises à jour
      schedule.update(updates);
      await schedule.validate();

      // Vérifier les conflits si les dates d'efficacité ont changé
      if (updates.effectiveFrom || updates.effectiveTo) {
        const conflictInfo = await this.checkScheduleConflicts(schedule, schedule.organizationId, id);
        if (conflictInfo.hasConflict) {
          logger.warn('Schedule update creates conflicts', { conflicts: conflictInfo.conflictingSchedules.length });
        }
      }

      // Sauvegarder
      await db.collection(this.collectionName).doc(id).update(schedule.toFirestore());

      logger.info('Work schedule updated successfully', { id });
      return schedule.getData();
    } catch (error) {
      logger.error('Error updating work schedule', { error, id, updates });
      throw error;
    }
  }

  /**
   * Supprimer un horaire de travail (soft delete)
   */
  async deleteWorkSchedule(id: string, deletedBy: string): Promise<void> {
    try {
      logger.info('Deleting work schedule', { id, deletedBy });

      const doc = await db.collection(this.collectionName).doc(id).get();
      const schedule = WorkScheduleModel.fromFirestore(doc);

      if (!schedule) {
        throw new Error('Work schedule not found');
      }

      // Vérifier qu'aucun employé n'utilise cet horaire
      const employeesUsingSchedule = await this.getEmployeesUsingSchedule(id);
      if (employeesUsingSchedule.length > 0) {
        throw new Error(`Cannot delete schedule: ${employeesUsingSchedule.length} employees are using this schedule`);
      }

      // Désactiver l'horaire au lieu de le supprimer
      schedule.deactivate();
      schedule.update({ updatedBy: deletedBy });

      await db.collection(this.collectionName).doc(id).update(schedule.toFirestore());

      logger.info('Work schedule deleted successfully', { id });
    } catch (error) {
      logger.error('Error deleting work schedule', { error, id, deletedBy });
      throw error;
    }
  }

  /**
   * Activer/Désactiver un horaire
   */
  async toggleScheduleStatus(id: string, isActive: boolean, updatedBy: string): Promise<WorkSchedule> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      const schedule = WorkScheduleModel.fromFirestore(doc);

      if (!schedule) {
        throw new Error('Work schedule not found');
      }

      if (isActive) {
        schedule.activate();
      } else {
        schedule.deactivate();
      }

      schedule.update({ updatedBy });

      await db.collection(this.collectionName).doc(id).update(schedule.toFirestore());

      return schedule.getData();
    } catch (error) {
      logger.error('Error toggling schedule status', { error, id, isActive, updatedBy });
      throw error;
    }
  }

  /**
   * Cloner un horaire de travail
   */
  async cloneWorkSchedule(
    id: string, 
    newName: string, 
    newOrganizationId: string | undefined, 
    createdBy: string
  ): Promise<WorkSchedule> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      const originalSchedule = WorkScheduleModel.fromFirestore(doc);

      if (!originalSchedule) {
        throw new Error('Work schedule not found');
      }

      const clonedSchedule = originalSchedule.cloneWithName(newName, newOrganizationId);
      clonedSchedule.update({ createdBy });

      // Vérifier l'unicité du nom
      await this.validateUniqueScheduleName(newName, clonedSchedule.organizationId);

      // Sauvegarder le clone
      const docRef = db.collection(this.collectionName).doc();
      await docRef.set({
        ...clonedSchedule.toFirestore(),
        id: docRef.id
      });

      return {
        ...clonedSchedule.getData(),
        id: docRef.id
      };
    } catch (error) {
      logger.error('Error cloning work schedule', { error, id, newName, createdBy });
      throw error;
    }
  }

  /**
   * Mettre à jour l'horaire d'un jour spécifique
   */
  async updateDaySchedule(
    id: string, 
    dayOfWeek: number, 
    daySchedule: DaySchedule, 
    updatedBy: string
  ): Promise<WorkSchedule> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      const schedule = WorkScheduleModel.fromFirestore(doc);

      if (!schedule) {
        throw new Error('Work schedule not found');
      }

      schedule.setDaySchedule(dayOfWeek, daySchedule);
      schedule.update({ updatedBy });

      await db.collection(this.collectionName).doc(id).update(schedule.toFirestore());

      return schedule.getData();
    } catch (error) {
      logger.error('Error updating day schedule', { error, id, dayOfWeek, updatedBy });
      throw error;
    }
  }

  /**
   * Obtenir l'horaire effectif pour un employé à une date donnée
   */
  async getEffectiveScheduleForEmployee(employeeId: string, date: Date): Promise<{
    schedule: WorkSchedule | null;
    daySchedule: DaySchedule | null;
    isWorkingDay: boolean;
    expectedHours: number;
  }> {
    try {
      // Récupérer l'employé pour obtenir son workScheduleId
      const employeeDoc = await db.collection('employees').doc(employeeId).get();
      if (!employeeDoc.exists) {
        throw new Error('Employee not found');
      }

      const employeeData = employeeDoc.data();
      if (!employeeData?.workScheduleId) {
        return {
          schedule: null,
          daySchedule: null,
          isWorkingDay: false,
          expectedHours: 0
        };
      }

      // Récupérer l'horaire de travail
      const schedule = await this.getWorkScheduleById(employeeData.workScheduleId);
      if (!schedule) {
        return {
          schedule: null,
          daySchedule: null,
          isWorkingDay: false,
          expectedHours: 0
        };
      }

      const scheduleModel = new WorkScheduleModel(schedule);
      const daySchedule = scheduleModel.getScheduleForDate(date);
      const isWorkingDay = scheduleModel.isWorkingDay(date);
      const expectedHours = scheduleModel.getExpectedWorkHours(date);

      return {
        schedule,
        daySchedule,
        isWorkingDay,
        expectedHours
      };
    } catch (error) {
      logger.error('Error getting effective schedule for employee', { error, employeeId, date });
      throw error;
    }
  }

  /**
   * Obtenir les horaires actifs pour une organisation
   */
  async getActiveSchedulesForOrganization(organizationId: string): Promise<WorkSchedule[]> {
    try {
      const query = db.collection(this.collectionName)
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const schedules: WorkSchedule[] = [];

      snapshot.forEach(doc => {
        const schedule = WorkScheduleModel.fromFirestore(doc);
        if (schedule) {
          schedules.push(schedule.getData());
        }
      });

      return schedules;
    } catch (error) {
      logger.error('Error getting active schedules for organization', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des horaires
   */
  async getScheduleStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<ScheduleType, number>;
    averageWeeklyHours: number;
    employeesAssigned: number;
  }> {
    try {
      const query = db.collection(this.collectionName)
        .where('organizationId', '==', organizationId);

      const snapshot = await query.get();
      
      let total = 0;
      let active = 0;
      let inactive = 0;
      const byType: Record<ScheduleType, number> = {
        [ScheduleType.FIXED]: 0,
        [ScheduleType.FLEXIBLE]: 0,
        [ScheduleType.SHIFT]: 0,
        [ScheduleType.REMOTE]: 0
      };
      let totalWeeklyHours = 0;

      snapshot.forEach(doc => {
        const schedule = WorkScheduleModel.fromFirestore(doc);
        if (schedule) {
          const data = schedule.getData();
          total++;
          
          if (data.isActive) {
            active++;
          } else {
            inactive++;
          }

          byType[data.type]++;
          totalWeeklyHours += schedule.getTotalWeeklyHours();
        }
      });

      // Compter les employés assignés
      const employeesQuery = db.collection('employees')
        .where('organizationId', '==', organizationId)
        .where('workScheduleId', '!=', null);

      const employeesSnapshot = await employeesQuery.count().get();
      const employeesAssigned = employeesSnapshot.data().count;

      return {
        total,
        active,
        inactive,
        byType,
        averageWeeklyHours: total > 0 ? totalWeeklyHours / total : 0,
        employeesAssigned
      };
    } catch (error) {
      logger.error('Error getting schedule stats', { error, organizationId });
      throw error;
    }
  }

  /**
   * Vérifier les conflits d'horaires
   */
  private async checkScheduleConflicts(
    schedule: WorkScheduleModel, 
    organizationId: string, 
    excludeId?: string
  ): Promise<ScheduleConflictInfo> {
    try {
      const query = db.collection(this.collectionName)
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const conflictingSchedules: WorkSchedule[] = [];

      snapshot.forEach(doc => {
        if (excludeId && doc.id === excludeId) {
          return; // Ignorer l'horaire en cours de modification
        }

        const existingSchedule = WorkScheduleModel.fromFirestore(doc);
        if (existingSchedule && schedule.hasConflictWith(existingSchedule)) {
          conflictingSchedules.push(existingSchedule.getData());
        }
      });

      return {
        hasConflict: conflictingSchedules.length > 0,
        conflictingSchedules,
        conflictPeriods: [] // TODO: Implémenter le calcul détaillé des périodes de conflit
      };
    } catch (error) {
      logger.error('Error checking schedule conflicts', { error, organizationId });
      return {
        hasConflict: false,
        conflictingSchedules: [],
        conflictPeriods: []
      };
    }
  }

  /**
   * Valider l'unicité du nom d'horaire
   */
  private async validateUniqueScheduleName(name: string, organizationId: string, excludeId?: string): Promise<void> {
    const query = db.collection(this.collectionName)
      .where('name', '==', name)
      .where('organizationId', '==', organizationId);

    const snapshot = await query.get();
    
    if (!snapshot.empty) {
      // Si on exclut un ID (pour les mises à jour), vérifier que ce n'est pas le même
      if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
        return;
      }
      throw new Error(`Schedule name "${name}" already exists in this organization`);
    }
  }

  /**
   * Obtenir les employés utilisant un horaire
   */
  private async getEmployeesUsingSchedule(scheduleId: string): Promise<string[]> {
    try {
      const query = db.collection('employees')
        .where('workScheduleId', '==', scheduleId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      logger.error('Error getting employees using schedule', { error, scheduleId });
      return [];
    }
  }
}

export const workScheduleService = new WorkScheduleService();