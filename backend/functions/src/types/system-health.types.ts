/**
 * System Health Monitoring Types
 * 
 * CRITICAL SECURITY NOTE:
 * These types are for SYSTEM-LEVEL collections that bypass tenant scoping.
 * Access must be restricted to system administrators only.
 * 
 * Collections: _system_health_checks, _system_metrics
 */

import { BaseEntity } from "../common/types/common.types";

/**
 * System Health Check Document
 * Stores temporary health check test documents
 * TTL: 1 hour (auto-cleanup via scheduled function)
 */
export interface SystemHealthCheck extends BaseEntity {
  timestamp: Date;
  test: boolean;
  environment: string;
  checkId: string;
  expiresAt: Date;
}

/**
 * System Metric Document
 * Stores system-wide performance and operational metrics
 * TTL: 30 days (configurable via cleanup function)
 */
export interface SystemMetric extends BaseEntity {
  timestamp: Date;
  metricType: SystemMetricType;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
  environment: string;
}

/**
 * System Metric Types
 * Defines the types of metrics that can be collected
 */
export enum SystemMetricType {
  API_RESPONSE_TIME = 'api_response_time',
  ERROR_RATE = 'error_rate',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  ACTIVE_CONNECTIONS = 'active_connections',
  FIRESTORE_READS = 'firestore_reads',
  FIRESTORE_WRITES = 'firestore_writes',
  FIRESTORE_DELETES = 'firestore_deletes',
  AUTH_OPERATIONS = 'auth_operations',
  FUNCTION_INVOCATIONS = 'function_invocations',
  FUNCTION_ERRORS = 'function_errors',
  CACHE_HITS = 'cache_hits',
  CACHE_MISSES = 'cache_misses',
  TENANT_COUNT = 'tenant_count',
  USER_COUNT = 'user_count',
  EVENT_COUNT = 'event_count'
}

/**
 * System Health Status Response
 * Complete health check response structure
 */
export interface SystemHealthStatus {
  status: HealthStatusType;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealthMap;
  metrics: SystemMetrics;
}

/**
 * Health Status Types
 */
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Service Health Map
 * Maps service names to their health status
 */
export interface ServiceHealthMap {
  firestore: ServiceStatus;
  auth: ServiceStatus;
  functions: ServiceStatus;
  [key: string]: ServiceStatus;
}

/**
 * Individual Service Status
 */
export interface ServiceStatus {
  status: ServiceStatusType;
  responseTime?: number;
  message?: string;
  lastCheck?: string;
}

/**
 * Service Status Types
 */
export type ServiceStatusType = 'operational' | 'degraded' | 'down';

/**
 * System Metrics Container
 * Groups different types of metrics
 */
export interface SystemMetrics {
  memory: MemoryMetrics;
  collections: CollectionMetrics;
  performance?: PerformanceMetrics;
}

/**
 * Memory Usage Metrics
 */
export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  unit: string;
}

/**
 * Collection Document Counts
 */
export interface CollectionMetrics {
  events: number;
  tenants: number;
  users: number;
  [key: string]: number;
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  avgResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  activeConnections: number;
}

/**
 * Create System Metric Request
 * Request body for recording a new metric
 */
export interface CreateSystemMetricRequest {
  metricType: SystemMetricType;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

/**
 * Update System Metric Request
 * Request body for updating an existing metric
 */
export interface UpdateSystemMetricRequest {
  value?: number;
  unit?: string;
  metadata?: Record<string, any>;
}

/**
 * System Metrics Query Parameters
 * Query parameters for filtering metrics
 */
export interface SystemMetricsQuery {
  metricType?: SystemMetricType;
  startDate?: Date;
  endDate?: Date;
  environment?: string;
  limit?: number;
  offset?: number;
}

/**
 * System Metrics Aggregation Request
 * Request for aggregated metrics over time periods
 */
export interface SystemMetricsAggregationRequest {
  metricType: SystemMetricType;
  startDate: Date;
  endDate: Date;
  interval: AggregationInterval;
  aggregationType: AggregationType;
}

/**
 * Aggregation Interval Types
 */
export enum AggregationInterval {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

/**
 * Aggregation Type
 */
export enum AggregationType {
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count'
}

/**
 * Aggregated Metric Result
 */
export interface AggregatedMetric {
  timestamp: Date;
  value: number;
  count: number;
  metricType: SystemMetricType;
}

/**
 * System Health Check Configuration
 */
export interface SystemHealthCheckConfig {
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  cleanupIntervalHours: number;
}

/**
 * System Metrics Cleanup Configuration
 */
export interface SystemMetricsCleanupConfig {
  retentionDays: number;
  batchSize: number;
  cleanupIntervalHours: number;
}

/**
 * Firestore Error Interface
 * Type-safe error handling for Firestore operations
 */
export interface FirestoreError extends Error {
  code?: number | string;
  message: string;
}

/**
 * System Admin User
 * User with system-level administrative privileges
 */
export interface SystemAdminUser {
  uid: string;
  email: string;
  displayName?: string;
  grantedAt: Date;
  grantedBy: string;
  permissions: SystemAdminPermission[];
}

/**
 * System Admin Permissions
 */
export enum SystemAdminPermission {
  VIEW_HEALTH = 'view_health',
  VIEW_METRICS = 'view_metrics',
  RECORD_METRICS = 'record_metrics',
  MANAGE_CLEANUP = 'manage_cleanup',
  MANAGE_ADMINS = 'manage_admins',
  VIEW_AUDIT_LOGS = 'view_audit_logs'
}

/**
 * System Audit Log Entry
 * Logs all system-level operations for security audit
 */
export interface SystemAuditLog extends BaseEntity {
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: SystemAuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * System Audit Actions
 */
export enum SystemAuditAction {
  HEALTH_CHECK = 'health_check',
  RECORD_METRIC = 'record_metric',
  QUERY_METRICS = 'query_metrics',
  CLEANUP_HEALTH_CHECKS = 'cleanup_health_checks',
  CLEANUP_METRICS = 'cleanup_metrics',
  GRANT_ADMIN = 'grant_admin',
  REVOKE_ADMIN = 'revoke_admin',
  VIEW_AUDIT_LOGS = 'view_audit_logs'
}

/**
 * System Alert Configuration
 */
export interface SystemAlert extends BaseEntity {
  name: string;
  description: string;
  metricType: SystemMetricType;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
  notificationChannels: NotificationChannel[];
}

/**
 * Alert Conditions
 */
export enum AlertCondition {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals'
}

/**
 * Notification Channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms'
}

/**
 * System Health Dashboard Data
 * Aggregated data for system health dashboard
 */
export interface SystemHealthDashboard {
  overallStatus: HealthStatusType;
  services: ServiceHealthMap;
  recentMetrics: SystemMetric[];
  alerts: SystemAlert[];
  trends: MetricTrend[];
  lastUpdated: Date;
}

/**
 * Metric Trend
 * Trend analysis for a specific metric
 */
export interface MetricTrend {
  metricType: SystemMetricType;
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * System Health Report
 * Comprehensive health report for a time period
 */
export interface SystemHealthReport {
  reportId: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  overallHealth: HealthStatusType;
  uptimePercentage: number;
  incidents: HealthIncident[];
  metricsSummary: MetricsSummary;
  recommendations: string[];
}

/**
 * Health Incident
 * Record of a health issue or outage
 */
export interface HealthIncident {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  service: string;
  description: string;
  duration?: number;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Metrics Summary
 * Statistical summary of metrics over a period
 */
export interface MetricsSummary {
  [key: string]: {
    avg: number;
    min: number;
    max: number;
    count: number;
    unit: string;
  };
}
