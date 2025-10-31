import { getSession } from 'next-auth/react'
import { dismissToast, showToast } from '@/hooks/use-toast'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ToastMessages {
  loading?: string
  success?: string
  error?: string
}

export interface RequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: any
  withAuth?: boolean
  withToast?: boolean | ToastMessages
  parse?: 'json' | 'blob' | 'text'


  // Optional: Provide a mock value to be returned if the network fails (for UI-only testing)
  mock?: any | (() => any | Promise<any>)
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || ''

function buildUrl(path: string) {
  if (!path) return API_URL
  if (path.startsWith('http')) return path
  if (!API_URL) return path
  return API_URL.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`)
}

function isFormData(val: unknown): val is FormData {
  return typeof FormData !== 'undefined' && val instanceof FormData
}

async function getAccessToken(): Promise<string | undefined> {
  try {
    const session = await getSession()
    return (session as any)?.accessToken as string | undefined
  } catch {
    return undefined
  }
}

export class ApiClientService {
  async request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      withAuth = true,
      withToast,
      parse = 'json',
    } = opts

    const url = buildUrl(path)

    const finalHeaders: Record<string, string> = { ...headers }

    if (!isFormData(body) && method !== 'GET') {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json'
    }

    if (withAuth) {
      const token = await getAccessToken()
      if (token) finalHeaders['Authorization'] = `Bearer ${token}`
      const tenantId = typeof window !== 'undefined'
        ? (localStorage.getItem('currentTenantId') || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '')
        : ''
      if (tenantId) finalHeaders['X-Tenant-ID'] = tenantId
    }

    let loadingId: string | undefined
    const toastCfg: ToastMessages | undefined =
      typeof withToast === 'object' ? withToast : withToast ? {} : undefined

    if (toastCfg) {
      loadingId = showToast({
        title: toastCfg.loading || 'Processing... ',
        variant: 'default',
        duration: 0,
      })
    }

    try {
      const fetchConfig: RequestInit = {
        method,
        headers: finalHeaders,
        body: method === 'GET' ? undefined : isFormData(body) ? body : body ? JSON.stringify(body) : undefined,
      }

      // Only include credentials for authenticated requests
      if (withAuth) {
        fetchConfig.credentials = 'include'
      }

      const res = await fetch(url, fetchConfig)

      const ok = res.ok
      let data: any

      if (parse === 'blob') data = await res.blob()
      else if (parse === 'text') data = await res.text()
      else {
        try { data = await res.json() } catch { data = undefined }
      }

      if (!ok) {
        const msg = data?.message || data?.error || res.statusText || 'Request failed'
        const error: any = new Error(msg)
        error.status = res.status
        error.body = data
        error.fieldErrorDetails = data?.fieldErrorDetails
        throw error
      }

      const payload = data?.data ?? data

      if (loadingId) {
        dismissToast(loadingId)
        if (toastCfg?.success) showToast({ title: toastCfg.success, variant: 'success' })
      }

      return payload as T
    } catch (err: any) {
      if (loadingId) dismissToast(loadingId)

      // Optional mock fallback for UI testing when backend is unavailable
      if (opts.mock !== undefined) {
        const tryMock = typeof opts.mock === 'function' ? await (opts.mock as any)() : opts.mock
        if (toastCfg) {
          showToast({ title: 'Using mock data', variant: 'success' })
        }
        return tryMock as T
      }

      if (toastCfg && !toastCfg?.error) {
        showToast({ title: err?.message || 'Something went wrong', variant: 'destructive' })
      }
      throw err
    }
  }

  get<T = any>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'GET' })
  }
  post<T = any>(path: string, body?: any, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'POST', body })
  }
  put<T = any>(path: string, body?: any, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PUT', body })
  }
  patch<T = any>(path: string, body?: any, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PATCH', body })
  }
  delete<T = any>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'DELETE' })
  }
}

export const apiClient = new ApiClientService()

