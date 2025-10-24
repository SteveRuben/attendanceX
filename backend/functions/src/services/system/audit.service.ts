// backend/functions/src/services/audit.service.ts - Service d'audit complet

import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { ERROR_CODES } from "../../common/constants";


export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'attendance' | 'event' | 'user' | 'system' | 'compliance' | 'certificate';
  outcome: 'success' | 'failure' | 'warning';
  digitalSignature: string;
  previousHash?: string;
  metadata: {
    version: string;
    source: string;
    correlationId?: string;
  };
}

export interface AuditQuery {
  organizationId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  category?: AuditEntry['category'];
  severity?: AuditEntry['severity'];
  outcome?: AuditEntry['outcome'];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  filters: AuditQuery;
  entries: AuditEntry[];
  statistics: {
    totalEntries: number;
    entriesByCategory: Record<string, number>;
    entriesBySeverity: Record<string, number>;
    entriesByOutcome: Record<string, number>;
    topUsers: Array<{ userId: string; userEmail: string; count: number }>;
    topActions: Array<{ action: string; count: number }>;
    timelineData: Array<{ date: string; count: number }>;
  };
  generatedAt: Date;
  generatedBy: string;
  digitalSignature: string;
}

export class AuditService {
  private readonly db = getFirestore();
  private readonly AUDIT_VERSION = "1.0";

  /**
   * Enregistrer une entrée d'audit
   */
  async logAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'digitalSignature' | 'previousHash'>): Promise<AuditEntry> {
    try {
      const auditId = this.db.collection('audit_logs').doc().id;
      const timestamp = new Date();

      // Obtenir le hash précédent pour la chaîne d'intégrité
      const previousHash = await this.getLastAuditHash(entry.organizationId);

      // Créer l'entrée complète
      const auditEntry: AuditEntry = {
        ...entry,
        id: auditId,
        timestamp,
        previousHash,
        digitalSignature: '', // Sera calculé ci-dessous
        metadata: {
          ...entry.metadata,
          version: this.AUDIT_VERSION,
          source: entry.metadata.source || 'system'
        }
      };

      // Calculer la signature digitale
      auditEntry.digitalSignature = this.calculateDigitalSignature(auditEntry);

      // Sauvegarder l'entrée
      await this.db.collection('audit_logs').doc(auditId).set(auditEntry);

      // Mettre à jour le hash de référence
      await this.updateLastAuditHash(entry.organizationId, auditEntry.digitalSignature);

      return auditEntry;
    } catch (error) {
      console.error('Error logging audit entry:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Rechercher des entrées d'audit
   */
  async searchAuditEntries(query: AuditQuery): Promise<{
    entries: AuditEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let firestoreQuery = this.db.collection('audit_logs').orderBy('timestamp', 'desc');

      // Appliquer les filtres
      if (query.organizationId) {
        firestoreQuery = firestoreQuery.where('organizationId', '==', query.organizationId);
      }
      if (query.userId) {
        firestoreQuery = firestoreQuery.where('userId', '==', query.userId);
      }
      if (query.category) {
        firestoreQuery = firestoreQuery.where('category', '==', query.category);
      }
      if (query.severity) {
        firestoreQuery = firestoreQuery.where('severity', '==', query.severity);
      }
      if (query.outcome) {
        firestoreQuery = firestoreQuery.where('outcome', '==', query.outcome);
      }
      if (query.startDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '>=', query.startDate);
      }
      if (query.endDate) {
        firestoreQuery = firestoreQuery.where('timestamp', '<=', query.endDate);
      }

      // Appliquer la pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      if (offset > 0) {
        const offsetQuery = await firestoreQuery.limit(offset).get();
        if (!offsetQuery.empty) {
          const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
          firestoreQuery = firestoreQuery.startAfter(lastDoc);
        }
      }

      const querySnapshot = await firestoreQuery.limit(limit + 1).get();
      const entries = querySnapshot.docs.slice(0, limit).map(doc => doc.data() as AuditEntry);
      const hasMore = querySnapshot.docs.length > limit;

      // Compter le total (approximatif pour les performances)
      const totalQuery = await this.db.collection('audit_logs')
        .where('organizationId', '==', query.organizationId || '')
        .count()
        .get();
      const total = totalQuery.data().count;

      return { entries, total, hasMore };
    } catch (error) {
      console.error('Error searching audit entries:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer un rapport d'audit
   */
  async generateAuditReport(
    organizationId: string,
    title: string,
    description: string,
    filters: AuditQuery,
    generatedBy: string
  ): Promise<AuditReport> {
    try {
      const reportId = this.db.collection('audit_reports').doc().id;

      // Rechercher toutes les entrées correspondantes
      const searchResult = await this.searchAuditEntries({
        ...filters,
        organizationId,
        limit: 10000 // Limite élevée pour les rapports
      });

      // Calculer les statistiques
      const statistics = this.calculateAuditStatistics(searchResult.entries);

      const report: AuditReport = {
        id: reportId,
        organizationId,
        title,
        description,
        period: {
          startDate: filters.startDate || new Date(0),
          endDate: filters.endDate || new Date()
        },
        filters,
        entries: searchResult.entries,
        statistics,
        generatedAt: new Date(),
        generatedBy,
        digitalSignature: '' // Sera calculé ci-dessous
      };

      // Calculer la signature du rapport
      report.digitalSignature = this.calculateReportSignature(report);

      // Sauvegarder le rapport
      await this.db.collection('audit_reports').doc(reportId).set(report);

      // Logger la génération du rapport
      await this.logAuditEntry({
        userId: generatedBy,
        userEmail: '', // À récupérer si nécessaire
        organizationId,
        action: 'generate_audit_report',
        resource: 'audit_report',
        resourceId: reportId,
        details: {
          title,
          entriesCount: searchResult.entries.length,
          period: report.period
        },
        severity: 'medium',
        category: 'system',
        outcome: 'success',
        metadata: {
          version: this.AUDIT_VERSION,
          source: 'audit_service'
        }
      });

      return report;
    } catch (error) {
      console.error('Error generating audit report:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Vérifier l'intégrité de la chaîne d'audit
   */
  async verifyAuditIntegrity(organizationId: string): Promise<{
    isValid: boolean;
    totalEntries: number;
    verifiedEntries: number;
    corruptedEntries: AuditEntry[];
    missingHashes: number;
  }> {
    try {
      const entriesQuery = await this.db
        .collection('audit_logs')
        .where('organizationId', '==', organizationId)
        .orderBy('timestamp', 'asc')
        .get();

      const entries = entriesQuery.docs.map(doc => doc.data() as AuditEntry);
      const corruptedEntries: AuditEntry[] = [];
      let verifiedEntries = 0;
      let missingHashes = 0;
      let previousHash: string | null = null;

      for (const entry of entries) {
        // Vérifier la signature digitale
        const { digitalSignature, ...entryWithoutSignature } = entry;
        const expectedSignature = this.calculateDigitalSignature(entryWithoutSignature);

        if (entry.digitalSignature !== expectedSignature) {
          corruptedEntries.push(entry);
          continue;
        }

        // Vérifier la chaîne de hash
        if (previousHash && entry.previousHash !== previousHash) {
          corruptedEntries.push(entry);
          continue;
        }

        if (!entry.previousHash && previousHash) {
          missingHashes++;
        }

        verifiedEntries++;
        previousHash = entry.digitalSignature;
      }

      return {
        isValid: corruptedEntries.length === 0 && missingHashes === 0,
        totalEntries: entries.length,
        verifiedEntries,
        corruptedEntries,
        missingHashes
      };
    } catch (error) {
      console.error('Error verifying audit integrity:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exporter les logs d'audit
   */
  async exportAuditLogs(
    organizationId: string,
    format: 'json' | 'csv' | 'xml',
    filters: AuditQuery
  ): Promise<{
    data: string;
    filename: string;
    contentType: string;
  }> {
    try {
      const searchResult = await this.searchAuditEntries({
        ...filters,
        organizationId,
        limit: 50000 // Limite élevée pour l'export
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `audit_logs_${organizationId}_${timestamp}.${format}`;

      let data: string;
      let contentType: string;

      switch (format) {
        case 'json':
          data = JSON.stringify(searchResult.entries, null, 2);
          contentType = 'application/json';
          break;
        case 'csv':
          data = this.convertToCSV(searchResult.entries);
          contentType = 'text/csv';
          break;
        case 'xml':
          data = this.convertToXML(searchResult.entries);
          contentType = 'application/xml';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      return { data, filename, contentType };
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Nettoyer les anciens logs d'audit
   */
  async cleanupOldAuditLogs(
    organizationId: string,
    retentionDays: number
  ): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldLogsQuery = await this.db
        .collection('audit_logs')
        .where('organizationId', '==', organizationId)
        .where('timestamp', '<', cutoffDate)
        .limit(500) // Traiter par batch pour éviter les timeouts
        .get();

      const batch = this.db.batch();
      let deletedCount = 0;
      const errors: string[] = [];

      oldLogsQuery.docs.forEach(doc => {
        try {
          batch.delete(doc.ref);
          deletedCount++;
        } catch (error: any) {
          errors.push(`Error deleting ${doc.id}: ${error.message}`);
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
      }

      return { deletedCount, errors };
    } catch (error) {
      console.error('Error cleaning up old audit logs:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private calculateDigitalSignature(entry: Omit<AuditEntry, 'digitalSignature'>): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details,
      previousHash: entry.previousHash
    });

    return createHash('sha256').update(data).digest('hex');
  }

  private calculateReportSignature(report: Omit<AuditReport, 'digitalSignature'>): string {
    const data = JSON.stringify({
      id: report.id,
      organizationId: report.organizationId,
      title: report.title,
      period: report.period,
      entriesCount: report.entries.length,
      generatedAt: report.generatedAt.toISOString(),
      generatedBy: report.generatedBy
    });

    return createHash('sha256').update(data).digest('hex');
  }

  private async getLastAuditHash(organizationId: string): Promise<string | null> {
    try {
      const lastEntryQuery = await this.db
        .collection('audit_logs')
        .where('organizationId', '==', organizationId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (lastEntryQuery.empty) {
        return null;
      }

      const lastEntry = lastEntryQuery.docs[0].data() as AuditEntry;
      return lastEntry.digitalSignature;
    } catch (error) {
      console.error('Error getting last audit hash:', error);
      return null;
    }
  }

  private async updateLastAuditHash(organizationId: string, hash: string): Promise<void> {
    // Optionnel: maintenir une référence du dernier hash pour optimisation
    await this.db.collection('audit_metadata').doc(organizationId).set({
      lastHash: hash,
      updatedAt: new Date()
    }, { merge: true });
  }

  private calculateAuditStatistics(entries: AuditEntry[]): AuditReport['statistics'] {
    const entriesByCategory: Record<string, number> = {};
    const entriesBySeverity: Record<string, number> = {};
    const entriesByOutcome: Record<string, number> = {};
    const userCounts: Record<string, { userEmail: string; count: number }> = {};
    const actionCounts: Record<string, number> = {};
    const timelineCounts: Record<string, number> = {};

    entries.forEach(entry => {
      // Par catégorie
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;

      // Par sévérité
      entriesBySeverity[entry.severity] = (entriesBySeverity[entry.severity] || 0) + 1;

      // Par résultat
      entriesByOutcome[entry.outcome] = (entriesByOutcome[entry.outcome] || 0) + 1;

      // Par utilisateur
      if (!userCounts[entry.userId]) {
        userCounts[entry.userId] = { userEmail: entry.userEmail, count: 0 };
      }
      userCounts[entry.userId].count++;

      // Par action
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;

      // Timeline (par jour)
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      timelineCounts[dateKey] = (timelineCounts[dateKey] || 0) + 1;
    });

    // Top utilisateurs
    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, userEmail: data.userEmail, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top actions
    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Timeline data
    const timelineData = Object.entries(timelineCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEntries: entries.length,
      entriesByCategory,
      entriesBySeverity,
      entriesByOutcome,
      topUsers,
      topActions,
      timelineData
    };
  }

  private convertToCSV(entries: AuditEntry[]): string {
    if (entries.length === 0) {return '';}

    const headers = [
      'ID', 'Timestamp', 'User ID', 'User Email', 'Organization ID',
      'Action', 'Resource', 'Resource ID', 'Severity', 'Category',
      'Outcome', 'IP Address', 'User Agent', 'Details'
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.userId,
      entry.userEmail,
      entry.organizationId,
      entry.action,
      entry.resource,
      entry.resourceId,
      entry.severity,
      entry.category,
      entry.outcome,
      entry.ipAddress || '',
      entry.userAgent || '',
      JSON.stringify(entry.details)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  private convertToXML(entries: AuditEntry[]): string {
    const xmlEntries = entries.map(entry => `
    <entry>
      <id>${entry.id}</id>
      <timestamp>${entry.timestamp.toISOString()}</timestamp>
      <userId>${entry.userId}</userId>
      <userEmail>${entry.userEmail}</userEmail>
      <organizationId>${entry.organizationId}</organizationId>
      <action>${entry.action}</action>
      <resource>${entry.resource}</resource>
      <resourceId>${entry.resourceId}</resourceId>
      <severity>${entry.severity}</severity>
      <category>${entry.category}</category>
      <outcome>${entry.outcome}</outcome>
      <details>${JSON.stringify(entry.details)}</details>
    </entry>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<auditLog>
  <entries>${xmlEntries}
  </entries>
</auditLog>`;
  }
}

export const auditService = new AuditService();