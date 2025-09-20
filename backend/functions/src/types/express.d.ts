import { TenantRole, ApplicationRole, FeaturePermission, TenantContext, UserContext } from "../common/types";

/**
 * Extension des types Express pour le contexte multi-tenant
 */
export interface DomainContext {
  domain: string;
  tenantId?: string;
  isCustomDomain: boolean;
  isSubdomain: boolean;
}

declare global {
  namespace Express {
    interface Request {
      // Standard Express properties
      get(name: string): string | undefined;
      protocol: string;
      originalUrl: string;
      
      // Custom properties
      tenantContext?: TenantContext;
      domainContext?: DomainContext;
      user?: {
        uid: string;
        email: string;
        role: TenantRole;
        applicationRole: ApplicationRole;
        employeeId?: string;
        permissions: Record<string, boolean>;
        featurePermissions: FeaturePermission[];
        clientIp?: string;
        sessionId?: string;
      };
      featureRestrictions?: Record<string, boolean>;
      usageLimits?: Record<string, {
        exceeded: boolean;
        currentUsage: number;
        limit: number;
        percentage: number;
      }>;
      userContext?: UserContext;
      permissionRestrictions?: {
        tenantPermissionDenied: boolean;
        featurePermissionDenied: boolean;
        userContext: UserContext;
      };
    }
  }
}