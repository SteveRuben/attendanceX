/**
 * Service de cache intelligent pour les feuilles de temps
 */
import { collections } from '../../config/database';

export interface CacheConfig {
  defaultTTL: number; // Time to live en millisecondes
  maxSize: number; // Taille maximale du cache
  enableDistributedCache: boolean;
  enableInMemoryCache: boolean;
  compressionEnabled: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
}

export interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  dependencies: string[];
}

export class CacheService {
  private inMemoryCache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
    evictions: 0
  };
  // @ts-ignore
  private invalidationRules: CacheInvalidationRule[] = [];

  constructor(
    private config: CacheConfig = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      enableDistributedCache: false,
      enableInMemoryCache: true,
      compressionEnabled: false
    }
  ) {
    this.setupInvalidationRules();
    this.startCleanupTimer();
  }

  /**
   * Cache des projets avec invalidation intelligente
   */
  async cacheProjects(tenantId: string): Promise<any[]> {
    const cacheKey = `projects:${tenantId}`;

    // Vérifier le cache
    const cached = await this.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    // Récupérer depuis la base de données
    const snapshot = await collections.projects
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('name')
      .get();

    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Mettre en cache avec TTL long (les projets changent peu)
    await this.set(cacheKey, projects, 30 * 60 * 1000); // 30 minutes

    return projects;
  }

  /**
   * Cache des codes d'activité avec hiérarchie
   */
  async cacheActivityCodes(tenantId: string): Promise<any[]> {
    const cacheKey = `activity_codes:${tenantId}`;

    const cached = await this.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const snapshot = await collections.activity_codes
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('category')
      .orderBy('name')
      .get();

    const activityCodes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Organiser en hiérarchie pour un accès plus rapide
    const hierarchicalCodes = this.organizeActivityCodesHierarchy(activityCodes);

    await this.set(cacheKey, hierarchicalCodes, 20 * 60 * 1000); // 20 minutes

    return hierarchicalCodes;
  }

  /**
   * Cache des totaux de feuilles de temps
   */
  async cacheTimesheetTotals(timesheetId: string, tenantId: string): Promise<any> {
    const cacheKey = `timesheet_totals:${timesheetId}`;

    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculer les totaux
    const totals = await this.calculateTimesheetTotals(timesheetId, tenantId);

    // Cache avec TTL court car les totaux peuvent changer fréquemment
    await this.set(cacheKey, totals, 2 * 60 * 1000); // 2 minutes

    return totals;
  }

  /**
   * Cache des rapports fréquents
   */
  async cacheFrequentReports(
    reportType: string,
    tenantId: string,
    filters: any,
    generator: () => Promise<any>
  ): Promise<any> {
    const cacheKey = `report:${reportType}:${tenantId}:${this.hashFilters(filters)}`;

    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Générer le rapport
    const report = await generator();

    // Cache avec TTL moyen pour les rapports
    await this.set(cacheKey, report, 10 * 60 * 1000); // 10 minutes

    return report;
  }

  /**
   * Cache des employés actifs
   */
  async cacheActiveEmployees(tenantId: string): Promise<any[]> {
    const cacheKey = `employees:active:${tenantId}`;

    const cached = await this.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    const snapshot = await collections.employees
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .orderBy('lastName')
      .orderBy('firstName')
      .get();

    const employees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    await this.set(cacheKey, employees, 15 * 60 * 1000); // 15 minutes

    return employees;
  }

  /**
   * Cache des paramètres d'organisation
   */
  async cacheOrganizationSettings(tenantId: string): Promise<any> {
    const cacheKey = `org_settings:${tenantId}`;

    const cached = await this.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const doc = await collections.organizations
      .doc(tenantId)
      .get();

    const settings = doc.exists ? doc.data() : {};

    // Cache long pour les paramètres (changent rarement)
    await this.set(cacheKey, settings, 60 * 60 * 1000); // 1 heure

    return settings;
  }

  /**
   * Invalidation intelligente du cache
   */
  async invalidateCache(pattern: string, reason?: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    // Rechercher les clés correspondant au pattern
    for (const key of this.inMemoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToInvalidate.push(key);
      }
    }

    // Invalider les clés
    for (const key of keysToInvalidate) {
      this.inMemoryCache.delete(key);
    }

    console.log(`Cache invalidated: ${keysToInvalidate.length} keys for pattern "${pattern}"${reason ? ` (${reason})` : ''}`);
  }

  /**
   * Invalidation basée sur les événements
   */
  async invalidateOnEvent(eventType: string, entityId: string, tenantId: string): Promise<void> {
    const invalidationMap: Record<string, string[]> = {
      'timesheet_updated': [
        `timesheet_totals:${entityId}`,
        `report:*:${tenantId}:*`
      ],
      'time_entry_created': [
        `timesheet_totals:*`,
        `report:*:${tenantId}:*`
      ],
      'time_entry_updated': [
        `timesheet_totals:*`,
        `report:*:${tenantId}:*`
      ],
      'time_entry_deleted': [
        `timesheet_totals:*`,
        `report:*:${tenantId}:*`
      ],
      'project_updated': [
        `projects:${tenantId}`,
        `report:project:${tenantId}:*`
      ],
      'activity_code_updated': [
        `activity_codes:${tenantId}`,
        `report:*:${tenantId}:*`
      ],
      'employee_updated': [
        `employees:active:${tenantId}`,
        `report:employee:${tenantId}:*`
      ],
      'organization_settings_updated': [
        `org_settings:${tenantId}`
      ]
    };

    const patterns = invalidationMap[eventType] || [];
    for (const pattern of patterns) {
      await this.invalidateCache(pattern, eventType);
    }
  }

  /**
   * Pré-chargement du cache
   */
  async preloadCache(tenantId: string): Promise<void> {
    console.log(`Preloading cache for tenant: ${tenantId}`);

    // Pré-charger les données fréquemment utilisées
    const preloadTasks = [
      this.cacheProjects(tenantId),
      this.cacheActivityCodes(tenantId),
      this.cacheActiveEmployees(tenantId),
      this.cacheOrganizationSettings(tenantId)
    ];

    await Promise.allSettled(preloadTasks);
    console.log(`Cache preloaded for tenant: ${tenantId}`);
  }

  /**
   * Réchauffement du cache basé sur l'utilisation
   */
  async warmupCache(tenantId: string, usagePatterns: any[]): Promise<void> {
    for (const pattern of usagePatterns) {
      try {
        switch (pattern.type) {
          case 'employee_timesheets':
            // Pré-charger les feuilles de temps des employés actifs
            const employees = await this.cacheActiveEmployees(tenantId);
            // @ts-ignore
            for (const employee of employees.slice(0, 10)) { // Top 10 employés
              // Logique de pré-chargement des feuilles de temps
            }
            break;

          case 'project_reports':
            // Pré-charger les rapports de projets populaires
            const projects = await this.cacheProjects(tenantId);
            // @ts-ignore
            for (const project of projects.slice(0, 5)) { // Top 5 projets
              // Logique de pré-chargement des rapports
            }
            break;
        }
      } catch (error) {
        console.error(`Error warming up cache for pattern ${pattern.type}:`, error);
      }
    }
  }

  /**
   * Opérations de cache de base
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enableInMemoryCache) {
      return null;
    }

    const entry = this.inMemoryCache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.inMemoryCache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Mettre à jour les statistiques d'accès
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enableInMemoryCache) {
      return;
    }

    const actualTTL = ttl || this.config.defaultTTL;
    const size = this.calculateSize(data);

    // Vérifier la taille du cache
    if (this.inMemoryCache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };

    this.inMemoryCache.set(key, entry);
    this.updateStats();
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.inMemoryCache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.inMemoryCache.clear();
    this.resetStats();
  }

  /**
   * Statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Nettoyage des entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.inMemoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
      this.updateStats();
    }
  }

  // Méthodes privées

  private setupInvalidationRules(): void {
    this.invalidationRules = [
      {
        pattern: 'timesheet_totals:*',
        triggers: ['time_entry_created', 'time_entry_updated', 'time_entry_deleted'],
        dependencies: ['timesheets', 'time_entries']
      },
      {
        pattern: 'projects:*',
        triggers: ['project_created', 'project_updated', 'project_deleted'],
        dependencies: ['projects']
      },
      {
        pattern: 'activity_codes:*',
        triggers: ['activity_code_created', 'activity_code_updated', 'activity_code_deleted'],
        dependencies: ['activity_codes']
      },
      {
        pattern: 'report:*',
        triggers: ['time_entry_created', 'time_entry_updated', 'timesheet_updated'],
        dependencies: ['timesheets', 'time_entries', 'projects']
      }
    ];
  }

  private startCleanupTimer(): void {
    // Nettoyage toutes les 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private async calculateTimesheetTotals(timesheetId: string, tenantId: string): Promise<any> {
    const snapshot = await collections.time_entries
      .where('timesheetId', '==', timesheetId)
      .where('tenantId', '==', tenantId)
      .get();

    let totalHours = 0;
    let billableHours = 0;
    let totalCost = 0;

    for (const doc of snapshot.docs) {
      const entry = doc.data();
      const hours = entry.duration / 60;

      totalHours += hours;
      totalCost += entry.totalCost || 0;

      if (entry.billable) {
        billableHours += hours;
      }
    }

    return {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      totalCost,
      entriesCount: snapshot.size
    };
  }

  private organizeActivityCodesHierarchy(activityCodes: any[]): any {
    const hierarchy: Record<string, any[]> = {};

    for (const code of activityCodes) {
      const category = code.category || 'Uncategorized';
      if (!hierarchy[category]) {
        hierarchy[category] = [];
      }
      hierarchy[category].push(code);
    }

    return hierarchy;
  }

  private hashFilters(filters: any): string {
    return Buffer.from(JSON.stringify(filters)).toString('base64').substring(0, 16);
  }

  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    }
    return key === pattern;
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.inMemoryCache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateStats(): void {
    this.stats.size = this.inMemoryCache.size;
    this.stats.memoryUsage = Array.from(this.inMemoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
      evictions: 0
    };
  }
}

/**
 * Décorateur pour la mise en cache automatique
 */
export function Cacheable(ttl?: number, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService as CacheService;
      if (!cacheService) {
        return method.apply(this, args);
      }

      const key = keyGenerator ? keyGenerator(...args) : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      const cached = await cacheService.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await method.apply(this, args);
      await cacheService.set(key, result, ttl);

      return result;
    };
  };
}

/**
 * Middleware de cache pour les routes Express
 */
export class CacheMiddleware {
  constructor(private cacheService: CacheService) { }

  /**
   * Middleware de cache pour les réponses HTTP
   */
  cacheResponse(ttl: number = 5 * 60 * 1000) {
    return (req: any, res: any, next: any) => {
      const key = `http:${req.method}:${req.path}:${JSON.stringify(req.query)}`;

      this.cacheService.get(key).then(cached => {
        if (cached) {
          return res.json(cached);
        }

        // Intercepter la réponse
        const originalJson = res.json;
        res.json = function (data: any) {
          // Mettre en cache la réponse
          if (res.statusCode === 200) {
            this.cacheService.set(key, data, ttl);
          }
          return originalJson.call(this, data);
        }.bind(this);

        next();
      }).catch(next);
    };
  }

  /**
   * Middleware d'invalidation de cache
   */
  invalidateOnUpdate() {
    return (req: any, res: any, next: any) => {
      const originalJson = res.json;

      res.json = function (data: any) {
        // Invalider le cache après une modification réussie
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const entityType = req.path.split('/')[1]; // Extraire le type d'entité
          this.cacheService.invalidateOnEvent(`${entityType}_updated`, req.params.id, req.tenantId);
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }
}

export const cacheService = new CacheService();