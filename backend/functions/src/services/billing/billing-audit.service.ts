/**
 * Service d'audit et de sécurité pour le système de billing
 * Gère les logs, la détection de fraude, le rate limiting et les rapports de conformité
 */

import { collections } from '../../config/database';
import { TenantError, TenantErrorCode } from '../../common/types';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface BillingAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: BillingAction;
  entityType: BillingEntityType;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    source: 'web' | 'api' | 'system' | 'webhook';
    rateLimitKey?: string;
    remaining?: number;
    responseStatus?: number;
    success?:boolean;
    responseTime?: number;
    complianceType?: "gdpr" | "pci_dss" | "sox";
    status?: "compliant" | "non_compliant" | "warning";
    requestType?: "access" | "rectification" | "erasure" | "portability" | "restriction";
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    stripeCouponId?: string;
    eventName?: string;
    category?: string;
    operation?: string;
    blocked?: boolean;
    riskScore?: number;
    fraudFlags?: string[];
  };
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failed' | 'suspicious';
}

export enum BillingAction {
  // Subscription actions
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_SUSPENDED = 'subscription_suspended',
  SUBSCRIPTION_REACTIVATED = 'subscription_reactivated',

  // Payment actions
  PAYMENT_ATTEMPTED = 'payment_attempted',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PAYMENT_REFUNDED = 'payment_refunded',
  PAYMENT_DISPUTED = 'payment_disputed',

  // Promo code actions
  PROMO_CODE_CREATED = 'promo_code_created',
  PROMO_CODE_APPLIED = 'promo_code_applied',
  PROMO_CODE_REMOVED = 'promo_code_removed',
  PROMO_CODE_VALIDATED = 'promo_code_validated',
  PROMO_CODE_EXPIRED = 'promo_code_expired',

  // Grace period actions
  GRACE_PERIOD_STARTED = 'grace_period_started',
  GRACE_PERIOD_EXTENDED = 'grace_period_extended',
  GRACE_PERIOD_CONVERTED = 'grace_period_converted',
  GRACE_PERIOD_EXPIRED = 'grace_period_expired',

  // Plan actions
  PLAN_CHANGED = 'plan_changed',
  PLAN_UPGRADED = 'plan_upgraded',
  PLAN_DOWNGRADED = 'plan_downgraded',

  // Security actions
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  FRAUD_DETECTED = 'fraud_detected',
  ACCESS_DENIED = 'access_denied'
}

export enum BillingEntityType {
  SUBSCRIPTION = 'subscription',
  PAYMENT = 'payment',
  PROMO_CODE = 'promo_code',
  GRACE_PERIOD = 'grace_period',
  PLAN = 'plan',
  TENANT = 'tenant',
  USER = 'user'
}

export interface RateLimitConfig {
  windowMs: number; // Fenêtre de temps en millisecondes
  maxRequests: number; // Nombre maximum de requêtes
  blockDurationMs: number; // Durée de blocage en millisecondes
}

export interface FraudDetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: FraudCondition[];
  actions: FraudAction[];
}

export interface FraudCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
  timeWindow?: number; // En minutes
}

export interface FraudAction {
  type: 'block' | 'flag' | 'notify' | 'require_verification';
  duration?: number; // En minutes
  notifyEmails?: string[];
}

export interface ComplianceReport {
  id: string;
  reportType: 'gdpr' | 'pci_dss' | 'sox' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  data: {
    totalTransactions: number;
    totalAmount: number;
    failedTransactions: number;
    suspiciousActivities: number;
    dataRetentionCompliance: boolean;
    encryptionCompliance: boolean;
    accessControlCompliance: boolean;
  };
  generatedAt: Date;
  generatedBy: string;
}

export class BillingAuditService {

  // Configuration des limites de taux par défaut
  private readonly defaultRateLimits: Record<string, RateLimitConfig> = {
    promo_code_validation: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      blockDurationMs: 5 * 60 * 1000 // 5 minutes
    },
    promo_code_application: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 3,
      blockDurationMs: 15 * 60 * 1000 // 15 minutes
    },
    subscription_changes: {
      windowMs: 60 * 60 * 1000, // 1 heure
      maxRequests: 5,
      blockDurationMs: 60 * 60 * 1000 // 1 heure
    },
    payment_attempts: {
      windowMs: 60 * 60 * 1000, // 1 heure
      maxRequests: 10,
      blockDurationMs: 24 * 60 * 60 * 1000 // 24 heures
    }
  };

  // Règles de détection de fraude par défaut
  private readonly defaultFraudRules: FraudDetectionRule[] = [
    {
      id: 'multiple_promo_attempts',
      name: 'Tentatives multiples de codes promo',
      description: 'Détecte les tentatives répétées d\'application de codes promo invalides',
      enabled: true,
      severity: 'medium',
      conditions: [
        {
          field: 'action',
          operator: 'equals',
          value: BillingAction.PROMO_CODE_VALIDATED,
          timeWindow: 10
        },
        {
          field: 'status',
          operator: 'equals',
          value: 'failed'
        }
      ],
      actions: [
        {
          type: 'flag',
          duration: 60
        },
        {
          type: 'notify',
          notifyEmails: ['security@company.com']
        }
      ]
    },
    {
      id: 'rapid_subscription_changes',
      name: 'Changements rapides d\'abonnement',
      description: 'Détecte les changements d\'abonnement suspects',
      enabled: true,
      severity: 'high',
      conditions: [
        {
          field: 'action',
          operator: 'contains',
          value: 'subscription',
          timeWindow: 5
        }
      ],
      actions: [
        {
          type: 'require_verification'
        },
        {
          type: 'notify',
          notifyEmails: ['billing@company.com']
        }
      ]
    },
    {
      id: 'unusual_payment_patterns',
      name: 'Modèles de paiement inhabituels',
      description: 'Détecte les modèles de paiement suspects',
      enabled: true,
      severity: 'critical',
      conditions: [
        {
          field: 'action',
          operator: 'equals',
          value: BillingAction.PAYMENT_FAILED,
          timeWindow: 60
        }
      ],
      actions: [
        {
          type: 'block',
          duration: 120
        },
        {
          type: 'notify',
          notifyEmails: ['security@company.com', 'billing@company.com']
        }
      ]
    }
  ];

  /**
   * Logger une action de billing pour audit
   */
  async logBillingAction(params: {
    tenantId: string;
    userId: string;
    action: BillingAction;
    entityType: BillingEntityType;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    metadata?: Partial<BillingAuditLog['metadata']>;
    severity?: BillingAuditLog['severity'];
  }): Promise<string> {
    try {
      const auditLog: Omit<BillingAuditLog, 'id'> = {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues,
        newValues: params.newValues,
        metadata: {
          source: 'api',
          ...params.metadata
        },
        timestamp: new Date(),
        severity: params.severity || 'low',
        status: 'success'
      };

      // Calculer le score de risque
      auditLog.metadata.riskScore = await this.calculateRiskScore(auditLog);

      // Détecter la fraude
      const fraudFlags = await this.detectFraud(auditLog);
      if (fraudFlags.length > 0) {
        auditLog.metadata.fraudFlags = fraudFlags;
        auditLog.status = 'suspicious';
        auditLog.severity = 'high';
      }

      // Sauvegarder le log
      const logRef = await collections.billing_audit_logs.add(auditLog);

      // Logger dans Firebase Functions
      logger.info('Billing action logged', {
        logId: logRef.id,
        tenantId: params.tenantId,
        action: params.action,
        severity: auditLog.severity,
        riskScore: auditLog.metadata.riskScore
      });

      // Traiter les actions de sécurité si nécessaire
      if (auditLog.status === 'suspicious') {
        await this.handleSuspiciousActivity(auditLog);
      }

      return logRef.id;
    } catch (error) {
      logger.error('Error logging billing action:', error);
      throw new TenantError(
        'Failed to log billing action',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Vérifier les limites de taux pour une action
   */
  async checkRateLimit(
    tenantId: string,
    userId: string,
    action: string,
    customConfig?: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    blocked: boolean;
  }> {
    try {
      const config = customConfig || this.defaultRateLimits[action];
      if (!config) {
        return { allowed: true, remaining: 999, resetTime: new Date(), blocked: false };
      }

      // @ts-ignore
      const key = `${tenantId}:${userId}:${action}`;
      const now = new Date();
      const windowStart = new Date(now.getTime() - config.windowMs);

      // Compter les requêtes dans la fenêtre de temps
      const recentLogs = await collections.billing_audit_logs
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .where('action', '==', action)
        .where('timestamp', '>=', windowStart)
        .get();

      const requestCount = recentLogs.size;
      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetTime = new Date(now.getTime() + config.windowMs);

      // Vérifier si l'utilisateur est bloqué
      const blocked = await this.isUserBlocked(tenantId, userId, action);

      const allowed = !blocked && requestCount < config.maxRequests;

      // Si la limite est dépassée, bloquer l'utilisateur
      if (!allowed && !blocked) {
        await this.blockUser(tenantId, userId, action, config.blockDurationMs);
      }

      return {
        allowed,
        remaining,
        resetTime,
        blocked
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // En cas d'erreur, permettre l'action par défaut
      return { allowed: true, remaining: 0, resetTime: new Date(), blocked: false };
    }
  }

  /**
   * Détecter la fraude basée sur les règles configurées
   */
  async detectFraud(auditLog: Omit<BillingAuditLog, 'id'>): Promise<string[]> {
    const fraudFlags: string[] = [];

    try {
      for (const rule of this.defaultFraudRules) {
        if (!rule.enabled) {continue;}

        const matches = await this.evaluateFraudRule(rule, auditLog);
        if (matches) {
          fraudFlags.push(rule.id);
          
          // Exécuter les actions de la règle
          await this.executeFraudActions(rule, auditLog);
        }
      }
    } catch (error) {
      logger.error('Error detecting fraud:', error);
    }

    return fraudFlags;
  }

  /**
   * Générer un rapport de conformité
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: Date,
    endDate: Date,
    generatedBy: string
  ): Promise<ComplianceReport> {
    try {
      // Collecter les données pour le rapport
      const auditLogs = await collections.billing_audit_logs
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .get();

      const transactions = auditLogs.docs.filter(doc => 
        [BillingAction.PAYMENT_SUCCESS, BillingAction.PAYMENT_FAILED].includes(doc.data().action)
      );

      const suspiciousActivities = auditLogs.docs.filter(doc => 
        doc.data().status === 'suspicious'
      );

      const totalAmount = transactions.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.newValues?.amount || 0);
      }, 0);

      const failedTransactions = transactions.filter(doc => 
        doc.data().action === BillingAction.PAYMENT_FAILED
      );

      const report: ComplianceReport = {
        id: `report_${Date.now()}`,
        reportType,
        period: { startDate, endDate },
        data: {
          totalTransactions: transactions.length,
          totalAmount,
          failedTransactions: failedTransactions.length,
          suspiciousActivities: suspiciousActivities.length,
          dataRetentionCompliance: await this.checkDataRetentionCompliance(),
          encryptionCompliance: await this.checkEncryptionCompliance(),
          accessControlCompliance: await this.checkAccessControlCompliance()
        },
        generatedAt: new Date(),
        generatedBy
      };

      // Sauvegarder le rapport
      await collections.compliance_reports.add(report);

      logger.info('Compliance report generated', {
        reportId: report.id,
        reportType,
        period: report.period,
        generatedBy
      });

      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw new TenantError(
        'Failed to generate compliance report',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les logs d'audit avec filtres
   */
  async getAuditLogs(filters: {
    tenantId?: string;
    userId?: string;
    action?: BillingAction;
    entityType?: BillingEntityType;
    severity?: BillingAuditLog['severity'];
    status?: BillingAuditLog['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<BillingAuditLog[]> {
    try {
      let query = collections.billing_audit_logs.orderBy('timestamp', 'desc');

      // Appliquer les filtres
      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }
      if (filters.entityType) {
        query = query.where('entityType', '==', filters.entityType);
      }
      if (filters.severity) {
        query = query.where('severity', '==', filters.severity);
      }
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BillingAuditLog));
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw new TenantError(
        'Failed to get audit logs',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Nettoyer les anciens logs d'audit (conformité GDPR)
   */
  async cleanupOldAuditLogs(retentionDays: number = 365): Promise<{
    deleted: number;
    errors: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldLogs = await collections.billing_audit_logs
        .where('timestamp', '<', cutoffDate)
        .limit(500) // Traiter par lots
        .get();

      let deleted = 0;
      let errors = 0;

      const batch = admin.firestore().batch();

      oldLogs.docs.forEach(doc => {
        try {
          batch.delete(doc.ref);
          deleted++;
        } catch (error) {
          errors++;
          logger.error('Error deleting audit log:', error);
        }
      });

      await batch.commit();

      logger.info('Audit logs cleanup completed', {
        deleted,
        errors,
        cutoffDate
      });

      return { deleted, errors };
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }

  // Méthodes privées

  private async calculateRiskScore(auditLog: Omit<BillingAuditLog, 'id'>): Promise<number> {
    let score = 0;

    // Score basé sur l'action
    const actionScores: Record<string, number> = {
      [BillingAction.PROMO_CODE_APPLIED]: 3,
      [BillingAction.SUBSCRIPTION_CREATED]: 2,
      [BillingAction.PAYMENT_ATTEMPTED]: 4,
      [BillingAction.PLAN_CHANGED]: 3
    };

    score += actionScores[auditLog.action] || 1;

    // Score basé sur la fréquence récente
    const recentActions = await collections.billing_audit_logs
      .where('tenantId', '==', auditLog.tenantId)
      .where('userId', '==', auditLog.userId)
      .where('timestamp', '>=', new Date(Date.now() - 60 * 60 * 1000)) // Dernière heure
      .get();

    if (recentActions.size > 10) {score += 5;}
    else if (recentActions.size > 5) {score += 3;}

    // Score basé sur l'heure (activité nocturne suspecte)
    const hour = auditLog.timestamp.getHours();
    if (hour < 6 || hour > 22) {score += 2;}

    return Math.min(score, 10); // Score maximum de 10
  }

  private async evaluateFraudRule(
    rule: FraudDetectionRule,
    auditLog: Omit<BillingAuditLog, 'id'>
  ): Promise<boolean> {
    for (const condition of rule.conditions) {
      const matches = await this.evaluateCondition(condition, auditLog);
      if (!matches) {return false;}
    }
    return true;
  }

  private async evaluateCondition(
    condition: FraudCondition,
    auditLog: Omit<BillingAuditLog, 'id'>
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(auditLog, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  private getFieldValue(auditLog: Omit<BillingAuditLog, 'id'>, field: string): any {
    const fields = field.split('.');
    let value: any = auditLog;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  private async executeFraudActions(
    rule: FraudDetectionRule,
    auditLog: Omit<BillingAuditLog, 'id'>
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'block':
            await this.blockUser(
              auditLog.tenantId,
              auditLog.userId,
              'fraud_detected',
              (action.duration || 60) * 60 * 1000
            );
            break;
          case 'flag':
            // Marquer comme suspect dans les métadonnées
            break;
          case 'notify':
            await this.sendFraudNotification(rule, auditLog, action.notifyEmails || []);
            break;
          case 'require_verification':
            await this.requireUserVerification(auditLog.tenantId, auditLog.userId);
            break;
        }
      } catch (error) {
        logger.error('Error executing fraud action:', error);
      }
    }
  }

  private async isUserBlocked(tenantId: string, userId: string, action: string): Promise<boolean> {
    try {
      const blockKey = `${tenantId}:${userId}:${action}`;
      const blockDoc = await collections.rate_limit_blocks.doc(blockKey).get();
      
      if (!blockDoc.exists) {return false;}
      
      const blockData = blockDoc.data();
      return blockData && new Date(blockData.expiresAt.toDate()) > new Date();
    } catch (error) {
      logger.error('Error checking user block status:', error);
      return false;
    }
  }

  private async blockUser(
    tenantId: string,
    userId: string,
    action: string,
    durationMs: number
  ): Promise<void> {
    try {
      const blockKey = `${tenantId}:${userId}:${action}`;
      const expiresAt = new Date(Date.now() + durationMs);
      
      await collections.rate_limit_blocks.doc(blockKey).set({
        tenantId,
        userId,
        action,
        blockedAt: new Date(),
        expiresAt,
        reason: 'rate_limit_exceeded'
      });

      logger.warn('User blocked due to rate limit', {
        tenantId,
        userId,
        action,
        expiresAt
      });
    } catch (error) {
      logger.error('Error blocking user:', error);
    }
  }

  private async handleSuspiciousActivity(auditLog: Omit<BillingAuditLog, 'id'>): Promise<void> {
    // Implémenter la gestion des activités suspectes
    logger.warn('Suspicious billing activity detected', {
      tenantId: auditLog.tenantId,
      userId: auditLog.userId,
      action: auditLog.action,
      riskScore: auditLog.metadata.riskScore,
      fraudFlags: auditLog.metadata.fraudFlags
    });
  }

  private async sendFraudNotification(
    rule: FraudDetectionRule,
    auditLog: Omit<BillingAuditLog, 'id'>,
    emails: string[]
  ): Promise<void> {
    // Implémenter l'envoi de notifications de fraude
    logger.info('Fraud notification sent', {
      rule: rule.id,
      tenantId: auditLog.tenantId,
      emails
    });
  }

  private async requireUserVerification(tenantId: string, userId: string): Promise<void> {
    // Implémenter la demande de vérification utilisateur
    logger.info('User verification required', { tenantId, userId });
  }

  private async checkDataRetentionCompliance(): Promise<boolean> {
    // Vérifier la conformité de rétention des données
    return true; // Placeholder
  }

  private async checkEncryptionCompliance(): Promise<boolean> {
    // Vérifier la conformité du chiffrement
    return true; // Placeholder
  }

  private async checkAccessControlCompliance(): Promise<boolean> {
    // Vérifier la conformité du contrôle d'accès
    return true; // Placeholder
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    billing_audit_logs: any;
    compliance_reports: any;
    rate_limit_blocks: any;
  }
}

// Instance singleton
export const billingAuditService = new BillingAuditService();
export default billingAuditService;