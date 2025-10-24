/**
 * Service d'intégration Stripe étendu pour la gestion des codes promo
 * Gère les coupons Stripe, leur synchronisation et les webhooks liés aux réductions
 */

import Stripe from 'stripe';
import { collections } from '../../config/database';
import { stripePaymentService } from '../../services/billing/stripe-payment.service';
import { promoCodeService } from '../../services/promoCode/promoCode.service';
import { PromoCode, PromoCodeType, PromoCodeStatus } from '../../models/promoCode.model';
import { TenantError, TenantErrorCode } from '../../common/types';

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil'
});

export interface StripeCoupon {
  id: string;
  promoCodeId: string;
  stripeCouponId: string;
  stripePromotionCodeId?: string;
  name: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  timesRedeemed: number;
  valid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStripeCouponRequest {
  promoCodeId: string;
  name: string;
  code: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationInMonths?: number;
  maxRedemptions?: number;
  redeemBy?: Date;
  metadata?: Record<string, string>;
}

export interface ApplyPromoCodeRequest {
  tenantId: string;
  subscriptionId: string;
  promoCode: string;
}

export interface PromoCodeUsageStats {
  totalRedemptions: number;
  activeSubscriptions: number;
  totalSavings: number;
  averageSavings: number;
  conversionRate: number;
}

export class StripePromoCodeService {

  /**
   * Créer un coupon Stripe à partir d'un code promo
   */
  async createStripeCoupon(request: CreateStripeCouponRequest): Promise<StripeCoupon> {
    try {
      // Vérifier que le code promo existe
      const promoCode = await promoCodeService.getPromoCodeById(request.promoCodeId);
      if (!promoCode) {
        throw new TenantError(
          'Promo code not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Créer le coupon dans Stripe
      const couponParams: Stripe.CouponCreateParams = {
        id: `promo_${request.code.toLowerCase()}`,
        name: request.name,
        duration: request.duration,
        metadata: {
          promoCodeId: request.promoCodeId,
          code: request.code,
          createdBy: 'promo-system'
        }
      };

      // Ajouter la réduction
      if (request.percentOff) {
        couponParams.percent_off = request.percentOff;
      } else if (request.amountOff && request.currency) {
        couponParams.amount_off = Math.round(request.amountOff * 100); // Convertir en centimes
        couponParams.currency = request.currency.toLowerCase();
      }

      // Ajouter la durée en mois si applicable
      if (request.duration === 'repeating' && request.durationInMonths) {
        couponParams.duration_in_months = request.durationInMonths;
      }

      // Ajouter les limites
      if (request.maxRedemptions) {
        couponParams.max_redemptions = request.maxRedemptions;
      }

      if (request.redeemBy) {
        couponParams.redeem_by = Math.floor(request.redeemBy.getTime() / 1000);
      }

      // Ajouter les métadonnées personnalisées
      if (request.metadata) {
        couponParams.metadata = { ...couponParams.metadata, ...request.metadata };
      }

      const stripeCoupon = await stripe.coupons.create(couponParams);

      // Créer le code de promotion Stripe (optionnel, pour des codes spécifiques)
      let stripePromotionCode: Stripe.PromotionCode | undefined;
      try {
        stripePromotionCode = await stripe.promotionCodes.create({
          coupon: stripeCoupon.id,
          code: request.code.toUpperCase(),
          active: true,
          metadata: {
            promoCodeId: request.promoCodeId,
            originalCode: request.code
          }
        });
      } catch (error) {
        console.warn('Could not create promotion code, using coupon only:', error);
      }

      // Sauvegarder dans notre base de données
      const now = new Date();
      const stripeCouponData: Omit<StripeCoupon, 'id'> = {
        promoCodeId: request.promoCodeId,
        stripeCouponId: stripeCoupon.id,
        stripePromotionCodeId: stripePromotionCode?.id,
        name: request.name,
        percentOff: request.percentOff,
        amountOff: request.amountOff,
        currency: request.currency,
        duration: request.duration,
        durationInMonths: request.durationInMonths,
        maxRedemptions: request.maxRedemptions,
        timesRedeemed: 0,
        valid: true,
        createdAt: now,
        updatedAt: now
      };

      const couponRef = await collections.stripe_coupons.add(stripeCouponData);

      return {
        id: couponRef.id,
        ...stripeCouponData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating Stripe coupon:', error);
      throw new TenantError(
        'Failed to create Stripe coupon',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Appliquer un code promo à un abonnement Stripe
   */
  async applyPromoCodeToSubscription(request: ApplyPromoCodeRequest): Promise<{
    success: boolean;
    discountApplied: boolean;
    savings: number;
    message: string;
  }> {
    try {
      // Valider le code promo
      const validation = await promoCodeService.validatePromoCode(
        request.promoCode,
        request.tenantId
      );

      if (!validation.isValid) {
        return {
          success: false,
          discountApplied: false,
          savings: 0,
          message: validation.reason || 'Code promo invalide'
        };
      }

      // Obtenir l'abonnement Stripe
      const stripeSubscription = await this.getStripeSubscriptionByTenantId(request.tenantId);
      if (!stripeSubscription) {
        throw new TenantError(
          'Stripe subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Obtenir le coupon Stripe correspondant
      const stripeCoupon = await this.getStripeCouponByPromoCode(validation.promoCode!.id);
      if (!stripeCoupon) {
        // Créer le coupon Stripe s'il n'existe pas
        await this.createStripeCouponFromPromoCode(validation.promoCode!);
        const newStripeCoupon = await this.getStripeCouponByPromoCode(validation.promoCode!.id);
        if (!newStripeCoupon) {
          throw new TenantError(
            'Failed to create Stripe coupon',
            TenantErrorCode.TENANT_NOT_FOUND
          );
        }
      }

      // Appliquer le coupon à l'abonnement Stripe
      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscription.stripeSubscriptionId,
        {
          coupon: stripeCoupon!.stripeCouponId,
          metadata: {
            ...stripeSubscription,
            promoCodeApplied: request.promoCode,
            promoCodeId: validation.promoCode!.id,
            appliedAt: new Date().toISOString()
          }
        }
      );

      // Calculer les économies
      const savings = await this.calculateSavings(
        updatedSubscription,
        validation.promoCode!
      );

      // Appliquer le code promo dans notre système
      await promoCodeService.applyPromoCode(
        request.promoCode,
        request.tenantId,
        request.subscriptionId
      );

      // Mettre à jour les statistiques du coupon Stripe
      await this.updateCouponUsageStats(stripeCoupon!.id);

      return {
        success: true,
        discountApplied: true,
        savings,
        message: `Code promo ${request.promoCode} appliqué avec succès`
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error applying promo code to subscription:', error);
      throw new TenantError(
        'Failed to apply promo code',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Supprimer un code promo d'un abonnement Stripe
   */
  async removePromoCodeFromSubscription(tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Obtenir l'abonnement Stripe
      const stripeSubscription = await this.getStripeSubscriptionByTenantId(tenantId);
      if (!stripeSubscription) {
        throw new TenantError(
          'Stripe subscription not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Supprimer le coupon de l'abonnement Stripe
      await stripe.subscriptions.update(
        stripeSubscription.stripeSubscriptionId,
        {
          coupon: '',
          metadata: {
            ...stripeSubscription,
            promoCodeApplied: '',
            promoCodeId: '',
            removedAt: new Date().toISOString()
          }
        }
      );

      return {
        success: true,
        message: 'Code promo supprimé avec succès'
      };
    } catch (error) {
      console.error('Error removing promo code from subscription:', error);
      throw new TenantError(
        'Failed to remove promo code',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Synchroniser les codes promo avec Stripe
   */
  async syncPromoCodesWithStripe(): Promise<{
    created: number;
    updated: number;
    errors: string[];
  }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Obtenir tous les codes promo actifs
      const promoCodes = await promoCodeService.getActivePromoCodes();

      for (const promoCode of promoCodes) {
        try {
          // Vérifier si le coupon Stripe existe
          const existingCoupon = await this.getStripeCouponByPromoCode(promoCode.id);

          if (!existingCoupon) {
            // Créer le coupon Stripe
            await this.createStripeCouponFromPromoCode(promoCode);
            result.created++;
          } else {
            // Mettre à jour le coupon si nécessaire
            await this.updateStripeCouponFromPromoCode(promoCode, existingCoupon);
            result.updated++;
          }
        } catch (error) {
          result.errors.push(`Error syncing promo code ${promoCode.code}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      console.error('Error syncing promo codes with Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation des codes promo
   */
  async getPromoCodeUsageStats(promoCodeId: string): Promise<PromoCodeUsageStats> {
    try {
      const stripeCoupon = await this.getStripeCouponByPromoCode(promoCodeId);
      if (!stripeCoupon) {
        return {
          totalRedemptions: 0,
          activeSubscriptions: 0,
          totalSavings: 0,
          averageSavings: 0,
          conversionRate: 0
        };
      }

      // Obtenir les statistiques depuis Stripe
      const coupon = await stripe.coupons.retrieve(stripeCoupon.stripeCouponId);

      // Calculer les statistiques détaillées
      const subscriptions = await this.getSubscriptionsWithCoupon(stripeCoupon.stripeCouponId);
      const totalSavings = await this.calculateTotalSavings(subscriptions, coupon);

      return {
        totalRedemptions: coupon.times_redeemed || 0,
        activeSubscriptions: subscriptions.length,
        totalSavings,
        averageSavings: subscriptions.length > 0 ? totalSavings / subscriptions.length : 0,
        conversionRate: this.calculateConversionRate(coupon.times_redeemed || 0)
      };
    } catch (error) {
      console.error('Error getting promo code usage stats:', error);
      throw error;
    }
  }

  /**
   * Gérer les webhooks Stripe liés aux codes promo
   */
  async handlePromoCodeWebhook(event: Stripe.Event): Promise<boolean> {
    try {
      switch (event.type) {
        case 'coupon.created':
          await this.handleCouponCreated(event.data.object as Stripe.Coupon);
          break;

        case 'coupon.updated':
          await this.handleCouponUpdated(event.data.object as Stripe.Coupon);
          break;

        case 'coupon.deleted':
          await this.handleCouponDeleted(event.data.object as Stripe.Coupon);
          break;

        case 'promotion_code.created':
          await this.handlePromotionCodeCreated(event.data.object as Stripe.PromotionCode);
          break;

        case 'promotion_code.updated':
          await this.handlePromotionCodeUpdated(event.data.object as Stripe.PromotionCode);
          break;

        case 'customer.discount.created':
          await this.handleDiscountCreated(event.data.object as Stripe.Discount);
          break;

        case 'customer.discount.deleted':
          await this.handleDiscountDeleted(event.data.object as Stripe.Discount);
          break;

        default:
          return false;
      }

      return true;
    } catch (error) {
      console.error(`Error handling promo code webhook ${event.type}:`, error);
      return false;
    }
  }

  // Méthodes privées

  private async createStripeCouponFromPromoCode(promoCode: PromoCode): Promise<StripeCoupon> {
    const request: CreateStripeCouponRequest = {
      promoCodeId: promoCode.id,
      name: promoCode.name,
      code: promoCode.code,
      percentOff: promoCode.type === PromoCodeType.PERCENTAGE ? promoCode.value : undefined,
      amountOff: promoCode.type === PromoCodeType.FIXED_AMOUNT ? promoCode.value : undefined,
      currency: promoCode.type === PromoCodeType.FIXED_AMOUNT ? 'eur' : undefined,
      duration: promoCode.duration === 'once' ? 'once' : 
                promoCode.duration === 'forever' ? 'forever' : 'repeating',
      durationInMonths: promoCode.durationInMonths,
      maxRedemptions: promoCode.maxUses,
      redeemBy: promoCode.expiresAt,
      metadata: {
        source: 'promo-system',
        originalId: promoCode.id
      }
    };

    return this.createStripeCoupon(request);
  }

  private async updateStripeCouponFromPromoCode(
    promoCode: PromoCode, 
    stripeCoupon: StripeCoupon
  ): Promise<void> {
    try {
      // Stripe ne permet pas de modifier les coupons existants
      // On peut seulement mettre à jour les métadonnées
      await stripe.coupons.update(stripeCoupon.stripeCouponId, {
        metadata: {
          lastSyncAt: new Date().toISOString(),
          promoCodeStatus: promoCode.status,
          promoCodeUpdatedAt: promoCode.updatedAt.toISOString()
        }
      });

      // Mettre à jour notre enregistrement local
      await collections.stripe_coupons.doc(stripeCoupon.id).update({
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating Stripe coupon:', error);
    }
  }

  private async getStripeSubscriptionByTenantId(tenantId: string): Promise<any> {
    // Cette méthode devrait être dans le service de paiement Stripe
    return stripePaymentService.getStripeCustomerByTenant(tenantId);
  }

  private async getStripeCouponByPromoCode(promoCodeId: string): Promise<StripeCoupon | null> {
    try {
      const snapshot = await collections.stripe_coupons
        .where('promoCodeId', '==', promoCodeId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as StripeCoupon;
    } catch (error) {
      console.error('Error getting Stripe coupon by promo code:', error);
      return null;
    }
  }

  private async calculateSavings(
    subscription: Stripe.Subscription,
    promoCode: PromoCode
  ): Promise<number> {
    // Calculer les économies basées sur le type de réduction
    const subscriptionAmount = subscription.items.data[0]?.price?.unit_amount || 0;
    
    if (promoCode.type === PromoCodeType.PERCENTAGE) {
      return (subscriptionAmount * promoCode.value) / 10000; // Convertir de centimes et pourcentage
    } else if (promoCode.type === PromoCodeType.FIXED_AMOUNT) {
      return promoCode.value;
    }

    return 0;
  }

  private async updateCouponUsageStats(stripeCouponId: string): Promise<void> {
    try {
      await collections.stripe_coupons.doc(stripeCouponId).update({
        timesRedeemed: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating coupon usage stats:', error);
    }
  }

  private async getSubscriptionsWithCoupon(couponId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100
      });

      return subscriptions.data.filter(sub => 
        sub.discount?.coupon?.id === couponId
      );
    } catch (error) {
      console.error('Error getting subscriptions with coupon:', error);
      return [];
    }
  }

  private async calculateTotalSavings(
    subscriptions: Stripe.Subscription[],
    coupon: Stripe.Coupon
  ): Promise<number> {
    let totalSavings = 0;

    for (const subscription of subscriptions) {
      const amount = subscription.items.data[0]?.price?.unit_amount || 0;
      
      if (coupon.percent_off) {
        totalSavings += (amount * coupon.percent_off) / 10000;
      } else if (coupon.amount_off) {
        totalSavings += coupon.amount_off / 100;
      }
    }

    return totalSavings;
  }

  private calculateConversionRate(timesRedeemed: number): number {
    // Logique simple de taux de conversion
    // Dans un vrai système, cela devrait être basé sur des métriques réelles
    return timesRedeemed > 0 ? Math.min(timesRedeemed * 0.1, 1) : 0;
  }

  // Gestionnaires de webhooks

  private async handleCouponCreated(coupon: Stripe.Coupon): Promise<void> {
    console.log('Coupon created in Stripe:', coupon.id);
  }

  private async handleCouponUpdated(coupon: Stripe.Coupon): Promise<void> {
    console.log('Coupon updated in Stripe:', coupon.id);
  }

  private async handleCouponDeleted(coupon: Stripe.Coupon): Promise<void> {
    console.log('Coupon deleted in Stripe:', coupon.id);
    
    // Marquer le coupon comme invalide dans notre système
    const stripeCoupon = await this.getStripeCouponByStripeId(coupon.id);
    if (stripeCoupon) {
      await collections.stripe_coupons.doc(stripeCoupon.id).update({
        valid: false,
        updatedAt: new Date()
      });
    }
  }

  private async handlePromotionCodeCreated(promotionCode: Stripe.PromotionCode): Promise<void> {
    console.log('Promotion code created in Stripe:', promotionCode.id);
  }

  private async handlePromotionCodeUpdated(promotionCode: Stripe.PromotionCode): Promise<void> {
    console.log('Promotion code updated in Stripe:', promotionCode.id);
  }

  private async handleDiscountCreated(discount: Stripe.Discount): Promise<void> {
    console.log('Discount created in Stripe:', discount.id);
    
    // Enregistrer l'application du code promo
    if (discount.coupon?.metadata?.promoCodeId) {
      // Mettre à jour les statistiques d'utilisation
      await this.updateCouponUsageStats(discount.coupon.metadata.promoCodeId);
    }
  }

  private async handleDiscountDeleted(discount: Stripe.Discount): Promise<void> {
    console.log('Discount deleted in Stripe:', discount.id);
  }

  private async getStripeCouponByStripeId(stripeCouponId: string): Promise<StripeCoupon | null> {
    try {
      const snapshot = await collections.stripe_coupons
        .where('stripeCouponId', '==', stripeCouponId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as StripeCoupon;
    } catch (error) {
      console.error('Error getting Stripe coupon by Stripe ID:', error);
      return null;
    }
  }
}

// Ajouter les collections Stripe manquantes pour les coupons
declare module '../../config/database' {
  interface Collections {
    stripe_coupons: any;
  }
}

// Instance singleton
export const stripePromoCodeService = new StripePromoCodeService();
export default stripePromoCodeService;