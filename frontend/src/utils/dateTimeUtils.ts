import { format, parseISO, isValid } from 'date-fns'
import { fr, enUS, de, es, pt } from 'date-fns/locale'

// Mapping des locales
const localeMap = {
  'en-US': enUS,
  'en-GB': enUS,
  'fr-FR': fr,
  'de-DE': de,
  'es-ES': es,
  'pt-PT': pt
}

export interface DateTimeFormatOptions {
  timezone?: string
  dateFormat?: string
  timeFormat?: string
  locale?: string
}

/**
 * Formate une date selon les paramètres du tenant
 */
export const formatDate = (
  date: Date | string | null | undefined,
  options: DateTimeFormatOptions = {}
): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''

    const {
      dateFormat = 'DD/MM/YYYY',
      locale = 'en-US'
    } = options

    // Conversion du format vers date-fns
    let formatString = dateFormat
      .replace('DD', 'dd')
      .replace('MM', 'MM')
      .replace('YYYY', 'yyyy')

    const localeObj = localeMap[locale as keyof typeof localeMap] || enUS

    return format(dateObj, formatString, { locale: localeObj })
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Formate une heure selon les paramètres du tenant
 */
export const formatTime = (
  date: Date | string | null | undefined,
  options: DateTimeFormatOptions = {}
): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''

    const {
      timeFormat = 'HH:mm',
      locale = 'en-US'
    } = options

    // Conversion du format vers date-fns
    let formatString = timeFormat
    if (timeFormat === 'hh:mm A') {
      formatString = 'hh:mm a' // date-fns utilise 'a' pour AM/PM
    }

    const localeObj = localeMap[locale as keyof typeof localeMap] || enUS

    return format(dateObj, formatString, { locale: localeObj })
  } catch (error) {
    console.error('Error formatting time:', error)
    return ''
  }
}

/**
 * Formate une date et heure complète selon les paramètres du tenant
 */
export const formatDateTime = (
  date: Date | string | null | undefined,
  options: DateTimeFormatOptions = {}
): string => {
  if (!date) return ''
  
  const formattedDate = formatDate(date, options)
  const formattedTime = formatTime(date, options)
  
  if (!formattedDate && !formattedTime) return ''
  if (!formattedDate) return formattedTime
  if (!formattedTime) return formattedDate
  
  return `${formattedDate} ${formattedTime}`
}

/**
 * Formate une date relative (ex: "il y a 2 heures")
 */
export const formatRelativeDate = (
  date: Date | string | null | undefined,
  options: DateTimeFormatOptions = {}
): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''

    const now = new Date()
    const diffInMs = now.getTime() - dateObj.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    const { locale = 'en-US' } = options

    if (diffInMinutes < 1) {
      return locale.startsWith('fr') ? 'À l\'instant' : 'Just now'
    } else if (diffInMinutes < 60) {
      return locale.startsWith('fr') 
        ? `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`
        : `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return locale.startsWith('fr')
        ? `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`
        : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else if (diffInDays < 7) {
      return locale.startsWith('fr')
        ? `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`
        : `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    } else {
      // Pour les dates plus anciennes, afficher la date formatée
      return formatDate(date, options)
    }
  } catch (error) {
    console.error('Error formatting relative date:', error)
    return ''
  }
}

/**
 * Convertit une date vers le timezone du tenant
 */
export const convertToTenantTimezone = (
  date: Date | string,
  timezone: string = 'UTC'
): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return new Date()

    // Utiliser Intl.DateTimeFormat pour la conversion de timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    const parts = formatter.formatToParts(dateObj)
    const partsObj = parts.reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {} as Record<string, string>)

    return new Date(
      `${partsObj.year}-${partsObj.month}-${partsObj.day}T${partsObj.hour}:${partsObj.minute}:${partsObj.second}`
    )
  } catch (error) {
    console.error('Error converting to tenant timezone:', error)
    return new Date()
  }
}

/**
 * Obtient la date actuelle dans le timezone du tenant
 */
export const getCurrentDateInTenantTimezone = (timezone: string = 'UTC'): Date => {
  return convertToTenantTimezone(new Date(), timezone)
}

/**
 * Formate une durée en heures et minutes
 */
export const formatDuration = (
  minutes: number,
  options: DateTimeFormatOptions = {}
): string => {
  if (minutes < 0) return ''
  
  const { locale = 'en-US' } = options
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return locale.startsWith('fr')
      ? `${remainingMinutes} min`
      : `${remainingMinutes} min`
  } else if (remainingMinutes === 0) {
    return locale.startsWith('fr')
      ? `${hours}h`
      : `${hours}h`
  } else {
    return locale.startsWith('fr')
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h ${remainingMinutes}min`
  }
}

/**
 * Parse une date selon le format du tenant
 */
export const parseDate = (
  dateString: string,
  dateFormat: string = 'DD/MM/YYYY'
): Date | null => {
  if (!dateString) return null
  
  try {
    // Conversion simple pour les formats courants
    let day: string, month: string, year: string
    
    if (dateFormat === 'DD/MM/YYYY') {
      const parts = dateString.split('/')
      if (parts.length !== 3) return null
      day = parts[0]
      month = parts[1]
      year = parts[2]
    } else if (dateFormat === 'MM/DD/YYYY') {
      const parts = dateString.split('/')
      if (parts.length !== 3) return null
      month = parts[0]
      day = parts[1]
      year = parts[2]
    } else if (dateFormat === 'YYYY-MM-DD') {
      const parts = dateString.split('-')
      if (parts.length !== 3) return null
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else {
      return null
    }

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return isValid(date) ? date : null
  } catch (error) {
    console.error('Error parsing date:', error)
    return null
  }
}

/**
 * Obtient le format de date pour les inputs HTML
 */
export const getInputDateFormat = (dateFormat: string): string => {
  // Les inputs HTML utilisent toujours YYYY-MM-DD
  return 'YYYY-MM-DD'
}

/**
 * Convertit une date vers le format des inputs HTML
 */
export const formatForInput = (date: Date | string | null): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    
    return format(dateObj, 'yyyy-MM-dd')
  } catch (error) {
    console.error('Error formatting for input:', error)
    return ''
  }
}

/**
 * Convertit une heure vers le format des inputs HTML
 */
export const formatTimeForInput = (date: Date | string | null): string => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    
    return format(dateObj, 'HH:mm')
  } catch (error) {
    console.error('Error formatting time for input:', error)
    return ''
  }
}