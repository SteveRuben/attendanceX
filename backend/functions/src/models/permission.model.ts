import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  UserPermission, 
  RolePermission,
  FeaturePermission,
  TenantRole,
  PermissionScope,
  CreateUserPermissionRequest
} from "../common/types";
import { ValidationError } from "../utils/common/errors";

export class UserPermissionModel extends BaseModel<UserPermission> {
  constructor(data: Partial<UserPermission>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const permission = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(permission, [
      "userId", "tenantId", "permissions", "grantedBy", "scope"
    ]);

    // Validation de l'userId
    if (!permission.userId || permission.userId.length < 1) {
      throw new ValidationError("User ID is required");
    }

    // Validation des permissions
    if (!Array.isArray(permission.permissions) || permission.permissions.length === 0) {
      throw new ValidationError("At least one permission is required");
    }

    // Validation que toutes les permissions sont valides
    const validPermissions = Object.values(FeaturePermission);
    for (const perm of permission.permissions) {
      if (!validPermissions.includes(perm)) {
        throw new ValidationError(`Invalid permission: ${perm}`);
      }
    }

    // Validation du scope
    if (!Object.values(PermissionScope).includes(permission.scope)) {
      throw new ValidationError("Invalid permission scope");
    }

    // Validation des ressources si scope est RESOURCE
    if (permission.scope === PermissionScope.RESOURCE) {
      if (!permission.resourceId || !permission.resourceType) {
        throw new ValidationError("Resource ID and type are required for resource-scoped permissions");
      }
    }

    // Validation de la date d'expiration
    if (permission.expiresAt && permission.expiresAt <= new Date()) {
      throw new ValidationError("Expiration date must be in the future");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = UserPermissionModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<UserPermission> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les métadonnées sensibles si nécessaire
    if (cleaned.metadata?.internal) {
      delete cleaned.metadata.internal;
    }
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): UserPermissionModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = UserPermissionModel.prototype.convertDatesFromFirestore(data);

    return new UserPermissionModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateUserPermissionRequest & { 
      tenantId: string; 
      grantedBy: string;
    }
  ): UserPermissionModel {
    const permissionData: Partial<UserPermission> = {
      userId: request.userId,
      tenantId: request.tenantId,
      permissions: request.permissions,
      grantedBy: request.grantedBy,
      grantedAt: new Date(),
      expiresAt: request.expiresAt,
      scope: request.scope || PermissionScope.TENANT,
      resourceId: request.resourceId,
      resourceType: request.resourceType,
      isActive: true,
      metadata: {
        reason: request.reason,
        createdVia: 'api'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new UserPermissionModel(permissionData);
  }

  // Méthodes d'instance
  public isExpired(): boolean {
    return this.data.expiresAt ? this.data.expiresAt < new Date() : false;
  }

  public isActive(): boolean {
    return this.data.isActive && !this.isExpired();
  }

  public hasPermission(permission: FeaturePermission): boolean {
    return this.isActive() && this.data.permissions.includes(permission);
  }

  public revoke(revokedBy: string, reason?: string): void {
    this.update({
      isActive: false,
      metadata: {
        ...this.data.metadata,
        revokedBy,
        revokedAt: new Date(),
        revokeReason: reason
      },
      updatedAt: new Date()
    });
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
}

export class RolePermissionModel extends BaseModel<RolePermission> {
  constructor(data: Partial<RolePermission>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const rolePermission = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(rolePermission, [
      "role", "permissions", "description", "createdBy"
    ]);

    // Validation du rôle
    if (!Object.values(TenantRole).includes(rolePermission.role)) {
      throw new ValidationError("Invalid tenant role");
    }

    // Validation des permissions
    if (!Array.isArray(rolePermission.permissions)) {
      throw new ValidationError("Permissions must be an array");
    }

    const validPermissions = Object.values(FeaturePermission);
    for (const perm of rolePermission.permissions) {
      if (!validPermissions.includes(perm)) {
        throw new ValidationError(`Invalid permission: ${perm}`);
      }
    }

    // Validation de la description
    this.validateLength(rolePermission.description, 5, 500, "description");

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = RolePermissionModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  public toAPI(): Partial<RolePermission> {
    return { ...this.data };
  }

  static fromFirestore(doc: DocumentSnapshot): RolePermissionModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = RolePermissionModel.prototype.convertDatesFromFirestore(data);

    return new RolePermissionModel({
      id: doc.id,
      ...convertedData,
    });
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
}