
import { CreateUserRequest, OrganizationRole, UpdateUserOrganizationRequest, UpdateUserRequest, User, UserPreferences, UserProfile } from "../common/types";
import { BaseModel, ValidationError } from "./base.model";

export class UserOrganizationModel extends BaseModel<User> {
  public email: string;
  public name: string;
  public firstName?: string;
  public lastName?: string;
  public displayName?: string;
  public avatar?: string;
  public phone?: string;

  // Contexte d'organisation
  public organizationId?: string;
  public organizationRole?: OrganizationRole;
  public isOrganizationAdmin: boolean;
  public joinedOrganizationAt?: Date;

  // Profil utilisateur
  public profile: UserProfile;
  public preferences: UserPreferences;

  // Métadonnées système
  public lastLoginAt?: Date;
  public isActive: boolean;
  public isEmailVerified: boolean;
  public isPhoneVerified: boolean;

  // Sécurité
  public twoFactorEnabled: boolean;
  public lastPasswordChange?: Date;

  // Métadonnées
  public metadata: Record<string, any>;

  constructor(data: Partial<User>) {
    super(data);

    this.email = data.email || '';
    this.name = data.name || '';
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.displayName = data.displayName || this.generateDisplayName();
    this.avatar = data.avatar;
    this.phone = data.phone;

    // Contexte d'organisation
    this.organizationId = data.organizationId;
    this.organizationRole = data.organizationRole;
    this.isOrganizationAdmin = data.isOrganizationAdmin || false;
    this.joinedOrganizationAt = data.joinedOrganizationAt;

    // Profil utilisateur
    this.profile = data.profile || this.getDefaultProfile();
    this.preferences = data.preferences || this.getDefaultPreferences();

    // Métadonnées système
    this.lastLoginAt = data.lastLoginAt;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isEmailVerified = data.isEmailVerified || false;
    this.isPhoneVerified = data.isPhoneVerified || false;

    // Sécurité
    this.twoFactorEnabled = data.twoFactorEnabled || false;
    this.lastPasswordChange = data.lastPasswordChange;

    // Métadonnées
    this.metadata = data.metadata || {};
  }

  /**
   * Créer un utilisateur à partir d'une requête
   */
  static fromCreateRequest(request: CreateUserRequest): UserOrganizationModel {
    const user = new UserOrganizationModel({
      email: request.email.toLowerCase().trim(),
      name: request.name.trim(),
      firstName: request.firstName?.trim(),
      lastName: request.lastName?.trim(),
      phone: request.phone?.trim(),
      organizationId: request.organizationId,
      organizationRole: request.organizationRole,
      profile: request.profile,
      preferences: request.preferences
    });

    user.validate();
    return user;
  }

  /**
   * Valider les données utilisateur
   */
  async validate(): Promise<boolean> {
    const errors: string[] = [];

    // Validation de l'email
    if (!this.email || this.email.trim().length === 0) {
      errors.push('L\'adresse email est requise');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Adresse email invalide');
    }

    // Validation du nom
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Le nom est requis');
    }

    if (this.name && this.name.length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Le nom ne peut pas dépasser 100 caractères');
    }

    // Validation du prénom et nom de famille
    if (this.firstName && this.firstName.length > 50) {
      errors.push('Le prénom ne peut pas dépasser 50 caractères');
    }

    if (this.lastName && this.lastName.length > 50) {
      errors.push('Le nom de famille ne peut pas dépasser 50 caractères');
    }

    // Validation du téléphone
    if (this.phone && !this.isValidPhone(this.phone)) {
      errors.push('Numéro de téléphone invalide');
    }

    // Validation du rôle d'organisation
    if (this.organizationRole && !Object.values(OrganizationRole).includes(this.organizationRole)) {
      errors.push('Rôle d\'organisation invalide');
    }

    // Validation de la cohérence organisation
    if (this.organizationId && !this.organizationRole) {
      errors.push('Le rôle d\'organisation est requis si l\'utilisateur appartient à une organisation');
    }

    if (this.organizationRole && !this.organizationId) {
      errors.push('L\'ID d\'organisation est requis si l\'utilisateur a un rôle d\'organisation');
    }

    // Validation du profil
    if (this.profile) {
      this.validateProfile(errors);
    }

    // Validation des préférences
    if (this.preferences) {
      this.validatePreferences(errors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Données utilisateur invalides');
    }

    return true;
  }

  /**
   * Valider le profil utilisateur
   */
  private validateProfile(errors: string[]): void {
    const profile = this.profile;

    if (profile.jobTitle && profile.jobTitle.length > 100) {
      errors.push('Le titre du poste ne peut pas dépasser 100 caractères');
    }

    if (profile.department && profile.department.length > 100) {
      errors.push('Le département ne peut pas dépasser 100 caractères');
    }

    if (profile.location && profile.location.length > 100) {
      errors.push('La localisation ne peut pas dépasser 100 caractères');
    }

    if (profile.bio && profile.bio.length > 500) {
      errors.push('La biographie ne peut pas dépasser 500 caractères');
    }

    if (profile.timezone && !this.isValidTimezone(profile.timezone)) {
      errors.push('Fuseau horaire invalide');
    }

    if (profile.employeeId && profile.employeeId.length > 50) {
      errors.push('L\'ID employé ne peut pas dépasser 50 caractères');
    }
  }

  /**
   * Valider les préférences utilisateur
   */
  private validatePreferences(errors: string[]): void {
    const preferences = this.preferences;

    if (preferences.language && !this.isValidLanguageCode(preferences.language)) {
      errors.push('Code de langue invalide');
    }

    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      errors.push('Thème invalide');
    }
  }

  /**
   * Mettre à jour l'utilisateur
   */
  update(updates: UpdateUserRequest): void {
    if (updates.name !== undefined) {
      this.name = updates.name.trim();
    }

    if (updates.firstName !== undefined) {
      this.firstName = updates.firstName?.trim();
    }

    if (updates.lastName !== undefined) {
      this.lastName = updates.lastName?.trim();
    }

    if (updates.displayName !== undefined) {
      this.displayName = updates.displayName?.trim();
    }

    if (updates.phone !== undefined) {
      this.phone = updates.phone?.trim();
    }

    if (updates.profile) {
      this.profile = { ...this.profile, ...updates.profile };
    }

    if (updates.preferences) {
      this.preferences = { ...this.preferences, ...updates.preferences };
    }

    // Régénérer le nom d'affichage si nécessaire
    if (!this.displayName) {
      this.displayName = this.generateDisplayName();
    }

    this.validate();
  }

  /**
   * Mettre à jour le contexte d'organisation
   */
  updateOrganizationContext(updates: UpdateUserOrganizationRequest): void {
    this.organizationId = updates.organizationId;
    this.organizationRole = updates.organizationRole;
    this.isOrganizationAdmin = this.calculateIsOrganizationAdmin();
    this.joinedOrganizationAt = new Date();

    // Mettre à jour le profil avec les informations d'organisation
    if (updates.profile) {
      this.profile = { ...this.profile, ...updates.profile };
    }

    this.validate();
  }

  /**
   * Supprimer le contexte d'organisation
   */
  removeOrganizationContext(): void {
    this.organizationId = undefined;
    this.organizationRole = undefined;
    this.isOrganizationAdmin = false;
    this.joinedOrganizationAt = undefined;

    // Nettoyer les informations liées à l'organisation du profil
    this.profile.jobTitle = undefined;
    this.profile.department = undefined;
    this.profile.manager = undefined;
    this.profile.employeeId = undefined;
    this.profile.startDate = undefined;

  }

  /**
   * Vérifier si l'utilisateur a besoin d'une organisation
   */
  needsOrganization(): boolean {
    return !this.organizationId;
  }

  /**
   * Vérifier si l'utilisateur peut créer une organisation
   */
  canCreateOrganization(): boolean {
    return this.needsOrganization() && this.isEmailVerified;
  }

  /**
   * Mettre à jour la dernière connexion
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * Activer/désactiver l'utilisateur
   */
  setActive(isActive: boolean): void {
    this.isActive = isActive;
  }

  /**
   * Vérifier l'email
   */
  verifyEmail(): void {
    this.isEmailVerified = true;
  }

  /**
   * Vérifier le téléphone
   */
  verifyPhone(): void {
    this.isPhoneVerified = true;
  }

  /**
   * Activer l'authentification à deux facteurs
   */
  enableTwoFactor(): void {
    this.twoFactorEnabled = true;
  }

  /**
   * Désactiver l'authentification à deux facteurs
   */
  disableTwoFactor(): void {
    this.twoFactorEnabled = false;
  }

  /**
   * Calculer si l'utilisateur est admin d'organisation
   */
  private calculateIsOrganizationAdmin(): boolean {
    return this.organizationRole === OrganizationRole.OWNER ||
      this.organizationRole === OrganizationRole.ADMIN;
  }

  /**
   * Générer le nom d'affichage
   */
  private generateDisplayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }

    if (this.firstName) {
      return this.firstName;
    }

    return this.name;
  }

  /**
   * Obtenir le profil par défaut
   */
  private getDefaultProfile(): UserProfile {
    return {
      timezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    };
  }

  /**
   * Obtenir les préférences par défaut
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'fr',
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        sms: false,
        digest: 'daily'
      },
      privacy: {
        showProfile: true,
        showActivity: false,
        allowDirectMessages: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false
      }
    };
  }

  /**
   * Convertir en objet simple pour la base de données
   */
  toFirestore(): any {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      avatar: this.avatar,
      phone: this.phone,
      organizationId: this.organizationId,
      organizationRole: this.organizationRole,
      isOrganizationAdmin: this.isOrganizationAdmin,
      joinedOrganizationAt: this.joinedOrganizationAt,
      profile: this.profile,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      isPhoneVerified: this.isPhoneVerified,
      twoFactorEnabled: this.twoFactorEnabled,
      lastPasswordChange: this.lastPasswordChange,
      metadata: this.metadata
    };
  }

  /**
   * Créer une instance depuis les données Firestore
   */
  static fromFirestore(doc: any): UserOrganizationModel {
    const data = doc.data();
    return new UserOrganizationModel({
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate(),
      joinedOrganizationAt: data.joinedOrganizationAt?.toDate(),
      lastPasswordChange: data.lastPasswordChange?.toDate()
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
}