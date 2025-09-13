/**
 * Extension des types Express pour le contexte multi-tenant
 */

import { TenantContext } from '../middleware/tenant-context.middleware';
import { DomainContext } from '../middleware/domain-resolution.middleware';
import { TenantRole, ApplicationRole, FeaturePermission, UserContext } from '../shared/types/tenant.types';

declare global {
  namespace Express {
    interface Request {
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