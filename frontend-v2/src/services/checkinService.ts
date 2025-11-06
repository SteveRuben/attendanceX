import { apiClient } from '@/services/apiClient'

export interface GenerateQrResponse {
  qrCodeId: string
  url?: string
  imageBase64?: string
  expiresAt?: string
}

export async function generateQrCode(payload: { eventId: string; type?: 'check_in'; expiresAt?: string; options?: { size?: number; format?: 'png' | 'svg' } }): Promise<GenerateQrResponse> {
  const mock: GenerateQrResponse = { qrCodeId: 'qr_' + Math.random().toString(36).slice(2), expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
  try {
    const data = await apiClient.post<any>('/qrcode/generate', { type: 'check_in', ...payload }, { mock })
    const d = (data?.data ?? data) as any
    return {
      qrCodeId: String(d?.qrCodeId ?? d?.id ?? mock.qrCodeId),
      url: d?.url,
      imageBase64: d?.imageBase64,
      expiresAt: d?.expiresAt,
    }
  } catch {
    return mock
  }
}

export async function validateQrCode(payload: { qrCodeId: string; location?: { latitude: number; longitude: number } }): Promise<{ valid: boolean; message?: string }> {
  try {
    const data = await apiClient.post<any>('/qrcode/validate', payload, { mock: { valid: true } })
    return { valid: Boolean((data?.valid ?? data?.ok ?? true)), message: data?.message }
  } catch {
    return { valid: true }
  }
}

