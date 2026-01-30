/**
 * Utilitaire de debounce pour éviter les appels répétés
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Cache simple pour éviter les appels API répétés
 */
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private ttl: number

  constructor(ttlMs: number = 30000) { // 30 secondes par défaut
    this.ttl = ttlMs
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const apiCache = new SimpleCache(30000) // 30 secondes