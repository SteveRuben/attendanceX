import { apiClient } from '@/services/apiClient'

export type CheckInMethod = 'qr_code' | 'pin_code' | 'manual' | 'geofencing'

export interface GenerateQrResponse {
  qrCodeId: string
  url?: string
  imageBase64?: string
  expiresAt?: string
  token?: string
}

export interface CheckInConfig {
  eventId: string
  methods: {
    qrCode: {
      enabled: boolean
      expirationHours?: number
      allowMultipleScans?: boolean
    }
    pinCode: {
      enabled: boolean
      codeLength?: number
      expirationMinutes?: number
    }
    manual: {
      enabled: boolean
      requiresApproval?: boolean
    }
    geofencing: {
      enabled: boolean
      latitude?: number
      longitude?: number
      radiusMeters?: number
    }
  }
  notifications: {
    sendQrByEmail?: boolean
    sendQrBySms?: boolean
    sendReminder?: boolean
    reminderHoursBefore?: number
  }
}

export interface CheckInRecord {
  id: string
  eventId: string
  userId: string
  userName: string
  method: CheckInMethod
  timestamp: string
  location?: {
    latitude: number
    longitude: number
  }
  status: 'checked_in' | 'checked_out' | 'late' | 'early'
}

export interface CheckInStats {
  total: number
  checkedIn: number
  pending: number
  late: number
  onTime: number
  checkInRate: number
}

/**
 * Générer un QR code pour un événement
 */
export async function generateQrCode(payload: { 
  eventId: string
  userId?: string
  type?: 'event' | 'participant'
  expiresAt?: string
  options?: { size?: number; format?: 'png' | 'svg' } 
}): Promise<GenerateQrResponse> {
  try {
    const data = await apiClient.post<any>('/qr-codes/generate', { 
      type: 'check_in',
      ...payload 
    }, { withAuth: true })
    
    const d = (data?.data ?? data) as any
    const id = d?.qrCodeId ?? d?.id
    if (!id) throw new Error('Invalid QR code response')
    
    return {
      qrCodeId: String(id),
      url: d?.url,
      imageBase64: d?.imageBase64,
      expiresAt: d?.expiresAt,
      token: d?.token
    }
  } catch (e) {
    console.error('Error generating QR code:', e)
    throw e
  }
}

/**
 * Valider un QR code
 */
export async function validateQrCode(payload: { 
  qrCodeId: string
  userId?: string
  location?: { latitude: number; longitude: number } 
}): Promise<{ 
  valid: boolean
  message?: string
  checkIn?: CheckInRecord 
}> {
  try {
    const data = await apiClient.post<any>('/qr-codes/validate', payload, { withAuth: true })
    const valid = (data as any)?.valid ?? (data as any)?.success ?? false
    
    return { 
      valid: Boolean(valid), 
      message: (data as any)?.message,
      checkIn: (data as any)?.checkIn
    }
  } catch (e) {
    console.error('Error validating QR code:', e)
    throw e
  }
}

/**
 * Générer un code PIN pour un participant
 */
export async function generatePinCode(payload: {
  eventId: string
  userId: string
  expiresAt?: string
}): Promise<{
  pinCode: string
  expiresAt: string
}> {
  try {
    const data = await apiClient.post<any>('/tenants/current/check-in/generate-pin', payload, { 
      withAuth: true,
      withToast: { loading: 'Generating PIN...', success: 'PIN generated successfully' }
    })
    
    return {
      pinCode: (data?.data ?? data)?.pinCode,
      expiresAt: (data?.data ?? data)?.expiresAt
    }
  } catch (e) {
    console.error('Error generating PIN code:', e)
    throw e
  }
}

/**
 * Valider un code PIN
 */
export async function validatePinCode(payload: {
  eventId: string
  pinCode: string
  userId?: string
}): Promise<{
  valid: boolean
  message?: string
  checkIn?: CheckInRecord
}> {
  try {
    const data = await apiClient.post<any>('/tenants/current/check-in/validate-pin', payload, { withAuth: true })
    
    return {
      valid: (data?.data ?? data)?.valid ?? false,
      message: (data?.data ?? data)?.message,
      checkIn: (data?.data ?? data)?.checkIn
    }
  } catch (e) {
    console.error('Error validating PIN code:', e)
    throw e
  }
}

/**
 * Check-in standard via l'API attendance
 */
export async function checkIn(payload: {
  eventId: string
  method?: CheckInMethod
  location?: { latitude: number; longitude: number }
  notes?: string
  qrCodeId?: string
  pinCode?: string
}): Promise<CheckInRecord> {
  try {
    const data = await apiClient.post<any>('/attendances/check-in', {
      eventId: payload.eventId,
      method: payload.method || 'manual',
      location: payload.location,
      notes: payload.notes,
      qrCodeId: payload.qrCodeId,
      pinCode: payload.pinCode
    }, { 
      withAuth: true,
      withToast: { loading: 'Checking in...', success: 'Check-in successful' }
    })
    
    return (data?.data ?? data) as CheckInRecord
  } catch (e) {
    console.error('Error check-in:', e)
    throw e
  }
}

/**
 * Check-in manuel par l'organisateur
 */
export async function manualCheckIn(payload: {
  eventId: string
  userId: string
  notes?: string
}): Promise<CheckInRecord> {
  try {
    const data = await apiClient.post<any>('/tenants/current/check-in/manual', payload, { 
      withAuth: true,
      withToast: { loading: 'Checking in...', success: 'Check-in successful' }
    })
    
    return (data?.data ?? data) as CheckInRecord
  } catch (e) {
    console.error('Error manual check-in:', e)
    throw e
  }
}

/**
 * Récupérer la configuration de check-in d'un événement
 */
export async function getCheckInConfig(eventId: string): Promise<CheckInConfig> {
  try {
    const data = await apiClient.get<any>(`/tenants/current/check-in/config/${eventId}`, { withAuth: true })
    return (data?.data ?? data) as CheckInConfig
  } catch (e) {
    console.error('Error getting check-in config:', e)
    throw e
  }
}

/**
 * Mettre à jour la configuration de check-in
 */
export async function updateCheckInConfig(eventId: string, config: Partial<CheckInConfig>): Promise<CheckInConfig> {
  try {
    const data = await apiClient.put<any>(`/tenants/current/check-in/config/${eventId}`, config, { 
      withAuth: true,
      withToast: { loading: 'Updating config...', success: 'Configuration updated' }
    })
    
    return (data?.data ?? data) as CheckInConfig
  } catch (e) {
    console.error('Error updating check-in config:', e)
    throw e
  }
}

/**
 * Récupérer les enregistrements de check-in d'un événement
 */
export async function getCheckInRecords(eventId: string, filters?: {
  status?: string
  method?: CheckInMethod
  startDate?: string
  endDate?: string
}): Promise<CheckInRecord[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.method) params.set('method', filters.method)
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    
    const data = await apiClient.get<any>(`/tenants/current/check-in/records/${eventId}?${params.toString()}`, { withAuth: true })
    return (data?.data ?? data) as CheckInRecord[]
  } catch (e) {
    console.error('Error getting check-in records:', e)
    throw e
  }
}

/**
 * Récupérer les statistiques de check-in
 */
export async function getCheckInStats(eventId: string): Promise<CheckInStats> {
  try {
    const data = await apiClient.get<any>(`/tenants/current/check-in/stats/${eventId}`, { withAuth: true })
    return (data?.data ?? data) as CheckInStats
  } catch (e) {
    console.error('Error getting check-in stats:', e)
    throw e
  }
}

/**
 * Envoyer les QR codes aux participants
 */
export async function sendQrCodesToParticipants(eventId: string, options?: {
  sendEmail?: boolean
  sendSms?: boolean
  userIds?: string[]
}): Promise<{
  sent: number
  failed: number
  errors?: string[]
}> {
  try {
    const data = await apiClient.post<any>(`/tenants/current/check-in/send-qr-codes/${eventId}`, options, { 
      withAuth: true,
      withToast: { loading: 'Sending QR codes...', success: 'QR codes sent successfully' }
    })
    
    return (data?.data ?? data)
  } catch (e) {
    console.error('Error sending QR codes:', e)
    throw e
  }
}

