import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CalendarDays, MapPin, Users, Settings, Clock, Tag, Edit3, Eye, Save, X, CheckSquare, Send } from 'lucide-react'
import { getEventById, updateEvent, type EventItem } from '@/services/eventsService'
import ResolutionList from '@/components/resolutions/ResolutionList'
import ResolutionForm from '@/components/resolutions/ResolutionForm'
import ResolutionDetail from '@/components/resolutions/ResolutionDetail'
import { Resolution, CreateResolutionRequest } from '@/types/resolution.types'
import { useResolutions } from '@/hooks/useResolutions'
import { CreateCampaignButton } from '@/components/events/CreateCampaignButton'

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

export default function EventDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const eventId = typeof id === 'string' ? id : ''
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [item, setItem] = useState<EventItem | null>(null)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: 'meeting',
    startDateTime: '',
    duration: 60,
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

  // Calculate duration from start and end dates
  const calculateDuration = (startDateTime: string, endDateTime: string): number => {
    if (!startDateTime || !endDateTime) return 60
    const start = new Date(startDateTime)
    const end = new Date(endDateTime)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
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

  useEffect(() => {
    if (!eventId) return
    let mounted = true
    ;(async () => {
      try {
        const data = await getEventById(eventId)
        if (mounted) {
          setItem(data)
          // Convert event data to form data (mock conversion for now)
          // In a real app, you'd fetch full event details from API
          const duration = calculateDuration(data.startTime, data.startTime) // Mock: assume 1 hour
          setFormData({
            title: data.name,
            description: 'Event description', // Mock
            type: 'meeting', // Mock
            startDateTime: new Date(data.startTime).toISOString().slice(0, 16),
            duration: 60, // Mock: 1 hour
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: {
              type: 'physical',
              name: 'Event location',
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
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [eventId])

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

  const handleSave = async () => {
    setSaving(true)
    try {
      // Calculate end date from duration
      const startDate = new Date(formData.startDateTime)
      const endDate = new Date(startDate.getTime() + formData.duration * 60 * 1000)
      
      // Mock update - in real app, use proper update API
      await updateEvent(eventId, {
        name: formData.title,
        startTime: startDate.toISOString()
      })
      
      // Update local state
      setItem(prev => prev ? {
        ...prev,
        name: formData.title,
        startTime: startDate.toISOString()
      } : null)
      
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form data to original values
    if (item) {
      setFormData(prev => ({
        ...prev,
        title: item.name,
        startDateTime: new Date(item.startTime).toISOString().slice(0, 16)
      }))
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

  if (loading) {
    return (
      <AppShell title="Loading...">
        <div className="p-6">
          <div className="text-center">Loading event details...</div>
        </div>
      </AppShell>
    )
  }

  if (!item) {
    return (
      <AppShell title="Event Not Found">
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">Event Not Found</h1>
            <Button onClick={() => router.push('/app/events')}>Back to Events</Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={item.name}>
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-semibold">{item.name}</h1>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <CreateCampaignButton
                    eventId={eventId}
                    eventTitle={item.name}
                    participantCount={item.participants?.length || 0}
                    onCampaignCreated={(campaignId) => {
                      console.log('Campaign created:', campaignId);
                      // TODO: Afficher une notification de succès
                    }}
                  />
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => router.push(`/app/attendance/mark/${eventId}`)}>
                    <Users className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push(`/app/events/${eventId}/resolutions`)}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Résolutions
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mode indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isEditing ? (
              <>
                <Edit3 className="w-4 h-4" />
                Editing mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                View mode
              </>
            )}
          </div>

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={e => updateFormData('description', e.target.value)}
                      placeholder="Describe your event"
                      rows={3}
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
                </CardContent>
              </Card>

              {/* Date & Time */}
              <Card>
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
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
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
                      onChange={e => updateNestedFormData('location', 'type', e.target.value)}
                    >
                      <option value="physical">Physical</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
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
                    <div>
                      <Label htmlFor="virtualUrl">Virtual Meeting URL</Label>
                      <Input
                        id="virtualUrl"
                        value={formData.location.virtualUrl || ''}
                        onChange={e => updateNestedFormData('location', 'virtualUrl', e.target.value)}
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendance Settings */}
              <Card>
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
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-6">
              {/* Event Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Event Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Title</span>
                        <p className="text-lg font-semibold">{item.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Start Time</span>
                        <p>{new Date(item.startTime).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Duration</span>
                        <p>{formatDuration(formData.duration)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">End Time</span>
                        <p>{new Date(calculateEndDateTime(item.startTime, formData.duration)).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Attendees</span>
                        <p>{item.attendeesCount ?? 0} registered</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Type</span>
                        <p className="capitalize">{formData.type}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Type</span>
                      <p className="capitalize">{formData.location.type}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Name</span>
                      <p>{formData.location.name || 'Not specified'}</p>
                    </div>
                    {formData.location.address && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Address</span>
                        <p>{formData.location.address}</p>
                      </div>
                    )}
                    {formData.location.virtualUrl && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Virtual URL</span>
                        <p className="text-blue-600 hover:underline">
                          <a href={formData.location.virtualUrl} target="_blank" rel="noopener noreferrer">
                            {formData.location.virtualUrl}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Attendance Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Methods</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {formData.attendanceSettings.method.map(method => (
                          <span
                            key={method}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {attendanceMethods.find(m => m.value === method)?.label || method}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Check-in Required</span>
                        <p>{formData.attendanceSettings.requireCheckIn ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Check-out Required</span>
                        <p>{formData.attendanceSettings.requireCheckOut ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Late Check-in</span>
                        <p>{formData.attendanceSettings.allowLateCheckIn ? 'Allowed' : 'Not allowed'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Grace Period</span>
                        <p>{formData.attendanceSettings.graceMinutes} minutes</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

