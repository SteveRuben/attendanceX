import { Request } from 'express';
import { TenantContext, TenantRole } from '../common/types';

/**
 * Types pour les middlewares
 */

export interface AuthenticatedRequest extends Request {
  // Tenant context
  tenantContext?: TenantContext;
  tenantRole?: TenantRole;
  employee?: any; // Données de l'employé ajoutées par validateEmployeeMiddleware
  clockingAttempt?: ClockingAttempt;
  locationSuspicious?: boolean;
  featureRestrictions?: Record<string, boolean>;
  usageLimits?: Record<string, {
    exceeded: boolean;
    currentUsage: number;
    limit: number;
    percentage: number;
  }>;

}


export interface ClockingAttempt {
  employeeId: string;
  userId: string;
  ip: string;
  timestamp: Date;
  action: 'clock-in' | 'clock-out';
  success: boolean;
  deviceFingerprint?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  timestamp?: Date;
}

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  ip: string;
  hash: string;
}

export interface AuditLogData {
  userId?: string;
  employeeId?: string;
  action: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  success: boolean;
  statusCode: number;
  duration: number;
  timestamp: string;
  location?: LocationData & { suspicious?: boolean };
  deviceFingerprint?: string;
  sensitive?: boolean;
}

export interface SuspiciousPattern {
  type: 'RAPID_ATTEMPTS' | 'MULTIPLE_IPS' | 'MULTIPLE_DEVICES' | 'UNUSUAL_HOURS';
  description: string;
  severity: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface RateLimitInfo {
  totalHits: number;
  totalRequests: number;
  resetTime: Date;
  remainingPoints?: number;
}

export interface MiddlewareConfig {
  environment: 'development' | 'production' | 'test';
  enableLogging: boolean;
  enableRateLimit: boolean;
  enableSecurity: boolean;
  trustedIPs: string[];
  corsOrigins: string[];
}

export type MiddlewareFunction = (req: AuthenticatedRequest, res: any, next: any) => void | Promise<void>;

export type ConditionalMiddleware = (
  condition: (req: AuthenticatedRequest) => boolean,
  middleware: MiddlewareFunction
) => MiddlewareFunction;

export type MiddlewarePreset = MiddlewareFunction[];

export interface MiddlewareUtils {
  combine: (...middlewares: MiddlewareFunction[]) => MiddlewareFunction;
  conditional: ConditionalMiddleware;
  withTimeout: (middleware: MiddlewareFunction, timeoutMs?: number) => MiddlewareFunction;
}