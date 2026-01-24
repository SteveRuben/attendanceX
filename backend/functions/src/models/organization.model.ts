import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  Organization, 
  OrganizationDocument, 
  OrganizationStatus, 
  OrganizationSettings,
  OrganizationBranding,
  OrganizationDomain,
  CreateOrganizationRequest,
  SmtpConfiguration,
  SmsConfiguration,
  DnsStatus
} from "../types/organization.types";
import { ValidationError } from "../utils/common/errors";

export class OrganizationModel extends BaseModel<OrganizationDocument> {
  constructor(data: Partial<OrganizationDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const organization = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(organization, [
      "name", "displayName", "tenantId", "status", "createdBy"
    ]);

    // Validation du nom
    this.validateLength(organization.name, 2, 100, "name");
    this.validateLength(organization.displayName, 2, 100, "displayName");

    // Validation du statut
    if (!Object.values(OrganizationStatus).includes(organization.status)) {
      throw new ValidationError("Invalid organization status");
    }

    // Validation du sous-domaine
    if (organization.domain?.subdomain) {
      this.validateSubdomain(organization.domain.subdomain);
    }

    // Validation du domaine personnalisé
    if (organization.domain?.customDomain) {
      this.validateCustomDomain(organization.domain.customDomain);
    }

    // Validation des paramètres
    if (organization.settings) {
      this.validateSettings(organization.settings);
    }

    // Validation du branding
    if (organization.branding) {
      this.validateBranding(organization.branding);
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API (exclut les champs sensibles)
  public toAPI(): Partial<OrganizationDocument> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles
    delete cleaned.internalNotes;
    delete cleaned.auditLog;
    
    // Nettoyer les credentials SMTP et SMS
    if (cleaned.settings?.smtp?.auth) {
      cleaned.settings.smtp.auth = {
        user: cleaned.settings.smtp.auth.user,
        pass: "***" // Masquer le mot de passe
      };
    }
    
    if (cleaned.settings?.notifications?.smsProvider?.credentials) {
      const credentials = cleaned.settings.notifications.smsProvider.credentials;
      Object.keys(credentials).forEach(key => {
        if (key.includes('token') || key.includes('secret') || key.includes('key')) {
          credentials[key] = "***";
        }
      });
    }
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): OrganizationModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const instance = new OrganizationModel({ id: doc.id });
    const convertedData = instance.convertDatesFromFirestore(data);

    return new OrganizationModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateOrganizationRequest & { tenantId: string; createdBy: string }
  ): OrganizationModel {
    const organizationData = {
      ...request,
      status: OrganizationStatus.ACTIVE,
      domain: {
        subdomain: request.subdomain,
        customDomain: request.customDomain,
        dnsConfig: {
          records: [],
          status: DnsStatus.PENDING,
          lastChecked: new Date(),
          errors: []
        },
        verification: {
          status: 'pending' as const,
          verificationToken: OrganizationModel.generateVerificationToken(),
          method: 'dns' as const,
          attempts: 0
        },
        ssl: {
          enabled: false,
          status: 'pending' as const,
          autoRenew: true
        }
      },
      settings: {
        ...OrganizationModel.getDefaultSettings(),
        ...request.settings
      },
      branding: {
        ...OrganizationModel.getDefaultBranding(),
        ...request.branding
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new OrganizationModel(organizationData);
  }

  private static getDefaultSettings(): OrganizationSettings {
    return {
      timezone: "Europe/Paris",
      locale: "fr-FR",
      currency: "EUR",
      defaultFormSettings: {
        theme: {
          primaryColor: "#3b82f6",
          secondaryColor: "#64748b",
          fontFamily: "Inter"
        },
        footer: {
          showPoweredBy: true,
          customText: ""
        }
      },
      smtp: {
        enabled: false,
        host: "",
        port: 587,
        secure: false,
        auth: {
          user: "",
          pass: ""
        },
        from: {
          name: "",
          email: ""
        }
      },
      notifications: {
        email: true,
        smsProvider: {
          enabled: false,
          provider: 'twilio',
          credentials: {},
          dailyLimit: 100,
          monthlyLimit: 1000
        }
      },
      security: {
        requireSsl: true,
        allowedOrigins: [],
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60
        },
        twoFactorAuth: {
          enabled: false,
          required: false
        }
      },
      integrations: {
        customScripts: []
      },
      storage: {
        provider: 'firebase',
        maxFileSize: 10,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
      }
    };
  }

  private static getDefaultBranding(): OrganizationBranding {
    return {
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
        accent: "#10b981",
        background: "#ffffff",
        text: "#1f2937"
      },
      fonts: {
        primary: "Inter",
        secondary: "Inter"
      }
    };
  }

  private static generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Validation du sous-domaine
  private validateSubdomain(subdomain: string): void {
    const subdomainRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!subdomainRegex.test(subdomain)) {
      throw new ValidationError("Invalid subdomain format. Must contain only lowercase letters, numbers, and hyphens");
    }
    
    if (subdomain.length < 3 || subdomain.length > 63) {
      throw new ValidationError("Subdomain must be between 3 and 63 characters");
    }
    
    // Vérifier les sous-domaines réservés
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog'];
    if (reservedSubdomains.includes(subdomain)) {
      throw new ValidationError("This subdomain is reserved");
    }
  }

  // Validation du domaine personnalisé
  private validateCustomDomain(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      throw new ValidationError("Invalid custom domain format");
    }
  }

  // Validation des paramètres
  private validateSettings(settings: OrganizationSettings): void {
    if (settings.timezone && !this.isValidTimezone(settings.timezone)) {
      throw new ValidationError("Invalid timezone");
    }

    if (settings.locale && !this.isValidLocale(settings.locale)) {
      throw new ValidationError("Invalid locale format");
    }

    if (settings.currency && !this.isValidCurrency(settings.currency)) {
      throw new ValidationError("Invalid currency code");
    }

    // Validation SMTP
    if (settings.smtp?.enabled) {
      this.validateSmtpConfiguration(settings.smtp);
    }

    // Validation SMS
    if (settings.notifications?.smsProvider?.enabled) {
      this.validateSmsConfiguration(settings.notifications.smsProvider);
    }
  }

  // Validation du branding
  private validateBranding(branding: OrganizationBranding): void {
    // Validation des couleurs (format hex)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    Object.entries(branding.colors).forEach(([key, color]) => {
      if (!colorRegex.test(color)) {
        throw new ValidationError(`Invalid color format for ${key}: ${color}`);
      }
    });

    // Validation des URLs
    if (branding.logo?.url && !this.isValidUrl(branding.logo.url)) {
      throw new ValidationError("Invalid logo URL");
    }

    if (branding.favicon && !this.isValidUrl(branding.favicon)) {
      throw new ValidationError("Invalid favicon URL");
    }

    if (branding.backgroundImage && !this.isValidUrl(branding.backgroundImage)) {
      throw new ValidationError("Invalid background image URL");
    }
  }

  // Validation de la configuration SMTP
  private validateSmtpConfiguration(smtp: SmtpConfiguration): void {
    if (!smtp.host || smtp.host.trim().length === 0) {
      throw new ValidationError("SMTP host is required");
    }

    if (!smtp.port || smtp.port < 1 || smtp.port > 65535) {
      throw new ValidationError("Invalid SMTP port");
    }

    if (!smtp.auth?.user || smtp.auth.user.trim().length === 0) {
      throw new ValidationError("SMTP username is required");
    }

    if (!smtp.auth?.pass || smtp.auth.pass.trim().length === 0) {
      throw new ValidationError("SMTP password is required");
    }

    if (!smtp.from?.email || !this.isValidEmail(smtp.from.email)) {
      throw new ValidationError("Valid SMTP from email is required");
    }

    if (!smtp.from?.name || smtp.from.name.trim().length === 0) {
      throw new ValidationError("SMTP from name is required");
    }
  }

  // Validation de la configuration SMS
  private validateSmsConfiguration(sms: SmsConfiguration): void {
    if (!sms.provider) {
      throw new ValidationError("SMS provider is required");
    }

    const validProviders = ['twilio', 'aws-sns', 'nexmo', 'custom'];
    if (!validProviders.includes(sms.provider)) {
      throw new ValidationError("Invalid SMS provider");
    }

    // Validation spécifique par fournisseur
    switch (sms.provider) {
      case 'twilio':
        if (!sms.credentials.accountSid || !sms.credentials.authToken) {
          throw new ValidationError("Twilio Account SID and Auth Token are required");
        }
        break;
      case 'aws-sns':
        if (!sms.credentials.accessKeyId || !sms.credentials.secretAccessKey || !sms.credentials.region) {
          throw new ValidationError("AWS credentials and region are required");
        }
        break;
      case 'nexmo':
        if (!sms.credentials.apiKey || !sms.credentials.apiSecret) {
          throw new ValidationError("Nexmo API key and secret are required");
        }
        break;
      case 'custom':
        if (!sms.credentials.webhookUrl) {
          throw new ValidationError("Custom webhook URL is required");
        }
        break;
    }
  }

  // Validation de timezone
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

  // Validation d'email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validation d'URL
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Méthodes d'instance
  isActive(): boolean {
    return this.data.status === OrganizationStatus.ACTIVE;
  }

  isSuspended(): boolean {
    return this.data.status === OrganizationStatus.SUSPENDED;
  }

  isPending(): boolean {
    return this.data.status === OrganizationStatus.PENDING;
  }

  isArchived(): boolean {
    return this.data.status === OrganizationStatus.ARCHIVED;
  }

  canAccess(): boolean {
    return this.isActive() || this.isPending();
  }

  // Mettre à jour les paramètres
  updateSettings(settings: Partial<OrganizationSettings>): void {
    this.update({
      settings: {
        ...this.data.settings,
        ...settings
      }
    });
  }

  // Mettre à jour le branding
  updateBranding(branding: Partial<OrganizationBranding>): void {
    this.update({
      branding: {
        ...this.data.branding,
        ...branding
      }
    });
  }

  // Mettre à jour le domaine
  updateDomain(domain: Partial<OrganizationDomain>): void {
    this.update({
      domain: {
        ...this.data.domain,
        ...domain
      }
    });
  }

  // Suspendre l'organisation
  suspend(reason?: string, suspendedBy?: string): void {
    this.update({
      status: OrganizationStatus.SUSPENDED
    }, {
      action: "organization_suspended",
      performedBy: suspendedBy,
      reason
    });
  }

  // Réactiver l'organisation
  reactivate(reactivatedBy?: string): void {
    this.update({
      status: OrganizationStatus.ACTIVE
    }, {
      action: "organization_reactivated",
      performedBy: reactivatedBy
    });
  }

  // Archiver l'organisation
  archive(archivedBy?: string): void {
    this.update({
      status: OrganizationStatus.ARCHIVED
    }, {
      action: "organization_archived",
      performedBy: archivedBy
    });
  }

  /**
   * Convertir OrganizationModel en Organization (pour les réponses API)
   */
  toOrganization(): Organization {
    const orgData = this.data;
    return {
      id: orgData.id,
      tenantId: orgData.tenantId,
      name: orgData.name,
      displayName: orgData.displayName,
      description: orgData.description,
      logo: orgData.logo,
      website: orgData.website,
      domain: orgData.domain,
      settings: orgData.settings,
      branding: orgData.branding,
      createdBy: orgData.createdBy,
      createdAt: orgData.createdAt,
      updatedAt: orgData.updatedAt,
      status: orgData.status
    };
  }

  /**
   * Obtenir le nom de l'organisation
   */
  get name(): string {
    return this.data.name;
  }

  /**
   * Obtenir le nom d'affichage
   */
  get displayName(): string {
    return this.data.displayName;
  }

  /**
   * Obtenir le statut
   */
  get status(): OrganizationStatus {
    return this.data.status;
  }

  /**
   * Obtenir le sous-domaine
   */
  get subdomain(): string {
    return this.data.domain?.subdomain || '';
  }

  /**
   * Obtenir le domaine personnalisé
   */
  get customDomain(): string | undefined {
    return this.data.domain?.customDomain;
  }
}