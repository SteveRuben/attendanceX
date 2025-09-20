import { Response } from 'express';
import { AnalyticsFilters, AppointmentAnalyticsService } from '../../services/appointment/appointment-analytics.service';
import { AuthenticatedRequest } from '../../types/middleware.types';
import { AppointmentStatus } from '../../common/types';




/**
 * Contrôleur pour les analytics de rendez-vous
 * 
 * Ce contrôleur expose les endpoints pour récupérer les statistiques,
 * calculer les taux de présence/annulation, et générer des rapports.
 */
export class AppointmentAnalyticsController {
  private analyticsService: AppointmentAnalyticsService;

  constructor() {
    this.analyticsService = new AppointmentAnalyticsService();
  }

  /**
   * Récupère les statistiques générales des rendez-vous
   * GET /api/appointments/analytics/stats
   */
  async getAppointmentStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Extraction des filtres depuis les query parameters
      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.practitionerId) {
        filters.practitionerId = req.query.practitionerId as string;
      }
      
      if (req.query.serviceId) {
        filters.serviceId = req.query.serviceId as string;
      }
      
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      
      if (req.query.status) {
        const statusArray = Array.isArray(req.query.status) 
          ? req.query.status as string[]
          : [req.query.status as string];
        filters.status = statusArray as AppointmentStatus[];
      }

      const stats = await this.analyticsService.calculateAppointmentStats(
        organizationId,
        filters
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appointment statistics'
      });
    }
  }

  /**
   * Calcule le taux de présence pour une période
   * GET /api/appointments/analytics/attendance-rate
   */
  async getAttendanceRate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const { startDate, endDate, practitionerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Start date and end date are required' 
        });
        return;
      }

      const attendanceRate = await this.analyticsService.calculateAttendanceRate(
        organizationId,
        new Date(startDate as string),
        new Date(endDate as string),
        practitionerId as string
      );

      res.json({
        success: true,
        data: {
          attendanceRate,
          period: {
            startDate: startDate as string,
            endDate: endDate as string
          },
          practitionerId: practitionerId || null
        }
      });
    } catch (error) {
      console.error('Error calculating attendance rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate attendance rate'
      });
    }
  }

  /**
   * Calcule le taux d'annulation pour une période
   * GET /api/appointments/analytics/cancellation-rate
   */
  async getCancellationRate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const { startDate, endDate, practitionerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Start date and end date are required' 
        });
        return;
      }

      const cancellationRate = await this.analyticsService.calculateCancellationRate(
        organizationId,
        new Date(startDate as string),
        new Date(endDate as string),
        practitionerId as string
      );

      res.json({
        success: true,
        data: {
          cancellationRate,
          period: {
            startDate: startDate as string,
            endDate: endDate as string
          },
          practitionerId: practitionerId || null
        }
      });
    } catch (error) {
      console.error('Error calculating cancellation rate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate cancellation rate'
      });
    }
  }

  /**
   * Récupère les heures de pointe
   * GET /api/appointments/analytics/peak-hours
   */
  async getPeakHours(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Extraction des filtres
      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.practitionerId) {
        filters.practitionerId = req.query.practitionerId as string;
      }
      
      if (req.query.serviceId) {
        filters.serviceId = req.query.serviceId as string;
      }

      const peakHours = await this.analyticsService.calculatePeakHours(
        organizationId,
        filters
      );

      res.json({
        success: true,
        data: {
          peakHours,
          filters
        }
      });
    } catch (error) {
      console.error('Error getting peak hours:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve peak hours'
      });
    }
  }

  /**
   * Génère un rapport Excel
   * GET /api/appointments/analytics/reports/excel
   */
  async generateExcelReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Extraction des filtres
      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.practitionerId) {
        filters.practitionerId = req.query.practitionerId as string;
      }
      
      if (req.query.serviceId) {
        filters.serviceId = req.query.serviceId as string;
      }

      const filePath = await this.analyticsService.generateExcelReport(
        organizationId,
        filters
      );

      // Définir les headers pour le téléchargement
      const fileName = `rapport_rendez_vous_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Envoyer le fichier
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending Excel file:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to send Excel report'
          });
        }
        
        // Nettoyer le fichier temporaire après envoi
        const fs = require('fs');
        fs.unlink(filePath, (unlinkErr: any) => {
          if (unlinkErr) {
            console.error('Error deleting temporary file:', unlinkErr);
          }
        });
      });
    } catch (error) {
      console.error('Error generating Excel report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate Excel report'
      });
    }
  }

  /**
   * Génère un rapport PDF
   * GET /api/appointments/analytics/reports/pdf
   */
  async generatePDFReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Extraction des filtres
      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.practitionerId) {
        filters.practitionerId = req.query.practitionerId as string;
      }
      
      if (req.query.serviceId) {
        filters.serviceId = req.query.serviceId as string;
      }

      const filePath = await this.analyticsService.generatePDFReport(
        organizationId,
        filters
      );

      // Définir les headers pour le téléchargement
      const fileName = `rapport_rendez_vous_${Date.now()}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Envoyer le fichier
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending PDF file:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to send PDF report'
          });
        }
        
        // Nettoyer le fichier temporaire après envoi
        const fs = require('fs');
        fs.unlink(filePath, (unlinkErr: any) => {
          if (unlinkErr) {
            console.error('Error deleting temporary file:', unlinkErr);
          }
        });
      });
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF report'
      });
    }
  }

  /**
   * Récupère un résumé des métriques clés
   * GET /api/appointments/analytics/summary
   */
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Période par défaut: 30 derniers jours
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const filters: AnalyticsFilters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : startDate,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : endDate
      };

      const stats = await this.analyticsService.calculateAppointmentStats(
        organizationId,
        filters
      );

      // Résumé des métriques clés
      const summary = {
        totalAppointments: stats.totalAppointments,
        attendanceRate: stats.attendanceRate,
        cancellationRate: stats.cancellationRate,
        noShowRate: stats.noShowRate,
        averageDuration: stats.averageDuration,
        topPeakHour: stats.peakHours.length > 0 ? stats.peakHours[0] : null,
        topService: stats.popularServices.length > 0 ? stats.popularServices[0] : null,
        period: {
          startDate: filters.startDate?.toISOString().split('T')[0],
          endDate: filters.endDate?.toISOString().split('T')[0]
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics summary'
      });
    }
  }

  /**
   * Récupère les tendances mensuelles
   * GET /api/appointments/analytics/trends/monthly
   */
  async getMonthlyTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      // Période par défaut: 12 derniers mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const filters: AnalyticsFilters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : startDate,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : endDate
      };

      if (req.query.practitionerId) {
        filters.practitionerId = req.query.practitionerId as string;
      }

      const stats = await this.analyticsService.calculateAppointmentStats(
        organizationId,
        filters
      );

      res.json({
        success: true,
        data: {
          monthlyTrends: stats.monthlyTrends,
          period: {
            startDate: filters.startDate?.toISOString().split('T')[0],
            endDate: filters.endDate?.toISOString().split('T')[0]
          }
        }
      });
    } catch (error) {
      console.error('Error getting monthly trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve monthly trends'
      });
    }
  }

  /**
   * Récupère les statistiques par service
   * GET /api/appointments/analytics/services
   */
  async getServiceStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const stats = await this.analyticsService.calculateAppointmentStats(
        organizationId,
        filters
      );

      res.json({
        success: true,
        data: {
          serviceBreakdown: stats.serviceBreakdown,
          popularServices: stats.popularServices
        }
      });
    } catch (error) {
      console.error('Error getting service stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service statistics'
      });
    }
  }

  /**
   * Récupère les statistiques par praticien
   * GET /api/appointments/analytics/practitioners
   */
  async getPractitionerStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.organization?.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'Organization ID is required' });
        return;
      }

      const filters: AnalyticsFilters = {};
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      if (req.query.serviceId) {
        filters.serviceId = req.query.serviceId as string;
      }

      const stats = await this.analyticsService.calculateAppointmentStats(
        organizationId,
        filters
      );

      res.json({
        success: true,
        data: {
          practitionerStats: stats.practitionerStats
        }
      });
    } catch (error) {
      console.error('Error getting practitioner stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve practitioner statistics'
      });
    }
  }
}

// Instance singleton du contrôleur
export const appointmentAnalyticsController = new AppointmentAnalyticsController();