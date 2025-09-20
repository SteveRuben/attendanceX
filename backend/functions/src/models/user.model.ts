import { DocumentSnapshot, FieldValue } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";

import { logger } from "firebase-functions";
import { CreateUserRequest, OrganizationRole, UpdateUserRequest, User, UserRole, UserStatus } from "../common/types";

// Interface pour les données utilisateur côté backend (avec propriétés sensibles)
export interface UserDocument extends User {
  hashedPassword?: string;
  password?: string; // Propriété temporaire pour la création
  passwordChangedAt?: Date;
  emailVerified?: boolean;
  emailVerificationAttempts?: number;
  emailVerificationSentAt?: Date;
  emailVerifiedAt?: Date;
  lastVerificationRequestAt?: Date;
  verificationHistory?: Array<{
    sentAt: Date;
    verifiedAt?: Date;
    ipAddress: string;
  }>;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: Date;
  accountLockedUntil?: Date;
  loginCount?: number;
  organizationPermissions?: string[];
  // Propriétés de sécurité supplémentaires
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  mustChangePassword?: boolean;
}


export class UserModel extends BaseModel<UserDocument> {
  constructor(data: Partial<UserDocument>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const user = this.data;

    // S'assurer que le champ name existe, le générer si nécessaire
    if (!user.name && (user.firstName || user.lastName)) {
      user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    // Validation des champs requis
    BaseModel.validateRequired(user, [
      "email", "name",
    ]);

    // Validation de l'email
    if (!BaseModel.validateEmail(user.email)) {
      throw new Error("Invalid email format");
    }

    // Validation du téléphone (si fourni)
    if (user.phone && !BaseModel.validatePhoneNumber(user.phone)) {
      throw new Error("Invalid phone number format");
    }

    // Validation du rôle (requis) - ajouter une valeur par défaut si manquante
    /* if (!user.role) {
      user.role = UserRole.USER; // Valeur par défaut
    }
    if (!Object.values(UserRole).includes(user.role)) {
      throw new Error("Invalid role");
    } */

    // Validation du statut (requis)
    if (!user.status || !Object.values(UserStatus).includes(user.status)) {
      throw new Error("Invalid or missing status");
    }

    // Validation des longueurs
    this.validateLength(user.name, 2, 100, "name");
    if (user.firstName) {
      this.validateLength(user.firstName, 1, 50, "firstName");
    }
    if (user.lastName) {
      this.validateLength(user.lastName, 1, 50, "lastName");
    }
    if (user.displayName) {
      this.validateLength(user.displayName, 2, 100, "displayName");
    }

    // Validation de l'URL d'avatar (si fournie)
    if (user.avatar && !BaseModel.validateUrl(user.avatar)) {
      throw new Error("Invalid avatar URL");
    }

    // Validation des champs de vérification d'email
    const verificationValidation = this.validateVerificationFields();
    if (!verificationValidation.isValid) {
      throw new Error(`Verification fields validation failed: ${verificationValidation.errors.join(', ')}`);
    }

    return true;
  }

  toFirestore() {
    const { id, password, ...data } = this.data; // Exclure password ET id
    const cleanedData = UserModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API (exclut les champs sensibles)
  public toAPI(): Partial<UserDocument> {
    const data = this.data as any;

    // Fonction récursive pour nettoyer les objets imbriqués
    const cleanSensitiveData = (obj: any): any => {
      if (!obj || typeof obj !== 'object') { return obj; }

      const cleaned = { ...obj };

      // Supprimer les champs sensibles
      delete cleaned.password;
      delete cleaned.hashedPassword;
      delete cleaned.twoFactorSecret;
      delete cleaned.twoFactorBackupCodes;
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

  static fromFirestore(doc: DocumentSnapshot): UserModel | null {
    if (!doc.exists) { return null; }

    const data = doc.data()!;
    const convertedData = UserModel.prototype.convertDatesFromFirestore(data);

    // S'assurer que le champ name existe
    if (!convertedData.name && (convertedData.firstName || convertedData.lastName)) {
      convertedData.name = `${convertedData.firstName || ''} ${convertedData.lastName || ''}`.trim();
    }

    return new UserModel({
      id: doc.id,
      ...convertedData,
      // S'assurer que verificationHistory est toujours un tableau
      verificationHistory: convertedData.verificationHistory || [],
    });
  }

  // Méthodes spécifiques aux utilisateurs
  static fromCreateRequest(request: CreateUserRequest & { id?: string; hashedPassword?: string }): UserModel {
    const defaultPreferences = this.getDefaultPreferences();
    const organizationFields = this.initializeOrganizationFields();

    // Nettoyer les champs undefined pour éviter les erreurs Firestore
    const cleanRequest = this.removeUndefinedFields(request);

    // Créer l'objet utilisateur avec des valeurs par défaut pour éviter undefined
    const userData = {
      ...cleanRequest,
      ...organizationFields,
      role: cleanRequest.role || UserRole.PARTICIPANT,
      status: UserStatus.PENDING_VERIFICATION,
      permissions: cleanRequest.permissions || {},

      // Multi-tenant properties with defaults
      tenantId: cleanRequest.tenantId || '',
      tenantMemberships: cleanRequest.tenantMemberships || [],
      activeTenantId: cleanRequest.activeTenantId || cleanRequest.tenantId || '',

      profile: {
        ...this.removeUndefinedFields(cleanRequest.profile || {}),
        // Assurer que les champs obligatoires ne sont pas undefined
        department: cleanRequest.profile?.department || null,
        jobTitle: cleanRequest.profile?.jobTitle || null,
        location: cleanRequest.profile?.location || null,
      },
      preferences: {
        ...defaultPreferences,
        ...this.removeUndefinedFields(cleanRequest.preferences || {}),
      },
      isEmailVerified: false,
      isPhoneVerified: false,
      twoFactorEnabled: false,
      isActive: false,
      loginCount: 0,
      failedLoginAttempts: 0,
      emailVerificationAttempts: 0,
      verificationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    // Nettoyer une dernière fois et créer le modèle
    const finalUserData = this.removeUndefinedFields(userData);
    return new UserModel(finalUserData);
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



  private static getDefaultPreferences() {
    return {
      language: "fr",
      theme: "light" as const,
      notifications: {
        email: true,
        push: true,
        sms: true,
        digest: "daily" as const,
      },
      privacy: {
        showProfile: true,
        showActivity: true,
        allowDirectMessages: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false,
      },
    };
  }

  // 🆕 Validation des mots de passe
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push("Le mot de passe doit contenir au moins 12 caractères");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins une minuscule");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins une majuscule");
    }

    if (!/\d/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins un chiffre");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins un caractère spécial");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 🆕 Vérification de l'expiration du mot de passe
  isPasswordExpired(): boolean {
    if (!this.data.passwordChangedAt) { return false; }

    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 jours
    return Date.now() - this.data.passwordChangedAt.getTime() > maxAge;
  }

  // 🆕 Validation des champs de vérification d'email
  validateVerificationFields(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const user = this.data;

    // Validation de emailVerificationAttempts
    if (user.emailVerificationAttempts !== undefined) {
      if (!Number.isInteger(user.emailVerificationAttempts) || user.emailVerificationAttempts < 0) {
        errors.push("emailVerificationAttempts must be a non-negative integer");
      }
      if (user.emailVerificationAttempts > 100) {
        errors.push("emailVerificationAttempts cannot exceed 100");
      }
    }

    // Validation de emailVerificationSentAt
    if (user.emailVerificationSentAt && !(user.emailVerificationSentAt instanceof Date)) {
      errors.push("emailVerificationSentAt must be a valid Date");
    }

    // Validation de lastVerificationRequestAt
    if (user.lastVerificationRequestAt && !(user.lastVerificationRequestAt instanceof Date)) {
      errors.push("lastVerificationRequestAt must be a valid Date");
    }

    // Validation de verificationHistory
    if (user.verificationHistory !== undefined) {
      logger.info("user.verificationHistory", {
        user: user.verificationHistory
      });
      if (!Array.isArray(user.verificationHistory)) {
        errors.push("verificationHistory must be an array");
      } else {
        user.verificationHistory.forEach((entry, index) => {
          if (!entry.sentAt || !(entry.sentAt instanceof Date)) {
            errors.push(`verificationHistory[${index}].sentAt must be a valid Date`);
          }
          if (entry.verifiedAt && !(entry.verifiedAt instanceof Date)) {
            errors.push(`verificationHistory[${index}].verifiedAt must be a valid Date`);
          }
          if (!entry.ipAddress || typeof entry.ipAddress !== 'string') {
            errors.push(`verificationHistory[${index}].ipAddress must be a non-empty string`);
          } else if (!this.validateIpAddress(entry.ipAddress)) {
            errors.push(`verificationHistory[${index}].ipAddress must be a valid IP address`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // 🆕 Validation d'adresse IP
  private validateIpAddress(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  // 🆕 Vérifier si l'utilisateur peut demander une nouvelle vérification
  canRequestEmailVerification(): boolean {
    const user = this.data;

    // Si l'email est déjà vérifié, pas besoin de nouvelle vérification
    if (user.isEmailVerified) {
      return false;
    }

    // Vérifier le rate limiting (3 tentatives par heure)
    if (user.lastVerificationRequestAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (user.lastVerificationRequestAt > oneHourAgo && user.emailVerificationAttempts >= 3) {
        return false;
      }
    }

    return true;
  }

  // 🆕 Ajouter une entrée à l'historique de vérification
  addVerificationHistoryEntry(ipAddress: string, verifiedAt?: Date): void {
    const user = this.data;
    const entry = {
      sentAt: new Date(),
      ipAddress,
      ...(verifiedAt && { verifiedAt }),
    };

    const currentHistory = user.verificationHistory || [];
    const updatedHistory = [...currentHistory, entry];

    // Garder seulement les 10 dernières entrées pour éviter une croissance excessive
    const limitedHistory = updatedHistory.slice(-10);

    this.update({
      verificationHistory: limitedHistory,
      emailVerificationSentAt: new Date(),
      emailVerificationAttempts: (user.emailVerificationAttempts || 0) + 1,
      lastVerificationRequestAt: new Date(),
    });
  }

  // 🆕 Marquer l'email comme vérifié
  markEmailAsVerified(ipAddress: string): void {
    const user = this.data;
    const verifiedAt = new Date();

    // Mettre à jour l'historique de vérification
    if (user.verificationHistory && user.verificationHistory.length > 0) {
      const lastEntry = user.verificationHistory[user.verificationHistory.length - 1];
      if (!lastEntry.verifiedAt) {
        lastEntry.verifiedAt = verifiedAt;
      }
    }

    this.update({
      isEmailVerified: true,
      emailVerifiedAt: verifiedAt,
      status: UserStatus.ACTIVE,
      verificationHistory: user.verificationHistory,
    });
  }

  // Override de la validation pour s'assurer que verificationHistory est toujours un tableau
  protected validateUpdateData(data: UserDocument): void {
    // S'assurer que verificationHistory est toujours un tableau
    if (data.verificationHistory === undefined ||
      data.verificationHistory === null ||
      !Array.isArray(data.verificationHistory)) {
      data.verificationHistory = [];
    }

    // Validation spécifique des champs de vérification avec les nouvelles données
    const errors: string[] = [];

    // Validation de verificationHistory
    if (data.verificationHistory !== undefined) {

      if (!Array.isArray(data.verificationHistory)) {
        errors.push("verificationHistory must be an array");
      } else {
        data.verificationHistory.forEach((entry, index) => {
          if (!entry.sentAt || !(entry.sentAt instanceof Date)) {
            errors.push(`verificationHistory[${index}].sentAt must be a valid Date`);
          }
          if (entry.verifiedAt && !(entry.verifiedAt instanceof Date)) {
            errors.push(`verificationHistory[${index}].verifiedAt must be a valid Date`);
          }
          if (!entry.ipAddress || typeof entry.ipAddress !== 'string') {
            errors.push(`verificationHistory[${index}].ipAddress must be a non-empty string`);
          } else if (!this.validateIpAddress(entry.ipAddress)) {
            errors.push(`verificationHistory[${index}].ipAddress must be a valid IP address`);
          }
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Verification fields validation failed: ${errors.join(', ')}`);
    }
  }

  // Méthodes d'instance
  isActive(): boolean {
    return this.data.isActive === true;
  }

  canPerformAction(action: keyof typeof this.data.permissions): boolean {
    return this.isActive() && this.data.permissions && this.data.permissions[action];
  }

  /**
   * Vérifier si l'utilisateur peut effectuer une action organisationnelle
   */
  canPerformOrganizationAction(action: string): boolean {
    if (!this.isActive()) {
      return false;
    }

    // Le owner peut tout faire - aucune restriction
    if (this.data.organizationRole === OrganizationRole.OWNER) {
      return true;
    }

    return this.hasOrganizationPermission(action);
  }

  isAccountLocked(): boolean {
    return this.data.accountLockedUntil ? this.data.accountLockedUntil > new Date() : false;
  }

  incrementFailedLoginAttempts(): { isLocked: boolean; lockDuration?: number } {
    const attempts = (this.data.failedLoginAttempts || 0) + 1;
    const now = new Date();

    // Durée de verrouillage progressive
    let lockDuration = 0;
    if (attempts >= 5) {
      lockDuration = Math.min(attempts * 5, 60); // Max 60 minutes
    }

    const updates: Partial<UserDocument> = {
      failedLoginAttempts: attempts,
      lastFailedLoginAt: now,
    };

    if (lockDuration > 0) {
      updates.accountLockedUntil = new Date(now.getTime() + lockDuration * 60 * 1000);
    }

    this.update(updates);

    return {
      isLocked: lockDuration > 0,
      lockDuration,
    };
  }

  resetFailedLoginAttempts(): void {
    const updates: any = {
      failedLoginAttempts: 0,
      lastLoginAt: new Date(),
      loginCount: (this.data.loginCount || 0) + 1,
    };

    // Supprimer le champ accountLockedUntil si présent
    if (this.data.accountLockedUntil) {
      updates.accountLockedUntil = FieldValue.delete();
    }

    this.update(updates);
  }

  updateProfile(updates: UpdateUserRequest): void {
    // Filtrer les champs non autorisés
    const allowedFields: (keyof UpdateUserRequest)[] = [
      "name", "firstName", "lastName", "displayName", "phone", "profile", "preferences",
    ];

    const safeUpdates = BaseModel.sanitize(updates, allowedFields);

    this.update(safeUpdates);
  }


  changeRole(newRole: UserRole, changedBy: string): void {
    this.update({
      role: newRole,
    }, {
      action: "role_changed",
      performedBy: changedBy,
      oldValue: { role: this.data.role },
      newValue: { role: newRole },
    });
  }

  // Méthodes pour la gestion du contexte organisationnel

  /**
   * Assigner l'utilisateur à une organisation
   */
  assignToOrganization(
    organizationId: string,
    organizationRole: OrganizationRole,
    permissions: string[],
    assignedBy: string
  ): void {
    this.update({
      organizationId,
      organizationRole,
      organizationPermissions: permissions,
      isOrganizationAdmin: this.isAdminRole(organizationRole),
      joinedOrganizationAt: new Date()
    }, {
      action: "organization_assigned",
      performedBy: assignedBy,
      newValue: { organizationId, organizationRole }
    });
  }

  /**
   * Retirer l'utilisateur de son organisation
   */
  removeFromOrganization(removedBy: string): void {
    const oldOrganizationId = this.data.organizationId;

    this.update({
      organizationPermissions: [],
      isOrganizationAdmin: false,
      joinedOrganizationAt: undefined
    }, {
      action: "organization_removed",
      performedBy: removedBy,
      oldValue: { organizationId: oldOrganizationId }
    });
  }

  /**
   * Mettre à jour le rôle organisationnel
   */
  updateOrganizationRole(
    newRole: OrganizationRole,
    newPermissions: string[],
    updatedBy: string
  ): void {
    const oldRole = this.data.organizationRole;

    this.update({
      organizationRole: newRole,
      organizationPermissions: newPermissions,
      isOrganizationAdmin: this.isAdminRole(newRole)
    }, {
      action: "organization_role_updated",
      performedBy: updatedBy,
      oldValue: { organizationRole: oldRole },
      newValue: { organizationRole: newRole }
    });
  }

  /**
   * Vérifier si l'utilisateur appartient à une organisation
   */
  hasOrganization(): boolean {
    return !!this.data.organizationId;
  }

  /**
   * Vérifier si l'utilisateur a une permission organisationnelle spécifique
   */
  hasOrganizationPermission(permission: string): boolean {
    // Le owner a automatiquement toutes les permissions - accès illimité
    if (this.data.organizationRole === OrganizationRole.OWNER) {
      return true;
    }
    return this.data.organizationPermissions?.includes(permission) || false;
  }

  /**
   * Obtenir toutes les permissions effectives de l'utilisateur
   */
  getEffectivePermissions(): string[] {
    // Importer la configuration des permissions
    const { getPermissionsForRole } = require('../config/permissions.config');

    // Le owner a toutes les permissions disponibles - accès complet
    if (this.data.organizationRole === OrganizationRole.OWNER) {
      return getPermissionsForRole(OrganizationRole.OWNER);
    }

    // Pour les autres rôles, utiliser la configuration des permissions
    if (this.data.organizationRole) {
      return getPermissionsForRole(this.data.organizationRole);
    }

    // Fallback vers les permissions assignées manuellement
    return this.data.organizationPermissions || [];
  }

  /**
   * Vérifier si l'utilisateur est owner de son organisation
   */
  isOrganizationOwner(): boolean {
    return this.data.organizationRole === OrganizationRole.OWNER;
  }

  /**
   * Vérifier si l'utilisateur a des droits illimités (owner)
   */
  hasUnlimitedAccess(): boolean {
    return this.isOrganizationOwner();
  }

  /**
   * Vérifier si l'utilisateur est administrateur de son organisation
   */
  isOrganizationAdmin(): boolean {
    // Le owner est automatiquement administrateur
    if (this.data.organizationRole === OrganizationRole.OWNER) {
      return true;
    }
    return this.data.isOrganizationAdmin || false;
  }

  /**
   * Obtenir l'ID de l'organisation de l'utilisateur
   */
  getOrganizationId(): string | undefined {
    return this.data.organizationId;
  }

  /**
   * Obtenir l'email de l'utilisateur
   */
  get email(): string {
    return this.data.email;
  }

  /**
   * Obtenir le rôle de l'utilisateur
   */
  get role(): UserRole {
    return this.data.role;
  }

  /**
   * Obtenir l'ID de l'organisation (propriété directe)
   */
  get organizationId(): string | undefined {
    return this.data.organizationId;
  }

  /**
   * Convertir UserModel en User (pour les réponses API)
   */
  toUser(): User {
    const userData = this.data;
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: userData.displayName,
      avatar: userData.avatar,
      phone: userData.phone,
      role: userData.role,
      status: userData.status,
      permissions: userData.permissions || {},

      // Multi-tenant properties
      tenantId: userData.tenantId || '',
      tenantMemberships: userData.tenantMemberships || [],
      activeTenantId: userData.activeTenantId || userData.tenantId || '',

      // Legacy organization context (deprecated)
      organizationId: userData.organizationId,
      organizationRole: userData.organizationRole,
      isOrganizationAdmin: userData.isOrganizationAdmin || false,
      joinedOrganizationAt: userData.joinedOrganizationAt,
      pendingOrganizationName: userData.pendingOrganizationName,

      profile: userData.profile || {},
      preferences: userData.preferences || {},
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
      isActive: userData.isActive || false,
      isEmailVerified: userData.isEmailVerified || false,
      isPhoneVerified: userData.isPhoneVerified || false,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      lastPasswordChange: userData.passwordChangedAt,
      metadata: userData.metadata || {}
    };
  }

  /**
   * Vérifier si un rôle est considéré comme administrateur
   */
  private isAdminRole(role: OrganizationRole): boolean {
    const adminRoles = [OrganizationRole.OWNER, OrganizationRole.ADMIN];
    return adminRoles.includes(role);
  }

  /**
   * Initialiser les champs organisationnels par défaut
   */
  private static initializeOrganizationFields(): Partial<UserDocument> {
    return {
      isOrganizationAdmin: false,
      organizationPermissions: []
    };
  }
}
