/**
 * Performance Monitoring Middleware
 * Enhanced performance tracking and metrics collection
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';
import { LoggingContext } from '../types/express.types';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  timestamp: Date;
  userAgent?: string;
  ip: string;
}

const performanceMetrics: PerformanceMetrics[] = [];
const MAX_METRICS_HISTORY = 1000;

/**
 * Enhanced performance monitoring middleware
 */
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startCpuUsage = process.cpuUsage();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to headers
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Track response completion
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const endCpuUsage = process.cpuUsage(startCpuUsage);
    const memoryUsage = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      memoryUsage,
      cpuUsage: endCpuUsage,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || 'unknown'
    };

    // Store metrics (with rotation)
    performanceMetrics.push(metrics);
    if (performanceMetrics.length > MAX_METRICS_HISTORY) {
      performanceMetrics.shift();
    }

    // Log performance data
    const loggingContext: LoggingContext = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      contentLength: res.get('content-length'),
      origin: req.get('Origin'),
      corsHeaders: {
        'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
      }
    };

    // Log with appropriate level based on performance
    if (duration > 5000) { // > 5 seconds
      logger.warn('🐌 Slow request detected', loggingContext);
    } else if (duration > 1000) { // > 1 second
      logger.info('⚠️ Request completed (slow)', loggingContext);
    } else {
      logger.info('✅ Request completed', loggingContext);
    }

    // Log memory warnings
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // > 100MB
      logger.warn('🧠 High memory usage detected', {
        requestId,
        memoryUsage: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        }
      });
    }
  });

  next();
};

/**
 * Get performance statistics
 */
export const getPerformanceStats = () => {
  if (performanceMetrics.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequestRate: 0
    };
  }

  const totalRequests = performanceMetrics.length;
  const averageResponseTime = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
  const errorCount = performanceMetrics.filter(m => m.statusCode >= 400).length;
  const slowRequestCount = performanceMetrics.filter(m => m.duration > 1000).length;

  return {
    totalRequests,
    averageResponseTime: Math.round(averageResponseTime),
    errorRate: Math.round((errorCount / totalRequests) * 100),
    slowRequestRate: Math.round((slowRequestCount / totalRequests) * 100),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
};