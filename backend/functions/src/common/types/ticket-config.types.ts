/**
 * Types pour la configuration de billetterie - Backend
 * Gère les types de billets, tarification dynamique et codes promo
 */

export interface TicketTypeConfig {
  id: string;
  eventId: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  quantitySold: number;
  quantityReserved: number; // Billets en cours d'achat (sessions actives)
  salesStartDate?: Date;
  salesEndDate?: Date;
  visibility: TicketVisibility;
  order: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum TicketVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  HIDDEN = 'hidden'
}

export interface DynamicPricing {
  id: string;
  ticketTypeId: string;
  eventId: string;
  tenantId: string;
  enabled: boolean;
  earlyBird?: EarlyBirdPricing;
  lastMinute?: LastMinutePricing;
  tiered?: TieredPricing[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EarlyBirdPricing {
  price: number;
  endDate: Date;
  quantity?: number; // Limite de billets à ce prix
  quantitySold?: number;
}

export interface LastMinutePricing {
  price: number;
  startDate: Date;
}

export interface TieredPricing {
  name: string;
  price: number;
  startDate: Date;
  endDate: Date;
  quantity?: number;
  quantitySold?: number;
}

export interface PromoCode {
  id: string;
  eventId: string;
  tenantId: string;
  code: string;
  type: PromoCodeType;
  value: number; // Pourcentage (0-100) ou montant fixe
  maxUses?: number;
  usedCount: number;
  validFrom?: Date;
  validUntil?: Date;
  applicableTicketTypes?: string[]; // IDs des types de billets
  minimumPurchaseAmount?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum PromoCodeType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount'
}

export interface TicketingSettings {
  id: string;
  eventId: string;
  tenantId: string;
  enabled: boolean;
  currency: string;
  taxRate?: number; // Taux de TVA en pourcentage
  serviceFeeType: ServiceFeeType;
  serviceFeeValue: number; // Pourcentage ou montant fixe
  serviceFeePayedBy: ServiceFeePayer;
  refundPolicy?: RefundPolicy;
  customQuestions?: CustomQuestion[];
  maxTicketsPerOrder?: number;
  requiresApproval: boolean;
  waitlistEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ServiceFeeType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  NONE = 'none'
}

export enum ServiceFeePayer {
  ORGANIZER = 'organizer',
  PARTICIPANT = 'participant'
}

export interface RefundPolicy {
  enabled: boolean;
  fullRefundUntil?: Date; // Date limite pour remboursement complet
  partialRefundPercentage?: number; // Pourcentage remboursé après la date limite
  noRefundAfter?: Date; // Date après laquelle aucun remboursement
  customPolicy?: string; // Texte personnalisé de la politique
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // Pour select, radio, checkbox
  order: number;
}

export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  DATE = 'date'
}

// ============================================
// Request Types
// ============================================

export interface CreateTicketTypeRequest {
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
  visibility?: TicketVisibility;
  order?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
  visibility?: TicketVisibility;
  order?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreatePromoCodeRequest {
  eventId: string;
  code: string;
  type: PromoCodeType;
  value: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicableTicketTypes?: string[];
  minimumPurchaseAmount?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePromoCodeRequest {
  code?: string;
  type?: PromoCodeType;
  value?: number;
  maxUses?: number;
  validFrom?: Date;
  validUntil?: Date;
  applicableTicketTypes?: string[];
  minimumPurchaseAmount?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateTicketingSettingsRequest {
  eventId: string;
  enabled?: boolean;
  currency?: string;
  taxRate?: number;
  serviceFeeType?: ServiceFeeType;
  serviceFeeValue?: number;
  serviceFeePayedBy?: ServiceFeePayer;
  refundPolicy?: RefundPolicy;
  customQuestions?: CustomQuestion[];
  maxTicketsPerOrder?: number;
  requiresApproval?: boolean;
  waitlistEnabled?: boolean;
}

export interface UpdateTicketingSettingsRequest {
  enabled?: boolean;
  currency?: string;
  taxRate?: number;
  serviceFeeType?: ServiceFeeType;
  serviceFeeValue?: number;
  serviceFeePayedBy?: ServiceFeePayer;
  refundPolicy?: RefundPolicy;
  customQuestions?: CustomQuestion[];
  maxTicketsPerOrder?: number;
  requiresApproval?: boolean;
  waitlistEnabled?: boolean;
}

export interface ValidatePromoCodeRequest {
  code: string;
  eventId: string;
  ticketTypes: Array<{
    ticketTypeId: string;
    quantity: number;
    price: number;
  }>;
}

export interface PromoCodeValidation {
  isValid: boolean;
  promoCode?: PromoCode;
  discountAmount: number;
  message?: string;
}

// ============================================
// Response Types
// ============================================

export interface TicketTypeWithAvailability extends TicketTypeConfig {
  availableQuantity: number;
  currentPrice: number; // Prix actuel (avec tarification dynamique si applicable)
  dynamicPricing?: DynamicPricing;
}

export interface TicketingConfigSummary {
  settings: TicketingSettings;
  ticketTypes: TicketTypeWithAvailability[];
  promoCodes: PromoCode[];
  totalRevenue: number;
  totalTicketsSold: number;
  totalTicketsAvailable: number;
}

// ============================================
// Statistics & Analytics Types
// ============================================

export interface TicketTypeStatistics {
  ticketTypeId: string;
  name: string;
  totalQuantity: number;
  quantitySold: number;
  quantityReserved: number;
  quantityAvailable: number;
  revenue: number;
  averagePrice: number;
  conversionRate: number; // % de billets vendus
}

export interface EventTicketingStatistics {
  eventId: string;
  totalRevenue: number;
  totalTicketsSold: number;
  totalTicketsAvailable: number;
  conversionRate: number;
  averageOrderValue: number;
  ticketTypeStats: TicketTypeStatistics[];
  promoCodesUsed: number;
  totalDiscount: number;
  createdAt: Date;
}

// ============================================
// Bulk Operations Types
// ============================================

export interface BulkTicketTypeUpdate {
  ticketTypeIds: string[];
  updates: Partial<UpdateTicketTypeRequest>;
}
