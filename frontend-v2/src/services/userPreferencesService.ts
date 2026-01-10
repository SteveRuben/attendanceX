import { apiClient } from '@/services/apiClient'

export interface UserPreferences {
  // Regional preferences
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string
  weekStartsOn: 'monday' | 'sunday'
  
  // Appearance preferences
  theme: 'light' | 'dark' | 'system'
  
  // Attendance preferences
  gracePeriod: number
  autoCheckOut: boolean
  
  // Basic notification preferences (detailed ones are in notification service)
  emailNotifications: boolean
  pushNotifications: boolean
  soundNotifications: boolean
}

export interface UserPreferencesUpdate {
  language?: string
  timezone?: string
  dateFormat?: string
  timeFormat?: string
  weekStartsOn?: 'monday' | 'sunday'
  theme?: 'light' | 'dark' | 'system'
  gracePeriod?: number
  autoCheckOut?: boolean
  emailNotifications?: boolean
  pushNotifications?: boolean
  soundNotifications?: boolean
}

export class UserPreferencesService {
  /**
   * Get current user's preferences
   */
  async getMyPreferences(): Promise<UserPreferences> {
    const res = await apiClient.get<any>('/users/me/preferences', { withAuth: true })
    return this.mapPreferences(res?.data ?? res)
  }

  /**
   * Update current user's preferences
   */
  async updateMyPreferences(updates: UserPreferencesUpdate): Promise<UserPreferences> {
    const res = await apiClient.put<any>('/users/me/preferences', updates, {
      withAuth: true,
      withToast: { 
        loading: 'Sauvegarde des préférences...', 
        success: 'Préférences mises à jour avec succès' 
      },
    })
    return this.mapPreferences(res?.data ?? res)
  }

  /**
   * Reset preferences to default values
   */
  async resetPreferences(): Promise<UserPreferences> {
    const res = await apiClient.post<any>('/users/me/preferences/reset', {}, {
      withAuth: true,
      withToast: { 
        loading: 'Réinitialisation des préférences...', 
        success: 'Préférences réinitialisées' 
      },
    })
    return this.mapPreferences(res?.data ?? res)
  }

  /**
   * Get available options for preferences
   */
  async getPreferencesOptions(): Promise<{
    languages: Array<{ value: string; label: string }>
    timezones: Array<{ value: string; label: string }>
    dateFormats: Array<{ value: string; label: string }>
    timeFormats: Array<{ value: string; label: string }>
  }> {
    try {
      const res = await apiClient.get<any>('/users/preferences/options', { withAuth: true })
      return res?.data ?? res ?? this.getDefaultOptions()
    } catch (error: any) {
      // Always use default options if endpoint fails
      console.warn('Preferences options endpoint not available, using default options')
      return this.getDefaultOptions()
    }
  }

  private mapPreferences(data: any): UserPreferences {
    return {
      language: data?.language ?? 'fr-FR',
      timezone: data?.timezone ?? 'Europe/Paris',
      dateFormat: data?.dateFormat ?? 'DD/MM/YYYY',
      timeFormat: data?.timeFormat ?? 'HH:mm',
      weekStartsOn: data?.weekStartsOn ?? 'monday',
      theme: data?.theme ?? 'system',
      gracePeriod: data?.gracePeriod ?? 15,
      autoCheckOut: data?.autoCheckOut ?? false,
      emailNotifications: data?.emailNotifications ?? true,
      pushNotifications: data?.pushNotifications ?? false,
      soundNotifications: data?.soundNotifications ?? false,
    }
  }

  private getDefaultOptions() {
    return {
      languages: [
        { value: 'fr-FR', label: 'Français (France)' },
        { value: 'en-US', label: 'English (US)' },
        { value: 'en-GB', label: 'English (UK)' },
        { value: 'de-DE', label: 'Deutsch' },
        { value: 'es-ES', label: 'Español' },
        { value: 'it-IT', label: 'Italiano' }
      ],
      timezones: [
        { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
        { value: 'Europe/London', label: 'Europe/London (GMT)' },
        { value: 'America/New_York', label: 'America/New_York (EST)' },
        { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
        { value: 'UTC', label: 'UTC' }
      ],
      dateFormats: [
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
      ],
      timeFormats: [
        { value: 'HH:mm', label: '24h (HH:mm)' },
        { value: 'hh:mm A', label: '12h (hh:mm AM/PM)' }
      ]
    }
  }
}

export const userPreferencesService = new UserPreferencesService()