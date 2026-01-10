import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Key, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { token } = router.query
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenValid, setTokenValid] = useState(false)

  // Validate token on page load
  useEffect(() => {
    if (token && typeof token === 'string') {
      validateToken(token)
    } else {
      setError('Token de réinitialisation manquant')
      setValidating(false)
    }
  }, [token])

  const validateToken = async (resetToken: string) => {
    try {
      setValidating(true)
      setError(null)
      
      // Just check if token format is valid (we'll validate on submit)
      if (resetToken.length < 32) {
        throw new Error('Token invalide')
      }
      
      setTokenValid(true)
    } catch (err: any) {
      console.error('Error validating token:', err)
      setError('Token de réinitialisation invalide ou expiré')
      setTokenValid(false)
    } finally {
      setValidating(false)
    }
  }

  const validateForm = (): string | null => {
    if (!password) {
      return 'Le mot de passe est requis'
    }
    
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères'
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
    }
    
    if (!confirmPassword) {
      return 'Veuillez confirmer votre mot de passe'
    }
    
    if (password !== confirmPassword) {
      return 'Les mots de passe ne correspondent pas'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!token) {
      setError('Token de réinitialisation manquant')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await apiClient.post('/auth/reset-password', {
        token: token as string,
        newPassword: password
      }, { withAuth: false })

      setSuccess(true)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      
      const errorMessage = err.body?.error || err.message || 'Erreur lors de la réinitialisation'
      
      if (errorMessage.includes('token') && errorMessage.includes('invalid')) {
        setError('Token de réinitialisation invalide ou expiré')
      } else if (errorMessage.includes('token') && errorMessage.includes('used')) {
        setError('Ce lien de réinitialisation a déjà été utilisé')
      } else if (errorMessage.includes('expired')) {
        setError('Ce lien de réinitialisation a expiré')
      } else {
        setError('Une erreur s\'est produite. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">Validation du lien...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-green-200 to-emerald-200 blur-3xl opacity-60 dark:from-green-900/40 dark:to-emerald-900/40" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-teal-200 to-cyan-200 blur-3xl opacity-60 dark:from-teal-900/40 dark:to-cyan-900/40" />
        </div>

        <Head>
          <title>Mot de passe réinitialisé - AttendanceX</title>
        </Head>

        <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
            </Link>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-green-200/50 dark:bg-green-900/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-emerald-200/50 dark:bg-emerald-900/20 blur-3xl" />
              
              <div className="text-center relative space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold">Mot de passe réinitialisé !</h1>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <Button onClick={() => router.push('/auth/login')} className="w-full">
                  Se connecter
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-red-200 to-rose-200 blur-3xl opacity-60 dark:from-red-900/40 dark:to-rose-900/40" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-pink-200 to-red-200 blur-3xl opacity-60 dark:from-pink-900/40 dark:to-red-900/40" />
        </div>

        <Head>
          <title>Lien invalide - AttendanceX</title>
        </Head>

        <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
            </Link>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl overflow-hidden">
              <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-red-200/50 dark:bg-red-900/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-rose-200/50 dark:bg-rose-900/20 blur-3xl" />
              
              <div className="text-center relative space-y-4">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold">Lien invalide</h1>
                <p className="text-neutral-600 dark:text-neutral-300">
                  {error || 'Ce lien de réinitialisation n\'est pas valide ou a expiré.'}
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => router.push('/auth/forgot-password')} className="w-full">
                    Demander un nouveau lien
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/auth/login')} className="w-full">
                    Retour à la connexion
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      </div>

      <Head>
        <title>Réinitialiser le mot de passe - AttendanceX</title>
      </Head>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={handleSubmit} className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-6 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />
            
            <div className="relative">
              <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
                <Key className="h-6 w-6" />
                Nouveau mot de passe
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Choisissez un nouveau mot de passe sécurisé pour votre compte
              </p>
            </div>

            {error && (
              <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 relative">
                {error}
              </p>
            )}

            <div className="space-y-4 relative">
              <div>
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre nouveau mot de passe"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Au moins 8 caractères avec majuscule, minuscule et chiffre
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre nouveau mot de passe"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading || !password || !confirmPassword} className="w-full">
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </Button>

              <div className="text-center text-sm text-neutral-600 dark:text-neutral-300">
                <p>
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}