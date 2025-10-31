/**
 * Service d'analytics pour les feuilles de temps
 */

import { ProjectService } from '../project/project.service';
import { ActivityService } from '../project/activity.service';
import {
  TimePeriod,
  ProjectStats,
  ProfitabilityReport,
  ActivityStats,
  ProductivityReport,
  ProductivityEmployeeData,
  ProjectStatus
} from '../../common/types';
import { firestore } from 'firebase-admin';

export class AnalyticsService {
  private db: firestore.Firestore;
  private projectService: ProjectService;
  private activityService: ActivityService;
  private timeEntriesCollection: string = 'time_entries';


  constructor(
    db: firestore.Firestore,
    projectService: ProjectService,
    activityService: ActivityService
  ) {
    this.db = db;
    this.projectService = projectService;
    this.activityService = activityService;
  }

  // ==================== Analytics par projet ====================

  /**
   * Obtenir les métriques de productivité par projet
   */
  async getProjectProductivityMetrics(
    tenantId: string,
    period?: TimePeriod
  ): Promise<Array<{
    project: any;
    stats: ProjectStats;
    profitability: ProfitabilityReport;
    efficiency: number;
  }>> {
    try {
      // Obtenir tous les projets actifs
      const projects = await this.projectService.listProjects(tenantId, { status: ProjectStatus.ACTIVE }, 1, 100);
      const metrics: Array<{
        project: any;
        stats: ProjectStats;
        profitability: ProfitabilityReport;
        efficiency: number;
      }> = [];

      for (const project of projects.data) {
        if (project.id) {
          const stats = await this.projectService.getProjectTimeStatistics(
            project.id,
            period?.start,
            period?.end
          );

          const profitability = await this.projectService.getProjectProfitability(
            project.id,
            period?.start,
            period?.end
          );

          // Calculer l'efficacité (heures facturables / heures totales)
          const efficiency = stats.totalHours > 0
            ? (stats.billableHours / stats.totalHours) * 100
            : 0;

          metrics.push({
            project: project.toAPI(),
            stats,
            profitability,
            efficiency: Math.round(efficiency * 100) / 100
          });
        }
      }

      return metrics.sort((a, b) => b.stats.totalHours - a.stats.totalHours);
    } catch (error) {
      throw new Error(`Failed to get project productivity metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculer la rentabilité globale par projet
   */
  async calculateOverallProfitability(
    tenantId: string,
    period?: TimePeriod
  ): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageProfitMargin: number;
    topProfitableProjects: ProfitabilityReport[];
    leastProfitableProjects: ProfitabilityReport[];
  }> {
    try {
      const projects = await this.projectService.listProjects(tenantId, { status: ProjectStatus.ACTIVE }, 1, 100);
      const profitabilityReports: ProfitabilityReport[] = [];

      let totalRevenue = 0;
      let totalCost = 0;

      for (const project of projects.data) {
        if (project.id) {
          const profitability = await this.projectService.getProjectProfitability(
            project.id,
            period?.start,
            period?.end
          );

          profitabilityReports.push(profitability);
          totalRevenue += profitability.totalRevenue;
          totalCost += profitability.totalCost;
        }
      }

      const totalProfit = totalRevenue - totalCost;
      const averageProfitMargin = profitabilityReports.length > 0
        ? profitabilityReports.reduce((sum, report) => sum + report.profitMargin, 0) / profitabilityReports.length
        : 0;

      // Trier par rentabilité
      const sortedByProfit = [...profitabilityReports].sort((a, b) => b.profitMargin - a.profitMargin);

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        averageProfitMargin: Math.round(averageProfitMargin * 100) / 100,
        topProfitableProjects: sortedByProfit.slice(0, 5),
        leastProfitableProjects: sortedByProfit.slice(-5).reverse()
      };
    } catch (error) {
      throw new Error(`Failed to calculate overall profitability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Analytics par activité ====================

  /**
   * Analyser la répartition du temps par activité
   */
  async analyzeTimeDistributionByActivity(
    tenantId: string,
    period?: TimePeriod
  ): Promise<{
    distribution: ActivityStats[];
    topActivities: ActivityStats[];
    billableVsNonBillable: {
      billableHours: number;
      nonBillableHours: number;
      billablePercentage: number;
    };
    categoryBreakdown: Array<{
      category: string;
      totalHours: number;
      percentage: number;
      activitiesCount: number;
    }>;
  }> {
    try {
      const distribution = await this.activityService.getActivityTimeDistribution(tenantId, period);
      const topActivities = distribution.slice(0, 10);

      // Calculer billable vs non-billable
      let billableHours = 0;
      let nonBillableHours = 0;

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

      timeEntries.forEach(entry => {
        const hours = entry.duration / 60;
        if (entry.billable) {
          billableHours += hours;
        } else {
          nonBillableHours += hours;
        }
      });

      const totalHours = billableHours + nonBillableHours;
      const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

      // Analyser par catégorie
      const categoryMap = new Map<string, { hours: number; activities: Set<string> }>();

      for (const activity of distribution) {
        const activityCode = await this.activityService.getActivityCodeById(activity.activityCodeId);
        if (activityCode) {
          const category = activityCode.category;

          if (!categoryMap.has(category)) {
            categoryMap.set(category, { hours: 0, activities: new Set() });
          }

          const categoryData = categoryMap.get(category)!;
          categoryData.hours += activity.totalHours;
          categoryData.activities.add(activity.activityCodeId);
        }
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        totalHours: Math.round(data.hours * 100) / 100,
        percentage: totalHours > 0 ? Math.round((data.hours / totalHours) * 10000) / 100 : 0,
        activitiesCount: data.activities.size
      })).sort((a, b) => b.totalHours - a.totalHours);

      return {
        distribution,
        topActivities,
        billableVsNonBillable: {
          billableHours: Math.round(billableHours * 100) / 100,
          nonBillableHours: Math.round(nonBillableHours * 100) / 100,
          billablePercentage: Math.round(billablePercentage * 100) / 100
        },
        categoryBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to analyze time distribution by activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Analytics par employé ====================

  /**
   * Générer un rapport de productivité par employé
   */
  async generateProductivityReport(
    tenantId: string,
    period: TimePeriod
  ): Promise<ProductivityReport> {
    try {
      // Obtenir toutes les entrées de temps pour la période
      let query = this.db.collection(this.timeEntriesCollection)
        .where('tenantId', '==', tenantId)
        .where('date', '>=', period.start)
        .where('date', '<=', period.end);

      const snapshot = await query.get();
      const timeEntries = snapshot.docs.map(doc => doc.data());

      // Grouper par employé
      const employeeData = new Map<string, {
        totalHours: number;
        billableHours: number;
        workingDays: Set<string>;
        activities: Map<string, number>;
      }>();

      timeEntries.forEach(entry => {
        const employeeId = entry.employeeId;
        const hours = entry.duration / 60;

        if (!employeeData.has(employeeId)) {
          employeeData.set(employeeId, {
            totalHours: 0,
            billableHours: 0,
            workingDays: new Set(),
            activities: new Map()
          });
        }

        const data = employeeData.get(employeeId)!;
        data.totalHours += hours;
        data.workingDays.add(entry.date);

        if (entry.billable) {
          data.billableHours += hours;
        }

        if (entry.activityCodeId) {
          const currentHours = data.activities.get(entry.activityCodeId) || 0;
          data.activities.set(entry.activityCodeId, currentHours + hours);
        }
      });

      // Convertir en format de rapport
      const employees: ProductivityEmployeeData[] = [];

      for (const [employeeId, data] of employeeData.entries()) {
        const workingDays = data.workingDays.size;
        const averageHoursPerDay = workingDays > 0 ? data.totalHours / workingDays : 0;
        const billablePercentage = data.totalHours > 0 ? (data.billableHours / data.totalHours) * 100 : 0;

        // Calculer l'efficacité (basée sur 8h/jour standard)
        const efficiency = averageHoursPerDay / 8;

        // Obtenir les top activités
        const topActivities = Array.from(data.activities.entries())
          .sort(([, hoursA], [, hoursB]) => hoursB - hoursA)
          .slice(0, 5)
          .map(async ([activityCodeId, hours]) => {
            const activityCode = await this.activityService.getActivityCodeById(activityCodeId);
            return {
              activityName: activityCode ? activityCode.getDisplayName() : 'Unknown',
              hours: Math.round(hours * 100) / 100,
              percentage: Math.round((hours / data.totalHours) * 10000) / 100
            };
          });

        const resolvedTopActivities = await Promise.all(topActivities);

        employees.push({
          employeeId,
          employeeName: `Employee ${employeeId}`, // À remplacer par le vrai nom
          totalHours: Math.round(data.totalHours * 100) / 100,
          billableHours: Math.round(data.billableHours * 100) / 100,
          workingDays,
          averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
          billablePercentage: Math.round(billablePercentage * 100) / 100,
          efficiency: Math.round(efficiency * 100) / 100,
          topActivities: resolvedTopActivities
        });
      }

      // Calculer les moyennes
      const totalEmployees = employees.length;
      const avgHoursPerDay = totalEmployees > 0
        ? employees.reduce((sum, emp) => sum + emp.averageHoursPerDay, 0) / totalEmployees
        : 0;
      const avgBillablePercentage = totalEmployees > 0
        ? employees.reduce((sum, emp) => sum + emp.billablePercentage, 0) / totalEmployees
        : 0;
      const avgEfficiency = totalEmployees > 0
        ? employees.reduce((sum, emp) => sum + emp.efficiency, 0) / totalEmployees
        : 0;

      return {
        tenantId,
        period,
        employees: employees.sort((a, b) => b.totalHours - a.totalHours),
        averages: {
          hoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
          billablePercentage: Math.round(avgBillablePercentage * 100) / 100,
          efficiency: Math.round(avgEfficiency * 100) / 100
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate productivity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyser les tendances de productivité
   */
  async analyzeProductivityTrends(
    tenantId: string,
    employeeId: string,
    months: number = 6
  ): Promise<Array<{
    month: string;
    totalHours: number;
    billableHours: number;
    averageHoursPerDay: number;
    billablePercentage: number;
    efficiency: number;
  }>> {
    try {
      const trends: Array<{
        month: string;
        totalHours: number;
        billableHours: number;
        averageHoursPerDay: number;
        billablePercentage: number;
        efficiency: number;
      }> = [];

      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = monthDate.toISOString().split('T')[0];

        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const monthEnd = nextMonth.toISOString().split('T')[0];

        const period: TimePeriod = { start: monthStart, end: monthEnd };

        // Générer le rapport pour ce mois
        const monthReport = await this.generateProductivityReport(tenantId, period);
        const employeeData = monthReport.employees.find(emp => emp.employeeId === employeeId);

        if (employeeData) {
          trends.push({
            month: monthDate.toISOString().substring(0, 7), // YYYY-MM
            totalHours: employeeData.totalHours,
            billableHours: employeeData.billableHours,
            averageHoursPerDay: employeeData.averageHoursPerDay,
            billablePercentage: employeeData.billablePercentage,
            efficiency: employeeData.efficiency
          });
        } else {
          trends.push({
            month: monthDate.toISOString().substring(0, 7),
            totalHours: 0,
            billableHours: 0,
            averageHoursPerDay: 0,
            billablePercentage: 0,
            efficiency: 0
          });
        }
      }

      return trends;
    } catch (error) {
      throw new Error(`Failed to analyze productivity trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Analytics globales ====================

  /**
   * Obtenir le tableau de bord des métriques globales
   */
  async getGlobalMetricsDashboard(
    tenantId: string,
    period?: TimePeriod
  ): Promise<{
    totalHours: number;
    totalBillableHours: number;
    totalRevenue: number;
    averageHourlyRate: number;
    activeProjects: number;
    activeEmployees: number;
    topProjects: Array<{ name: string; hours: number }>;
    topActivities: Array<{ name: string; hours: number }>;
    productivityTrend: 'up' | 'down' | 'stable';
    billablePercentage: number;
  }> {
    try {
      // Obtenir les données de base
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

      let totalHours = 0;
      let totalBillableHours = 0;
      let totalRevenue = 0;
      let totalRate = 0;
      let rateCount = 0;

      const projectHours = new Map<string, number>();
      const activityHours = new Map<string, number>();
      const activeEmployees = new Set<string>();

      timeEntries.forEach(entry => {
        const hours = entry.duration / 60;
        totalHours += hours;
        activeEmployees.add(entry.employeeId);

        if (entry.billable) {
          totalBillableHours += hours;
          if (entry.totalCost) {
            totalRevenue += entry.totalCost;
          }
          if (entry.hourlyRate) {
            totalRate += entry.hourlyRate;
            rateCount++;
          }
        }

        // Grouper par projet
        if (entry.projectId) {
          const currentHours = projectHours.get(entry.projectId) || 0;
          projectHours.set(entry.projectId, currentHours + hours);
        }

        // Grouper par activité
        if (entry.activityCodeId) {
          const currentHours = activityHours.get(entry.activityCodeId) || 0;
          activityHours.set(entry.activityCodeId, currentHours + hours);
        }
      });

      // Top projets
      const topProjectEntries = Array.from(projectHours.entries())
        .sort(([, hoursA], [, hoursB]) => hoursB - hoursA)
        .slice(0, 5);

      const topProjects = await Promise.all(
        topProjectEntries.map(async ([projectId, hours]) => {
          const project = await this.projectService.getProjectById(projectId);
          return {
            name: project ? project.name : 'Unknown Project',
            hours: Math.round(hours * 100) / 100
          };
        })
      );

      // Top activités
      const topActivityEntries = Array.from(activityHours.entries())
        .sort(([, hoursA], [, hoursB]) => hoursB - hoursA)
        .slice(0, 5);

      const topActivities = await Promise.all(
        topActivityEntries.map(async ([activityId, hours]) => {
          const activity = await this.activityService.getActivityCodeById(activityId);
          return {
            name: activity ? activity.getDisplayName() : 'Unknown Activity',
            hours: Math.round(hours * 100) / 100
          };
        })
      );

      // Compter les projets actifs
      const activeProjects = await this.projectService.listProjects(tenantId, { status: ProjectStatus.ACTIVE }, 1, 1000);

      // Calculer la tendance de productivité (comparaison avec la période précédente)
      let productivityTrend: 'up' | 'down' | 'stable' = 'stable';

      if (period) {
        const periodDuration = new Date(period.end).getTime() - new Date(period.start).getTime();
        const previousPeriodEnd = new Date(new Date(period.start).getTime() - 1);
        const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);

        const previousPeriod: TimePeriod = {
          start: previousPeriodStart.toISOString().split('T')[0],
          end: previousPeriodEnd.toISOString().split('T')[0]
        };

        const previousMetrics = await this.getGlobalMetricsDashboard(tenantId, previousPeriod);

        if (totalHours > previousMetrics.totalHours * 1.05) {
          productivityTrend = 'up';
        } else if (totalHours < previousMetrics.totalHours * 0.95) {
          productivityTrend = 'down';
        }
      }

      const averageHourlyRate = rateCount > 0 ? totalRate / rateCount : 0;
      const billablePercentage = totalHours > 0 ? (totalBillableHours / totalHours) * 100 : 0;

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        totalBillableHours: Math.round(totalBillableHours * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageHourlyRate: Math.round(averageHourlyRate * 100) / 100,
        activeProjects: activeProjects.data.length,
        activeEmployees: activeEmployees.size,
        topProjects,
        topActivities,
        productivityTrend,
        billablePercentage: Math.round(billablePercentage * 100) / 100
      };
    } catch (error) {
      throw new Error(`Failed to get global metrics dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Comparer les performances entre périodes
   */
  async comparePeriodPerformance(
    tenantId: string,
    currentPeriod: TimePeriod,
    previousPeriod: TimePeriod
  ): Promise<{
    current: any;
    previous: any;
    changes: {
      totalHours: { value: number; percentage: number };
      billableHours: { value: number; percentage: number };
      revenue: { value: number; percentage: number };
      efficiency: { value: number; percentage: number };
    };
  }> {
    try {
      const [currentMetrics, previousMetrics] = await Promise.all([
        this.getGlobalMetricsDashboard(tenantId, currentPeriod),
        this.getGlobalMetricsDashboard(tenantId, previousPeriod)
      ]);

      const calculateChange = (current: number, previous: number) => ({
        value: Math.round((current - previous) * 100) / 100,
        percentage: previous > 0 ? Math.round(((current - previous) / previous) * 10000) / 100 : 0
      });

      return {
        current: currentMetrics,
        previous: previousMetrics,
        changes: {
          totalHours: calculateChange(currentMetrics.totalHours, previousMetrics.totalHours),
          billableHours: calculateChange(currentMetrics.totalBillableHours, previousMetrics.totalBillableHours),
          revenue: calculateChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
          efficiency: calculateChange(currentMetrics.billablePercentage, previousMetrics.billablePercentage)
        }
      };
    } catch (error) {
      throw new Error(`Failed to compare period performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}