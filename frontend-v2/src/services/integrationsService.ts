import { apiClient } from '@/services/apiClient'

export type IntegrationProvider = 'google' | 'microsoft' | 'slack' | 'github' | 'zoom'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending'

export interface Integration {
  id: string
  provider: IntegrationProvider
  status: IntegrationStatus
  connectedAt?: string
  lastSyncAt?: string
  syncSettings?: IntegrationSyncSettings
  scopes?: string[]
  error?: string
}

export interface IntegrationSyncSettings {
  enabled: boolean
  syncCalendar: boolean
  syncContacts: boolean
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  bidirectional: boolean
}

export interface SyncHistoryItem {
  id: string
  timestamp: string
  status: 'success' | 'error' | 'partial'
  itemsSynced: number
  duration: number
  error?: string
}

export interface OAuthConnectResponse {
  authUrl: string
  state: string
}

export async function getUserIntegrations(params?: { provider?: string; status?: string }): Promise<Integration[]> {
  const qs = new URLSearchParams()
  if (params?.provider) qs.set('provider', params.provider)
  if (params?.status) qs.set('status', params.status)
  const query = qs.toString()
  const res = await apiClient.get<any>(`/user/integrations${query ? `?${query}` : ''}`, { withAuth: true })
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  return list.map(mapIntegration)
}

export async function connectProvider(provider: IntegrationProvider, scopes?: string[]): Promise<OAuthConnectResponse> {
  const res = await apiClient.post<any>(`/user/integrations/${provider}/connect`, {
    scopes,
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/app/settings/integrations/callback` : '',
  }, { withAuth: true })
  return res?.data ?? res
}

export async function completeOAuthCallback(provider: IntegrationProvider, code: string, state: string): Promise<Integration> {
  const res = await apiClient.post<any>(`/user/integrations/${provider}/callback`, { code, state }, {
    withAuth: true,
    withToast: { loading: 'Connecting...', success: `Connected to ${provider}` },
  })
  return mapIntegration(res?.data ?? res)
}

export async function updateIntegrationSettings(integrationId: string, settings: IntegrationSyncSettings): Promise<Integration> {
  const res = await apiClient.put<any>(`/user/integrations/${integrationId}/settings`, { syncSettings: settings }, {
    withAuth: true,
    withToast: { loading: 'Saving...', success: 'Integration settings updated' },
  })
  return mapIntegration(res?.data ?? res)
}

export async function getIntegrationHistory(integrationId: string, params?: { limit?: number; offset?: number; status?: string }): Promise<SyncHistoryItem[]> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  if (params?.status) qs.set('status', params.status)
  const query = qs.toString()
  const res = await apiClient.get<any>(`/user/integrations/${integrationId}/history${query ? `?${query}` : ''}`, { withAuth: true })
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  return list.map(mapSyncHistory)
}

export async function triggerManualSync(integrationId: string, syncType: 'full' | 'incremental' = 'incremental'): Promise<void> {
  await apiClient.post(`/user/integrations/${integrationId}/sync`, { syncType }, {
    withAuth: true,
    withToast: { loading: 'Syncing...', success: 'Sync started' },
  })
}

export async function testIntegration(integrationId: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<any>(`/user/integrations/${integrationId}/test`, undefined, { withAuth: true })
  return res?.data ?? res ?? { success: true, message: 'Connection successful' }
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  await apiClient.delete(`/user/integrations/${integrationId}`, {
    withAuth: true,
    withToast: { loading: 'Disconnecting...', success: 'Integration disconnected' },
  })
}

function mapIntegration(d: any): Integration {
  return {
    id: String(d?.id ?? d?._id ?? Math.random()),
    provider: d?.provider ?? 'google',
    status: d?.status ?? 'disconnected',
    connectedAt: d?.connectedAt,
    lastSyncAt: d?.lastSyncAt,
    syncSettings: d?.syncSettings,
    scopes: d?.scopes,
    error: d?.error,
  }
}

function mapSyncHistory(d: any): SyncHistoryItem {
  return {
    id: String(d?.id ?? d?._id ?? Math.random()),
    timestamp: d?.timestamp ?? d?.createdAt ?? new Date().toISOString(),
    status: d?.status ?? 'success',
    itemsSynced: Number(d?.itemsSynced ?? 0),
    duration: Number(d?.duration ?? 0),
    error: d?.error,
  }
}

