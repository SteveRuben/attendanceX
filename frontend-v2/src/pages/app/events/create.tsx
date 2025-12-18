import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
// import { Textarea } from '@/components/ui/textarea'
// import { Checkbox } from '@/components/ui/checkbox'
// import { Switch } from '@/components/ui/switch'
import { CalendarDays, MapPin, Users, Settings, Clock, Tag, Link, Zap } from 'lucide-react'
import { createFullEvent } from '@/services/eventsService'
import { getCompatibleProviders, generateMeetingLink, type CompatibleProvidersResponse } from '@/services/integrationsService'

// Simple Switch component
const SimpleSwitch = ({ id, checked, onCheckedChange, className = '' }: {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-300'
    } ${className}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
)

// Simple Checkbox component
const SimpleCheckbox = ({ id, checked, onCheckedChange, className = '' }: {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
  />
)

interface EventFormData {
  title: string
  description: string
  type: string
  startDateTime: string
  duration: number // Duration in minutes
  timezone: string
  location: {
    type: 'physical' | 'virtual' | 'hybrid'
    name: string
    address?: string
    virtualUrl?: string
  }
  participants: string[]
  attendanceSettings: {
    method: string[]
    requireCheckIn: boolean
    requireCheckOut: boolean
    allowLateCheckIn: boolean
    graceMinutes: number
  }
  maxParticipants?: number
  registrationRequired: boolean
  registrationDeadline?: string
  tags: string[]
  category: string
  isPrivate: boolean
  priority: string
}

export default function CreateEventPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [compatibleProviders, setCompatibleProviders] = useState<CompatibleProvidersResponse>({ hasIntegrations: false, availableProviders: [] })
  const [generatingLink, setGeneratingLink] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: 'meeting',
    startDateTime: '',
    duration: 60, // Default 1 hour
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: {
      type: 'physical',
      name: '',
      address: ''
    },
    participants: [],
    attendanceSettings: {
      method: ['manual'],
      requireCheckIn: true,
      requireCheckOut: false,
      allowLateCheckIn: true,
      graceMinutes: 15
    },
    registrationRequired: false,
    tags: [],
    category: '',
    isPrivate: false,
    priority: 'medium'
  })

  const eventTypes = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'training', label: 'Training' },
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'other', label: 'Other' }
  ]

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ]

  const attendanceMethods = [
    { value: 'manual', label: 'Manual Check-in' },
    { value: 'qr_code', label: 'QR Code' },
    { value: 'geolocation', label: 'Geolocation' },
    { value: 'biometric', label: 'Biometric' }
  ]

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedFormData = (parent: keyof EventFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }))
  }

  // Charger les intégrations compatibles au montage du composant
  useEffect(() => {
    const loadCompatibleProviders = async () => {
      try {
        const providers = await getCompatibleProviders()
        setCompatibleProviders(providers)
      } catch (error) {
        console.error('Error loading compatible providers:', error)
      }
    }
    loadCompatibleProviders()
  }, [])

  // Générer automatiquement un lien de réunion
  const handleGenerateMeetingLink = async () => {
    if (!formData.title || !formData.startDateTime || !formData.duration) {
      alert('Veuillez remplir le titre, la date de début et la durée avant de générer un lien de réunion.')
      return
    }

    // Vérifier d'abord si des intégrations sont disponibles
    if (!compatibleProviders.hasIntegrations) {
      alert('Aucune intégration configurée. Configurez l\'un de vos connecteurs (Google, Teams, Zoom, Slack) dans les paramètres pour générer automatiquement des liens de réunion.')
      return
    }

    setGeneratingLink(true)
    try {
      const endDateTime = calculateEndDateTime(formData.startDateTime, formData.duration)
      const meetingLink = await generateMeetingLink({
        eventTitle: formData.title,
        startDateTime: formData.startDateTime,
        endDateTime: endDateTime,
        description: formData.description,
        attendees: formData.participants
      })

      if (meetingLink) {
        updateNestedFormData('location', 'virtualUrl', meetingLink.meetingUrl)
        // Afficher une notification de succès avec le provider utilisé
        alert(`Lien de réunion généré avec succès via ${meetingLink.provider}!`)
        console.log('Lien de réunion généré:', meetingLink)
      } else {
        alert('Impossible de générer un lien de réunion. Vérifiez que vos intégrations sont correctement configurées et connectées.')
      }
    } catch (error) {
      console.error('Error generating meeting link:', error)
      alert('Erreur lors de la génération du lien de réunion. Vérifiez vos intégrations.')
    } finally {
      setGeneratingLink(false)
    }
  }

  // Calculate end date based on start date and duration
  const calculateEndDateTime = (startDateTime: string, durationMinutes: number): string => {
    if (!startDateTime) return ''
    const startDate = new Date(startDateTime)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
    return endDate.toISOString()
  }

  // Get formatted duration display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation et scroll vers le premier champ manquant
    if (!formData.title) {
      document.getElementById('title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById('title')?.focus()
      return
    }
    if (!formData.startDateTime) {
      document.getElementById('startDateTime')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById('startDateTime')?.focus()
      return
    }
    if (!formData.duration || formData.duration <= 0) {
      document.getElementById('duration')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById('duration')?.focus()
      return
    }
    
    setSubmitting(true)
    try {
      // Préparer les données pour l'API
      const startDate = new Date(formData.startDateTime)
      const endDate = new Date(startDate.getTime() + formData.duration * 60 * 1000)
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        timezone: formData.timezone,
        location: formData.location,
        participants: formData.participants,
        attendanceSettings: formData.attendanceSettings,
        maxParticipants: formData.maxParticipants,
        registrationRequired: formData.registrationRequired,
        registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : undefined,
        tags: formData.tags,
        category: formData.category,
        isPrivate: formData.isPrivate,
        priority: formData.priority
      }

      const res = await createFullEvent(eventData)
      const newId = (res as any)?.id
      if (newId) router.replace(`/app/events/${newId}`)
      else router.replace('/app/events')
    } finally {
      setSubmitting(false)
    }
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      updateFormData('tags', [...formData.tags, tag])
    }
  }

  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <AppShell title="Create Event">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
        <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-semibold">Create New Event</h1>
          </div>
          
          {/* Progress indicator */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (
                  (formData.title ? 20 : 0) +
                  (formData.description ? 20 : 0) +
                  (formData.startDateTime && formData.duration > 0 ? 20 : 0) +
                  (formData.location.name ? 20 : 0) +
                  (formData.attendanceSettings.method.length > 0 ? 20 : 0)
                ))}%` 
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <button 
              type="button" 
              onClick={() => document.getElementById('basic-info')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Basic Info
            </button>
            <button 
              type="button" 
              onClick={() => document.getElementById('date-time')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Date & Time
            </button>
            <button 
              type="button" 
              onClick={() => document.getElementById('location')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Location
            </button>
            <button 
              type="button" 
              onClick={() => document.getElementById('attendance')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Attendance
            </button>
            <button 
              type="button" 
              onClick={() => document.getElementById('additional')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Additional
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card id="basic-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => updateFormData('title', e.target.value)}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={e => updateFormData('description', e.target.value)}
                  placeholder="Describe your event"
                  rows={3}
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Event Type</Label>
                  <Select
                    id="type"
                    value={formData.type}
                    onChange={e => updateFormData('type', e.target.value)}
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={formData.priority}
                    onChange={e => updateFormData('priority', e.target.value)}
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={e => updateFormData('category', e.target.value)}
                  placeholder="e.g., Team Meeting, Training Session"
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card id="date-time">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDateTime">Start Date & Time *</Label>
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={e => updateFormData('startDateTime', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration *</Label>
                  <div className="space-y-2">
                    <Select
                      id="duration"
                      value={formData.duration.toString()}
                      onChange={e => updateFormData('duration', parseInt(e.target.value))}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="90">1.5 hours</option>
                      <option value="120">2 hours</option>
                      <option value="150">2.5 hours</option>
                      <option value="180">3 hours</option>
                      <option value="240">4 hours</option>
                      <option value="300">5 hours</option>
                      <option value="360">6 hours</option>
                      <option value="480">8 hours</option>
                    </Select>
                    <Input
                      type="number"
                      min="5"
                      max="1440"
                      value={formData.duration}
                      onChange={e => updateFormData('duration', parseInt(e.target.value) || 60)}
                      placeholder="Custom duration in minutes"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Show calculated end time */}
              {formData.startDateTime && formData.duration > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>End Time:</strong> {new Date(calculateEndDateTime(formData.startDateTime, formData.duration)).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Duration: {formatDuration(formData.duration)}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={e => updateFormData('timezone', e.target.value)}
                  placeholder="e.g., Europe/Paris"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card id="location">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="locationType">Location Type</Label>
                <Select
                  id="locationType"
                  value={formData.location.type}
                  onChange={e => {
                    const newType = e.target.value as 'physical' | 'virtual' | 'hybrid'
                    updateNestedFormData('location', 'type', newType)
                    
                    // Auto-générer un lien si on passe en virtuel/hybride et qu'on a des intégrations
                    if ((newType === 'virtual' || newType === 'hybrid') && 
                        compatibleProviders.hasIntegrations && 
                        formData.title && 
                        formData.startDateTime && 
                        formData.duration > 0 &&
                        !formData.location.virtualUrl) {
                      // Générer automatiquement le lien avec un petit délai
                      setTimeout(() => handleGenerateMeetingLink(), 100)
                    }
                    
                    // Nettoyer l'URL virtuelle si on passe en physique
                    if (newType === 'physical') {
                      updateNestedFormData('location', 'virtualUrl', '')
                    }
                  }}
                >
                  <option value="physical">Présentiel</option>
                  <option value="virtual">Virtuel</option>
                  <option value="hybrid">Hybride</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={formData.location.name}
                  onChange={e => updateNestedFormData('location', 'name', e.target.value)}
                  placeholder="e.g., Conference Room A, Zoom Meeting"
                />
              </div>

              {formData.location.type === 'physical' && (
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.location.address || ''}
                    onChange={e => updateNestedFormData('location', 'address', e.target.value)}
                    placeholder="Enter physical address"
                  />
                </div>
              )}

              {(formData.location.type === 'virtual' || formData.location.type === 'hybrid') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="virtualUrl">Virtual Meeting URL</Label>
                    {compatibleProviders.hasIntegrations && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateMeetingLink}
                        disabled={generatingLink || !formData.title || !formData.startDateTime}
                        className="flex items-center gap-2"
                      >
                        {generatingLink ? (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Générer automatiquement
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <Input
                    id="virtualUrl"
                    value={formData.location.virtualUrl || ''}
                    onChange={e => updateNestedFormData('location', 'virtualUrl', e.target.value)}
                    placeholder={compatibleProviders.hasIntegrations 
                      ? "Cliquez sur 'Générer automatiquement' ou saisissez manuellement" 
                      : "https://zoom.us/j/... ou https://meet.google.com/..."
                    }
                  />
                  
                  {compatibleProviders.hasIntegrations && (
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Intégrations disponibles : {compatibleProviders.availableProviders.join(', ')}
                    </div>
                  )}
                  
                  {!compatibleProviders.hasIntegrations && (
                    <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configurez l'un de vos connecteurs (Google, Teams, Zoom, Slack) pour générer automatiquement des liens de réunion
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Settings */}
          <Card id="attendance">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Attendance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Attendance Methods</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {attendanceMethods.map(method => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <SimpleCheckbox
                        id={method.value}
                        checked={formData.attendanceSettings.method.includes(method.value)}
                        onCheckedChange={checked => {
                          const methods = formData.attendanceSettings.method
                          if (checked) {
                            updateNestedFormData('attendanceSettings', 'method', [...methods, method.value])
                          } else {
                            updateNestedFormData('attendanceSettings', 'method', methods.filter(m => m !== method.value))
                          }
                        }}
                      />
                      <Label htmlFor={method.value} className="text-sm">{method.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    id="requireCheckIn"
                    checked={formData.attendanceSettings.requireCheckIn}
                    onCheckedChange={checked => updateNestedFormData('attendanceSettings', 'requireCheckIn', checked)}
                  />
                  <Label htmlFor="requireCheckIn">Require Check-in</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    id="requireCheckOut"
                    checked={formData.attendanceSettings.requireCheckOut}
                    onCheckedChange={checked => updateNestedFormData('attendanceSettings', 'requireCheckOut', checked)}
                  />
                  <Label htmlFor="requireCheckOut">Require Check-out</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    id="allowLateCheckIn"
                    checked={formData.attendanceSettings.allowLateCheckIn}
                    onCheckedChange={checked => updateNestedFormData('attendanceSettings', 'allowLateCheckIn', checked)}
                  />
                  <Label htmlFor="allowLateCheckIn">Allow Late Check-in</Label>
                </div>

                <div>
                  <Label htmlFor="graceMinutes">Grace Period (minutes)</Label>
                  <Input
                    id="graceMinutes"
                    type="number"
                    min="0"
                    max="60"
                    value={formData.attendanceSettings.graceMinutes}
                    onChange={e => updateNestedFormData('attendanceSettings', 'graceMinutes', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card id="additional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Additional Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxParticipants">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    value={formData.maxParticipants || ''}
                    onChange={e => updateFormData('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No limit"
                  />
                </div>

                <div>
                  <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                  <Input
                    id="registrationDeadline"
                    type="datetime-local"
                    value={formData.registrationDeadline || ''}
                    onChange={e => updateFormData('registrationDeadline', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    id="registrationRequired"
                    checked={formData.registrationRequired}
                    onCheckedChange={checked => updateFormData('registrationRequired', checked)}
                  />
                  <Label htmlFor="registrationRequired">Registration Required</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onCheckedChange={checked => updateFormData('isPrivate', checked)}
                  />
                  <Label htmlFor="isPrivate">Private Event</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Add tags (press Enter)"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !formData.title || !formData.startDateTime || !formData.duration || formData.duration <= 0}
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </AppShell>
  )
}

