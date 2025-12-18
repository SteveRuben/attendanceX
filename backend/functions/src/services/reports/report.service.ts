/**
 * Service unifié pour la génération de rapports
 * Fusion des services de rapports d'événements/présence et de temps/projets
 */

import { collections } from '../../config/database';
import { ValidationError } from '../../models/base.model';
import { ExportFormat, TimesheetStatus, ProjectStatus } from '../../common/types';
import { timeEntryService, projectService } from '../timesheet';
import { UserService } from '../user/user.service';
import { eventService } from '../event/legacy-event.service';
import { attendanceService } from '../attendance/attendance.service';

// ==================== TYPES COMMUNS ====================

export interface BaseReportFilters {
  tenantId: string;
  startDate?: string;
  endDate?: string;
  format?: ExportFormat;
  generatedBy?: string;
}

// ==================== TYPES POUR RAPPORTS DE TEMPS ====================

export interface TimesheetReportFilters extends BaseReportFilters {
  employeeIds?: string[];
  projectIds?: string[];
  activityCodeIds?: string[];
  statuses?: TimesheetStatus[];
  billableOnly?: boolean;
  includeInactive?: boolean;
}

// ==================== TYPES POUR RAPPORTS D'ÉVÉNEMENTS ====================

export interface EventReportFilters extends BaseReportFilters {
  eventIds?: string[];
  userIds?: string[];
  departments?: string[];
  eventTypes?: string[];
}

export interface EmployeeReportData {
  employeeId: string;
  employeeName?: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalCost: number;
  projectBreakdown: Record<string, {
    hours: number;
    cost: number;
    billableHours: number;
  }>;
  activityBreakdown: Record<string, number>;
  timesheetCount: number;
  averageHoursPerDay: number;
  efficiency: number;
}

export interface ProjectReportData {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  totalCost: number;
  budget?: number;
  budgetUtilization: number;
  employeeBreakdown: Record<string, {
    hours: number;
    cost: number;
  }>;
  activityBreakdown: Record<string, number>;
  profitMargin: number;
  status: ProjectStatus;
}

export interface TimeReportData {
  date: string;
  totalHours: number;
  billableHours: number;
  entries: Array<{
    employeeId: string;
    projectId: string;
    activityCodeId?: string;
    hours: number;
    description?: string;
    billable: boolean;
    cost: number;
  }>;
}

export interface ProductivityReportData {
  period: string;
  totalHours: number;
  billableHours: number;
  efficiency: number;
  averageHoursPerEmployee: number;
  topPerformers: Array<{
    employeeId: string;
    hours: number;
    efficiency: number;
  }>;
  projectProductivity: Array<{
    projectId: string;
    hours: number;
    efficiency: number;
    cost: number;
  }>;
}

export interface ProfitabilityReportData {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  projectBreakdown: Array<{
    projectId: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }>;
  employeeBreakdown: Array<{
    employeeId: string;
    revenue: number;
    costs: number;
    utilization: number;
  }>;
}

export interface ExportResult {
  id: string;
  fileName: string;
  format: ExportFormat;
  downloadUrl: string;
  size: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  filters: any;
  columns: string[];
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface ReportSchedule {
  id: string;
  name: string;
  reportType: string;
  filters: any;
  format: ExportFormat;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdBy: string;
  createdAt: Date;
}

export class ReportService {

  // ==================== RAPPORTS DE TEMPS ET PROJETS ====================

  /**
   * Générer un rapport par employé
   */
  async generateEmployeeReport(filters: TimesheetReportFilters): Promise<EmployeeReportData[]> {
    try {
      const { tenantId, startDate, endDate, employeeIds } = filters;

      // Obtenir les entrées de temps
      const timeEntriesQuery = {
        startDate,
        endDate,
        employeeIds,
        page: 1,
        limit: 10000 // Grande limite pour obtenir toutes les données
      };

      const timeEntriesResult = await timeEntryService.searchTimeEntries(tenantId, timeEntriesQuery);
      const timeEntries = timeEntriesResult.data;

      // Grouper par employé
      const employeeData = new Map<string, EmployeeReportData>();

      for (const entry of timeEntries) {
        const data = entry.getData();
        const employeeId = data.employeeId;

        if (!employeeData.has(employeeId)) {
          employeeData.set(employeeId, {
            employeeId,
            totalHours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            totalCost: 0,
            projectBreakdown: {},
            activityBreakdown: {},
            timesheetCount: 0,
            averageHoursPerDay: 0,
            efficiency: 0
          });
        }

        const employee = employeeData.get(employeeId)!;
        const hours = data.duration / 60; // Convertir minutes en heures
        const cost = data.totalCost || 0;

        employee.totalHours += hours;
        employee.totalCost += cost;

        if (data.billable) {
          employee.billableHours += hours;
        } else {
          employee.nonBillableHours += hours;
        }

        // Répartition par projet
        if (data.projectId) {
          if (!employee.projectBreakdown[data.projectId]) {
            employee.projectBreakdown[data.projectId] = {
              hours: 0,
              cost: 0,
              billableHours: 0
            };
          }
          employee.projectBreakdown[data.projectId].hours += hours;
          employee.projectBreakdown[data.projectId].cost += cost;
          if (data.billable) {
            employee.projectBreakdown[data.projectId].billableHours += hours;
          }
        }

        // Répartition par activité
        if (data.activityCodeId) {
          employee.activityBreakdown[data.activityCodeId] = 
            (employee.activityBreakdown[data.activityCodeId] || 0) + hours;
        }
      }

      // Calculer les métriques
      const result = Array.from(employeeData.values()).map(employee => {
        if (employee.totalHours > 0) {
          employee.efficiency = (employee.billableHours / employee.totalHours) * 100;
        }

        // Calculer la moyenne d'heures par jour (approximation)
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          employee.averageHoursPerDay = employee.totalHours / days;
        }

        return employee;
      });

      return result.sort((a, b) => b.totalHours - a.totalHours);
    } catch (error) {
      throw new Error(`Failed to generate employee report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport par projet
   */
  async generateProjectReport(filters: TimesheetReportFilters): Promise<ProjectReportData[]> {
    try {
      const { tenantId, startDate, endDate, projectIds } = filters;

      // Obtenir les projets
      const projectsResult = await projectService.getProjects(tenantId, {
        page: 1,
        limit: 1000
      });
      const projects = projectsResult.data;

      // Obtenir les entrées de temps
      const timeEntriesResult = await timeEntryService.searchTimeEntries(tenantId, {
        startDate,
        endDate,
        projectIds,
        page: 1,
        limit: 10000
      } as any);
      const timeEntries = timeEntriesResult.data;

      // Grouper par projet
      const projectData = new Map<string, ProjectReportData>();

      // Initialiser avec les projets
      for (const project of projects) {
        const data = project.getData();
        if (!projectIds || projectIds.includes(project.id!)) {
          projectData.set(project.id!, {
            projectId: project.id!,
            projectName: data.name,
            totalHours: 0,
            billableHours: 0,
            totalCost: 0,
            budget: data.budget,
            budgetUtilization: 0,
            employeeBreakdown: {},
            activityBreakdown: {},
            profitMargin: 0,
            status: data.status
          });
        }
      }

      // Ajouter les données des entrées de temps
      for (const entry of timeEntries) {
        const data = entry.getData();
        if (!data.projectId) continue;

        if (!projectData.has(data.projectId)) {
          projectData.set(data.projectId, {
            projectId: data.projectId,
            projectName: 'Projet inconnu',
            totalHours: 0,
            billableHours: 0,
            totalCost: 0,
            budgetUtilization: 0,
            employeeBreakdown: {},
            activityBreakdown: {},
            profitMargin: 0,
            status: ProjectStatus.ACTIVE
          });
        }

        const project = projectData.get(data.projectId)!;
        const hours = data.duration / 60;
        const cost = data.totalCost || 0;

        project.totalHours += hours;
        project.totalCost += cost;

        if (data.billable) {
          project.billableHours += hours;
        }

        // Répartition par employé
        if (!project.employeeBreakdown[data.employeeId]) {
          project.employeeBreakdown[data.employeeId] = {
            hours: 0,
            cost: 0
          };
        }
        project.employeeBreakdown[data.employeeId].hours += hours;
        project.employeeBreakdown[data.employeeId].cost += cost;

        // Répartition par activité
        if (data.activityCodeId) {
          project.activityBreakdown[data.activityCodeId] = 
            (project.activityBreakdown[data.activityCodeId] || 0) + hours;
        }
      }

      // Calculer les métriques
      const result = Array.from(projectData.values()).map(project => {
        if (project.budget && project.budget > 0) {
          project.budgetUtilization = (project.totalCost / project.budget) * 100;
          project.profitMargin = ((project.budget - project.totalCost) / project.budget) * 100;
        }

        return project;
      });

      return result.sort((a, b) => b.totalHours - a.totalHours);
    } catch (error) {
      throw new Error(`Failed to generate project report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport de temps détaillé
   */
  async generateTimeReport(filters: TimesheetReportFilters): Promise<TimeReportData[]> {
    try {
      const { tenantId, startDate, endDate } = filters;

      const timeEntriesResult = await timeEntryService.searchTimeEntries(tenantId, {
        startDate,
        endDate,
        employeeIds: filters.employeeIds,
        projectIds: filters.projectIds,
        activityCodeIds: filters.activityCodeIds,
        billableOnly: filters.billableOnly,
        page: 1,
        limit: 10000
      } as any);

      const timeEntries = timeEntriesResult.data;

      // Grouper par date
      const dateData = new Map<string, TimeReportData>();

      for (const entry of timeEntries) {
        const data = entry.getData();
        const date = data.date;

        if (!dateData.has(date)) {
          dateData.set(date, {
            date,
            totalHours: 0,
            billableHours: 0,
            entries: []
          });
        }

        const dayData = dateData.get(date)!;
        const hours = data.duration / 60;

        dayData.totalHours += hours;
        if (data.billable) {
          dayData.billableHours += hours;
        }

        dayData.entries.push({
          employeeId: data.employeeId,
          projectId: data.projectId || '',
          activityCodeId: data.activityCodeId,
          hours,
          description: data.description,
          billable: data.billable,
          cost: data.totalCost || 0
        });
      }

      return Array.from(dateData.values()).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      throw new Error(`Failed to generate time report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport de productivité
   */
  async generateProductivityReport(filters: TimesheetReportFilters): Promise<ProductivityReportData> {
    try {
      const employeeReport = await this.generateEmployeeReport(filters);
      const projectReport = await this.generateProjectReport(filters);

      const totalHours = employeeReport.reduce((sum, emp) => sum + emp.totalHours, 0);
      const totalBillableHours = employeeReport.reduce((sum, emp) => sum + emp.billableHours, 0);
      const efficiency = totalHours > 0 ? (totalBillableHours / totalHours) * 100 : 0;
      const averageHoursPerEmployee = employeeReport.length > 0 ? totalHours / employeeReport.length : 0;

      const topPerformers = employeeReport
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 10)
        .map(emp => ({
          employeeId: emp.employeeId,
          hours: emp.totalHours,
          efficiency: emp.efficiency
        }));

      const projectProductivity = projectReport.map(proj => ({
        projectId: proj.projectId,
        hours: proj.totalHours,
        efficiency: proj.totalHours > 0 ? (proj.billableHours / proj.totalHours) * 100 : 0,
        cost: proj.totalCost
      }));

      return {
        period: `${filters.startDate || 'début'} - ${filters.endDate || 'fin'}`,
        totalHours,
        billableHours: totalBillableHours,
        efficiency,
        averageHoursPerEmployee,
        topPerformers,
        projectProductivity
      };
    } catch (error) {
      throw new Error(`Failed to generate productivity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport de rentabilité
   */
  async generateProfitabilityReport(filters: TimesheetReportFilters): Promise<ProfitabilityReportData> {
    try {
      const employeeReport = await this.generateEmployeeReport(filters);
      const projectReport = await this.generateProjectReport(filters);

      const totalRevenue = projectReport.reduce((sum, proj) => sum + (proj.budget || 0), 0);
      const totalCosts = projectReport.reduce((sum, proj) => sum + proj.totalCost, 0);
      const grossProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      const projectBreakdown = projectReport.map(proj => ({
        projectId: proj.projectId,
        revenue: proj.budget || 0,
        costs: proj.totalCost,
        profit: (proj.budget || 0) - proj.totalCost,
        margin: proj.profitMargin
      }));

      const employeeBreakdown = employeeReport.map(emp => ({
        employeeId: emp.employeeId,
        revenue: emp.totalCost, // Simplifié
        costs: emp.totalCost,
        utilization: emp.efficiency
      }));

      return {
        totalRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        projectBreakdown,
        employeeBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to generate profitability report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exporter un rapport
   */
  async exportReport(options: {
    reportType: string;
    format: ExportFormat;
    filters: any;
    exportedBy: string;
  }): Promise<ExportResult> {
    try {
      const { reportType, format, filters, exportedBy } = options;

      // Générer les données selon le type de rapport
      let data: any;
      switch (reportType) {
        case 'employee':
          data = await this.generateEmployeeReport(filters);
          break;
        case 'project':
          data = await this.generateProjectReport(filters);
          break;
        case 'time':
          data = await this.generateTimeReport(filters);
          break;
        case 'productivity':
          data = await this.generateProductivityReport(filters);
          break;
        case 'profitability':
          data = await this.generateProfitabilityReport(filters);
          break;
        case 'attendance':
          data = await this.generateAttendanceReport(filters);
          break;
        case 'event_detail':
          data = await this.generateEventDetailReport(filters);
          break;
        default:
          throw new ValidationError('Invalid report type');
      }

      // Créer l'export (simulation)
      const exportId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
      const downloadUrl = `/api/reports/download/${exportId}`;
      const size = JSON.stringify(data).length; // Taille approximative
      const createdAt = new Date();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

      // Sauvegarder l'export en base
      const exportRecord = {
        id: exportId,
        reportType,
        format,
        fileName,
        downloadUrl,
        size,
        data: JSON.stringify(data),
        filters,
        exportedBy,
        createdAt,
        expiresAt,
        tenantId: filters.tenantId
      };

      await collections.report_exports.doc(exportId).set(exportRecord);

      return {
        id: exportId,
        fileName,
        format,
        downloadUrl,
        size,
        createdAt,
        expiresAt
      };
    } catch (error) {
      throw new Error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'historique des rapports
   */
  async getReportHistory(tenantId: string, options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    reportType?: string;
    format?: ExportFormat;
    startDate?: string;
    endDate?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        reportType,
        format,
        startDate,
        endDate
      } = options;

      let query = collections.report_exports
        .where('tenantId', '==', tenantId);

      if (reportType) {
        query = query.where('reportType', '==', reportType);
      }

      if (format) {
        query = query.where('format', '==', format);
      }

      if (startDate) {
        query = query.where('createdAt', '>=', new Date(startDate));
      }

      if (endDate) {
        query = query.where('createdAt', '<=', new Date(endDate));
      }

      query = query.orderBy(sortBy, sortOrder);

      const snapshot = await query.get();
      const exports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: undefined // Ne pas retourner les données dans l'historique
      }));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedExports = exports.slice(startIndex, endIndex);

      return {
        data: paginatedExports,
        pagination: {
          page,
          limit,
          total: exports.length,
          totalPages: Math.ceil(exports.length / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get report history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Télécharger un rapport exporté
   */
  async downloadReport(id: string, tenantId: string) {
    try {
      const doc = await collections.report_exports.doc(id).get();
      
      if (!doc.exists) {
        throw new ValidationError('Export not found');
      }

      const exportData = doc.data();
      if (exportData?.tenantId !== tenantId) {
        throw new ValidationError('Export not found');
      }

      // Vérifier l'expiration
      if (exportData?.expiresAt && new Date() > exportData.expiresAt.toDate()) {
        throw new ValidationError('Export has expired');
      }

      return {
        fileName: exportData?.fileName,
        format: exportData?.format,
        data: exportData?.data,
        size: exportData?.size
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Failed to download report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== RAPPORTS D'ÉVÉNEMENTS ET PRÉSENCE ====================

  /**
   * Générer un rapport de présence
   */
  async generateAttendanceReport(filters: EventReportFilters) {
    try {
      const { startDate, endDate, eventIds, userIds, departments } = filters;

      const dateRange = {
        start: startDate ? new Date(startDate) : new Date(),
        end: endDate ? new Date(endDate) : new Date(),
      };

      // Récupérer les données de présence
      const attendances = await this.getAttendanceData({
        dateRange,
        eventIds,
        userIds,
        departments,
      });

      // Récupérer les données des utilisateurs
      const userIds_unique = [...new Set(attendances.map((a) => a.userId))];
      await this.getUserData(userIds_unique);

      // Calculer les statistiques générales
      const eventIds_unique = [...new Set(attendances.map((a) => a.eventId))];
      const totalEvents = eventIds_unique.length;
      const totalUsers = userIds_unique.length;
      const totalAttendances = attendances.length;

      const statusCounts = attendances.reduce((acc, attendance) => {
        acc[attendance.status] = (acc[attendance.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const attendanceRate = totalAttendances > 0 ?
        ((statusCounts['present'] || 0) + (statusCounts['late'] || 0)) / totalAttendances * 100 :
        0;

      const punctualityRate = statusCounts['present'] && (statusCounts['present'] + statusCounts['late']) ?
        (statusCounts['present'] / (statusCounts['present'] + statusCounts['late'])) * 100 :
        0;

      return {
        type: 'attendance_summary',
        period: dateRange,
        summary: {
          totalEvents,
          totalUsers,
          totalAttendances,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          punctualityRate: Math.round(punctualityRate * 10) / 10,
          totalRecords: totalAttendances,
        },
        statusBreakdown: statusCounts,
        insights: this.generateAttendanceInsights(statusCounts, attendanceRate, punctualityRate),
      };
    } catch (error) {
      throw new Error(`Failed to generate attendance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport détaillé d'événement
   */
  async generateEventDetailReport(filters: EventReportFilters & { eventId: string }) {
    try {
      const { eventId } = filters;

      if (!eventId) {
        throw new Error("Event ID is required for event detail report");
      }

      // Récupérer l'événement
      const event = await eventService.getEventById(eventId);
      const eventData = event.getData();

      // Récupérer les présences pour cet événement
      const attendances = await attendanceService.getAttendancesByEvent(eventId);
      const attendanceData = attendances.map((a) => a.getData());

      // Récupérer les données des participants
      const userIds = eventData.participants;
      await this.getUserData(userIds);

      // Calculer les statistiques détaillées
      const totalParticipants = userIds.length;
      const totalAttended = attendanceData.filter((a) =>
        ['present', 'late'].includes(a.status)
      ).length;

      const statusCounts = attendanceData.reduce((acc, attendance) => {
        acc[attendance.status] = (acc[attendance.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        type: 'event_detail',
        event: {
          id: eventData.id!,
          title: eventData.title,
          type: eventData.type,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          location: eventData.location,
          organizer: eventData.organizerName,
        },
        summary: {
          totalUsers: totalParticipants,
          totalAttendances: totalAttended,
          attendanceRate: totalParticipants > 0 ? (totalAttended / totalParticipants) * 100 : 0,
          punctualityRate: totalAttended > 0 ? ((statusCounts['present'] || 0) / totalAttended) * 100 : 0,
          totalRecords: attendanceData.length,
        },
        statusBreakdown: statusCounts,
        insights: this.generateEventInsights(eventData, attendanceData, statusCounts),
      };
    } catch (error) {
      throw new Error(`Failed to generate event detail report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== MÉTHODES UTILITAIRES PRIVÉES ====================

  private async getAttendanceData(filters: {
    dateRange?: { start: Date; end: Date };
    eventIds?: string[];
    userIds?: string[];
    departments?: string[];
  }): Promise<any[]> {
    // Simulation - en production, utiliser AttendanceService
    return [];
  }

  private async getUserData(userIds: string[]): Promise<any[]> {
    const users = [];
    for (const userId of userIds) {
      try {
        const user = await UserService.getUserById(userId, ''); // Tenant ID sera fourni par le contexte
        if (user) {
          users.push(user);
        }
      } catch (error) {
        console.warn(`User not found: ${userId}`);
      }
    }
    return users;
  }

  private generateAttendanceInsights(
    statusCounts: Record<string, number>,
    attendanceRate: number,
    punctualityRate: number
  ): string[] {
    const insights: string[] = [];

    if (attendanceRate > 85) {
      insights.push("Excellent taux de présence global");
    } else if (attendanceRate < 60) {
      insights.push("Taux de présence préoccupant, nécessite une attention");
    }

    if (punctualityRate > 90) {
      insights.push("Excellente ponctualité des participants");
    } else if (punctualityRate < 70) {
      insights.push("Problème de ponctualité à adresser");
    }

    return insights;
  }

  private generateEventInsights(eventData: any, attendanceData: any[], statusCounts: Record<string, number>): string[] {
    const insights: string[] = [];
    const attendanceRate = (statusCounts['present'] + statusCounts['late']) / eventData.participants.length * 100;

    if (attendanceRate > 90) {
      insights.push("Excellent taux de participation pour cet événement");
    } else if (attendanceRate < 50) {
      insights.push("Faible participation, considérer les facteurs d'amélioration");
    }

    return insights;
  }

  /**
   * Valider les filtres de rapport
   */
  async validateReportFilters(filters: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier les dates
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (start > end) {
        errors.push('Start date must be before end date');
      }

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        warnings.push('Date range is longer than 1 year, report may take longer to generate');
      }
    }

    // Vérifier les IDs
    if (filters.employeeIds && filters.employeeIds.length > 100) {
      warnings.push('Large number of employees selected, report may take longer to generate');
    }

    if (filters.projectIds && filters.projectIds.length > 50) {
      warnings.push('Large number of projects selected, report may take longer to generate');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const reportService = new ReportService();