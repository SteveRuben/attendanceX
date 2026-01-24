import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { enUS, fr, es, de } from 'date-fns/locale'

const locales = {
  en: enUS,
  fr: fr,
  es: es,
  de: de,
}

export function getDateFnsLocale(locale: string) {
  return locales[locale as keyof typeof locales] || enUS
}

export function formatDate(date: Date | string, formatStr: string, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: getDateFnsLocale(locale) })
}

export function formatRelativeTime(date: Date | string, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(dateObj, { 
    addSuffix: true, 
    locale: getDateFnsLocale(locale) 
  })
}

export function formatDateTime(date: Date | string, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  const formatMap = {
    en: 'MMM dd, yyyy HH:mm',
    fr: 'dd MMM yyyy HH:mm',
    es: 'dd MMM yyyy HH:mm',
    de: 'dd. MMM yyyy HH:mm',
  }
  
  return formatDate(dateObj, formatMap[locale as keyof typeof formatMap] || formatMap.en, locale)
}

export function formatDateOnly(date: Date | string, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  const formatMap = {
    en: 'MMM dd, yyyy',
    fr: 'dd MMM yyyy',
    es: 'dd MMM yyyy',
    de: 'dd. MMM yyyy',
  }
  
  return formatDate(dateObj, formatMap[locale as keyof typeof formatMap] || formatMap.en, locale)
}

export function formatTimeOnly(date: Date | string, locale: string = 'en') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  const formatMap = {
    en: 'h:mm a',
    fr: 'HH:mm',
    es: 'HH:mm',
    de: 'HH:mm',
  }
  
  return formatDate(dateObj, formatMap[locale as keyof typeof formatMap] || formatMap.en, locale)
}