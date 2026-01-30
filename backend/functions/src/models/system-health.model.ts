/**
 * System Health Monitoring Models
 * 
 * CRITICAL SECURITY NOTE:
 * These models handle SYSTEM-LEVEL data that bypasses tenant scoping.
 * All operations must be restricted to system administrators.
 * 
 * Collections: _system_health_checks, _system_metrics
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import {
  SystemHealthCheck,
  SystemMetric,
  SystemMetricType,
  CreateSystemMetricRequest,
  SystemAuditLog,
  SystemAuditAction,
  SystemAlert,
  AlertCondition,
  NotificationChannel
} from "../types/system-health.types";

/**
 * System Health Check Model
 * Handles validation and persistence of health check test documents
 */
export class SystemHealthCheckModel extends BaseModel<SystemHealthCheck> {
  constructor(data: Partial<SystemHealthCheck>) {
    super(data);
  }

  /**
   * Validate health check data
   */
  async validate(): Promise<boolean> {
    const check = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(check, [
      'timestamp',
      'checkId',
      'environment',
      'test',
      'expiresAt'
    ]);

    // Validation de l'environnement
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(check.environment)) {
      throw new Error(`Invalid environment: ${check.environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }

    // Validation du checkId format
    if (!check.checkId || !/^health_\d+_[a-z0-9]+$/.test(check.checkId)) {
      throw new Error('Invalid checkId format. Expected: health_<timestamp>_<random>');
    }

    // Validation des dates
    if (!(check.timestamp instanceof Date) || isNaN(check.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    if (!(check.expiresAt instanceof Date) || isNaN(check.expiresAt.getTime())) {
      throw new Error('Invalid expiresAt date');
    }

    // Validation que expiresAt est dans le futur
    if (check.expiresAt <= check.timestamp) {
      throw new Error('expiresAt must be after timestamp');
    }

    return true;
  }

  /**
   * Convert to Firestore format
   */
  toFirestore(): Record<string, any> {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Create from Firestore document
   */
  static fromFirestore(doc: DocumentSnapshot): SystemHealthCheckModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemHealthCheckModel.prototype.convertDatesFromFirestore(data);

    return new SystemHealthCheckModel({
      id: doc.id,
      ...convertedData,
    });
  }

  /**
   * Create a new health check document
   */
  static createHealthCheck(checkId: string, environment: string): SystemHealthCheckModel {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600000); // 1 hour from now

    return new SystemHealthCheckModel({
      timestamp: now,
      test: true,
      environment,
      checkId,
      expiresAt
    });
  }
}

/**
 * System Metric Model
 * Handles validation and persistence of system metrics
 */
export class SystemMetricModel extends BaseModel<SystemMetric> {
  constructor(data: Partial<SystemMetric>) {
    super(data);
  }

  /**
   * Validate metric data
   */
  async validate(): Promise<boolean> {
    const metric = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(metric, [
      'timestamp',
      'metricType',
      'value',
      'unit',
      'environment'
    ]);

    // Validation du type de métrique
    if (!Object.values(SystemMetricType).includes(metric.metricType)) {
      throw new Error(
        `Invalid metric type: ${metric.metricType}. Must be one of: ${Object.values(SystemMetricType).join(', ')}`
      );
    }

    // Validation de la valeur
    if (typeof metric.value !== 'number' || isNaN(metric.value)) {
      throw new Error('Metric value must be a valid number');
    }

    // Validation que la valeur n'est pas négative pour certains types
    const nonNegativeMetrics = [
      SystemMetricType.API_RESPONSE_TIME,
      SystemMetricType.MEMORY_USAGE,
      SystemMetricType.CPU_USAGE,
      SystemMetricType.ACTIVE_CONNECTIONS,
      SystemMetricType.FIRESTORE_READS,
      SystemMetricType.FIRESTORE_WRITES,
      SystemMetricType.FIRESTORE_DELETES,
      SystemMetricType.TENANT_COUNT,
      SystemMetricType.USER_COUNT,
      SystemMetricType.EVENT_COUNT
    ];

    if (nonNegativeMetrics.includes(metric.metricType) && metric.value < 0) {
      throw new Error(`Metric value cannot be negative for type: ${metric.metricType}`);
    }

    // Validation de l'unité
    if (!metric.unit || metric.unit.trim().length === 0) {
      throw new Error('Metric unit is required');
    }

    // Validation de l'environnement
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(metric.environment)) {
      throw new Error(`Invalid environment: ${metric.environment}. Must be one of: ${validEnvironments.join(', ')}`);
    }

    // Validation de la date
    if (!(metric.timestamp instanceof Date) || isNaN(metric.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    // Validation des metadata si présentes
    if (metric.metadata) {
      if (typeof metric.metadata !== 'object' || Array.isArray(metric.metadata)) {
        throw new Error('Metadata must be an object');
      }
    }

    return true;
  }

  /**
   * Convert to Firestore format
   */
  toFirestore(): Record<string, any> {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Create from Firestore document
   */
  static fromFirestore(doc: DocumentSnapshot): SystemMetricModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemMetricModel.prototype.convertDatesFromFirestore(data);

    return new SystemMetricModel({
      id: doc.id,
      ...convertedData,
    });
  }

  /**
   * Create from API request
   */
  static fromCreateRequest(
    request: CreateSystemMetricRequest,
    environment?: string
  ): SystemMetricModel {
    const metricData = {
      ...request,
      timestamp: new Date(),
      environment: environment || process.env.APP_ENV || 'production',
    };

    return new SystemMetricModel(metricData);
  }

  /**
   * Validate unit for metric type
   */
  private static getExpectedUnit(metricType: SystemMetricType): string[] {
    const unitMap: Record<SystemMetricType, string[]> = {
      [SystemMetricType.API_RESPONSE_TIME]: ['ms', 'milliseconds', 's', 'seconds'],
      [SystemMetricType.ERROR_RATE]: ['%', 'percentage', 'count'],
      [SystemMetricType.MEMORY_USAGE]: ['MB', 'GB', 'bytes', '%', 'percentage'],
      [SystemMetricType.CPU_USAGE]: ['%', 'percentage'],
      [SystemMetricType.ACTIVE_CONNECTIONS]: ['count', 'connections'],
      [SystemMetricType.FIRESTORE_READS]: ['count', 'operations'],
      [SystemMetricType.FIRESTORE_WRITES]: ['count', 'operations'],
      [SystemMetricType.FIRESTORE_DELETES]: ['count', 'operations'],
      [SystemMetricType.AUTH_OPERATIONS]: ['count', 'operations'],
      [SystemMetricType.FUNCTION_INVOCATIONS]: ['count', 'invocations'],
      [SystemMetricType.FUNCTION_ERRORS]: ['count', 'errors'],
      [SystemMetricType.CACHE_HITS]: ['count', 'hits'],
      [SystemMetricType.CACHE_MISSES]: ['count', 'misses'],
      [SystemMetricType.TENANT_COUNT]: ['count', 'tenants'],
      [SystemMetricType.USER_COUNT]: ['count', 'users'],
      [SystemMetricType.EVENT_COUNT]: ['count', 'events']
    };

    return unitMap[metricType] || ['count'];
  }
}

/**
 * System Audit Log Model
 * Handles validation and persistence of system audit logs
 */
export class SystemAuditLogModel extends BaseModel<SystemAuditLog> {
  constructor(data: Partial<SystemAuditLog>) {
    super(data);
  }

  /**
   * Validate audit log data
   */
  async validate(): Promise<boolean> {
    const log = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(log, [
      'timestamp',
      'userId',
      'userEmail',
      'action',
      'resource',
      'success'
    ]);

    // Validation de l'action
    if (!Object.values(SystemAuditAction).includes(log.action)) {
      throw new Error(
        `Invalid audit action: ${log.action}. Must be one of: ${Object.values(SystemAuditAction).join(', ')}`
      );
    }

    // Validation de l'email
    if (!this.isValidEmail(log.userEmail)) {
      throw new Error('Invalid user email format');
    }

    // Validation de la date
    if (!(log.timestamp instanceof Date) || isNaN(log.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    return true;
  }

  /**
   * Convert to Firestore format
   */
  toFirestore(): Record<string, any> {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Create from Firestore document
   */
  static fromFirestore(doc: DocumentSnapshot): SystemAuditLogModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemAuditLogModel.prototype.convertDatesFromFirestore(data);

    return new SystemAuditLogModel({
      id: doc.id,
      ...convertedData,
    });
  }

  /**
   * Create audit log entry
   */
  static createAuditLog(
    userId: string,
    userEmail: string,
    action: SystemAuditAction,
    resource: string,
    success: boolean,
    options?: {
      resourceId?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      errorMessage?: string;
    }
  ): SystemAuditLogModel {
    return new SystemAuditLogModel({
      timestamp: new Date(),
      userId,
      userEmail,
      action,
      resource,
      success,
      ...options
    });
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * System Alert Model
 * Handles validation and persistence of system alerts
 */
export class SystemAlertModel extends BaseModel<SystemAlert> {
  constructor(data: Partial<SystemAlert>) {
    super(data);
  }

  /**
   * Validate alert data
   */
  async validate(): Promise<boolean> {
    const alert = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(alert, [
      'name',
      'description',
      'metricType',
      'condition',
      'threshold',
      'enabled',
      'notificationChannels',
      'createdAt',
      'updatedAt'
    ]);

    // Validation du nom
    this.validateLength(alert.name, 2, 100, 'name');

    // Validation du type de métrique
    if (!Object.values(SystemMetricType).includes(alert.metricType)) {
      throw new Error(`Invalid metric type: ${alert.metricType}`);
    }

    // Validation de la condition
    if (!Object.values(AlertCondition).includes(alert.condition)) {
      throw new Error(`Invalid alert condition: ${alert.condition}`);
    }

    // Validation du seuil
    if (typeof alert.threshold !== 'number' || isNaN(alert.threshold)) {
      throw new Error('Alert threshold must be a valid number');
    }

    // Validation des canaux de notification
    if (!Array.isArray(alert.notificationChannels) || alert.notificationChannels.length === 0) {
      throw new Error('At least one notification channel is required');
    }

    for (const channel of alert.notificationChannels) {
      if (!Object.values(NotificationChannel).includes(channel)) {
        throw new Error(`Invalid notification channel: ${channel}`);
      }
    }

    return true;
  }

  /**
   * Convert to Firestore format
   */
  toFirestore(): Record<string, any> {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Create from Firestore document
   */
  static fromFirestore(doc: DocumentSnapshot): SystemAlertModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = SystemAlertModel.prototype.convertDatesFromFirestore(data);

    return new SystemAlertModel({
      id: doc.id,
      ...convertedData,
    });
  }

  /**
   * Check if alert should trigger based on metric value
   */
  shouldTrigger(metricValue: number): boolean {
    const { condition, threshold } = this.data;

    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return metricValue > threshold;
      case AlertCondition.LESS_THAN:
        return metricValue < threshold;
      case AlertCondition.EQUALS:
        return metricValue === threshold;
      case AlertCondition.NOT_EQUALS:
        return metricValue !== threshold;
      default:
        return false;
    }
  }
}
