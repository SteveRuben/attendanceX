# Sécurité d'authentification

## 🔒 Problème résolu

**Avant** : La page `/onboarding/create-workspace` était accessible sans authentification.
**Après** : Protection complète avec redirection automatique vers la page de connexion.

## 🛡️ Solutions implémentées

### 1. **Composant OnboardingAuth**

Composant réutilisable pour protéger les pages d'onboarding :

```typescript
// frontend-v2/src/components/auth/OnboardingAuth.tsx

export function OnboardingAuth({ children, redirectTo = '/auth/signin' }) {
  const { status } = useSession()
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = encodeURIComponent(router.asPath)
      router.replace(`${redirectTo}?callbackUrl=${callbackUrl}`)
    }
  }, [status])

  if (status === 'loading') return <LoadingSpinner />
  if (status === 'unauthenticated') return <RedirectingSpinner />
  
  return <>{children}</>
}
```

### 2. **Middleware Next.js**

Protection automatique au niveau du routeur :

```typescript
// frontend-v2/src/middleware.ts

export default withAuth(function middleware(req) {
  const protectedPaths = ['/onboarding', '/app', '/choose-tenant']
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )
  
  if (isProtectedPath && !req.nextauth.token) {
    const signInUrl = new URL('/auth/signin', req.url)
    signInUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(signInUrl)
  }
})
```

### 3. **Page create-workspace mise à jour**

```typescript
// Avant (vulnérable)
export default function CreateWorkspace() {
  const { status } = useSession()
  // Pas de protection - page accessible sans login
  return <CreateWorkspaceForm />
}

// Après (sécurisé)
export default function CreateWorkspace() {
  return (
    <OnboardingAuth>
      <CreateWorkspaceContent />
    </OnboardingAuth>
  )
}
```

## 🔐 Niveaux de protection

### **Niveau 1 : Middleware (Global)**
- Protection automatique de toutes les routes `/onboarding/*`
- Redirection vers `/auth/signin` avec callback URL
- Pas besoin de code dans chaque page

### **Niveau 2 : Composant OnboardingAuth**
- Protection explicite pour les pages sensibles
- Gestion des états de chargement
- Messages utilisateur appropriés

### **Niveau 3 : Vérifications dans les pages**
- Vérifications supplémentaires si nécessaire
- Logique métier spécifique
- Validation des permissions

## 📊 Pages protégées

### **Automatiquement protégées** (via middleware)
- `/onboarding/*` - Toutes les pages d'onboarding
- `/app/*` - Application principale
- `/choose-tenant` - Sélection de tenant

### **Explicitement protégées** (via composants)
- `/onboarding/create-workspace` - Création d'espace de travail
- `/onboarding/setup` - Configuration initiale

### **Pages publiques** (non protégées)
- `/auth/*` - Pages d'authentification
- `/` - Page d'accueil (redirige si connecté)
- `/api/*` - Routes API
- `/_next/*` - Ressources Next.js

## 🔄 Flux d'authentification

### **Utilisateur non connecté**
1. Accès à `/onboarding/create-workspace`
2. Middleware détecte l'absence de token
3. Redirection vers `/auth/signin?callbackUrl=/onboarding/create-workspace`
4. Après connexion, retour automatique à la page demandée

### **Utilisateur connecté**
1. Accès à `/onboarding/create-workspace`
2. Middleware valide le token
3. Composant OnboardingAuth vérifie la session
4. Affichage de la page

### **États de chargement**
- **Loading** : Spinner avec "Checking authentication..."
- **Redirecting** : Spinner avec "Redirecting to login..."
- **Authenticated** : Contenu de la page

## 🛠️ Configuration

### **Variables d'environnement**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### **Configuration NextAuth**
```typescript
// pages/api/auth/[...nextauth].ts
export default NextAuth({
  callbacks: {
    jwt: ({ token, account }) => {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      return token
    },
    session: ({ session, token }) => {
      session.accessToken = token.accessToken
      return session
    }
  }
})
```

## 🧪 Tests de sécurité

### **Test 1 : Accès direct sans authentification**
```bash
# Doit rediriger vers /auth/signin
curl -I http://localhost:3000/onboarding/create-workspace
# Expected: 307 Temporary Redirect
# Location: /auth/signin?callbackUrl=...
```

### **Test 2 : Accès avec session expirée**
```bash
# Doit rediriger vers /auth/signin
curl -I -H "Cookie: next-auth.session-token=expired" \
  http://localhost:3000/onboarding/create-workspace
```

### **Test 3 : Accès avec session valide**
```bash
# Doit afficher la page
curl -I -H "Cookie: next-auth.session-token=valid" \
  http://localhost:3000/onboarding/create-workspace
# Expected: 200 OK
```

## 🚨 Bonnes pratiques

### **1. Toujours utiliser HTTPS en production**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

### **2. Validation côté serveur**
```typescript
// Toujours valider les tokens côté API
export default async function handler(req, res) {
  const token = await getToken({ req })
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // ... logique métier
}
```

### **3. Gestion des erreurs**
```typescript
// Gérer les erreurs d'authentification gracieusement
try {
  await apiCall()
} catch (error) {
  if (error.status === 401) {
    signOut({ callbackUrl: '/auth/signin' })
  }
}
```

## 📈 Monitoring

### **Métriques à surveiller**
- Tentatives d'accès non autorisées
- Taux de redirection vers /auth/signin
- Temps de chargement des pages protégées
- Erreurs d'authentification

### **Logs de sécurité**
```typescript
// Middleware logging
console.log('Auth check:', {
  path: req.nextUrl.pathname,
  hasToken: !!req.nextauth.token,
  userAgent: req.headers.get('user-agent'),
  ip: req.ip
})
```

## 🔧 Dépannage

### **Problème : Boucle de redirection**
**Cause** : Configuration incorrecte de NEXTAUTH_URL
**Solution** : Vérifier que NEXTAUTH_URL correspond à l'URL de l'application

### **Problème : Session non persistante**
**Cause** : NEXTAUTH_SECRET manquant ou incorrect
**Solution** : Définir NEXTAUTH_SECRET dans les variables d'environnement

### **Problème : Middleware ne fonctionne pas**
**Cause** : Configuration matcher incorrecte
**Solution** : Vérifier le pattern dans middleware.config.matcher

La sécurité est maintenant robuste avec une protection à plusieurs niveaux ! 🔒