import { rateLimit } from './rateLimit'

interface SmartRateLimitConfig {
  windowMs: number
  maxRequests: number
  developmentMultiplier?: number
  testingMultiplier?: number
}

/**
 * Rate limiting intelligent qui s'adapte à l'environnement
 */
export function smartRateLimit(config: SmartRateLimitConfig) {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development'
  const isTesting = process.env.NODE_ENV === 'test'
  
  let multiplier = 1
  
  if (isDevelopment) {
    multiplier = config.developmentMultiplier || 10 // 10x plus permissif en dev
  } else if (isTesting) {
    multiplier = config.testingMultiplier || 5 // 5x plus permissif en test
  }
  
  return rateLimit({
    windowMs: config.windowMs,
    maxRequests: Math.floor(config.maxRequests * multiplier)
  })
}

/**
 * Presets pour différents types d'opérations
 */
export const rateLimitPresets = {
  // Pour les opérations fréquentes (check-in, validation)
  frequent: (config?: Partial<SmartRateLimitConfig>) => smartRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    developmentMultiplier: 20,
    ...config
  }),
  
  // Pour les opérations normales (CRUD)
  normal: (config?: Partial<SmartRateLimitConfig>) => smartRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    developmentMultiplier: 10,
    ...config
  }),
  
  // Pour les opérations sensibles (création, suppression)
  strict: (config?: Partial<SmartRateLimitConfig>) => smartRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    developmentMultiplier: 5,
    ...config
  }),
  
  // Pour les opérations très sensibles (bulk operations)
  veryStrict: (config?: Partial<SmartRateLimitConfig>) => smartRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    developmentMultiplier: 2,
    ...config
  })
}