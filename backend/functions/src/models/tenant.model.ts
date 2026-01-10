import { DocumentSnapshot, FieldValue } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  Tenant, 
  TenantStatus, 
  TenantSettings, 
  TenantUsage, 
  CreateTenantRequest, 
  UpdateTenantRequest} from "../common/types";

// Interface pour les données tenant côté backend (avec propriétés sensibles)
export interface TenantDocument extends Tenant {
  // Propriétés sensibles/internes
  billingInfo?: {
    customerId?: string;
    subscriptionId?: string;
    paymentMethodId?: string;
    lastPaymentDate?: Date;
    nextBillingDate?: Date;
  };
  internalNotes?: string;
  suspensionReason?: string;
  cancellationReason?: string;
  // Audit et sécurité
  lastAccessAt?: Date;
  securitySettings?: {
    ipWhitelist?: string[];
    ssoRequired?: boolean;
    mfaRequired?: boolean;
  };
}

export class TenantModel extends BaseModel<TenantDocument> {
  constructor(data: Partial<TenantDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const tenant = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(tenant, [
      "name", "slug", "planId", "status", "createdBy"
    ]);

    // Validation du nom
    this.validateLength(tenant.name, 2, 100, "name");

    // Validation du slug
    if (!this.validateSlug(tenant.slug)) {
      throw new Error("Invalid slug format. Must contain only lowercase letters, numbers, and hyphens");
    }
    this.validateLength(tenant.slug, 2, 50, "slug");

    // Validation du statut
    if (!Object.values(TenantStatus).includes(tenant.status)) {
      throw new Error("Invalid tenant status");
    }

    // Validation des paramètres
    if (tenant.settings) {
      this.validateSettings(tenant.settings);
    }

    // Validation de l'usage
    if (tenant.usage) {
      this.validateUsage(tenant.usage);
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = TenantModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API (exclut les champs sensibles)
  public toAPI(): Partial<TenantDocument> {
    const data = this.data as any;

    const cleanSensitiveData = (obj: any): any => {
      if (!obj || typeof obj !== 'object') { return obj; }

      const cleaned = { ...obj };

      // Supprimer les champs sensibles
      delete cleaned.billingInfo;
      delete cleaned.internalNotes;
      delete cleaned.suspensionReason;
      delete cleaned.cancellationReason;
      delete cleaned.securitySettings;
      delete cleaned.auditLog;

      // Nettoyer récursivement les objets imbriqués
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] && typeof cleaned[key] === 'object'
          && !Array.isArray(cleaned[key]) && !(cleaned[key] instanceof Date)) {
          cleaned[key] = cleanSensitiveData(cleaned[key]);
        }
      });

      return cleaned;
    };

    return cleanSensitiveData(data);
  }

  static fromFirestore(doc: DocumentSnapshot): TenantModel | null {
    if (!doc.exists) { return null; }

    const data = doc.data()!;
    const convertedData = TenantModel.prototype.convertDatesFromFirestore(data);

    return new TenantModel({
      id: doc.id,
      ...convertedData,
    });
  }

  // Méthodes spécifiques aux tenants
  static fromCreateRequest(request: CreateTenantRequest & { id?: string }): TenantModel {
    const cleanRequest = this.removeUndefinedFields(request);

    const tenantData = {
      ...cleanRequest,
      slug: cleanRequest.slug || this.generateSlugFromName(cleanRequest.name),
      status: TenantStatus.TRIAL, // Statut par défaut
      settings: {
        ...this.getDefaultSettings(),
        ...this.removeUndefinedFields(cleanRequest.settings || {}),
      },
      usage: this.getInitialUsage(),
      isNewlyCreated: true,
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: cleanRequest.metadata || {},
    };

    const finalTenantData = this.removeUndefinedFields(tenantData);
    return new TenantModel(finalTenantData);
  }

  // Utilitaire pour nettoyer les champs undefined récursivement
  public static removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      });
      return cleaned;
    }

    return obj;
  }

  private static getDefaultSettings(): TenantSettings {
    return {
      timezone: "Europe/Paris",
      locale: "fr-FR",
      currency: "EUR",
    };
  }

  private static getInitialUsage(): TenantUsage {
    return {
      users: 0,
      events: 0,
      storage: 0,
      apiCalls: 0,
    };
  }

  private static generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Validation du slug
  private validateSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  // Validation des paramètres
  private validateSettings(settings: TenantSettings): void {
    if (settings.timezone && !this.isValidTimezone(settings.timezone)) {
      throw new Error("Invalid timezone");
    }

    if (settings.locale && !this.isValidLocale(settings.locale)) {
      throw new Error("Invalid locale format");
    }

    if (settings.currency && !this.isValidCurrency(settings.currency)) {
      throw new Error("Invalid currency code");
    }
  }

  // Validation de l'usage
  private validateUsage(usage: TenantUsage): void {
    const fields = ['users', 'events', 'storage', 'apiCalls'] as const;
    
    fields.forEach(field => {
      if (usage[field] !== undefined) {
        if (!Number.isInteger(usage[field]) || usage[field] < 0) {
          throw new Error(`${field} must be a non-negative integer`);
        }
      }
    });
  }

  // Validation de timezone (simplifiée)
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  // Validation de locale
  private isValidLocale(locale: string): boolean {
    const localeRegex = /^[a-z]{2}-[A-Z]{2}$/;
    return localeRegex.test(locale);
  }

  // Validation de currency
  private isValidCurrency(currency: string): boolean {
    const currencyRegex = /^[A-Z]{3}$/;
    return currencyRegex.test(currency);
  }

  // Méthodes d'instance
  isActive(): boolean {
    return this.data.status === TenantStatus.ACTIVE;
  }

  isTrial(): boolean {
    return this.data.status === TenantStatus.TRIAL;
  }

  isSuspended(): boolean {
    return this.data.status === TenantStatus.SUSPENDED;
  }

  isCancelled(): boolean {
    return this.data.status === TenantStatus.CANCELLED;
  }

  canAccess(): boolean {
    return this.isActive() || this.isTrial();
  }

  // Mettre à jour l'usage
  updateUsage(usageType: keyof TenantUsage, increment: number = 1): void {
    const currentUsage = this.data.usage?.[usageType] || 0;
    const newUsage = Math.max(0, currentUsage + increment);

    this.update({
      usage: {
        ...this.data.usage,
        [usageType]: newUsage
      }
    });
  }

  // Marquer l'onboarding comme terminé
  completeOnboarding(): void {
    this.update({
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      isNewlyCreated: false,
    });
  }

  // Marquer le premier accès au dashboard
  markFirstDashboardAccess(): void {
    if (!this.data.firstDashboardAccess) {
      this.update({
        firstDashboardAccess: new Date(),
      });
    }
  }

  // Suspendre le tenant
  suspend(reason?: string, suspendedBy?: string): void {
    this.update({
      status: TenantStatus.SUSPENDED,
      suspensionReason: reason,
    }, {
      action: "tenant_suspended",
      performedBy: suspendedBy,
      reason,
    });
  }

  // Réactiver le tenant
  reactivate(reactivatedBy?: string): void {
    const updates: any = {
      status: TenantStatus.ACTIVE,
      lastAccessAt: new Date(),
    };

    // Supprimer la raison de suspension
    if (this.data.suspensionReason) {
      updates.suspensionReason = FieldValue.delete();
    }

    this.update(updates, {
      action: "tenant_reactivated",
      performedBy: reactivatedBy,
    });
  }

  // Annuler le tenant
  cancel(reason?: string, cancelledBy?: string): void {
    this.update({
      status: TenantStatus.CANCELLED,
      cancellationReason: reason,
    }, {
      action: "tenant_cancelled",
      performedBy: cancelledBy,
      reason ,
    });
  }

  // Mettre à jour le profil
  updateProfile(updates: UpdateTenantRequest): void {
    const allowedFields: (keyof UpdateTenantRequest)[] = [
      "name", "slug", "settings", "metadata"
    ];

    const safeUpdates = BaseModel.sanitize(updates, allowedFields);
    this.update(safeUpdates);
  }

  // Changer de plan
  changePlan(newPlanId: string, changedBy?: string): void {
    this.update({
      planId: newPlanId,
    }, {
      action: "plan_changed",
      performedBy: changedBy,
      oldValue: { planId: this.data.planId },
      newValue: { planId: newPlanId },
    });
  }

  /**
   * Convertir TenantModel en Tenant (pour les réponses API)
   */
  toTenant(): Tenant {
    const tenantData = this.data;
    return {
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug,
      planId: tenantData.planId,
      status: tenantData.status,
      settings: tenantData.settings || TenantModel.getDefaultSettings(),
      usage: tenantData.usage || TenantModel.getInitialUsage(),
      isNewlyCreated: tenantData.isNewlyCreated,
      onboardingCompleted: tenantData.onboardingCompleted,
      onboardingCompletedAt: tenantData.onboardingCompletedAt,
      firstDashboardAccess: tenantData.firstDashboardAccess,
      createdAt: tenantData.createdAt,
      updatedAt: tenantData.updatedAt,
      createdBy: tenantData.createdBy,
      metadata: tenantData.metadata || {}
    };
  }

  /**
   * Obtenir le nom du tenant
   */
  get name(): string {
    return this.data.name;
  }

  /**
   * Obtenir le slug du tenant
   */
  get slug(): string {
    return this.data.slug;
  }

  /**
   * Obtenir le statut du tenant
   */
  get status(): TenantStatus {
    return this.data.status;
  }

  /**
   * Obtenir l'ID du plan
   */
  get planId(): string {
    return this.data.planId;
  }
}