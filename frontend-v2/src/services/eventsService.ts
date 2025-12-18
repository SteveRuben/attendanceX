import { apiClient } from '@/services/apiClient'

export interface EventItem {
  id: string
  name: string
  startTime: string
  attendeesCount?: number
}

export interface EventPayload {
  name: string
  startTime: string
}

export interface CreateEventPayload {
  title: string
  description: string
  type: string
  startDateTime: string
  endDateTime: string
  timezone: string
  location: {
    type: 'physical' | 'virtual' | 'hybrid'
    name: string
    address?: string | {
      street: string
      city: string
      country: string
      postalCode: string
    }
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

export interface EventsList {
  items: EventItem[]
  total: number
}


export async function getEvents(params: { limit?: number; offset?: number; page?: number; status?: string } = {}): Promise<EventsList> {
  const { limit = 10, offset = 0, page: pageIn, status } = params
  const page = pageIn ?? Math.floor(offset / Math.max(1, limit)) + 1
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) qs.set('status', status)
  const data = await apiClient.get<any>(`/events?${qs.toString()}`)
  const list = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
  const items = list.map((ev: any) => ({
    id: String(ev.id ?? ev._id ?? Math.random()),
    name: ev.title || ev.name || 'Event',
    startTime: ev.startDateTime || ev.startTime || ev.date || new Date().toISOString(),
    attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? ev?.stats?.totalPresent ?? 0),
  }))
  const total = Number((data as any)?.pagination?.total ?? (data as any)?.total ?? items.length)
  return { items, total }
}

export async function getEventById(id: string): Promise<EventItem> {
  const data = await apiClient.get<any>(`/events/${id}`)
  const d = (data as any)?.data ?? data
  return {
    id: String(d?.id ?? d?._id ?? id),
    name: d?.title || d?.name || `Event ${id}`,
    startTime: d?.startDateTime || d?.startTime || d?.date || new Date().toISOString(),
    attendeesCount: Number(d?.attendeesCount ?? d?.attendanceCount ?? d?.stats?.totalPresent ?? 0),
  }
}

export function createEvent(payload: EventPayload) {
  const start = new Date(payload.startTime)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const body = {
    title: payload.name,
    type: 'meeting',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    location: { name: 'TBD' },
  }
  return apiClient.post<{ id: string }>(`/events`, body, {
    withToast: { loading: 'Creating event...', success: 'Event created' },
  })
}

export function createFullEvent(payload: CreateEventPayload) {
  // S'assurer que les dates sont au bon format
  const startDate = new Date(payload.startDateTime)
  const endDate = new Date(payload.endDateTime)
  
  // Validation des dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format provided')
  }
  
  if (startDate >= endDate) {
    throw new Error('End date must be after start date')
  }

  // Préparer la location selon le format attendu par le backend
  const location: any = {
    name: payload.location.name,
    type: payload.location.type, // IMPORTANT: inclure le type pour la validation
    instructions: undefined as string | undefined
  }

  // Gérer l'adresse selon le type d'événement
  if (payload.location.type === 'physical' || payload.location.type === 'hybrid') {
    if (typeof payload.location.address === 'string') {
      const addressStr = payload.location.address || ''
      location.address = {
        street: addressStr || 'À définir',
        city: 'À définir',
        country: 'À définir', 
        postalCode: '00000'
      }
    } else if (payload.location.address) {
      location.address = payload.location.address
    } else {
      location.address = {
        street: 'À définir',
        city: 'À définir',
        country: 'À définir',
        postalCode: '00000'
      }
    }
  }

  // Gérer l'URL virtuelle pour les événements virtuels et hybrides
  if (payload.location.type === 'virtual' || payload.location.type === 'hybrid') {
    location.virtualUrl = payload.location.virtualUrl || 'https://meet.google.com/placeholder'
  }

  // Convertir les paramètres d'attendance au format AttendanceSettings
  const attendanceSettings = {
    requireQRCode: payload.attendanceSettings.method.includes('qr_code'),
    requireGeolocation: payload.attendanceSettings.method.includes('geolocation'),
    requireBiometric: payload.attendanceSettings.method.includes('biometric'),
    lateThresholdMinutes: payload.attendanceSettings.graceMinutes || 15,
    earlyThresholdMinutes: 30,
    geofenceRadius: 100,
    allowManualMarking: payload.attendanceSettings.method.includes('manual'),
    requireValidation: payload.attendanceSettings.requireCheckIn,
    required: payload.attendanceSettings.requireCheckIn,
    allowLateCheckIn: payload.attendanceSettings.allowLateCheckIn,
    allowEarlyCheckOut: payload.attendanceSettings.requireCheckOut,
    requireApproval: false,
    autoMarkAbsent: true,
    autoMarkAbsentAfterMinutes: 60,
    allowSelfCheckIn: true,
    allowSelfCheckOut: payload.attendanceSettings.requireCheckOut,
    checkInWindow: {
      beforeMinutes: 30,
      afterMinutes: payload.attendanceSettings.graceMinutes || 15
    }
  }

  // Le backend validation schema attend ces champs spécifiques
  const body = {
    title: payload.title,
    description: payload.description || '',
    type: payload.type,
    startDate: startDate.toISOString(), // Format datetime string pour validation
    endDate: endDate.toISOString(),     // Format datetime string pour validation
    location: location,
    capacity: payload.maxParticipants,
    isPublic: !payload.isPrivate, // Inverser car le backend attend isPublic
    requiresRegistration: payload.registrationRequired,
    registrationDeadline: payload.registrationDeadline ? new Date(payload.registrationDeadline).toISOString() : undefined,
    tags: payload.tags || [],
    // Utiliser les champs attendus par le validation schema
    settings: {
      allowedMethods: payload.attendanceSettings.method,
      qrCodeSettings: {
        enabled: payload.attendanceSettings.method.includes('qr_code'),
        expiryMinutes: 60,
        singleUse: true
      },
      requireValidation: payload.attendanceSettings.requireCheckIn,
      autoMarkLate: true,
      lateThresholdMinutes: payload.attendanceSettings.graceMinutes || 15,
      allowEarlyCheckIn: payload.attendanceSettings.allowLateCheckIn,
      earlyCheckInMinutes: 30,
      sendReminders: true,
      reminderIntervals: [1440, 60, 15]
    },
    inviteParticipants: payload.participants || [],
    sendInvitations: true
  }
  
  return apiClient.post<{ id: string }>(`/events`, body, {
    withToast: { loading: 'Creating event...', success: 'Event created successfully!' },
  })
}

export function updateEvent(id: string, payload: EventPayload) {
  const body = { title: payload.name, startDate: payload.startTime }
  return apiClient.put<{ id: string }>(`/events/${id}`, body, {
    withToast: { loading: 'Saving changes...', success: 'Event updated' },
  })
}

