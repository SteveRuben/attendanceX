import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Construction } from 'lucide-react'
import { isFeatureEnabled, type FeatureFlag } from '@/config/features'

interface FeatureNoticeProps {
  feature: FeatureFlag
  title?: string
  description?: string
  className?: string
}

const FEATURE_MESSAGES = {
  TIMESHEETS: {
    title: 'Feuilles de temps',
    description: 'Cette fonctionnalité est en cours de développement et sera bientôt disponible.'
  },
  RESOLUTIONS: {
    title: 'Résolutions',
    description: 'Cette fonctionnalité est en cours de développement et sera bientôt disponible.'
  },
  AI_FEATURES: {
    title: 'Fonctionnalités IA',
    description: 'Les fonctionnalités d\'intelligence artificielle sont en phase expérimentale.'
  },
  ADVANCED_ANALYTICS: {
    title: 'Analytics avancés',
    description: 'Les analytics avancés sont en cours de développement.'
  }
} as const

export function FeatureNotice({ 
  feature, 
  title, 
  description, 
  className = '' 
}: FeatureNoticeProps) {
  // Si la fonctionnalité est activée, ne pas afficher la notice
  if (isFeatureEnabled(feature)) {
    return null
  }

  const message = FEATURE_MESSAGES[feature as keyof typeof FEATURE_MESSAGES]
  const displayTitle = title || message?.title || 'Fonctionnalité'
  const displayDescription = description || message?.description || 'Cette fonctionnalité n\'est pas encore disponible.'

  return (
    <Alert className={`border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 ${className}`}>
      <Construction className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex items-start gap-2">
          <div>
            <strong>{displayTitle}</strong>
            <p className="text-sm mt-1">{displayDescription}</p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Composant pour afficher une notice de développement
 */
export function DevelopmentNotice({ className = '' }: { className?: string }) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 ${className}`}>
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        <strong>Mode développement</strong>
        <p className="text-sm mt-1">
          Certaines fonctionnalités peuvent être temporairement indisponibles pendant le développement.
        </p>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Hook pour vérifier si une fonctionnalité est disponible
 */
export function useFeature(feature: FeatureFlag) {
  return {
    isEnabled: isFeatureEnabled(feature),
    isDisabled: !isFeatureEnabled(feature)
  }
}