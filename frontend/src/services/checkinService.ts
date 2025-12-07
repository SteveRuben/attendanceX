import { apiClient } from '@/services/apiClient'

export interface GenerateQrResponse {
  qrCodeId: string
  url?: string
  imageBase64?: string
  expiresAt?: string
}

export async function generateQrCode(payload: { eventId: string; type?: 'check_in'; expiresAt?: string; options?: { size?: number; format?: 'png' | 'svg' } }): Promise<GenerateQrResponse> {
  try {
    const data = await apiClient.post<any>('/qrcode/generate', { type: 'check_in', ...payload })
    const d = (data?.data ?? data) as any
    const id = d?.qrCodeId ?? d?.id
    if (!id) throw new Error('Invalid QR code response')
    return {
      qrCodeId: String(id),
      url: d?.url,
      imageBase64: d?.imageBase64,
      expiresAt: d?.expiresAt,
    }
  } catch (e) {
    throw e
  }
}

export async function validateQrCode(payload: { qrCodeId: string; location?: { latitude: number; longitude: number } }): Promise<{ valid: boolean; message?: string }> {
  try {
    const data = await apiClient.post<any>('/qrcode/validate', payload)
    const valid = (data as any)?.valid ?? (data as any)?.ok
    if (typeof valid === 'undefined') throw new Error('Invalid validate response')
    return { valid: Boolean(valid), message: (data as any)?.message }
  } catch (e) {
    throw e
  }
}

