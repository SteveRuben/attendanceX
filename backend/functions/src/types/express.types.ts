/**
 * Express Request Extensions
 * Type definitions for extended Express request objects
 */

import { Request } from 'express';

export interface RequestWithId extends Request {
  headers: Request['headers'] & {
    'x-request-id'?: string;
  };
}

export interface LoggingContext {
  requestId: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  contentLength?: string;
  origin?: string;
  corsHeaders?: {
    'Access-Control-Allow-Origin'?: string;
    'Access-Control-Allow-Credentials'?: string;
  };
}

export interface ServerMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}