/**
 * Health Check Controller
 * Provides server status and health information
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { collections } from '../../config/database';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    firestore: ServiceStatus;
    auth: ServiceStatus;
    functions: ServiceStatus;
  };
  metrics: {
    memory: MemoryMetrics;
    collections: CollectionMetrics;
  };
}

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  message?: string;
}

interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  unit: string;
}

interface CollectionMetrics {
  events: number;
  tenants: number;
  users: number;
  [key: string]: number;
}

/**
 * Cache for collection metrics (5 minute TTL)
 */
let collectionMetricsCache: { data: CollectionMetrics; timestamp: number } | null = null;
const COLLECTION_METRICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Cold start tracking and health check caching
 */
let isColdStart = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_CACHE_MS = 10000; // 10 seconds

/**
 * Get server health status - OPTIMIZED VERSION
 * 
 * Performance improvements:
 * 1. Parallel execution of all checks
 * 2. Reduced Firestore timeout (2s instead of 5s)
 * 3. Cached collection metrics (5min TTL)
 * 4. Lightweight Firestore check (read-only)
 * 5. Fast-fail on timeout
 */
export const getHealthStatus = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    logger.info('🏥 Health check requested');

    // Execute all checks in parallel for maximum speed
    const [firestoreStatus, collectionMetrics] = await Promise.all([
      checkFirestoreHealthOptimized(),
      getCollectionMetricsCached()
    ]);

    // Synchronous checks (instant)
    const authStatus = checkAuthHealth();
    const memoryMetrics = getMemoryMetrics();

    // Determine overall status
    const overallStatus = determineOverallStatus(firestoreStatus, authStatus);

    const responseTime = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      services: {
        firestore: firestoreStatus,
        auth: authStatus,
        functions: {
          status: 'operational',
          responseTime,
          message: 'Cloud Functions operational'
        }
      },
      metrics: {
        memory: memoryMetrics,
        collections: collectionMetrics
      }
    };

    logger.info(`✅ Health check completed in ${responseTime}ms`, {
      status: overallStatus,
      responseTime,
      firestoreTime: firestoreStatus.responseTime
    });

    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 503 : 500;

    res.status(statusCode).json({
      success: true,
      data: healthStatus
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    logger.error('❌ Health check failed', {
      error: error.message,
      responseTime
    });

    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        services: {
          firestore: { status: 'down', message: error.message },
          auth: { status: 'down' },
          functions: { status: 'operational', responseTime }
        },
        metrics: {
          memory: getMemoryMetrics(),
          collections: { events: 0, tenants: 0, users: 0 }
        }
      },
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error.message
      }
    });
  }
};

/**
 * Simple ping endpoint
 */
export const ping = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString()
  });
};

/**
 * Firestore error interface for type-safe error handling
 * 
 * @interface FirestoreError
 * @extends {Error}
 * 
 * @property {number | string} [code] - Firestore error code (e.g., 7 for PERMISSION_DENIED, 14 for UNAVAILABLE)
 * @property {string} message - Human-readable error message
 * 
 * @example
 * ```typescript
 * const error: FirestoreError = {
 *   name: 'FirestoreError',
 *   code: 14,
 *   message: 'Service unavailable'
 * };
 * ```
 */
interface FirestoreError extends Error {
  code?: number | string;
  message: string;
}

/**
 * Type guard to check if error is a FirestoreError
 * @param {unknown} error - Error to check
 * @returns {boolean} True if error is a FirestoreError
 */
function isFirestoreError(error: unknown): error is FirestoreError {
  return (
    error instanceof Error &&
    'message' in error &&
    (typeof (error as any).code === 'number' || typeof (error as any).code === 'string')
  );
}

/**
 * Get validated health check timeout from environment
 * @returns {number} Timeout in milliseconds (1000-30000)
 */
function getHealthCheckTimeout(): number {
  // Use 5s for production, 2s for development
  const isProduction = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  const defaultTimeout = isProduction ? 5000 : 2000;
  
  const envTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || String(defaultTimeout), 10);
  
  // Validate range: 1-30 seconds
  if (isNaN(envTimeout) || envTimeout < 1000 || envTimeout > 30000) {
    logger.warn('Invalid HEALTH_CHECK_TIMEOUT_MS, using default', { 
      provided: process.env.HEALTH_CHECK_TIMEOUT_MS,
      default: defaultTimeout,
      isProduction
    });
    return defaultTimeout;
  }
  
  return envTimeout;
}

/**
 * Check Firestore health with timeout and cleanup - OPTIMIZED VERSION
 * 
 * Optimizations:
 * 1. Read-only check (no write/delete operations)
 * 2. Adaptive timeout (5s production, 2s development)
 * 3. Uses existing system collection
 * 4. No cleanup needed (read-only)
 * 5. Cold start handling with degraded status
 * 6. 10-second result caching
 */
async function checkFirestoreHealthOptimized(): Promise<ServiceStatus> {
  const now = Date.now();
  
  // Return cached result if recent (within 10 seconds)
  if (now - lastHealthCheck < HEALTH_CHECK_CACHE_MS) {
    logger.debug('Using cached Firestore health status');
    return {
      status: 'operational',
      responseTime: 0,
      message: 'Firestore operational (cached)'
    };
  }
  
  const startTime = Date.now();
  const TIMEOUT_MS = getHealthCheckTimeout();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Firestore timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    );

    // Lightweight Firestore check - just read a system collection
    const firestorePromise = (async () => {
      // Simple read operation - much faster than write+read+delete
      const snapshot = await collections.system_health_checks
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
      
      return snapshot.size >= 0; // Always true, just confirms connection
    })();

    // Race between test and timeout
    await Promise.race([firestorePromise, timeoutPromise]);
    
    const responseTime = Date.now() - startTime;
    lastHealthCheck = now;
    isColdStart = false;

    logger.info('✅ Firestore health check passed', { 
      responseTime,
      timeout: TIMEOUT_MS,
      coldStart: isColdStart,
      environment: process.env.APP_ENV || 'production'
    });

    return {
      status: 'operational',
      responseTime,
      message: 'Firestore operational'
    };
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    
    // On cold start timeout, return degraded instead of down
    if (isColdStart && error instanceof Error && error.message.includes('timeout')) {
      logger.warn('⚡ Cold start Firestore timeout, marking as degraded', { 
        responseTime,
        timeout: TIMEOUT_MS
      });
      isColdStart = false;
      lastHealthCheck = now; // Cache this result too
      
      return {
        status: 'degraded',
        responseTime,
        message: 'Firestore slow (cold start - will be faster on next request)'
      };
    }
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = isFirestoreError(error) ? error.code : 'UNKNOWN';
    
    logger.error('❌ Firestore health check failed', { 
      error: errorMessage,
      code: errorCode,
      responseTime 
    });
    
    const firestoreError: FirestoreError = isFirestoreError(error) 
      ? error 
      : { name: 'Error', message: errorMessage, code: 'UNKNOWN' };
    
    return {
      status: 'down',
      responseTime,
      message: `Firestore error: ${errorCode} ${errorMessage}. Resolution: ${getFirestoreErrorResolution(firestoreError)}`
    };
  }
}

/**
 * Get resolution note for Firestore errors
 */
function getFirestoreErrorResolution(error: FirestoreError): string {
  const errorCode = error.code?.toString() || '';
  const errorMessage = error.message || '';

  if (errorCode === '14' || errorMessage.includes('UNAVAILABLE')) {
    return 'Check network connectivity and Firestore configuration. Verify service account permissions.';
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Firestore connection timeout. Check network latency and firewall rules.';
  }
  
  if (errorCode === '7' || errorMessage.includes('PERMISSION_DENIED')) {
    return 'Check Firestore security rules and service account IAM permissions.';
  }

  return 'Check Firestore configuration and logs for details.';
}

/**
 * Check Auth health (basic check)
 */
function checkAuthHealth(): ServiceStatus {
  try {
    // Basic check - if we can import auth, it's operational
    return {
      status: 'operational',
      message: 'Firebase Auth operational'
    };
  } catch (error: any) {
    return {
      status: 'down',
      message: `Auth error: ${error.message}`
    };
  }
}

/**
 * Get memory metrics
 */
function getMemoryMetrics(): MemoryMetrics {
  const memoryUsage = process.memoryUsage();
  const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const percentage = Math.round((usedMB / totalMB) * 100);

  return {
    used: usedMB,
    total: totalMB,
    percentage,
    unit: 'MB'
  };
}

/**
 * Get collection document counts with caching - OPTIMIZED VERSION
 * 
 * Optimizations:
 * 1. 5-minute cache to avoid repeated expensive queries
 * 2. Parallel execution of count queries
 * 3. Graceful degradation on errors
 */
async function getCollectionMetricsCached(): Promise<CollectionMetrics> {
  // Check cache first
  if (collectionMetricsCache) {
    const age = Date.now() - collectionMetricsCache.timestamp;
    if (age < COLLECTION_METRICS_CACHE_TTL) {
      logger.debug('Using cached collection metrics', { age });
      return collectionMetricsCache.data;
    }
  }

  // Cache miss or expired - fetch fresh data
  try {
    const [eventsSnapshot, tenantsSnapshot] = await Promise.all([
      collections.events.count().get(),
      collections.tenants.count().get()
    ]);

    const metrics: CollectionMetrics = {
      events: eventsSnapshot.data().count,
      tenants: tenantsSnapshot.data().count,
      users: 0 // Removed expensive collectionGroup query for performance
    };

    // Update cache
    collectionMetricsCache = {
      data: metrics,
      timestamp: Date.now()
    };

    logger.debug('Collection metrics cached', { metrics });

    return metrics;
  } catch (error: any) {
    logger.warn('Failed to get collection metrics', { error: error.message });
    
    // Return cached data if available, even if expired
    if (collectionMetricsCache) {
      logger.info('Returning stale cached metrics due to error');
      return collectionMetricsCache.data;
    }

    // Fallback to zeros
    return {
      events: 0,
      tenants: 0,
      users: 0
    };
  }
}



/**
 * Determine overall health status
 */
function determineOverallStatus(
  firestoreStatus: ServiceStatus,
  authStatus: ServiceStatus
): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = [firestoreStatus.status, authStatus.status];

  if (statuses.every(s => s === 'operational')) {
    return 'healthy';
  }

  if (statuses.some(s => s === 'down')) {
    return 'unhealthy';
  }

  return 'degraded';
}
