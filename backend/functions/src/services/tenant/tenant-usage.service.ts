/**
 * Service de suivi d'usage des tenants
 * Gère le tracking des métriques d'utilisation et les alertes de limites
 */

import { collections } from '../../config/database';
import { tenantService } from './tenant.service';
import { getPlanById } from '../../config/default-plans';
import { FieldValue } from 'firebase-admin/firestore';
import { SubscriptionPlan, TenantError, TenantErrorCode, TenantUsage } from '../../common/types';

export interface UsageMetric {
  tenantId: string;
  metric: keyof TenantUsage;
  value: number;
  timestamp: Date;
  source: string; // 'api', 'ui', 'system', etc.
  metadata?: Record<string, any>;
}

export interface UsageAlert {
  id: string;
  tenantId: string;
  metric: keyof TenantUsage;
  currentValue: number;
  limit: number;
  percentage: number;
  alertType: 'warning' | 'critical' | 'exceeded';
  isActive: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface UsageReport {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: TenantUsage;
  limits: SubscriptionPlan['limits'];
  percentages: Record<keyof TenantUsage, number>;
  alerts: UsageAlert[];
  trends: Record<keyof TenantUsage, {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  }>;
}

export class TenantUsageService {
  private readonly WARNING_THRESHOLD = 80; // 80% de la limite
  private readonly CRITICAL_THRESHOLD = 95; // 95% de la limite

  /**
   * Incrémenter l'usage d'une métrique pour un tenant
   */
  async incrementUsage(
    tenantId: string,
    metric: keyof TenantUsage,
    increment: number = 1,
    source: string = 'system',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Mettre à jour l'usage dans le tenant
      await collections.tenants.doc(tenantId).update({
        [`usage.${metric}`]: FieldValue.increment(increment),
        updatedAt: new Date()
      });

      // Enregistrer la métrique pour l'historique
      await this.recordUsageMetric({
        tenantId,
        metric,
        value: increment,
        timestamp: new Date(),
        source,
        metadata
      });

      // Vérifier les limites et créer des alertes si nécessaire
      await this.checkUsageLimits(tenantId, metric);

    } catch (error) {
      console.error('Error incrementing usage:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to increment usage',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Décrémenter l'usage d'une métrique pour un tenant
   */
  async decrementUsage(
    tenantId: string,
    metric: keyof TenantUsage,
    decrement: number = 1,
    source: string = 'system',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // S'assurer que l'usage ne devient pas négatif
      const currentUsage = tenant.usage[metric] || 0;
      const newUsage = Math.max(0, currentUsage - decrement);
      const actualDecrement = currentUsage - newUsage;

      if (actualDecrement > 0) {
        // Mettre à jour l'usage dans le tenant
        await collections.tenants.doc(tenantId).update({
          [`usage.${metric}`]: newUsage,
          updatedAt: new Date()
        });

        // Enregistrer la métrique pour l'historique
        await this.recordUsageMetric({
          tenantId,
          metric,
          value: -actualDecrement,
          timestamp: new Date(),
          source,
          metadata
        });

        // Vérifier si des alertes peuvent être résolues
        await this.checkUsageLimits(tenantId, metric);
      }

    } catch (error) {
      console.error('Error decrementing usage:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to decrement usage',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Définir directement l'usage d'une métrique
   */
  async setUsage(
    tenantId: string,
    metric: keyof TenantUsage,
    value: number,
    source: string = 'system',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Vérifier que le tenant existe
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const previousValue = tenant.usage[metric] || 0;
      const change = value - previousValue;

      // Mettre à jour l'usage dans le tenant
      await collections.tenants.doc(tenantId).update({
        [`usage.${metric}`]: Math.max(0, value),
        updatedAt: new Date()
      });

      // Enregistrer la métrique pour l'historique
      await this.recordUsageMetric({
        tenantId,
        metric,
        value: change,
        timestamp: new Date(),
        source,
        metadata: {
          ...metadata,
          previousValue,
          newValue: value,
          type: 'set'
        }
      });

      // Vérifier les limites
      await this.checkUsageLimits(tenantId, metric);

    } catch (error) {
      console.error('Error setting usage:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to set usage',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir l'usage actuel d'un tenant
   */
  async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      return tenant.usage;
    } catch (error) {
      console.error('Error getting tenant usage:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to get tenant usage',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Vérifier si un tenant a atteint ses limites
   */
  async checkUsageLimits(tenantId: string, metric?: keyof TenantUsage): Promise<UsageAlert[]> {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const plan = getPlanById(tenant.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const alerts: UsageAlert[] = [];
      const metricsToCheck = metric ? [metric] : Object.keys(tenant.usage) as Array<keyof TenantUsage>;

      for (const metricKey of metricsToCheck) {
        const currentUsage = tenant.usage[metricKey] || 0;
        const limit = plan.limits[metricKey as keyof typeof plan.limits];

        // -1 signifie illimité
        if (limit === -1) {
          continue;
        }

        const percentage = (currentUsage / limit) * 100;
        let alertType: UsageAlert['alertType'] | null = null;

        if (percentage >= 100) {
          alertType = 'exceeded';
        } else if (percentage >= this.CRITICAL_THRESHOLD) {
          alertType = 'critical';
        } else if (percentage >= this.WARNING_THRESHOLD) {
          alertType = 'warning';
        }

        if (alertType) {
          const alert = await this.createOrUpdateAlert(
            tenantId,
            metricKey,
            currentUsage,
            limit,
            percentage,
            alertType
          );
          alerts.push(alert);
        } else {
          // Résoudre les alertes existantes si l'usage est revenu en dessous du seuil
          await this.resolveAlert(tenantId, metricKey);
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error checking usage limits:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Générer un rapport d'usage pour un tenant
   */
  async generateUsageReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageReport> {
    try {
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const plan = getPlanById(tenant.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Calculer les pourcentages d'usage
      const percentages: Record<keyof TenantUsage, number> = {} as any;
      Object.keys(tenant.usage).forEach(key => {
        const metricKey = key as keyof TenantUsage;
        const usage = tenant.usage[metricKey] || 0;
        const limit = plan.limits[metricKey as keyof typeof plan.limits];
        percentages[metricKey] = limit === -1 ? 0 : (usage / limit) * 100;
      });

      // Obtenir les alertes actives
      const alerts = await this.getActiveAlerts(tenantId);

      // Calculer les tendances (comparaison avec la période précédente)
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const trends = await this.calculateUsageTrends(tenantId, previousPeriodStart, startDate, startDate, endDate);

      return {
        tenantId,
        period: {
          start: startDate,
          end: endDate
        },
        usage: tenant.usage,
        limits: plan.limits,
        percentages,
        alerts,
        trends
      };
    } catch (error) {
      console.error('Error generating usage report:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to generate usage report',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Recalculer l'usage d'un tenant (utile pour la maintenance)
   */
  async recalculateUsage(tenantId: string): Promise<TenantUsage> {
    try {
      // Compter les utilisateurs actifs
      const usersSnapshot = await collections.tenant_memberships
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .get();

      // Compter les événements
      const eventsSnapshot = await collections.events
        .where('tenantId', '==', tenantId)
        .get();

      // Calculer le stockage utilisé (approximation)
      // TODO: Implémenter le calcul réel du stockage
      const storageUsed = 0;

      // Compter les appels API du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const apiCallsSnapshot = await collections.audit_logs
        .where('tenantId', '==', tenantId)
        .where('timestamp', '>=', startOfMonth)
        .where('action', '==', 'api_call')
        .get();

      const recalculatedUsage: TenantUsage = {
        users: usersSnapshot.size,
        events: eventsSnapshot.size,
        storage: storageUsed,
        apiCalls: apiCallsSnapshot.size
      };

      // Mettre à jour dans la base de données
      await collections.tenants.doc(tenantId).update({
        usage: recalculatedUsage,
        updatedAt: new Date()
      });

      return recalculatedUsage;
    } catch (error) {
      console.error('Error recalculating usage:', error);
      throw new TenantError(
        'Failed to recalculate usage',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Enregistrer une métrique d'usage
   */
  private async recordUsageMetric(metric: UsageMetric): Promise<void> {
    try {
      await collections.usage_metrics.add(metric);
    } catch (error) {
      console.error('Error recording usage metric:', error);
      // Ne pas faire échouer l'opération principale pour ça
    }
  }

  /**
   * Créer ou mettre à jour une alerte d'usage
   */
  private async createOrUpdateAlert(
    tenantId: string,
    metric: keyof TenantUsage,
    currentValue: number,
    limit: number,
    percentage: number,
    alertType: UsageAlert['alertType']
  ): Promise<UsageAlert> {
    try {
      // Vérifier s'il existe déjà une alerte active pour cette métrique
      const existingAlertQuery = await collections.usage_alerts
        .where('tenantId', '==', tenantId)
        .where('metric', '==', metric)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      const now = new Date();

      if (!existingAlertQuery.empty) {
        // Mettre à jour l'alerte existante
        const alertDoc = existingAlertQuery.docs[0];
        const existingData = alertDoc.data() as UsageAlert;
        const alertData = {
          currentValue,
          percentage,
          alertType,
          updatedAt: now
        };

        await collections.usage_alerts.doc(alertDoc.id).update(alertData);

        return {
          ...existingData,
          ...alertData,
          id: alertDoc.id
        };
      } else {
        // Créer une nouvelle alerte
        const alertData: Omit<UsageAlert, 'id'> = {
          tenantId,
          metric,
          currentValue,
          limit,
          percentage,
          alertType,
          isActive: true,
          createdAt: now
        };

        const alertRef = await collections.usage_alerts.add(alertData);

        return {
          id: alertRef.id,
          ...alertData
        };
      }
    } catch (error) {
      console.error('Error creating/updating alert:', error);
      throw error;
    }
  }

  /**
   * Résoudre une alerte d'usage
   */
  private async resolveAlert(tenantId: string, metric: keyof TenantUsage): Promise<void> {
    try {
      const alertQuery = await collections.usage_alerts
        .where('tenantId', '==', tenantId)
        .where('metric', '==', metric)
        .where('isActive', '==', true)
        .get();

      const batch = collections.usage_alerts.firestore.batch();
      const now = new Date();

      alertQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          resolvedAt: now
        });
      });

      if (!alertQuery.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Obtenir les alertes actives pour un tenant
   */
  private async getActiveAlerts(tenantId: string): Promise<UsageAlert[]> {
    try {
      const alertsSnapshot = await collections.usage_alerts
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .get();

      return alertsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UsageAlert));
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Calculer les tendances d'usage
   */
  private async calculateUsageTrends(
    tenantId: string,
    previousStart: Date,
    previousEnd: Date,
    currentStart: Date,
    currentEnd: Date
  ): Promise<UsageReport['trends']> {
    try {
      // Pour simplifier, on utilise l'usage actuel comme "current"
      // et on essaie de récupérer des métriques historiques pour "previous"
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const trends: UsageReport['trends'] = {} as any;

      // TODO: Implémenter le calcul des tendances basé sur l'historique des métriques
      // Pour l'instant, on retourne des valeurs par défaut
      Object.keys(tenant.usage).forEach(key => {
        const metricKey = key as keyof TenantUsage;
        const current = tenant.usage[metricKey] || 0;
        const previous = current * 0.9; // Simulation d'une croissance de 10%
        const change = current - previous;
        const changePercent = previous > 0 ? (change / previous) * 100 : 0;

        trends[metricKey] = {
          current,
          previous,
          change,
          changePercent
        };
      });

      return trends;
    } catch (error) {
      console.error('Error calculating usage trends:', error);
      return {} as UsageReport['trends'];
    }
  }
}

// Instance singleton
export const tenantUsageService = new TenantUsageService();
export default tenantUsageService;