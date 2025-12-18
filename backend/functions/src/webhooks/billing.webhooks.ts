/**
 * Service de webhooks pour le système de billing
 * Gère les événements Stripe, les intégrations avec les systèmes d'analytics et les webhooks partenaires
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { collections } from '../config/database';
import { stripePaymentService } from '../services/billing/stripe-payment.service';
import { stripePromoCodeService } from '../integrations/stripe/stripe.service';
import { billingAuditService, BillingAction, BillingEntityType } from '../services/billing/billing-audit.service';
import { notificationService } from '../services/notification/notification.service';
import { gracePeriodService } from '../services/gracePeriod/gracePeriod.service';

export interface WebhookEvent {
  id: string;
  source: 'stripe' | 'analytics' | 'partner' | 'internal';
  type: string;
  data: any;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata: {
    signature?: string;
    partnerId?: string;
    headers?: Record<string, string>;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AnalyticsEvent {
  eventType: 'subscription_created' | 'subscription_cancelled' | 'payment_success' | 'payment_failed' |
  'promo_code_applied' | 'grace_period_started' | 'grace_period_converted' | 'plan_changed';
  tenantId: string;
  userId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  revenue?: number;
  currency?: string;
}

export interface PartnerWebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  headers?: Record<string, string>;
}

export class BillingWebhooksService {

  /**
   * Traiter un webhook Stripe
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body;

      if (!signature) {
        res.status(400).json({ error: 'Missing Stripe signature' });
        return;
      }

      // Enregistrer l'événement webhook
      const webhookEvent = await this.saveWebhookEvent({
        source: 'stripe',
        type: 'stripe_webhook',
        data: payload,
        metadata: {
          signature,
          headers: req.headers as Record<string, string>,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      // Traiter le webhook Stripe principal
      const stripeResult = await stripePaymentService.handleStripeWebhook(payload, signature);

      // Traiter les événements liés aux codes promo
      let promoCodeProcessed = false;
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

        const promoCodeEvents = [
          'coupon.created', 'coupon.updated', 'coupon.deleted',
          'promotion_code.created', 'promotion_code.updated',
          'customer.discount.created', 'customer.discount.deleted'
        ];

        if (promoCodeEvents.includes(event.type)) {
          promoCodeProcessed = await stripePromoCodeService.handlePromoCodeWebhook(event);
        }

        // Traiter les événements spécifiques au billing
        await this.processStripeEvent(event);

        // Envoyer aux systèmes d'analytics
        await this.sendToAnalytics(event);

        // Notifier les partenaires
        await this.notifyPartners(event);

      } catch (error) {
        logger.error('Error processing Stripe webhook:', error);
      }

      // Marquer comme traité
      await this.markWebhookProcessed(webhookEvent.id, stripeResult.processed && promoCodeProcessed);

      res.status(200).json({
        success: true,
        received: stripeResult.received,
        processed: stripeResult.processed,
        promoCodeProcessed
      });

    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Traiter un webhook d'analytics
   */
  async handleAnalyticsWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { provider, event } = req.body;

      // Valider le provider
      const supportedProviders = ['mixpanel', 'amplitude', 'segment', 'google_analytics'];
      if (!supportedProviders.includes(provider)) {
        res.status(400).json({ error: 'Unsupported analytics provider' });
        return;
      }

      // Enregistrer l'événement
      const webhookEvent = await this.saveWebhookEvent({
        source: 'analytics',
        type: `${provider}_webhook`,
        data: event,
        metadata: {
          headers: req.headers as Record<string, string>,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      // Traiter l'événement d'analytics
      await this.processAnalyticsEvent(provider, event);

      // Marquer comme traité
      await this.markWebhookProcessed(webhookEvent.id, true);

      res.status(200).json({ success: true, processed: true });

    } catch (error) {
      logger.error('Error handling analytics webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Traiter un webhook partenaire
   */
  async handlePartnerWebhook(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = req.params.partnerId;
      const signature = req.headers['x-partner-signature'] as string;
      const payload = req.body;

      // Obtenir la configuration du partenaire
      const partnerConfig = await this.getPartnerConfig(partnerId);
      if (!partnerConfig) {
        res.status(404).json({ error: 'Partner not found' });
        return;
      }

      // Vérifier la signature
      if (!this.verifyPartnerSignature(payload, signature, partnerConfig.secret)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Enregistrer l'événement
      const webhookEvent = await this.saveWebhookEvent({
        source: 'partner',
        type: `partner_${partnerId}`,
        data: payload,
        metadata: {
          signature,
          partnerId,
          headers: req.headers as Record<string, string>,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      // Traiter l'événement partenaire
      await this.processPartnerEvent(partnerId, payload);

      // Marquer comme traité
      await this.markWebhookProcessed(webhookEvent.id, true);

      res.status(200).json({ success: true, processed: true });

    } catch (error) {
      logger.error('Error handling partner webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Envoyer un événement aux systèmes d'analytics
   */
  async sendToAnalytics(stripeEvent: any): Promise<void> {
    try {
      const analyticsEvent = await this.convertStripeToAnalyticsEvent(stripeEvent);
      if (!analyticsEvent) return;

      // Envoyer à Mixpanel
      await this.sendToMixpanel(analyticsEvent);

      // Envoyer à Google Analytics
      await this.sendToGoogleAnalytics(analyticsEvent);

      // Envoyer à Amplitude
      await this.sendToAmplitude(analyticsEvent);

      logger.info('Analytics event sent', {
        eventType: analyticsEvent.eventType,
        tenantId: analyticsEvent.tenantId
      });

    } catch (error) {
      logger.error('Error sending to analytics:', error);
    }
  }

  /**
   * Notifier les partenaires d'un événement
   */
  async notifyPartners(event: any): Promise<void> {
    try {
      // Obtenir tous les partenaires actifs
      const partners = await this.getActivePartners();

      for (const partner of partners) {
        // Vérifier si le partenaire est intéressé par ce type d'événement
        if (!partner.events.includes(event.type)) continue;

        try {
          await this.sendWebhookToPartner(partner, event);
        } catch (error) {
          logger.error(`Error sending webhook to partner ${partner.id}:`, error);
        }
      }

    } catch (error) {
      logger.error('Error notifying partners:', error);
    }
  }

  /**
   * Traiter les événements Stripe spécifiques au billing
   */
  private async processStripeEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.discount.created':
          await this.handleDiscountApplied(event.data.object);
          break;

        case 'customer.discount.deleted':
          await this.handleDiscountRemoved(event.data.object);
          break;

        default:
          logger.info(`Unhandled Stripe event: ${event.type}`);
      }
    } catch (error) {
      logger.error(`Error processing Stripe event ${event.type}:`, error);
    }
  }

  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    try {
      const tenantId = subscription.metadata?.tenantId;
      if (!tenantId) return;

      // Logger l'audit
      await billingAuditService.logBillingAction({
        tenantId,
        userId: 'stripe_webhook',
        action: BillingAction.SUBSCRIPTION_CREATED,
        entityType: BillingEntityType.SUBSCRIPTION,
        entityId: subscription.id,
        newValues: { subscription },
        metadata: {
          source: 'webhook',
          stripeSubscriptionId: subscription.id
        },
        severity: 'low'
      });

      // Envoyer une notification
      await notificationService.sendNotification({
        userId: tenantId,
        type: 'subscription_created' as any,
        title: 'Abonnement créé',
        message: `Votre abonnement au plan "${subscription.items?.data[0]?.price?.nickname || 'Plan'}" a été créé avec succès`,
        data: {
          subscriptionId: subscription.id,
          planName: subscription.items?.data[0]?.price?.nickname || 'Plan',
          amount: subscription.items?.data[0]?.price?.unit_amount / 100
        },
        channels: ['email' as any, 'in_app' as any],
        sentBy: 'stripe_webhook'
      });

    } catch (error) {
      logger.error('Error handling subscription created:', error);
    }
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    try {
      const tenantId = subscription.metadata?.tenantId;
      if (!tenantId) return;

      await billingAuditService.logBillingAction({
        tenantId,
        userId: 'stripe_webhook',
        action: BillingAction.SUBSCRIPTION_UPDATED,
        entityType: BillingEntityType.SUBSCRIPTION,
        entityId: subscription.id,
        newValues: { subscription },
        metadata: {
          source: 'webhook',
          stripeSubscriptionId: subscription.id
        },
        severity: 'low'
      });

    } catch (error) {
      logger.error('Error handling subscription updated:', error);
    }
  }

  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    try {
      const tenantId = subscription.metadata?.tenantId;
      if (!tenantId) return;

      await billingAuditService.logBillingAction({
        tenantId,
        userId: 'stripe_webhook',
        action: BillingAction.SUBSCRIPTION_CANCELLED,
        entityType: BillingEntityType.SUBSCRIPTION,
        entityId: subscription.id,
        newValues: { subscription },
        metadata: {
          source: 'webhook',
          stripeSubscriptionId: subscription.id
        },
        severity: 'medium'
      });

      // Démarrer une période de grâce si applicable
      await gracePeriodService.createGracePeriod(
        tenantId, // userId
        tenantId, // tenantId
        {
          durationDays: 14,
          source: 'subscription_cancelled' as any,
          sourceDetails: {
            stripeSubscriptionId: subscription.id,
            reason: 'subscription_cancelled'
          },
          metadata: {
            webhookSource: 'stripe',
            originalSubscriptionId: subscription.id
          }
        }
      );

    } catch (error) {
      logger.error('Error handling subscription cancelled:', error);
    }
  }

  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    try {
      const tenantId = invoice.customer_details?.metadata?.tenantId ||
        invoice.subscription?.metadata?.tenantId;
      if (!tenantId) return;

      await billingAuditService.logBillingAction({
        tenantId,
        userId: 'stripe_webhook',
        action: BillingAction.PAYMENT_SUCCESS,
        entityType: BillingEntityType.PAYMENT,
        entityId: invoice.id,
        newValues: {
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          invoice
        },
        metadata: {
          source: 'webhook',
          stripeInvoiceId: invoice.id
        },
        severity: 'low'
      });

      // Envoyer une notification de paiement réussi
      await notificationService.sendNotification({
        userId: tenantId,
        type: 'payment_success' as any,
        title: 'Paiement réussi',
        message: `Votre paiement de ${invoice.amount_paid / 100}€ a été traité avec succès`,
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid / 100
        },
        channels: ['email' as any, 'in_app' as any],
        sentBy: 'stripe_webhook'
      });

    } catch (error) {
      logger.error('Error handling payment succeeded:', error);
    }
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      const tenantId = invoice.customer_details?.metadata?.tenantId ||
        invoice.subscription?.metadata?.tenantId;
      if (!tenantId) return;

      await billingAuditService.logBillingAction({
        tenantId,
        userId: 'stripe_webhook',
        action: BillingAction.PAYMENT_FAILED,
        entityType: BillingEntityType.PAYMENT,
        entityId: invoice.id,
        newValues: {
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          invoice
        },
        metadata: {
          source: 'webhook',
          stripeInvoiceId: invoice.id
        },
        severity: 'high'
      });

      // Envoyer une notification de paiement échoué
      await notificationService.sendNotification({
        userId: tenantId,
        type: 'payment_failed' as any,
        title: 'Échec du paiement',
        message: `Le paiement de ${invoice.amount_due / 100}€ a échoué. Veuillez vérifier vos informations de paiement`,
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount_due / 100
        },
        channels: ['email' as any, 'sms' as any, 'in_app' as any],
        priority: 'high' as any,
        sentBy: 'stripe_webhook'
      });

    } catch (error) {
      logger.error('Error handling payment failed:', error);
    }
  }

  private async handleDiscountApplied(discount: any): Promise<void> {
    try {
      const tenantId = discount.customer?.metadata?.tenantId;
      if (!tenantId) return;

      const promoCodeId = discount.coupon?.metadata?.promoCodeId;
      if (promoCodeId) {
        await billingAuditService.logBillingAction({
          tenantId,
          userId: 'stripe_webhook',
          action: BillingAction.PROMO_CODE_APPLIED,
          entityType: BillingEntityType.PROMO_CODE,
          entityId: promoCodeId,
          newValues: { discount },
          metadata: {
            source: 'webhook',
            stripeCouponId: discount.coupon.id
          },
          severity: 'low'
        });
      }

    } catch (error) {
      logger.error('Error handling discount applied:', error);
    }
  }

  private async handleDiscountRemoved(discount: any): Promise<void> {
    try {
      const tenantId = discount.customer?.metadata?.tenantId;
      if (!tenantId) return;

      const promoCodeId = discount.coupon?.metadata?.promoCodeId;
      if (promoCodeId) {
        await billingAuditService.logBillingAction({
          tenantId,
          userId: 'stripe_webhook',
          action: BillingAction.PROMO_CODE_REMOVED,
          entityType: BillingEntityType.PROMO_CODE,
          entityId: promoCodeId,
          newValues: { discount },
          metadata: {
            source: 'webhook',
            stripeCouponId: discount.coupon.id
          },
          severity: 'low'
        });
      }

    } catch (error) {
      logger.error('Error handling discount removed:', error);
    }
  }

  private async saveWebhookEvent(eventData: Omit<WebhookEvent, 'id' | 'processed' | 'retryCount' | 'maxRetries' | 'timestamp'>): Promise<WebhookEvent> {
    const webhookEvent: WebhookEvent = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      processed: false,
      retryCount: 0,
      maxRetries: 3,
      ...eventData
    };

    await collections.webhook_events.doc(webhookEvent.id).set(webhookEvent);
    return webhookEvent;
  }

  private async markWebhookProcessed(webhookId: string, success: boolean, error?: string): Promise<void> {
    await collections.webhook_events.doc(webhookId).update({
      processed: success,
      processedAt: new Date(),
      error: error || null
    });
  }

  private async convertStripeToAnalyticsEvent(stripeEvent: any): Promise<AnalyticsEvent | null> {
    const eventTypeMap: Record<string, AnalyticsEvent['eventType']> = {
      'customer.subscription.created': 'subscription_created',
      'customer.subscription.deleted': 'subscription_cancelled',
      'invoice.payment_succeeded': 'payment_success',
      'invoice.payment_failed': 'payment_failed',
      'customer.discount.created': 'promo_code_applied'
    };

    const eventType = eventTypeMap[stripeEvent.type];
    if (!eventType) return null;

    const tenantId = stripeEvent.data.object.metadata?.tenantId;
    if (!tenantId) return null;

    return {
      eventType,
      tenantId,
      timestamp: new Date(stripeEvent.created * 1000),
      properties: {
        stripeEventId: stripeEvent.id,
        stripeEventType: stripeEvent.type,
        ...stripeEvent.data.object
      },
      revenue: this.extractRevenue(stripeEvent),
      currency: stripeEvent.data.object.currency || 'eur'
    };
  }

  private extractRevenue(stripeEvent: any): number | undefined {
    switch (stripeEvent.type) {
      case 'invoice.payment_succeeded':
        return stripeEvent.data.object.amount_paid / 100;
      case 'customer.subscription.created':
        return stripeEvent.data.object.items?.data[0]?.price?.unit_amount / 100;
      default:
        return undefined;
    }
  }

  private async sendToMixpanel(event: AnalyticsEvent): Promise<void> {
    try {
      // Implémenter l'envoi vers Mixpanel
      logger.info('Sending event to Mixpanel', { eventType: event.eventType });
    } catch (error) {
      logger.error('Error sending to Mixpanel:', error);
    }
  }

  private async sendToGoogleAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      // Implémenter l'envoi vers Google Analytics
      logger.info('Sending event to Google Analytics', { eventType: event.eventType });
    } catch (error) {
      logger.error('Error sending to Google Analytics:', error);
    }
  }

  private async sendToAmplitude(event: AnalyticsEvent): Promise<void> {
    try {
      // Implémenter l'envoi vers Amplitude
      logger.info('Sending event to Amplitude', { eventType: event.eventType });
    } catch (error) {
      logger.error('Error sending to Amplitude:', error);
    }
  }

  private async processAnalyticsEvent(provider: string, event: any): Promise<void> {
    try {
      // Traiter l'événement d'analytics selon le provider
      logger.info(`Processing analytics event from ${provider}`, { event });
    } catch (error) {
      logger.error('Error processing analytics event:', error);
    }
  }

  private async processPartnerEvent(partnerId: string, payload: any): Promise<void> {
    try {
      // Traiter l'événement partenaire
      logger.info(`Processing partner event from ${partnerId}`, { payload });
    } catch (error) {
      logger.error('Error processing partner event:', error);
    }
  }

  private async getPartnerConfig(partnerId: string): Promise<PartnerWebhookConfig | null> {
    try {
      const doc = await collections.partner_webhook_configs.doc(partnerId).get();
      return doc.exists ? doc.data() as PartnerWebhookConfig : null;
    } catch (error) {
      logger.error('Error getting partner config:', error);
      return null;
    }
  }

  private async getActivePartners(): Promise<PartnerWebhookConfig[]> {
    try {
      const snapshot = await collections.partner_webhook_configs
        .where('enabled', '==', true)
        .get();

      return snapshot.docs.map(doc => doc.data() as PartnerWebhookConfig);
    } catch (error) {
      logger.error('Error getting active partners:', error);
      return [];
    }
  }

  private verifyPartnerSignature(payload: any, signature: string, secret: string): boolean {
    try {
      // Implémenter la vérification de signature partenaire
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      logger.error('Error verifying partner signature:', error);
      return false;
    }
  }

  private async sendWebhookToPartner(partner: PartnerWebhookConfig, event: any): Promise<void> {
    try {
      const axios = require('axios');

      const payload = {
        id: event.id,
        type: event.type,
        data: event.data,
        timestamp: new Date().toISOString()
      };

      const signature = this.generatePartnerSignature(payload, partner.secret);

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        ...partner.headers
      };

      await axios.post(partner.url, payload, { headers });

      logger.info(`Webhook sent to partner ${partner.id}`, {
        url: partner.url,
        eventType: event.type
      });

    } catch (error) {
      logger.error(`Error sending webhook to partner ${partner.id}:`, error);

      // Implémenter la logique de retry si nécessaire
      await this.scheduleWebhookRetry(partner, event);
    }
  }

  private generatePartnerSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private async scheduleWebhookRetry(partner: PartnerWebhookConfig, event: any): Promise<void> {
    try {
      // Implémenter la logique de retry avec backoff exponentiel
      logger.info(`Scheduling webhook retry for partner ${partner.id}`);
    } catch (error) {
      logger.error('Error scheduling webhook retry:', error);
    }
  }
}

// Ajouter les collections manquantes
declare module '../config/database' {
  interface Collections {
    webhook_events: any;
    partner_webhook_configs: any;
  }
}

// Instance singleton
export const billingWebhooksService = new BillingWebhooksService();
export default billingWebhooksService;