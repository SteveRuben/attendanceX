/**
 * Service pour la gestion des feuilles de temps
 */

import { TimesheetModel } from '../../models/timesheet.model';
import { ValidationError } from '../../models/base.model';
import { TimesheetStatus, TimesheetTotals } from '../../common/types';
import { collections } from '../../config/database';

export interface CreateTimesheetData {
  employeeId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  createdBy: string;
}

export interface TimesheetFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  employeeId?: string;
  status?: TimesheetStatus;
  periodStart?: string;
  periodEnd?: string;
}

export interface TimesheetSearchFilters extends TimesheetFilters {
  query?: string;
  employeeIds?: string[];
  projectIds?: string[];
  statuses?: TimesheetStatus[];
  minHours?: number;
  maxHours?: number;
  billableOnly?: boolean;
}

export class TimesheetService {
  private collection = collections.timesheets;

  /**
   * Créer une nouvelle feuille de temps
   */
  async createTimesheet(data: CreateTimesheetData): Promise<TimesheetModel> {
    try {
      const timesheet = new TimesheetModel(data);
      await timesheet.validate();

      const docRef = await this.collection.add(timesheet.toFirestore());
      const savedDoc = await docRef.get();
      const savedTimesheet = TimesheetModel.fromFirestore(savedDoc);
      
      if (!savedTimesheet) {
        throw new Error('Failed to create timesheet');
      }

      return savedTimesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir une feuille de temps par ID
   */
  async getTimesheetById(id: string, tenantId: string): Promise<TimesheetModel> {
    try {
      const doc = await this.collection.doc(id).get();
      const timesheet = TimesheetModel.fromFirestore(doc);

      if (!timesheet || timesheet.tenantId !== tenantId) {
        throw new ValidationError('Timesheet not found');
      }

      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les feuilles de temps d'un employé
   */
  async getEmployeeTimesheets(employeeId: string, tenantId: string, filters: TimesheetFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'periodStart',
        sortOrder = 'desc',
        status,
        periodStart,
        periodEnd
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (periodStart) {
        query = query.where('periodStart', '>=', periodStart);
      }

      if (periodEnd) {
        query = query.where('periodEnd', '<=', periodEnd);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      const timesheets = snapshot.docs
        .map(doc => TimesheetModel.fromFirestore(doc))
        .filter(Boolean) as TimesheetModel[];

      // Pagination simple
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTimesheets = timesheets.slice(startIndex, endIndex);

      return {
        data: paginatedTimesheets,
        pagination: {
          page,
          limit,
          total: timesheets.length,
          totalPages: Math.ceil(timesheets.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get employee timesheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour une feuille de temps
   */
  async updateTimesheet(id: string, tenantId: string, updates: Partial<any>, updatedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      if (!timesheet.isEditable) {
        throw new ValidationError('Cannot update non-editable timesheet');
      }

      timesheet.update({ ...updates, updatedBy });
      await timesheet.validate();

      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return await this.getTimesheetById(id, tenantId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer une feuille de temps
   */
  async deleteTimesheet(id: string, tenantId: string, deletedBy: string): Promise<void> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      if (!timesheet.isDraft) {
        throw new ValidationError('Only draft timesheets can be deleted');
      }

      await this.collection.doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soumettre une feuille de temps
   */
  async submitTimesheet(id: string, tenantId: string, submittedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      timesheet.submit(submittedBy);
      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to submit timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approuver une feuille de temps
   */
  async approveTimesheet(id: string, tenantId: string, approvedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      timesheet.approve(approvedBy);
      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to approve timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rejeter une feuille de temps
   */
  async rejectTimesheet(id: string, tenantId: string, reason: string, rejectedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      timesheet.reject(rejectedBy, reason);
      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to reject timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculer les totaux d'une feuille de temps
   */
  async calculateTotals(id: string, tenantId: string): Promise<TimesheetTotals> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      // Récupérer les entrées de temps réelles pour un calcul précis
      const timeEntriesSnapshot = await collections.time_entries
        .where('tenantId', '==', tenantId)
        .where('timesheetId', '==', id)
        .get();

      const timeEntries = timeEntriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return timesheet.calculateTotals(timeEntries);
    } catch (error) {
      throw new Error(`Failed to calculate totals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider une feuille de temps
   */
  async validateTimesheet(id: string, tenantId: string) {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      const isValid = await timesheet.validate();
      const completeness = timesheet.validateCompleteness();
      const anomalies = timesheet.detectAnomalies();
      
      return {
        isValid,
        completeness,
        anomalies,
        hasAnomalies: anomalies.length > 0
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        completeness: { isComplete: false, missingDays: [], warnings: [] },
        anomalies: [],
        hasAnomalies: false
      };
    }
  }

  /**
   * Rechercher des feuilles de temps
   */
  async searchTimesheets(tenantId: string, filters: TimesheetSearchFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'periodStart',
        sortOrder = 'desc',

        employeeIds,
        statuses,
        periodStart,
        periodEnd,
        minHours,
        maxHours,
        billableOnly
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (employeeIds && employeeIds.length > 0) {
        query = query.where('employeeId', 'in', employeeIds);
      }

      if (statuses && statuses.length > 0) {
        query = query.where('status', 'in', statuses);
      }

      if (periodStart) {
        query = query.where('periodStart', '>=', periodStart);
      }

      if (periodEnd) {
        query = query.where('periodEnd', '<=', periodEnd);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      let timesheets = snapshot.docs
        .map(doc => TimesheetModel.fromFirestore(doc))
        .filter(Boolean) as TimesheetModel[];

      // Filtres additionnels en mémoire
      if (minHours !== undefined) {
        timesheets = timesheets.filter(t => t.totalHours >= minHours);
      }

      if (maxHours !== undefined) {
        timesheets = timesheets.filter(t => t.totalHours <= maxHours);
      }

      if (billableOnly) {
        timesheets = timesheets.filter(t => t.totalBillableHours > 0);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTimesheets = timesheets.slice(startIndex, endIndex);

      return {
        data: paginatedTimesheets,
        pagination: {
          page,
          limit,
          total: timesheets.length,
          totalPages: Math.ceil(timesheets.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to search timesheets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verrouiller une feuille de temps
   */
  async lockTimesheet(id: string, tenantId: string, lockedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      if (timesheet.status !== TimesheetStatus.APPROVED) {
        throw new ValidationError('Only approved timesheets can be locked');
      }

      timesheet.update({ 
        status: TimesheetStatus.LOCKED,
        lockedBy,
        lockedAt: new Date(),
        updatedBy: lockedBy
      });

      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to lock timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Déverrouiller une feuille de temps
   */
  async unlockTimesheet(id: string, tenantId: string, unlockedBy: string): Promise<TimesheetModel> {
    try {
      const timesheet = await this.getTimesheetById(id, tenantId);
      
      if (timesheet.status !== TimesheetStatus.LOCKED) {
        throw new ValidationError('Only locked timesheets can be unlocked');
      }

      timesheet.update({ 
        status: TimesheetStatus.APPROVED,
        lockedBy: null,
        lockedAt: null,
        updatedBy: unlockedBy
      });

      await this.collection.doc(id).update(timesheet.toFirestore());
      
      return timesheet;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to unlock timesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques des feuilles de temps
   */
  async getTimesheetStats(tenantId: string, filters: { startDate?: string; endDate?: string; employeeId?: string } = {}) {
    try {
      const { startDate, endDate, employeeId } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      if (startDate) {
        query = query.where('periodStart', '>=', startDate);
      }

      if (endDate) {
        query = query.where('periodEnd', '<=', endDate);
      }

      const snapshot = await query.get();
      const timesheets = snapshot.docs
        .map(doc => TimesheetModel.fromFirestore(doc))
        .filter(Boolean) as TimesheetModel[];

      const stats = {
        totalTimesheets: timesheets.length,
        totalHours: timesheets.reduce((sum, t) => sum + t.totalHours, 0),
        totalBillableHours: timesheets.reduce((sum, t) => sum + t.totalBillableHours, 0),
        totalCost: timesheets.reduce((sum, t) => sum + t.totalCost, 0),
        averageHoursPerTimesheet: 0,
        billablePercentage: 0,
        statusBreakdown: {} as Record<string, number>,
        periodTypeBreakdown: {} as Record<string, number>
      };

      if (stats.totalTimesheets > 0) {
        stats.averageHoursPerTimesheet = stats.totalHours / stats.totalTimesheets;
      }

      if (stats.totalHours > 0) {
        stats.billablePercentage = (stats.totalBillableHours / stats.totalHours) * 100;
      }

      // Répartition par statut
      timesheets.forEach(timesheet => {
        const status = timesheet.status;
        stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;

        const periodType = timesheet.getPeriodType();
        stats.periodTypeBreakdown[periodType] = (stats.periodTypeBreakdown[periodType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get timesheet stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const timesheetService = new TimesheetService();