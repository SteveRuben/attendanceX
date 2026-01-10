import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  label?: string
  value?: string | Date | null
  onChange?: (value: string) => void
  type?: 'date' | 'time' | 'datetime-local'
  required?: boolean
  disabled?: boolean
  className?: string
  placeholder?: string
  error?: string
  helpText?: string
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  type = 'datetime-local',
  required = false,
  disabled = false,
  className,
  placeholder,
  error,
  helpText
}) => {
  const { formatForInput, formatTimeForInput, dateFormat, timeFormat, loading } = useDateTimeFormat()

  // Convertir la valeur pour l'input HTML
  const getInputValue = () => {
    if (!value) return ''
    
    try {
      const date = typeof value === 'string' ? new Date(value) : value
      
      if (type === 'date') {
        return formatForInput(date)
      } else if (type === 'time') {
        return formatTimeForInput(date)
      } else if (type === 'datetime-local') {
        const dateStr = formatForInput(date)
        const timeStr = formatTimeForInput(date)
        return dateStr && timeStr ? `${dateStr}T${timeStr}` : ''
      }
      
      return ''
    } catch (error) {
      console.error('Error formatting input value:', error)
      return ''
    }
  }

  // Gérer le changement de valeur
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    if (!inputValue) {
      onChange?.('')
      return
    }

    try {
      let isoString = ''
      
      if (type === 'date') {
        // Pour les dates, ajouter l'heure par défaut (00:00)
        isoString = new Date(inputValue + 'T00:00:00').toISOString()
      } else if (type === 'time') {
        // Pour les heures, utiliser la date d'aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        isoString = new Date(today + 'T' + inputValue + ':00').toISOString()
      } else if (type === 'datetime-local') {
        // Pour datetime-local, convertir directement
        isoString = new Date(inputValue).toISOString()
      }
      
      onChange?.(isoString)
    } catch (error) {
      console.error('Error parsing input value:', error)
      onChange?.(inputValue) // Fallback: passer la valeur brute
    }
  }

  // Générer le placeholder basé sur le format du tenant
  const getPlaceholder = () => {
    if (placeholder) return placeholder
    
    if (type === 'date') {
      return dateFormat.toLowerCase()
    } else if (type === 'time') {
      return timeFormat.toLowerCase()
    } else if (type === 'datetime-local') {
      return `${dateFormat.toLowerCase()} ${timeFormat.toLowerCase()}`
    }
    
    return undefined
  }

  // Afficher un loader si les paramètres sont en cours de chargement
  if (loading) {
    return (
      <div className="space-y-2">
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <div className="h-10 bg-gray-100 animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={`datetime-${type}`} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Input
        id={`datetime-${type}`}
        type={type}
        value={getInputValue()}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        placeholder={getPlaceholder()}
        className={cn(
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
      />
      
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

export default DateTimePicker