import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/apiClient'
import { useTenant } from '@/contexts/TenantContext'

export interface TenantSettings {
  timezone: string
  locale: string
  currency: string
  dateFormat: string
  timeFormat: string
  name?: string
  description?: string
}

interface UseTenantSettingsReturn {
  settings: TenantSettings | null
  loading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
  updateSettings: (newSettings: Partial<TenantSettings>) => Promise<void>
}

const defaultSettings: TenantSettings = {
  timezone: 'UTC',
  locale: 'en-US',
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'HH:mm'
}

export const useTenantSettings = (): UseTenantSettingsReturn => {
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentTenant } = useTenant()

  const fetchSettings = useCallback(async () => {
    if (!currentTenant?.id) {
      setSettings(defaultSettings)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get(`/tenants/${currentTenant.id}`, { withAuth: true })
      
      if (response?.settings) {
        const tenantSettings: TenantSettings = {
          ...defaultSettings,
          ...response.settings
        }
        setSettings(tenantSettings)
      } else {
        setSettings(defaultSettings)
      }
    } catch (err) {
      console.error('Error fetching tenant settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
      setSettings(defaultSettings) // Fallback to defaults
    } finally {
      setLoading(false)
    }
  }, [currentTenant?.id])

  const updateSettings = useCallback(async (newSettings: Partial<TenantSettings>) => {
    if (!currentTenant?.id) {
      throw new Error('No tenant selected')
    }

    try {
      await apiClient.put(`/tenants/${currentTenant.id}/settings`, { 
        settings: newSettings 
      }, { 
        withAuth: true,
        withToast: {
          loading: 'Updating settings...',
          success: 'Settings updated successfully'
        }
      })

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : { ...defaultSettings, ...newSettings })
    } catch (err) {
      console.error('Error updating tenant settings:', err)
      throw err
    }
  }, [currentTenant?.id])

  const refreshSettings = useCallback(async () => {
    await fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    refreshSettings,
    updateSettings
  }
}