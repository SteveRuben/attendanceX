/**
 * Service d'intégration avec les plateformes d'analytics
 * Gère l'envoi d'événements vers Mixpanel, Google Analytics, Amplitude, etc.
 */

import { logger } from 'firebase-functions';
import { collections } from '../../config/database';
import { billingAuditService, BillingAction, BillingEntityType } from '../billing/billing-audit.service';

export interface AnalyticsConfig {
  mixpanel?: {
    token: string;
    enabled: boolean;
  };
  googleAnalytics?: {
    measurementId: string;
    apiSecret: string;
    enabled: boolean;
  };
  amplitude?: {
    apiKey: string;
    enabled: boolean;
  };
  segment?: {
    writeKey: string;
    enabled: boolean;
  };
}

export interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  tenantId?: string;
  timestamp: Date;
  properties: Record<string, any>;
  revenue?: number;
  currency?: string;
  category?: 'billing' | 'subscription' | 'promo_code' | 'grace_period' | 'payment';
}

export interface RevenueEvent extends AnalyticsEvent {
  revenue: number;
  currency: string;
  productId?: string;
  planName?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export class AnalyticsIntegrationService {

  private config: AnalyticsConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Envoyer un événement de billing vers toutes les plateformes configurées
   */
  async trackBillingEvent(event: AnalyticsEvent): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; error?: string }>;
  }> {
    const results: Record<string, { success: boolean; error?: string }> = {};

    try {
      // Envoyer vers Mixpanel
      if (this.config.mixpanel?.enabled) {
        try {
          await this.sendToMixpanel(event);
          results.mixpanel = { success: true };
        } catch (error) {
          results.mixpanel = { success: false, error: String(error) };
        }
      }

      // Envoyer vers Google Analytics
      if (this.config.googleAnalytics?.enabled) {
        try {
          await this.sendToGoogleAnalytics(event);
          results.googleAnalytics = { success: true };
        } catch (error) {
          results.googleAnalytics = { success: false, error: String(error) };
        }
      }

      // Envoyer vers Amplitude
      if (this.config.amplitude?.enabled) {
        try {
          await this.sendToAmplitude(event);
          results.amplitude = { success: true };
        } catch (error) {
          results.amplitude = { success: false, error: String(error) };
        }
      }

      // Envoyer vers Segment
      if (this.config.segment?.enabled) {
        try {
          await this.sendToSegment(event);
          results.segment = { success: true };
        } catch (error) {
          results.segment = { success: false, error: String(error) };
        }
      }

      // Logger l'audit
      await billingAuditService.logBillingAction({
        tenantId: event.tenantId || 'system',
        userId: event.userId || 'analytics_service',
        action: BillingAction.SUSPICIOUS_ACTIVITY, // Utiliser pour les événements analytics
        entityType: BillingEntityType.TENANT,
        entityId: 'analytics_event',
        newValues: { event, results },
        metadata: {
          source: 'system',
          eventName: event.eventName,
          category: event.category
        },
        severity: 'low'
      });

      const successCount = Object.values(results).filter(r => r.success).length;
      // @ts-ignore
      const totalCount = Object.keys(results).length;

      return {
        success: successCount > 0,
        results
      };

    } catch (error) {
      logger.error('Error tracking billing event:', error);
      return {
        success: false,
        results: { error: { success: false, error: String(error) } }
      };
    }
  }

  /**
   * Tracker un événement de revenus
   */
  async trackRevenueEvent(event: RevenueEvent): Promise<void> {
    try {
      // Ajouter des propriétés spécifiques aux revenus
      const enhancedEvent: AnalyticsEvent = {
        ...event,
        properties: {
          ...event.properties,
          revenue: event.revenue,
          currency: event.currency,
          productId: event.productId,
          planName: event.planName,
          billingCycle: event.billingCycle,
          isRevenueEvent: true
        }
      };

      await this.trackBillingEvent(enhancedEvent);

      // Envoyer également vers les systèmes de revenus spécialisés
      await this.trackRevenueSpecific(event);

    } catch (error) {
      logger.error('Error tracking revenue event:', error);
    }
  }

  /**
   * Tracker les événements de codes promo
   */
  async trackPromoCodeEvent(params: {
    action: 'applied' | 'validated' | 'expired' | 'created';
    promoCode: string;
    tenantId: string;
    userId?: string;
    discountAmount?: number;
    discountPercentage?: number;
    planName?: string;
    originalAmount?: number;
    finalAmount?: number;
  }): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        eventName: `promo_code_${params.action}`,
        userId: params.userId,
        tenantId: params.tenantId,
        timestamp: new Date(),
        category: 'promo_code',
        properties: {
          promoCode: params.promoCode,
          action: params.action,
          discountAmount: params.discountAmount,
          discountPercentage: params.discountPercentage,
          planName: params.planName,
          originalAmount: params.originalAmount,
          finalAmount: params.finalAmount,
          savings: params.originalAmount && params.finalAmount ?
            params.originalAmount - params.finalAmount : params.discountAmount
        }
      };

      // Si c'est une application de code promo avec économies, traiter comme revenus
      if (params.action === 'applied' && params.discountAmount) {
        event.revenue = -params.discountAmount; // Revenus négatifs pour les réductions
        event.currency = 'eur';
      }

      await this.trackBillingEvent(event);

    } catch (error) {
      logger.error('Error tracking promo code event:', error);
    }
  }

  /**
   * Tracker les événements de période de grâce
   */
  async trackGracePeriodEvent(params: {
    action: 'started' | 'converted' | 'expired' | 'extended';
    tenantId: string;
    userId?: string;
    durationDays: number;
    daysRemaining?: number;
    conversionPlan?: string;
    conversionRevenue?: number;
  }): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        eventName: `grace_period_${params.action}`,
        userId: params.userId,
        tenantId: params.tenantId,
        timestamp: new Date(),
        category: 'grace_period',
        properties: {
          action: params.action,
          durationDays: params.durationDays,
          daysRemaining: params.daysRemaining,
          conversionPlan: params.conversionPlan,
          conversionRevenue: params.conversionRevenue
        }
      };

      // Si c'est une conversion, traiter comme revenus
      if (params.action === 'converted' && params.conversionRevenue) {
        event.revenue = params.conversionRevenue;
        event.currency = 'eur';
      }

      await this.trackBillingEvent(event);

    } catch (error) {
      logger.error('Error tracking grace period event:', error);
    }
  }

  /**
   * Tracker les événements d'abonnement
   */
  async trackSubscriptionEvent(params: {
    action: 'created' | 'updated' | 'cancelled' | 'renewed' | 'upgraded' | 'downgraded';
    tenantId: string;
    userId?: string;
    subscriptionId: string;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    currency?: string;
    previousPlan?: string;
    previousAmount?: number;
  }): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        eventName: `subscription_${params.action}`,
        userId: params.userId,
        tenantId: params.tenantId,
        timestamp: new Date(),
        category: 'subscription',
        properties: {
          action: params.action,
          subscriptionId: params.subscriptionId,
          planName: params.planName,
          billingCycle: params.billingCycle,
          amount: params.amount,
          currency: params.currency || 'eur',
          previousPlan: params.previousPlan,
          previousAmount: params.previousAmount,
          planChange: params.previousPlan ?
            `${params.previousPlan} -> ${params.planName}` : undefined,
          revenueChange: params.previousAmount ?
            params.amount - params.previousAmount : undefined
        }
      };

      // Traiter comme revenus pour certaines actions
      if (['created', 'renewed', 'upgraded'].includes(params.action)) {
        event.revenue = params.action === 'upgraded' && params.previousAmount ?
          params.amount - params.previousAmount : params.amount;
        event.currency = params.currency || 'eur';
      }

      await this.trackBillingEvent(event);

    } catch (error) {
      logger.error('Error tracking subscription event:', error);
    }
  }

  /**
   * Obtenir les métriques d'analytics
   */
  async getAnalyticsMetrics(params: {
    startDate: Date;
    endDate: Date;
    tenantId?: string;
    category?: string;
  }): Promise<{
    totalEvents: number;
    totalRevenue: number;
    eventsByCategory: Record<string, number>;
    revenueByCategory: Record<string, number>;
    topEvents: Array<{ eventName: string; count: number }>;
  }> {
    try {
      // Obtenir les événements depuis la base de données
      let query = collections.analytics_events
        .where('timestamp', '>=', params.startDate)
        .where('timestamp', '<=', params.endDate);

      if (params.tenantId) {
        query = query.where('tenantId', '==', params.tenantId);
      }

      if (params.category) {
        query = query.where('category', '==', params.category);
      }

      const snapshot = await query.get();
      const events = snapshot.docs.map(doc => doc.data());

      // Calculer les métriques
      const metrics = {
        totalEvents: events.length,
        totalRevenue: 0,
        eventsByCategory: {} as Record<string, number>,
        revenueByCategory: {} as Record<string, number>,
        topEvents: {} as Record<string, number>
      };

      events.forEach(event => {
        // Compter par catégorie
        const category = event.category || 'unknown';
        metrics.eventsByCategory[category] = (metrics.eventsByCategory[category] || 0) + 1;

        // Compter les revenus
        if (event.revenue) {
          metrics.totalRevenue += event.revenue;
          metrics.revenueByCategory[category] = (metrics.revenueByCategory[category] || 0) + event.revenue;
        }

        // Compter les événements populaires
        metrics.topEvents[event.eventName] = (metrics.topEvents[event.eventName] || 0) + 1;
      });

      // Convertir topEvents en array trié
      const topEventsArray = Object.entries(metrics.topEvents)
        .map(([eventName, count]) => ({ eventName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        ...metrics,
        topEvents: topEventsArray
      };

    } catch (error) {
      logger.error('Error getting analytics metrics:', error);
      throw error;
    }
  }

  // Méthodes privées pour chaque plateforme

  private async sendToMixpanel(event: AnalyticsEvent): Promise<void> {
    try {
      if (!this.config.mixpanel?.token) {
        throw new Error('Mixpanel token not configured');
      }

      const axios = require('axios');

      const mixpanelEvent: {
        event: string;
        properties: Record<string, any>;
      } = {
        event: event.eventName,
        properties: {
          distinct_id: event.userId || event.tenantId,
          tenant_id: event.tenantId,
          time: Math.floor(event.timestamp.getTime() / 1000),
          ...event.properties
        }
      };

      // Ajouter les propriétés de revenus si présentes
      if (event.revenue) {
        mixpanelEvent.properties.$revenue = event.revenue;
        mixpanelEvent.properties.$currency = event.currency || 'EUR';
      }

      const payload = Buffer.from(JSON.stringify(mixpanelEvent)).toString('base64');

      await axios.post('https://api.mixpanel.com/track', null, {
        params: {
          data: payload,
          verbose: 1
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      logger.info('Event sent to Mixpanel', { eventName: event.eventName });

    } catch (error) {
      logger.error('Error sending to Mixpanel:', error);
      throw error;
    }
  }

  private async sendToGoogleAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      if (!this.config.googleAnalytics?.measurementId || !this.config.googleAnalytics?.apiSecret) {
        throw new Error('Google Analytics configuration missing');
      }

      const axios = require('axios');

      const gaEvent: {
        client_id: string;
        events: Array<{
          name: string;
          parameters: Record<string, any>;
        }>;
      } = {
        client_id: event.userId || event.tenantId || 'anonymous',
        events: [{
          name: event.eventName.replace(/[^a-zA-Z0-9_]/g, '_'), // GA4 event name restrictions
          parameters: {
            tenant_id: event.tenantId,
            category: event.category,
            ...event.properties
          }
        }]
      };

      // Ajouter les paramètres de revenus si présents
      if (event.revenue) {
        gaEvent.events[0].parameters.value = event.revenue;
        gaEvent.events[0].parameters.currency = event.currency || 'EUR';
      }

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.config.googleAnalytics.measurementId}&api_secret=${this.config.googleAnalytics.apiSecret}`;

      await axios.post(url, gaEvent, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('Event sent to Google Analytics', { eventName: event.eventName });

    } catch (error) {
      logger.error('Error sending to Google Analytics:', error);
      throw error;
    }
  }

  private async sendToAmplitude(event: AnalyticsEvent): Promise<void> {
    try {
      if (!this.config.amplitude?.apiKey) {
        throw new Error('Amplitude API key not configured');
      }

      const axios = require('axios');

      const amplitudeEvent = {
        user_id: event.userId,
        device_id: event.tenantId,
        event_type: event.eventName,
        time: event.timestamp.getTime(),
        event_properties: event.properties,
        user_properties: {
          tenant_id: event.tenantId
        }
      };

      // Ajouter les propriétés de revenus si présentes
      if (event.revenue) {
        amplitudeEvent.event_properties.revenue = event.revenue;
        amplitudeEvent.event_properties.currency = event.currency || 'EUR';
      }

      await axios.post('https://api2.amplitude.com/2/httpapi', {
        api_key: this.config.amplitude.apiKey,
        events: [amplitudeEvent]
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info('Event sent to Amplitude', { eventName: event.eventName });

    } catch (error) {
      logger.error('Error sending to Amplitude:', error);
      throw error;
    }
  }

  private async sendToSegment(event: AnalyticsEvent): Promise<void> {
    try {
      if (!this.config.segment?.writeKey) {
        throw new Error('Segment write key not configured');
      }

      const axios = require('axios');

      const segmentEvent: {
        userId?: string;
        anonymousId?: string;
        event: string;
        properties: Record<string, any>;
        timestamp: string;
      } = {
        userId: event.userId,
        anonymousId: event.tenantId,
        event: event.eventName,
        properties: {
          ...event.properties,
          tenant_id: event.tenantId,
          category: event.category
        },
        timestamp: event.timestamp.toISOString()
      };

      // Ajouter les propriétés de revenus si présentes
      if (event.revenue) {
        segmentEvent.properties.revenue = event.revenue;
        segmentEvent.properties.currency = event.currency || 'EUR';
      }

      const auth = Buffer.from(`${this.config.segment.writeKey}:`).toString('base64');

      await axios.post('https://api.segment.io/v1/track', segmentEvent, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info('Event sent to Segment', { eventName: event.eventName });

    } catch (error) {
      logger.error('Error sending to Segment:', error);
      throw error;
    }
  }

  private async trackRevenueSpecific(event: RevenueEvent): Promise<void> {
    try {
      // Envoyer vers des systèmes spécialisés dans les revenus
      // Par exemple, ChartMogul, ProfitWell, etc.

      logger.info('Revenue event tracked', {
        revenue: event.revenue,
        currency: event.currency,
        planName: event.planName
      });

    } catch (error) {
      logger.error('Error tracking revenue specific:', error);
    }
  }

  private loadConfig(): AnalyticsConfig {
    return {
      mixpanel: {
        token: process.env.MIXPANEL_TOKEN || '',
        enabled: !!process.env.MIXPANEL_TOKEN
      },
      googleAnalytics: {
        measurementId: process.env.GA_MEASUREMENT_ID || '',
        apiSecret: process.env.GA_API_SECRET || '',
        enabled: !!(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET)
      },
      amplitude: {
        apiKey: process.env.AMPLITUDE_API_KEY || '',
        enabled: !!process.env.AMPLITUDE_API_KEY
      },
      segment: {
        writeKey: process.env.SEGMENT_WRITE_KEY || '',
        enabled: !!process.env.SEGMENT_WRITE_KEY
      }
    };
  }
}

// Ajouter les collections manquantes
declare module '../../config/database' {
  interface Collections {
    analytics_events: any;
  }
}

// Instance singleton
export const analyticsIntegrationService = new AnalyticsIntegrationService();
export default analyticsIntegrationService;