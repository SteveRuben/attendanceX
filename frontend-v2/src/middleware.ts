import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Pages qui nécessitent une authentification
    const protectedPaths = [
      '/onboarding',
      '/app',
      '/choose-tenant'
    ]

    // Vérifier si la route actuelle nécessite une authentification
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    // Si la page nécessite une authentification mais l'utilisateur n'est pas connecté
    if (isProtectedPath && !token) {
      const signInUrl = new URL('/auth/login', req.url)
      signInUrl.searchParams.set('callbackUrl', req.url)
      return NextResponse.redirect(signInUrl)
    }

    // Redirection automatique pour les utilisateurs connectés
    if (token) {
      // Rediriger /onboarding vers /onboarding/create-workspace si pas de sous-route
      if (pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding/create-workspace', req.url))
      }

      // Rediriger la racine vers /choose-tenant pour les utilisateurs connectés
      // SEULEMENT si ce n'est pas une page publique
      if (pathname === '/' || pathname === '/pricing') {
        // Ne pas rediriger, laisser l'accès aux pages publiques
        // return NextResponse.redirect(new URL('/choose-tenant', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Pages publiques qui ne nécessitent pas d'authentification
        const publicPaths = [
          '/',
          '/pricing',
          '/terms',
          '/privacy',
          '/auth',
          '/api/auth',
          '/_next',
          '/favicon.ico',
          '/robots.txt',
          '/sitemap.xml',
          '/locales',
          '/verify-email',
          '/accept-invitation'
        ]

        // Permettre l'accès aux pages publiques
        if (publicPaths.some(path => pathname.startsWith(path) || pathname === path)) {
          return true
        }

        // Pages qui nécessitent une authentification
        const protectedPaths = [
          '/onboarding',
          '/app',
          '/choose-tenant'
        ]

        const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

        // Si c'est une page protégée, vérifier le token
        if (isProtectedPath) {
          return !!token
        }

        // Pour toutes les autres pages, permettre l'accès
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}