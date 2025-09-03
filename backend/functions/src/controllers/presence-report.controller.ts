/**
 * Contrôleur pour les API de rapports de présence
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { presenceReportService, ReportFilters, ReportOptions } from '../services/presence-report.service';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';

// Schémas de validation
const ReportFiltersSchema = z.object({
  organizationId: z.string().min(1),
  employeeIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statuses: z.array(z.string()).optional(),
  includeBreakdown: z.boolean().optional(),
  includeAnomalies: z.boolean().optional()
}).transform((data): ReportFilters => ({
  organizationId: data.organizationId,
  employeeIds: data.employeeIds,
  departmentIds: data.departmentIds,
  startDate: data.startDate,
  endDate: data.endDate,
  statuses: data.statuses as any, // Cast pour éviter les problèmes de type enum
  includeBreakdown: data.includeBreakdown,
  includeAnomalies: data.includeAnomalies
}));

const ReportOptionsSchema = z.object({
  format: z.enum(['json', 'pdf', 'excel', 'csv']),
  includeCharts: z.boolean().optional(),
  includeDetails: z.boolean().optional(),
  groupBy: z.enum(['employee', 'department', 'date', 'week', 'month']).optional(),
  sortBy: z.enum(['date', 'employee', 'hours', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const ScheduledReportSchema = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().min(1),
  filters: ReportFiltersSchema,
  options: ReportOptionsSchema,
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  }),
  recipients: z.array(z.string().min(1)),
  isActive: z.boolean()
});

export class PresenceReportController {
  /**
   * Générer un rapport de présence
   */
  async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { filters, options } = req.body;
      const generatedBy = req.user?.uid || 'system';

      // Validation des données
      const validatedFilters = ReportFiltersSchema.parse(filters);
      const validatedOptions = ReportOptionsSchema.parse(options);

      logger.info('Generating presence report', { filters: validatedFilters, options: validatedOptions });
      // @ts-ignore
      const report = await presenceReportService.generateReport( validatedFilters, validatedOptions,  generatedBy);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Report generated successfully'
      });

    } catch (error) {
      logger.error('Generate report failed', { error, body: req.body });
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        code: 'GENERATE_REPORT_FAILED'
      });
    }
  }

  /**
   * Obtenir un rapport existant
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;

      const report = await presenceReportService.getReport(reportId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
          code: 'REPORT_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Get report failed', { error, reportId: req.params.reportId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report',
        code: 'GET_REPORT_FAILED'
      });
    }
  }

  /**
   * Lister les rapports avec pagination
   */
  async listReports(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.params.organizationId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (limit > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit cannot exceed 100',
          code: 'LIMIT_EXCEEDED'
        });
        return;
      }

      const result = await presenceReportService.listReports(organizationId, page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('List reports failed', { error, organizationId: req.params.organizationId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list reports',
        code: 'LIST_REPORTS_FAILED'
      });
    }
  }

  /**
   * Exporter un rapport vers un fichier
   */
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;
      const { format } = req.body;

      if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid export format. Supported formats: pdf, excel, csv',
          code: 'INVALID_FORMAT'
        });
        return;
      }

      const fileUrl = await presenceReportService.exportReport(reportId, format);

      res.status(200).json({
        success: true,
        data: {
          fileUrl,
          format
        },
        message: 'Report exported successfully'
      });

    } catch (error) {
      logger.error('Export report failed', { error, reportId: req.params.reportId });
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export report',
        code: 'EXPORT_REPORT_FAILED'
      });
    }
  }

  /**
   * Créer un rapport programmé
   */
  async createScheduledReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const scheduledReportData = req.body;
      const createdBy = req.user?.uid || 'system';

      // Validation des données
      const validatedData = ScheduledReportSchema.parse(scheduledReportData);

      // Calculer la prochaine exécution
      const nextRun = this.calculateNextRun(validatedData.schedule);
      // @ts-ignore
      const scheduledReport = await presenceReportService.createScheduledReport({
        ...validatedData,
        nextRun,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: scheduledReport,
        message: 'Scheduled report created successfully'
      });

    } catch (error) {
      logger.error('Create scheduled report failed', { error, body: req.body });
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scheduled report',
        code: 'CREATE_SCHEDULED_REPORT_FAILED'
      });
    }
  }

  /**
   * Exécuter les rapports programmés (endpoint admin)
   */
  async runScheduledReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Vérifier les permissions admin
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const result = await presenceReportService.runScheduledReports();

      res.status(200).json({
        success: true,
        data: result,
        message: 'Scheduled reports execution completed'
      });

    } catch (error) {
      logger.error('Run scheduled reports failed', { error });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run scheduled reports',
        code: 'RUN_SCHEDULED_REPORTS_FAILED'
      });
    }
  }

  /**
   * Générer un rapport rapide avec paramètres prédéfinis
   */
  async generateQuickReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, organizationId, employeeId, period } = req.query;
      const generatedBy = req.user?.uid || 'system';

      if (!type || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'Type and organization ID are required',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      // Définir les filtres et options selon le type de rapport
      const { filters, options } = this.getQuickReportConfig(
        type as string,
        organizationId as string,
        employeeId as string,
        period as string
      );

      const report = await presenceReportService.generateReport(filters, options, generatedBy);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Quick report generated successfully'
      });

    } catch (error) {
      logger.error('Generate quick report failed', { error, query: req.query });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate quick report',
        code: 'GENERATE_QUICK_REPORT_FAILED'
      });
    }
  }

  /**
   * Obtenir les statistiques de rapports
   */
  async getReportStats(req: Request, res: Response): Promise<void> {
    try {
      // Variables pour future implémentation
      // const organizationId = req.params.organizationId;
      // const { period } = req.query;

      // Pour l'instant, retourner des statistiques basiques
      // Dans une implémentation complète, on calculerait les vraies statistiques
      const stats = {
        totalReports: 0,
        reportsThisMonth: 0,
        scheduledReports: 0,
        mostUsedFormat: 'excel',
        averageGenerationTime: 0
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get report stats failed', { error, organizationId: req.params.organizationId });
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report stats',
        code: 'GET_REPORT_STATS_FAILED'
      });
    }
  }

  // Méthodes utilitaires privées
  private calculateNextRun(schedule: any): Date {
    const now = new Date();
    const nextRun = new Date(now);
    
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilTarget = (schedule.dayOfWeek - now.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilTarget || 7));
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        if (schedule.dayOfMonth) {
          nextRun.setDate(schedule.dayOfMonth);
        }
        break;
    }

    // Définir l'heure
    const [hours, minutes] = schedule.time.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    return nextRun;
  }

  private getQuickReportConfig(
    type: string,
    organizationId: string,
    employeeId?: string,
    period?: string
  ): { filters: ReportFilters; options: ReportOptions } {
    const now = new Date();
    let startDate: string;
    let endDate: string;

    // Calculer les dates selon la période
    switch (period) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      default:
        // Par défaut: cette semaine
        const defaultStart = new Date(now);
        defaultStart.setDate(now.getDate() - now.getDay());
        startDate = defaultStart.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }

    const filters: ReportFilters = {
      organizationId,
      startDate,
      endDate,
      ...(employeeId && { employeeIds: [employeeId] })
    };

    const options: ReportOptions = {
      format: 'json',
      includeDetails: true,
      includeCharts: false
    };

    // Personnaliser selon le type de rapport
    switch (type) {
      case 'attendance_summary':
        options.groupBy = 'employee';
        options.sortBy = 'employee';
        break;
      case 'daily_detail':
        options.groupBy = 'date';
        options.sortBy = 'date';
        options.sortOrder = 'desc';
        break;
      case 'overtime_report':
        filters.includeAnomalies = true;
        options.sortBy = 'hours';
        options.sortOrder = 'desc';
        break;
    }

    return { filters, options };
  }
}

export const presenceReportController = new PresenceReportController();