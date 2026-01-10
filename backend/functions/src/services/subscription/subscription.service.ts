import { SubscriptionModel } from "../../models/subscription.model";
import { collections } from "../../config/database";
import { 
  Subscription, 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest,
  SubscriptionStatus 
} from "../../common/types/subscription.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";
import { logger } from "firebase-functions";

export class SubscriptionService {
  
  /**
   * Create a new subscription for a tenant
   */
  async createSubscription(
    request: CreateSubscriptionRequest, 
    tenantId: string, 
    userId: string
  ): Promise<Subscription> {
    try {
      // Validation métier - vérifier qu'il n'y a pas déjà un abonnement actif
      const existingSubscription = await this.getActiveSubscriptionByTenant(tenantId);
      if (existingSubscription) {
        throw new ConflictError("Tenant already has an active subscription");
      }

      // Validation du plan (à implémenter selon votre logique métier)
      await this.validatePlan(request.planId);
      
      // Créer le modèle
      const subscriptionModel = SubscriptionModel.fromCreateRequest({
        ...request,
        tenantId,
        createdBy: userId
      });
      
      // Valider le modèle
      await subscriptionModel.validate();
      
      // Sauvegarder
      const subscriptionRef = collections.subscriptions.doc();
      await subscriptionRef.set(subscriptionModel.toFirestore());
      
      logger.info(`✅ Subscription created: ${subscriptionRef.id}`, {
        subscriptionId: subscriptionRef.id,
        tenantId,
        planId: request.planId,
        userId
      });
      
      // Retourner l'entité
      return {
        id: subscriptionRef.id,
        ...subscriptionModel.toAPI()
      } as Subscription;
      
    } catch (error: any) {
      logger.error("Error creating subscription:", error);
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription by ID with tenant validation
   */
  async getSubscription(subscriptionId: string, tenantId: string): Promise<Subscription | null> {
    try {
      const doc = await collections.subscriptions.doc(subscriptionId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const subscriptionModel = SubscriptionModel.fromFirestore(doc);
      if (!subscriptionModel) {
        return null;
      }

      const subscription = subscriptionModel.toAPI() as Subscription;
      if (subscription.tenantId !== tenantId) {
        return null;
      }
      
      return subscription;
      
    } catch (error: any) {
      logger.error("Error getting subscription:", error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Get active subscription for a tenant
   */
  async getActiveSubscriptionByTenant(tenantId: string): Promise<Subscription | null> {
    try {
      const snapshot = await collections.subscriptions
        .where('tenantId', '==', tenantId)
        .where('status', '==', SubscriptionStatus.ACTIVE)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const subscriptionModel = SubscriptionModel.fromFirestore(snapshot.docs[0]);
      return subscriptionModel ? subscriptionModel.toAPI() as Subscription : null;
      
    } catch (error: any) {
      logger.error("Error getting active subscription:", error);
      throw new Error(`Failed to get active subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string, 
    updates: UpdateSubscriptionRequest, 
    tenantId: string,
    userId: string
  ): Promise<Subscription> {
    try {
      const existing = await this.getSubscription(subscriptionId, tenantId);
      if (!existing) {
        throw new NotFoundError("Subscription not found");
      }
      
      // Validation des mises à jour
      if (updates.planId) {
        await this.validatePlan(updates.planId);
      }
      
      // Appliquer les mises à jour
      const updatedData = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
      
      const subscriptionModel = new SubscriptionModel(updatedData);
      await subscriptionModel.validate();
      
      await collections.subscriptions.doc(subscriptionId).update(subscriptionModel.toFirestore());
      
      logger.info(`✅ Subscription updated: ${subscriptionId}`, {
        subscriptionId,
        tenantId,
        userId,
        updates: Object.keys(updates)
      });
      
      return subscriptionModel.toAPI() as Subscription;
      
    } catch (error: any) {
      logger.error("Error updating subscription:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string, 
    tenantId: string, 
    userId: string,
    reason?: string
  ): Promise<void> {
    try {
      const existing = await this.getSubscription(subscriptionId, tenantId);
      if (!existing) {
        throw new NotFoundError("Subscription not found");
      }
      
      if (existing.status === SubscriptionStatus.CANCELLED) {
        throw new ValidationError("Subscription is already cancelled");
      }
      
      // Mettre à jour le statut
      await collections.subscriptions.doc(subscriptionId).update({
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date()
      });
      
      logger.info(`🚫 Subscription cancelled: ${subscriptionId}`, {
        subscriptionId,
        tenantId,
        userId,
        reason
      });
      
    } catch (error: any) {
      logger.error("Error cancelling subscription:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get all subscriptions for a tenant (with pagination)
   */
  async getSubscriptionsByTenant(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: SubscriptionStatus;
    } = {}
  ): Promise<{
    subscriptions: Subscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 20, status } = options;
      
      let query = collections.subscriptions
        .where('tenantId', '==', tenantId);
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit);
      
      const snapshot = await paginatedQuery.get();
      
      const subscriptions = snapshot.docs
        .map(doc => SubscriptionModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toAPI() as Subscription);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
      
    } catch (error: any) {
      logger.error("Error getting subscriptions by tenant:", error);
      throw new Error(`Failed to get subscriptions: ${error.message}`);
    }
  }

  /**
   * Validate plan ID (implement according to your business logic)
   */
  private async validatePlan(planId: string): Promise<void> {
    // TODO: Implement plan validation logic
    // This should check if the plan exists and is available
    if (!planId || planId.trim().length === 0) {
      throw new ValidationError("Plan ID is required");
    }
    
    // Example validation - replace with actual plan validation
    const validPlans = ['free', 'basic', 'premium', 'enterprise'];
    if (!validPlans.includes(planId)) {
      throw new ValidationError(`Invalid plan ID: ${planId}`);
    }
  }
}

export const subscriptionService = new SubscriptionService();