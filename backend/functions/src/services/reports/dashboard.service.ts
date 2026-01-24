/**
 * Service de génération de tableaux de bord et KPIs temps réel
 */
import { TimeEntryModel } from '../../models/time-entry.model';
import { TimesheetModel } from '../../models/timesheet.model';
import { TimesheetStatus } from '../../common/types';
import { collections } from 'config';

export interface DashboardData {
  period: {
    start: string;
    end: string;
  };
  kpis: KPIMetrics;
  charts: ChartData;
  alerts: Alert[];
  summary: ExecutiveSummary;
  recentActivity: RecentActivity[];
}

export interface KPIMetrics {
  productivity: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  utilization: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  profitability: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  billableHours: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  revenue: {
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    target: number;
  };
  employeeCount: {
    active: number;
    total: number;
    newThisMonth: number;
  };
}

export interface ChartData {
  timeDistribution: TimeDistributionChart;
  productivityTrend: ProductivityTrendChart;
  projectPerformance: ProjectPerformanceChart;
  employeeUtilization: EmployeeUtilizationChart;
  revenueBreakdown: RevenueBreakdownChart;
  activityAnalysis: ActivityAnalysisChart;
}

export interface TimeDistributionChart {
  type: 'pie' | 'doughnut';
  data: {
    labels: string[];
    datasets: [{
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }];
  };
  options: any;
}

export interface ProductivityTrendChart {
  type: 'line';
  data: {
    labels: string[];
    datasets: [{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension: number;
    }];
  };
  options: any;
}

export interface ProjectPerformanceChart {
  type: 'bar';
  data: {
    labels: string[];
    datasets: [{
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
    }];
  };
  options: any;
}

export interface EmployeeUtilizationChart {
  type: 'horizontalBar';
  data: {
    labels: string[];
    datasets: [{
      label: string;
      data: number[];
      backgroundColor: string[];
    }];
  };
  options: any;
}

export interface RevenueBreakdownChart {
  type: 'stackedBar';
  data: {
    labels: string[];
    datasets: [{
      label: string;
      data: number[];
      backgroundColor: string;
    }];
  };
  options: any;
}

export interface ActivityAnalysisChart {
  type: 'radar';
  data: {
    labels: string[];
    datasets: [{
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }];
  };
  options: any;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actionRequired: boolean;
  relatedEntity?: {
    type: 'employee' | 'project' | 'client' | 'timesheet';
    id: string;
    name: string;
  };
}

export interface ExecutiveSummary {
  totalRevenue: number;
  totalHours: number;
  activeProjects: number;
  teamSize: number;
  averageUtilization: number;
  topPerformingProject: {
    id: string;
    name: string;
    revenue: number;
    margin: number;
  };
  topPerformingEmployee: {
    id: string;
    name: string;
    utilization: number;
    revenue: number;
  };
  insights: string[];
  recommendations: string[];
}

export interface RecentActivity {
  id: string;
  type: 'timesheet_submitted' | 'timesheet_approved' | 'project_created' | 'employee_added' | 'milestone_reached';
  title: string;
  description: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
  };
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
}

export interface RealTimeMetrics {
  currentlyWorking: number;
  todayHours: number;
  todayRevenue: number;
  pendingApprovals: number;
  overdueTimesheets: number;
  activeProjects: number;
  lastUpdated: Date;
}

export interface TeamPerformanceSnapshot {
  teamId?: string;
  teamName?: string;
  members: TeamMemberSnapshot[];
  teamMetrics: {
    averageUtilization: number;
    totalHours: number;
    totalRevenue: number;
    productivityScore: number;
  };
  topPerformers: string[];
  improvementAreas: string[];
}

export interface TeamMemberSnapshot {
  employeeId: string;
  employeeName: string;
  status: 'working' | 'break' | 'offline';
  todayHours: number;
  weeklyUtilization: number;
  currentProject?: string;
  currentActivity?: string;
  lastActivity: Date;
}

export interface ProjectHealthDashboard {
  projects: ProjectHealthMetrics[];
  summary: {
    totalProjects: number;
    healthyProjects: number;
    atRiskProjects: number;
    criticalProjects: number;
  };
  alerts: ProjectAlert[];
}

export interface ProjectHealthMetrics {
  projectId: string;
  projectName: string;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    budgetUtilization: number;
    scheduleVariance: number;
    teamUtilization: number;
    qualityScore: number;
  };
  risks: string[];
  recommendations: string[];
}

export interface ProjectAlert {
  projectId: string;
  projectName: string;
  type: 'budget_overrun' | 'schedule_delay' | 'low_utilization' | 'quality_issue';
  severity: 'low' | 'medium' | 'high';
  message: string;
  actionRequired: string;
}

export class DashboardService {
  constructor() {}

  /**
   * Génère les données complètes du tableau de bord
   */
  async generateDashboard(
    tenantId: string,
    dateStart: string,
    dateEnd: string,
    userId: string
  ): Promise<DashboardData> {
    // Récupérer les données de base
    const timeEntries = await this.getTimeEntriesForPeriod(tenantId, dateStart, dateEnd);
    const timesheets = await this.getTimesheetsForPeriod(tenantId, dateStart, dateEnd);
    
    // Calculer les KPIs
    const kpis = await this.calculateKPIs(tenantId, timeEntries, timesheets, dateStart, dateEnd);
    
    // Générer les graphiques
    const charts = await this.generateCharts(timeEntries, timesheets, tenantId);
    
    // Générer les alertes
    const alerts = await this.generateAlerts(tenantId, timeEntries, timesheets);
    
    // Créer le résumé exécutif
    const summary = await this.generateExecutiveSummary(tenantId, timeEntries, timesheets);
    
    // Récupérer l'activité récente
    const recentActivity = await this.getRecentActivity(tenantId, userId);

    return {
      period: { start: dateStart, end: dateEnd },
      kpis,
      charts,
      alerts,
      summary,
      recentActivity
    };
  }

  /**
   * Récupère les métriques temps réel
   */
  async getRealTimeMetrics(tenantId: string): Promise<RealTimeMetrics> {
    const today = new Date().toISOString().split('T')[0];
    
    // Employés actuellement en train de travailler (approximation)
    const currentlyWorkingSnapshot = await collections.presence_entries
      .where('tenantId', '==', tenantId)
      .where('date', '==', today)
      .where('status', '==', 'working')
      .get();
    
    // Heures d'aujourd'hui
    const todayEntriesSnapshot = await collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('date', '==', today)
      .get();
    
    const todayEntries = todayEntriesSnapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));
    const todayHours = todayEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const todayRevenue = todayEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    
    // Approbations en attente
    const pendingApprovalsSnapshot = await collections.timesheets
      .where('tenantId', '==', tenantId)
      .where('status', '==', TimesheetStatus.SUBMITTED)
      .get();
    
    // Feuilles de temps en retard
    const overdueTimesheetsSnapshot = await collections.timesheets
      .where('tenantId', '==', tenantId)
      .where('status', '==', TimesheetStatus.DRAFT)
      .where('periodEnd', '<', today)
      .get();
    
    // Projets actifs
    const activeProjectsSnapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();

    return {
      currentlyWorking: currentlyWorkingSnapshot.size,
      todayHours,
      todayRevenue,
      pendingApprovals: pendingApprovalsSnapshot.size,
      overdueTimesheets: overdueTimesheetsSnapshot.size,
      activeProjects: activeProjectsSnapshot.size,
      lastUpdated: new Date()
    };
  }

  /**
   * Génère un snapshot de performance d'équipe
   */
  async getTeamPerformanceSnapshot(
    tenantId: string,
    teamId?: string
  ): Promise<TeamPerformanceSnapshot> {
    // Récupérer les membres de l'équipe
    let employeesQuery = collections.employees
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true) as any;
    
    if (teamId) {
      employeesQuery = employeesQuery.where('teamId', '==', teamId);
    }
    
    const employeesSnapshot = await employeesQuery.get();
    const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Générer les snapshots des membres
    const members: TeamMemberSnapshot[] = [];
    let totalHours = 0;
    const totalRevenue = 0;
    let totalUtilization = 0;
    
    for (const employee of employees) {
      const memberSnapshot = await this.generateMemberSnapshot(employee, tenantId);
      members.push(memberSnapshot);
      
      totalHours += memberSnapshot.todayHours;
      totalUtilization += memberSnapshot.weeklyUtilization;
    }
    
    // Calculer les métriques d'équipe
    const averageUtilization = employees.length > 0 ? totalUtilization / employees.length : 0;
    const productivityScore = this.calculateTeamProductivityScore(members);
    
    // Identifier les top performers
    const topPerformers = members
      .sort((a, b) => b.weeklyUtilization - a.weeklyUtilization)
      .slice(0, 3)
      .map(m => m.employeeName);
    
    // Identifier les domaines d'amélioration
    const improvementAreas = this.identifyTeamImprovementAreas(members);

    return {
      teamId,
      members,
      teamMetrics: {
        averageUtilization,
        totalHours,
        totalRevenue,
        productivityScore
      },
      topPerformers,
      improvementAreas
    };
  }

  /**
   * Génère le tableau de bord de santé des projets
   */
  async getProjectHealthDashboard(tenantId: string): Promise<ProjectHealthDashboard> {
    const projectsSnapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('status', 'in', ['active', 'planning'])
      .get();
    
    const projects: ProjectHealthMetrics[] = [];
    const alerts: ProjectAlert[] = [];
    
    for (const doc of projectsSnapshot.docs) {
      const project = { id: doc.id, ...doc.data() };
      const healthMetrics = await this.calculateProjectHealth(project, tenantId);
      projects.push(healthMetrics);
      
      // Générer des alertes si nécessaire
      const projectAlerts = this.generateProjectAlerts(healthMetrics);
      alerts.push(...projectAlerts);
    }
    
    // Calculer le résumé
    const totalProjects = projects.length;
    const healthyProjects = projects.filter(p => p.status === 'healthy').length;
    const atRiskProjects = projects.filter(p => p.status === 'warning').length;
    const criticalProjects = projects.filter(p => p.status === 'critical').length;

    return {
      projects: projects.sort((a, b) => a.healthScore - b.healthScore),
      summary: {
        totalProjects,
        healthyProjects,
        atRiskProjects,
        criticalProjects
      },
      alerts: alerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };
  }

  /**
   * Calcule les KPIs principaux
   */
  private async calculateKPIs(
    tenantId: string,
    timeEntries: TimeEntryModel[],
    timesheets: TimesheetModel[],
    dateStart: string,
    dateEnd: string
  ): Promise<KPIMetrics> {
    // Calculer la période précédente pour comparaison
    const periodDays = this.getDaysBetween(dateStart, dateEnd);
    const previousEnd = this.subtractDays(dateStart, 1);
    const previousStart = this.subtractDays(previousEnd, periodDays - 1);
    
    const previousTimeEntries = await this.getTimeEntriesForPeriod(tenantId, previousStart, previousEnd);
    
    // Productivité
    const currentProductivity = this.calculateProductivity(timeEntries);
    const previousProductivity = this.calculateProductivity(previousTimeEntries);
    const productivityChange = currentProductivity - previousProductivity;
    
    // Utilisation
    const currentUtilization = this.calculateUtilization(timeEntries);
    const previousUtilization = this.calculateUtilization(previousTimeEntries);
    const utilizationChange = currentUtilization - previousUtilization;
    
    // Rentabilité
    const currentProfitability = this.calculateProfitability(timeEntries);
    const previousProfitability = this.calculateProfitability(previousTimeEntries);
    const profitabilityChange = currentProfitability - previousProfitability;
    
    // Heures facturables
    const currentBillableHours = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration / 60), 0);
    const previousBillableHours = previousTimeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration / 60), 0);
    const billableHoursChange = currentBillableHours - previousBillableHours;
    
    // Revenus
    const currentRevenue = timeEntries.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const previousRevenue = previousTimeEntries.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const revenueChange = currentRevenue - previousRevenue;
    
    // Nombre d'employés
    const employeeCount = await this.getEmployeeCount(tenantId);

    return {
      productivity: {
        current: currentProductivity,
        previous: previousProductivity,
        change: productivityChange,
        trend: this.getTrend(productivityChange),
        target: 75
      },
      utilization: {
        current: currentUtilization,
        previous: previousUtilization,
        change: utilizationChange,
        trend: this.getTrend(utilizationChange),
        target: 80
      },
      profitability: {
        current: currentProfitability,
        previous: previousProfitability,
        change: profitabilityChange,
        trend: this.getTrend(profitabilityChange),
        target: 25
      },
      billableHours: {
        current: currentBillableHours,
        previous: previousBillableHours,
        change: billableHoursChange,
        trend: this.getTrend(billableHoursChange),
        target: currentBillableHours * 1.1
      },
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: revenueChange,
        trend: this.getTrend(revenueChange),
        target: currentRevenue * 1.1
      },
      employeeCount
    };
  }

  /**
   * Génère les graphiques pour le tableau de bord
   */
  private async generateCharts(
    timeEntries: TimeEntryModel[],
    timesheets: TimesheetModel[],
    tenantId: string
  ): Promise<ChartData> {
    return {
      timeDistribution: await this.generateTimeDistributionChart(timeEntries, tenantId),
      productivityTrend: await this.generateProductivityTrendChart(timeEntries),
      projectPerformance: await this.generateProjectPerformanceChart(timeEntries, tenantId),
      employeeUtilization: await this.generateEmployeeUtilizationChart(timeEntries, tenantId),
      revenueBreakdown: await this.generateRevenueBreakdownChart(timeEntries, tenantId),
      activityAnalysis: await this.generateActivityAnalysisChart(timeEntries, tenantId)
    };
  }

  /**
   * Génère les alertes automatiques
   */
  private async generateAlerts(
    tenantId: string,
    timeEntries: TimeEntryModel[],
    timesheets: TimesheetModel[]
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Alerte pour faible utilisation
    const utilization = this.calculateUtilization(timeEntries);
    if (utilization < 60) {
      alerts.push({
        id: 'low-utilization',
        type: 'warning',
        title: 'Low Team Utilization',
        message: `Team utilization is ${utilization.toFixed(1)}%, below the 60% threshold`,
        severity: 'medium',
        timestamp: new Date(),
        actionRequired: true
      });
    }
    
    // Alerte pour feuilles de temps en retard
    const overdueTimesheets = timesheets.filter(ts => 
      ts.status === TimesheetStatus.DRAFT && 
      new Date(ts.periodEnd) < new Date()
    );
    
    if (overdueTimesheets.length > 0) {
      alerts.push({
        id: 'overdue-timesheets',
        type: 'error',
        title: 'Overdue Timesheets',
        message: `${overdueTimesheets.length} timesheets are overdue for submission`,
        severity: 'high',
        timestamp: new Date(),
        actionRequired: true
      });
    }
    
    // Alerte pour projets sans activité
    const projectActivity = await this.checkProjectActivity(tenantId, timeEntries);
    for (const [projectId, lastActivity] of projectActivity) {
      const daysSinceActivity = this.getDaysBetween(lastActivity, new Date().toISOString().split('T')[0]);
      if (daysSinceActivity > 7) {
        const project = await this.getProjectName(projectId, tenantId);
        alerts.push({
          id: `inactive-project-${projectId}`,
          type: 'warning',
          title: 'Inactive Project',
          message: `No activity recorded for ${daysSinceActivity} days`,
          severity: 'medium',
          timestamp: new Date(),
          actionRequired: false,
          relatedEntity: {
            type: 'project',
            id: projectId,
            name: project
          }
        });
      }
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Génère le résumé exécutif
   */
  private async generateExecutiveSummary(
    tenantId: string,
    timeEntries: TimeEntryModel[],
    timesheets: TimesheetModel[]
  ): Promise<ExecutiveSummary> {
    const totalRevenue = timeEntries.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.duration / 60), 0);
    const averageUtilization = this.calculateUtilization(timeEntries);
    
    // Projets actifs
    const activeProjectsSnapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();
    
    // Taille de l'équipe
    const teamSizeSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .get();
    
    // Top projet
    const topProject = await this.getTopPerformingProject(timeEntries, tenantId);
    
    // Top employé
    const topEmployee = await this.getTopPerformingEmployee(timeEntries, tenantId);
    
    // Insights et recommandations
    const insights = this.generateInsights(timeEntries, timesheets);
    const recommendations = this.generateRecommendations(timeEntries, timesheets);

    return {
      totalRevenue,
      totalHours,
      activeProjects: activeProjectsSnapshot.size,
      teamSize: teamSizeSnapshot.size,
      averageUtilization,
      topPerformingProject: topProject,
      topPerformingEmployee: topEmployee,
      insights,
      recommendations
    };
  }

  // Méthodes utilitaires privées

  private async getTimeEntriesForPeriod(
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<TimeEntryModel[]> {
    const snapshot = await collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd)
      .get();

    return snapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));
  }

  private async getTimesheetsForPeriod(
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<TimesheetModel[]> {
    const snapshot = await collections.timesheets
      .where('tenantId', '==', tenantId)
      .where('periodStart', '>=', dateStart)
      .where('periodEnd', '<=', dateEnd)
      .get();

    return snapshot.docs.map(doc => TimesheetModel.fromFirestore(doc));
  }

  private calculateProductivity(timeEntries: TimeEntryModel[]): number {
    const billableHours = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration / 60), 0);
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.duration / 60), 0);
    return totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
  }

  private calculateUtilization(timeEntries: TimeEntryModel[]): number {
    // Simplification: utilisation basée sur les heures travaillées vs heures disponibles
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.duration / 60), 0);
    const workingDays = 22; // Approximation pour un mois
    const standardHours = workingDays * 8;
    return standardHours > 0 ? (totalHours / standardHours) * 100 : 0;
  }

  private calculateProfitability(timeEntries: TimeEntryModel[]): number {
    const revenue = timeEntries.reduce((sum, e) => sum + (e.totalCost || 0), 0);
    const costs = revenue * 0.7; // Estimation
    return revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;
  }

  private getTrend(change: number): 'up' | 'down' | 'stable' {
    if (Math.abs(change) < 1) {return 'stable';}
    return change > 0 ? 'up' : 'down';
  }

  private getDaysBetween(dateStart: string, dateEnd: string): number {
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private subtractDays(dateString: string, days: number): string {
    const date = new Date(dateString);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private async getEmployeeCount(tenantId: string) {
    const activeSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .get();
    
    const totalSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .get();
    
    // Nouveaux ce mois (approximation)
    const thisMonth = new Date().toISOString().substring(0, 7);
    const newThisMonthSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('createdAt', '>=', thisMonth + '-01')
      .get();

    return {
      active: activeSnapshot.size,
      total: totalSnapshot.size,
      newThisMonth: newThisMonthSnapshot.size
    };
  }

  // Stubs pour les méthodes de génération de graphiques (à implémenter)
  private async generateTimeDistributionChart(timeEntries: TimeEntryModel[], tenantId: string): Promise<TimeDistributionChart> {
    // Implémentation du graphique de distribution du temps
    return {
      type: 'pie',
      data: {
        labels: ['Billable', 'Non-Billable'],
        datasets: [{
          data: [70, 30],
          backgroundColor: ['#4CAF50', '#FF9800'],
          borderColor: ['#4CAF50', '#FF9800']
        }]
      },
      options: {}
    };
  }

  private async generateProductivityTrendChart(timeEntries: TimeEntryModel[]): Promise<ProductivityTrendChart> {
    // Implémentation du graphique de tendance de productivité
    return {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Productivity %',
          data: [65, 70, 75, 72],
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4
        }]
      },
      options: {}
    };
  }

  private async generateProjectPerformanceChart(timeEntries: TimeEntryModel[], tenantId: string): Promise<ProjectPerformanceChart> {
    // Implémentation du graphique de performance des projets
    return {
      type: 'bar',
      data: {
        labels: ['Project A', 'Project B', 'Project C'],
        datasets: [{
          label: 'Revenue',
          data: [15000, 12000, 8000],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
          borderColor: ['#4CAF50', '#2196F3', '#FF9800']
        }]
      },
      options: {}
    };
  }

  private async generateEmployeeUtilizationChart(timeEntries: TimeEntryModel[], tenantId: string): Promise<EmployeeUtilizationChart> {
    // Implémentation du graphique d'utilisation des employés
    return {
      type: 'horizontalBar',
      data: {
        labels: ['John Doe', 'Jane Smith', 'Bob Johnson'],
        datasets: [{
          label: 'Utilization %',
          data: [85, 78, 92],
          backgroundColor: ['#4CAF50', '#FF9800', '#2196F3']
        }]
      },
      options: {}
    };
  }

  private async generateRevenueBreakdownChart(timeEntries: TimeEntryModel[], tenantId: string): Promise<RevenueBreakdownChart> {
    // Implémentation du graphique de répartition des revenus
    return {
      type: 'stackedBar',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: 'Revenue',
          data: [25000, 30000, 28000, 35000],
          backgroundColor: '#4CAF50'
        }]
      },
      options: {}
    };
  }

  private async generateActivityAnalysisChart(timeEntries: TimeEntryModel[], tenantId: string): Promise<ActivityAnalysisChart> {
    // Implémentation du graphique d'analyse des activités
    return {
      type: 'radar',
      data: {
        labels: ['Development', 'Testing', 'Meetings', 'Documentation', 'Support'],
        datasets: [{
          label: 'Hours Distribution',
          data: [40, 25, 15, 10, 10],
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          borderColor: '#2196F3'
        }]
      },
      options: {}
    };
  }

  // Stubs pour les autres méthodes utilitaires
  private async getRecentActivity(tenantId: string, userId: string): Promise<RecentActivity[]> {
    // Implémentation de la récupération de l'activité récente
    return [];
  }

  private async generateMemberSnapshot(employee: any, tenantId: string): Promise<TeamMemberSnapshot> {
    // Implémentation du snapshot de membre d'équipe
    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      status: 'working',
      todayHours: 6.5,
      weeklyUtilization: 85,
      lastActivity: new Date()
    };
  }

  private calculateTeamProductivityScore(members: TeamMemberSnapshot[]): number {
    // Implémentation du calcul du score de productivité d'équipe
    return 75;
  }

  private identifyTeamImprovementAreas(members: TeamMemberSnapshot[]): string[] {
    // Implémentation de l'identification des domaines d'amélioration
    return ['Improve meeting efficiency', 'Increase billable hours ratio'];
  }

  private async calculateProjectHealth(project: any, tenantId: string): Promise<ProjectHealthMetrics> {
    // Implémentation du calcul de la santé du projet
    return {
      projectId: project.id,
      projectName: project.name,
      healthScore: 75,
      status: 'healthy',
      metrics: {
        budgetUtilization: 65,
        scheduleVariance: 5,
        teamUtilization: 80,
        qualityScore: 85
      },
      risks: [],
      recommendations: []
    };
  }

  private generateProjectAlerts(healthMetrics: ProjectHealthMetrics): ProjectAlert[] {
    // Implémentation de la génération d'alertes de projet
    return [];
  }

  private async checkProjectActivity(tenantId: string, timeEntries: TimeEntryModel[]): Promise<Map<string, string>> {
    // Implémentation de la vérification de l'activité des projets
    return new Map();
  }

  private async getProjectName(projectId: string, tenantId: string): Promise<string> {
    const doc = await collections.projects.doc(projectId).get();
    return doc.exists ? doc.data()!.name : 'Unknown Project';
  }

  private async getTopPerformingProject(timeEntries: TimeEntryModel[], tenantId: string): Promise<any> {
    // Implémentation de la recherche du projet le plus performant
    return {
      id: 'project-1',
      name: 'Top Project',
      revenue: 25000,
      margin: 30
    };
  }

  private async getTopPerformingEmployee(timeEntries: TimeEntryModel[], tenantId: string): Promise<any> {
    // Implémentation de la recherche de l'employé le plus performant
    return {
      id: 'employee-1',
      name: 'Top Employee',
      utilization: 95,
      revenue: 15000
    };
  }

  private generateInsights(timeEntries: TimeEntryModel[], timesheets: TimesheetModel[]): string[] {
    // Implémentation de la génération d'insights
    return [
      'Team productivity increased by 5% this month',
      'Project Alpha is ahead of schedule',
      'Billable hours ratio improved to 78%'
    ];
  }

  private generateRecommendations(timeEntries: TimeEntryModel[], timesheets: TimesheetModel[]): string[] {
    // Implémentation de la génération de recommandations
    return [
      'Focus on increasing utilization for underperforming team members',
      'Consider reallocating resources from Project Beta to Project Alpha',
      'Implement time tracking best practices training'
    ];
  }
}