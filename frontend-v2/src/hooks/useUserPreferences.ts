import { useState, useEffect, useCallback } from 'react'
import { userPreferencesService, UserPreferences, UserPreferencesUpdate } from '@/services/userPreferencesService'

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [options, setOptions] = useState<{
    languages: Array<{ value: string; label: string }>
    timezones: Array<{ value: string; label: string }>
    dateFormats: Array<{ value: string; label: string }>
    timeFormats: Array<{ value: string; label: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [prefsData, optionsData] = await Promise.all([
        userPreferencesService.getMyPreferences(),
        userPreferencesService.getPreferencesOptions()
      ])
      setPreferences(prefsData)
      setOptions(optionsData)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des préférences')
      console.error('Error fetching preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePreferences = useCallback(async (updates: UserPreferencesUpdate) => {
    if (!preferences) return

    try {
      setUpdating(true)
      setError(null)
      const updatedPreferences = await userPreferencesService.updateMyPreferences(updates)
      setPreferences(updatedPreferences)
      return updatedPreferences
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour des préférences')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [preferences])

  const updatePreference = useCallback(async (key: keyof UserPreferences, value: any) => {
    return updatePreferences({ [key]: value })
  }, [updatePreferences])

  const resetPreferences = useCallback(async () => {
    try {
      setUpdating(true)
      setError(null)
      const resetPrefs = await userPreferencesService.resetPreferences()
      setPreferences(resetPrefs)
      return resetPrefs
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation des préférences')
      throw err
    } finally {
      setUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    options,
    loading,
    error,
    updating,
    updatePreferences,
    updatePreference,
    resetPreferences,
    refetch: fetchPreferences,
  }
}

// Hook for specific preference categories
export function useThemePreference() {
  const { preferences, updatePreference, loading } = useUserPreferences()
  
  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    return updatePreference('theme', theme)
  }, [updatePreference])

  return {
    theme: preferences?.theme ?? 'system',
    setTheme,
    loading,
  }
}

export function useLanguagePreference() {
  const { preferences, updatePreference, loading } = useUserPreferences()
  
  const setLanguage = useCallback((language: string) => {
    return updatePreference('language', language)
  }, [updatePreference])

  return {
    language: preferences?.language ?? 'fr-FR',
    setLanguage,
    loading,
  }
}

export function useTimezonePreference() {
  const { preferences, updatePreference, loading } = useUserPreferences()
  
  const setTimezone = useCallback((timezone: string) => {
    return updatePreference('timezone', timezone)
  }, [updatePreference])

  return {
    timezone: preferences?.timezone ?? 'Europe/Paris',
    setTimezone,
    loading,
  }
}