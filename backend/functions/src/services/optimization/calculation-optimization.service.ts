/**
 * Service d'optimisation des calculs et agrégations
 */
import { collections } from '../../config/database';
import { CacheService } from './cache.service';

export interface CalculationJob {
  id: string;
  type: 'timesheet_totals' | 'project_analytics' | 'employee_metrics' | 'report_generation';
  tenantId: string;
  entityId: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface IncrementalCalculationState {
  lastCalculated: Date;
  lastModified: Date;
  checksum: string;
  version: number;
}

export interface AggregationConfig {
  enableIncremental: boolean;
  batchSize: number;
  maxConcurrency: number;
  enablePreCalculation: boolean;
  recalculationInterval: number;
}

export interface CalculationMetrics {
  totalCalculations: number;
  averageCalculationTime: number;
  cacheHitRate: number;
  incrementalCalculations: number;
  backgroundCalculations: number;
}

export class CalculationOptimizationService {
  private calculationQueue: CalculationJob[] = [];
  private runningJobs = new Map<string, CalculationJob>();
  private incrementalStates = new Map<string, IncrementalCalculationState>();
  private metrics: CalculationMetrics = {
    totalCalculations: 0,
    averageCalculationTime: 0,
    cacheHitRate: 0,
    incrementalCalculations: 0,
    backgroundCalculations: 0
  };

  constructor(
    private cacheService: CacheService,
    private config: AggregationConfig = {
      enableIncremental: true,
      batchSize: 100,
      maxConcurrency: 3,
      enablePreCalculation: true,
      recalculationInterval: 60 * 60 * 1000 // 1 heure
    }
  ) {
    this.startBackgroundProcessor();
    this.startPreCalculationScheduler();
  }

  /**
   * Calcul incrémental des totaux de feuilles de temps
   */
  async calculateTimesheetTotalsIncremental(
    timesheetId: string,
    tenantId: string,
    forceRecalculation: boolean = false
  ): Promise<any> {
    const cacheKey = `timesheet_totals:${timesheetId}`;
    const stateKey = `state:${cacheKey}`;
    
    // Vérifier l'état incrémental
    const currentState = this.incrementalStates.get(stateKey);
    const lastModified = await this.getTimesheetLastModified(timesheetId, tenantId);
    
    if (!forceRecalculation && currentState && lastModified <= currentState.lastModified) {
      // Utiliser le cache si rien n'a changé
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const startTime = Date.now();
    
    // Calculer les totaux
    const totals = await this.performTimesheetCalculation(timesheetId, tenantId);
    
    // Mettre à jour l'état incrémental
    this.incrementalStates.set(stateKey, {
      lastCalculated: new Date(),
      lastModified,
      checksum: this.calculateChecksum(totals),
      version: (currentState?.version || 0) + 1
    });
    
    // Mettre en cache
    await this.cacheService.set(cacheKey, totals, 10 * 60 * 1000); // 10 minutes
    
    // Mettre à jour les métriques
    this.updateCalculationMetrics(Date.now() - startTime, true);
    
    return totals;
  }

  /**
   * Pré-calcul des métriques d'employés
   */
  async preCalculateEmployeeMetrics(tenantId: string, employeeIds?: string[]): Promise<void> {
    const employees = employeeIds || await this.getActiveEmployeeIds(tenantId);
    
    // Traiter par lots pour éviter la surcharge
    for (let i = 0; i < employees.length; i += this.config.batchSize) {
      const batch = employees.slice(i, i + this.config.batchSize);
      
      const batchPromises = batch.map(employeeId => 
        this.scheduleBackgroundCalculation('employee_metrics', tenantId, employeeId, {
          period: 'current_month'
        })
      );
      
      await Promise.allSettled(batchPromises);
      
      // Pause entre les lots
      await this.sleep(100);
    }
  }

  /**
   * Pré-calcul des analytics de projets
   */
  async preCalculateProjectAnalytics(tenantId: string, projectIds?: string[]): Promise<void> {
    const projects = projectIds || await this.getActiveProjectIds(tenantId);
    
    for (const projectId of projects) {
      await this.scheduleBackgroundCalculation('project_analytics', tenantId, projectId, {
        includeFinancials: true,
        includeTeamMetrics: true
      });
    }
  }

  /**
   * Calcul optimisé des agrégations de rapports
   */
  async calculateReportAggregations(
    reportType: string,
    tenantId: string,
    filters: any,
    useIncremental: boolean = true
  ): Promise<any> {
    const cacheKey = `report_agg:${reportType}:${tenantId}:${this.hashFilters(filters)}`;
    
    if (useIncremental) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    const startTime = Date.now();
    let result: any;
    
    switch (reportType) {
      case 'employee_productivity':
        result = await this.calculateEmployeeProductivityAggregations(tenantId, filters);
        break;
      case 'project_profitability':
        result = await this.calculateProjectProfitabilityAggregations(tenantId, filters);
        break;
      case 'time_distribution':
        result = await this.calculateTimeDistributionAggregations(tenantId, filters);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Mettre en cache le résultat
    await this.cacheService.set(cacheKey, result, 15 * 60 * 1000); // 15 minutes
    
    this.updateCalculationMetrics(Date.now() - startTime, false);
    
    return result;
  }

  /**
   * Calcul en arrière-plan avec file d'attente
   */
  async scheduleBackgroundCalculation(
    type: CalculationJob['type'],
    tenantId: string,
    entityId: string,
    parameters: any,
    priority: number = 5
  ): Promise<string> {
    const job: CalculationJob = {
      id: `${type}_${tenantId}_${entityId}_${Date.now()}`,
      type,
      tenantId,
      entityId,
      parameters,
      status: 'pending',
      priority,
      createdAt: new Date()
    };
    
    // Insérer dans la file d'attente selon la priorité
    this.insertJobByPriority(job);
    
    return job.id;
  }

  /**
   * Optimisation des requêtes d'analytics
   */
  async optimizeAnalyticsQuery(
    collection: string,
    tenantId: string,
    aggregations: any[],
    filters: any = {}
  ): Promise<any> {
    // Utiliser des requêtes composites optimisées
    const optimizedQuery = this.buildOptimizedQuery(collection, tenantId, filters);
    
    // Exécuter en parallèle si possible
    const results = await this.executeParallelAggregations(optimizedQuery, aggregations);
    
    return results;
  }

  /**
   * Calcul différentiel pour les mises à jour
   */
  async calculateDifferentialUpdate(
    entityType: string,
    entityId: string,
    tenantId: string,
    changes: any
  ): Promise<any> {
    const stateKey = `diff_state:${entityType}:${entityId}`;
    const previousState = this.incrementalStates.get(stateKey);
    
    if (!previousState) {
      // Première fois, calcul complet
      return this.performFullCalculation(entityType, entityId, tenantId);
    }
    
    // Calcul différentiel basé sur les changements
    const delta = await this.calculateDelta(entityType, entityId, changes, previousState);
    
    // Appliquer le delta au résultat précédent
    const updatedResult = this.applyDelta(previousState, delta);
    
    // Mettre à jour l'état
    this.incrementalStates.set(stateKey, {
      lastCalculated: new Date(),
      lastModified: new Date(),
      checksum: this.calculateChecksum(updatedResult),
      version: previousState.version + 1
    });
    
    return updatedResult;
  }

  /**
   * Nettoyage et maintenance des calculs
   */
  async performMaintenance(): Promise<void> {
    // Nettoyer les états expirés
    this.cleanupExpiredStates();
    
    // Recalculer les métriques critiques
    await this.recalculateCriticalMetrics();
    
    // Optimiser les index de calcul
    await this.optimizeCalculationIndexes();
    
    console.log('Calculation optimization maintenance completed');
  }

  /**
   * Métriques de performance des calculs
   */
  getCalculationMetrics(): CalculationMetrics {
    return { ...this.metrics };
  }

  // Méthodes privées

  private startBackgroundProcessor(): void {
    setInterval(async () => {
      await this.processCalculationQueue();
    }, 5000); // Traiter la file toutes les 5 secondes
  }

  private startPreCalculationScheduler(): void {
    if (!this.config.enablePreCalculation) {return;}
    
    setInterval(async () => {
      await this.schedulePreCalculations();
    }, this.config.recalculationInterval);
  }

  private async processCalculationQueue(): Promise<void> {
    if (this.runningJobs.size >= this.config.maxConcurrency) {
      return;
    }
    
    const job = this.calculationQueue.shift();
    if (!job) {return;}
    
    job.status = 'running';
    job.startedAt = new Date();
    this.runningJobs.set(job.id, job);
    
    try {
      const result = await this.executeCalculationJob(job);
      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();
      
      this.metrics.backgroundCalculations++;
    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.status = 'failed';
      console.error(`Calculation job ${job.id} failed:`, error);
    } finally {
      this.runningJobs.delete(job.id);
    }
  }

  private async executeCalculationJob(job: CalculationJob): Promise<any> {
    switch (job.type) {
      case 'timesheet_totals':
        return this.performTimesheetCalculation(job.entityId, job.tenantId);
      
      case 'employee_metrics':
        return this.calculateEmployeeMetrics(job.entityId, job.tenantId, job.parameters);
      
      case 'project_analytics':
        return this.calculateProjectAnalytics(job.entityId, job.tenantId, job.parameters);
      
      case 'report_generation':
        return this.generateReportData(job.parameters.reportType, job.tenantId, job.parameters.filters);
      
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  private async performTimesheetCalculation(timesheetId: string, tenantId: string): Promise<any> {
    const snapshot = await collections.time_entries
      .where('timesheetId', '==', timesheetId)
      .where('tenantId', '==', tenantId)
      .get();
    
    let totalHours = 0;
    let billableHours = 0;
    let totalCost = 0;
    const projectHours: Record<string, number> = {};
    const activityHours: Record<string, number> = {};
    
    for (const doc of snapshot.docs) {
      const entry = doc.data();
      const hours = entry.duration / 60;
      
      totalHours += hours;
      totalCost += entry.totalCost || 0;
      
      if (entry.billable) {
        billableHours += hours;
      }
      
      if (entry.projectId) {
        projectHours[entry.projectId] = (projectHours[entry.projectId] || 0) + hours;
      }
      
      if (entry.activityCodeId) {
        activityHours[entry.activityCodeId] = (activityHours[entry.activityCodeId] || 0) + hours;
      }
    }
    
    return {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalCost,
      entriesCount: snapshot.size,
      projectBreakdown: projectHours,
      activityBreakdown: activityHours,
      calculatedAt: new Date()
    };
  }

  private async calculateEmployeeProductivityAggregations(tenantId: string, filters: any): Promise<any> {
    // Implémentation optimisée des agrégations de productivité
    const query = collections.time_entries
      .where('tenantId', '==', tenantId);
    
    // Ajouter les filtres
    let filteredQuery = query;
    if (filters.dateStart) {
      filteredQuery = filteredQuery.where('date', '>=', filters.dateStart);
    }
    if (filters.dateEnd) {
      filteredQuery = filteredQuery.where('date', '<=', filters.dateEnd);
    }
    
    const snapshot = await filteredQuery.get();
    
    // Agrégations en mémoire optimisées
    const employeeMetrics: Record<string, any> = {};
    
    for (const doc of snapshot.docs) {
      const entry = doc.data();
      const employeeId = entry.employeeId;
      
      if (!employeeMetrics[employeeId]) {
        employeeMetrics[employeeId] = {
          totalHours: 0,
          billableHours: 0,
          entriesCount: 0,
          projects: new Set(),
          activities: new Set()
        };
      }
      
      const metrics = employeeMetrics[employeeId];
      const hours = entry.duration / 60;
      
      metrics.totalHours += hours;
      if (entry.billable) {
        metrics.billableHours += hours;
      }
      metrics.entriesCount++;
      
      if (entry.projectId) {
        metrics.projects.add(entry.projectId);
      }
      if (entry.activityCodeId) {
        metrics.activities.add(entry.activityCodeId);
      }
    }
    
    // Convertir les Sets en nombres
    for (const metrics of Object.values(employeeMetrics)) {
      (metrics as any).projectCount = (metrics as any).projects.size;
      (metrics as any).activityCount = (metrics as any).activities.size;
      delete (metrics as any).projects;
      delete (metrics as any).activities;
    }
    
    return employeeMetrics;
  }

  private async calculateProjectProfitabilityAggregations(tenantId: string, filters: any): Promise<any> {
    // Implémentation similaire pour la rentabilité des projets
    return {};
  }

  private async calculateTimeDistributionAggregations(tenantId: string, filters: any): Promise<any> {
    // Implémentation pour la distribution du temps
    return {};
  }

  private buildOptimizedQuery(collectionName: string, tenantId: string, filters: any): any {
    const collection = (collections as any)[collectionName];
    let query = collection.where('tenantId', '==', tenantId);
    
    // Optimiser l'ordre des filtres pour utiliser les index composites
    const optimizedFilters = this.optimizeFilterOrder(filters);
    
    for (const filter of optimizedFilters) {
      query = query.where(filter.field, filter.operator, filter.value);
    }
    
    return query;
  }

  private async executeParallelAggregations(query: any, aggregations: any[]): Promise<any> {
    // Exécuter les agrégations en parallèle quand possible
    const promises = aggregations.map(agg => this.executeAggregation(query, agg));
    const results = await Promise.allSettled(promises);
    
    return results.reduce((acc, result, index) => {
      if (result.status === 'fulfilled') {
        acc[aggregations[index].name] = result.value;
      }
      return acc;
    }, {} as any);
  }

  private async executeAggregation(query: any, aggregation: any): Promise<any> {
    // Implémentation spécifique selon le type d'agrégation
    const snapshot = await query.get();
    
    switch (aggregation.type) {
      case 'sum':
        return snapshot.docs.reduce((sum, doc) => sum + (doc.data()[aggregation.field] || 0), 0);
      
      case 'count':
        return snapshot.size;
      
      case 'average':
        const sum = snapshot.docs.reduce((sum, doc) => sum + (doc.data()[aggregation.field] || 0), 0);
        return snapshot.size > 0 ? sum / snapshot.size : 0;
      
      default:
        throw new Error(`Unknown aggregation type: ${aggregation.type}`);
    }
  }

  private insertJobByPriority(job: CalculationJob): void {
    let inserted = false;
    for (let i = 0; i < this.calculationQueue.length; i++) {
      if (job.priority < this.calculationQueue[i].priority) {
        this.calculationQueue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.calculationQueue.push(job);
    }
  }

  private async getTimesheetLastModified(timesheetId: string, tenantId: string): Promise<Date> {
    // Récupérer la dernière modification de la feuille de temps ou de ses entrées
    const timesheetDoc = await collections.timesheets.doc(timesheetId).get();
    const timesheetModified = timesheetDoc.exists ? timesheetDoc.data()?.updatedAt?.toDate() : new Date(0);
    
    const entriesSnapshot = await collections.time_entries
      .where('timesheetId', '==', timesheetId)
      .where('tenantId', '==', tenantId)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    
    const entriesModified = entriesSnapshot.empty ? new Date(0) : entriesSnapshot.docs[0].data().updatedAt?.toDate();
    
    return timesheetModified > entriesModified ? timesheetModified : entriesModified;
  }

  private calculateChecksum(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 16);
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64').substring(0, 16);
  }

  private updateCalculationMetrics(calculationTime: number, isIncremental: boolean): void {
    this.metrics.totalCalculations++;
    
    // Moyenne mobile simple
    this.metrics.averageCalculationTime = 
      (this.metrics.averageCalculationTime * (this.metrics.totalCalculations - 1) + calculationTime) / 
      this.metrics.totalCalculations;
    
    if (isIncremental) {
      this.metrics.incrementalCalculations++;
    }
  }

  private async getActiveEmployeeIds(tenantId: string): Promise<string[]> {
    const snapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .select()
      .get();
    
    return snapshot.docs.map(doc => doc.id);
  }

  private async getActiveProjectIds(tenantId: string): Promise<string[]> {
    const snapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .select()
      .get();
    
    return snapshot.docs.map(doc => doc.id);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async schedulePreCalculations(): Promise<void> {
    // Programmer les pré-calculs basés sur l'utilisation
    console.log('Scheduling pre-calculations...');
  }

  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, state] of this.incrementalStates.entries()) {
      if (now - state.lastCalculated.getTime() > 24 * 60 * 60 * 1000) { // 24 heures
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.incrementalStates.delete(key);
    }
  }

  private async recalculateCriticalMetrics(): Promise<void> {
    // Recalculer les métriques critiques
    console.log('Recalculating critical metrics...');
  }

  private async optimizeCalculationIndexes(): Promise<void> {
    // Optimiser les index pour les calculs
    console.log('Optimizing calculation indexes...');
  }

  private optimizeFilterOrder(filters: any): any[] {
    // Optimiser l'ordre des filtres pour les index composites
    return Object.entries(filters).map(([field, value]) => ({
      field,
      operator: '==',
      value
    }));
  }

  private async performFullCalculation(entityType: string, entityId: string, tenantId: string): Promise<any> {
    // Implémentation du calcul complet
    return {};
  }

  private async calculateDelta(entityType: string, entityId: string, changes: any, previousState: any): Promise<any> {
    // Calculer le delta basé sur les changements
    return {};
  }

  private applyDelta(previousState: any, delta: any): any {
    // Appliquer le delta au résultat précédent
    return previousState;
  }

  private async calculateEmployeeMetrics(employeeId: string, tenantId: string, parameters: any): Promise<any> {
    // Implémentation du calcul des métriques d'employé
    return {};
  }

  private async calculateProjectAnalytics(projectId: string, tenantId: string, parameters: any): Promise<any> {
    // Implémentation du calcul des analytics de projet
    return {};
  }

  private async generateReportData(reportType: string, tenantId: string, filters: any): Promise<any> {
    // Implémentation de la génération de données de rapport
    return {};
  }
}

export const calculationOptimizationService = new CalculationOptimizationService(
  new CacheService()
);