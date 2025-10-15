/**
 * Service de gestion des codes promo côté frontend
 * Gère la validation, l'application et la gestion des codes promo
 */

import { apiService } from './api';
import {
  PromoCode,
  PromoCodeDiscountType,
  AppliedPromoCode,
  PromoCodeValidationRequest,
  PromoCodeValidationResponse,
  ApplyPromoCodeRequest,
  ApplyPromoCodeResponse,
  PromoCodeStats
} from '../shared/types/billing.types';

export interface CreatePromoCodeRequest {
  code: string;
  name: string;
  description?: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  validFrom: Date;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  applicablePlans?: string[];
  minimumAmount?: number;
  newUsersOnly?: boolean;
  tenantId?: string;
}

export interface UpdatePromoCodeRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
  applicablePlans?: string[];
  minimumAmount?: number;
}

export interface ListPromoCodesRequest {
  isActive?: boolean;
  discountType?: PromoCodeDiscountType;
  tenantId?: string;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'validFrom' | 'validUntil' | 'currentUses' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ListPromoCodesResponse {
  promoCodes: PromoCode[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface BulkGeneratePromoCodesRequest {
  baseName: string;
  count: number;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  maxUsesPerUser?: number;
}

export interface BulkGeneratePromoCodesResponse {
  success: boolean;
  generatedCodes: PromoCode[];
  message: string;
}

export interface UsageReportRequest {
  promoCodeId?: string;
  userId?: string;
  tenantId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UsageReportResponse {
  usages: PromoCodeUsage[];
  summary: {
    totalUsages: number;
    totalDiscountAmount: number;
    uniqueUsers: number;
    conversionRate: number;
  };
}

export interface PromoCodeUsage {
  id: string;
  promoCodeId: string;
  promoCode: PromoCode;
  userId: string;
  tenantId: string;
  subscriptionId: string;
  discountAmount: number;
  appliedAt: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
}

class PromoCodeService {
  private baseUrl = '/api/v1/promo-codes';

  // ==================== MÉTHODES PUBLIQUES (UTILISATEUR) ====================

  /**
   * Valider un code promo
   */
  async validatePromoCode(request: PromoCodeValidationRequest): Promise<PromoCodeValidationResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/validate`, request);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.response?.data?.message || 'Code promo invalide'
      };
    }
  }

  /**
   * Obtenir un code promo par son code
   */
  async getPromoCodeByCode(code: string): Promise<PromoCode | null> {
    try {
      const response = await apiService.get(`${this.baseUrl}/by-code/${encodeURIComponent(code)}`);
      return this.transformPromoCodeDates(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Appliquer un code promo
   */
  async applyPromoCode(request: ApplyPromoCodeRequest): Promise<ApplyPromoCodeResponse> {
    const response = await apiService.post(`${this.baseUrl}/apply`, request);
    return {
      ...response.data,
      appliedPromoCode: response.data.appliedPromoCode 
        ? this.transformAppliedPromoCodeDates(response.data.appliedPromoCode)
        : undefined
    };
  }

  // ==================== MÉTHODES D'ADMINISTRATION ====================

  /**
   * Créer un nouveau code promo (admin seulement)
   */
  async createPromoCode(request: CreatePromoCodeRequest): Promise<PromoCode> {
    const response = await apiService.post(this.baseUrl, {
      ...request,
      validFrom: request.validFrom.toISOString(),
      validUntil: request.validUntil?.toISOString()
    });
    return this.transformPromoCodeDates(response.data);
  }

  /**
   * Lister les codes promo avec filtres et pagination (admin seulement)
   */
  async listPromoCodes(request: ListPromoCodesRequest = {}): Promise<ListPromoCodesResponse> {
    const response = await apiService.get(this.baseUrl, { params: request });
    return {
      ...response.data,
      promoCodes: response.data.promoCodes.map((code: any) => this.transformPromoCodeDates(code))
    };
  }

  /**
   * Obtenir un code promo par ID (admin seulement)
   */
  async getPromoCode(promoCodeId: string): Promise<PromoCode> {
    const response = await apiService.get(`${this.baseUrl}/${promoCodeId}`);
    return this.transformPromoCodeDates(response.data);
  }

  /**
   * Mettre à jour un code promo (admin seulement)
   */
  async updatePromoCode(promoCodeId: string, request: UpdatePromoCodeRequest): Promise<PromoCode> {
    const response = await apiService.put(`${this.baseUrl}/${promoCodeId}`, {
      ...request,
      validUntil: request.validUntil?.toISOString()
    });
    return this.transformPromoCodeDates(response.data);
  }

  /**
   * Supprimer un code promo (admin seulement)
   */
  async deletePromoCode(promoCodeId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete(`${this.baseUrl}/${promoCodeId}`);
    return response.data;
  }

  /**
   * Activer/désactiver un code promo (admin seulement)
   */
  async togglePromoCode(promoCodeId: string, isActive: boolean): Promise<PromoCode> {
    const response = await apiService.put(`${this.baseUrl}/${promoCodeId}/toggle`, { isActive });
    return this.transformPromoCodeDates(response.data);
  }

  /**
   * Révoquer l'utilisation d'un code promo (admin seulement)
   */
  async revokePromoCodeUsage(usageId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete(`${this.baseUrl}/usage/${usageId}`);
    return response.data;
  }

  /**
   * Obtenir les statistiques d'un code promo (admin seulement)
   */
  async getPromoCodeStats(promoCodeId: string): Promise<PromoCodeStats> {
    const response = await apiService.get(`${this.baseUrl}/${promoCodeId}/stats`);
    return response.data;
  }

  /**
   * Générer un rapport d'utilisation (admin seulement)
   */
  async getUsageReport(request: UsageReportRequest = {}): Promise<UsageReportResponse> {
    const params = {
      ...request,
      dateFrom: request.dateFrom?.toISOString(),
      dateTo: request.dateTo?.toISOString()
    };
    
    const response = await apiService.get(`${this.baseUrl}/usage-report`, { params });
    return {
      ...response.data,
      usages: response.data.usages.map((usage: any) => ({
        ...usage,
        appliedAt: new Date(usage.appliedAt),
        revokedAt: usage.revokedAt ? new Date(usage.revokedAt) : undefined,
        promoCode: this.transformPromoCodeDates(usage.promoCode)
      }))
    };
  }

  /**
   * Générer des codes promo en masse (admin seulement)
   */
  async bulkGeneratePromoCodes(request: BulkGeneratePromoCodesRequest): Promise<BulkGeneratePromoCodesResponse> {
    const response = await apiService.post(`${this.baseUrl}/bulk-generate`, {
      ...request,
      validFrom: request.validFrom?.toISOString(),
      validUntil: request.validUntil?.toISOString()
    });
    
    return {
      ...response.data,
      generatedCodes: response.data.generatedCodes.map((code: any) => this.transformPromoCodeDates(code))
    };
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Calculer la réduction pour un montant donné
   */
  calculateDiscount(promoCode: PromoCode, amount: number): number {
    if (promoCode.discountType === PromoCodeDiscountType.PERCENTAGE) {
      return Math.round((amount * promoCode.discountValue / 100) * 100) / 100;
    } else {
      return Math.min(promoCode.discountValue, amount);
    }
  }

  /**
   * Calculer le montant final après application du code promo
   */
  calculateFinalAmount(promoCode: PromoCode, originalAmount: number): number {
    const discount = this.calculateDiscount(promoCode, originalAmount);
    return Math.max(0, originalAmount - discount);
  }

  /**
   * Vérifier si un code promo est valide pour un plan donné
   */
  isValidForPlan(promoCode: PromoCode, planId: string): boolean {
    if (!promoCode.applicablePlans || promoCode.applicablePlans.length === 0) {
      return true; // Applicable à tous les plans
    }
    return promoCode.applicablePlans.includes(planId);
  }

  /**
   * Vérifier si un code promo respecte le montant minimum
   */
  meetsMinimumAmount(promoCode: PromoCode, amount: number): boolean {
    if (!promoCode.minimumAmount) {
      return true;
    }
    return amount >= promoCode.minimumAmount;
  }

  /**
   * Vérifier si un code promo est encore dans sa période de validité
   */
  isWithinValidityPeriod(promoCode: PromoCode): boolean {
    const now = new Date();
    const validFrom = new Date(promoCode.validFrom);
    const validUntil = promoCode.validUntil ? new Date(promoCode.validUntil) : null;

    if (now < validFrom) {
      return false; // Pas encore valide
    }

    if (validUntil && now > validUntil) {
      return false; // Expiré
    }

    return true;
  }

  /**
   * Vérifier si un code promo a atteint sa limite d'utilisation
   */
  hasReachedUsageLimit(promoCode: PromoCode): boolean {
    if (!promoCode.maxUses) {
      return false; // Pas de limite
    }
    return promoCode.currentUses >= promoCode.maxUses;
  }

  /**
   * Formater un code promo pour l'affichage
   */
  formatPromoCodeForDisplay(promoCode: PromoCode): string {
    if (promoCode.discountType === PromoCodeDiscountType.PERCENTAGE) {
      return `${promoCode.discountValue}% de réduction`;
    } else {
      return `${promoCode.discountValue}€ de réduction`;
    }
  }

  /**
   * Obtenir le statut d'un code promo
   */
  getPromoCodeStatus(promoCode: PromoCode): 'active' | 'expired' | 'not_started' | 'usage_limit_reached' | 'inactive' {
    if (!promoCode.isActive) {
      return 'inactive';
    }

    if (this.hasReachedUsageLimit(promoCode)) {
      return 'usage_limit_reached';
    }

    const now = new Date();
    const validFrom = new Date(promoCode.validFrom);
    const validUntil = promoCode.validUntil ? new Date(promoCode.validUntil) : null;

    if (now < validFrom) {
      return 'not_started';
    }

    if (validUntil && now > validUntil) {
      return 'expired';
    }

    return 'active';
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Transformer les dates d'un code promo
   */
  private transformPromoCodeDates(promoCode: any): PromoCode {
    return {
      ...promoCode,
      validFrom: new Date(promoCode.validFrom),
      validUntil: promoCode.validUntil ? new Date(promoCode.validUntil) : undefined,
      createdAt: new Date(promoCode.createdAt),
      updatedAt: new Date(promoCode.updatedAt)
    };
  }

  /**
   * Transformer les dates d'un code promo appliqué
   */
  private transformAppliedPromoCodeDates(appliedPromoCode: any): AppliedPromoCode {
    return {
      ...appliedPromoCode,
      appliedAt: new Date(appliedPromoCode.appliedAt),
      promoCode: this.transformPromoCodeDates(appliedPromoCode.promoCode)
    };
  }
}

// Instance singleton
export const promoCodeService = new PromoCodeService();
export default promoCodeService;