import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Loader2, Calendar, Users, MapPin, Clock } from 'lucide-react'
import { CampaignWizardData, CAMPAIGN_TYPES } from '../types'
import { getEvents } from '@/services/eventsService'
import type { EventItem } from '@/services/eventsService'

interface CampaignBasicInfoProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
  errors?: Record<string, string>
}

export function CampaignBasicInfo({ data, onChange, errors }: CampaignBasicInfoProps) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    onChange({ tags })
  }

  const handleTypeChange = (newType: string) => {
    const updates: Partial<CampaignWizardData> = { type: newType as any }
    
    // Si on change vers "event", on charge les événements
    if (newType === 'event') {
      loadEvents()
      // Initialiser les paramètres d'événement
      updates.eventIntegration = {
        eventId: '',
        eventTitle: '',
        generateQRCodes: true,
        generatePINCodes: true
      }
      // Changer automatiquement les destinataires vers les participants de l'événement
      updates.recipients = {
        ...data.recipients,
        type: 'event_participants'
      }
    } else {
      // Si on change vers un autre type, supprimer l'intégration événement
      updates.eventIntegration = undefined
      // Remettre les destinataires par défaut
      if (data.recipients.type === 'event_participants') {
        updates.recipients = {
          ...data.recipients,
          type: 'criteria'
        }
      }
    }
    
    onChange(updates)
  }

  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      const result = await getEvents({
        limit: 100
      })
      
      // Filtrer les événements futurs ou en cours
      const now = new Date()
      const activeEvents = result.items.filter((event: any) => 
        new Date(event.startTime) >= now || 
        (event.endTime && new Date(event.endTime) >= now)
      )
      
      setEvents(activeEvents)
    } catch (err) {
      console.error('Erreur lors du chargement des événements:', err)
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleEventSelection = (eventId: string) => {
    const selectedEvent = events.find(e => e.id === eventId)
    if (selectedEvent) {
      onChange({
        eventIntegration: {
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.name,
          generateQRCodes: data.eventIntegration?.generateQRCodes ?? true,
          generatePINCodes: data.eventIntegration?.generatePINCodes ?? true
        }
      })
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Campaign Details</h2>
        <p className="text-neutral-500">Start by giving your campaign a name and setting up the basics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Newsletter - December 2024"
              value={data.name}
              onChange={e => onChange({ name: e.target.value })}
              className={errors?.name ? 'border-red-500' : ''}
            />
            {errors?.name && <p className="text-sm text-red-500">{errors.name}</p>}
            <p className="text-xs text-neutral-500">Internal name to identify this campaign</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Campaign Type</Label>
            <Select
              id="type"
              value={data.type}
              onChange={e => handleTypeChange(e.target.value)}
            >
              {CAMPAIGN_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500">
              {CAMPAIGN_TYPES.find(t => t.value === data.type)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              placeholder="e.g., 🎉 Your weekly update from {{organizationName}}"
              value={data.subject}
              onChange={e => onChange({ subject: e.target.value })}
              className={errors?.subject ? 'border-red-500' : ''}
            />
            {errors?.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
            <p className="text-xs text-neutral-500">
              Use {'{{firstName}}'} or {'{{organizationName}}'} for personalization
            </p>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Preview:</p>
            <p className="text-sm">
              {data.subject.replace(/\{\{firstName\}\}/g, 'John').replace(/\{\{organizationName\}\}/g, 'Acme Inc') || 'Your subject line will appear here'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="newsletter, december, update"
              value={data.tags.join(', ')}
              onChange={e => handleTagsChange(e.target.value)}
            />
            <p className="text-xs text-neutral-500">Comma-separated tags to organize your campaigns</p>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {data.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section de sélection d'événement - Apparaît seulement si type = "event" */}
      {data.type === 'event' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Événement associé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventSelection">Sélectionner un événement *</Label>
              <div className="flex gap-2">
                <Select
                  id="eventSelection"
                  value={data.eventIntegration?.eventId || ''}
                  onChange={e => handleEventSelection(e.target.value)}
                  disabled={loadingEvents}
                  className="flex-1"
                >
                  <option value="">Choisir un événement...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {formatEventDate(event.startTime)}
                    </option>
                  ))}
                </Select>
                {loadingEvents && (
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                )}
              </div>
              {errors?.eventId && <p className="text-sm text-red-500">{errors.eventId}</p>}
            </div>

            {/* Affichage de l'événement sélectionné */}
            {data.eventIntegration?.eventId && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    {data.eventIntegration.eventTitle}
                  </h4>
                  
                  {(() => {
                    const selectedEvent = events.find(e => e.id === data.eventIntegration?.eventId)
                    if (!selectedEvent) return null
                    
                    return (
                      <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatEventDate(selectedEvent.startTime)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          {selectedEvent.attendeesCount || 0} participant{(selectedEvent.attendeesCount || 0) > 1 ? 's' : ''}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Information sur les codes d'accès */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Codes d'accès automatiques :</strong> Des QR codes et PIN codes individuels seront générés 
                automatiquement pour chaque participant selon les paramètres de validation de l'événement sélectionné.
              </p>
            </div>

            {events.length === 0 && !loadingEvents && (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500 mb-2">Aucun événement disponible</p>
                <button
                  type="button"
                  onClick={() => window.open('/app/events/create', '_blank')}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Créer un nouvel événement
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

