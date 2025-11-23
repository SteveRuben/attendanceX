/**
 * Index des services d'optimisation
 */

export { cacheService } from './cache.service';
export { calculationOptimizationService } from './calculation-optimization.service';
export { databaseOptimizationService } from './database-optimization.service';

// Exports des classes pour les tests
export { CacheService, CacheMiddleware } from './cache.service';
export { CalculationOptimizationService } from './calculation-optimization.service';
export { DatabaseOptimizationService } from './database-optimization.service';

export type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheInvalidationRule
} from './cache.service';

export type {
  CalculationJob,
  IncrementalCalculationState,
  AggregationConfig,
  CalculationMetrics
} from './calculation-optimization.service';

export type {
  QueryOptimizationConfig,
  PaginationOptions,
  PaginatedResult,
  QueryPerformanceMetrics,
  OptimizedQuery
} from './database-optimization.service';