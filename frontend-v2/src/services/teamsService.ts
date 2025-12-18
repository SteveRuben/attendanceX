import { apiClient } from '@/services/apiClient'

export interface Team {
  id: string
  name: string
  description?: string
  department?: string
  managerId?: string
  memberCount: number
  isActive: boolean
  settings?: {
    canValidateAttendance?: boolean
    canCreateEvents?: boolean
    canInviteParticipants?: boolean
    canViewAllEvents?: boolean
    canExportData?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'member' | 'lead' | 'manager'
  isActive: boolean
  joinedAt: string
}

export interface CreateTeamRequest {
  name: string
  description?: string
  department?: string
  managerId?: string
  settings?: {
    canValidateAttendance?: boolean
    canCreateEvents?: boolean
    canInviteParticipants?: boolean
    canViewAllEvents?: boolean
    canExportData?: boolean
  }
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  department?: string
  managerId?: string
  settings?: {
    canValidateAttendance?: boolean
    canCreateEvents?: boolean
    canInviteParticipants?: boolean
    canViewAllEvents?: boolean
    canExportData?: boolean
  }
}

export interface TeamStats {
  memberCount: number
  activeMembers: number
  eventsCreated: number
  attendanceValidations: number
  lastActivity: string
}

export interface TeamsFilters {
  department?: string
  managerId?: string
  isActive?: boolean
  search?: string
  page?: number
  limit?: number
}

/**
 * Récupérer toutes les équipes d'un tenant
 */
export async function getTeams(tenantId: string, filters?: TeamsFilters): Promise<{
  data: Team[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}> {
  const params = new URLSearchParams()
  
  if (filters?.department) params.set('department', filters.department)
  if (filters?.managerId) params.set('managerId', filters.managerId)
  if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive))
  if (filters?.search) params.set('search', filters.search)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))

  const response = await apiClient.get<any>(`/tenants/${tenantId}/teams?${params.toString()}`, { withAuth: true })
  
  return {
    data: response.success ? response.data : response,
    pagination: response.pagination || {
      total: response.data?.length || 0,
      page: 1,
      limit: 50,
      totalPages: 1
    }
  }
}

/**
 * Récupérer une équipe par ID
 */
export async function getTeamById(tenantId: string, teamId: string): Promise<Team> {
  const response = await apiClient.get<any>(`/tenants/${tenantId}/teams/${teamId}`, { withAuth: true })
  return response.success ? response.data : response
}

/**
 * Créer une nouvelle équipe
 */
export async function createTeam(tenantId: string, teamData: CreateTeamRequest): Promise<Team> {
  const response = await apiClient.post<any>(`/tenants/${tenantId}/teams`, teamData, { 
    withAuth: true,
    withToast: { loading: 'Creating team...', success: 'Team created successfully' }
  })
  return response.success ? response.data : response
}

/**
 * Mettre à jour une équipe
 */
export async function updateTeam(tenantId: string, teamId: string, teamData: UpdateTeamRequest): Promise<Team> {
  const response = await apiClient.put<any>(`/tenants/${tenantId}/teams/${teamId}`, teamData, { 
    withAuth: true,
    withToast: { loading: 'Updating team...', success: 'Team updated successfully' }
  })
  return response.success ? response.data : response
}

/**
 * Supprimer une équipe
 */
export async function deleteTeam(tenantId: string, teamId: string): Promise<void> {
  await apiClient.delete(`/tenants/${tenantId}/teams/${teamId}`, { 
    withAuth: true,
    withToast: { loading: 'Deleting team...', success: 'Team deleted successfully' }
  })
}

/**
 * Récupérer les membres d'une équipe
 */
export async function getTeamMembers(tenantId: string, teamId: string): Promise<TeamMember[]> {
  const response = await apiClient.get<any>(`/tenants/${tenantId}/teams/${teamId}/members`, { withAuth: true })
  return response.success ? response.data : response
}

/**
 * Ajouter un membre à une équipe
 */
export async function addTeamMember(tenantId: string, teamId: string, userId: string, role: 'member' | 'lead' | 'manager' = 'member'): Promise<TeamMember> {
  const response = await apiClient.post<any>(`/tenants/${tenantId}/teams/${teamId}/members`, { userId, role }, { 
    withAuth: true,
    withToast: { loading: 'Adding member...', success: 'Member added successfully' }
  })
  return response.success ? response.data : response
}

/**
 * Retirer un membre d'une équipe
 */
export async function removeTeamMember(tenantId: string, teamId: string, userId: string): Promise<void> {
  await apiClient.delete(`/tenants/${tenantId}/teams/${teamId}/members/${userId}`, { 
    withAuth: true,
    withToast: { loading: 'Removing member...', success: 'Member removed successfully' }
  })
}

/**
 * Récupérer les statistiques d'une équipe
 */
export async function getTeamStats(tenantId: string, teamId: string): Promise<TeamStats> {
  const response = await apiClient.get<any>(`/tenants/${tenantId}/teams/${teamId}/stats`, { withAuth: true })
  return response.success ? response.data : response
}