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
}

export interface InvitationStats {
  total?: number
  pending?: number
  sent?: number
  accepted?: number
  declined?: number
  expired?: number
}


export async function getInvitations(params: { status?: InvitationStatus; limit?: number; offset?: number } = {}): Promise<InvitationItem[]> {
  const { status = 'pending', limit = 50, offset = 0 } = params
  const data = await apiClient.get<any>(
    `/user-invitations?status=${encodeURIComponent(status)}&limit=${limit}&offset=${offset}&sortBy=createdAt&sortOrder=desc`
  )
  const list = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data) ? (data as any) : []
  return list.map((i: any): InvitationItem => ({
    id: String(i.id ?? i._id ?? cryptoRandom()),
    email: i.email ?? i.recipientEmail ?? '',
    firstName: i.firstName,
    lastName: i.lastName,
    name: i.name || [i.firstName, i.lastName].filter(Boolean).join(' '),
    role: i.role,
    status: (i.status || status || 'pending') as InvitationStatus,
    createdAt: i.createdAt || i.sentAt || i.created_on,
    sentAt: i.sentAt,
    expiresAt: i.expiresAt,
  }))
}

export async function getInvitationStats(): Promise<InvitationStats> {
  const data = await apiClient.get<any>('/user-invitations/stats')
  return {
    total: Number((data as any)?.total ?? (data as any)?.count ?? 0),
    pending: Number((data as any)?.pending ?? 0),
    sent: Number((data as any)?.sent ?? 0),
    accepted: Number((data as any)?.accepted ?? 0),
    declined: Number((data as any)?.declined ?? 0),
    expired: Number((data as any)?.expired ?? 0),
  }
}

export async function sendInvitation(payload: { email: string; firstName?: string; lastName?: string; role?: string; department?: string; message?: string; permissions?: string[] }) {
  return apiClient.post('/user-invitations/invite', payload, { withToast: { loading: 'Sending...', success: 'Invitation sent' } })
}

export async function sendBulkInvitations(payload: { invitations: Array<{ email: string; firstName?: string; lastName?: string; role?: string }>; customMessage?: string; sendWelcomeEmail?: boolean }) {
  return apiClient.post('/user-invitations/bulk-invite', payload, { withToast: { loading: 'Sending...', success: 'Bulk invitations sent' } })
}

export async function resendInvitation(invitationId: string) {
  return apiClient.post(`/user-invitations/${encodeURIComponent(invitationId)}/resend`, {}, { withToast: { loading: 'Resending...', success: 'Invitation resent' } })
}

export async function cancelInvitation(invitationId: string) {
  return apiClient.delete(`/user-invitations/${encodeURIComponent(invitationId)}`, { withToast: { loading: 'Cancelling...', success: 'Invitation cancelled' } })
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return (crypto as any).randomUUID()
  return Math.random().toString(36).slice(2)
}

