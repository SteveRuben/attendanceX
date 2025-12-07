import { apiClient } from '@/services/apiClient'

export interface PromoCodeItem {
  id: string
  code: string
  percent: number
  isActive: boolean
}

function mapPromo(d: any): PromoCodeItem {
  const id = String(d?.id ?? d?._id ?? Math.random())
  const code = String(d?.code ?? d?.name ?? 'CODE')
  const percent = Number(d?.discountType === 'percentage' ? (d?.discountValue ?? 0) : d?.percent ?? 0)
  const isActive = Boolean(d?.isActive ?? d?.active ?? true)
  return { id, code, percent, isActive }
}

export async function getPromoCodes(params: { limit?: number; offset?: number; search?: string; isActive?: boolean } = {}): Promise<PromoCodeItem[]> {
  const { limit = 50, offset = 0, search, isActive } = params
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (search) qs.set('search', search)
  if (typeof isActive === 'boolean') qs.set('isActive', String(isActive))
  const res = await apiClient.get<any>(`/api/v1/promo-codes?${qs.toString()}`, { withAuth: true })
  const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? (res as any) : []
  return list.map(mapPromo)
}

export async function createPromoCode(input: { code: string; percent: number }): Promise<PromoCodeItem> {
  const body = {
    code: input.code.toUpperCase(),
    name: input.code.toUpperCase(),
    description: '',
    discountType: 'percentage',
    discountValue: Number(input.percent),
    validFrom: new Date().toISOString(),
  }
  const res = await apiClient.post<any>(`/api/v1/promo-codes`, body, {
    withAuth: true,
    withToast: { loading: 'Creating code...', success: 'Code created' },
  })
  const d = (res as any)?.data ?? res
  return mapPromo(d)
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<void> {
  await apiClient.put(`/api/v1/promo-codes/${id}/toggle`, { isActive }, {
    withAuth: true,
    withToast: { loading: isActive ? 'Enabling...' : 'Disabling...', success: 'Updated' },
  })
}

export async function deletePromoCode(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/promo-codes/${id}`, {
    withAuth: true,
    withToast: { loading: 'Removing...', success: 'Removed' },
  })
}

