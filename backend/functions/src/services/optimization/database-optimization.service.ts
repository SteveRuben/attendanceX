/**
 * Service d'optimisation des requêtes de base de données
 */
import { Query } from 'firebase-admin/firestore';
import { collections } from '../../config/database';

export interface QueryOptimizationConfig {
  enablePagination: boolean;
  defaultPageSize: number;
  maxPageSize: number;
  enableIndexHints: boolean;
  enableQueryCache: boolean;
  cacheTimeout: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startAfter?: any;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: any;
    previousCursor?: any;
  };
}

export interface QueryPerformanceMetrics {
  queryTime: number;
  documentsRead: number;
  documentsReturned: number;
  cacheHit: boolean;
  indexUsed: boolean;
}

export interface OptimizedQuery {
  query: Query;
  metrics: QueryPerformanceMetrics;
  suggestions: string[];
}

export class DatabaseOptimizationService {
  private config: QueryOptimizationConfig;
  private queryCache = new Map<string, { data: any; timestamp: number }>();

  constructor(config?: Partial<QueryOptimizationConfig>) {
    this.config = {
      enablePagination: true,
      defaultPageSize: 50,
      maxPageSize: 1000,
      enableIndexHints: true,
      enableQueryCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      ...config
    };
  }

  /**
   * Crée les index optimaux pour les feuilles de temps
   */
  async createTimesheetIndexes(): Promise<void> {
    const indexes = [
      // Index composites pour les requêtes fréquentes
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'periodStart', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' },
          { field: 'periodStart', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'timesheets',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' }
        ]
      },
      // Index pour les entrées de temps
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'employeeId', order: 'ASCENDING' },
          { field: 'date', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'projectId', order: 'ASCENDING' },
          { field: 'date', order: 'DESCENDING' }
        ]
      },
      {
        collection: 'time_entries',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'timesheetId', order: 'ASCENDING' },
          { field: 'date', order: 'ASCENDING' }
        ]
      },
      // Index pour les projets
      {
        collection: 'projects',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' },
          { field: 'name', order: 'ASCENDING' }
        ]
      },
      {
        collection: 'projects',
        fields: [
          { field: 'tenantId', order: 'ASCENDING' },
          { field: 'assignedEmployees', order: 'ASCENDING' },
          { field: 'status', order: 'ASCENDING' }
        ]
      }
    ];

    console.log('Recommended indexes for optimal performance:', indexes);
    // Note: Les index Firestore doivent être créés via la console Firebase ou le CLI
  }

  /**
   * Optimise une requête avec pagination et cache
   */
  async optimizeQuery<T>(
    baseQuery: Query,
    options: PaginationOptions,
    cacheKey?: string
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();

    // Vérifier le cache si activé
    if (this.config.enableQueryCache && cacheKey) {
      const cached = this.getCachedResult<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Appliquer la pagination
    let query = baseQuery;
    
    if (options.sortBy) {
      query = query.orderBy(options.sortBy, options.sortOrder || 'asc');
    }

    // Limiter la taille de page
    const limit = Math.min(options.limit, this.config.maxPageSize);
    
    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    } else if (options.page > 1) {
      const offset = (options.page - 1) * limit;
      query = query.offset(offset);
    }

    query = query.limit(limit);

    // Exécuter la requête
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];

    // Calculer les métriques de pagination
    const queryTime = Date.now() - startTime;
    
    // Pour obtenir le total, nous devons faire une requête séparée (coûteuse)
    // En production, considérer l'utilisation d'un compteur maintenu séparément
    const totalSnapshot = await baseQuery.get();
    const total = totalSnapshot.size;
    const totalPages = Math.ceil(total / limit);

    const result: PaginatedResult<T> = {
      data,
      pagination: {
        page: options.page,
        limit,
        total,
        totalPages,
        hasNext: options.page < totalPages,
        hasPrevious: options.page > 1,
        nextCursor: data.length === limit ? snapshot.docs[snapshot.docs.length - 1] : undefined,
        previousCursor: options.page > 1 ? snapshot.docs[0] : undefined
      }
    };

    // Mettre en cache si activé
    if (this.config.enableQueryCache && cacheKey) {
      this.setCachedResult(cacheKey, result);
    }

    // Enregistrer les métriques de performance
    await this.recordQueryMetrics({
      queryTime,
      documentsRead: totalSnapshot.size,
      documentsReturned: data.length,
      cacheHit: false,
      indexUsed: true // Supposé optimisé
    });

    return result;
  }

  /**
   * Optimise les requêtes de feuilles de temps
   */
  async optimizeTimesheetQuery(
    tenantId: string,
    filters: {
      employeeId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    let query = collections.timesheets.where('tenantId', '==', tenantId);

    // Appliquer les filtres dans l'ordre optimal pour les index
    if (filters.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.startDate) {
      query = query.where('periodStart', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('periodEnd', '<=', filters.endDate);
    }

    const cacheKey = `timesheets_${tenantId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.limit}`;
    
    return this.optimizeQuery(query, pagination, cacheKey);
  }

  /**
   * Optimise les requêtes d'entrées de temps
   */
  async optimizeTimeEntryQuery(
    tenantId: string,
    filters: {
      employeeId?: string;
      projectId?: string;
      timesheetId?: string;
      startDate?: string;
      endDate?: string;
      billable?: boolean;
    },
    pagination: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    let query = collections.time_entries.where('tenantId', '==', tenantId);

    // Appliquer les filtres dans l'ordre optimal
    if (filters.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId);
    }

    if (filters.projectId) {
      query = query.where('projectId', '==', filters.projectId);
    }

    if (filters.timesheetId) {
      query = query.where('timesheetId', '==', filters.timesheetId);
    }

    if (filters.billable !== undefined) {
      query = query.where('billable', '==', filters.billable);
    }

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }

    const cacheKey = `time_entries_${tenantId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.limit}`;
    
    return this.optimizeQuery(query, pagination, cacheKey);
  }

  /**
   * Optimise les requêtes de projets
   */
  async optimizeProjectQuery(
    tenantId: string,
    filters: {
      status?: string;
      clientId?: string;
      assignedEmployeeId?: string;
      billable?: boolean;
    },
    pagination: PaginationOptions
  ): Promise<PaginatedResult<any>> {
    let query = collections.projects.where('tenantId', '==', tenantId);

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.clientId) {
      query = query.where('clientId', '==', filters.clientId);
    }

    if (filters.assignedEmployeeId) {
      query = query.where('assignedEmployees', 'array-contains', filters.assignedEmployeeId);
    }

    if (filters.billable !== undefined) {
      query = query.where('billable', '==', filters.billable);
    }

    const cacheKey = `projects_${tenantId}_${JSON.stringify(filters)}_${pagination.page}_${pagination.limit}`;
    
    return this.optimizeQuery(query, pagination, cacheKey);
  }

  /**
   * Analyse les performances d'une requête
   */
  async analyzeQueryPerformance(
    query: Query,
    description: string
  ): Promise<QueryPerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      const snapshot = await query.get();
      const queryTime = Date.now() - startTime;

      const metrics: QueryPerformanceMetrics = {
        queryTime,
        documentsRead: snapshot.size,
        documentsReturned: snapshot.docs.length,
        cacheHit: false,
        indexUsed: queryTime < 1000 // Heuristique simple
      };

      // Enregistrer les métriques
      await this.recordQueryMetrics(metrics, description);

      return metrics;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      
      const metrics: QueryPerformanceMetrics = {
        queryTime,
        documentsRead: 0,
        documentsReturned: 0,
        cacheHit: false,
        indexUsed: false
      };

      await this.recordQueryMetrics(metrics, `${description} (ERROR: ${error})`);
      
      throw error;
    }
  }

  /**
   * Obtient les suggestions d'optimisation pour une requête
   */
  getOptimizationSuggestions(metrics: QueryPerformanceMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.queryTime > 5000) {
      suggestions.push('Query time is very slow (>5s). Consider adding composite indexes.');
    } else if (metrics.queryTime > 1000) {
      suggestions.push('Query time is slow (>1s). Consider optimizing filters order.');
    }

    if (metrics.documentsRead > metrics.documentsReturned * 10) {
      suggestions.push('Too many documents read vs returned. Consider more selective filters.');
    }

    if (!metrics.indexUsed) {
      suggestions.push('Query may not be using indexes efficiently. Check index configuration.');
    }

    if (metrics.documentsReturned > 1000) {
      suggestions.push('Large result set. Consider implementing pagination.');
    }

    return suggestions;
  }

  /**
   * Nettoie le cache des requêtes
   */
  clearQueryCache(): void {
    this.queryCache.clear();
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
  } {
    const now = Date.now();
    let oldestTimestamp = now;
    
    for (const [, value] of this.queryCache) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
      }
    }

    return {
      size: this.queryCache.size,
      hitRate: 0, // TODO: Implémenter le tracking des hits/misses
      oldestEntry: now - oldestTimestamp
    };
  }

  // ==================== Méthodes privées ====================

  private getCachedResult<T>(key: string): PaginatedResult<T> | null {
    const cached = this.queryCache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTimeout) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult<T>(key: string, result: PaginatedResult<T>): void {
    this.queryCache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    // Nettoyer les entrées expirées
    this.cleanupExpiredCache();
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.queryCache) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.queryCache.delete(key);
      }
    }
  }

  private async recordQueryMetrics(
    metrics: QueryPerformanceMetrics,
    description?: string
  ): Promise<void> {
    try {
      await collections.query_performance.add({
        ...metrics,
        description,
        timestamp: new Date(),
        suggestions: this.getOptimizationSuggestions(metrics)
      });
    } catch (error) {
      console.error('Failed to record query metrics:', error);
    }
  }

  /**
   * Obtient les métriques de performance des requêtes
   */
  async getPerformanceMetrics(
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<Array<QueryPerformanceMetrics & { description?: string; timestamp: Date; suggestions: string[] }>> {
    try {
      let query = collections.query_performance.orderBy('timestamp', 'desc');

      if (options.startDate) {
        query = query.where('timestamp', '>=', options.startDate);
      }

      if (options.endDate) {
        query = query.where('timestamp', '<=', options.endDate);
      }

      const snapshot = await query.limit(options.limit || 100).get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return [];
    }
  }

  /**
   * Obtient un résumé des performances
   */
  async getPerformanceSummary(period: { start: Date; end: Date }): Promise<{
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    cacheHitRate: number;
    topSlowQueries: Array<{ description: string; queryTime: number }>;
  }> {
    try {
      const metrics = await this.getPerformanceMetrics({
        startDate: period.start,
        endDate: period.end,
        limit: 1000
      });

      if (metrics.length === 0) {
        return {
          averageQueryTime: 0,
          slowQueries: 0,
          totalQueries: 0,
          cacheHitRate: 0,
          topSlowQueries: []
        };
      }

      const totalQueryTime = metrics.reduce((sum, m) => sum + m.queryTime, 0);
      const averageQueryTime = totalQueryTime / metrics.length;
      const slowQueries = metrics.filter(m => m.queryTime > 1000).length;
      const cacheHits = metrics.filter(m => m.cacheHit).length;
      const cacheHitRate = (cacheHits / metrics.length) * 100;

      const topSlowQueries = metrics
        .filter(m => m.description)
        .sort((a, b) => b.queryTime - a.queryTime)
        .slice(0, 10)
        .map(m => ({
          description: m.description!,
          queryTime: m.queryTime
        }));

      return {
        averageQueryTime: Math.round(averageQueryTime),
        slowQueries,
        totalQueries: metrics.length,
        cacheHitRate: Math.round(cacheHitRate),
        topSlowQueries
      };
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      return {
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
        cacheHitRate: 0,
        topSlowQueries: []
      };
    }
  }
}export 
const databaseOptimizationService = new DatabaseOptimizationService();