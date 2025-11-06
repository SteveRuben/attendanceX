import { apiClient } from '@/services/apiClient'
import { getInvitationStats, InvitationStats } from '@/services/invitationsService'

export interface OrganizationOverview {
  usersCount: number
  invitations: InvitationStats
}

export async function getOrganizationOverview(): Promise<OrganizationOverview> {
  try {
    const [usersRes, invStats] = await Promise.all([
      apiClient.get<any>('/users?limit=1&offset=0', { mock: { items: new Array(12) } }),
      getInvitationStats(),
    ])
    const usersTotal = Number(usersRes?.total ?? usersRes?.count ?? (Array.isArray(usersRes?.items) ? usersRes.items.length : 0))
    return { usersCount: usersTotal, invitations: invStats }
  } catch {
    return {
      usersCount: 12,
      invitations: { total: 2, pending: 1, sent: 1, accepted: 0, declined: 0, expired: 0 },
    }
  }
}

