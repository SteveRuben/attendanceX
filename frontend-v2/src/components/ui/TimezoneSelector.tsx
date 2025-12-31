import React, { useState, useMemo } from 'react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Search, MapPin, Globe, Building } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimezoneOption {
  value: string
  label: string
  offset: string
  region: string
  city: string
}

interface TimezoneSelectorProps {
  value: string
  onChange: (timezone: string) => void
  label?: string
  className?: string
  showCurrentTime?: boolean
  organizationTimezone?: string // Timezone de l'organisation
}

// Liste des timezones les plus courantes
const COMMON_TIMEZONES: TimezoneOption[] = [
  // Europe
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Paris' },
  { value: 'Europe/London', label: 'Londres (GMT/BST)', offset: '+00:00', region: 'Europe', city: 'Londres' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Berlin' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Madrid' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Rome' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Amsterdam' },
  { value: 'Europe/Brussels', label: 'Bruxelles (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Bruxelles' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', offset: '+01:00', region: 'Europe', city: 'Zurich' },
  
  // Amérique du Nord
  { value: 'America/New_York', label: 'New York (EST/EDT)', offset: '-05:00', region: 'Amérique', city: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: '-08:00', region: 'Amérique', city: 'Los Angeles' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: '-06:00', region: 'Amérique', city: 'Chicago' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)', offset: '-05:00', region: 'Amérique', city: 'Toronto' },
  { value: 'America/Montreal', label: 'Montréal (EST/EDT)', offset: '-05:00', region: 'Amérique', city: 'Montréal' },
  
  // Asie
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', region: 'Asie', city: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00', region: 'Asie', city: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapour (SGT)', offset: '+08:00', region: 'Asie', city: 'Singapour' },
  { value: 'Asia/Dubai', label: 'Dubaï (GST)', offset: '+04:00', region: 'Asie', city: 'Dubaï' },
  
  // Océanie
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00', region: 'Océanie', city: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00', region: 'Océanie', city: 'Auckland' },
  
  // UTC
  { value: 'UTC', label: 'UTC (Temps Universel)', offset: '+00:00', region: 'UTC', city: 'UTC' },
]

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  label = "Fuseau horaire",
  className,
  showCurrentTime = true,
  organizationTimezone
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Filtrer les timezones selon la recherche
  const filteredTimezones = useMemo(() => {
    if (!searchTerm) return COMMON_TIMEZONES
    
    const term = searchTerm.toLowerCase()
    return COMMON_TIMEZONES.filter(tz => 
      tz.label.toLowerCase().includes(term) ||
      tz.city.toLowerCase().includes(term) ||
      tz.region.toLowerCase().includes(term) ||
      tz.value.toLowerCase().includes(term)
    )
  }, [searchTerm])

  // Obtenir la timezone sélectionnée
  const selectedTimezone = COMMON_TIMEZONES.find(tz => tz.value === value)
  
  // Obtenir la timezone de l'organisation
  const orgTimezone = organizationTimezone ? COMMON_TIMEZONES.find(tz => tz.value === organizationTimezone) : null

  // Obtenir l'heure actuelle dans la timezone sélectionnée
  const getCurrentTime = (timezone: string) => {
    try {
      return new Date().toLocaleTimeString('fr-FR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      return 'N/A'
    }
  }

  // Utiliser la timezone de l'organisation
  const useOrganizationTimezone = () => {
    if (organizationTimezone) {
      onChange(organizationTimezone)
    }
  }

  // Détecter la timezone du navigateur
  const detectBrowserTimezone = () => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const found = COMMON_TIMEZONES.find(tz => tz.value === browserTz)
      if (found) {
        onChange(browserTz)
      }
    } catch (error) {
      console.warn('Could not detect browser timezone')
    }
  }

  // Grouper les timezones par région
  const timezonesByRegion = useMemo(() => {
    const grouped: Record<string, TimezoneOption[]> = {}
    filteredTimezones.forEach(tz => {
      if (!grouped[tz.region]) {
        grouped[tz.region] = []
      }
      grouped[tz.region].push(tz)
    })
    return grouped
  }, [filteredTimezones])

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        {label}
      </Label>

      {/* Timezone actuelle */}
      {selectedTimezone && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedTimezone.city}</p>
                <p className="text-sm text-gray-600">{selectedTimezone.label}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">UTC {selectedTimezone.offset}</p>
                {showCurrentTime && (
                  <p className="font-mono text-lg font-bold">
                    {getCurrentTime(selectedTimezone.value)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <div className="flex gap-2">
        {/* Bouton timezone organisation */}
        {orgTimezone && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useOrganizationTimezone}
            className="flex-1"
          >
            <Building className="h-4 w-4 mr-2" />
            Organisation ({orgTimezone.city})
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectBrowserTimezone}
          className={orgTimezone ? "flex-1" : "flex-1"}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Détecter automatiquement
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Recherche */}
      {showSearch && (
        <div className="space-y-2">
          <Input
            placeholder="Rechercher une ville ou région..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Sélection par région */}
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {Object.entries(timezonesByRegion).map(([region, timezones]) => (
          <div key={region}>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="h-3 w-3" />
              {region}
            </h4>
            <div className="grid gap-1">
              {timezones.map((timezone) => (
                <button
                  key={timezone.value}
                  type="button"
                  onClick={() => onChange(timezone.value)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors hover:bg-gray-50",
                    value === timezone.value 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{timezone.city}</p>
                      <p className="text-xs text-gray-600">{timezone.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">UTC {timezone.offset}</p>
                      {showCurrentTime && (
                        <p className="text-xs font-mono">
                          {getCurrentTime(timezone.value)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Timezones populaires */}
      {!searchTerm && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Timezones populaires
          </h4>
          <div className="flex flex-wrap gap-2">
            {['Europe/Paris', 'America/New_York', 'Asia/Tokyo', 'UTC'].map((tz) => {
              const timezone = COMMON_TIMEZONES.find(t => t.value === tz)
              if (!timezone) return null
              
              return (
                <Button
                  key={tz}
                  type="button"
                  variant={value === tz ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(tz)}
                >
                  {timezone.city}
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimezoneSelector