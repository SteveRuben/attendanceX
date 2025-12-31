import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/services/apiClient'

export interface Tenant {
  id: string
  name: string
  slug?: string
  planId?: string
  status?: 'active' | 'suspended' | 'trial'
  createdAt?: string
  settings?: TenantSettings
  branding?: TenantBranding
}

export interface TenantSettings {
  timezone?: string
  dateFormat?: string
  language?: string
  features?: Record<string, boolean>
}

export interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string
}

export interface TenantMembership {
  tenantId: string
  userId: string
  role: 'owner' | 'admin' | 'manager' | 'member'
  permissions: string[]
  isActive: boolean
  joinedAt?: string
}

export interface TenantContextState {
  currentTenant: Tenant | null
  membership: TenantMembership | null
  availableTenants: Tenant[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

export interface TenantContextValue extends TenantContextState {
  selectTenant: (tenantId: string) => Promise<void>
  refreshTenants: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string | string[]) => boolean
  hasFeature: (feature: string) => boolean
  clearError: () => void
}

const TENANT_STORAGE_KEY = 'currentTenantId'

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [state, setState] = useState<TenantContextState>({
    currentTenant: null,
    membership: null,
    availableTenants: [],
    isLoading: true,
    isInitialized: false,
    error: null,
  })

  const fetchTenants = useCallback(async (): Promise<Tenant[]> => {
    try {
      const response = await apiClient.get<Tenant[] | { items: Tenant[] }>('/tenants', {
        withAuth: true,
        suppressTenantHeader: true,
      })
      return Array.isArray(response) ? response : response?.items || []
    } catch (err: any) {
      console.error('Failed to fetch tenants:', err)
      
      // If it's a 401, clear the tenant state as the user needs to re-authenticate
      if (err.status === 401) {
        setState(prev => ({
          ...prev,
          currentTenant: null,
          membership: null,
          availableTenants: [],
          error: 'Session expired. Please log in again.',
          isInitialized: true
        }))
      }
      
      return []
    }
  }, [])

  const fetchMembership = useCallback(async (tenantId: string): Promise<TenantMembership | null> => {
    try {
      const response = await apiClient.get<TenantMembership>(`/tenants/${tenantId}/membership`, {
        withAuth: true,
      })
      return response
    } catch {
      return null
    }
  }, [])

  const selectTenant = useCallback(async (tenantId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tenants = state.availableTenants.length > 0
        ? state.availableTenants
        : await fetchTenants()

      const tenant = tenants.find(t => t.id === tenantId)
      if (!tenant) {
        throw new Error('Tenant not found or access denied')
      }

      const membership = await fetchMembership(tenantId)

      if (typeof window !== 'undefined') {
        localStorage.setItem(TENANT_STORAGE_KEY, tenantId)
      }

      setState(prev => ({
        ...prev,
        currentTenant: tenant,
        membership,
        availableTenants: tenants,
        isLoading: false,
        isInitialized: true,
        error: null,
      }))
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to select tenant',
      }))
      throw err
    }
  }, [state.availableTenants, fetchTenants, fetchMembership])

  const refreshTenants = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const tenants = await fetchTenants()
      setState(prev => ({
        ...prev,
        availableTenants: tenants,
        isLoading: false,
      }))
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Failed to refresh tenants',
      }))
    }
  }, [fetchTenants])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!state.membership) return false
    if (state.membership.role === 'owner') return true
    return state.membership.permissions?.includes(permission) ?? false
  }, [state.membership])

  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!state.membership) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(state.membership.role)
  }, [state.membership])

  const hasFeature = useCallback((feature: string): boolean => {
    if (!state.currentTenant?.settings?.features) return false
    return state.currentTenant.settings.features[feature] === true
  }, [state.currentTenant])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') {
      setState(prev => ({ ...prev, isLoading: false, isInitialized: status === 'unauthenticated' }))
      return
    }

    const initializeTenant = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        const tenants = await fetchTenants()
        const storedTenantId = typeof window !== 'undefined'
          ? localStorage.getItem(TENANT_STORAGE_KEY)
          : null

        let selectedTenant: Tenant | null = null
        let membership: TenantMembership | null = null

        if (storedTenantId) {
          selectedTenant = tenants.find(t => t.id === storedTenantId) || null
        }

        if (!selectedTenant && tenants.length === 1) {
          selectedTenant = tenants[0]
          if (typeof window !== 'undefined' && selectedTenant) {
            localStorage.setItem(TENANT_STORAGE_KEY, selectedTenant.id)
          }
        }

        if (selectedTenant) {
          membership = await fetchMembership(selectedTenant.id)
        }

        setState({
          currentTenant: selectedTenant,
          membership,
          availableTenants: tenants,
          isLoading: false,
          isInitialized: true,
          error: null,
        })
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: true,
          error: err?.message || 'Failed to initialize tenant context',
        }))
      }
    }

    initializeTenant()
  }, [status, fetchTenants, fetchMembership])

  const value: TenantContextValue = {
    ...state,
    selectTenant,
    refreshTenants,
    hasPermission,
    hasRole,
    hasFeature,
    clearError,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export function useTenantId(): string | null {
  const { currentTenant } = useTenant()
  return currentTenant?.id ?? null
}

export function useRequireTenant(): Tenant {
  const { currentTenant, isLoading } = useTenant()
  if (isLoading) {
    throw new Error('Tenant is still loading')
  }
  if (!currentTenant) {
    throw new Error('No tenant selected')
  }
  return currentTenant
}

