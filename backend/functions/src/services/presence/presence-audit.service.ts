/**
 * Service d'audit pour la gestion de présence
 */

import { logger } from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { collections, db } from '../../config';

export interface AuditEntry {
  id?: string;
  userId: string;
  employeeId?: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    deviceFingerprint?: string;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
  };
  timestamp: Date;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuditQuery {
  userId?: string;
  employeeId?: string;
  organizationId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEntries: number;
  successfulActions: number;
  failedActions: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
  timeRange: {
    earliest: Date;
    latest: Date;
  };
}

class PresenceAuditService {
  private readonly collectionName = 'presence_audit_logs';

  /**
   * Enregistrer une entrée d'audit
   */
  async logAction(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string> {
    try {
      const auditEntry: AuditEntry = {
        ...entry,
        timestamp: new Date()
      };

      const docRef = await collections[this.collectionName]
        .add({
          ...auditEntry,
          timestamp: Timestamp.fromDate(auditEntry.timestamp)
        });

      logger.debug('Audit entry created', { 
        auditId: docRef.id, 
        action: entry.action,
        userId: entry.userId 
      });

      return docRef.id;

    } catch (error) {
      logger.error('Failed to create audit entry', { error, entry });
      throw new Error('Failed to create audit entry');
    }
  }

  /**
   * Enregistrer une action de pointage
   */
  async logClockingAction(data: {
    userId: string;
    employeeId: string;
    organizationId: string;
    action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
    success: boolean;
    details: Record<string, any>;
    metadata: AuditEntry['metadata'];
    errorCode?: string;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      userId: data.userId,
      employeeId: data.employeeId,
      organizationId: data.organizationId,
      action: data.action,
      resource: 'presence_entry',
      resourceId: data.details.entryId,
      details: {
        ...data.details,
        clockingType: data.action
      },
      metadata: data.metadata,
      success: data.success,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Enregistrer une action de gestion de présence
   */
  async logManagementAction(data: {
    userId: string;
    employeeId?: string;
    organizationId: string;
    action: 'validate_entry' | 'correct_entry' | 'update_entry' | 'delete_entry';
    resourceId: string;
    success: boolean;
    details: Record<string, any>;
    metadata: AuditEntry['metadata'];
    errorCode?: string;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      userId: data.userId,
      employeeId: data.employeeId,
      organizationId: data.organizationId,
      action: data.action,
      resource: 'presence_entry',
      resourceId: data.resourceId,
      details: data.details,
      metadata: data.metadata,
      success: data.success,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Enregistrer une action de génération de rapport
   */
  async logReportAction(data: {
    userId: string;
    organizationId: string;
    action: 'generate_report' | 'export_report' | 'schedule_report';
    success: boolean;
    details: Record<string, any>;
    metadata: AuditEntry['metadata'];
    errorCode?: string;
    errorMessage?: string;
  }): Promise<string> {
    return this.logAction({
      userId: data.userId,
      organizationId: data.organizationId,
      action: data.action,
      resource: 'presence_report',
      resourceId: data.details.reportId,
      details: data.details,
      metadata: data.metadata,
      success: data.success,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage
    });
  }

  /**
   * Enregistrer un accès aux données sensibles
   */
  async logDataAccess(data: {
    userId: string;
    employeeId?: string;
    organizationId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details: Record<string, any>;
    metadata: AuditEntry['metadata'];
  }): Promise<string> {
    return this.logAction({
      userId: data.userId,
      employeeId: data.employeeId,
      organizationId: data.organizationId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: {
        ...data.details,
        dataAccess: true
      },
      metadata: data.metadata,
      success: true
    });
  }

  /**
   * Enregistrer une activité suspecte
   */
  async logSuspiciousActivity(data: {
    userId?: string;
    employeeId?: string;
    organizationId?: string;
    action: string;
    suspiciousPatterns: string[];
    details: Record<string, any>;
    metadata: AuditEntry['metadata'];
  }): Promise<string> {
    return this.logAction({
      userId: data.userId || 'unknown',
      employeeId: data.employeeId,
      organizationId: data.organizationId,
      action: data.action,
      resource: 'security',
      details: {
        ...data.details,
        suspicious: true,
        patterns: data.suspiciousPatterns
      },
      metadata: data.metadata,
      success: false,
      errorCode: 'SUSPICIOUS_ACTIVITY',
      errorMessage: `Suspicious patterns detected: ${data.suspiciousPatterns.join(', ')}`
    });
  }

  /**
   * Récupérer les entrées d'audit avec filtres
   */
  async getAuditEntries(query: AuditQuery): Promise<{
    data: AuditEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let firestoreQuery = collections[this.collectionName].orderBy('timestamp', 'desc');

      // Appliquer les filtres
      if (query.userId) {
        firestoreQuery = firestoreQuery.where('userId', '==', query.userId);
      }

      if (query.employeeId) {
        firestoreQuery = firestoreQuery.where('employeeId', '==', query.employeeId);
      }

      if (query.organizationId) {
        firestoreQuery = firestoreQuery.where('organizationId', '==', query.organizationId);
      }

      if (query.action) {
        firestoreQuery = firestoreQuery.where('action', '==', query.action);
      }

      if (query.resource) {
        firestoreQuery = firestoreQuery.where('resource', '==', query.resource);
      }

      if (query.success !== undefined) {
        firestoreQuery = firestoreQuery.where('success', '==', query.success);
      }

      if (query.startDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '>=', Timestamp.fromDate(query.startDate));
      }

      if (query.endDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '<=', Timestamp.fromDate(query.endDate));
      }

      // Pagination
      const limit = Math.min(query.limit || 50, 100);
      if (query.offset) {
        firestoreQuery = firestoreQuery.offset(query.offset);
      }
      firestoreQuery = firestoreQuery.limit(limit + 1); // +1 pour détecter s'il y a plus de résultats

      const snapshot = await firestoreQuery.get();
      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

      const data: AuditEntry[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      } as AuditEntry));

      // Compter le total (approximatif pour les grandes collections)
      const total = snapshot.docs.length;

      return {
        data,
        total,
        hasMore
      };

    } catch (error) {
      logger.error('Failed to get audit entries', { error, query });
      throw new Error('Failed to get audit entries');
    }
  }

  /**
   * Obtenir les statistiques d'audit
   */
  async getAuditStats(query: Omit<AuditQuery, 'limit' | 'offset'>): Promise<AuditStats> {
    try {
      let firestoreQuery = collections[this.collectionName];

      // Appliquer les filtres de base
      if (query.organizationId) {
        firestoreQuery = firestoreQuery.where('organizationId', '==', query.organizationId);
      }

      if (query.startDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '>=', Timestamp.fromDate(query.startDate));
      }

      if (query.endDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '<=', Timestamp.fromDate(query.endDate));
      }

      const snapshot = await firestoreQuery.get();
      const entries = snapshot.docs.map(doc => doc.data() as AuditEntry);

      // Calculer les statistiques
      const stats: AuditStats = {
        totalEntries: entries.length,
        successfulActions: entries.filter(entry => entry.success).length,
        failedActions: entries.filter(entry => !entry.success).length,
        uniqueUsers: new Set(entries.map(entry => entry.userId)).size,
        actionBreakdown: {},
        timeRange: {
          earliest: new Date(),
          latest: new Date()
        }
      };

      // Calculer la répartition des actions
      entries.forEach(entry => {
        stats.actionBreakdown[entry.action] = (stats.actionBreakdown[entry.action] || 0) + 1;
      });

      // Calculer la plage de temps
      if (entries.length > 0) {
        const timestamps = entries.map(entry => entry.timestamp.getTime());
        stats.timeRange.earliest = new Date(Math.min(...timestamps));
        stats.timeRange.latest = new Date(Math.max(...timestamps));
      }

      return stats;

    } catch (error) {
      logger.error('Failed to get audit stats', { error, query });
      throw new Error('Failed to get audit stats');
    }
  }

  /**
   * Obtenir les activités suspectes récentes
   */
  async getSuspiciousActivities(organizationId?: string, hours: number = 24): Promise<AuditEntry[]> {
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      let query = collections[this.collectionName]
        .where('details.suspicious', '==', true)
        .where('timestamp', '>=', Timestamp.fromDate(startDate))
        .orderBy('timestamp', 'desc')
        .limit(100);

      if (organizationId) {
        query = query.where('organizationId', '==', organizationId);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      } as AuditEntry));

    } catch (error) {
      logger.error('Failed to get suspicious activities', { error, organizationId, hours });
      throw new Error('Failed to get suspicious activities');
    }
  }

  /**
   * Nettoyer les anciennes entrées d'audit
   */
  async cleanupOldEntries(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const query = collections[this.collectionName]
        .where('timestamp', '<', Timestamp.fromDate(cutoffDate))
        .limit(500); // Traiter par lots pour éviter les timeouts

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return 0;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info('Audit entries cleanup completed', {
        deletedCount: snapshot.docs.length,
        cutoffDate: cutoffDate.toISOString()
      });

      return snapshot.docs.length;

    } catch (error) {
      logger.error('Failed to cleanup old audit entries', { error, retentionDays });
      throw new Error('Failed to cleanup old audit entries');
    }
  }

  /**
   * Exporter les entrées d'audit pour conformité
   */
  async exportAuditData(query: AuditQuery): Promise<AuditEntry[]> {
    try {
      // Pour l'export, on récupère toutes les données sans limite
      const result = await this.getAuditEntries({
        ...query,
        limit: 10000 // Limite élevée pour l'export
      });

      logger.info('Audit data exported', {
        query,
        exportedCount: result.data.length,
        userId: query.userId
      });

      return result.data;

    } catch (error) {
      logger.error('Failed to export audit data', { error, query });
      throw new Error('Failed to export audit data');
    }
  }
}

export { PresenceAuditService };
export const presenceAuditService = new PresenceAuditService();