import { logger } from "firebase-functions";
import { collections } from "../../config/database";
import {
    PromoCode,
    PromoCodeModel,
    CreatePromoCodeRequest,
    UpdatePromoCodeRequest,
    PromoCodeValidationContext,
    PromoCodeValidationResult,
    PromoCodeUsage,
    PromoCodeUsageModel,
    PromoCodeQueryOptions,
    PromoCodeFilters,
    PaginatedPromoCodes, PromoCodeStats
} from "../../models/promoCode.model";




/**
 * Interface pour les rapports d'utilisation
 */
export interface UsageReportFilters {
  promoCodeId?: string;
  userId?: string;
  tenantId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UsageReport {
  totalUsages: number;
  totalDiscountApplied: number;
  usagesByCode: Array<{
    promoCodeId: string;
    code: string;
    uses: number;
    discountApplied: number;
  }>;
  usagesByUser: Array<{
    userId: string;
    uses: number;
    discountApplied: number;
  }>;
  timeline: Array<{
    date: string;
    uses: number;
    discountApplied: number;
  }>;
}

/**
 * Interface pour le résultat d'application d'un code
 */
export interface ApplicationResult {
  success: boolean;
  promoCodeUsage?: PromoCodeUsage;
  discountApplied: number;
  finalAmount: number;
  error?: string;
  errorCode?: string;
}

/**
 * Service de gestion des codes promotionnels
 */
export class PromoCodeService {
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 heure en millisecondes
  private readonly MAX_ATTEMPTS_PER_HOUR = 10;

  /**
   * Créer un nouveau code promo
   */
  async createPromoCode(
    request: CreatePromoCodeRequest, 
    createdBy: string
  ): Promise<PromoCode> {
    try {
      logger.info(`Creating promo code: ${request.code} by user ${createdBy}`);

      // Vérifier que le code n'existe pas déjà
      const existingCode = await this.getPromoCodeByCode(request.code);
      if (existingCode) {
        throw new Error(`Promo code '${request.code}' already exists`);
      }

      // Créer le modèle et valider
      const promoCodeModel = PromoCodeModel.fromCreateRequest(request, createdBy);
      await promoCodeModel.validate();

      // Sauvegarder en base
      const docRef = await collections.promo_codes.add(promoCodeModel.toFirestore());
      
      const createdPromoCode: PromoCode = {
        id: docRef.id,
        ...promoCodeModel.getData()
      };

      logger.info(`Promo code created successfully: ${createdPromoCode.id}`);
      return createdPromoCode;

    } catch (error: any) {
      logger.error("Error creating promo code:", error);
      throw error;
    }
  }

  /**
   * Obtenir un code promo par ID
   */
  async getPromoCode(promoCodeId: string): Promise<PromoCode | null> {
    try {
      const doc = await collections.promo_codes.doc(promoCodeId).get();
      
      if (!doc.exists) {
        return null;
      }

      const promoCodeModel = PromoCodeModel.fromFirestore(doc);
      return promoCodeModel ? { id: doc.id, ...promoCodeModel.getData() } : null;

    } catch (error: any) {
      logger.error("Error getting promo code:", error);
      throw error;
    }
  }

  /**
   * Obtenir un code promo par son code
   */
  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    try {
      const normalizedCode = code.toUpperCase();
      const snapshot = await collections.promo_codes
        .where('code', '==', normalizedCode)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const promoCodeModel = PromoCodeModel.fromFirestore(doc);
      return promoCodeModel ? { id: doc.id, ...promoCodeModel.getData() } : null;

    } catch (error: any) {
      logger.error("Error getting promo code by code:", error);
      throw error;
    }
  }

  /**
   * Lister les codes promo avec filtres et pagination
   */
  async listPromoCodes(
    filters: PromoCodeFilters = {},
    options: PromoCodeQueryOptions = {}
  ): Promise<PaginatedPromoCodes> {
    try {
      let query = collections.promo_codes.orderBy('createdAt', 'desc');

      // Appliquer les filtres
      if (filters.isActive !== undefined) {
        query = query.where('isActive', '==', filters.isActive);
      }

      if (filters.discountType) {
        query = query.where('discountType', '==', filters.discountType);
      }

      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }

      if (filters.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }

      // Appliquer la pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      if (offset > 0) {
        query = query.offset(offset);
      }
      query = query.limit(limit);

      const snapshot = await query.get();
      const items: PromoCode[] = [];

      for (const doc of snapshot.docs) {
        const promoCodeModel = PromoCodeModel.fromFirestore(doc);
        if (promoCodeModel) {
          const promoCode = { id: doc.id, ...promoCodeModel.getData() };
          
          // Filtrage côté client pour les champs non indexés
          if (this.matchesClientFilters(promoCode, filters)) {
            items.push(promoCode);
          }
        }
      }

      // Compter le total (approximatif pour la performance)
      const totalSnapshot = await collections.promo_codes.get();
      const total = totalSnapshot.size;

      return {
        items,
        total,
        limit,
        offset,
        hasMore: offset + items.length < total
      };

    } catch (error: any) {
      logger.error("Error listing promo codes:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour un code promo
   */
  async updatePromoCode(
    promoCodeId: string,
    updates: UpdatePromoCodeRequest
  ): Promise<PromoCode> {
    try {
      const existingPromoCode = await this.getPromoCode(promoCodeId);
      if (!existingPromoCode) {
        throw new Error("Promo code not found");
      }

      // Créer le modèle avec les mises à jour
      const updatedData = {
        ...existingPromoCode,
        ...updates,
        updatedAt: new Date()
      };

      const promoCodeModel = new PromoCodeModel(updatedData);
      await promoCodeModel.validate();

      // Sauvegarder les modifications
      await collections.promo_codes.doc(promoCodeId).update(promoCodeModel.toFirestore());

      logger.info(`Promo code updated: ${promoCodeId}`);
      return { id: promoCodeId, ...promoCodeModel.getData() };

    } catch (error: any) {
      logger.error("Error updating promo code:", error);
      throw error;
    }
  }

  /**
   * Supprimer un code promo
   */
  async deletePromoCode(promoCodeId: string): Promise<void> {
    try {
      // Vérifier que le code existe
      const existingPromoCode = await this.getPromoCode(promoCodeId);
      if (!existingPromoCode) {
        throw new Error("Promo code not found");
      }

      // Vérifier qu'il n'y a pas d'utilisations actives
      const usagesSnapshot = await collections.promo_code_usages
        .where('promoCodeId', '==', promoCodeId)
        .limit(1)
        .get();

      if (!usagesSnapshot.empty) {
        throw new Error("Cannot delete promo code with existing usages. Deactivate it instead.");
      }

      // Supprimer le code
      await collections.promo_codes.doc(promoCodeId).delete();

      logger.info(`Promo code deleted: ${promoCodeId}`);

    } catch (error: any) {
      logger.error("Error deleting promo code:", error);
      throw error;
    }
  }

  /**
   * Valider un code promo
   */
  async validateCode(
    code: string, 
    context: PromoCodeValidationContext
  ): Promise<PromoCodeValidationResult> {
    try {
      // Vérifier le rate limiting
      const canAttempt = await this.checkRateLimit(context.userId);
      if (!canAttempt) {
        return {
          isValid: false,
          error: "Trop de tentatives. Veuillez réessayer plus tard.",
          errorCode: "RATE_LIMIT_EXCEEDED"
        };
      }

      // Obtenir le code promo
      const promoCode = await this.getPromoCodeByCode(code);
      if (!promoCode) {
        await this.logAttempt(context.userId, code, false);
        return {
          isValid: false,
          error: "Code promotionnel invalide",
          errorCode: "CODE_NOT_FOUND"
        };
      }

      // Créer le modèle pour utiliser les méthodes de validation
      const promoCodeModel = new PromoCodeModel(promoCode);
      
      // Vérifier les limites d'usage par utilisateur
      if (promoCode.maxUsesPerUser) {
        const userUsageCount = await this.getUserUsageCount(promoCode.id!, context.userId);
        if (userUsageCount >= promoCode.maxUsesPerUser) {
          await this.logAttempt(context.userId, code, false);
          return {
            isValid: false,
            error: "Vous avez déjà utilisé ce code le nombre maximum de fois",
            errorCode: "USER_LIMIT_EXCEEDED"
          };
        }
      }

      // Utiliser la méthode de validation du modèle
      const validationResult = promoCodeModel.canBeUsedBy(context);
      
      await this.logAttempt(context.userId, code, validationResult.isValid);
      return validationResult;

    } catch (error: any) {
      logger.error("Error validating promo code:", error);
      return {
        isValid: false,
        error: "Erreur lors de la validation du code",
        errorCode: "VALIDATION_ERROR"
      };
    }
  }

  /**
   * Appliquer un code promo
   */
  async applyCode(
    code: string,
    userId: string,
    subscriptionId: string,
    tenantId: string,
    subscriptionAmount: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ApplicationResult> {
    try {
      // Valider d'abord le code
      const validation = await this.validateCode(code, {
        userId,
        tenantId,
        subscriptionAmount,
        isNewUser: await this.isNewUser(userId)
      });

      if (!validation.isValid) {
        return {
          success: false,
          discountApplied: 0,
          finalAmount: subscriptionAmount,
          error: validation.error,
          errorCode: validation.errorCode
        };
      }

      // Obtenir le code promo
      const promoCode = await this.getPromoCodeByCode(code);
      if (!promoCode) {
        return {
          success: false,
          discountApplied: 0,
          finalAmount: subscriptionAmount,
          error: "Code promotionnel non trouvé",
          errorCode: "CODE_NOT_FOUND"
        };
      }

      // Créer l'enregistrement d'utilisation
      const promoCodeUsage = PromoCodeUsageModel.create(
        promoCode.id!,
        userId,
        validation.discountAmount!,
        tenantId,
        subscriptionId,
        ipAddress,
        userAgent
      );

      await promoCodeUsage.validate();

      // Sauvegarder l'utilisation
      const usageRef = await collections.promo_code_usages.add(promoCodeUsage.toFirestore());

      // Incrémenter le compteur d'utilisation du code promo
      const promoCodeModel = new PromoCodeModel(promoCode);
      promoCodeModel.incrementUsage();
      await collections.promo_codes.doc(promoCode.id!).update(promoCodeModel.toFirestore());

      const finalUsage: PromoCodeUsage = {
        id: usageRef.id,
        ...promoCodeUsage.getData()
      };

      logger.info(`Promo code applied successfully: ${code} for user ${userId}`);

      return {
        success: true,
        promoCodeUsage: finalUsage,
        discountApplied: validation.discountAmount!,
        finalAmount: validation.finalAmount!
      };

    } catch (error: any) {
      logger.error("Error applying promo code:", error);
      return {
        success: false,
        discountApplied: 0,
        finalAmount: subscriptionAmount,
        error: "Erreur lors de l'application du code",
        errorCode: "APPLICATION_ERROR"
      };
    }
  }

  /**
   * Révoquer l'utilisation d'un code promo
   */
  async revokeCode(usageId: string): Promise<void> {
    try {
      // Obtenir l'utilisation
      const usageDoc = await collections.promo_code_usages.doc(usageId).get();
      if (!usageDoc.exists) {
        throw new Error("Promo code usage not found");
      }

      const usageModel = PromoCodeUsageModel.fromFirestore(usageDoc);
      if (!usageModel) {
        throw new Error("Invalid promo code usage data");
      }

      const usage = usageModel.getData();

      // Décrémenter le compteur du code promo
      const promoCode = await this.getPromoCode(usage.promoCodeId);
      if (promoCode) {
        const promoCodeModel = new PromoCodeModel(promoCode);
        promoCodeModel.decrementUsage();
        await collections.promo_codes.doc(promoCode.id!).update(promoCodeModel.toFirestore());
      }

      // Supprimer l'enregistrement d'utilisation
      await collections.promo_code_usages.doc(usageId).delete();

      logger.info(`Promo code usage revoked: ${usageId}`);

    } catch (error: any) {
      logger.error("Error revoking promo code:", error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'un code promo
   */
  async getPromoCodeStats(promoCodeId: string): Promise<PromoCodeStats> {
    try {
      const usagesSnapshot = await collections.promo_code_usages
        .where('promoCodeId', '==', promoCodeId)
        .get();

      const usages = usagesSnapshot.docs.map(doc => {
        const model = PromoCodeUsageModel.fromFirestore(doc);
        return model ? { id: doc.id, ...model.getData() } : null;
      }).filter(usage => usage !== null) as PromoCodeUsage[];

      const totalUses = usages.length;
      const uniqueUsers = new Set(usages.map(u => u.userId)).size;
      const totalDiscountApplied = usages.reduce((sum, u) => sum + u.discountApplied, 0);
      const averageDiscountPerUse = totalUses > 0 ? totalDiscountApplied / totalUses : 0;

      // Grouper par jour
      const usageByDay = this.groupUsagesByDay(usages);

      // Top utilisateurs
      const userUsages = new Map<string, { uses: number; totalDiscount: number }>();
      usages.forEach(usage => {
        const current = userUsages.get(usage.userId) || { uses: 0, totalDiscount: 0 };
        current.uses++;
        current.totalDiscount += usage.discountApplied;
        userUsages.set(usage.userId, current);
      });

      const topUsers = Array.from(userUsages.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.totalDiscount - a.totalDiscount)
        .slice(0, 10);

      // Taux de conversion (simplifié - nécessiterait plus de données)
      const conversionRate = uniqueUsers > 0 ? (uniqueUsers / totalUses) * 100 : 0;

      return {
        totalUses,
        uniqueUsers,
        totalDiscountApplied,
        averageDiscountPerUse,
        usageByDay,
        topUsers,
        conversionRate
      };

    } catch (error: any) {
      logger.error("Error getting promo code stats:", error);
      throw error;
    }
  }

  /**
   * Générer un rapport d'utilisation
   */
  async getUsageReport(filters: UsageReportFilters = {}): Promise<UsageReport> {
    try {
      let query = collections.promo_code_usages.orderBy('usedAt', 'desc');

      // Appliquer les filtres
      if (filters.promoCodeId) {
        query = query.where('promoCodeId', '==', filters.promoCodeId);
      }
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }

      const snapshot = await query.get();
      const usages = snapshot.docs.map(doc => {
        const model = PromoCodeUsageModel.fromFirestore(doc);
        return model ? { id: doc.id, ...model.getData() } : null;
      }).filter(usage => usage !== null) as PromoCodeUsage[];

      // Filtrer par dates côté client
      const filteredUsages = usages.filter(usage => {
        if (filters.dateFrom && usage.usedAt < filters.dateFrom) {return false;}
        if (filters.dateTo && usage.usedAt > filters.dateTo) {return false;}
        return true;
      });

      const totalUsages = filteredUsages.length;
      const totalDiscountApplied = filteredUsages.reduce((sum, u) => sum + u.discountApplied, 0);

      // Grouper par code promo
      const usagesByCode = this.groupUsagesByPromoCode(filteredUsages);

      // Grouper par utilisateur
      const usagesByUser = this.groupUsagesByUser(filteredUsages);

      // Timeline
      const timeline = this.groupUsagesByDay(filteredUsages);

      return {
        totalUsages,
        totalDiscountApplied,
        usagesByCode,
        usagesByUser,
        timeline
      };

    } catch (error: any) {
      logger.error("Error generating usage report:", error);
      throw error;
    }
  }

  // Méthodes privées utilitaires

  private matchesClientFilters(promoCode: PromoCode, filters: PromoCodeFilters): boolean {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesCode = promoCode.code.toLowerCase().includes(searchLower);
      const matchesName = promoCode.name.toLowerCase().includes(searchLower);
      if (!matchesCode && !matchesName) {
        return false;
      }
    }

    if (filters.validFrom && promoCode.validFrom < filters.validFrom) {
      return false;
    }

    if (filters.validUntil && promoCode.validUntil && promoCode.validUntil > filters.validUntil) {
      return false;
    }

    return true;
  }

  private async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = now - this.RATE_LIMIT_WINDOW;

      const attemptsSnapshot = await collections.promo_code_attempts
        .where('userId', '==', userId)
        .where('timestamp', '>', new Date(windowStart))
        .get();

      return attemptsSnapshot.size < this.MAX_ATTEMPTS_PER_HOUR;

    } catch (error) {
      logger.error("Error checking rate limit:", error);
      return true; // En cas d'erreur, autoriser la tentative
    }
  }

  private async logAttempt(userId: string, code: string, success: boolean): Promise<void> {
    try {
      await collections.promo_code_attempts.add({
        userId,
        code: code.toUpperCase(),
        success,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error("Error logging promo code attempt:", error);
      // Ne pas faire échouer l'opération principale
    }
  }

  private async getUserUsageCount(promoCodeId: string, userId: string): Promise<number> {
    try {
      const snapshot = await collections.promo_code_usages
        .where('promoCodeId', '==', promoCodeId)
        .where('userId', '==', userId)
        .get();

      return snapshot.size;

    } catch (error) {
      logger.error("Error getting user usage count:", error);
      return 0;
    }
  }

  private async isNewUser(userId: string): Promise<boolean> {
    try {
      // Vérifier si l'utilisateur a déjà eu un abonnement
      const subscriptionsSnapshot = await collections.subscriptions
        .where('userId', '==', userId)
        .limit(1)
        .get();

      return subscriptionsSnapshot.empty;

    } catch (error) {
      logger.error("Error checking if user is new:", error);
      return false; // En cas d'erreur, considérer comme utilisateur existant
    }
  }

  private groupUsagesByDay(usages: PromoCodeUsage[]): Array<{
    date: string;
    uses: number;
    discountApplied: number;
  }> {
    const grouped = new Map<string, { uses: number; discountApplied: number }>();

    usages.forEach(usage => {
      const date = usage.usedAt.toISOString().split('T')[0];
      const current = grouped.get(date) || { uses: 0, discountApplied: 0 };
      current.uses++;
      current.discountApplied += usage.discountApplied;
      grouped.set(date, current);
    });

    return Array.from(grouped.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupUsagesByPromoCode(usages: PromoCodeUsage[]): Array<{
    promoCodeId: string;
    code: string;
    uses: number;
    discountApplied: number;
  }> {
    const grouped = new Map<string, { uses: number; discountApplied: number }>();

    usages.forEach(usage => {
      const current = grouped.get(usage.promoCodeId) || { uses: 0, discountApplied: 0 };
      current.uses++;
      current.discountApplied += usage.discountApplied;
      grouped.set(usage.promoCodeId, current);
    });

    return Array.from(grouped.entries()).map(([promoCodeId, stats]) => ({
      promoCodeId,
      code: '', // À remplir avec une requête séparée si nécessaire
      ...stats
    }));
  }

  private groupUsagesByUser(usages: PromoCodeUsage[]): Array<{
    userId: string;
    uses: number;
    discountApplied: number;
  }> {
    const grouped = new Map<string, { uses: number; discountApplied: number }>();

    usages.forEach(usage => {
      const current = grouped.get(usage.userId) || { uses: 0, discountApplied: 0 };
      current.uses++;
      current.discountApplied += usage.discountApplied;
      grouped.set(usage.userId, current);
    });

    return Array.from(grouped.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.discountApplied - a.discountApplied);
  }
}

// Instance singleton
export const promoCodeService = new PromoCodeService();
export default promoCodeService;