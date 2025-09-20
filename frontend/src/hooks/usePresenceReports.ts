/**
 * Hook pour la gestion des rapports de présence
 */

import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/reportService';
import { useAuth } from './use-auth';

// Types locaux pour les rapports
interface PresenceReport {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  createdBy: string;
}

interface ReportFilter {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  departments?: string[];
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  filters: ReportFilter;
  organizationId: string;
  createdAt: Date;
}

interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
}

interface UsePresenceReportsReturn {
  // État
  reports: PresenceReport[];
  reportTemplates: ReportTemplate[];
  scheduledReports: ReportSchedule[];
  loading: boolean;
  error: string | null;
  
  // Actions
  generateReport: (filter: ReportFilter) => Promise<PresenceReport>;
  exportReport: (reportId: string, format: string) => Promise<void>;
  saveReportTemplate: (template: Omit<ReportTemplate, 'id' | 'createdAt'>) => Promise<void>;
  scheduleReport: (schedule: Omit<ReportSchedule, 'id' | 'createdAt'>) => Promise<void>;
  deleteScheduledReport: (scheduleId: string) => Promise<void>;
  toggleScheduledReport: (scheduleId: string, isActive: boolean) => Promise<void>;
  deleteReportTemplate: (templateId: string) => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utilitaires
  getReportStats: () => {
    totalReports: number;
    reportsThisMonth: number;
    activeSchedules: number;
    templates: number;
  };
}

export const usePresenceReports = (): UsePresenceReportsReturn => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PresenceReport[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const [reportsData, templatesData, schedulesData] = await Promise.all([
        reportService.getReports(user.organizationId),
        reportService.getReportTemplates(user.organizationId),
        reportService.getScheduledReports(user.organizationId)
      ]);

      setReports(reportsData);
      setReportTemplates(templatesData);
      setScheduledReports(schedulesData);
    } catch (err) {
      console.error('Failed to load presence reports data:', err);
      setError('Erreur lors du chargement des données de rapport');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Générer un rapport
  const generateReport = useCallback(async (filter: ReportFilter): Promise<PresenceReport> => {
    if (!user?.organizationId) {
      throw new Error('Organization ID required');
    }

    try {
      setLoading(true);
      setError(null);

      const report = await reportService.generateReport(user.organizationId, {
        ...filter,
        createdBy: user.id
      });

      setReports(prev => [report, ...prev]);
      return report;
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Erreur lors de la génération du rapport');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, user?.id]);

  // Exporter un rapport
  const exportReport = useCallback(async (reportId: string, format: string): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const blob = await reportService.exportReport(user.organizationId, reportId, format);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-presence-${reportId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report:', err);
      setError('Erreur lors de l\'export du rapport');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Sauvegarder un modèle de rapport
  const saveReportTemplate = useCallback(async (template: Omit<ReportTemplate, 'id' | 'createdAt'>): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const newTemplate = await reportService.saveReportTemplate(user.organizationId, {
        ...template,
        organizationId: user.organizationId
      });

      setReportTemplates(prev => [newTemplate, ...prev]);
    } catch (err) {
      console.error('Failed to save report template:', err);
      setError('Erreur lors de la sauvegarde du modèle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Programmer un rapport
  const scheduleReport = useCallback(async (schedule: Omit<ReportSchedule, 'id' | 'createdAt'>): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const newSchedule = await reportService.scheduleReport(user.organizationId, {
        ...schedule,
        organizationId: user.organizationId
      });

      setScheduledReports(prev => [newSchedule, ...prev]);
    } catch (err) {
      console.error('Failed to schedule report:', err);
      setError('Erreur lors de la programmation du rapport');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Supprimer un rapport programmé
  const deleteScheduledReport = useCallback(async (scheduleId: string): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      await reportService.deleteScheduledReport(user.organizationId, scheduleId);
      setScheduledReports(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err) {
      console.error('Failed to delete scheduled report:', err);
      setError('Erreur lors de la suppression du rapport programmé');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Activer/désactiver un rapport programmé
  const toggleScheduledReport = useCallback(async (scheduleId: string, isActive: boolean): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      await reportService.updateScheduledReport(user.organizationId, scheduleId, { isActive });
      
      setScheduledReports(prev => 
        prev.map(s => s.id === scheduleId ? { ...s, isActive } : s)
      );
    } catch (err) {
      console.error('Failed to toggle scheduled report:', err);
      setError('Erreur lors de la modification du rapport programmé');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Supprimer un modèle de rapport
  const deleteReportTemplate = useCallback(async (templateId: string): Promise<void> => {
    if (!user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      await reportService.deleteReportTemplate(user.organizationId, templateId);
      setReportTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Failed to delete report template:', err);
      setError('Erreur lors de la suppression du modèle');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  // Actualiser les données
  const refresh = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  // Obtenir les statistiques
  const getReportStats = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const reportsThisMonth = reports.filter(report => 
      new Date(report.createdAt) >= startOfMonth
    ).length;
    
    const activeSchedules = scheduledReports.filter(schedule => schedule.isActive).length;

    return {
      totalReports: reports.length,
      reportsThisMonth,
      activeSchedules,
      templates: reportTemplates.length
    };
  }, [reports, scheduledReports, reportTemplates]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // État
    reports,
    reportTemplates,
    scheduledReports,
    loading,
    error,
    
    // Actions
    generateReport,
    exportReport,
    saveReportTemplate,
    scheduleReport,
    deleteScheduledReport,
    toggleScheduledReport,
    deleteReportTemplate,
    refresh,
    
    // Utilitaires
    getReportStats
  };
};