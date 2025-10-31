/**
 * Service pour la gestion des entrées de temps
 */

import { TimeEntryModel } from '../../models/time-entry.model';
import { ValidationError } from '../../models/base.model';
import { TimeEntryInput, TimeEntryStatus } from '../../common/types';
import { collections } from '../../config/database';

export interface CreateTimeEntryData extends TimeEntryInput {
  tenantId: string;
  createdBy: string;
}

export interface TimeEntryFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  projectId?: string;
  status?: TimeEntryStatus;
  billable?: boolean;
  timesheetId?: string;
}

export interface TimeEntrySearchFilters extends TimeEntryFilters {
  query?: string;
  employeeIds?: string[];
  projectIds?: string[];
  activityCodeIds?: string[];
  minDuration?: number;
  maxDuration?: number;
  billableOnly?: boolean;
}

export class TimeEntryService {
  private collection = collections.time_entries;

  /**
   * Créer une nouvelle entrée de temps
   */
  async createTimeEntry(data: CreateTimeEntryData): Promise<TimeEntryModel> {
    try {
      const timeEntry = new TimeEntryModel(data);
      await timeEntry.validate();

      const docRef = await this.collection.add(timeEntry.toFirestore());
      const savedDoc = await docRef.get();
      const savedTimeEntry = TimeEntryModel.fromFirestore(savedDoc);
      
      if (!savedTimeEntry) {
        throw new Error('Failed to create time entry');
      }

      return savedTimeEntry;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to create time entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir une entrée de temps par ID
   */
  async getTimeEntryById(id: string, tenantId: string): Promise<TimeEntryModel> {
    try {
      const doc = await this.collection.doc(id).get();
      const timeEntry = TimeEntryModel.fromFirestore(doc);

      if (!timeEntry || timeEntry.getData().tenantId !== tenantId) {
        throw new ValidationError('Time entry not found');
      }

      return timeEntry;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to get time entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les entrées de temps d'un employé
   */
  async getEmployeeTimeEntries(employeeId: string, tenantId: string, filters: TimeEntryFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc',
        startDate,
        endDate,
        projectId,
        status,
        billable,
        timesheetId
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId);

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      if (billable !== undefined) {
        query = query.where('billable', '==', billable);
      }

      if (timesheetId) {
        query = query.where('timesheetId', '==', timesheetId);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      const timeEntries = snapshot.docs
        .map(doc => TimeEntryModel.fromFirestore(doc))
        .filter(Boolean) as TimeEntryModel[];

      // Pagination simple
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = timeEntries.slice(startIndex, endIndex);

      return {
        data: paginatedEntries,
        pagination: {
          page,
          limit,
          total: timeEntries.length,
          totalPages: Math.ceil(timeEntries.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get employee time entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les entrées de temps d'une feuille de temps
   */
  async getTimesheetTimeEntries(timesheetId: string, tenantId: string, filters: TimeEntryFilters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'date',
        sortOrder = 'asc',
        projectId,
        billable
      } = filters;

      const activityCodeId = (filters as any).activityCodeId;

      let query = this.collection
        .where('tenantId', '==', tenantId)
        .where('timesheetId', '==', timesheetId);

      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }

      if (activityCodeId) {
        query = query.where('activityCodeId', '==', activityCodeId);
      }

      if (billable !== undefined) {
        query = query.where('billable', '==', billable);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      const timeEntries = snapshot.docs
        .map(doc => TimeEntryModel.fromFirestore(doc))
        .filter(Boolean) as TimeEntryModel[];

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = timeEntries.slice(startIndex, endIndex);

      return {
        data: paginatedEntries,
        pagination: {
          page,
          limit,
          total: timeEntries.length,
          totalPages: Math.ceil(timeEntries.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get timesheet time entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mettre à jour une entrée de temps
   */
  async updateTimeEntry(id: string, tenantId: string, updates: Partial<any>, updatedBy: string): Promise<TimeEntryModel> {
    try {
      const timeEntry = await this.getTimeEntryById(id, tenantId);
      
      timeEntry.update({ ...updates, updatedBy });
      await timeEntry.validate();

      await this.collection.doc(id).update(timeEntry.toFirestore());
      
      return await this.getTimeEntryById(id, tenantId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to update time entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer une entrée de temps
   */
  async deleteTimeEntry(id: string, tenantId: string, deletedBy: string): Promise<void> {
    try {
      await this.getTimeEntryById(id, tenantId);
      
      await this.collection.doc(id).delete();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to delete time entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dupliquer une entrée de temps
   */
  async duplicateTimeEntry(id: string, tenantId: string, options: { newDate?: string; newTimesheetId?: string; createdBy: string }): Promise<TimeEntryModel> {
    try {
      const originalEntry = await this.getTimeEntryById(id, tenantId);
      const originalData = originalEntry.getData();
      
      const duplicateData = {
        ...originalData,
        id: undefined, // Nouveau ID sera généré
        date: options.newDate || originalData.date,
        timesheetId: options.newTimesheetId || originalData.timesheetId,
        createdBy: options.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await this.createTimeEntry(duplicateData);
    } catch (error) {
      throw new Error(`Failed to duplicate time entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import en lot d'entrées de temps
   */
  async bulkImportTimeEntries(entries: CreateTimeEntryData[], tenantId: string, importedBy: string) {
    try {
      const results = {
        imported: [] as TimeEntryModel[],
        failed: [] as { entry: CreateTimeEntryData; error: string }[]
      };

      for (const entryData of entries) {
        try {
          const timeEntry = await this.createTimeEntry({
            ...entryData,
            tenantId,
            createdBy: importedBy
          });
          results.imported.push(timeEntry);
        } catch (error) {
          results.failed.push({
            entry: entryData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to bulk import time entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rechercher des entrées de temps
   */
  async searchTimeEntries(tenantId: string, filters: TimeEntrySearchFilters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc',

        employeeIds,
        projectIds,
        activityCodeIds,
        startDate,
        endDate,
        billableOnly,
        minDuration,
        maxDuration
      } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (employeeIds && employeeIds.length > 0) {
        query = query.where('employeeId', 'in', employeeIds);
      }

      if (projectIds && projectIds.length > 0) {
        query = query.where('projectId', 'in', projectIds);
      }

      if (activityCodeIds && activityCodeIds.length > 0) {
        query = query.where('activityCodeId', 'in', activityCodeIds);
      }

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      if (billableOnly) {
        query = query.where('billable', '==', true);
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      let timeEntries = snapshot.docs
        .map(doc => TimeEntryModel.fromFirestore(doc))
        .filter(Boolean) as TimeEntryModel[];

      // Filtres additionnels en mémoire
      if (minDuration !== undefined) {
        timeEntries = timeEntries.filter(entry => entry.getData().duration >= minDuration);
      }

      if (maxDuration !== undefined) {
        timeEntries = timeEntries.filter(entry => entry.getData().duration <= maxDuration);
      }

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = timeEntries.slice(startIndex, endIndex);

      return {
        data: paginatedEntries,
        pagination: {
          page,
          limit,
          total: timeEntries.length,
          totalPages: Math.ceil(timeEntries.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to search time entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Valider une entrée de temps
   */
  async validateTimeEntry(id: string, tenantId: string) {
    try {
      const timeEntry = await this.getTimeEntryById(id, tenantId);
      
      const isValid = await timeEntry.validate();
      
      return {
        isValid,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Calculer le coût d'une entrée de temps
   */
  async calculateCost(id: string, tenantId: string) {
    try {
      const timeEntry = await this.getTimeEntryById(id, tenantId);
      const data = timeEntry.getData();
      
      const cost = {
        duration: data.duration,
        hourlyRate: data.hourlyRate || 0,
        totalCost: data.totalCost || 0,
        billable: data.billable,
        calculatedAt: new Date()
      };

      return cost;
    } catch (error) {
      throw new Error(`Failed to calculate cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques des entrées de temps
   */
  async getTimeEntryStats(tenantId: string, filters: { employeeId?: string; startDate?: string; endDate?: string; projectId?: string } = {}) {
    try {
      const { employeeId, startDate, endDate, projectId } = filters;

      let query = this.collection
        .where('tenantId', '==', tenantId);

      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      const snapshot = await query.get();
      const timeEntries = snapshot.docs
        .map(doc => TimeEntryModel.fromFirestore(doc))
        .filter(Boolean) as TimeEntryModel[];

      const stats = {
        totalEntries: timeEntries.length,
        totalDuration: timeEntries.reduce((sum, entry) => sum + entry.getData().duration, 0),
        totalBillableDuration: timeEntries.filter(entry => entry.getData().billable).reduce((sum, entry) => sum + entry.getData().duration, 0),
        totalCost: timeEntries.reduce((sum, entry) => sum + (entry.getData().totalCost || 0), 0),
        averageDuration: 0,
        billablePercentage: 0,
        projectBreakdown: {} as Record<string, number>,
        activityBreakdown: {} as Record<string, number>
      };

      if (stats.totalEntries > 0) {
        stats.averageDuration = stats.totalDuration / stats.totalEntries;
      }

      if (stats.totalDuration > 0) {
        stats.billablePercentage = (stats.totalBillableDuration / stats.totalDuration) * 100;
      }

      // Répartition par projet et activité
      timeEntries.forEach(entry => {
        const data = entry.getData();
        
        if (data.projectId) {
          stats.projectBreakdown[data.projectId] = (stats.projectBreakdown[data.projectId] || 0) + data.duration;
        }
        
        if (data.activityCodeId) {
          stats.activityBreakdown[data.activityCodeId] = (stats.activityBreakdown[data.activityCodeId] || 0) + data.duration;
        }
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get time entry stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const timeEntryService = new TimeEntryService();