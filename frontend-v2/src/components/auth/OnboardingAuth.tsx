import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

interface OnboardingAuthProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Composant de protection d'authentification pour les pages d'onboarding
 */
export function OnboardingAuth({ children, redirectTo = '/auth/login' }: OnboardingAuthProps) {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return // Attendre le chargement de la session
    
    if (status === 'unauthenticated') {
      // Construire l'URL de callback pour revenir à la page actuelle après connexion
      const currentPath = router.asPath
      const callbackUrl = encodeURIComponent(currentPath)
      router.replace(`${redirectTo}?callbackUrl=${callbackUrl}`)
      return
    }
  }, [status, router, redirectTo])

  // Afficher un loader pendant la vérification de l'authentification
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Ne pas afficher le contenu si pas authentifié (la redirection est en cours)
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Afficher le contenu si authentifié
  return <>{children}</>
}

/**
 * HOC pour protéger une page d'onboarding
 */
export function withOnboardingAuth<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  const WrappedComponent = (props: P) => {
    return (
      <OnboardingAuth redirectTo={redirectTo}>
        <Component {...props} />
      </OnboardingAuth>
    )
  }

  WrappedComponent.displayName = `withOnboardingAuth(${Component.displayName || Component.name})`
  
  return WrappedComponent
}