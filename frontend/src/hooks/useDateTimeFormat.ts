import { useMemo } from 'react'
import { useTenantSettings } from './useTenantSettings'
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeDate,
  formatDuration,
  parseDate,
  formatForInput,
  formatTimeForInput,
  convertToTenantTimezone,
  getCurrentDateInTenantTimezone,
  DateTimeFormatOptions
} from '@/utils/dateTimeUtils'

interface UseDateTimeFormatReturn {
  // Settings
  timezone: string
  dateFormat: string
  timeFormat: string
  locale: string
  
  // Formatting functions with tenant settings applied
  formatDate: (date: Date | string | null | undefined) => string
  formatTime: (date: Date | string | null | undefined) => string
  formatDateTime: (date: Date | string | null | undefined) => string
  formatRelativeDate: (date: Date | string | null | undefined) => string
  formatDuration: (minutes: number) => string
  
  // Parsing functions
  parseDate: (dateString: string) => Date | null
  
  // Input formatting
  formatForInput: (date: Date | string | null) => string
  formatTimeForInput: (date: Date | string | null) => string
  
  // Timezone functions
  convertToTenantTimezone: (date: Date | string) => Date
  getCurrentDateInTenantTimezone: () => Date
  
  // Loading state
  loading: boolean
}

/**
 * Hook pour utiliser les formats de date/heure configurés par le tenant
 */
export const useDateTimeFormat = (): UseDateTimeFormatReturn => {
  const { settings, loading } = useTenantSettings()

  const formatOptions = useMemo((): DateTimeFormatOptions => ({
    timezone: settings?.timezone || 'UTC',
    dateFormat: settings?.dateFormat || 'DD/MM/YYYY',
    timeFormat: settings?.timeFormat || 'HH:mm',
    locale: settings?.locale || 'en-US'
  }), [settings])

  const formatters = useMemo(() => ({
    formatDate: (date: Date | string | null | undefined) => 
      formatDate(date, formatOptions),
    
    formatTime: (date: Date | string | null | undefined) => 
      formatTime(date, formatOptions),
    
    formatDateTime: (date: Date | string | null | undefined) => 
      formatDateTime(date, formatOptions),
    
    formatRelativeDate: (date: Date | string | null | undefined) => 
      formatRelativeDate(date, formatOptions),
    
    formatDuration: (minutes: number) => 
      formatDuration(minutes, formatOptions),
    
    parseDate: (dateString: string) => 
      parseDate(dateString, formatOptions.dateFormat),
    
    formatForInput: (date: Date | string | null) => 
      formatForInput(date),
    
    formatTimeForInput: (date: Date | string | null) => 
      formatTimeForInput(date),
    
    convertToTenantTimezone: (date: Date | string) => 
      convertToTenantTimezone(date, formatOptions.timezone),
    
    getCurrentDateInTenantTimezone: () => 
      getCurrentDateInTenantTimezone(formatOptions.timezone)
  }), [formatOptions])

  return {
    // Settings
    timezone: formatOptions.timezone!,
    dateFormat: formatOptions.dateFormat!,
    timeFormat: formatOptions.timeFormat!,
    locale: formatOptions.locale!,
    
    // Formatters
    ...formatters,
    
    // Loading state
    loading
  }
}