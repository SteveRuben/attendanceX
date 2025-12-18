import { apiClient } from './apiClient'

export interface ApiKey {
  id: string
  tenantId: string
  userId: string
  name: string
  key: string // Version masquée pour l'affichage
  scopes: string[]
  isActive: boolean
  lastUsed?: string
  usageCount: number
  rateLimit?: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  expiresAt?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  metadata?: Record<string, any>
}

export interface CreateApiKeyRequest {
  name: string
  scopes: string[]
  expiresInDays?: number
  rateLimit?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
  metadata?: Record<string, any>
}

export interface UpdateApiKeyRequest {
  name?: string
  scopes?: string[]
  isActive?: boolean
  rateLimit?: {
    requestsPerMinute?: number
    requestsPerHour?: number
    requestsPerDay?: number
  }
  metadata?: Record<string, any>
}

export interface ApiKeyUsageStats {
  totalRequests: number
  successfulRequests: number
  errorRequests: number
  averageResponseTime: number
  requestsByDay: Array<{ date: string; count: number }>
  topEndpoints: Array<{ endpoint: string; count: number }>
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey
  plainKey: string // Clé en clair retournée une seule fois
}

class ApiKeysService {
  /**
   * Créer une nouvelle clé API
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    const response = await apiClient.post<CreateApiKeyResponse>('/api-keys', request, {
      withAuth: true,
      withToast: {
        loading: 'Creating API key...',
        success: 'API key created successfully',
        error: 'Failed to create API key'
      }
    })
    return response
  }

  /**
   * Lister les clés API
   */
  async listApiKeys(myKeysOnly = false): Promise<ApiKey[]> {
    const params = myKeysOnly ? { myKeys: 'true' } : {}
    const response = await apiClient.get<ApiKey[]>('/api-keys', {
      withAuth: true,
      params
    })
    return Array.isArray(response) ? response : response?.data || []
  }

  /**
   * Obtenir une clé API spécifique
   */
  async getApiKey(keyId: string): Promise<ApiKey> {
    const response = await apiClient.get<ApiKey>(`/api-keys/${keyId}`, {
      withAuth: true
    })
    return response
  }

  /**
   * Mettre à jour une clé API
   */
  async updateApiKey(keyId: string, request: UpdateApiKeyRequest): Promise<ApiKey> {
    const response = await apiClient.put<ApiKey>(`/api-keys/${keyId}`, request, {
      withAuth: true,
      withToast: {
        loading: 'Updating API key...',
        success: 'API key updated successfully',
        error: 'Failed to update API key'
      }
    })
    return response
  }

  /**
   * Supprimer une clé API
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await apiClient.delete(`/api-keys/${keyId}`, {
      withAuth: true,
      withToast: {
        loading: 'Deleting API key...',
        success: 'API key deleted successfully',
        error: 'Failed to delete API key'
      }
    })
  }

  /**
   * Régénérer une clé API
   */
  async regenerateApiKey(keyId: string): Promise<CreateApiKeyResponse> {
    const response = await apiClient.post<CreateApiKeyResponse>(`/api-keys/${keyId}/regenerate`, {}, {
      withAuth: true,
      withToast: {
        loading: 'Regenerating API key...',
        success: 'API key regenerated successfully',
        error: 'Failed to regenerate API key'
      }
    })
    return response
  }

  /**
   * Obtenir les statistiques d'usage d'une clé API
   */
  async getApiKeyUsage(keyId: string, days = 30): Promise<ApiKeyUsageStats> {
    const response = await apiClient.get<ApiKeyUsageStats>(`/api-keys/${keyId}/usage`, {
      withAuth: true,
      params: { days }
    })
    return response
  }

  /**
   * Valider une clé API (pour les tests)
   */
  async validateApiKey(key: string): Promise<{
    keyId: string
    tenantId: string
    userId: string
    scopes: string[]
    rateLimit?: any
  }> {
    const response = await apiClient.post('/auth/validate-key', { key }, {
      withAuth: false // Endpoint public
    })
    return response
  }

  /**
   * Obtenir les scopes disponibles
   */
  getAvailableScopes(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'read',
        label: 'Read',
        description: 'Read access to resources'
      },
      {
        value: 'write',
        label: 'Write',
        description: 'Create and update resources'
      },
      {
        value: 'admin',
        label: 'Admin',
        description: 'Full administrative access'
      },
      {
        value: 'events',
        label: 'Events',
        description: 'Manage events and calendar'
      },
      {
        value: 'attendances',
        label: 'Attendances',
        description: 'Manage attendance records'
      },
      {
        value: 'reports',
        label: 'Reports',
        description: 'Generate and access reports'
      },
      {
        value: 'users',
        label: 'Users',
        description: 'Manage users and permissions'
      },
      {
        value: 'integrations',
        label: 'Integrations',
        description: 'Manage third-party integrations'
      }
    ]
  }

  /**
   * Formater la date d'expiration
   */
  formatExpirationDate(expiresAt?: string): string {
    if (!expiresAt) return 'Never'
    
    const date = new Date(expiresAt)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    if (diffDays <= 7) return `Expires in ${diffDays} days`
    if (diffDays <= 30) return `Expires in ${Math.ceil(diffDays / 7)} weeks`
    
    return date.toLocaleDateString()
  }

  /**
   * Obtenir le statut d'une clé API
   */
  getKeyStatus(apiKey: ApiKey): {
    status: 'active' | 'inactive' | 'expired'
    color: string
    label: string
  } {
    if (!apiKey.isActive) {
      return {
        status: 'inactive',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        label: 'Inactive'
      }
    }
    
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return {
        status: 'expired',
        color: 'text-red-600 bg-red-50 border-red-200',
        label: 'Expired'
      }
    }
    
    return {
      status: 'active',
      color: 'text-green-600 bg-green-50 border-green-200',
      label: 'Active'
    }
  }
}

export const apiKeysService = new ApiKeysService()