import { logger } from "firebase-functions";
import { collections } from "../../config/database";
import { 
  GracePeriod, 
  GracePeriodModel, 
  CreateGracePeriodRequest, 
  ExtendGracePeriodRequest,
  ConvertGracePeriodRequest,
  GracePeriodStatus,
  GracePeriodSource,
  GraceNotificationType,
  GraceNotification
} from "../../models/gracePeriod.model";
import { Subscription } from "../../models/subscription.model";

/**
 * Interface pour les filtres de période de grâce
 */
export interface GracePeriodFilters {
  status?: GracePeriodStatus;
  source?: GracePeriodSource;
  userId?: string;
  tenantId?: string;
  expiringInDays?: number; // Expire dans X jours
  isOverdue?: boolean;
}

/**
 * Interface pour les options de requête
 */
export interface GracePeriodQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'durationDays';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface pour les résultats paginés
 */
export interface PaginatedGracePeriods {
  items: GracePeriod[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface pour les statistiques de période de grâce
 */
export interface GraceStats {
  total: number;
  byStatus: Record<GracePeriodStatus, number>;
  bySource: Record<GracePeriodSource, number>;
  averageDuration: number;
  conversionRate: number; // Pourcentage qui convertissent en abonnement payant
  expiringIn7Days: number;
  expiringIn3Days: number;
  expiringIn1Day: number;
  overdue: number;
  totalExtensions: number;
  averageExtensionDays: number;
}

/**
 * Interface pour le résultat des notifications
 */
export interface NotificationResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Interface pour le résultat d'expiration
 */
export interface ExpirationResult {
  expired: number;
  errors: string[];
  processedIds: string[];
}

/**
 * Interface pour la configuration de période de grâce
 */
export interface GracePeriodConfig {
  durationDays: number;
  source: GracePeriodSource;
  sourceDetails?: any;
  metadata?: Record<string, any>;
}

/**
 * Service de gestion des périodes de grâce
 */
export class GracePeriodService {

  /**
   * Créer une nouvelle période de grâce
   */
  async createGracePeriod(
    userId: string,
    tenantId: string,
    config: GracePeriodConfig
  ): Promise<GracePeriod> {
    try {
      logger.info(`Creating grace period for user ${userId}, tenant ${tenantId}`);

      // Vérifier qu'il n'y a pas déjà une période de grâce active
      const existingGracePeriod = await this.getActiveGracePeriod(userId);
      if (existingGracePeriod) {
        throw new Error("User already has an active grace period");
      }

      // Créer la requête
      const request: CreateGracePeriodRequest = {
        userId,
        tenantId,
        durationDays: config.durationDays,
        source: config.source,
        sourceDetails: config.sourceDetails,
        metadata: config.metadata
      };

      // Créer le modèle et valider
      const gracePeriodModel = GracePeriodModel.fromCreateRequest(request);
      await gracePeriodModel.validate();

      // Sauvegarder en base
      const docRef = await collections.grace_periods.add(gracePeriodModel.toFirestore());
      
      const createdGracePeriod: GracePeriod = {
        id: docRef.id,
        ...gracePeriodModel.getData()
      };

      // Programmer les notifications
      await this.scheduleNotifications(createdGracePeriod.id!);

      logger.info(`Grace period created successfully: ${createdGracePeriod.id}`);
      return createdGracePeriod;

    } catch (error: any) {
      logger.error("Error creating grace period:", error);
      throw error;
    }
  }

  /**
   * Obtenir une période de grâce par ID
   */
  async getGracePeriod(gracePeriodId: string): Promise<GracePeriod | null> {
    try {
      const doc = await collections.grace_periods.doc(gracePeriodId).get();
      
      if (!doc.exists) {
        return null;
      }

      const gracePeriodModel = GracePeriodModel.fromFirestore(doc);
      return gracePeriodModel ? { id: doc.id, ...gracePeriodModel.getData() } : null;

    } catch (error: any) {
      logger.error("Error getting grace period:", error);
      throw error;
    }
  }

  /**
   * Obtenir la période de grâce active d'un utilisateur
   */
  async getActiveGracePeriod(userId: string): Promise<GracePeriod | null> {
    try {
      const snapshot = await collections.grace_periods
        .where('userId', '==', userId)
        .where('status', '==', GracePeriodStatus.ACTIVE)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const gracePeriodModel = GracePeriodModel.fromFirestore(doc);
      return gracePeriodModel ? { id: doc.id, ...gracePeriodModel.getData() } : null;

    } catch (error: any) {
      logger.error("Error getting active grace period:", error);
      throw error;
    }
  }

  /**
   * Lister les périodes de grâce avec filtres et pagination
   */
  async listGracePeriods(
    filters: GracePeriodFilters = {},
    options: GracePeriodQueryOptions = {}
  ): Promise<PaginatedGracePeriods> {
    try {
      let query = collections.grace_periods.orderBy('createdAt', 'desc');

      // Appliquer les filtres
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.source) {
        query = query.where('source', '==', filters.source);
      }

      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }

      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }

      // Appliquer la pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const items: GracePeriod[] = [];

      for (const doc of snapshot.docs) {
        const gracePeriodModel = GracePeriodModel.fromFirestore(doc);
        if (gracePeriodModel) {
          const gracePeriod = { id: doc.id, ...gracePeriodModel.getData() };
          
          // Filtrage côté client pour les champs calculés
          if (this.matchesClientFilters(gracePeriod, filters)) {
            items.push(gracePeriod);
          }
        }
      }

      // Compter le total (approximatif pour la performance)
      const totalSnapshot = await collections.grace_periods.get();
      const total = totalSnapshot.size;

      return {
        items,
        total,
        limit,
        offset,
        hasMore: offset + items.length < total
      };

    } catch (error: any) {
      logger.error("Error listing grace periods:", error);
      throw error;
    }
  }

  /**
   * Étendre une période de grâce
   */
  async extendGracePeriod(
    gracePeriodId: string,
    request: ExtendGracePeriodRequest
  ): Promise<GracePeriod> {
    try {
      const existingGracePeriod = await this.getGracePeriod(gracePeriodId);
      if (!existingGracePeriod) {
        throw new Error("Grace period not found");
      }

      if (existingGracePeriod.status !== GracePeriodStatus.ACTIVE) {
        throw new Error("Can only extend active grace periods");
      }

      // Créer le modèle et étendre
      const gracePeriodModel = new GracePeriodModel(existingGracePeriod);
      gracePeriodModel.extend(request);

      // Sauvegarder les modifications
      await collections.grace_periods.doc(gracePeriodId).update(gracePeriodModel.toFirestore());

      // Reprogrammer les notifications si nécessaire
      await this.scheduleNotifications(gracePeriodId);

      logger.info(`Grace period extended: ${gracePeriodId} by ${request.additionalDays} days`);
      return { id: gracePeriodId, ...gracePeriodModel.getData() };

    } catch (error: any) {
      logger.error("Error extending grace period:", error);
      throw error;
    }
  }

  /**
   * Annuler une période de grâce
   */
  async cancelGracePeriod(gracePeriodId: string, reason?: string): Promise<void> {
    try {
      const existingGracePeriod = await this.getGracePeriod(gracePeriodId);
      if (!existingGracePeriod) {
        throw new Error("Grace period not found");
      }

      // Créer le modèle et annuler
      const gracePeriodModel = new GracePeriodModel(existingGracePeriod);
      gracePeriodModel.cancel(reason);

      // Sauvegarder les modifications
      await collections.grace_periods.doc(gracePeriodId).update(gracePeriodModel.toFirestore());

      logger.info(`Grace period cancelled: ${gracePeriodId}`);

    } catch (error: any) {
      logger.error("Error cancelling grace period:", error);
      throw error;
    }
  }

  /**
   * Convertir une période de grâce en abonnement
   */
  async convertToSubscription(
    gracePeriodId: string,
    request: ConvertGracePeriodRequest
  ): Promise<Subscription> {
    try {
      const existingGracePeriod = await this.getGracePeriod(gracePeriodId);
      if (!existingGracePeriod) {
        throw new Error("Grace period not found");
      }

      if (existingGracePeriod.status !== GracePeriodStatus.ACTIVE) {
        throw new Error("Can only convert active grace periods");
      }

      // Créer le modèle et convertir
      const gracePeriodModel = new GracePeriodModel(existingGracePeriod);
      gracePeriodModel.convert(request.planId);

      // Sauvegarder les modifications de la période de grâce
      await collections.grace_periods.doc(gracePeriodId).update(gracePeriodModel.toFirestore());

      // Créer l'abonnement (cette logique devrait être dans le BillingService)
      // Pour l'instant, on retourne un objet subscription basique
      const subscription: Subscription = {
        id: `sub_${Date.now()}`,
        tenantId: existingGracePeriod.tenantId,
        planId: request.planId,
        status: 'active' as any,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        billingCycle: 'monthly' as any,
        basePrice: 0, // À définir selon le plan
        currency: 'EUR',
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gracePeriodId: gracePeriodId,
        isInGracePeriod: false,
        isTrialActive: false,
        planHistory: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`Grace period converted to subscription: ${gracePeriodId} -> ${request.planId}`);
      return subscription;

    } catch (error: any) {
      logger.error("Error converting grace period:", error);
      throw error;
    }
  }

  /**
   * Envoyer les rappels de période de grâce
   */
  async sendGraceReminders(): Promise<NotificationResult> {
    try {
      logger.info("Starting grace period reminders job");

      const result: NotificationResult = {
        sent: 0,
        failed: 0,
        errors: []
      };

      // Obtenir toutes les périodes de grâce actives
      const activeGracePeriods = await this.getActiveGracePeriodsForNotifications();

      for (const gracePeriod of activeGracePeriods) {
        try {
          const gracePeriodModel = new GracePeriodModel(gracePeriod);
          const nextNotification = gracePeriodModel.getNextNotificationDue();

          if (nextNotification) {
            await this.sendNotification(gracePeriod, nextNotification);
            
            // Marquer la notification comme envoyée
            gracePeriodModel.addNotification(nextNotification, true, true);
            await collections.grace_periods.doc(gracePeriod.id!).update(gracePeriodModel.toFirestore());

            result.sent++;
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push(`Failed to send notification for grace period ${gracePeriod.id}: ${error.message}`);
          logger.error(`Error sending notification for grace period ${gracePeriod.id}:`, error);
        }
      }

      logger.info(`Grace reminders job completed: ${result.sent} sent, ${result.failed} failed`);
      return result;

    } catch (error: any) {
      logger.error("Error in grace reminders job:", error);
      throw error;
    }
  }

  /**
   * Programmer les notifications pour une période de grâce
   */
  async scheduleNotifications(gracePeriodId: string): Promise<void> {
    try {
      // Cette méthode pourrait intégrer avec un système de job scheduling
      // Pour l'instant, on log simplement l'intention
      logger.info(`Notifications scheduled for grace period: ${gracePeriodId}`);

      // Dans une implémentation complète, on pourrait :
      // 1. Calculer les dates de notification
      // 2. Créer des jobs dans un système de queue (Bull, Agenda, etc.)
      // 3. Ou utiliser Cloud Scheduler pour déclencher les notifications

    } catch (error: any) {
      logger.error("Error scheduling notifications:", error);
      throw error;
    }
  }

  /**
   * Gérer les périodes de grâce expirées
   */
  async handleExpiredGracePeriods(): Promise<ExpirationResult> {
    try {
      logger.info("Starting expired grace periods job");

      const result: ExpirationResult = {
        expired: 0,
        errors: [],
        processedIds: []
      };

      // Obtenir les périodes de grâce expirées
      const expiredGracePeriods = await this.getExpiredGracePeriods();

      for (const gracePeriod of expiredGracePeriods) {
        try {
          const gracePeriodModel = new GracePeriodModel(gracePeriod);
          gracePeriodModel.expire();

          await collections.grace_periods.doc(gracePeriod.id!).update(gracePeriodModel.toFirestore());

          // Envoyer notification d'expiration
          await this.sendNotification(gracePeriod, GraceNotificationType.EXPIRED);

          result.expired++;
          result.processedIds.push(gracePeriod.id!);

        } catch (error: any) {
          result.errors.push(`Failed to expire grace period ${gracePeriod.id}: ${error.message}`);
          logger.error(`Error expiring grace period ${gracePeriod.id}:`, error);
        }
      }

      logger.info(`Expired grace periods job completed: ${result.expired} expired`);
      return result;

    } catch (error: any) {
      logger.error("Error in expired grace periods job:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des périodes de grâce
   */
  async getGracePeriodStats(filters: Partial<GracePeriodFilters> = {}): Promise<GraceStats> {
    try {
      let query = collections.grace_periods.orderBy('createdAt', 'desc');

      // Appliquer les filtres de base
      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }

      const snapshot = await query.get();
      const gracePeriods = snapshot.docs.map(doc => {
        const model = GracePeriodModel.fromFirestore(doc);
        return model ? { id: doc.id, ...model.getData() } : null;
      }).filter(gp => gp !== null) as GracePeriod[];

      // Calculer les statistiques
      const total = gracePeriods.length;
      
      const byStatus = Object.values(GracePeriodStatus).reduce((acc, status) => {
        acc[status] = gracePeriods.filter(gp => gp.status === status).length;
        return acc;
      }, {} as Record<GracePeriodStatus, number>);

      const bySource = Object.values(GracePeriodSource).reduce((acc, source) => {
        acc[source] = gracePeriods.filter(gp => gp.source === source).length;
        return acc;
      }, {} as Record<GracePeriodSource, number>);

      const averageDuration = total > 0 
        ? gracePeriods.reduce((sum, gp) => sum + gp.durationDays, 0) / total 
        : 0;

      const convertedCount = gracePeriods.filter(gp => gp.status === GracePeriodStatus.CONVERTED).length;
      const conversionRate = total > 0 ? (convertedCount / total) * 100 : 0;

      const now = new Date();
      const expiringIn7Days = gracePeriods.filter(gp => {
        if (gp.status !== GracePeriodStatus.ACTIVE) return false;
        const daysRemaining = Math.ceil((gp.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 7 && daysRemaining > 3;
      }).length;

      const expiringIn3Days = gracePeriods.filter(gp => {
        if (gp.status !== GracePeriodStatus.ACTIVE) return false;
        const daysRemaining = Math.ceil((gp.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 3 && daysRemaining > 1;
      }).length;

      const expiringIn1Day = gracePeriods.filter(gp => {
        if (gp.status !== GracePeriodStatus.ACTIVE) return false;
        const daysRemaining = Math.ceil((gp.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 1 && daysRemaining > 0;
      }).length;

      const overdue = gracePeriods.filter(gp => {
        return gp.status === GracePeriodStatus.ACTIVE && gp.endDate < now;
      }).length;

      const totalExtensions = gracePeriods.reduce((sum, gp) => {
        return sum + (gp.extensionHistory?.length || 0);
      }, 0);

      const averageExtensionDays = totalExtensions > 0 
        ? gracePeriods.reduce((sum, gp) => {
            return sum + (gp.extensionHistory?.reduce((extSum, ext) => extSum + ext.additionalDays, 0) || 0);
          }, 0) / totalExtensions
        : 0;

      return {
        total,
        byStatus,
        bySource,
        averageDuration,
        conversionRate,
        expiringIn7Days,
        expiringIn3Days,
        expiringIn1Day,
        overdue,
        totalExtensions,
        averageExtensionDays
      };

    } catch (error: any) {
      logger.error("Error getting grace period stats:", error);
      throw error;
    }
  }

  // Méthodes privées utilitaires

  private matchesClientFilters(gracePeriod: GracePeriod, filters: GracePeriodFilters): boolean {
    const now = new Date();

    if (filters.expiringInDays !== undefined) {
      if (gracePeriod.status !== GracePeriodStatus.ACTIVE) return false;
      const daysRemaining = Math.ceil((gracePeriod.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining > filters.expiringInDays) return false;
    }

    if (filters.isOverdue !== undefined) {
      const isOverdue = gracePeriod.status === GracePeriodStatus.ACTIVE && gracePeriod.endDate < now;
      if (filters.isOverdue !== isOverdue) return false;
    }

    return true;
  }

  private async getActiveGracePeriodsForNotifications(): Promise<GracePeriod[]> {
    try {
      const snapshot = await collections.grace_periods
        .where('status', '==', GracePeriodStatus.ACTIVE)
        .get();

      return snapshot.docs.map(doc => {
        const model = GracePeriodModel.fromFirestore(doc);
        return model ? { id: doc.id, ...model.getData() } : null;
      }).filter(gp => gp !== null) as GracePeriod[];

    } catch (error: any) {
      logger.error("Error getting active grace periods for notifications:", error);
      return [];
    }
  }

  private async getExpiredGracePeriods(): Promise<GracePeriod[]> {
    try {
      const now = new Date();
      const snapshot = await collections.grace_periods
        .where('status', '==', GracePeriodStatus.ACTIVE)
        .where('endDate', '<=', now)
        .get();

      return snapshot.docs.map(doc => {
        const model = GracePeriodModel.fromFirestore(doc);
        return model ? { id: doc.id, ...model.getData() } : null;
      }).filter(gp => gp !== null) as GracePeriod[];

    } catch (error: any) {
      logger.error("Error getting expired grace periods:", error);
      return [];
    }
  }

  private async sendNotification(
    gracePeriod: GracePeriod, 
    type: GraceNotificationType
  ): Promise<void> {
    try {
      // Cette méthode devrait intégrer avec le service de notifications
      // Pour l'instant, on log simplement
      logger.info(`Sending ${type} notification for grace period ${gracePeriod.id} to user ${gracePeriod.userId}`);

      // Dans une implémentation complète :
      // 1. Obtenir les préférences de notification de l'utilisateur
      // 2. Envoyer l'email via le service d'email
      // 3. Envoyer la notification push si activée
      // 4. Envoyer le SMS si configuré

      // Exemple d'intégration :
      // await emailService.sendGraceReminderEmail(gracePeriod.userId, type, gracePeriod);
      // await pushNotificationService.sendGraceReminder(gracePeriod.userId, type, gracePeriod);

    } catch (error: any) {
      logger.error(`Error sending notification for grace period ${gracePeriod.id}:`, error);
      throw error;
    }
  }
}

// Instance singleton
export const gracePeriodService = new GracePeriodService();
export default gracePeriodService;