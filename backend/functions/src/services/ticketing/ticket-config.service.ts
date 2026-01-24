/**
 * Service de configuration de billetterie
 * Gère les types de billets, tarification dynamique et paramètres
 */

import { collections } from "../../config/database";
import { 
  TicketTypeConfig,
  CreateTicketTypeRequest,
  UpdateTicketTypeRequest,
  TicketVisibility,
  DynamicPricing,
  TicketTypeWithAvailability,
  PromoCode,
  CreatePromoCodeRequest,
  PromoCodeValidation,
  ValidatePromoCodeRequest,
  TicketingSettings,
  CreateTicketingSettingsRequest,
  UpdateTicketingSettingsRequest,
  TicketingConfigSummary,
  PromoCodeType
} from "../../common/types/ticket-config.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";
import { logger } from "firebase-functions";

/**
 * Service de gestion de la configuration de billetterie
 */
export class TicketConfigService {

  // ============================================
  // Ticket Types Management
  // ============================================

  /**
   * Créer un nouveau type de billet
   */
  async createTicketType(
    request: CreateTicketTypeRequest,
    tenantId: string,
    userId: string
  ): Promise<TicketTypeConfig> {
    try {
      // Validation des données
      this.validateCreateTicketTypeRequest(request);

      // Vérifier l'unicité du nom dans l'événement
      await this.checkTicketTypeNameUniqueness(request.eventId, request.name, tenantId);

      // Créer le document
      const ticketTypeData: Omit<TicketTypeConfig, 'id'> = {
        eventId: request.eventId,
        tenantId,
        name: request.name,
        description: request.description,
        price: request.price,
        currency: request.currency || 'EUR',
        quantity: request.quantity,
        quantitySold: 0,
        quantityReserved: 0,
        salesStartDate: request.salesStartDate,
        salesEndDate: request.salesEndDate,
        visibility: request.visibility || TicketVisibility.PUBLIC,
        order: request.order || 0,
        isActive: true,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      };

      const ticketTypeRef = collections.ticket_types.doc();
      await ticketTypeRef.set(ticketTypeData);

      logger.info(`✅ Ticket type created: ${ticketTypeRef.id}`, {
        ticketTypeId: ticketTypeRef.id,
        eventId: request.eventId,
        tenantId,
        userId
      });

      return {
        id: ticketTypeRef.id,
        ...ticketTypeData
      };

    } catch (error: any) {
      logger.error('❌ Error creating ticket type:', error);
      throw error;
    }
  }

  /**
   * Récupérer un type de billet par ID
   */
  async getTicketType(
    ticketTypeId: string,
    tenantId: string
  ): Promise<TicketTypeConfig | null> {
    const doc = await collections.ticket_types.doc(ticketTypeId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as TicketTypeConfig;

    // Vérifier le contexte tenant
    if (data.tenantId !== tenantId) {
      return null;
    }

    return {
      id: doc.id,
      ...data
    };
  }

  /**
   * Récupérer tous les types de billets d'un événement
   */
  async getTicketTypesByEvent(
    eventId: string,
    tenantId: string
  ): Promise<TicketTypeConfig[]> {
    const snapshot = await collections.ticket_types
      .where('eventId', '==', eventId)
      .where('tenantId', '==', tenantId)
      .orderBy('order', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TicketTypeConfig));
  }

  /**
   * Récupérer les types de billets avec disponibilité
   */
  async getTicketTypesWithAvailability(
    eventId: string,
    tenantId: string
  ): Promise<TicketTypeWithAvailability[]> {
    const ticketTypes = await this.getTicketTypesByEvent(eventId, tenantId);

    return Promise.all(
      ticketTypes.map(async (ticketType) => {
        const availableQuantity = ticketType.quantity - ticketType.quantitySold - ticketType.quantityReserved;
        const currentPrice = await this.getCurrentPrice(ticketType.id, ticketType.price, tenantId);
        const dynamicPricing = await this.getDynamicPricing(ticketType.id, tenantId);

        return {
          ...ticketType,
          availableQuantity,
          currentPrice,
          dynamicPricing: dynamicPricing || undefined
        };
      })
    );
  }

  /**
   * Mettre à jour un type de billet
   */
  async updateTicketType(
    ticketTypeId: string,
    updates: UpdateTicketTypeRequest,
    tenantId: string
  ): Promise<TicketTypeConfig> {
    const existing = await this.getTicketType(ticketTypeId, tenantId);

    if (!existing) {
      throw new NotFoundError('Ticket type not found');
    }

    // Vérifier l'unicité du nom si modifié
    if (updates.name && updates.name !== existing.name) {
      await this.checkTicketTypeNameUniqueness(existing.eventId, updates.name, tenantId, ticketTypeId);
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date()
    };

    await collections.ticket_types.doc(ticketTypeId).update(updatedData);

    logger.info(`✅ Ticket type updated: ${ticketTypeId}`, {
      ticketTypeId,
      tenantId
    });

    return {
      ...existing,
      ...updatedData
    };
  }

  /**
   * Supprimer un type de billet
   */
  async deleteTicketType(
    ticketTypeId: string,
    tenantId: string
  ): Promise<void> {
    const existing = await this.getTicketType(ticketTypeId, tenantId);

    if (!existing) {
      throw new NotFoundError('Ticket type not found');
    }

    // Vérifier qu'aucun billet n'a été vendu
    if (existing.quantitySold > 0) {
      throw new ConflictError('Cannot delete ticket type with sold tickets');
    }

    await collections.ticket_types.doc(ticketTypeId).delete();

    logger.info(`🗑️ Ticket type deleted: ${ticketTypeId}`, {
      ticketTypeId,
      tenantId
    });
  }

  // ============================================
  // Dynamic Pricing Management
  // ============================================

  /**
   * Obtenir le prix actuel d'un type de billet (avec tarification dynamique)
   */
  private async getCurrentPrice(
    ticketTypeId: string,
    basePrice: number,
    tenantId: string
  ): Promise<number> {
    const dynamicPricing = await this.getDynamicPricing(ticketTypeId, tenantId);

    if (!dynamicPricing || !dynamicPricing.enabled) {
      return basePrice;
    }

    const now = new Date();

    // Early bird pricing
    if (dynamicPricing.earlyBird) {
      const earlyBird = dynamicPricing.earlyBird;
      if (now <= earlyBird.endDate) {
        if (!earlyBird.quantity || (earlyBird.quantitySold || 0) < earlyBird.quantity) {
          return earlyBird.price;
        }
      }
    }

    // Last minute pricing
    if (dynamicPricing.lastMinute) {
      const lastMinute = dynamicPricing.lastMinute;
      if (now >= lastMinute.startDate) {
        return lastMinute.price;
      }
    }

    // Tiered pricing
    if (dynamicPricing.tiered) {
      for (const tier of dynamicPricing.tiered) {
        if (now >= tier.startDate && now <= tier.endDate) {
          if (!tier.quantity || (tier.quantitySold || 0) < tier.quantity) {
            return tier.price;
          }
        }
      }
    }

    return basePrice;
  }

  /**
   * Récupérer la configuration de tarification dynamique
   */
  private async getDynamicPricing(
    ticketTypeId: string,
    tenantId: string
  ): Promise<DynamicPricing | null> {
    const snapshot = await collections.dynamic_pricing
      .where('ticketTypeId', '==', ticketTypeId)
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as DynamicPricing;
  }

  // ============================================
  // Promo Codes Management
  // ============================================

  /**
   * Créer un code promo
   */
  async createPromoCode(
    request: CreatePromoCodeRequest,
    tenantId: string,
    userId: string
  ): Promise<PromoCode> {
    try {
      // Validation
      this.validateCreatePromoCodeRequest(request);

      // Vérifier l'unicité du code
      await this.checkPromoCodeUniqueness(request.eventId, request.code, tenantId);

      const promoCodeData: Omit<PromoCode, 'id'> = {
        eventId: request.eventId,
        tenantId,
        code: request.code.toUpperCase(),
        type: request.type,
        value: request.value,
        maxUses: request.maxUses,
        usedCount: 0,
        validFrom: request.validFrom,
        validUntil: request.validUntil,
        applicableTicketTypes: request.applicableTicketTypes,
        minimumPurchaseAmount: request.minimumPurchaseAmount,
        isActive: true,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      };

      const promoCodeRef = collections.promo_codes.doc();
      await promoCodeRef.set(promoCodeData);

      logger.info(`✅ Promo code created: ${promoCodeRef.id}`, {
        promoCodeId: promoCodeRef.id,
        code: request.code,
        eventId: request.eventId,
        tenantId
      });

      return {
        id: promoCodeRef.id,
        ...promoCodeData
      };

    } catch (error: any) {
      logger.error('❌ Error creating promo code:', error);
      throw error;
    }
  }

  /**
   * Valider un code promo
   */
  async validatePromoCode(
    request: ValidatePromoCodeRequest,
    tenantId: string
  ): Promise<PromoCodeValidation> {
    try {
      // Récupérer le code promo
      const snapshot = await collections.promo_codes
        .where('eventId', '==', request.eventId)
        .where('code', '==', request.code.toUpperCase())
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          isValid: false,
          discountAmount: 0,
          message: 'Promo code not found'
        };
      }

      const promoCode = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as PromoCode;

      // Vérifications
      if (!promoCode.isActive) {
        return {
          isValid: false,
          discountAmount: 0,
          message: 'Promo code is inactive'
        };
      }

      const now = new Date();

      if (promoCode.validFrom && now < promoCode.validFrom) {
        return {
          isValid: false,
          discountAmount: 0,
          message: 'Promo code not yet valid'
        };
      }

      if (promoCode.validUntil && now > promoCode.validUntil) {
        return {
          isValid: false,
          discountAmount: 0,
          message: 'Promo code has expired'
        };
      }

      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return {
          isValid: false,
          discountAmount: 0,
          message: 'Promo code usage limit reached'
        };
      }

      // Calculer le montant total
      const totalAmount = request.ticketTypes.reduce((sum, ticket) => {
        return sum + (ticket.price * ticket.quantity);
      }, 0);

      if (promoCode.minimumPurchaseAmount && totalAmount < promoCode.minimumPurchaseAmount) {
        return {
          isValid: false,
          discountAmount: 0,
          message: `Minimum purchase amount of ${promoCode.minimumPurchaseAmount} required`
        };
      }

      // Calculer la réduction
      let discountAmount = 0;
      if (promoCode.type === PromoCodeType.PERCENTAGE) {
        discountAmount = (totalAmount * promoCode.value) / 100;
      } else {
        discountAmount = promoCode.value;
      }

      return {
        isValid: true,
        promoCode,
        discountAmount,
        message: 'Promo code is valid'
      };

    } catch (error: any) {
      logger.error('❌ Error validating promo code:', error);
      throw error;
    }
  }

  // ============================================
  // Ticketing Settings Management
  // ============================================

  /**
   * Créer ou mettre à jour les paramètres de billetterie
   */
  async upsertTicketingSettings(
    request: (CreateTicketingSettingsRequest | UpdateTicketingSettingsRequest) & { eventId: string },
    tenantId: string
  ): Promise<TicketingSettings> {
    try {
      // Vérifier si les paramètres existent déjà
      const existing = await this.getTicketingSettings(request.eventId, tenantId);

      if (existing) {
        // Mise à jour
        const updatedData = {
          ...request,
          updatedAt: new Date()
        };

        await collections.ticketing_settings.doc(existing.id).update(updatedData);

        return {
          ...existing,
          ...updatedData
        };
      } else {
        // Création
        const settingsData: Omit<TicketingSettings, 'id'> = {
          eventId: request.eventId,
          tenantId,
          enabled: request.enabled !== undefined ? request.enabled : true,
          currency: request.currency || 'EUR',
          taxRate: request.taxRate,
          serviceFeeType: request.serviceFeeType || 'none' as any,
          serviceFeeValue: request.serviceFeeValue || 0,
          serviceFeePayedBy: request.serviceFeePayedBy || 'participant' as any,
          refundPolicy: request.refundPolicy,
          customQuestions: request.customQuestions || [],
          maxTicketsPerOrder: request.maxTicketsPerOrder,
          requiresApproval: request.requiresApproval || false,
          waitlistEnabled: request.waitlistEnabled || false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const settingsRef = collections.ticketing_settings.doc();
        await settingsRef.set(settingsData);

        return {
          id: settingsRef.id,
          ...settingsData
        };
      }
    } catch (error: any) {
      logger.error('❌ Error upserting ticketing settings:', error);
      throw error;
    }
  }

  /**
   * Récupérer les paramètres de billetterie
   */
  async getTicketingSettings(
    eventId: string,
    tenantId: string
  ): Promise<TicketingSettings | null> {
    const snapshot = await collections.ticketing_settings
      .where('eventId', '==', eventId)
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as TicketingSettings;
  }

  /**
   * Récupérer la configuration complète de billetterie
   */
  async getTicketingConfigSummary(
    eventId: string,
    tenantId: string
  ): Promise<TicketingConfigSummary> {
    const [settings, ticketTypes, promoCodes] = await Promise.all([
      this.getTicketingSettings(eventId, tenantId),
      this.getTicketTypesWithAvailability(eventId, tenantId),
      this.getPromoCodesByEvent(eventId, tenantId)
    ]);

    // Calculer les statistiques
    const totalTicketsSold = ticketTypes.reduce((sum, tt) => sum + tt.quantitySold, 0);
    const totalTicketsAvailable = ticketTypes.reduce((sum, tt) => sum + tt.quantity, 0);
    const totalRevenue = ticketTypes.reduce((sum, tt) => sum + (tt.quantitySold * tt.price), 0);

    return {
      settings: settings || this.getDefaultSettings(eventId, tenantId),
      ticketTypes,
      promoCodes,
      totalRevenue,
      totalTicketsSold,
      totalTicketsAvailable
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private validateCreateTicketTypeRequest(request: CreateTicketTypeRequest): void {
    if (!request.name || request.name.trim().length < 2) {
      throw new ValidationError('Ticket type name must be at least 2 characters');
    }

    if (request.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }

    if (request.quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }
  }

  private validateCreatePromoCodeRequest(request: CreatePromoCodeRequest): void {
    if (!request.code || request.code.trim().length < 3) {
      throw new ValidationError('Promo code must be at least 3 characters');
    }

    if (request.type === PromoCodeType.PERCENTAGE && (request.value < 0 || request.value > 100)) {
      throw new ValidationError('Percentage value must be between 0 and 100');
    }

    if (request.type === PromoCodeType.FIXED_AMOUNT && request.value < 0) {
      throw new ValidationError('Fixed amount cannot be negative');
    }
  }

  private async checkTicketTypeNameUniqueness(
    eventId: string,
    name: string,
    tenantId: string,
    excludeId?: string
  ): Promise<void> {
    const query = collections.ticket_types
      .where('eventId', '==', eventId)
      .where('tenantId', '==', tenantId)
      .where('name', '==', name);

    const snapshot = await query.limit(1).get();

    if (!snapshot.empty) {
      const existingId = snapshot.docs[0].id;
      if (!excludeId || existingId !== excludeId) {
        throw new ConflictError('Ticket type name already exists for this event');
      }
    }
  }

  private async checkPromoCodeUniqueness(
    eventId: string,
    code: string,
    tenantId: string
  ): Promise<void> {
    const snapshot = await collections.promo_codes
      .where('eventId', '==', eventId)
      .where('tenantId', '==', tenantId)
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (!snapshot.empty) {
      throw new ConflictError('Promo code already exists for this event');
    }
  }

  private async getPromoCodesByEvent(
    eventId: string,
    tenantId: string
  ): Promise<PromoCode[]> {
    const snapshot = await collections.promo_codes
      .where('eventId', '==', eventId)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PromoCode));
  }

  private getDefaultSettings(eventId: string, tenantId: string): TicketingSettings {
    return {
      id: '',
      eventId,
      tenantId,
      enabled: false,
      currency: 'EUR',
      serviceFeeType: 'none' as any,
      serviceFeeValue: 0,
      serviceFeePayedBy: 'participant' as any,
      customQuestions: [],
      requiresApproval: false,
      waitlistEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

// Export singleton instance
export const ticketConfigService = new TicketConfigService();
