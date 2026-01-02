/**
 * Configuration des fonctionnalités de l'application
 * Permet de désactiver temporairement certaines fonctionnalités en développement
 */

export const FEATURE_FLAGS = {
  // Fonctionnalités principales (toujours activées)
  USER_MANAGEMENT: true,
  AUTHENTICATION: true,
  TENANT_MANAGEMENT: true,
  NOTIFICATIONS: true,

  // Fonctionnalités en développement (peuvent être désactivées)
  TIMESHEETS: false, // Désactivé temporairement - APIs non complètement implémentées
  RESOLUTIONS: false, // Désactivé temporairement - APIs non complètement implémentées
  BILLING: true,
  EVENTS: true,
  REPORTS: true,

  // Fonctionnalités expérimentales
  AI_FEATURES: false,
  ADVANCED_ANALYTICS: false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Vérifie si une fonctionnalité est activée
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURE_FLAGS[feature] ?? false
}

/**
 * Vérifie si une fonctionnalité est désactivée
 */
export function isFeatureDisabled(feature: FeatureFlag): boolean {
  return !isFeatureEnabled(feature)
}

/**
 * Configuration des APIs par environnement
 */
export const API_CONFIG = {
  // En développement, certaines APIs peuvent ne pas être disponibles
  DEVELOPMENT: {
    SKIP_UNAVAILABLE_APIS: true,
    LOG_API_ERRORS: false, // Réduire le bruit dans les logs
  },
  
  // En production, toutes les APIs doivent être disponibles
  PRODUCTION: {
    SKIP_UNAVAILABLE_APIS: false,
    LOG_API_ERRORS: true,
  }
} as const

/**
 * Obtient la configuration API pour l'environnement actuel
 */
export function getApiConfig() {
  const env = process.env.NODE_ENV || 'development'
  return env === 'production' ? API_CONFIG.PRODUCTION : API_CONFIG.DEVELOPMENT
}