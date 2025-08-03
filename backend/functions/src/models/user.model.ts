import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserPermissions,
  UserRole,
  UserStatus,
} from "@attendance-x/shared";


export class UserModel extends BaseModel<User> {
  constructor(data: Partial<User>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const user = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(user, [
      "email", "displayName", "firstName", "lastName", "role", "status",
    ]);

    // Validation de l'email
    if (!BaseModel.validateEmail(user.email)) {
      throw new Error("Invalid email format");
    }

    // Validation du téléphone (si fourni)
    if (user.phoneNumber && !BaseModel.validatePhoneNumber(user.phoneNumber)) {
      throw new Error("Invalid phone number format");
    }

    // Validation du rôle
    BaseModel.validateEnum(user.role, UserRole, "role");

    // Validation du statut
    BaseModel.validateEnum(user.status, UserStatus, "status");

    // Validation des longueurs
    this.validateLength(user.displayName, 2, 100, "displayName");
    this.validateLength(user.firstName, 1, 50, "firstName");
    this.validateLength(user.lastName, 1, 50, "lastName");

    // Validation de l'URL de photo (si fournie)
    if (user.photoURL && !BaseModel.validateUrl(user.photoURL)) {
      throw new Error("Invalid photo URL");
    }

    // Validation des champs de vérification d'email
    const verificationValidation = this.validateVerificationFields();
    if (!verificationValidation.isValid) {
      throw new Error(`Verification fields validation failed: ${verificationValidation.errors.join(', ')}`);
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    return this.convertDatesToFirestore(data);
  }

  static fromFirestore(doc: DocumentSnapshot): UserModel | null {
    if (!doc.exists) { return null; }

    const data = doc.data()!;
    const convertedData = UserModel.prototype.convertDatesFromFirestore(data);

    return new UserModel({
      id: doc.id,
      ...convertedData,
    });
  }

  // Méthodes spécifiques aux utilisateurs
  static fromCreateRequest(request: CreateUserRequest): UserModel {
    const defaultPermissions = this.getDefaultPermissions(request.role);
    const defaultPreferences = this.getDefaultPreferences();

    // Nettoyer les champs undefined pour éviter les erreurs Firestore
    const cleanRequest = this.removeUndefinedFields(request);

    return new UserModel({
      ...cleanRequest,
      status: UserStatus.PENDING,
      permissions: defaultPermissions,
      profile: {
        ...cleanRequest,
        preferences: defaultPreferences,
      },
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      loginCount: 0,
      failedLoginAttempts: 0,
      emailVerificationAttempts: 0,
      verificationHistory: [],
    });
  }

  // Utilitaire pour nettoyer les champs undefined récursivement
  private static removeUndefinedFields(obj: any): any {
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

  private static getDefaultPermissions(role: UserRole): UserPermissions {
    const permissions: UserPermissions = {
      canCreateEvents: false,
      canManageUsers: false,
      canViewReports: false,
      canManageSettings: false,
      canSendNotifications: false,
      canExportData: false,
      canManageRoles: false,
      canAccessAnalytics: false,
      canModerateContent: false,
      canManageIntegrations: false,
    };

    switch (role) {
      case UserRole.SUPER_ADMIN:
        return Object.keys(permissions).reduce((acc, key) => ({ ...acc, [key]: true }), {} as UserPermissions);

      case UserRole.ADMIN:
        return {
          ...permissions,
          canCreateEvents: true,
          canManageUsers: true,
          canViewReports: true,
          canSendNotifications: true,
          canExportData: true,
          canAccessAnalytics: true,
        };

      case UserRole.ORGANIZER:
        return {
          ...permissions,
          canCreateEvents: true,
          canViewReports: true,
          canSendNotifications: true,
        };

      default:
        return permissions;
    }
  }

  private static getDefaultPreferences() {
    return {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      language: "fr",
      theme: "light" as const,
      timezone: "Europe/Paris",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h" as const,
      weekStartsOn: 1,
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
    if (user.verificationHistory) {
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
    if (user.emailVerified) {
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
      emailVerified: true,
      emailVerifiedAt: verifiedAt,
      status: UserStatus.ACTIVE,
      verificationHistory: user.verificationHistory,
    });
  }

  // Méthodes d'instance
  isActive(): boolean {
    return this.data.status === UserStatus.ACTIVE;
  }

  canPerformAction(action: keyof typeof this.data.permissions): boolean {
    return this.isActive() && this.data.permissions[action];
  }

  isAccountLocked(): boolean {
    return this.data.accountLockedUntil ? this.data.accountLockedUntil > new Date() : false;
  }

  incrementFailedLoginAttempts(): { isLocked: boolean; lockDuration?: number } {
    const attempts = this.data.failedLoginAttempts + 1;
    const now = new Date();

    // Durée de verrouillage progressive
    let lockDuration = 0;
    if (attempts >= 5) {
      lockDuration = Math.min(attempts * 5, 60); // Max 60 minutes
    }

    const updates: Partial<User> = {
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
    this.update({
      failedLoginAttempts: 0,
      accountLockedUntil: undefined,
      lastLoginAt: new Date(),
      loginCount: this.data.loginCount + 1,
    });
  }

  updateProfile(updates: UpdateUserRequest): void {
    // Filtrer les champs non autorisés
    const allowedFields: (keyof UpdateUserRequest)[] = [
      "displayName", "firstName", "lastName", "phoneNumber", "bio", "photoURL",
    ];

    const safeUpdates = BaseModel.sanitize(updates, allowedFields);

    // Sanitization supplémentaire
    if (safeUpdates.bio) {
      safeUpdates.bio = BaseModel.sanitizeHtml(safeUpdates.bio);
    }

    this.update(safeUpdates);
  }


  changeRole(newRole: UserRole, changedBy: string): void {
    const newPermissions = UserModel.getDefaultPermissions(newRole);

    this.update({
      role: newRole,
      permissions: newPermissions,
    }, {
      action: "role_changed",
      performedBy: changedBy,
      oldValue: { role: this.data.role },
      newValue: { role: newRole },
    });
  }
}
