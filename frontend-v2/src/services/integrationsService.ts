import { apiClient } from '@/services/apiClient'

export interface Integration {
  id: string
  provider: 'google' | 'microsoft' | 'slack' | 'zoom'
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  displayName: string
  userEmail?: string
  lastSync?: string
  syncSettings?: {
    enabled: boolean
    syncCalendar: boolean
    syncContacts: boolean
    syncFrequency: string
    bidirectional: boolean
  }
}

export interface MeetingLinkRequest {
  eventTitle: string
  startDateTime: string
  endDateTime: string
  description?: string
  attendees?: string[]
}

export interface MeetingLinkResponse {
  meetingUrl: string
  provider: string
  meetingId?: string
  joinUrl?: string
  dialInNumbers?: string[]
  additionalInfo?: Record<string, any>
}

export interface CompatibleProvidersResponse {
  hasIntegrations: boolean
  availableProviders: string[]
}

export async function getUserIntegrations(): Promise<Integration[]> {
  const data = await apiClient.get<{ success: boolean; data: Integration[] }>('/user/integrations')
  return data.data || []
}

export async function getCompatibleProviders(): Promise<CompatibleProvidersResponse> {
  const data = await apiClient.get<{ success: boolean; data: CompatibleProvidersResponse }>('/user/integrations/compatible-providers')
  return data.data || { hasIntegrations: false, availableProviders: [] }
}

export async function generateMeetingLink(request: MeetingLinkRequest): Promise<MeetingLinkResponse | null> {
  try {
    const data = await apiClient.post<{ success: boolean; data: MeetingLinkResponse }>('/user/integrations/generate-meeting-link', request)
    return data.data || null
  } catch (error) {
    console.error('Error generating meeting link:', error)
    return null
  }
}

export async function connectProvider(provider: string, scopes?: string[], redirectUri?: string) {
  return apiClient.post(`/user/integrations/${provider}/connect`, {
    scopes,
    redirectUri
  })
}

export async function disconnectIntegration(integrationId: string) {
  return apiClient.delete(`/user/integrations/${integrationId}`, {
    withToast: { 
      loading: 'Disconnecting integration...', 
      success: 'Integration disconnected successfully' 
    }
  })
}

export async function testIntegration(integrationId: string) {
  return apiClient.post(`/user/integrations/${integrationId}/test`)
}

export async function syncIntegration(integrationId: string, syncTypes?: string[], force?: boolean) {
  return apiClient.post(`/user/integrations/${integrationId}/sync`, {
    syncTypes,
    force
  })
}

export async function updateIntegrationSettings(integrationId: string, settings: any) {
  return apiClient.put(`/user/integrations/${integrationId}/settings`, {
    syncSettings: settings
  }, {
    withToast: { 
      loading: 'Updating settings...', 
      success: 'Settings updated successfully' 
    }
  })
}