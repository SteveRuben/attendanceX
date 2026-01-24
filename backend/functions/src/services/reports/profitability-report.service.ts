/**
 * Service de génération de rapports de rentabilité
 */
import { collections } from 'config';
import { TimeEntryModel } from '../../models/time-entry.model';

export interface ProfitabilityReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    profitMargin: number;
    billableHours: number;
    nonBillableHours: number;
    utilizationRate: number;
  };
  projects: ProjectProfitability[];
  clients: ClientProfitability[];
  employees: EmployeeProfitability[];
}

export interface ProjectProfitability {
  projectId: string;
  projectName?: string;
  projectCode?: string;
  clientId?: string;
  clientName?: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  billableHours: number;
  totalHours: number;
  utilizationRate: number;
  averageHourlyRate: number;
  employees: EmployeeProjectContribution[];
  activities: ActivityProfitability[];
}

export interface ClientProfitability {
  clientId: string;
  clientName?: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  billableHours: number;
  totalHours: number;
  projectCount: number;
  averageProjectProfit: number;
  projects: ProjectProfitability[];
  trends: ProfitabilityTrend[];
}

export interface EmployeeProfitability {
  employeeId: string;
  employeeName?: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  billableHours: number;
  totalHours: number;
  utilizationRate: number;
  averageHourlyRate: number;
  costPerHour: number;
  projects: EmployeeProjectContribution[];
}

export interface EmployeeProjectContribution {
  projectId: string;
  projectName?: string;
  hours: number;
  revenue: number;
  costs: number;
  profit: number;
  contribution: number; // Pourcentage de contribution au projet
}

export interface ActivityProfitability {
  activityCodeId: string;
  activityName?: string;
  hours: number;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  averageHourlyRate: number;
}

export interface ProfitabilityTrend {
  period: string;
  revenue: number;
  profit: number;
  profitMargin: number;
  change: number;
  changePercentage: number;
}

export interface CostBenefitAnalysis {
  projectId: string;
  projectName?: string;
  analysis: {
    totalInvestment: number;
    totalRevenue: number;
    roi: number;
    paybackPeriod: number;
    npv: number;
    irr: number;
  };
  breakdown: {
    laborCosts: number;
    overheadCosts: number;
    materialCosts: number;
    otherCosts: number;
  };
  timeline: CostBenefitTimeline[];
  recommendations: string[];
}

export interface CostBenefitTimeline {
  period: string;
  costs: number;
  revenue: number;
  cumulativeCosts: number;
  cumulativeRevenue: number;
  cumulativeProfit: number;
}

export interface ProfitabilityForecast {
  period: {
    start: string;
    end: string;
  };
  projections: {
    expectedRevenue: number;
    expectedCosts: number;
    expectedProfit: number;
    expectedMargin: number;
    confidence: number;
  };
  scenarios: {
    optimistic: ProfitabilityScenario;
    realistic: ProfitabilityScenario;
    pessimistic: ProfitabilityScenario;
  };
  assumptions: string[];
  risks: string[];
}

export interface ProfitabilityScenario {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  probability: number;
}

export interface MarginAnalysis {
  period: {
    start: string;
    end: string;
  };
  overall: {
    grossMargin: number;
    netMargin: number;
    operatingMargin: number;
  };
  byClient: ClientMarginAnalysis[];
  byProject: ProjectMarginAnalysis[];
  byEmployee: EmployeeMarginAnalysis[];
  trends: MarginTrend[];
}

export interface ClientMarginAnalysis {
  clientId: string;
  clientName?: string;
  grossMargin: number;
  netMargin: number;
  revenue: number;
  directCosts: number;
  indirectCosts: number;
  marginTrend: 'improving' | 'declining' | 'stable';
}

export interface ProjectMarginAnalysis {
  projectId: string;
  projectName?: string;
  grossMargin: number;
  netMargin: number;
  budgetVariance: number;
  costOverrun: number;
  marginRisk: 'low' | 'medium' | 'high';
}

export interface EmployeeMarginAnalysis {
  employeeId: string;
  employeeName?: string;
  contributionMargin: number;
  utilizationRate: number;
  billableRate: number;
  costRate: number;
  profitContribution: number;
}

export interface MarginTrend {
  period: string;
  grossMargin: number;
  netMargin: number;
  change: number;
}

export class ProfitabilityReportService {
  constructor() {}

  /**
   * Génère un rapport de rentabilité complet
   */
  async generateProfitabilityReport(
    tenantId: string,
    dateStart: string,
    dateEnd: string,
    filters?: {
      projectIds?: string[];
      clientIds?: string[];
      employeeIds?: string[];
    }
  ): Promise<ProfitabilityReport> {
    // Récupérer toutes les entrées de temps pour la période
    const timeEntries = await this.getTimeEntriesForPeriod(tenantId, dateStart, dateEnd, filters);
    
    // Calculer les métriques globales
    const summary = this.calculateSummaryMetrics(timeEntries);
    
    // Analyser par projet
    const projects = await this.analyzeProjectProfitability(timeEntries, tenantId);
    
    // Analyser par client
    const clients = await this.analyzeClientProfitability(projects, tenantId);
    
    // Analyser par employé
    const employees = await this.analyzeEmployeeProfitability(timeEntries, tenantId);

    return {
      period: { start: dateStart, end: dateEnd },
      summary,
      projects: projects.sort((a, b) => b.profit - a.profit),
      clients: clients.sort((a, b) => b.profit - a.profit),
      employees: employees.sort((a, b) => b.profit - a.profit)
    };
  }

  /**
   * Génère une analyse coût/bénéfice pour un projet
   */
  async generateCostBenefitAnalysis(
    projectId: string,
    tenantId: string,
    dateStart?: string,
    dateEnd?: string
  ): Promise<CostBenefitAnalysis> {
    // Récupérer les données du projet
    const projectDoc = await collections.projects.doc(projectId).get();
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }
    
    const project = projectDoc.data()!;
    
    // Récupérer toutes les entrées de temps du projet
    let query = collections.time_entries
      .where('projectId', '==', projectId)
      .where('tenantId', '==', tenantId) as any;
    
    if (dateStart) {
      query = query.where('date', '>=', dateStart);
    }
    if (dateEnd) {
      query = query.where('date', '<=', dateEnd);
    }
    
    const timeEntriesSnapshot = await query.get();
    const timeEntries = timeEntriesSnapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));
    
    // Calculer les coûts et revenus
    const totalRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const laborCosts = timeEntries.reduce((sum, entry) => {
      // Coût de la main-d'œuvre (différent du prix facturé)
      const costRate = entry.hourlyRate ? entry.hourlyRate * 0.7 : 0; // 70% du taux facturé
      return sum + ((entry.duration / 60) * costRate);
    }, 0);
    
    // Estimer les autres coûts
    const overheadCosts = laborCosts * 0.3; // 30% des coûts de main-d'œuvre
    const materialCosts = project.materialBudget || 0;
    const otherCosts = project.otherCosts || 0;
    
    const totalInvestment = laborCosts + overheadCosts + materialCosts + otherCosts;
    
    // Calculer les métriques financières
    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;
    const paybackPeriod = this.calculatePaybackPeriod(timeEntries, totalInvestment);
    const npv = this.calculateNPV(timeEntries, totalInvestment, 0.1); // 10% discount rate
    const irr = this.calculateIRR(timeEntries, totalInvestment);
    
    // Créer la timeline
    const timeline = this.createCostBenefitTimeline(timeEntries, {
      laborCosts,
      overheadCosts,
      materialCosts,
      otherCosts
    });
    
    // Générer des recommandations
    const recommendations = this.generateCostBenefitRecommendations({
      roi,
      paybackPeriod,
      npv,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalInvestment) / totalRevenue) * 100 : 0
    });

    return {
      projectId,
      projectName: project.name,
      analysis: {
        totalInvestment,
        totalRevenue,
        roi,
        paybackPeriod,
        npv,
        irr
      },
      breakdown: {
        laborCosts,
        overheadCosts,
        materialCosts,
        otherCosts
      },
      timeline,
      recommendations
    };
  }

  /**
   * Génère des projections de rentabilité
   */
  async generateProfitabilityForecast(
    tenantId: string,
    forecastPeriodMonths: number,
    basedOnHistoryMonths: number = 6
  ): Promise<ProfitabilityForecast> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - basedOnHistoryMonths);
    
    // Récupérer les données historiques
    const historicalData = await this.getTimeEntriesForPeriod(
      tenantId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    // Analyser les tendances
    const monthlyTrends = this.analyzeMonthlyTrends(historicalData);
    
    // Calculer les projections
    const projections = this.calculateProjections(monthlyTrends, forecastPeriodMonths);
    
    // Créer les scénarios
    const scenarios = this.createProfitabilityScenarios(projections);
    
    // Identifier les assumptions et risques
    const assumptions = this.identifyAssumptions(monthlyTrends);
    const risks = this.identifyRisks(monthlyTrends, projections);
    
    const forecastStart = new Date();
    const forecastEnd = new Date();
    forecastEnd.setMonth(forecastEnd.getMonth() + forecastPeriodMonths);

    return {
      period: {
        start: forecastStart.toISOString().split('T')[0],
        end: forecastEnd.toISOString().split('T')[0]
      },
      projections: {
        expectedRevenue: projections.revenue,
        expectedCosts: projections.costs,
        expectedProfit: projections.profit,
        expectedMargin: projections.margin,
        confidence: projections.confidence
      },
      scenarios,
      assumptions,
      risks
    };
  }

  /**
   * Génère une analyse des marges
   */
  async generateMarginAnalysis(
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<MarginAnalysis> {
    const timeEntries = await this.getTimeEntriesForPeriod(tenantId, dateStart, dateEnd);
    
    // Calculer les marges globales
    const totalRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const directCosts = this.calculateDirectCosts(timeEntries);
    const indirectCosts = directCosts * 0.3; // Estimation des coûts indirects
    const operatingCosts = directCosts + indirectCosts;
    
    const overall = {
      grossMargin: totalRevenue > 0 ? ((totalRevenue - directCosts) / totalRevenue) * 100 : 0,
      netMargin: totalRevenue > 0 ? ((totalRevenue - operatingCosts) / totalRevenue) * 100 : 0,
      operatingMargin: totalRevenue > 0 ? ((totalRevenue - operatingCosts) / totalRevenue) * 100 : 0
    };
    
    // Analyser par client
    const byClient = await this.analyzeClientMargins(timeEntries, tenantId);
    
    // Analyser par projet
    const byProject = await this.analyzeProjectMargins(timeEntries, tenantId);
    
    // Analyser par employé
    const byEmployee = await this.analyzeEmployeeMargins(timeEntries, tenantId);
    
    // Calculer les tendances
    const trends = await this.calculateMarginTrends(tenantId, dateStart, dateEnd);

    return {
      period: { start: dateStart, end: dateEnd },
      overall,
      byClient,
      byProject,
      byEmployee,
      trends
    };
  }

  /**
   * Calcule les métriques de résumé
   */
  private calculateSummaryMetrics(timeEntries: TimeEntryModel[]) {
    const totalRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const billableEntries = timeEntries.filter(entry => entry.billable);
    const billableHours = billableEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const nonBillableHours = totalHours - billableHours;
    
    // Estimer les coûts (70% du revenu comme approximation)
    const totalCosts = totalRevenue * 0.7;
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      profitMargin,
      billableHours,
      nonBillableHours,
      utilizationRate
    };
  }

  /**
   * Analyse la rentabilité par projet
   */
  private async analyzeProjectProfitability(
    timeEntries: TimeEntryModel[],
    tenantId: string
  ): Promise<ProjectProfitability[]> {
    const projectMap = new Map<string, TimeEntryModel[]>();
    
    for (const entry of timeEntries) {
      if (!entry.projectId) {continue;}
      
      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, []);
      }
      projectMap.get(entry.projectId)!.push(entry);
    }

    const projects: ProjectProfitability[] = [];
    
    for (const [projectId, projectEntries] of projectMap) {
      const revenue = projectEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costs = revenue * 0.7; // Estimation
      const profit = revenue - costs;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      const billableEntries = projectEntries.filter(entry => entry.billable);
      const billableHours = billableEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const totalHours = projectEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
      const averageHourlyRate = billableHours > 0 ? revenue / billableHours : 0;
      
      // Analyser les contributions des employés
      const employees = this.analyzeEmployeeContributions(projectEntries, projectId);
      
      // Analyser par activité
      const activities = this.analyzeActivityProfitability(projectEntries);

      projects.push({
        projectId,
        revenue,
        costs,
        profit,
        profitMargin,
        billableHours,
        totalHours,
        utilizationRate,
        averageHourlyRate,
        employees,
        activities
      });
    }

    // Enrichir avec les noms des projets
    await this.enrichProjectsWithNames(projects, tenantId);
    
    return projects;
  }

  /**
   * Analyse la rentabilité par client
   */
  private async analyzeClientProfitability(
    projects: ProjectProfitability[],
    tenantId: string
  ): Promise<ClientProfitability[]> {
    const clientMap = new Map<string, ProjectProfitability[]>();
    
    for (const project of projects) {
      if (!project.clientId) {continue;}
      
      if (!clientMap.has(project.clientId)) {
        clientMap.set(project.clientId, []);
      }
      clientMap.get(project.clientId)!.push(project);
    }

    const clients: ClientProfitability[] = [];
    
    for (const [clientId, clientProjects] of clientMap) {
      const revenue = clientProjects.reduce((sum, project) => sum + project.revenue, 0);
      const costs = clientProjects.reduce((sum, project) => sum + project.costs, 0);
      const profit = revenue - costs;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const billableHours = clientProjects.reduce((sum, project) => sum + project.billableHours, 0);
      const totalHours = clientProjects.reduce((sum, project) => sum + project.totalHours, 0);
      const projectCount = clientProjects.length;
      const averageProjectProfit = projectCount > 0 ? profit / projectCount : 0;
      
      // Calculer les tendances (nécessiterait des données historiques)
      const trends: ProfitabilityTrend[] = [];

      clients.push({
        clientId,
        revenue,
        costs,
        profit,
        profitMargin,
        billableHours,
        totalHours,
        projectCount,
        averageProjectProfit,
        projects: clientProjects,
        trends
      });
    }

    // Enrichir avec les noms des clients
    await this.enrichClientsWithNames(clients, tenantId);
    
    return clients;
  }

  /**
   * Analyse la rentabilité par employé
   */
  private async analyzeEmployeeProfitability(
    timeEntries: TimeEntryModel[],
    tenantId: string
  ): Promise<EmployeeProfitability[]> {
    const employeeMap = new Map<string, TimeEntryModel[]>();
    
    for (const entry of timeEntries) {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, []);
      }
      employeeMap.get(entry.employeeId)!.push(entry);
    }

    const employees: EmployeeProfitability[] = [];
    
    for (const [employeeId, employeeEntries] of employeeMap) {
      const revenue = employeeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costs = revenue * 0.7; // Estimation du coût employé
      const profit = revenue - costs;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      const billableEntries = employeeEntries.filter(entry => entry.billable);
      const billableHours = billableEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const totalHours = employeeEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
      const averageHourlyRate = billableHours > 0 ? revenue / billableHours : 0;
      const costPerHour = totalHours > 0 ? costs / totalHours : 0;
      
      // Analyser les contributions par projet
      const projects = this.analyzeEmployeeProjectContributions(employeeEntries, employeeId);

      employees.push({
        employeeId,
        revenue,
        costs,
        profit,
        profitMargin,
        billableHours,
        totalHours,
        utilizationRate,
        averageHourlyRate,
        costPerHour,
        projects
      });
    }

    // Enrichir avec les noms des employés
    await this.enrichEmployeesWithNames(employees, tenantId);
    
    return employees;
  }

  /**
   * Analyse les contributions des employés à un projet
   */
  private analyzeEmployeeContributions(
    projectEntries: TimeEntryModel[],
    projectId: string
  ): EmployeeProjectContribution[] {
    const employeeMap = new Map<string, TimeEntryModel[]>();
    
    for (const entry of projectEntries) {
      if (!employeeMap.has(entry.employeeId)) {
        employeeMap.set(entry.employeeId, []);
      }
      employeeMap.get(entry.employeeId)!.push(entry);
    }

    const totalProjectRevenue = projectEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const contributions: EmployeeProjectContribution[] = [];
    
    // @ts-ignore
    for (const [employeeId, employeeEntries] of employeeMap) {
      const hours = employeeEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const revenue = employeeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costs = revenue * 0.7;
      const profit = revenue - costs;
      const contribution = totalProjectRevenue > 0 ? (revenue / totalProjectRevenue) * 100 : 0;

      contributions.push({
        projectId,
        hours,
        revenue,
        costs,
        profit,
        contribution
      });
    }
    
    return contributions.sort((a, b) => b.contribution - a.contribution);
  }

  /**
   * Analyse la rentabilité par activité
   */
  private analyzeActivityProfitability(entries: TimeEntryModel[]): ActivityProfitability[] {
    const activityMap = new Map<string, TimeEntryModel[]>();
    
    for (const entry of entries) {
      if (!entry.activityCodeId) {continue;}
      
      if (!activityMap.has(entry.activityCodeId)) {
        activityMap.set(entry.activityCodeId, []);
      }
      activityMap.get(entry.activityCodeId)!.push(entry);
    }

    const activities: ActivityProfitability[] = [];
    
    for (const [activityId, activityEntries] of activityMap) {
      const hours = activityEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const revenue = activityEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costs = revenue * 0.7;
      const profit = revenue - costs;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const averageHourlyRate = hours > 0 ? revenue / hours : 0;

      activities.push({
        activityCodeId: activityId,
        hours,
        revenue,
        costs,
        profit,
        profitMargin,
        averageHourlyRate
      });
    }
    
    return activities.sort((a, b) => b.profit - a.profit);
  }

  /**
   * Analyse les contributions d'un employé par projet
   */
  private analyzeEmployeeProjectContributions(
    employeeEntries: TimeEntryModel[],
    employeeId: string
  ): EmployeeProjectContribution[] {
    const projectMap = new Map<string, TimeEntryModel[]>();
    
    for (const entry of employeeEntries) {
      if (!entry.projectId) {continue;}
      
      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, []);
      }
      projectMap.get(entry.projectId)!.push(entry);
    }

    const totalEmployeeRevenue = employeeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const contributions: EmployeeProjectContribution[] = [];
    
    for (const [projectId, projectEntries] of projectMap) {
      const hours = projectEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const revenue = projectEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costs = revenue * 0.7;
      const profit = revenue - costs;
      const contribution = totalEmployeeRevenue > 0 ? (revenue / totalEmployeeRevenue) * 100 : 0;

      contributions.push({
        projectId,
        hours,
        revenue,
        costs,
        profit,
        contribution
      });
    }
    
    return contributions.sort((a, b) => b.contribution - a.contribution);
  }

  // Méthodes utilitaires pour les calculs financiers

  private calculatePaybackPeriod(timeEntries: TimeEntryModel[], totalInvestment: number): number {
    // Simplification: supposer un flux de revenus constant
    const monthlyRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0) / 12;
    return monthlyRevenue > 0 ? totalInvestment / monthlyRevenue : 0;
  }

  private calculateNPV(timeEntries: TimeEntryModel[], investment: number, discountRate: number): number {
    // Simplification: calculer la VAN sur 12 mois
    const monthlyRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0) / 12;
    const monthlyCosts = monthlyRevenue * 0.7;
    const monthlyProfit = monthlyRevenue - monthlyCosts;
    
    let npv = -investment;
    for (let month = 1; month <= 12; month++) {
      npv += monthlyProfit / Math.pow(1 + discountRate / 12, month);
    }
    
    return npv;
  }

  private calculateIRR(timeEntries: TimeEntryModel[], investment: number): number {
    // Simplification: estimation de l'IRR
    const totalRevenue = timeEntries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
    const totalProfit = totalRevenue * 0.3; // 30% de marge
    
    if (investment <= 0) {return 0;}
    
    // IRR approximatif
    return (totalProfit / investment) * 100;
  }

  private createCostBenefitTimeline(
    timeEntries: TimeEntryModel[],
    costs: { laborCosts: number; overheadCosts: number; materialCosts: number; otherCosts: number }
  ): CostBenefitTimeline[] {
    // Grouper par mois
    const monthlyData = new Map<string, { revenue: number; costs: number }>();
    
    for (const entry of timeEntries) {
      const month = entry.date.substring(0, 7); // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { revenue: 0, costs: 0 });
      }
      
      const data = monthlyData.get(month)!;
      data.revenue += entry.totalCost || 0;
      data.costs += (entry.totalCost || 0) * 0.7; // Estimation des coûts
    }

    const timeline: CostBenefitTimeline[] = [];
    let cumulativeCosts = 0;
    let cumulativeRevenue = 0;
    
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    
    for (const month of sortedMonths) {
      const data = monthlyData.get(month)!;
      cumulativeCosts += data.costs;
      cumulativeRevenue += data.revenue;
      
      timeline.push({
        period: month,
        costs: data.costs,
        revenue: data.revenue,
        cumulativeCosts,
        cumulativeRevenue,
        cumulativeProfit: cumulativeRevenue - cumulativeCosts
      });
    }
    
    return timeline;
  }

  private generateCostBenefitRecommendations(metrics: {
    roi: number;
    paybackPeriod: number;
    npv: number;
    profitMargin: number;
  }): string[] {
    const recommendations: string[] = [];
    
    if (metrics.roi < 15) {
      recommendations.push('ROI below 15% - consider cost optimization or pricing review');
    }
    
    if (metrics.paybackPeriod > 24) {
      recommendations.push('Payback period exceeds 24 months - evaluate project viability');
    }
    
    if (metrics.npv < 0) {
      recommendations.push('Negative NPV - project may not be financially viable');
    }
    
    if (metrics.profitMargin < 20) {
      recommendations.push('Profit margin below 20% - review pricing strategy');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Project shows strong financial performance');
    }
    
    return recommendations;
  }

  // Méthodes utilitaires pour récupération et enrichissement des données

  private async getTimeEntriesForPeriod(
    tenantId: string,
    dateStart: string,
    dateEnd: string,
    filters?: {
      projectIds?: string[];
      clientIds?: string[];
      employeeIds?: string[];
    }
  ): Promise<TimeEntryModel[]> {
    let query = collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd) as any;

    if (filters?.employeeIds && filters.employeeIds.length > 0) {
      query = query.where('employeeId', 'in', filters.employeeIds);
    }

    if (filters?.projectIds && filters.projectIds.length > 0) {
      query = query.where('projectId', 'in', filters.projectIds);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));
  }

  private calculateDirectCosts(timeEntries: TimeEntryModel[]): number {
    return timeEntries.reduce((sum, entry) => {
      const costRate = entry.hourlyRate ? entry.hourlyRate * 0.7 : 0;
      return sum + ((entry.duration / 60) * costRate);
    }, 0);
  }

  private async enrichProjectsWithNames(projects: ProjectProfitability[], tenantId: string) {
    const projectIds = projects.map(p => p.projectId);
    if (projectIds.length === 0) {return;}

    const projectsSnapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('id', 'in', projectIds)
      .get();

    const projectData = new Map<string, any>();
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      projectData.set(doc.id, project);
    }

    for (const project of projects) {
      const data = projectData.get(project.projectId);
      if (data) {
        project.projectName = data.name;
        project.projectCode = data.code;
        project.clientId = data.clientId;
      }
    }
  }

  private async enrichClientsWithNames(clients: ClientProfitability[], tenantId: string) {
    const clientIds = clients.map(c => c.clientId);
    if (clientIds.length === 0) {return;}

    const clientsSnapshot = await collections.clients
      .where('tenantId', '==', tenantId)
      .where('id', 'in', clientIds)
      .get();

    const clientNames = new Map<string, string>();
    for (const doc of clientsSnapshot.docs) {
      const client = doc.data();
      clientNames.set(doc.id, client.name);
    }

    for (const client of clients) {
      client.clientName = clientNames.get(client.clientId);
    }
  }

  private async enrichEmployeesWithNames(employees: EmployeeProfitability[], tenantId: string) {
    const employeeIds = employees.map(e => e.employeeId);
    if (employeeIds.length === 0) {return;}

    const employeesSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('id', 'in', employeeIds)
      .get();

    const employeeNames = new Map<string, string>();
    for (const doc of employeesSnapshot.docs) {
      const employee = doc.data();
      employeeNames.set(employee.id, `${employee.firstName} ${employee.lastName}`);
    }

    for (const employee of employees) {
      employee.employeeName = employeeNames.get(employee.employeeId);
    }
  }

  // Méthodes pour les analyses avancées (stubs pour l'implémentation future)

  private analyzeMonthlyTrends(timeEntries: TimeEntryModel[]): any {
    // Implémentation des tendances mensuelles
    return {};
  }

  private calculateProjections(trends: any, months: number): any {
    // Implémentation des projections
    return {
      revenue: 0,
      costs: 0,
      profit: 0,
      margin: 0,
      confidence: 0
    };
  }

  private createProfitabilityScenarios(projections: any): any {
    // Implémentation des scénarios
    return {
      optimistic: { revenue: 0, costs: 0, profit: 0, margin: 0, probability: 0 },
      realistic: { revenue: 0, costs: 0, profit: 0, margin: 0, probability: 0 },
      pessimistic: { revenue: 0, costs: 0, profit: 0, margin: 0, probability: 0 }
    };
  }

  private identifyAssumptions(trends: any): string[] {
    return ['Historical trends will continue', 'Market conditions remain stable'];
  }

  private identifyRisks(trends: any, projections: any): string[] {
    return ['Market volatility', 'Resource availability', 'Competition'];
  }

  private async analyzeClientMargins(timeEntries: TimeEntryModel[], tenantId: string): Promise<ClientMarginAnalysis[]> {
    // Implémentation de l'analyse des marges par client
    return [];
  }

  private async analyzeProjectMargins(timeEntries: TimeEntryModel[], tenantId: string): Promise<ProjectMarginAnalysis[]> {
    // Implémentation de l'analyse des marges par projet
    return [];
  }

  private async analyzeEmployeeMargins(timeEntries: TimeEntryModel[], tenantId: string): Promise<EmployeeMarginAnalysis[]> {
    // Implémentation de l'analyse des marges par employé
    return [];
  }

  private async calculateMarginTrends(tenantId: string, dateStart: string, dateEnd: string): Promise<MarginTrend[]> {
    // Implémentation du calcul des tendances de marge
    return [];
  }
}