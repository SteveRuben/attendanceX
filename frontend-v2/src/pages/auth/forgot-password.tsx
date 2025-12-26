import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('L\'adresse email est requise')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Veuillez entrer une adresse email valide')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await apiClient.post('/auth/forgot-password', {
        email: email.trim()
      }, { withAuth: false })

      setSuccess(true)
    } catch (err: any) {
      console.error('Error sending password reset:', err)
      
      // Map specific API errors to user-friendly messages
      const errorMessage = err.body?.error || err.message || 'Erreur lors de l\'envoi'
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        setError('Trop de demandes. Veuillez réessayer plus tard.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('user')) {
        // Don't reveal if email exists for security reasons
        setSuccess(true)
      } else {
        setError('Une erreur s\'est produite. Veuillez réessayer.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-green-200 to-emerald-200 blur-3xl opacity-60 dark:from-green-900/40 dark:to-emerald-900/40" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-teal-200 to-cyan-200 blur-3xl opacity-60 dark:from-teal-900/40 dark:to-cyan-900/40" />
        </div>

        <Head>
          <title>Email envoyé - AttendanceX</title>
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
                <h1 className="text-2xl font-semibold">Email envoyé !</h1>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
                </p>
                <div className="bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-lg backdrop-blur-sm">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    <strong>Vérifiez votre boîte de réception</strong><br />
                    Le lien de réinitialisation expire dans 15 minutes.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => router.push('/auth/login')} className="w-full">
                    Retour à la connexion
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                      setError(null)
                    }} 
                    className="w-full"
                  >
                    Renvoyer un email
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
        <title>Mot de passe oublié - AttendanceX</title>
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
              <Link 
                href="/auth/login" 
                className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
              
              <h1 className="text-2xl font-semibold flex items-center gap-2 mb-2">
                <Mail className="h-6 w-6" />
                Mot de passe oublié
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {error && (
              <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 relative">
                {error}
              </p>
            )}

            <div className="space-y-4 relative">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading || !email.trim()} className="w-full">
                {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
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