import { apiClient } from '@/services/apiClient'

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
export type CampaignType = 'newsletter' | 'announcement' | 'reminder' | 'promotional' | 'transactional'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject: string
  content: {
    htmlContent: string
    textContent?: string
  }
  recipientCriteria?: {
    roles?: string[]
    departments?: string[]
    excludeUnsubscribed?: boolean
    includeInactive?: boolean
  }
  tags?: string[]
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
}

export interface CampaignAnalytics {
  campaignId: string
  totalRecipients: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  openRate: number
  clickRate: number
  bounceRate: number
}

export interface CreateCampaignPayload {
  name: string
  type: CampaignType
  subject: string
  content: { htmlContent: string; textContent?: string }
  recipientCriteria?: Campaign['recipientCriteria']
  tags?: string[]
}

export interface UpdateCampaignPayload {
  name?: string
  subject?: string
  content?: { htmlContent: string; textContent?: string }
  recipientCriteria?: Campaign['recipientCriteria']
  tags?: string[]
}

export async function getCampaigns(params?: { page?: number; limit?: number }): Promise<{ data: Campaign[]; total: number }> {
  const query = new URLSearchParams()
  query.set('page', String(params?.page || 1))
  query.set('limit', String(params?.limit || 20))
  query.set('sortBy', 'createdAt')
  query.set('sortOrder', 'desc')
  const res = await apiClient.get<any>(`/email-campaigns?${query}`)
  const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  return { data: items, total: res?.total ?? items.length }
}

export async function getCampaign(id: string): Promise<Campaign> {
  return apiClient.get<Campaign>(`/email-campaigns/${id}`)
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  return apiClient.post<Campaign>('/email-campaigns', payload, { withToast: { loading: 'Creating campaign...', success: 'Campaign created!' } })
}

export async function updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
  return apiClient.put<Campaign>(`/email-campaigns/${id}`, payload, { withToast: { loading: 'Updating...', success: 'Campaign updated!' } })
}

export async function deleteCampaign(id: string): Promise<void> {
  return apiClient.delete(`/email-campaigns/${id}`, { withToast: { loading: 'Deleting...', success: 'Campaign deleted!' } })
}

export async function scheduleCampaign(id: string, scheduledAt: string, options?: { priority?: number; batchSize?: number }): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/schedule`, { scheduledAt, ...options }, { withToast: { loading: 'Scheduling...', success: 'Campaign scheduled!' } })
}

export async function sendCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/send`, {}, { withToast: { loading: 'Sending...', success: 'Campaign sent!' } })
}

export async function pauseCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/pause`, {}, { withToast: { success: 'Campaign paused' } })
}

export async function resumeCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/resume`, {}, { withToast: { success: 'Campaign resumed' } })
}

export async function cancelCampaign(id: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/cancel`, {}, { withToast: { success: 'Campaign cancelled' } })
}

export async function duplicateCampaign(id: string, newName: string): Promise<Campaign> {
  return apiClient.post<Campaign>(`/email-campaigns/${id}/duplicate`, { newName }, { withToast: { success: 'Campaign duplicated!' } })
}

export async function getCampaignAnalytics(id: string): Promise<CampaignAnalytics> {
  return apiClient.get<CampaignAnalytics>(`/email-campaigns/${id}/analytics`)
}

export async function getCampaignPerformance(id: string): Promise<any> {
  return apiClient.get(`/email-campaigns/${id}/performance`)
}

export async function getComparativeAnalytics(params: { campaignType?: string; dateFrom?: string; dateTo?: string }): Promise<any> {
  const query = new URLSearchParams()
  if (params.campaignType) query.set('campaignType', params.campaignType)
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
  return apiClient.get(`/email-campaigns/analytics/comparative?${query}`)
}

export async function getEngagementInsights(params: { dateFrom?: string; dateTo?: string }): Promise<any> {
  const query = new URLSearchParams()
  if (params.dateFrom) query.set('dateFrom', params.dateFrom)
  if (params.dateTo) query.set('dateTo', params.dateTo)
  return apiClient.get(`/email-campaigns/analytics/engagement?${query}`)
}

export async function sendTestCampaign(id: string, testRecipients: string[]): Promise<void> {
  return apiClient.post(`/email-campaigns/${id}/test`, { testRecipients }, { withToast: { loading: 'Sending test email...', success: 'Test email sent!' } })
}

export async function previewCampaign(content: { subject: string; htmlContent: string; templateData?: Record<string, any> }, sampleRecipient?: { email: string; firstName?: string; lastName?: string }): Promise<any> {
  return apiClient.post('/email-campaigns/preview', { content, sampleRecipient })
}

export async function sendTestPreviewEmail(
  campaignData: CreateCampaignPayload,
  testRecipients: string[]
): Promise<void> {
  const draftCampaign = await apiClient.post<Campaign>('/email-campaigns', {
    ...campaignData,
    name: `[TEST] ${campaignData.name}`,
  })
  try {
    await apiClient.post(`/email-campaigns/${draftCampaign.id}/test`, { testRecipients }, { withToast: { loading: 'Sending test email...', success: 'Test email sent!' } })
  } finally {
    await apiClient.delete(`/email-campaigns/${draftCampaign.id}`).catch(() => {})
  }
}

export async function previewRecipients(criteria: Campaign['recipientCriteria'], limit?: number): Promise<{ recipients: any[]; totalCount: number }> {
  return apiClient.post('/email-campaigns/recipients/preview', { criteria, limit: limit || 50, offset: 0 })
}

