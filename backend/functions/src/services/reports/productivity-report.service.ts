/**
 * Service de génération de rapports de productivité
 */
import { collections } from 'config';
import { TimeEntryModel } from '../../models/time-entry.model';

export interface ProductivityMetrics {
  employeeId: string;
  employeeName?: string;
  period: {
    start: string;
    end: string;
  };
  totalHours: number;
  productiveHours: number;
  productivityRate: number;
  averageHoursPerDay: number;
  peakProductivityDay: string;
  peakProductivityHours: number;
  activityDistribution: ActivityProductivity[];
  dailyBreakdown: DailyProductivity[];
  trends: ProductivityTrend[];
}

export interface ActivityProductivity {
  activityCodeId: string;
  activityName?: string;
  totalHours: number;
  percentage: number;
  productivityScore: number;
  averageSessionDuration: number;
}

export interface DailyProductivity {
  date: string;
  totalHours: number;
  productiveHours: number;
  productivityRate: number;
  activitiesCount: number;
  focusScore: number;
}

export interface ProductivityTrend {
  period: string;
  totalHours: number;
  productivityRate: number;
  change: number;
  changePercentage: number;
}

export interface TeamProductivityReport {
  period: {
    start: string;
    end: string;
  };
  teamMetrics: {
    averageProductivity: number;
    totalTeamHours: number;
    topPerformer: string;
    improvementOpportunities: string[];
  };
  employees: ProductivityMetrics[];
  comparisons: ProductivityComparison[];
}

export interface ProductivityComparison {
  employeeId: string;
  employeeName?: string;
  currentPeriod: {
    totalHours: number;
    productivityRate: number;
  };
  previousPeriod: {
    totalHours: number;
    productivityRate: number;
  };
  improvement: {
    hoursChange: number;
    productivityChange: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

export interface ActivityEfficiencyReport {
  period: {
    start: string;
    end: string;
  };
  activities: ActivityEfficiency[];
  insights: {
    mostEfficient: string;
    leastEfficient: string;
    averageEfficiency: number;
    recommendations: string[];
  };
}

export interface ActivityEfficiency {
  activityCodeId: string;
  activityName?: string;
  totalHours: number;
  employeeCount: number;
  averageSessionDuration: number;
  efficiencyScore: number;
  consistencyScore: number;
  employeePerformance: EmployeeActivityPerformance[];
}

export interface EmployeeActivityPerformance {
  employeeId: string;
  employeeName?: string;
  totalHours: number;
  averageSessionDuration: number;
  efficiencyScore: number;
  sessionsCount: number;
}

export interface TimeDistributionAnalysis {
  employeeId: string;
  employeeName?: string;
  period: {
    start: string;
    end: string;
  };
  distribution: {
    byProject: ProjectTimeDistribution[];
    byActivity: ActivityTimeDistribution[];
    byDayOfWeek: DayOfWeekDistribution[];
    byTimeOfDay: TimeOfDayDistribution[];
  };
  patterns: {
    mostProductiveDay: string;
    mostProductiveHour: number;
    preferredActivities: string[];
    workingPattern: 'early-bird' | 'night-owl' | 'consistent' | 'irregular';
  };
}

export interface ProjectTimeDistribution {
  projectId: string;
  projectName?: string;
  hours: number;
  percentage: number;
  sessions: number;
  averageSessionDuration: number;
}

export interface ActivityTimeDistribution {
  activityCodeId: string;
  activityName?: string;
  hours: number;
  percentage: number;
  sessions: number;
  averageSessionDuration: number;
}

export interface DayOfWeekDistribution {
  dayOfWeek: string;
  hours: number;
  percentage: number;
  averageDaily: number;
}

export interface TimeOfDayDistribution {
  hour: number;
  hours: number;
  percentage: number;
  productivityScore: number;
}

export class ProductivityReportService {
  constructor() { }

  /**
   * Génère les métriques de productivité pour un employé
   */
  async generateEmployeeProductivityMetrics(
    employeeId: string,
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<ProductivityMetrics> {
    const timeEntriesSnapshot = await collections.time_entries
      .where('employeeId', '==', employeeId)
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd)
      .orderBy('date')
      .get();

    const entries = timeEntriesSnapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));

    if (entries.length === 0) {
      return this.createEmptyProductivityMetrics(employeeId, dateStart, dateEnd);
    }

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const productiveHours = this.calculateProductiveHours(entries);
    const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

    const dailyBreakdown = this.calculateDailyProductivity(entries);
    const activityDistribution = await this.calculateActivityProductivity(entries, tenantId);
    const trends = await this.calculateProductivityTrends(employeeId, tenantId, dateStart, dateEnd);

    // Trouver le jour le plus productif
    const peakDay = dailyBreakdown.reduce((peak, day) =>
      day.productiveHours > peak.productiveHours ? day : peak
    );

    const workingDays = this.getWorkingDaysBetween(dateStart, dateEnd);
    const averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

    return {
      employeeId,
      period: { start: dateStart, end: dateEnd },
      totalHours,
      productiveHours,
      productivityRate,
      averageHoursPerDay,
      peakProductivityDay: peakDay.date,
      peakProductivityHours: peakDay.productiveHours,
      activityDistribution,
      dailyBreakdown,
      trends
    };
  }

  /**
   * Génère un rapport de productivité d'équipe
   */
  async generateTeamProductivityReport(
    tenantId: string,
    employeeIds: string[],
    dateStart: string,
    dateEnd: string
  ): Promise<TeamProductivityReport> {
    const employeeMetrics: ProductivityMetrics[] = [];

    for (const employeeId of employeeIds) {
      const metrics = await this.generateEmployeeProductivityMetrics(
        employeeId, tenantId, dateStart, dateEnd
      );
      employeeMetrics.push(metrics);
    }

    // Enrichir avec les noms des employés
    await this.enrichWithEmployeeNames(employeeMetrics, tenantId);

    const totalTeamHours = employeeMetrics.reduce((sum, emp) => sum + emp.totalHours, 0);
    const averageProductivity = employeeMetrics.length > 0
      ? employeeMetrics.reduce((sum, emp) => sum + emp.productivityRate, 0) / employeeMetrics.length
      : 0;

    const topPerformer = employeeMetrics.reduce((top, emp) =>
      emp.productivityRate > top.productivityRate ? emp : top
    );

    // Générer les comparaisons période précédente
    const comparisons = await this.generateProductivityComparisons(
      employeeIds, tenantId, dateStart, dateEnd
    );

    // Identifier les opportunités d'amélioration
    const improvementOpportunities = this.identifyImprovementOpportunities(employeeMetrics);

    return {
      period: { start: dateStart, end: dateEnd },
      teamMetrics: {
        averageProductivity,
        totalTeamHours,
        topPerformer: topPerformer.employeeName || topPerformer.employeeId,
        improvementOpportunities
      },
      employees: employeeMetrics.sort((a, b) => b.productivityRate - a.productivityRate),
      comparisons
    };
  }

  /**
   * Génère un rapport d'efficacité par activité
   */
  async generateActivityEfficiencyReport(
    tenantId: string,
    dateStart: string,
    dateEnd: string,
    activityCodeIds?: string[]
  ): Promise<ActivityEfficiencyReport> {
    let query = collections.time_entries
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd) as any;

    if (activityCodeIds && activityCodeIds.length > 0) {
      query = query.where('activityCodeId', 'in', activityCodeIds);
    }

    const snapshot = await query.get();
    const entries = snapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));

    // Grouper par activité
    const activitiesMap = new Map<string, TimeEntryModel[]>();
    for (const entry of entries) {
      if (!entry.activityCodeId) continue;

      if (!activitiesMap.has(entry.activityCodeId)) {
        activitiesMap.set(entry.activityCodeId, []);
      }
      activitiesMap.get(entry.activityCodeId)!.push(entry);
    }

    const activities: ActivityEfficiency[] = [];

    for (const [activityId, activityEntries] of activitiesMap) {
      const efficiency = await this.calculateActivityEfficiency(activityId, activityEntries, tenantId);
      activities.push(efficiency);
    }

    // Enrichir avec les noms des activités
    await this.enrichActivitiesWithNames(activities, tenantId);

    // Calculer les insights
    const sortedByEfficiency = [...activities].sort((a, b) => b.efficiencyScore - a.efficiencyScore);
    const averageEfficiency = activities.length > 0
      ? activities.reduce((sum, act) => sum + act.efficiencyScore, 0) / activities.length
      : 0;

    const insights = {
      mostEfficient: sortedByEfficiency[0]?.activityName || 'N/A',
      leastEfficient: sortedByEfficiency[sortedByEfficiency.length - 1]?.activityName || 'N/A',
      averageEfficiency,
      recommendations: this.generateEfficiencyRecommendations(activities)
    };

    return {
      period: { start: dateStart, end: dateEnd },
      activities: activities.sort((a, b) => b.efficiencyScore - a.efficiencyScore),
      insights
    };
  }

  /**
   * Génère une analyse de distribution du temps
   */
  async generateTimeDistributionAnalysis(
    employeeId: string,
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<TimeDistributionAnalysis> {
    const timeEntriesSnapshot = await collections.time_entries
      .where('employeeId', '==', employeeId)
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd)
      .get();

    const entries = timeEntriesSnapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));

    if (entries.length === 0) {
      return this.createEmptyTimeDistribution(employeeId, dateStart, dateEnd);
    }

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration / 60), 0);

    // Distribution par projet
    const byProject = this.calculateProjectDistribution(entries, totalHours);

    // Distribution par activité
    const byActivity = this.calculateActivityDistribution(entries, totalHours);

    // Distribution par jour de la semaine
    const byDayOfWeek = this.calculateDayOfWeekDistribution(entries, totalHours);

    // Distribution par heure de la journée
    const byTimeOfDay = this.calculateTimeOfDayDistribution(entries, totalHours);

    // Analyser les patterns
    const patterns = this.analyzeWorkingPatterns(entries, byDayOfWeek, byTimeOfDay);

    // Enrichir avec les noms
    await this.enrichProjectDistribution(byProject, tenantId);
    await this.enrichActivityDistribution(byActivity, tenantId);

    return {
      employeeId,
      period: { start: dateStart, end: dateEnd },
      distribution: {
        byProject,
        byActivity,
        byDayOfWeek,
        byTimeOfDay
      },
      patterns
    };
  }

  /**
   * Calcule les heures productives basées sur des critères
   */
  private calculateProductiveHours(entries: TimeEntryModel[]): number {
    return entries.reduce((sum, entry) => {
      // Considérer comme productif si:
      // - Billable
      // - Durée >= 30 minutes (sessions focalisées)
      // - Description non vide
      const isProductive = entry.billable &&
        entry.duration >= 30 &&
        entry.description &&
        entry.description.trim().length > 0;

      return sum + (isProductive ? entry.duration / 60 : 0);
    }, 0);
  }

  /**
   * Calcule la productivité quotidienne
   */
  private calculateDailyProductivity(entries: TimeEntryModel[]): DailyProductivity[] {
    const dailyMap = new Map<string, TimeEntryModel[]>();

    for (const entry of entries) {
      if (!dailyMap.has(entry.date)) {
        dailyMap.set(entry.date, []);
      }
      dailyMap.get(entry.date)!.push(entry);
    }

    const dailyBreakdown: DailyProductivity[] = [];

    for (const [date, dayEntries] of dailyMap) {
      const totalHours = dayEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const productiveHours = this.calculateProductiveHours(dayEntries);
      const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

      // Score de focus basé sur le nombre de changements d'activité
      const uniqueActivities = new Set(dayEntries.map(e => e.activityCodeId)).size;
      const focusScore = Math.max(0, 100 - (uniqueActivities * 10));

      dailyBreakdown.push({
        date,
        totalHours,
        productiveHours,
        productivityRate,
        activitiesCount: uniqueActivities,
        focusScore
      });
    }

    return dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calcule la productivité par activité
   */
  private async calculateActivityProductivity(
    entries: TimeEntryModel[],
    tenantId: string
  ): Promise<ActivityProductivity[]> {
    const activityMap = new Map<string, TimeEntryModel[]>();

    for (const entry of entries) {
      if (!entry.activityCodeId) continue;

      if (!activityMap.has(entry.activityCodeId)) {
        activityMap.set(entry.activityCodeId, []);
      }
      activityMap.get(entry.activityCodeId)!.push(entry);
    }

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const activities: ActivityProductivity[] = [];

    for (const [activityId, activityEntries] of activityMap) {
      const activityHours = activityEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const percentage = totalHours > 0 ? (activityHours / totalHours) * 100 : 0;

      // Score de productivité basé sur la durée moyenne des sessions et le caractère facturable
      const averageSessionDuration = activityEntries.length > 0
        ? activityHours / activityEntries.length
        : 0;

      const billablePercentage = activityEntries.filter(e => e.billable).length / activityEntries.length;
      const productivityScore = (averageSessionDuration * 20) + (billablePercentage * 80);

      activities.push({
        activityCodeId: activityId,
        totalHours: activityHours,
        percentage,
        productivityScore: Math.min(100, productivityScore),
        averageSessionDuration
      });
    }

    return activities.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Calcule les tendances de productivité
   */
  private async calculateProductivityTrends(
    employeeId: string,
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<ProductivityTrend[]> {
    // Diviser la période en semaines pour analyser les tendances
    const weeks = this.getWeeksBetween(dateStart, dateEnd);
    const trends: ProductivityTrend[] = [];

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      const weekEntries = await this.getTimeEntriesForPeriod(
        employeeId, tenantId, week.start, week.end
      );

      const totalHours = weekEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const productiveHours = this.calculateProductiveHours(weekEntries);
      const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

      let change = 0;
      let changePercentage = 0;

      if (i > 0) {
        const previousTrend = trends[i - 1];
        change = productivityRate - previousTrend.productivityRate;
        changePercentage = previousTrend.productivityRate > 0
          ? (change / previousTrend.productivityRate) * 100
          : 0;
      }

      trends.push({
        period: `Week ${i + 1}`,
        totalHours,
        productivityRate,
        change,
        changePercentage
      });
    }

    return trends;
  }

  /**
   * Génère les comparaisons de productivité avec la période précédente
   */
  private async generateProductivityComparisons(
    employeeIds: string[],
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<ProductivityComparison[]> {
    const comparisons: ProductivityComparison[] = [];

    // Calculer la période précédente de même durée
    const periodDays = this.getDaysBetween(dateStart, dateEnd);
    const previousEnd = this.subtractDays(dateStart, 1);
    const previousStart = this.subtractDays(previousEnd, periodDays - 1);

    for (const employeeId of employeeIds) {
      const currentMetrics = await this.generateEmployeeProductivityMetrics(
        employeeId, tenantId, dateStart, dateEnd
      );

      const previousMetrics = await this.generateEmployeeProductivityMetrics(
        employeeId, tenantId, previousStart, previousEnd
      );

      const hoursChange = currentMetrics.totalHours - previousMetrics.totalHours;
      const productivityChange = currentMetrics.productivityRate - previousMetrics.productivityRate;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (Math.abs(productivityChange) > 5) {
        trend = productivityChange > 0 ? 'improving' : 'declining';
      }

      comparisons.push({
        employeeId,
        currentPeriod: {
          totalHours: currentMetrics.totalHours,
          productivityRate: currentMetrics.productivityRate
        },
        previousPeriod: {
          totalHours: previousMetrics.totalHours,
          productivityRate: previousMetrics.productivityRate
        },
        improvement: {
          hoursChange,
          productivityChange,
          trend
        }
      });
    }

    return comparisons;
  }

  /**
   * Calcule l'efficacité d'une activité
   */
  private async calculateActivityEfficiency(
    activityId: string,
    entries: TimeEntryModel[],
    tenantId: string
  ): Promise<ActivityEfficiency> {
    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
    const uniqueEmployees = new Set(entries.map(e => e.employeeId));
    const employeeCount = uniqueEmployees.size;

    // Calculer la durée moyenne des sessions
    const averageSessionDuration = entries.length > 0 ? totalHours / entries.length : 0;

    // Score d'efficacité basé sur plusieurs facteurs
    const billablePercentage = entries.filter(e => e.billable).length / entries.length;
    const sessionConsistency = this.calculateSessionConsistency(entries);
    const efficiencyScore = (billablePercentage * 40) + (sessionConsistency * 30) +
      (Math.min(averageSessionDuration * 10, 30));

    // Performance par employé
    const employeePerformance: EmployeeActivityPerformance[] = [];

    for (const employeeId of uniqueEmployees) {
      const employeeEntries = entries.filter(e => e.employeeId === employeeId);
      const empHours = employeeEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const empAvgSession = employeeEntries.length > 0 ? empHours / employeeEntries.length : 0;
      const empBillablePercentage = employeeEntries.filter(e => e.billable).length / employeeEntries.length;
      const empEfficiency = (empBillablePercentage * 50) + (Math.min(empAvgSession * 10, 50));

      employeePerformance.push({
        employeeId,
        totalHours: empHours,
        averageSessionDuration: empAvgSession,
        efficiencyScore: empEfficiency,
        sessionsCount: employeeEntries.length
      });
    }

    return {
      activityCodeId: activityId,
      totalHours,
      employeeCount,
      averageSessionDuration,
      efficiencyScore: Math.min(100, efficiencyScore),
      consistencyScore: sessionConsistency,
      employeePerformance: employeePerformance.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    };
  }

  /**
   * Calcule la distribution par projet
   */
  private calculateProjectDistribution(
    entries: TimeEntryModel[],
    totalHours: number
  ): ProjectTimeDistribution[] {
    const projectMap = new Map<string, TimeEntryModel[]>();

    for (const entry of entries) {
      if (!entry.projectId) continue;

      if (!projectMap.has(entry.projectId)) {
        projectMap.set(entry.projectId, []);
      }
      projectMap.get(entry.projectId)!.push(entry);
    }

    const distribution: ProjectTimeDistribution[] = [];

    for (const [projectId, projectEntries] of projectMap) {
      const hours = projectEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
      const sessions = projectEntries.length;
      const averageSessionDuration = sessions > 0 ? hours / sessions : 0;

      distribution.push({
        projectId,
        hours,
        percentage,
        sessions,
        averageSessionDuration
      });
    }

    return distribution.sort((a, b) => b.hours - a.hours);
  }

  /**
   * Calcule la distribution par activité
   */
  private calculateActivityDistribution(
    entries: TimeEntryModel[],
    totalHours: number
  ): ActivityTimeDistribution[] {
    const activityMap = new Map<string, TimeEntryModel[]>();

    for (const entry of entries) {
      if (!entry.activityCodeId) continue;

      if (!activityMap.has(entry.activityCodeId)) {
        activityMap.set(entry.activityCodeId, []);
      }
      activityMap.get(entry.activityCodeId)!.push(entry);
    }

    const distribution: ActivityTimeDistribution[] = [];

    for (const [activityId, activityEntries] of activityMap) {
      const hours = activityEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
      const sessions = activityEntries.length;
      const averageSessionDuration = sessions > 0 ? hours / sessions : 0;

      distribution.push({
        activityCodeId: activityId,
        hours,
        percentage,
        sessions,
        averageSessionDuration
      });
    }

    return distribution.sort((a, b) => b.hours - a.hours);
  }

  /**
   * Calcule la distribution par jour de la semaine
   */
  private calculateDayOfWeekDistribution(
    entries: TimeEntryModel[],
    totalHours: number
  ): DayOfWeekDistribution[] {
    const dayMap = new Map<string, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const entry of entries) {
      const date = new Date(entry.date);
      const dayName = dayNames[date.getDay()];
      const hours = entry.duration / 60;

      dayMap.set(dayName, (dayMap.get(dayName) || 0) + hours);
    }

    const distribution: DayOfWeekDistribution[] = [];

    for (const dayName of dayNames) {
      const hours = dayMap.get(dayName) || 0;
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

      // Calculer la moyenne quotidienne (approximative)
      const workingDaysInPeriod = this.countWorkingDaysInPeriod(entries, dayName);
      const averageDaily = workingDaysInPeriod > 0 ? hours / workingDaysInPeriod : 0;

      distribution.push({
        dayOfWeek: dayName,
        hours,
        percentage,
        averageDaily
      });
    }

    return distribution;
  }

  /**
   * Calcule la distribution par heure de la journée
   */
  private calculateTimeOfDayDistribution(
    entries: TimeEntryModel[],
    totalHours: number
  ): TimeOfDayDistribution[] {
    const hourMap = new Map<number, number>();

    for (const entry of entries) {
      // Si l'entrée a des heures de début/fin, les utiliser
      if (entry.startTime) {
        const startHour = new Date(entry.startTime).getHours();
        const hours = entry.duration / 60;
        hourMap.set(startHour, (hourMap.get(startHour) || 0) + hours);
      } else {
        // Sinon, distribuer uniformément sur les heures de travail (9-17)
        const hours = entry.duration / 60;
        const workingHours = 8;
        const hoursPerHour = hours / workingHours;

        for (let hour = 9; hour <= 17; hour++) {
          hourMap.set(hour, (hourMap.get(hour) || 0) + hoursPerHour);
        }
      }
    }

    const distribution: TimeOfDayDistribution[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const hours = hourMap.get(hour) || 0;
      const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

      // Score de productivité basé sur les heures de travail typiques
      let productivityScore = 50; // Base
      if (hour >= 9 && hour <= 17) {
        productivityScore = 80; // Heures de bureau
      } else if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
        productivityScore = 60; // Heures étendues
      } else {
        productivityScore = 30; // Heures atypiques
      }

      distribution.push({
        hour,
        hours,
        percentage,
        productivityScore
      });
    }

    return distribution;
  }

  /**
   * Analyse les patterns de travail
   */
  private analyzeWorkingPatterns(
    entries: TimeEntryModel[],
    dayDistribution: DayOfWeekDistribution[],
    timeDistribution: TimeOfDayDistribution[]
  ) {
    // Jour le plus productif
    const mostProductiveDay = dayDistribution.reduce((max, day) =>
      day.hours > max.hours ? day : max
    ).dayOfWeek;

    // Heure la plus productive
    const mostProductiveHour = timeDistribution.reduce((max, time) =>
      time.hours > max.hours ? time : max
    ).hour;

    // Activités préférées (top 3)
    const activityMap = new Map<string, number>();
    for (const entry of entries) {
      if (entry.activityCodeId) {
        const hours = entry.duration / 60;
        activityMap.set(entry.activityCodeId, (activityMap.get(entry.activityCodeId) || 0) + hours);
      }
    }

    const preferredActivities = Array.from(activityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([activityId]) => activityId);

    // Pattern de travail
    let workingPattern: 'early-bird' | 'night-owl' | 'consistent' | 'irregular' = 'consistent';

    const morningHours = timeDistribution.filter(t => t.hour >= 6 && t.hour <= 10)
      .reduce((sum, t) => sum + t.hours, 0);
    const eveningHours = timeDistribution.filter(t => t.hour >= 18 && t.hour <= 22)
      .reduce((sum, t) => sum + t.hours, 0);
    const totalDayHours = timeDistribution.reduce((sum, t) => sum + t.hours, 0);

    if (morningHours / totalDayHours > 0.3) {
      workingPattern = 'early-bird';
    } else if (eveningHours / totalDayHours > 0.3) {
      workingPattern = 'night-owl';
    } else {
      // Vérifier la régularité
      const hourVariance = this.calculateHourVariance(timeDistribution);
      if (hourVariance > 50) {
        workingPattern = 'irregular';
      }
    }

    return {
      mostProductiveDay,
      mostProductiveHour,
      preferredActivities,
      workingPattern
    };
  }

  // Méthodes utilitaires privées

  private createEmptyProductivityMetrics(
    employeeId: string,
    dateStart: string,
    dateEnd: string
  ): ProductivityMetrics {
    return {
      employeeId,
      period: { start: dateStart, end: dateEnd },
      totalHours: 0,
      productiveHours: 0,
      productivityRate: 0,
      averageHoursPerDay: 0,
      peakProductivityDay: '',
      peakProductivityHours: 0,
      activityDistribution: [],
      dailyBreakdown: [],
      trends: []
    };
  }

  private createEmptyTimeDistribution(
    employeeId: string,
    dateStart: string,
    dateEnd: string
  ): TimeDistributionAnalysis {
    return {
      employeeId,
      period: { start: dateStart, end: dateEnd },
      distribution: {
        byProject: [],
        byActivity: [],
        byDayOfWeek: [],
        byTimeOfDay: []
      },
      patterns: {
        mostProductiveDay: '',
        mostProductiveHour: 9,
        preferredActivities: [],
        workingPattern: 'consistent'
      }
    };
  }

  private calculateSessionConsistency(entries: TimeEntryModel[]): number {
    if (entries.length < 2) return 100;

    const durations = entries.map(e => e.duration);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);

    // Score de consistance inversement proportionnel à l'écart-type
    return Math.max(0, 100 - (standardDeviation / average) * 100);
  }

  private identifyImprovementOpportunities(metrics: ProductivityMetrics[]): string[] {
    const opportunities: string[] = [];

    const avgProductivity = metrics.reduce((sum, m) => sum + m.productivityRate, 0) / metrics.length;

    if (avgProductivity < 60) {
      opportunities.push('Overall team productivity below 60% - consider productivity training');
    }

    const lowPerformers = metrics.filter(m => m.productivityRate < avgProductivity - 20);
    if (lowPerformers.length > 0) {
      opportunities.push(`${lowPerformers.length} employees significantly below average - provide individual coaching`);
    }

    const inconsistentWorkers = metrics.filter(m =>
      m.dailyBreakdown.some(d => Math.abs(d.productivityRate - m.productivityRate) > 30)
    );
    if (inconsistentWorkers.length > 0) {
      opportunities.push('Some employees show high daily variation - improve work consistency');
    }

    return opportunities;
  }

  private generateEfficiencyRecommendations(activities: ActivityEfficiency[]): string[] {
    const recommendations: string[] = [];

    const lowEfficiencyActivities = activities.filter(a => a.efficiencyScore < 50);
    if (lowEfficiencyActivities.length > 0) {
      recommendations.push(`Review processes for ${lowEfficiencyActivities.length} low-efficiency activities`);
    }

    const inconsistentActivities = activities.filter(a => a.consistencyScore < 60);
    if (inconsistentActivities.length > 0) {
      recommendations.push('Standardize procedures for activities with low consistency scores');
    }

    const shortSessionActivities = activities.filter(a => a.averageSessionDuration < 0.5);
    if (shortSessionActivities.length > 0) {
      recommendations.push('Consider batching short-duration activities for better focus');
    }

    return recommendations;
  }

  private getWorkingDaysBetween(dateStart: string, dateEnd: string): number {
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Pas weekend
        workingDays++;
      }
    }

    return workingDays;
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

  private getWeeksBetween(dateStart: string, dateEnd: string): Array<{ start: string, end: string }> {
    const weeks: Array<{ start: string, end: string }> = [];
    const start = new Date(dateStart);
    const end = new Date(dateEnd);

    let current = new Date(start);
    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekEnd > end) {
        weekEnd.setTime(end.getTime());
      }

      weeks.push({
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  private async getTimeEntriesForPeriod(
    employeeId: string,
    tenantId: string,
    dateStart: string,
    dateEnd: string
  ): Promise<TimeEntryModel[]> {
    const snapshot = await collections.time_entries
      .where('employeeId', '==', employeeId)
      .where('tenantId', '==', tenantId)
      .where('date', '>=', dateStart)
      .where('date', '<=', dateEnd)
      .get();

    return snapshot.docs.map(doc => TimeEntryModel.fromFirestore(doc));
  }

  private countWorkingDaysInPeriod(entries: TimeEntryModel[], dayName: string): number {
    const dates = new Set(entries.map(e => e.date));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayName);

    let count = 0;
    for (const dateString of dates) {
      const date = new Date(dateString);
      if (date.getDay() === targetDayIndex) {
        count++;
      }
    }

    return count;
  }

  private calculateHourVariance(timeDistribution: TimeOfDayDistribution[]): number {
    const hours = timeDistribution.map(t => t.hours);
    const average = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - average, 2), 0) / hours.length;
    return variance;
  }

  private async enrichWithEmployeeNames(metrics: ProductivityMetrics[], tenantId: string) {
    const employeeIds = metrics.map(m => m.employeeId);
    if (employeeIds.length === 0) return;

    const employeesSnapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('id', 'in', employeeIds)
      .get();

    const employeeNames = new Map<string, string>();
    for (const doc of employeesSnapshot.docs) {
      const employee = doc.data();
      employeeNames.set(employee.id, `${employee.firstName} ${employee.lastName}`);
    }

    for (const metric of metrics) {
      metric.employeeName = employeeNames.get(metric.employeeId);
    }
  }

  private async enrichActivitiesWithNames(activities: ActivityEfficiency[], tenantId: string) {
    const activityIds = activities.map(a => a.activityCodeId);
    if (activityIds.length === 0) return;

    const activitiesSnapshot = await collections.activity_codes
      .where('tenantId', '==', tenantId)
      .where('id', 'in', activityIds)
      .get();

    const activityNames = new Map<string, string>();
    for (const doc of activitiesSnapshot.docs) {
      const activity = doc.data();
      activityNames.set(doc.id, activity.name);
    }

    for (const activity of activities) {
      activity.activityName = activityNames.get(activity.activityCodeId);

      // Enrichir aussi les performances des employés
      // @ts-ignore
      for (const empPerf of activity.employeePerformance) {
        // Les noms des employés seront enrichis séparément si nécessaire
      }
    }
  }

  private async enrichProjectDistribution(distribution: ProjectTimeDistribution[], tenantId: string) {
    const projectIds = distribution.map(d => d.projectId);
    if (projectIds.length === 0) return;

    const projectsSnapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('id', 'in', projectIds)
      .get();

    const projectNames = new Map<string, string>();
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      projectNames.set(doc.id, project.name);
    }

    for (const item of distribution) {
      item.projectName = projectNames.get(item.projectId);
    }
  }

  private async enrichActivityDistribution(distribution: ActivityTimeDistribution[], tenantId: string) {
    const activityIds = distribution.map(d => d.activityCodeId);
    if (activityIds.length === 0) return;

    const activitiesSnapshot = await collections.activity_codes
      .where('tenantId', '==', tenantId)
      .where('id', 'in', activityIds)
      .get();

    const activityNames = new Map<string, string>();
    for (const doc of activitiesSnapshot.docs) {
      const activity = doc.data();
      activityNames.set(doc.id, activity.name);
    }

    for (const item of distribution) {
      item.activityName = activityNames.get(item.activityCodeId);
    }
  }
}