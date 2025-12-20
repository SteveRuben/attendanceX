import { apiClient } from '@/services/apiClient'

export type InvitationStatus = 'pending' | 'sent' | 'accepted' | 'declined' | 'expired'

export interface InvitationItem {
  id: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  role?: string
  status: InvitationStatus
  createdAt?: string
  sentAt?: string
  expiresAt?: string
  tenantId?: string
}

export interface InvitationStats {
  total?: number
  pending?: number
  sent?: number
  accepted?: number
  declined?: number
  expired?: number
}


export async function getAllInvitations(params: { tenantId?: string; limit?: number; offset?: number } = {}): Promise<InvitationItem[]> {
  const { tenantId, limit = 100, offset = 0 } = params
  
  const qs = new URLSearchParams({ 
    limit: String(limit), 
    offset: String(offset), 
    sortBy: 'createdAt', 
    sortOrder: 'desc' 
  })
  
  // Filter by tenant if provided
  if (tenantId) {
    qs.set('tenantId', tenantId)
  }
  
  try {
    console.log('Fetching ALL invitations from:', `/user-invitations?${qs.toString()}`)
    const response = await apiClient.get<any>(`/user-invitations?${qs.toString()}`, { withAuth: true })
    console.log('Raw API response for all invitations:', response)
    
    // L'API retourne { success: true, data: { invitations: [...], pagination: {...} } }
    let list: any[] = []
    
    console.log('Response structure check:', {
      hasSuccess: !!response?.success,
      hasData: !!response?.data,
      hasInvitations: !!response?.data?.invitations,
      isInvitationsArray: Array.isArray(response?.data?.invitations),
      dataType: typeof response?.data,
      invitationsType: typeof response?.data?.invitations,
      responseKeys: response ? Object.keys(response) : [],
      dataKeys: response?.data ? Object.keys(response.data) : []
    })
    
    if (response?.success && response?.data?.invitations && Array.isArray(response.data.invitations)) {
      list = response.data.invitations
      console.log('Using response.data.invitations:', list)
    } else if (response?.data?.invitations && Array.isArray(response.data.invitations)) {
      list = response.data.invitations
      console.log('Using response.data.invitations (no success check):', list)
    } else if (response?.invitations && Array.isArray(response.invitations)) {
      list = response.invitations
      console.log('Using response.invitations:', list)
    } else if (Array.isArray(response?.data)) {
      list = response.data
      console.log('Using response.data as array:', list)
    } else if (Array.isArray(response)) {
      list = response
      console.log('Using response as array:', list)
    } else {
      console.warn('Unexpected API response format for all invitations:', response)
      console.log('Trying to extract invitations from any property...')
      // Essayer de trouver les invitations dans n'importe quelle propriété
      if (response?.data?.invitations) {
        list = Array.isArray(response.data.invitations) ? response.data.invitations : [response.data.invitations]
      } else if (response?.invitations) {
        list = Array.isArray(response.invitations) ? response.invitations : [response.invitations]
      } else {
        list = []
      }
      console.log('Fallback extraction result:', list)
    }
    
    console.log('Parsed ALL invitations list:', list)
    console.log('List length:', list.length)
    
    if (list.length > 0) {
      console.log('First invitation raw data:', list[0])
    }
    
    const mappedList = list.map((i: any): InvitationItem => {
      const mapped = {
        id: String(i.id ?? i._id ?? i.invitationId ?? cryptoRandom()),
        email: i.email ?? i.recipientEmail ?? '',
        firstName: i.firstName ?? '',
        lastName: i.lastName ?? '',
        name: i.invitedByName || i.name || [i.firstName, i.lastName].filter(Boolean).join(' ') || 'Unknown',
        role: i.role ?? 'user',
        status: (i.status || 'pending') as InvitationStatus,
        createdAt: i.createdAt || i.sentAt || i.created_on || i.invitedAt,
        sentAt: i.sentAt,
        expiresAt: i.expiresAt,
        tenantId: i.tenantId,
      }
      console.log('Mapped invitation:', mapped)
      return mapped
    })
    
    console.log('Final mapped list:', mappedList)
    return mappedList
  } catch (error) {
    console.error('Error fetching all invitations:', error)
    throw error
  }
}

export async function getInvitations(params: { tenantId?: string; status?: InvitationStatus; limit?: number; offset?: number } = {}): Promise<InvitationItem[]> {
  const { tenantId, status, limit = 50, offset = 0 } = params
  
  const qs = new URLSearchParams({ 
    limit: String(limit), 
    offset: String(offset), 
    sortBy: 'createdAt', 
    sortOrder: 'desc' 
  })
  
  if (status) qs.set('status', status)
  if (tenantId) qs.set('tenantId', tenantId)
  
  try {
    console.log('Fetching invitations from:', `/user-invitations?${qs.toString()}`)
    const response = await apiClient.get<any>(`/user-invitations?${qs.toString()}`, { withAuth: true })
    console.log('Raw API response:', response)
    
    // L'API retourne { success: true, data: { invitations: [...], pagination: {...} } }
    let list: any[] = []
    
    console.log('Response structure check (getInvitations):', {
      hasSuccess: !!response?.success,
      hasData: !!response?.data,
      hasInvitations: !!response?.data?.invitations,
      isInvitationsArray: Array.isArray(response?.data?.invitations),
      dataType: typeof response?.data,
      invitationsType: typeof response?.data?.invitations,
      responseKeys: response ? Object.keys(response) : [],
      dataKeys: response?.data ? Object.keys(response.data) : []
    })
    
    if (response?.success && response?.data?.invitations && Array.isArray(response.data.invitations)) {
      list = response.data.invitations
      console.log('Using response.data.invitations:', list)
    } else if (response?.data?.invitations && Array.isArray(response.data.invitations)) {
      list = response.data.invitations
      console.log('Using response.data.invitations (no success check):', list)
    } else if (response?.invitations && Array.isArray(response.invitations)) {
      list = response.invitations
      console.log('Using response.invitations:', list)
    } else if (Array.isArray(response?.data)) {
      list = response.data
      console.log('Using response.data as array:', list)
    } else if (Array.isArray(response)) {
      list = response
      console.log('Using response as array:', list)
    } else {
      console.warn('Unexpected API response format:', response)
      console.log('Trying to extract invitations from any property...')
      // Essayer de trouver les invitations dans n'importe quelle propriété
      if (response?.data?.invitations) {
        list = Array.isArray(response.data.invitations) ? response.data.invitations : [response.data.invitations]
      } else if (response?.invitations) {
        list = Array.isArray(response.invitations) ? response.invitations : [response.invitations]
      } else {
        list = []
      }
      console.log('Fallback extraction result:', list)
    }
    
    console.log('Parsed invitations list:', list)
    console.log('List length:', list.length)
    
    if (list.length > 0) {
      console.log('First invitation raw data:', list[0])
    }
    
    const mappedList = list.map((i: any): InvitationItem => {
      const mapped = {
        id: String(i.id ?? i._id ?? i.invitationId ?? cryptoRandom()),
        email: i.email ?? i.recipientEmail ?? '',
        firstName: i.firstName ?? '',
        lastName: i.lastName ?? '',
        name: i.invitedByName || i.name || [i.firstName, i.lastName].filter(Boolean).join(' ') || 'Unknown',
        role: i.role ?? 'user',
        status: (i.status || status || 'pending') as InvitationStatus,
        createdAt: i.createdAt || i.sentAt || i.created_on || i.invitedAt,
        sentAt: i.sentAt,
        expiresAt: i.expiresAt,
        tenantId: i.tenantId,
      }
      console.log('Mapped invitation:', mapped)
      return mapped
    })
    
    console.log('Final mapped list:', mappedList)
    return mappedList
  } catch (error) {
    console.error('Error fetching invitations:', error)
    throw error
  }
}

export async function getInvitationStats(tenantId?: string): Promise<InvitationStats> {
  try {
    const params = new URLSearchParams()
    if (tenantId) {
      params.set('tenantId', tenantId)
    }
    
    const response = await apiClient.get<any>(`/user-invitations/stats?${params.toString()}`, { withAuth: true })
    const data = response?.success ? response.data : response
    
    return {
      total: Number(data?.total ?? data?.count ?? 0),
      pending: Number(data?.pending ?? 0),
      sent: Number(data?.sent ?? 0),
      accepted: Number(data?.accepted ?? 0),
      declined: Number(data?.declined ?? 0),
      expired: Number(data?.expired ?? 0),
    }
  } catch (error) {
    console.error('Error fetching invitation stats:', error)
    return { total: 0, pending: 0, sent: 0, accepted: 0, declined: 0, expired: 0 }
  }
}

export async function sendInvitation(payload: { tenantId: string; email: string; firstName?: string; lastName?: string; role?: string; department?: string; message?: string; permissions?: string[] }) {
  const { tenantId, email, firstName, lastName, role, department, message } = payload
  
  return apiClient.post('/user-invitations/invite', { 
    email,
    firstName,
    lastName,
    role,
    department,
    message,
    tenantId
  }, { 
    withAuth: true, 
    withToast: { loading: 'Sending...', success: 'Invitation sent' } 
  })
}

export async function sendBulkInvitations(payload: { tenantId: string; invitations: Array<{ email: string; firstName?: string; lastName?: string; role?: string }>; customMessage?: string; sendWelcomeEmail?: boolean }) {
  const { tenantId, invitations, customMessage, sendWelcomeEmail } = payload
  
  return apiClient.post('/user-invitations/bulk-invite', { 
    invitations: invitations.map(inv => ({
      ...inv,
      tenantId
    })),
    message: customMessage,
    sendWelcomeEmail
  }, { withAuth: true, withToast: { loading: 'Sending...', success: 'Bulk invitations sent' } })
}

export async function resendInvitation(tenantId: string | undefined, invitationId: string) {
  return apiClient.post(`/user-invitations/${encodeURIComponent(invitationId)}/resend`, {}, { withAuth: true, withToast: { loading: 'Resending...', success: 'Invitation resent' } })
}

export async function cancelInvitation(tenantId: string | undefined, invitationId: string) {
  return apiClient.delete(`/user-invitations/${encodeURIComponent(invitationId)}`, { withAuth: true, withToast: { loading: 'Cancelling...', success: 'Invitation cancelled' } })
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID()
  return Math.random().toString(36).slice(2)
}

