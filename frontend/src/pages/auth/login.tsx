import { useState } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { showToast, dismissToast } from '@/hooks/use-toast'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Head from 'next/head'
import { apiClient } from '@/services/apiClient'
import { getOnboardingStatus } from '@/services/tenantService'

async function waitForSessionAccessToken(timeoutMs = 2000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const s: any = await getSession()
    if (s?.accessToken) return s.accessToken as string
    await new Promise(res => setTimeout(res, 100))
  }
  return undefined
}

export default function LoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email').required('Email is required'),
      password: Yup.string().min(6, 'Min 6 characters').required('Password is required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setError(null)
      const toastId = showToast({ title: 'Signing in...', duration: 0 })

      try {
        const res = await signIn('credentials', { ...values, redirect: false })
        if (res?.error) {
          setError('Invalid credentials')
          throw new Error(res.error)
        }

        dismissToast(toastId)
        showToast({ title: 'Welcome back', variant: 'success' })

        // Wait for session to be available
        await waitForSessionAccessToken()

        // Get tenants
        const list = await apiClient.get<any[]>('/tenants', { 
          withAuth: true, 
          withToast: { loading: 'Loading your workspaces...' } 
        })
        const tenants = Array.isArray(list) ? list : (list as any)?.items || []

        if (tenants.length === 1) {
          const id = tenants[0]?.id || tenants[0]?.tenantId
          if (id && typeof window !== 'undefined') {
            localStorage.setItem('currentTenantId', String(id))
          }
          const st = await getOnboardingStatus(String(id))
          router.replace(st.completed ? '/app' : '/onboarding/setup')
        } else if (tenants.length > 1) {
          router.replace('/choose-tenant')
        } else {
          router.replace('/onboarding/create-workspace')
        }
      } catch (err: any) {
        dismissToast(toastId)
        showToast({ title: 'Invalid credentials', variant: 'destructive' })
      } finally {
        setSubmitting(false)
      }
    },
  })

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-900" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-neutral-500">Checking session...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace('/app')
    return null
  }

  return (
    <>
      <Head>
        <title>Se connecter - AttendanceX</title>
      </Head>
      
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Column - Form Section */}
        <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-[440px]">
            {/* Logo */}
            <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">AttendanceX</span>
            </Link>

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Bienvenue
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Connectez-vous pour gérer vos événements
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={formik.handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Adresse email
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email"
                  placeholder="nom@exemple.com" 
                  value={formik.values.email} 
                  onChange={formik.handleChange} 
                  onBlur={formik.handleBlur}
                  className={`h-12 px-4 rounded-lg border ${
                    (formik.touched.email || formik.submitCount > 0) && formik.errors.email
                      ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20'
                  } focus:ring-2 bg-white dark:bg-slate-800 transition-all duration-200`}
                />
                {(formik.touched.email || formik.submitCount > 0) && formik.errors.email && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {formik.errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mot de passe
                  </Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password"
                  placeholder="••••••••" 
                  value={formik.values.password} 
                  onChange={formik.handleChange} 
                  onBlur={formik.handleBlur}
                  className={`h-12 px-4 rounded-lg border ${
                    (formik.touched.password || formik.submitCount > 0) && formik.errors.password
                      ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500/20'
                      : 'border border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20'
                  } focus:ring-2 bg-white dark:bg-slate-800 transition-all duration-200`}
                />
                {(formik.touched.password || formik.submitCount > 0) && formik.errors.password && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {formik.errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={formik.isSubmitting} 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
              >
                {formik.isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            {/* Signup Link */}
            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Vous n'avez pas de compte ?{' '}
              <Link 
                href="/auth/register" 
                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column - Branding Section */}
        <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M0 32V0h32" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md text-center space-y-8">
              {/* Illustration */}
              <div className="mb-8">
                <svg className="w-64 h-64 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="80" fill="white" fillOpacity="0.1"/>
                  <circle cx="100" cy="100" r="60" fill="white" fillOpacity="0.1"/>
                  <path d="M100 40 L120 80 L160 80 L130 105 L145 145 L100 120 L55 145 L70 105 L40 80 L80 80 Z" fill="white" fillOpacity="0.9"/>
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-4xl font-bold leading-tight">
                Gérez vos événements en toute simplicité
              </h2>

              {/* Description */}
              <p className="text-lg text-white/90 leading-relaxed">
                Créez, organisez et suivez tous vos événements depuis une seule plateforme intuitive et puissante
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl font-bold mb-1">500+</div>
                  <div className="text-sm text-white/80">Événements créés</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="text-3xl font-bold mb-1">10K+</div>
                  <div className="text-sm text-white/80">Participants satisfaits</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header (visible only on mobile) */}
        <div className="lg:hidden h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 flex items-center justify-center">
          <h2 className="text-2xl font-bold text-white text-center px-4">
            Gérez vos événements simplement
          </h2>
        </div>
      </div>
    </>
  )
}