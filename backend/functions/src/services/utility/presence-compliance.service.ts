/**
 * Service de conformité pour la gestion de présence
 */

import { logger } from 'firebase-functions';
import { LocationTrackingService } from './location-tracking.service';
import { collections, db } from '../../config';
import { AuditLog } from '../../shared';

interface GDPRRequest {
  id: string;
  employeeId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestedBy: string;
  reason?: string;
  data?: any;
}

interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // en jours
  archiveAfter: number; // en jours
  deleteAfter: number; // en jours
  legalBasis: string;
}

interface ComplianceReport {
  id: string;
  type: 'gdpr' | 'audit' | 'retention' | 'security';
  generatedDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  data: any;
  generatedBy: string;
}

export class PresenceComplianceService {

  private auditCollection: string = 'audit_logs';
  private gdprRequestsCollection: string = 'gdpr_requests';
  private complianceReportsCollection: string = 'compliance_reports';
  private locationService: LocationTrackingService;

  constructor() {
    this.locationService = new LocationTrackingService();
  }

  /**
   * Politiques de rétention des données par défaut
   */
  private getDefaultRetentionPolicies(): DataRetentionPolicy[] {
    return [
      {
        dataType: 'presence_entries',
        retentionPeriod: 2555, // 7 ans (légal en France)
        archiveAfter: 1095, // 3 ans
        deleteAfter: 2555,
        legalBasis: 'Legal obligation - Labor Code'
      },
      {
        dataType: 'location_data',
        retentionPeriod: 90, // 3 mois
        archiveAfter: 30,
        deleteAfter: 90,
        legalBasis: 'Legitimate interest - Security'
      },
      {
        dataType: 'audit_logs',
        retentionPeriod: 1095, // 3 ans
        archiveAfter: 365,
        deleteAfter: 1095,
        legalBasis: 'Legal obligation - Audit requirements'
      },
      {
        dataType: 'leave_requests',
        retentionPeriod: 1825, // 5 ans
        archiveAfter: 365,
        deleteAfter: 1825,
        legalBasis: 'Legal obligation - Employment records'
      }
    ];
  }

  // === GESTION GDPR ===

  /**
   * Traiter une demande GDPR
   */
  async processGDPRRequest(request: Omit<GDPRRequest, 'id' | 'status' | 'requestDate'>): Promise<string> {
    const gdprRequest: GDPRRequest = {
      id: this.generateId(),
      ...request,
      status: 'pending',
      requestDate: new Date()
    };

    await collections[this.gdprRequestsCollection].doc(gdprRequest.id).set(gdprRequest);

    // Enregistrer dans l'audit
    await this.logAuditEvent({
      action: 'gdpr_request_created',
      entityType: 'gdpr_request',
      entityId: gdprRequest.id,
      userId: request.requestedBy,
      details: {
        type: request.type,
        employeeId: request.employeeId
      }
    });

    // Traiter automatiquement selon le type
    await this.processGDPRRequestAutomatically(gdprRequest);

    return gdprRequest.id;
  }

  /**
   * Traitement automatique des demandes GDPR
   */
  private async processGDPRRequestAutomatically(request: GDPRRequest): Promise<void> {
    try {
      await this.updateGDPRRequestStatus(request.id, 'processing');

      switch (request.type) {
        case 'access':
          await this.handleDataAccessRequest(request);
          break;
        case 'portability':
          await this.handleDataPortabilityRequest(request);
          break;
        case 'rectification':
          await this.handleDataRectificationRequest(request);
          break;
        case 'erasure':
          await this.handleDataErasureRequest(request);
          break;
        case 'restriction':
          await this.handleDataRestrictionRequest(request);
          break;
      }

      await this.updateGDPRRequestStatus(request.id, 'completed');
    } catch (error) {
      console.error('Error processing GDPR request:', error);
      await this.updateGDPRRequestStatus(request.id, 'rejected');
      throw error;
    }
  }

  /**
   * Gérer une demande d'accès aux données
   */
  private async handleDataAccessRequest(request: GDPRRequest): Promise<void> {
    const employeeData = await this.collectEmployeeData(request.employeeId);

    await collections[this.gdprRequestsCollection].doc(request.id).update({
      data: employeeData,
      completionDate: new Date()
    });

    await this.logAuditEvent({
      action: 'gdpr_data_access_completed',
      entityType: 'employee',
      entityId: request.employeeId,
      userId: request.requestedBy,
      details: {
        requestId: request.id,
        dataTypes: Object.keys(employeeData)
      }
    });
  }

  /**
   * Gérer une demande de portabilité des données
   */
  private async handleDataPortabilityRequest(request: GDPRRequest): Promise<void> {
    const employeeData = await this.collectEmployeeData(request.employeeId);
    const portableData = this.formatDataForPortability(employeeData);

    await collections[this.gdprRequestsCollection].doc(request.id).update({
      data: portableData,
      completionDate: new Date()
    });
  }

  /**
   * Gérer une demande d'effacement des données
   */
  private async handleDataErasureRequest(request: GDPRRequest): Promise<void> {
    // Vérifier si l'effacement est légalement possible
    const canErase = await this.canEraseEmployeeData(request.employeeId);

    if (!canErase) {
      throw new Error('Data erasure not possible due to legal obligations');
    }

    await this.eraseEmployeeData(request.employeeId);

    await collections[this.gdprRequestsCollection].doc(request.id).update({
      completionDate: new Date(),
      data: { erasedDataTypes: ['presence_entries', 'location_data', 'personal_data'] }
    });
  }

  /**
   * Collecter toutes les données d'un employé
   */
  private async collectEmployeeData(employeeId: string): Promise<any> {
    const data: any = {};

    // Données de présence
    const presenceQuery = await collections.presence_entries
      .where('employeeId', '==', employeeId)
      .get();

    data.presenceEntries = presenceQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Demandes de congé
    const leaveQuery = await collections.leave_requests
      .where('employeeId', '==', employeeId)
      .get();

    data.leaveRequests = leaveQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Données d'audit (recherche par performedBy car entityId n'existe pas dans AuditLog)
    const auditQuery = await collections[this.auditCollection]
      .where('performedBy', '==', employeeId)
      .get();

    data.auditLogs = auditQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Données personnelles
    const employeeDoc = await collections.employees.doc(employeeId).get();
    if (employeeDoc.exists) {
      data.personalData = employeeDoc.data();
    }

    return data;
  }

  /**
   * Formater les données pour la portabilité
   */
  private formatDataForPortability(data: any): any {
    return {
      format: 'JSON',
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {
        presenceEntries: data.presenceEntries?.map((entry: any) => ({
          date: entry.clockInTime,
          clockIn: entry.clockInTime,
          clockOut: entry.clockOutTime,
          duration: entry.duration,
          breaks: entry.breaks
        })),
        leaveRequests: data.leaveRequests?.map((leave: any) => ({
          type: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          status: leave.status,
          reason: leave.reason
        })),
        personalData: {
          name: data.personalData?.name,
          email: data.personalData?.email,
          employeeId: data.personalData?.employeeId,
          department: data.personalData?.department
        }
      }
    };
  }

  /**
   * Vérifier si les données peuvent être effacées
   */
  private async canEraseEmployeeData(employeeId: string): Promise<boolean> {
    // Vérifier les obligations légales
    const retentionPolicies = this.getDefaultRetentionPolicies();
    const now = new Date();

    // Vérifier les données de présence (obligation légale de 7 ans)
    const oldestPresence = await collections.presence_entries
      .where('employeeId', '==', employeeId)
      .orderBy('clockInTime', 'desc')
      .limit(1)
      .get();

    if (!oldestPresence.empty) {
      const lastPresenceDate = oldestPresence.docs[0].data().clockInTime.toDate();
      const daysSinceLastPresence = Math.floor((now.getTime() - lastPresenceDate.getTime()) / (1000 * 60 * 60 * 24));

      const presencePolicy = retentionPolicies.find(p => p.dataType === 'presence_entries');
      if (presencePolicy && daysSinceLastPresence < presencePolicy.retentionPeriod) {
        return false; // Ne peut pas effacer avant la fin de la période de rétention légale
      }
    }

    return true;
  }

  /**
   * Effacer les données d'un employé
   */
  private async eraseEmployeeData(employeeId: string): Promise<void> {
    const batch = db.batch();

    // Effacer les données de présence (si légalement possible)
    const presenceQuery = await collections.presence_entries
      .where('employeeId', '==', employeeId)
      .get();

    presenceQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Anonymiser les données de localisation (plus conforme GDPR que suppression)
    const anonymizedLocationCount = await this.locationService.anonymizeEmployeeLocationData(employeeId);

    // Anonymiser les données personnelles au lieu de les effacer complètement
    const employeeRef = collections.employees.doc(employeeId);
    batch.update(employeeRef, {
      name: '[ANONYMIZED]',
      email: '[ANONYMIZED]',
      phone: '[ANONYMIZED]',
      address: '[ANONYMIZED]',
      gdprErased: true,
      erasureDate: new Date()
    });

    await batch.commit();

    await this.logAuditEvent({
      action: 'gdpr_data_erased',
      entityType: 'employee',
      entityId: employeeId,
      userId: 'system',
      details: {
        erasedCollections: ['presence_entries'],
        anonymizedCollections: ['location_tracking'],
        anonymizedLocationRecords: anonymizedLocationCount,
        anonymizedFields: ['name', 'email', 'phone', 'address']
      }
    });
  }

  // === RÉTENTION DES DONNÉES ===

  /**
   * Appliquer les politiques de rétention des données
   */
  async applyDataRetentionPolicies(): Promise<void> {
    const policies = this.getDefaultRetentionPolicies();

    for (const policy of policies) {
      await this.applyRetentionPolicy(policy);
    }
  }

  /**
   * Appliquer une politique de rétention spécifique
   */
  private async applyRetentionPolicy(policy: DataRetentionPolicy): Promise<void> {
    const now = new Date();
    const archiveDate = new Date(now.getTime() - policy.archiveAfter * 24 * 60 * 60 * 1000);
    const deleteDate = new Date(now.getTime() - policy.deleteAfter * 24 * 60 * 60 * 1000);

    switch (policy.dataType) {
      case 'presence_entries':
        await this.archiveOldPresenceEntries(archiveDate);
        await this.deleteOldPresenceEntries(deleteDate);
        break;
      case 'location_data':
        await this.deleteOldLocationData(deleteDate);
        break;
      case 'audit_logs':
        await this.archiveOldAuditLogs(archiveDate);
        await this.deleteOldAuditLogs(deleteDate);
        break;
    }

    await this.logAuditEvent({
      action: 'retention_policy_applied',
      entityType: 'system',
      entityId: policy.dataType,
      userId: 'system',
      details: {
        policy: policy,
        archiveDate: archiveDate,
        deleteDate: deleteDate
      }
    });
  }

  /**
   * Archiver les anciennes entrées de présence
   */
  private async archiveOldPresenceEntries(archiveDate: Date): Promise<void> {
    const query = await collections.presence_entries
      .where('clockInTime', '<', archiveDate)
      .where('archived', '==', false)
      .get();

    const batch = db.batch();

    query.docs.forEach(doc => {
      batch.update(doc.ref, {
        archived: true,
        archivedDate: new Date()
      });
    });

    if (!query.empty) {
      await batch.commit();
    }
  }

  /**
   * Supprimer les anciennes entrées de présence
   */
  private async deleteOldPresenceEntries(deleteDate: Date): Promise<void> {
    const query = await collections.presence_entries
      .where('clockInTime', '<', deleteDate)
      .get();

    const batch = db.batch();

    query.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!query.empty) {
      await batch.commit();
    }
  }

  // === AUDIT ET LOGGING ===

  /**
   * Enregistrer un événement d'audit
   */
  async logAuditEvent(event: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    details?: any;
  }): Promise<void> {
    const auditLogId = this.generateId();
    const auditLog: AuditLog = {
      action: event.action,
      performedBy: event.userId,
      performedAt: new Date(),
      userAgent: '', // À remplir depuis la requête
      ipAddress: '', // À remplir depuis la requête
      reason: `${event.entityType}:${event.entityId}`, // Utiliser reason pour stocker entityType:entityId
      newValue: event.details || {}
    };

    await collections[this.auditCollection].doc(auditLogId).set(auditLog);
  }



  // === RAPPORTS DE CONFORMITÉ ===

  /**
   * Générer un rapport de conformité GDPR
   */
  async generateGDPRComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const gdprRequests = await
      collections[this.gdprRequestsCollection]
        .where('requestDate', '>=', startDate)
        .where('requestDate', '<=', endDate)
        .get();

    const report: ComplianceReport = {
      id: this.generateId(),
      type: 'gdpr',
      generatedDate: new Date(),
      period: { startDate, endDate },
      generatedBy: 'system',
      data: {
        totalRequests: gdprRequests.size,
        requestsByType: this.groupRequestsByType(gdprRequests.docs),
        requestsByStatus: this.groupRequestsByStatus(gdprRequests.docs),
        averageProcessingTime: this.calculateAverageProcessingTime(gdprRequests.docs),
        complianceRate: this.calculateComplianceRate(gdprRequests.docs)
      }
    };

    await collections[this.complianceReportsCollection].doc(report.id).set(report);
    return report;
  }

  /**
   * Mettre à jour le statut d'une demande GDPR
   */
  private async updateGDPRRequestStatus(requestId: string, status: GDPRRequest['status']): Promise<void> {
    await collections[this.gdprRequestsCollection].doc(requestId).update({
      status,
      ...(status === 'completed' && { completionDate: new Date() })
    });
  }

  // === MÉTHODES UTILITAIRES ===

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private groupRequestsByType(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Record<string, number> {
    return docs.reduce((acc, doc) => {
      const type = doc.data().type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupRequestsByStatus(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Record<string, number> {
    return docs.reduce((acc, doc) => {
      const status = doc.data().status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageProcessingTime(docs: FirebaseFirestore.QueryDocumentSnapshot[]): number {
    const completedRequests = docs.filter(doc => doc.data().completionDate);
    if (completedRequests.length === 0) {return 0;}

    const totalTime = completedRequests.reduce((acc, doc) => {
      const data = doc.data();
      const processingTime = data.completionDate.toDate().getTime() - data.requestDate.toDate().getTime();
      return acc + processingTime;
    }, 0);

    return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60 * 24)); // en jours
  }

  private calculateComplianceRate(docs: FirebaseFirestore.QueryDocumentSnapshot[]): number {
    if (docs.length === 0) {return 100;}

    const completedOnTime = docs.filter(doc => {
      const data = doc.data();
      if (!data.completionDate) {return false;}

      const processingTime = data.completionDate.toDate().getTime() - data.requestDate.toDate().getTime();
      const processingDays = processingTime / (1000 * 60 * 60 * 24);

      return processingDays <= 30; // GDPR exige une réponse sous 30 jours
    });

    return Math.round((completedOnTime.length / docs.length) * 100);
  }

  private async archiveOldAuditLogs(archiveDate: Date): Promise<void> {
    const query = await collections[this.auditCollection]
      .where('performedAt', '<', archiveDate)
      .where('archived', '==', false)
      .get();

    const batch = db.batch();

    query.docs.forEach(doc => {
      batch.update(doc.ref, {
        archived: true,
        archivedDate: new Date()
      });
    });

    if (!query.empty) {
      await batch.commit();
    }
  }

  private async deleteOldAuditLogs(deleteDate: Date): Promise<void> {
    const query = await collections[this.auditCollection]
      .where('performedAt', '<', deleteDate)
      .get();

    const batch = db.batch();

    query.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!query.empty) {
      await batch.commit();
    }
  }

  private async deleteOldLocationData(deleteDate: Date): Promise<void> {
    const query = await collections.location_tracking
      .where('timestamp', '<', deleteDate)
      .get();

    const batch = db.batch();
    
    query.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    if (!query.empty) {
      await batch.commit();
      logger.info(`Deleted ${query.size} old location tracking records`);
    }
  }

  /**
   * Gérer une demande de rectification de données
   */
  private async handleDataRectificationRequest(request: GDPRRequest): Promise<void> {
    // Implémenter la logique de rectification des données
    await collections[this.gdprRequestsCollection].doc(request.id).update({
      completionDate: new Date(),
      data: { message: 'Data rectification completed' }
    });

    await this.logAuditEvent({
      action: 'gdpr_data_rectified',
      entityType: 'employee',
      entityId: request.employeeId,
      userId: request.requestedBy,
      details: { requestId: request.id }
    });
  }

  /**
   * Gérer une demande de restriction de données
   */
  private async handleDataRestrictionRequest(request: GDPRRequest): Promise<void> {
    // Marquer les données comme restreintes
    await collections.employees.doc(request.employeeId).update({
      dataRestricted: true,
      restrictionDate: new Date(),
      restrictionReason: request.reason || 'GDPR restriction request'
    });

    await collections[this.gdprRequestsCollection].doc(request.id).update({
      completionDate: new Date(),
      data: { message: 'Data restriction applied' }
    });

    await this.logAuditEvent({
      action: 'gdpr_data_restricted',
      entityType: 'employee',
      entityId: request.employeeId,
      userId: request.requestedBy,
      details: { requestId: request.id }
    });
  }
}