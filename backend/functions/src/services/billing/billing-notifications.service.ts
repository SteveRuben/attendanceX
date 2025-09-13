/**
 * Service de notifications de facturation
 * Gère les alertes et notifications liées à la facturation
 */

import { collections } from '../../config/database';
import { TenantError, TenantErrorCode } from '../../shared/types/tenant.types';

export interface BillingAlert {
  id: string;
  tenantId: string;
  type: BillingAlertType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  dismissedAt?: Date;
  metadata?: Record<string, any>;
}

export enum BillingAlertType {
  USAGE_WARNING = 'usage_warning',
  USAGE_LIMIT_EXCEEDED = 'usage_limit_exceeded',
  PAYMENT_FAILED = 'payment_failed',
  TRIAL_ENDING = 'trial_ending',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  INVOICE_OVERDUE = 'invoice_overdue',
  PLAN_UPGRADE_RECOMMENDED = 'plan_upgrade_recommended'
}

export interface CreateBillingAlertRequest {
  tenantId: string;
  type: BillingAlertType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
}

export class BillingNotificationsService {

  /**
   * Créer une alerte de facturation
   */
  async createAlert(request: CreateBillingAlertRequest): Promise<BillingAlert> {
    try {
      const now = new Date();
      const alertData: Omit<BillingAlert, 'id'> = {
        ...request,
        createdAt: now
      };

      const alertRef = await collections.billing_alerts.add(alertData);

      return {
        id: alertRef.id,
        ...alertData
      };
    } catch (error) {
      console.error('Error creating billing alert:', error);
      throw new TenantError(
        'Failed to create billing alert',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir les alertes d'un tenant
   */
  async getAlertsByTenant(tenantId: string, includesDismissed: boolean = false): Promise<BillingAlert[]> {
    try {
      let query = collections.billing_alerts
        .where('tenantId', '==', tenantId);

      if (!includesDismissed) {
        query = query.where('dismissedAt', '==', null);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BillingAlert));
    } catch (error) {
      console.error('Error getting billing alerts:', error);
      return [];
    }
  }

  /**
   * Marquer une alerte comme lue
   */
  async dismissAlert(alertId: string, tenantId: string): Promise<void> {
    try {
      const alertDoc = await collections.billing_alerts.doc(alertId).get();
      
      if (!alertDoc.exists) {
        throw new TenantError(
          'Alert not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const alertData = alertDoc.data() as BillingAlert;
      if (alertData.tenantId !== tenantId) {
        throw new TenantError(
          'Access denied',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      await collections.billing_alerts.doc(alertId).update({
        dismissedAt: new Date()
      });
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error dismissing billing alert:', error);
      throw new TenantError(
        'Failed to dismiss alert',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Créer une alerte d'avertissement d'usage
   */
  async createUsageWarningAlert(
    tenantId: string, 
    metric: string, 
    currentUsage: number, 
    limit: number,
    percentage: number
  ): Promise<BillingAlert> {
    const title = `Limite de ${metric} bientôt atteinte`;
    const message = `Vous avez utilisé ${percentage}% de votre limite de ${metric} (${currentUsage}/${limit}). Considérez une mise à niveau de votre plan.`;

    return this.createAlert({
      tenantId,
      type: BillingAlertType.USAGE_WARNING,
      title,
      message,
      severity: 'warning',
      actionUrl: '/billing?tab=plans',
      actionText: 'Voir les plans',
      metadata: {
        metric,
        currentUsage,
        limit,
        percentage
      }
    });
  }

  /**
   * Créer une alerte de dépassement de limite
   */
  async createUsageLimitExceededAlert(
    tenantId: string,
    metric: string,
    currentUsage: number,
    limit: number,
    overageAmount: number
  ): Promise<BillingAlert> {
    const title = `Limite de ${metric} dépassée`;
    const message = `Vous avez dépassé votre limite de ${metric} de ${overageAmount} unités. Des frais supplémentaires s'appliquent.`;

    return this.createAlert({
      tenantId,
      type: BillingAlertType.USAGE_LIMIT_EXCEEDED,
      title,
      message,
      severity: 'error',
      actionUrl: '/billing?tab=usage',
      actionText: 'Voir l\'utilisation',
      metadata: {
        metric,
        currentUsage,
        limit,
        overageAmount
      }
    });
  }

  /**
   * Créer une alerte d'échec de paiement
   */
  async createPaymentFailedAlert(
    tenantId: string,
    invoiceId: string,
    amount: number,
    currency: string
  ): Promise<BillingAlert> {
    const title = 'Échec du paiement';
    const message = `Le paiement de votre facture de ${amount} ${currency} a échoué. Veuillez mettre à jour votre méthode de paiement.`;

    return this.createAlert({
      tenantId,
      type: BillingAlertType.PAYMENT_FAILED,
      title,
      message,
      severity: 'error',
      actionUrl: '/billing?tab=payment-methods',
      actionText: 'Mettre à jour le paiement',
      metadata: {
        invoiceId,
        amount,
        currency
      }
    });
  }

  /**
   * Créer une alerte de fin d'essai
   */
  async createTrialEndingAlert(
    tenantId: string,
    daysRemaining: number
  ): Promise<BillingAlert> {
    const title = 'Votre essai se termine bientôt';
    const message = `Votre période d'essai se termine dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}. Choisissez un plan pour continuer à utiliser le service.`;

    return this.createAlert({
      tenantId,
      type: BillingAlertType.TRIAL_ENDING,
      title,
      message,
      severity: 'warning',
      actionUrl: '/billing?tab=plans',
      actionText: 'Choisir un plan',
      metadata: {
        daysRemaining
      }
    });
  }

  /**
   * Créer une alerte d'annulation d'abonnement
   */
  async createSubscriptionCancelledAlert(
    tenantId: string,
    cancelAtPeriodEnd: boolean,
    endDate?: Date
  ): Promise<BillingAlert> {
    const title = 'Abonnement annulé';
    const message = cancelAtPeriodEnd && endDate
      ? `Votre abonnement sera annulé le ${endDate.toLocaleDateString('fr-FR')}. Vous pouvez le réactiver à tout moment.`
      : 'Votre abonnement a été annulé immédiatement. Vous pouvez vous réabonner à tout moment.';

    return this.createAlert({
      tenantId,
      type: BillingAlertType.SUBSCRIPTION_CANCELLED,
      title,
      message,
      severity: 'info',
      actionUrl: '/billing?tab=plans',
      actionText: 'Réactiver l\'abonnement',
      metadata: {
        cancelAtPeriodEnd,
        endDate: endDate?.toISOString()
      }
    });
  }

  /**
   * Vérifier et créer des alertes d'usage automatiques
   */
  async checkAndCreateUsageAlerts(tenantId: string, usage: any, limits: any): Promise<void> {
    const metrics = [
      { key: 'users', name: 'utilisateurs', current: usage.users, limit: limits.maxUsers },
      { key: 'events', name: 'événements', current: usage.events, limit: limits.maxEvents },
      { key: 'storage', name: 'stockage', current: usage.storage, limit: limits.maxStorage },
      { key: 'apiCalls', name: 'appels API', current: usage.apiCalls, limit: limits.apiCallsPerMonth }
    ];

    for (const metric of metrics) {
      if (metric.limit === -1) continue; // Illimité

      const percentage = (metric.current / metric.limit) * 100;

      // Alerte à 90% d'utilisation
      if (percentage >= 90 && percentage < 100) {
        // Vérifier si une alerte similaire n'existe pas déjà
        const existingAlerts = await this.getAlertsByTenant(tenantId);
        const hasExistingWarning = existingAlerts.some(alert => 
          alert.type === BillingAlertType.USAGE_WARNING &&
          alert.metadata?.metric === metric.key
        );

        if (!hasExistingWarning) {
          await this.createUsageWarningAlert(
            tenantId,
            metric.name,
            metric.current,
            metric.limit,
            Math.round(percentage)
          );
        }
      }

      // Alerte de dépassement
      if (percentage >= 100) {
        const existingAlerts = await this.getAlertsByTenant(tenantId);
        const hasExistingOverage = existingAlerts.some(alert => 
          alert.type === BillingAlertType.USAGE_LIMIT_EXCEEDED &&
          alert.metadata?.metric === metric.key
        );

        if (!hasExistingOverage) {
          await this.createUsageLimitExceededAlert(
            tenantId,
            metric.name,
            metric.current,
            metric.limit,
            metric.current - metric.limit
          );
        }
      }
    }
  }
}

// Ajouter la collection manquante
declare module '../../config/database' {
  interface Collections {
    billing_alerts: any;
  }
}

// Instance singleton
export const billingNotificationsService = new BillingNotificationsService();
export default billingNotificationsService;