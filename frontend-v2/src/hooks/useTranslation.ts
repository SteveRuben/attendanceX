import { useTranslation as useNextTranslation } from 'next-i18next'
import { useRouter } from 'next/router'

export function useTranslation(namespace?: string | string[]) {
  const { t, i18n } = useNextTranslation(namespace)
  const router = useRouter()

  const changeLanguage = async (locale: string) => {
    await router.push(router.asPath, router.asPath, { locale })
  }

  const getCurrentLanguage = () => {
    return i18n.language || router.locale || 'en'
  }

  const getAvailableLanguages = () => {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    ]
  }

  const formatMessage = (key: string, values?: Record<string, any>) => {
    return t(key, values)
  }

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    formatMessage,
    currentLocale: getCurrentLanguage(),
    isRTL: false, // Add RTL support later if needed
  }
}

// Convenience hooks for specific namespaces
export function useCommonTranslation() {
  return useTranslation('common')
}

export function useAuthTranslation() {
  return useTranslation('auth')
}

// Type-safe translation function
export function useTypedTranslation<T extends Record<string, any>>(namespace: string) {
  const { t, ...rest } = useTranslation(namespace)
  
  return {
    ...rest,
    t: (key: keyof T, options?: any) => t(key as string, options),
  }
}