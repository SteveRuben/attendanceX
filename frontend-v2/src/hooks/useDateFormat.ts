import { useTranslation } from '@/hooks/useTranslation'
import { 
  formatDate, 
  formatDateTime, 
  formatDateOnly, 
  formatTimeOnly, 
  formatRelativeTime 
} from '@/utils/dateLocalization'

export function useDateFormat() {
  const { currentLocale } = useTranslation()

  return {
    formatDate: (date: Date | string, formatStr: string) => 
      formatDate(date, formatStr, currentLocale),
    
    formatDateTime: (date: Date | string) => 
      formatDateTime(date, currentLocale),
    
    formatDateOnly: (date: Date | string) => 
      formatDateOnly(date, currentLocale),
    
    formatTimeOnly: (date: Date | string) => 
      formatTimeOnly(date, currentLocale),
    
    formatRelativeTime: (date: Date | string) => 
      formatRelativeTime(date, currentLocale),
    
    currentLocale,
  }
}