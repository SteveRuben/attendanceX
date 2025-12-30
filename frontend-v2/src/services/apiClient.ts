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
  withCredentials?: boolean
  suppressTenantHeader?: boolean
  accessToken?: string
  timeout?: number // Timeout en millisecondes
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


// Global access token cache + waiters so all requests can attach Authorization reliably
let cachedAccessToken: string | undefined
let tokenWaiters: Array<(t?: string) => void> = []

export function setApiAccessToken(token?: string) {
  cachedAccessToken = token
  const waiters = tokenWaiters
  tokenWaiters = []
  for (const fn of waiters) {
    try { fn(token) } catch {}
  }
}

function getCachedApiAccessToken(): string | undefined {
  return cachedAccessToken
}

async function waitForApiAccessToken(timeoutMs: number = 3000): Promise<string | undefined> {
  if (cachedAccessToken) return cachedAccessToken
  if (typeof window === 'undefined') return undefined
  return await new Promise(resolve => {
    let settled = false
    const done = (t?: string) => {
      if (settled) return
      settled = true
      resolve(t)
    }
    const timer = setTimeout(() => done(undefined), timeoutMs)
    tokenWaiters.push((t?: string) => {
      clearTimeout(timer)
      done(t)
    })
  })
}

async function getAccessToken(maxWaitMs: number = 3000): Promise<string | undefined> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      const session = await getSession()
      const token = (session as any)?.accessToken as string | undefined
      if (token) return token
    } catch {}
    await new Promise(res => setTimeout(res, 100))
  }
  return undefined
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
      withCredentials = false,
      suppressTenantHeader = false,
      accessToken: optAccessToken,
      timeout = 0, // 0 = pas de timeout
    } = opts

    const url = buildUrl(path)

    const finalHeaders: Record<string, string> = { ...headers }

    if (!isFormData(body) && method !== 'GET') {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json'
    }

    if (withAuth) {
      const token =
        optAccessToken ||
        getCachedApiAccessToken() ||
        await waitForApiAccessToken(3000) ||
        await getAccessToken(2000)
      if (token) {
        finalHeaders['Authorization'] = `Bearer ${token}`
      } else if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn('apiClient: withAuth=true but no accessToken before request', { url })
      }
      if (!suppressTenantHeader) {
        const tenantId = typeof window !== 'undefined' ? (localStorage.getItem('currentTenantId')  || '') : ('')        
        if (tenantId) {
          finalHeaders['X-Tenant-ID'] = tenantId
        } else {
          console.warn('No tenant ID available for request:', url);
        }
      }
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

      // Only include credentials when explicitly requested
      if (withCredentials) {
        fetchConfig.credentials = 'include'
      }

      // Ajouter le timeout si spécifié
      let fetchPromise = fetch(url, fetchConfig)
      
      if (timeout > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        })
        fetchPromise = Promise.race([fetchPromise, timeoutPromise])
      }

      const res = await fetchPromise

      const ok = res.ok
      let data: any

      if (parse === 'blob') data = await res.blob()
      else if (parse === 'text') data = await res.text()
      else {
        try { data = await res.json() } catch { data = undefined }
      }

      if (!ok) {
        console.log("error");console.log(data);
        const msg = data?.message || data?.error || data?.error.message || res.statusText || 'Request failed'
        console.log(msg);
        const error: any = new Error(msg)
        error.status = res.status
        error.body = data
        error.fieldErrorDetails = data?.fieldErrorDetails || data?.error?.code
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

      if (toastCfg && !toastCfg?.error) {
        const errorMsg = err?.message === 'Request timeout' 
          ? 'Request is taking longer than expected. Please wait...'
          : err?.message || 'Something went wrong'
        showToast({ title: errorMsg, variant: 'destructive' })
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

