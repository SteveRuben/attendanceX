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
