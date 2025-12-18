/**
 * Configuration pour les tentatives de retry
 */
interface RetryConfig {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
}

/**
 * Utilitaire pour retry automatique avec backoff exponentiel
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryCondition = (error) => {
      // Retry sur les erreurs 429 (rate limit) et 5xx (erreurs serveur)
      const status = error?.response?.status || error?.status
      return status === 429 || (status >= 500 && status < 600)
    }
  } = config

  let lastError: any
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Si c'est la dernière tentative ou si l'erreur ne doit pas être retryée
      if (attempt === maxAttempts || !retryCondition(error)) {
        throw error
      }
      
      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )
      
      // Ajouter un peu de jitter pour éviter les thundering herds
      const jitter = Math.random() * 0.1 * delay
      const finalDelay = delay + jitter
      
      console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(finalDelay)}ms...`, error)
      
      await new Promise(resolve => setTimeout(resolve, finalDelay))
    }
  }
  
  throw lastError
}

/**
 * Wrapper pour les appels API avec retry automatique
 */
export function createRetryWrapper(defaultConfig?: RetryConfig) {
  return function retryWrapper<T>(
    operation: () => Promise<T>,
    config?: RetryConfig
  ): Promise<T> {
    return withRetry(operation, { ...defaultConfig, ...config })
  }
}

/**
 * Presets de configuration pour différents types d'opérations
 */
export const retryPresets = {
  // Pour les opérations critiques (check-in, validation)
  critical: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5
  },
  
  // Pour les opérations normales
  normal: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2
  },
  
  // Pour les opérations non-critiques
  background: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffMultiplier: 3
  }
}

/**
 * Détecte si une erreur est due à un rate limit
 */
export function isRateLimitError(error: any): boolean {
  const status = error?.response?.status || error?.status
  return status === 429
}

/**
 * Extrait le temps d'attente recommandé depuis les headers de rate limit
 */
export function getRateLimitRetryAfter(error: any): number | null {
  const retryAfter = error?.response?.headers?.['retry-after'] || 
                    error?.response?.headers?.['Retry-After']
  
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10)
    return isNaN(seconds) ? null : seconds * 1000 // Convertir en millisecondes
  }
  
  return null
}