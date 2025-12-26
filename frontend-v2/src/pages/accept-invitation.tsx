import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle, Mail, User, Building } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface InvitationDetails {
  email: string
  firstName: string
  lastName: string
  role: string
  organizationName: string
  inviterName: string
  expiresAt: string
}

interface AcceptInvitationForm {
  password: string
  confirmPassword: string
  acceptTerms: boolean
  marketingConsent: boolean
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const { token } = router.query
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [form, setForm] = useState<AcceptInvitationForm>({
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    marketingConsent: false
  })
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Valider le token d'invitation au chargement
  useEffect(() => {
    if (token && typeof token === 'string') {
      validateInvitationToken(token)
    }
  }, [token])

  const validateInvitationToken = async (invitationToken: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get(`/public/invitations/validate/${invitationToken}`, { withAuth: false })
      
      // The apiClient returns just the data part, not the full response with success field
      if (response && response.email) {
        setInvitation(response)
      } else {
        setError('Token d\'invitation invalide ou expiré')
      }
    } catch (err: any) {
      console.error('Error validating invitation token:', err)
      
      // Use the specific error message from the API if available
      const errorMessage = err.body?.error || err.message || 'Erreur lors de la validation de l\'invitation'
      
      // Map specific API errors to user-friendly French messages
      if (errorMessage === 'Invitation token already used') {
        setError('Cette invitation a déjà été utilisée')
      } else if (errorMessage === 'Invalid invitation token') {
        setError('Token d\'invitation invalide')
      } else if (errorMessage === 'Invitation token expired') {
        setError('Cette invitation a expiré')
      } else if (errorMessage === 'Invitation not found') {
        setError('Invitation introuvable')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.password) {
      errors.password = 'Le mot de passe est requis'
    } else if (form.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Veuillez confirmer votre mot de passe'
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    if (!form.acceptTerms) {
      errors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !token) return

    try {
      setSubmitting(true)
      setError(null)

      const response = await apiClient.post('/public/invitations/accept', {
        token: token as string,
        password: form.password,
        acceptTerms: form.acceptTerms ? 'true' : 'false', // Convert boolean to string
        marketingConsent: form.marketingConsent
      }, { withAuth: false })

      if (response.success) {
        setSuccess(true)
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          router.push('/auth/login?message=invitation-accepted')
        }, 3000)
      } else {
        setError(response.error?.message || 'Erreur lors de l\'acceptation de l\'invitation')
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err.message || 'Erreur lors de l\'acceptation de l\'invitation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!token) return

    try {
      setSubmitting(true)
      setError(null)

      await apiClient.post('/public/invitations/decline', {
        token: token as string,
        reason: 'Declined by user'
      }, { withAuth: false })

      router.push('/?message=invitation-declined')
    } catch (err: any) {
      console.error('Error declining invitation:', err)
      setError(err.message || 'Erreur lors du refus de l\'invitation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">Validation de l'invitation...</p>
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
          <title>Invitation acceptée - AttendanceX</title>
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
              
              <div className="text-center relative">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold mb-2">Invitation acceptée !</h1>
                <p className="text-neutral-600 dark:text-neutral-300 mb-4">
                  Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.
                </p>
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-neutral-500">Redirection en cours...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-red-200 to-rose-200 blur-3xl opacity-60 dark:from-red-900/40 dark:to-rose-900/40" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-pink-200 to-red-200 blur-3xl opacity-60 dark:from-pink-900/40 dark:to-red-900/40" />
        </div>

        <Head>
          <title>Invitation invalide - AttendanceX</title>
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
              
              <div className="text-center relative">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-semibold mb-2">Invitation invalide</h1>
                <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                  {error || 'Cette invitation n\'est pas valide ou a expiré.'}
                </p>
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  Retour à l'accueil
                </Button>
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
        <title>Accepter l'invitation - AttendanceX</title>
      </Head>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={handleAcceptInvitation} className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-6 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />
            
            <div className="relative">
              <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
                <Mail className="h-6 w-6" />
                Accepter l'invitation
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Vous avez été invité à rejoindre une organisation
              </p>
            </div>

            {/* Détails de l'invitation */}
            <div className="bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-lg space-y-3 relative backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{invitation.organizationName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  Invité par {invitation.inviterName} en tant que {invitation.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{invitation.email}</span>
              </div>
            </div>

            <div className="space-y-4 relative">
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Créez votre mot de passe"
                  required
                />
                {formErrors.password && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formErrors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirmez votre mot de passe"
                  required
                />
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={form.acceptTerms}
                    onChange={(e) => setForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                    className="mt-1"
                  />
                  <Label htmlFor="acceptTerms" className="text-sm leading-5">
                    J'accepte les{' '}
                    <a href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      conditions d'utilisation
                    </a>{' '}
                    et la{' '}
                    <a href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      politique de confidentialité
                    </a>
                  </Label>
                </div>
                {formErrors.acceptTerms && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{formErrors.acceptTerms}</p>
                )}

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="marketingConsent"
                    checked={form.marketingConsent}
                    onChange={(e) => setForm(prev => ({ ...prev, marketingConsent: e.target.checked }))}
                    className="mt-1"
                  />
                  <Label htmlFor="marketingConsent" className="text-sm leading-5">
                    J'accepte de recevoir des communications marketing (optionnel)
                  </Label>
                </div>
              </div>

              {error && (
                <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeclineInvitation}
                  disabled={submitting}
                  className="flex-1"
                >
                  Refuser
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Acceptation...
                    </>
                  ) : (
                    'Accepter'
                  )}
                </Button>
              </div>

              <div className="text-center text-xs text-neutral-500">
                <p>
                  Cette invitation expire le{' '}
                  {new Date(invitation.expiresAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}