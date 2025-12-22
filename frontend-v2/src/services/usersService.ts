import { apiClient } from '@/services/apiClient'

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'organizer'
  | 'moderator'
  | 'participant'
  | 'analyst'
  | 'contributor'
  | 'viewer'
  | 'guest'

export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface UserItem {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  phone?: string
  status?: UserStatus | string
  department?: string
  createdAt?: string
  updatedAt?: string
}

function mapUser(d: any): UserItem {
  const id = String(d?.id ?? d?._id ?? Math.random())
  const email = String(d?.email ?? d?.username ?? '')
  const firstName = d?.firstName
  const lastName = d?.lastName
  const displayName = d?.displayName || [firstName, lastName].filter(Boolean).join(' ') || email
  const phone = d?.phone
  const status = (d?.status || 'active') as UserStatus | string
  const department = d?.department
  const createdAt = d?.createdAt || d?.created_on
  const updatedAt = d?.updatedAt || d?.updated_on
  return { id, email, firstName, lastName, displayName, phone, status, department, createdAt, updatedAt }
}

export async function getUsers(params: { page?: number; limit?: number; role?: string; status?: string; department?: string; search?: string; includeInactive?: boolean } = {}) {
  const { page = 1, limit = 20, role, status, department, search, includeInactive } = params
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) qs.set('status', status)
  if (department) qs.set('department', department)
  if (search) qs.set('search', search)
  if (typeof includeInactive === 'boolean') qs.set('includeInactive', String(includeInactive))
  const res = await apiClient.get<any>(`/users?${qs.toString()}`, { withAuth: true })
  const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? (res as any) : []
  const items = list.map(mapUser)
  const pagination = (res as any)?.pagination
  return { items, pagination }
}

export async function getUserById(id: string): Promise<UserItem> {
  const res = await apiClient.get<any>(`/users/${encodeURIComponent(id)}`, { withAuth: true })
  const d = (res as any)?.data ?? res
  return mapUser(d)
}

export async function updateUser(id: string, updates: Partial<Pick<UserItem, 'firstName' | 'lastName' | 'phone' | 'department'>>): Promise<UserItem> {
  const res = await apiClient.put<any>(`/users/${encodeURIComponent(id)}`, updates, {
    withAuth: true,
    withToast: { loading: 'Saving...', success: 'Profile updated' },
  })
  const d = (res as any)?.data ?? res
  return mapUser(d)
}

export async function changeUserRole(id: string, role: UserRole): Promise<void> {
  await apiClient.post(`/users/${encodeURIComponent(id)}/role`, { role }, {
    withAuth: true,
    withToast: { loading: 'Updating role...', success: 'Role updated' },
  })
}

export async function changeUserStatus(id: string, status: UserStatus, reason?: string): Promise<void> {
  await apiClient.post(`/users/${encodeURIComponent(id)}/status`, { status, reason }, {
    withAuth: true,
    withToast: { loading: 'Updating status...', success: 'Status updated' },
  })
}

export async function createUser(input: { email: string; firstName?: string; lastName?: string; role: UserRole; password: string; phone?: string; department?: string }): Promise<UserItem> {
  const res = await apiClient.post<any>('/users', input, {
    withAuth: true,
    withToast: { loading: 'Creating user...', success: 'User created' },
  })
  const d = (res as any)?.data ?? res
  return mapUser(d)
}

export async function searchUsers(query: { search: string; limit?: number; page?: number }) {
  const res = await apiClient.post<any>('/users/search', query, { withAuth: true })
  const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? (res as any) : []
  return list.map(mapUser)
}

