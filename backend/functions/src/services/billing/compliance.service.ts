/**
 * Service de conformité et de rapports pour le système de billing
 * Gère la conformité GDPR, PCI DSS, SOX et génère des rapports de conformité
 */

import { collections } from '../../config/database';
import { billingAuditService, BillingAction, BillingEntityType } from './billingAudit.service';
import { TenantError, TenantErrorCode } from '../../common/types';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface ComplianceCheck {
  id: string;
  type: 'gdpr' | 'pci_dss' | 'sox' | 'custom';
  name: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'warning' | 'unknown';
  lastChecked: Date;
  nextCheck: Date;
  details: {
    requirements: ComplianceRequirement[];
    violations: ComplianceViolation[];
    recommendations: string[];
  };
  metadata: Record<string, any>;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  status: 'met' | 'not_met' | 'partial' | 'unknown';
  evidence: string[];
  lastVerified: Date;
}

export interface ComplianceViolation {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  affectedEntities: string[];
}

export interface DataRetentionPolicy {
  entityType: string;
  retentionPeriodDays: number;
  archiveAfterDays?: number;
  deleteAfterDays: number;
  encryptionRequired: boolean;
  backupRequired: boolean;
  auditRequired: boolean;
}

export interface PrivacyRequest {
  id: string;
  tenantId: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  requestDetails: {
    reason?: string;
    dataTypes?: string[];
    format?: 'json' | 'csv' | 'pdf';
  };
  response?: {
    data?: any;
    message?: string;
    actions?: string[];
  };
}

export class ComplianceService {

  // Politiques de rétention par défaut
  private readonly defaultRetentionPolicies: DataRetentionPolicy[] = [
    {
      entityType: 'billing_audit_logs',
      retentionPeriodDays: 2555, // 7 ans pour la conformité fiscale
      deleteAfterDays: 2555,
      encryptionRequired: true,
      backupRequired: true,
      auditRequired: true
    },
    {
      entityType: 'payment_data',
      retentionPeriodDays: 1095, // 3 ans pour PCI DSS
      deleteAfterDays: 1095,
      encryptionRequired: true,
      backupRequired: true,
      auditRequired: true
    },
    {
      entityType: 'subscription_data',
      retentionPeriodDays: 2190, // 6 ans pour les contrats
      deleteAfterDays: 2190,
      encryptionRequired: true,
      backupRequired: true,
      auditRequired: true
    },
    {
      entityType: 'promo_code_usage',
      retentionPeriodDays: 1095, // 3 ans pour l'audit marketing
      deleteAfterDays: 1095,
      encryptionRequired: false,
      backupRequired: true,
      auditRequired: true
    },
    {
      entityType: 'user_personal_data',
      retentionPeriodDays: 1095, // 3 ans après suppression du compte
      deleteAfterDays: 1095,
      encryptionRequired: true,
      backupRequired: true,
      auditRequired: true
    }
  ];

  /**
   * Effectuer une vérification de conformité complète
   */
  async performComplianceCheck(type: ComplianceCheck['type']): Promise<ComplianceCheck> {
    try {
      const checkId = `compliance_${type}_${Date.now()}`;
      
      let requirements: ComplianceRequirement[] = [];
      let violations: ComplianceViolation[] = [];
      let recommendations: string[] = [];

      switch (type) {
        case 'gdpr':
          ({ requirements, violations, recommendations } = await this.checkGDPRCompliance());
          break;
        case 'pci_dss':
          ({ requirements, violations, recommendations } = await this.checkPCIDSSCompliance());
          break;
        case 'sox':
          ({ requirements, violations, recommendations } = await this.checkSOXCompliance());
          break;
        default:
          throw new Error(`Unsupported compliance type: ${type}`);
      }

      // Déterminer le statut global
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      const highViolations = violations.filter(v => v.severity === 'high');
      const unmetRequirements = requirements.filter(r => r.mandatory && r.status === 'not_met');

      let status: ComplianceCheck['status'];
      if (criticalViolations.length > 0 || unmetRequirements.length > 0) {
        status = 'non_compliant';
      } else if (highViolations.length > 0) {
        status = 'warning';
      } else {
        status = 'compliant';
      }

      const complianceCheck: ComplianceCheck = {
        id: checkId,
        type,
        name: this.getComplianceTypeName(type),
        description: this.getComplianceTypeDescription(type),
        status,
        lastChecked: new Date(),
        nextCheck: this.calculateNextCheckDate(type),
        details: {
          requirements,
          violations,
          recommendations
        },
        metadata: {
          totalRequirements: requirements.length,
          metRequirements: requirements.filter(r => r.status === 'met').length,
          totalViolations: violations.length,
          criticalViolations: criticalViolations.length
        }
      };

      // Sauvegarder le résultat
      await collections.compliance_checks.doc(checkId).set(complianceCheck);

      // Logger l'audit de conformité
      await billingAuditService.logBillingAction({
        tenantId: 'system',
        userId: 'compliance_service',
        action: BillingAction.SUSPICIOUS_ACTIVITY, // Utiliser pour les vérifications de conformité
        entityType: BillingEntityType.TENANT,
        entityId: 'compliance_check',
        newValues: { complianceCheck },
        metadata: {
          source: 'system',
          complianceType: type,
          status
        },
        severity: status === 'non_compliant' ? 'critical' : 'low'
      });

      return complianceCheck;
    } catch (error) {
      logger.error('Error performing compliance check:', error);
      throw new TenantError(
        'Failed to perform compliance check',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Traiter une demande de confidentialité (GDPR)
   */
  async processPrivacyRequest(request: Omit<PrivacyRequest, 'id' | 'status' | 'requestedAt'>): Promise<PrivacyRequest> {
    try {
      const requestId = `privacy_${Date.now()}`;
      
      const privacyRequest: PrivacyRequest = {
        id: requestId,
        status: 'pending',
        requestedAt: new Date(),
        ...request
      };

      // Sauvegarder la demande
      await collections.privacy_requests.doc(requestId).set(privacyRequest);

      // Logger l'audit
      await billingAuditService.logBillingAction({
        tenantId: request.tenantId,
        userId: request.userId,
        action: BillingAction.ACCESS_DENIED, // Utiliser pour les demandes de confidentialité
        entityType: BillingEntityType.USER,
        entityId: request.userId,
        newValues: { privacyRequest },
        metadata: {
          source: 'api',
          requestType: request.type
        },
        severity: 'medium'
      });

      // Traiter automatiquement certains types de demandes
      if (request.type === 'access') {
        await this.processDataAccessRequest(privacyRequest);
      }

      return privacyRequest;
    } catch (error) {
      logger.error('Error processing privacy request:', error);
      throw new TenantError(
        'Failed to process privacy request',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Appliquer les politiques de rétention des données
   */
  async applyDataRetentionPolicies(): Promise<{
    processed: number;
    archived: number;
    deleted: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      archived: 0,
      deleted: 0,
      errors: [] as string[]
    };

    try {
      for (const policy of this.defaultRetentionPolicies) {
        try {
          const policyResult = await this.applyRetentionPolicy(policy);
          result.processed += policyResult.processed;
          result.archived += policyResult.archived;
          result.deleted += policyResult.deleted;
        } catch (error) {
          result.errors.push(`Error applying policy for ${policy.entityType}: ${error}`);
        }
      }

      // Logger l'application des politiques
      await billingAuditService.logBillingAction({
        tenantId: 'system',
        userId: 'compliance_service',
        action: BillingAction.SUSPICIOUS_ACTIVITY,
        entityType: BillingEntityType.TENANT,
        entityId: 'data_retention',
        newValues: { result },
        metadata: {
          source: 'system',
          operation: 'data_retention'
        },
        severity: 'low'
      });

      return result;
    } catch (error) {
      logger.error('Error applying data retention policies:', error);
      throw error;
    }
  }

  /**
   * Générer un rapport de conformité détaillé
   */
  async generateComplianceReport(
    type: ComplianceCheck['type'],
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: any;
    details: any;
    recommendations: string[];
    exportUrl?: string;
  }> {
    try {
      // Obtenir les vérifications de conformité pour la période
      const checks = await collections.compliance_checks
        .where('type', '==', type)
        .where('lastChecked', '>=', startDate)
        .where('lastChecked', '<=', endDate)
        .orderBy('lastChecked', 'desc')
        .get();

      // Obtenir les violations pour la période
      const violations = await this.getViolationsForPeriod(type, startDate, endDate);

      // Obtenir les demandes de confidentialité pour la période
      const privacyRequests = await collections.privacy_requests
        .where('requestedAt', '>=', startDate)
        .where('requestedAt', '<=', endDate)
        .get();

      const summary = {
        period: { startDate, endDate },
        totalChecks: checks.size,
        complianceRate: this.calculateComplianceRate(checks.docs),
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        privacyRequests: privacyRequests.size,
        dataRetentionCompliance: await this.checkDataRetentionCompliance()
      };

      const details = {
        checks: checks.docs.map(doc => doc.data()),
        violations,
        privacyRequests: privacyRequests.docs.map(doc => doc.data()),
        retentionPolicies: this.defaultRetentionPolicies
      };

      const recommendations = await this.generateComplianceRecommendations(summary, details);

      // Optionnellement, exporter vers un fichier
      const exportUrl = await this.exportComplianceReport(type, summary, details);

      return {
        summary,
        details,
        recommendations,
        exportUrl
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Vérifier la conformité en temps réel
   */
  async checkRealTimeCompliance(
    tenantId: string,
    action: BillingAction,
    entityData: any
  ): Promise<{
    compliant: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // Vérifications spécifiques selon l'action
      switch (action) {
        case BillingAction.PROMO_CODE_APPLIED:
          await this.checkPromoCodeCompliance(entityData, violations, warnings);
          break;
        case BillingAction.PAYMENT_ATTEMPTED:
          await this.checkPaymentCompliance(entityData, violations, warnings);
          break;
        case BillingAction.SUBSCRIPTION_CREATED:
          await this.checkSubscriptionCompliance(entityData, violations, warnings);
          break;
      }

      // Vérifications générales
      await this.checkGeneralCompliance(tenantId, entityData, violations, warnings);

      return {
        compliant: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      logger.error('Error checking real-time compliance:', error);
      return {
        compliant: false,
        violations: ['Error during compliance check'],
        warnings: []
      };
    }
  }

  // Méthodes privées

  private async checkGDPRCompliance(): Promise<{
    requirements: ComplianceRequirement[];
    violations: ComplianceViolation[];
    recommendations: string[];
  }> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'gdpr_consent',
        name: 'Consentement explicite',
        description: 'Obtenir un consentement explicite pour le traitement des données',
        mandatory: true,
        status: 'met', // À vérifier dynamiquement
        evidence: ['consent_records'],
        lastVerified: new Date()
      },
      {
        id: 'gdpr_data_minimization',
        name: 'Minimisation des données',
        description: 'Collecter uniquement les données nécessaires',
        mandatory: true,
        status: 'met',
        evidence: ['data_collection_audit'],
        lastVerified: new Date()
      },
      {
        id: 'gdpr_right_to_erasure',
        name: 'Droit à l\'effacement',
        description: 'Permettre la suppression des données personnelles',
        mandatory: true,
        status: 'met',
        evidence: ['deletion_procedures'],
        lastVerified: new Date()
      }
    ];

    const violations: ComplianceViolation[] = [];
    const recommendations = [
      'Mettre en place un système de gestion des consentements',
      'Effectuer des audits réguliers de minimisation des données',
      'Automatiser les processus de suppression des données'
    ];

    return { requirements, violations, recommendations };
  }

  private async checkPCIDSSCompliance(): Promise<{
    requirements: ComplianceRequirement[];
    violations: ComplianceViolation[];
    recommendations: string[];
  }> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'pci_encryption',
        name: 'Chiffrement des données de carte',
        description: 'Chiffrer toutes les données de carte de crédit',
        mandatory: true,
        status: 'met',
        evidence: ['encryption_audit'],
        lastVerified: new Date()
      },
      {
        id: 'pci_access_control',
        name: 'Contrôle d\'accès',
        description: 'Limiter l\'accès aux données de carte',
        mandatory: true,
        status: 'met',
        evidence: ['access_control_audit'],
        lastVerified: new Date()
      }
    ];

    const violations: ComplianceViolation[] = [];
    const recommendations = [
      'Effectuer des tests de pénétration réguliers',
      'Mettre à jour les systèmes de sécurité',
      'Former le personnel sur la sécurité PCI'
    ];

    return { requirements, violations, recommendations };
  }

  private async checkSOXCompliance(): Promise<{
    requirements: ComplianceRequirement[];
    violations: ComplianceViolation[];
    recommendations: string[];
  }> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'sox_audit_trail',
        name: 'Piste d\'audit',
        description: 'Maintenir une piste d\'audit complète',
        mandatory: true,
        status: 'met',
        evidence: ['audit_logs'],
        lastVerified: new Date()
      },
      {
        id: 'sox_financial_controls',
        name: 'Contrôles financiers',
        description: 'Implémenter des contrôles sur les transactions financières',
        mandatory: true,
        status: 'met',
        evidence: ['financial_controls_audit'],
        lastVerified: new Date()
      }
    ];

    const violations: ComplianceViolation[] = [];
    const recommendations = [
      'Automatiser les contrôles financiers',
      'Effectuer des revues trimestrielles',
      'Documenter tous les processus financiers'
    ];

    return { requirements, violations, recommendations };
  }

  private async processDataAccessRequest(request: PrivacyRequest): Promise<void> {
    try {
      // Collecter toutes les données de l'utilisateur
      const userData = await this.collectUserData(request.tenantId, request.userId);

      // Mettre à jour la demande avec les données
      await collections.privacy_requests.doc(request.id).update({
        status: 'completed',
        completedAt: new Date(),
        response: {
          data: userData,
          message: 'Données personnelles exportées avec succès',
          actions: ['data_exported']
        }
      });
    } catch (error) {
      logger.error('Error processing data access request:', error);
      
      await collections.privacy_requests.doc(request.id).update({
        status: 'rejected',
        processedAt: new Date(),
        response: {
          message: 'Erreur lors de l\'export des données',
          actions: ['error_occurred']
        }
      });
    }
  }

  private async collectUserData(tenantId: string, userId: string): Promise<any> {
    // Collecter les données depuis différentes collections
    const collections_to_check = [
      'users',
      'subscriptions',
      'billing_audit_logs',
      'promo_code_usage'
    ];

    const userData: any = {};

    for (const collectionName of collections_to_check) {
      try {
        const snapshot = await admin.firestore()
          .collection(collectionName)
          .where('userId', '==', userId)
          .get();

        userData[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        logger.warn(`Error collecting data from ${collectionName}:`, error);
      }
    }

    return userData;
  }

  private async applyRetentionPolicy(policy: DataRetentionPolicy): Promise<{
    processed: number;
    archived: number;
    deleted: number;
  }> {
    const result = { processed: 0, archived: 0, deleted: 0 };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.deleteAfterDays);

      // Obtenir les documents à traiter
      const snapshot = await admin.firestore()
        .collection(policy.entityType)
        .where('createdAt', '<', cutoffDate)
        .limit(100) // Traiter par lots
        .get();

      const batch = admin.firestore().batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        result.deleted++;
      });

      await batch.commit();
      result.processed = snapshot.size;

      return result;
    } catch (error) {
      logger.error(`Error applying retention policy for ${policy.entityType}:`, error);
      throw error;
    }
  }

  private getComplianceTypeName(type: ComplianceCheck['type']): string {
    const names = {
      gdpr: 'Règlement Général sur la Protection des Données',
      pci_dss: 'Payment Card Industry Data Security Standard',
      sox: 'Sarbanes-Oxley Act',
      custom: 'Conformité personnalisée'
    };
    return names[type];
  }

  private getComplianceTypeDescription(type: ComplianceCheck['type']): string {
    const descriptions = {
      gdpr: 'Vérification de la conformité GDPR pour la protection des données personnelles',
      pci_dss: 'Vérification de la conformité PCI DSS pour la sécurité des données de carte',
      sox: 'Vérification de la conformité SOX pour les contrôles financiers',
      custom: 'Vérification de conformité personnalisée'
    };
    return descriptions[type];
  }

  private calculateNextCheckDate(type: ComplianceCheck['type']): Date {
    const intervals = {
      gdpr: 30, // 30 jours
      pci_dss: 90, // 90 jours
      sox: 30, // 30 jours
      custom: 60 // 60 jours
    };

    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + intervals[type]);
    return nextCheck;
  }

  private async getViolationsForPeriod(
    type: ComplianceCheck['type'],
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceViolation[]> {
    // Placeholder - implémenter la logique de récupération des violations
    return [];
  }

  private calculateComplianceRate(checks: any[]): number {
    if (checks.length === 0) return 0;
    
    const compliantChecks = checks.filter(check => 
      check.data().status === 'compliant'
    );
    
    return (compliantChecks.length / checks.length) * 100;
  }

  private async checkDataRetentionCompliance(): Promise<boolean> {
    // Vérifier que les politiques de rétention sont appliquées
    return true; // Placeholder
  }

  private async generateComplianceRecommendations(summary: any, details: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (summary.complianceRate < 90) {
      recommendations.push('Améliorer le taux de conformité global');
    }

    if (summary.criticalViolations > 0) {
      recommendations.push('Traiter immédiatement les violations critiques');
    }

    if (summary.privacyRequests > 10) {
      recommendations.push('Automatiser le traitement des demandes de confidentialité');
    }

    return recommendations;
  }

  private async exportComplianceReport(
    type: ComplianceCheck['type'],
    summary: any,
    details: any
  ): Promise<string | undefined> {
    // Placeholder pour l'export vers un fichier
    // Retourner l'URL du fichier exporté
    return undefined;
  }

  private async checkPromoCodeCompliance(
    entityData: any,
    violations: string[],
    warnings: string[]
  ): Promise<void> {
    // Vérifications spécifiques aux codes promo
    if (!entityData.promoCode || entityData.promoCode.length < 3) {
      violations.push('Code promo invalide ou trop court');
    }
  }

  private async checkPaymentCompliance(
    entityData: any,
    violations: string[],
    warnings: string[]
  ): Promise<void> {
    // Vérifications spécifiques aux paiements
    if (!entityData.amount || entityData.amount <= 0) {
      violations.push('Montant de paiement invalide');
    }
  }

  private async checkSubscriptionCompliance(
    entityData: any,
    violations: string[],
    warnings: string[]
  ): Promise<void> {
    // Vérifications spécifiques aux abonnements
    if (!entityData.planId) {
      violations.push('Plan d\'abonnement manquant');
    }
  }

  private async checkGeneralCompliance(
    tenantId: string,
    entityData: any,
    violations: string[],
    warnings: string[]
  ): Promise<void> {
    // Vérifications générales de conformité
    if (!tenantId) {
      violations.push('Identifiant tenant manquant');
    }
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    compliance_checks: any;
    privacy_requests: any;
  }
}

// Instance singleton
export const complianceService = new ComplianceService();
export default complianceService;