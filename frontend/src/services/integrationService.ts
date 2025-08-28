import { apiService } from './apiService';
import { 
  type UserIntegration, 
  type IntegrationProvider,
  type IntegrationStatus 
} from '@attendance-x/shared';

export interface SyncHistory {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  integrationId: string;
  userId: string;
  syncType: string;
  status: 'success' | 'error' | 'pending';
  startedAt: Date;
  completedAt?: Date;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errors: string[];
  duration?: number;
  dataSize?: number;
}

export interface OAuthInitResponse {
  authUrl: string;
  state: string;
}

export interface IntegrationStats {
  totalIntegrations: number;
  connectedIntegrations: number;
  lastSyncAt?: Date;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
}

export interface IntegrationPolicy {
  provider: IntegrationProvider;
  enabled: boolean;
  requiredPermissions: string[];
  allowedRoles: string[];
  restrictions?: string;
  securityLevel?: 'low' | 'standard' | 'high' | 'critical';
}

export interface IntegrationUsageStats {
  provider: IntegrationProvider;
  totalUsers: number;
  activeConnections: number;
  lastUsed: Date | null;
  dataVolume: number;
}

class IntegrationService {
  private baseUrl = '/api/user/integrations';

  /**
   * Obtenir toutes les intégrations de l'utilisateur
   */
  async getUserIntegrations(filters?: {
    provider?: IntegrationProvider;
    status?: IntegrationStatus;
  }): Promise<UserIntegration[]> {
    const params = new URLSearchParams();
    if (filters?.provider) params.append('provider', filters.provider);
    if (filters?.status) params.append('status', filters.status);

    const response = await apiService.get(`${this.baseUrl}?${params.toString()}`);
    return response.data.map(this.transformIntegration);
  }

  /**
   * Obtenir une intégration spécifique
   */
  async getIntegration(integrationId: string): Promise<UserIntegration> {
    const response = await apiService.get(`${this.baseUrl}/${integrationId}`);
    return this.transformIntegration(response.data);
  }

  /**
   * Initier une connexion OAuth
   */
  async initiateOAuth(
    provider: IntegrationProvider, 
    options?: {
      scopes?: string[];
      redirectUri?: string;
    }
  ): Promise<OAuthInitResponse> {
    const response = await apiService.post(`${this.baseUrl}/${provider}/connect`, {
      scopes: options?.scopes || [],
      redirectUri: options?.redirectUri || `${window.location.origin}/oauth/callback`
    });
    return response.data;
  }

  /**
   * Finaliser la connexion OAuth
   */
  async completeOAuth(
    provider: IntegrationProvider,
    authData: {
      code: string;
      state: string;
    }
  ): Promise<UserIntegration> {
    const response = await apiService.post(`${this.baseUrl}/${provider}/callback`, authData);
    return this.transformIntegration(response.data);
  }

  /**
   * Déconnecter une intégration
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${integrationId}`);
  }

  /**
   * Mettre à jour les paramètres de synchronisation
   */
  async updateSyncSettings(
    integrationId: string,
    settings: any
  ): Promise<UserIntegration> {
    const response = await apiService.put(`${this.baseUrl}/${integrationId}/settings`, {
      syncSettings: settings
    });
    return this.transformIntegration(response.data);
  }

  /**
   * Déclencher une synchronisation manuelle
   */
  async triggerSync(
    integrationId: string,
    options?: {
      syncType?: 'full' | 'incremental';
    }
  ): Promise<{ syncId: string; status: string }> {
    const response = await apiService.post(`${this.baseUrl}/${integrationId}/sync`, {
      syncType: options?.syncType || 'incremental'
    });
    return response.data;
  }

  /**
   * Tester la connexion d'une intégration
   */
  async testConnection(integrationId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await apiService.post(`${this.baseUrl}/${integrationId}/test`);
    return response.data;
  }

  /**
   * Obtenir l'historique de synchronisation
   */
  async getSyncHistory(
    integrationId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'success' | 'error' | 'pending';
    }
  ): Promise<{
    history: SyncHistory[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);

    const response = await apiService.get(`${this.baseUrl}/${integrationId}/history?${params.toString()}`);
    
    return {
      history: response.data.history.map(this.transformSyncHistory),
      total: response.data.total,
      hasMore: response.data.hasMore
    };
  }

  /**
   * Obtenir les statistiques des intégrations
   */
  async getIntegrationStats(): Promise<IntegrationStats> {
    const response = await apiService.get(`${this.baseUrl}/stats`);
    return {
      ...response.data,
      lastSyncAt: response.data.lastSyncAt ? new Date(response.data.lastSyncAt) : undefined
    };
  }

  /**
   * Obtenir les données synchronisées
   */
  async getSyncedData(
    integrationId: string,
    dataType: 'calendar' | 'contacts' | 'email' | 'files',
    options?: {
      limit?: number;
      offset?: number;
      search?: string;
    }
  ): Promise<{
    data: any[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.search) params.append('search', options.search);

    const response = await apiService.get(`${this.baseUrl}/${integrationId}/data/${dataType}?${params.toString()}`);
    return response.data;
  }

  /**
   * Révoquer les permissions d'une intégration
   */
  async revokePermissions(integrationId: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${integrationId}/revoke`);
  }

  /**
   * Rafraîchir les tokens d'une intégration
   */
  async refreshTokens(integrationId: string): Promise<UserIntegration> {
    const response = await apiService.post(`${this.baseUrl}/${integrationId}/refresh`);
    return this.transformIntegration(response.data);
  }

  // ===== MÉTHODES D'ADMINISTRATION =====

  /**
   * Obtenir toutes les intégrations utilisateur (admin seulement)
   */
  async getAllUserIntegrations(): Promise<UserIntegration[]> {
    const response = await apiService.get('/api/admin/integrations/users');
    return response.data.map(this.transformIntegration);
  }

  /**
   * Obtenir les politiques d'organisation
   */
  async getOrganizationPolicies(): Promise<any[]> {
    const response = await apiService.get('/api/admin/integrations/policies');
    return response.data;
  }

  /**
   * Mettre à jour une politique d'intégration
   */
  async updateIntegrationPolicy(provider: IntegrationProvider, updates: any): Promise<void> {
    await apiService.put(`/api/admin/integrations/policies/${provider}`, updates);
  }

  /**
   * Obtenir les statistiques d'utilisation des intégrations
   */
  async getIntegrationUsageStats(): Promise<any[]> {
    const response = await apiService.get('/api/admin/integrations/usage-stats');
    return response.data;
  }

  /**
   * Révoquer une intégration spécifique (admin)
   */
  async revokeIntegration(integrationId: string): Promise<void> {
    await apiService.delete(`/api/admin/integrations/${integrationId}/revoke`);
  }

  /**
   * Révoquer toutes les intégrations d'un provider (admin)
   */
  async bulkRevokeProvider(provider: IntegrationProvider): Promise<void> {
    await apiService.post(`/api/admin/integrations/bulk-revoke`, { provider });
  }

  /**
   * Générer un rapport d'utilisation
   */
  async generateUsageReport(): Promise<any> {
    const response = await apiService.get('/api/admin/integrations/usage-report');
    return response.data;
  }

  /**
   * Obtenir les métriques d'analytics (admin seulement)
   */
  async getAnalyticsMetrics(): Promise<any> {
    const response = await apiService.get(`${this.baseUrl}/analytics/metrics`);
    return response.data;
  }

  /**
   * Transformer les données d'intégration du serveur
   */
  private transformIntegration(data: any): UserIntegration {
    return {
      id: data.id,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      userId: data.userId,
      organizationId: data.organizationId,
      provider: data.provider,
      status: data.status,
      connectedAt: data.connectedAt ? new Date(data.connectedAt) : new Date(),
      lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : undefined,
      lastErrorAt: data.lastErrorAt ? new Date(data.lastErrorAt) : undefined,
      permissions: data.permissions || [],
      syncSettings: data.syncSettings || {
        calendar: false,
        contacts: false,
        email: false,
        files: false,
        tasks: false,
        presence: false,
        autoSync: true,
        syncFrequency: 60
      },
      metadata: {
        userEmail: data.email || data.userEmail || data.metadata?.userEmail || '',
        userName: data.displayName || data.userName || data.metadata?.userName || '',
        profilePicture: data.avatar || data.profilePicture || data.metadata?.profilePicture,
        organizationName: data.metadata?.organizationName,
        timeZone: data.metadata?.timeZone,
        locale: data.metadata?.locale
      },
      errorMessage: data.lastError || data.errorMessage,
      retryCount: data.retryCount || 0,
      nextRetryAt: data.nextRetryAt ? new Date(data.nextRetryAt) : undefined
    };
  }

  /**
   * Transformer les données d'historique de synchronisation
   */
  private transformSyncHistory(data: any): SyncHistory {
    return {
      id: data.id,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      integrationId: data.integrationId,
      userId: data.userId,
      syncType: data.syncType,
      status: data.status,
      startedAt: new Date(data.startedAt),
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      itemsProcessed: data.itemsProcessed || 0,
      itemsCreated: data.itemsCreated || 0,
      itemsUpdated: data.itemsUpdated || 0,
      itemsDeleted: data.itemsDeleted || 0,
      errors: data.errors || [],
      duration: data.duration,
      dataSize: data.dataSize
    };
  }

  /**
   * Gérer les erreurs d'API
   */
  private handleApiError(error: any): never {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Une erreur est survenue lors de la communication avec le serveur');
  }
}

export const integrationService = new IntegrationService();