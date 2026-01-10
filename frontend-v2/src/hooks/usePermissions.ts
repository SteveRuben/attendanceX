/**
 * Hook pour la gestion des permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { permissionService } from '../services/permissionService';
import {
  UserContext,
  FeaturePermission,
  TenantRole,
  RolePermissionsResponse,
  PlanFeaturesResponse
} from '../types/permission.types';

export interface UsePermissionsReturn {
  userContext: UserContext | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: FeaturePermission) => boolean;
  hasMinimumRole: (requiredRole: TenantRole) => boolean;
  checkPermission: (permission: FeaturePermission) => Promise<boolean>;
  refreshContext: () => Promise<void>;
}

export function usePermissions(userId?: string): UsePermissionsReturn {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserContext = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const context = await permissionService.getUserContext(userId);
      setUserContext(context);
    } catch (err: any) {
      console.error('Error fetching user context:', err);
      setError(err.message || 'Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserContext();
  }, [fetchUserContext]);

  const hasPermission = useCallback((permission: FeaturePermission): boolean => {
    if (!userContext) return false;
    return userContext.effectivePermissions.includes(permission);
  }, [userContext]);

  const hasMinimumRole = useCallback((requiredRole: TenantRole): boolean => {
    if (!userContext) return false;
    return permissionService.hasMinimumRole(userContext.tenantRole, requiredRole);
  }, [userContext]);

  const checkPermission = useCallback(async (permission: FeaturePermission): Promise<boolean> => {
    try {
      return await permissionService.hasPermission(permission);
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  }, []);

  const refreshContext = useCallback(async () => {
    await fetchUserContext();
  }, [fetchUserContext]);

  return {
    userContext,
    loading,
    error,
    hasPermission,
    hasMinimumRole,
    checkPermission,
    refreshContext
  };
}

export interface UseRolePermissionsReturn {
  permissions: FeaturePermission[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRolePermissions(role: TenantRole): UseRolePermissionsReturn {
  const [data, setData] = useState<RolePermissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRolePermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permissionService.getRolePermissions(role);
      setData(response);
    } catch (err: any) {
      console.error('Error fetching role permissions:', err);
      setError(err.message || 'Erreur lors du chargement des permissions du rôle');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchRolePermissions();
  }, [fetchRolePermissions]);

  return {
    permissions: data?.permissions || [],
    loading,
    error,
    refresh: fetchRolePermissions
  };
}

export interface UsePlanFeaturesReturn {
  features: PlanFeaturesResponse['features'] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlanFeatures(planType: string): UsePlanFeaturesReturn {
  const [data, setData] = useState<PlanFeaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permissionService.getPlanFeatures(planType);
      setData(response);
    } catch (err: any) {
      console.error('Error fetching plan features:', err);
      setError(err.message || 'Erreur lors du chargement des fonctionnalités du plan');
    } finally {
      setLoading(false);
    }
  }, [planType]);

  useEffect(() => {
    fetchPlanFeatures();
  }, [fetchPlanFeatures]);

  return {
    features: data?.features || null,
    loading,
    error,
    refresh: fetchPlanFeatures
  };
}