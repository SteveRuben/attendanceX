/**
 * Service pour la gestion des permissions
 */

import { apiClient } from './apiClient';
import {
  UserContext,
  PermissionCheckRequest,
  PermissionCheckResponse,
  RolePermissionsResponse,
  PlanFeaturesResponse,
  TenantRole,
  FeaturePermission
} from '../types/permission.types';

export class PermissionService {
  
  /**
   * Obtenir le contexte utilisateur avec ses permissions
   */
  async getUserContext(userId: string): Promise<UserContext> {
    const response = await apiClient.get(`/permissions/context/${userId}`);
    return response.data;
  }

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResponse> {
    const response = await apiClient.post('/permissions/check', request);
    return response.data;
  }

  /**
   * Obtenir les permissions par défaut d'un rôle
   */
  async getRolePermissions(role: TenantRole): Promise<RolePermissionsResponse> {
    const response = await apiClient.get(`/permissions/roles/${role}`);
    return response.data;
  }

  /**
   * Obtenir les fonctionnalités disponibles pour un plan
   */
  async getPlanFeatures(planType: string): Promise<PlanFeaturesResponse> {
    const response = await apiClient.get(`/permissions/plans/${planType}/features`);
    return response.data;
  }

  /**
   * Vérifier si l'utilisateur actuel a une permission
   */
  async hasPermission(permission: FeaturePermission): Promise<boolean> {
    try {
      // Dans un vrai contexte, on récupérerait l'userId depuis le contexte d'auth
      const userId = 'current-user'; // Placeholder
      const result = await this.checkPermission({ userId, permission });
      return result.hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Vérifier si l'utilisateur a un rôle minimum requis
   */
  hasMinimumRole(userRole: TenantRole, requiredRole: TenantRole): boolean {
    const roleHierarchy = {
      [TenantRole.VIEWER]: 1,
      [TenantRole.MEMBER]: 2,
      [TenantRole.MANAGER]: 3,
      [TenantRole.ADMIN]: 4,
      [TenantRole.OWNER]: 5
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  /**
   * Obtenir le label d'affichage d'un rôle
   */
  getRoleLabel(role: TenantRole): string {
    const labels = {
      [TenantRole.OWNER]: 'Propriétaire',
      [TenantRole.ADMIN]: 'Administrateur',
      [TenantRole.MANAGER]: 'Manager',
      [TenantRole.MEMBER]: 'Membre',
      [TenantRole.VIEWER]: 'Observateur'
    };

    return labels[role] || role;
  }

  /**
   * Obtenir le label d'affichage d'une permission
   */
  getPermissionLabel(permission: FeaturePermission): string {
    const labels = {
      [FeaturePermission.MANAGE_USERS]: 'Gérer les utilisateurs',
      [FeaturePermission.INVITE_USERS]: 'Inviter des utilisateurs',
      [FeaturePermission.VIEW_USERS]: 'Voir les utilisateurs',
      [FeaturePermission.MANAGE_PRESENCE]: 'Gérer la présence',
      [FeaturePermission.VIEW_PRESENCE]: 'Voir la présence',
      [FeaturePermission.CHECK_PRESENCE]: 'Pointer la présence',
      [FeaturePermission.BULK_PRESENCE_MANAGEMENT]: 'Gestion en masse de la présence',
      [FeaturePermission.GEOFENCING]: 'Géofencing',
      [FeaturePermission.VIEW_BASIC_ANALYTICS]: 'Analytics de base',
      [FeaturePermission.VIEW_ADVANCED_ANALYTICS]: 'Analytics avancées',
      [FeaturePermission.PRESENCE_ANALYTICS]: 'Analytics de présence',
      [FeaturePermission.CUSTOM_REPORTS]: 'Rapports personnalisés',
      [FeaturePermission.SCHEDULED_REPORTS]: 'Rapports programmés',
      [FeaturePermission.EXPORT_DATA]: 'Exporter les données',
      [FeaturePermission.MANAGE_SETTINGS]: 'Gérer les paramètres',
      [FeaturePermission.MANAGE_INTEGRATIONS]: 'Gérer les intégrations',
      [FeaturePermission.CUSTOM_BRANDING]: 'Personnalisation de marque',
      [FeaturePermission.API_ACCESS]: 'Accès API',
      [FeaturePermission.WEBHOOK_ACCESS]: 'Accès Webhooks',
      [FeaturePermission.THIRD_PARTY_INTEGRATIONS]: 'Intégrations tierces'
    };

    return labels[permission] || permission;
  }
}

export const permissionService = new PermissionService();
export default permissionService;