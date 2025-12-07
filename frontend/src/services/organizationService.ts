import { apiClient } from '@/services/apiClient'
import { getInvitationStats, InvitationStats } from '@/services/invitationsService'

export interface OrganizationOverview {
  usersCount: number
  invitations: InvitationStats
}

export async function getOrganizationOverview(): Promise<OrganizationOverview> {
  try {
    const [usersRes, invStats] = await Promise.all([
      apiClient.get<any>('/users?page=1&limit=1'),
      getInvitationStats(),
    ])
    const usersTotal = Number(usersRes?.pagination?.total ?? usersRes?.total ?? 0)
    return { usersCount: usersTotal, invitations: invStats }
  } catch (e) {
    throw e
  }
}

