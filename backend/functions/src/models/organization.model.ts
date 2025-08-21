// backend/functions/src/models/organization.model.ts - Modèle d'organisation

import {
  CreateOrganizationRequest,
  Organization,
  OrganizationBranding,
  OrganizationFeatures,
  OrganizationSector,
  OrganizationSettings,
  OrganizationStatus,
  SECTOR_TEMPLATES,
  UpdateOrganizationRequest
} from "@attendance-x/shared";
import { BaseModel, ValidationError } from "./base.model";

export class OrganizationModel extends BaseModel<Organization> {

  public name: string;
  public displayName?: string;
  public description?: string;
  public sector: OrganizationSector;
  public status: OrganizationStatus;
  public settings: OrganizationSettings;
  public branding: OrganizationBranding;
  public subscription: any;
  public contactInfo: any;
  public createdBy: string;
  public memberCount: number;
  public maxMembers?: number;
  public isActive: boolean;
  public features: OrganizationFeatures;
  public metadata: Record<string, any>;

  constructor(data: Partial<Organization>) {
    super(data);
    this.name = data.name || '';
    this.displayName = data.displayName;
    this.description = data.description;
    this.sector = data.sector || OrganizationSector.OTHER;
    this.status = data.status || OrganizationStatus.ACTIVE;
    this.settings = data.settings || this.getDefaultSettings();
    this.branding = data.branding || this.getDefaultBranding();
    this.subscription = data.subscription || this.getDefaultSubscription();
    this.contactInfo = data.contactInfo || {};
    this.createdBy = data.createdBy || '';
    this.memberCount = data.memberCount || 0;
    this.maxMembers = data.maxMembers;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.features = data.features || this.getDefaultFeatures();
    this.metadata = data.metadata || {};
  }

  /**
   * Créer une organisation minimale lors de l'enregistrement d'un utilisateur
   */
  static createMinimal(name: string, createdBy: string): OrganizationModel {
    const organization = new OrganizationModel({
      name: name.trim(),
      sector: OrganizationSector.OTHER,
      status: OrganizationStatus.PENDING_VERIFICATION, // Statut pour indiquer que la configuration est en attente
      createdBy,
      memberCount: 0, // Commencer à 0, sera incrémenté lors de l'ajout du propriétaire
      isActive: true
    });

    return organization;
  }

  /**
   * Créer une organisation à partir d'une requête
   */
  static fromCreateRequest(request: CreateOrganizationRequest, createdBy: string): OrganizationModel {
    const template = request.templateId ?
      SECTOR_TEMPLATES[request.sector].filter(t => t.id===request.templateId) :
      SECTOR_TEMPLATES[request.sector][0][0];

    // Créer les paramètres par défaut
    const defaultSettings = {
      timezone: 'Europe/Paris',
      language: 'fr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h' as const,
      currency: 'EUR',
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'daily' as const
      },
      security: {
        requireTwoFactor: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false
        },
        sessionTimeout: 120
      },
      integrations: {
        allowedIntegrations: [],
        apiKeys: {}
      }
    };

    const defaultBranding = {
      primaryColor: '#3B82F6',
      secondaryColor: '#6B7280',
      accentColor: '#10B981'
    };

    const organization = new OrganizationModel({
      name: request.name,
      displayName: request.displayName,
      description: request.description,
      sector: request.sector,
      contactInfo: request.contactInfo,
      settings: {
        ...defaultSettings,
        ...template?.settings,
        ...request.settings
      },
      branding: {
        ...defaultBranding,
        ...template?.branding,
        ...request.branding
      },
      createdBy,
      status: OrganizationStatus.ACTIVE
    });

    return organization;
  }

  /**
   * Valider les données de l'organisation
   */
  async validate(isMinimal: boolean = false): Promise<boolean> {
    const errors: string[] = [];

    // Validation du nom
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Le nom de l\'organisation est requis');
    }

    if (this.name && this.name.length < 2) {
      errors.push('Le nom de l\'organisation doit contenir au moins 2 caractères');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Le nom de l\'organisation ne peut pas dépasser 100 caractères');
    }

    // Si c'est une validation minimale (lors de l'enregistrement), on s'arrête ici
    if (isMinimal) {
      if (errors.length > 0) {
        throw new ValidationError('Données d\'organisation invalides');
      }
      return true;
    }

    // Validation du nom d'affichage
    if (this.displayName && this.displayName.length > 150) {
      errors.push('Le nom d\'affichage ne peut pas dépasser 150 caractères');
    }

    // Validation de la description
    if (this.description && this.description.length > 500) {
      errors.push('La description ne peut pas dépasser 500 caractères');
    }

    // Validation du secteur
    if (!Object.values(OrganizationSector).includes(this.sector)) {
      errors.push('Secteur d\'activité invalide');
    }

    // Validation du statut
    if (!Object.values(OrganizationStatus).includes(this.status)) {
      errors.push('Statut d\'organisation invalide');
    }

    // Validation des informations de contact
    if (this.contactInfo) {
      if (this.contactInfo.email && !this.isValidEmail(this.contactInfo.email)) {
        errors.push('Adresse email invalide');
      }

      if (this.contactInfo.phone && !this.isValidPhone(this.contactInfo.phone)) {
        errors.push('Numéro de téléphone invalide');
      }

      if (this.contactInfo.website && !this.isValidUrl(this.contactInfo.website)) {
        errors.push('URL du site web invalide');
      }
    }

    // Validation des paramètres
    if (this.settings) {
      this.validateSettings(errors);
    }

    // Validation du branding
    if (this.branding) {
      this.validateBranding(errors);
    }

    // Validation du nombre de membres
    if (this.memberCount < 0) {
      errors.push('Le nombre de membres ne peut pas être négatif');
    }

    if (this.maxMembers && this.maxMembers < 1) {
      errors.push('Le nombre maximum de membres doit être au moins 1');
    }

    if (this.maxMembers && this.memberCount > this.maxMembers) {
      errors.push('Le nombre de membres dépasse la limite autorisée');
    }

    if (errors.length > 0) {
      throw new ValidationError('Données d\'organisation invalides');
    }

    return true;
  }

  /**
   * Valider les paramètres de l'organisation
   */
  private validateSettings(errors: string[]): void {
    const settings = this.settings;

    // Validation du fuseau horaire
    if (settings.timezone && !this.isValidTimezone(settings.timezone)) {
      errors.push('Fuseau horaire invalide');
    }

    // Validation de la langue
    if (settings.language && !this.isValidLanguageCode(settings.language)) {
      errors.push('Code de langue invalide');
    }

    // Validation des heures de travail
    if (settings.workingHours) {
      if (!this.isValidTimeFormat(settings.workingHours.start)) {
        errors.push('Heure de début de travail invalide (format HH:mm attendu)');
      }

      if (!this.isValidTimeFormat(settings.workingHours.end)) {
        errors.push('Heure de fin de travail invalide (format HH:mm attendu)');
      }

      if (settings.workingHours.workingDays) {
        const validDays = settings.workingHours.workingDays.every(day =>
          Number.isInteger(day) && day >= 0 && day <= 6
        );
        if (!validDays) {
          errors.push('Jours de travail invalides (0-6 attendus)');
        }
      }
    }

    // Validation de la politique de mot de passe
    if (settings.security?.passwordPolicy) {
      const policy = settings.security.passwordPolicy;

      if (policy.minLength < 6 || policy.minLength > 128) {
        errors.push('La longueur minimale du mot de passe doit être entre 6 et 128 caractères');
      }
    }

    // Validation du timeout de session
    if (settings.security?.sessionTimeout) {
      if (settings.security.sessionTimeout < 5 || settings.security.sessionTimeout > 1440) {
        errors.push('Le timeout de session doit être entre 5 et 1440 minutes');
      }
    }
  }

  /**
   * Valider le branding de l'organisation
   */
  private validateBranding(errors: string[]): void {
    const branding = this.branding;

    // Validation des URLs
    if (branding.logoUrl && !this.isValidUrl(branding.logoUrl)) {
      errors.push('URL du logo invalide');
    }

    if (branding.favicon && !this.isValidUrl(branding.favicon)) {
      errors.push('URL du favicon invalide');
    }

    // Validation des couleurs (format hexadécimal)
    const colorFields = ['primaryColor', 'secondaryColor', 'accentColor'];
    colorFields.forEach(field => {
      const color = branding[field as keyof OrganizationBranding];
      if (color && !this.isValidHexColor(color as string)) {
        errors.push(`Couleur ${field} invalide (format hexadécimal attendu)`);
      }
    });

    // Validation du CSS personnalisé
    if (branding.customCss && branding.customCss.length > 10000) {
      errors.push('Le CSS personnalisé ne peut pas dépasser 10000 caractères');
    }
  }

  /**
   * Compléter l'organisation lors de la première connexion
   */
  async completeSetup(request: CreateOrganizationRequest): Promise<void> {
    // Mettre à jour avec les données complètes
    this.displayName = request.displayName;
    this.description = request.description;
    this.sector = request.sector;
    this.contactInfo = request.contactInfo || {};

    if (request.settings) {
      this.settings = { ...this.settings, ...request.settings };
    }

    if (request.branding) {
      this.branding = { ...this.branding, ...request.branding };
    }

    // Changer le statut pour indiquer que la configuration est terminée
    this.status = OrganizationStatus.ACTIVE;

    // Validation complète maintenant
    await this.validate(false);

    // Mettre à jour updatedAt
    super.update({
      displayName: this.displayName,
      description: this.description,
      sector: this.sector,
      contactInfo: this.contactInfo,
      settings: this.settings,
      branding: this.branding,
      status: this.status
    });
  }

  /**
   * Vérifier si l'organisation a besoin d'être configurée
   */
  needsSetup(): boolean {
    return this.status === OrganizationStatus.PENDING_VERIFICATION;
  }

  /**
   * Mettre à jour l'organisation
   */
  async updateOrganization(updates: UpdateOrganizationRequest): Promise<void> {
    const updateData: Partial<Organization> = {};

    if (updates.name !== undefined) {
      this.name = updates.name;
      updateData.name = updates.name;
    }

    if (updates.displayName !== undefined) {
      this.displayName = updates.displayName;
      updateData.displayName = updates.displayName;
    }

    if (updates.description !== undefined) {
      this.description = updates.description;
      updateData.description = updates.description;
    }

    if (updates.contactInfo) {
      this.contactInfo = { ...this.contactInfo, ...updates.contactInfo };
      updateData.contactInfo = this.contactInfo;
    }

    if (updates.settings) {
      this.settings = { ...this.settings, ...updates.settings };
      updateData.settings = this.settings;
    }

    if (updates.branding) {
      this.branding = { ...this.branding, ...updates.branding };
      updateData.branding = this.branding;
    }

    if (updates.features) {
      this.features = { ...this.features, ...updates.features };
      updateData.features = this.features;
    }

    await this.validate();

    // Utiliser la méthode update du BaseModel pour mettre à jour updatedAt
    super.update(updateData);
  }

  /**
   * Vérifier si l'organisation peut ajouter un membre
   */
  canAddMember(): boolean {
    if (!this.isActive) {
      return false;
    }

    // Permettre l'ajout de membres pour les organisations en attente de vérification
    // (nécessaire pour ajouter le propriétaire lors de la création)
    if (this.status !== OrganizationStatus.ACTIVE && 
        this.status !== OrganizationStatus.PENDING_VERIFICATION) {
      return false;
    }

    if (this.maxMembers && this.memberCount >= this.maxMembers) {
      return false;
    }

    return true;
  }

  /**
   * Incrémenter le nombre de membres
   */
  incrementMemberCount(): void {
    if (!this.canAddMember()) {
      throw new ValidationError('Impossible d\'ajouter un membre à cette organisation');
    }

    this.memberCount += 1;
    super.update({
      memberCount: this.memberCount
    });
  }

  /**
   * Décrémenter le nombre de membres
   */
  decrementMemberCount(): void {
    if (this.memberCount > 0) {
      this.memberCount -= 1;
      super.update({
        memberCount: this.memberCount
      });
    }
  }

  /**
   * Obtenir les paramètres par défaut
   */
  private getDefaultSettings(): OrganizationSettings {
    return {
      timezone: 'Europe/Paris',
      language: 'fr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'EUR',
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5] // Lundi à vendredi
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'daily'
      },
      security: {
        requireTwoFactor: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false
        },
        sessionTimeout: 120 // 2 heures
      },
      integrations: {
        allowedIntegrations: [],
        apiKeys: {}
      }
    };
  }

  /**
   * Obtenir le branding par défaut
   */
  private getDefaultBranding(): OrganizationBranding {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#6B7280',
      accentColor: '#10B981'
    };
  }

  /**
   * Obtenir les fonctionnalités par défaut
   */
  private getDefaultFeatures(): OrganizationFeatures {
    return {
      attendance: true,
      events: true,
      appointments: true,
      analytics: false,
      integrations: false,
      customBranding: false,
      advancedReporting: false,
      apiAccess: false,
      ssoIntegration: false,
      auditLogs: false
    };
  }

  /**
   * Obtenir l'abonnement par défaut
   */
  private getDefaultSubscription(): any {
    return {
      plan: 'free',
      status: 'active',
      startDate: new Date(),
      billingCycle: 'monthly',
      features: ['attendance', 'events', 'appointments'],
      limits: {
        maxUsers: 10,
        maxEvents: 50,
        maxStorage: 100, // MB
        maxIntegrations: 1
      }
    };
  }

  /**
   * Convertir en objet simple pour la base de données
   */
  toFirestore(): any {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      sector: this.sector,
      status: this.status,
      settings: this.settings,
      branding: this.branding,
      subscription: this.subscription,
      contactInfo: this.contactInfo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      memberCount: this.memberCount,
      maxMembers: this.maxMembers,
      isActive: this.isActive,
      features: this.features,
      metadata: this.metadata
    };
  }

  /**
   * Créer une instance depuis les données Firestore
   */
  static fromFirestore(doc: any): OrganizationModel {
    const data = doc.data();
    return new OrganizationModel({
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    });
  }

  // Méthodes de validation utilitaires

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  private isValidLanguageCode(language: string): boolean {
    const validLanguages = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru'];
    return validLanguages.includes(language);
  }

  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}