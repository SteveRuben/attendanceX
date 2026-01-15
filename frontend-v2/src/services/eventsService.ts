import { apiClient } from '@/services/apiClient'

export interface EventItem {
  id: string
  name: string
  startTime: string
  attendeesCount?: number
  // Ajout des champs manquants pour les détails complets
  title?: string
  description?: string
  type?: string
  endDateTime?: string
  location?: {
    type: 'physical' | 'virtual' | 'hybrid'
    name?: string
    address?: any
    virtualUrl?: string
  }
  participants?: string[]
  attendanceSettings?: any
  maxParticipants?: number
  isPrivate?: boolean
  tags?: string[]
  status?: string
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
      postalCode?: string
      province?: string
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
  const { limit = 20, offset = 0, page: pageIn, status } = params
  const page = pageIn ?? Math.floor(offset / Math.max(1, limit)) + 1
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) qs.set('status', status)
  
  try {
    const response = await apiClient.get<any>(`/api/events?${qs.toString()}`)
    
    // Gérer différents formats de réponse API
    const data = response?.data || response
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
    
    const items = list.map((ev: any) => ({
      id: String(ev.id ?? ev._id ?? Math.random()),
      name: ev.title || ev.name || 'Événement sans titre',
      title: ev.title || ev.name,
      description: ev.description,
      startTime: ev.startDateTime || ev.startTime || ev.date || new Date().toISOString(),
      attendeesCount: Number(ev.attendeesCount ?? ev.attendanceCount ?? ev?.stats?.totalPresent ?? 0),
      status: ev.status || 'draft',
      type: ev.type || 'other',
      location: ev.location,
      maxParticipants: ev.maxParticipants,
      isPrivate: ev.isPrivate || false,
      tags: ev.tags || [],
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt
    }))
    
    const total = Number(data?.pagination?.total ?? data?.total ?? items.length)
    return { items, total }
  } catch (error) {
    console.error('Error fetching events:', error)
    // Retourner une liste vide en cas d'erreur plutôt que de faire planter l'app
    return { items: [], total: 0 }
  }
}

export async function getEventById(id: string): Promise<EventItem> {
  const data = await apiClient.get<any>(`/events/${id}`)
  const d = (data as any)?.data ?? data
  
  return {
    id: String(d?.id ?? d?._id ?? id),
    name: d?.title || d?.name || `Event ${id}`,
    title: d?.title || d?.name,
    description: d?.description,
    type: d?.type,
    startTime: d?.startDateTime || d?.startTime || d?.date || new Date().toISOString(),
    endDateTime: d?.endDateTime,
    location: d?.location ? {
      type: d.location.type || 'physical',
      name: d.location.name,
      address: d.location.address,
      virtualUrl: d.location.virtualUrl
    } : undefined,
    participants: d?.participants,
    attendanceSettings: d?.attendanceSettings,
    maxParticipants: d?.maxParticipants,
    isPrivate: d?.isPrivate,
    tags: d?.tags,
    status: d?.status,
    attendeesCount: Number(d?.attendeesCount ?? d?.attendanceCount ?? d?.stats?.totalPresent ?? d?.participants?.length ?? 0),
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

export function createFromProject(projectData: any, organizationTimezone?: string) {
  // Debug: Log the project data to see what we're working with
  console.log('Creating event from project data:', projectData);
  console.log('Organization timezone:', organizationTimezone);
  
  // Generate valid future dates if project dates are missing or invalid
  const now = new Date();
  const defaultStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const defaultEndDate = new Date(defaultStartDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
  
  // Parse and validate project dates
  let startDate = defaultStartDate;
  let endDate = defaultEndDate;
  
  if (projectData.eventDetails.startDate) {
    const parsedStart = new Date(projectData.eventDetails.startDate);
    if (!isNaN(parsedStart.getTime())) {
      // If the date is in the past, move it to tomorrow at the same time
      if (parsedStart <= now) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setHours(parsedStart.getHours(), parsedStart.getMinutes(), parsedStart.getSeconds(), 0);
        startDate = tomorrow;
      } else {
        startDate = parsedStart;
      }
    }
  }
  
  if (projectData.eventDetails.endDate) {
    const parsedEnd = new Date(projectData.eventDetails.endDate);
    if (!isNaN(parsedEnd.getTime())) {
      // Ensure end date is after start date
      if (parsedEnd > startDate) {
        endDate = parsedEnd;
      } else {
        // If end date is before or equal to start date, set it 2 hours after start
        endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      }
    } else {
      // If end date is invalid, set it 2 hours after start
      endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    }
  }
  
  // Final validation: ensure dates are valid and in correct order
  if (startDate >= endDate) {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }
  
  // Ensure start date is in the future
  if (startDate <= now) {
    startDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours after start
  }
  
  // Use organization timezone as default, fallback to project timezone, then Europe/Paris
  const defaultTimezone = organizationTimezone || projectData.eventDetails.timezone || 'Europe/Paris';
  
  // Préparer les données du projet pour l'API backend
  const body = {
    id: projectData.id,
    title: projectData.title,
    description: projectData.description,
    template: projectData.template,
    eventDetails: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: defaultTimezone,
      location: {
        type: projectData.eventDetails.location.type || 'physical',
        name: projectData.eventDetails.location.name || 'À définir',
        address: projectData.eventDetails.location.address,
        virtualUrl: projectData.eventDetails.location.virtualUrl,
        room: projectData.eventDetails.location.room
      },
      capacity: projectData.eventDetails.capacity,
      requiresRegistration: projectData.eventDetails.requiresRegistration || false,
      registrationDeadline: projectData.eventDetails.registrationDeadline ? 
        new Date(projectData.eventDetails.registrationDeadline).toISOString() : 
        undefined,
      isPublic: projectData.eventDetails.isPublic !== false, // Default to true
      tags: projectData.eventDetails.tags || []
    },
    teams: projectData.teams || []
  }
  
  // Debug: Log the prepared body
  console.log('Prepared body for API:', body);
  console.log('Date validation:', {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isStartAfterNow: startDate > now,
    isEndAfterStart: endDate > startDate,
    duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60) + ' minutes',
    timezone: defaultTimezone
  });
  
  return apiClient.post<{ id: string }>(`/events/from-project`, body, {
    withToast: { loading: 'Creating event from project...', success: 'Event created automatically!' },
  })
}


export async function deleteEvent(eventId: string): Promise<void> {
  await apiClient.delete(`/api/events/${eventId}`)
}

export async function updateEvent(eventId: string, updates: Partial<CreateEventPayload>): Promise<EventItem> {
  const response = await apiClient.put<{ data: EventItem }>(`/api/events/${eventId}`, updates)
  return response.data
}
export async function createFullEvent(eventData: CreateEventPayload): Promise<EventItem> {
  const response = await apiClient.post<{ data: EventItem }>('/api/events', eventData)
  return response.data
}