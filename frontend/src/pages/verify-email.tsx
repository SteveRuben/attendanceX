import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/services/apiClient'
import { extractMessage } from '@/utils/apiErrors'
import Head from 'next/head'


export default function VerifyEmail() {
  const router = useRouter()
  const token = (router.query.token as string) || ''
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    if (!token) {
      setStatus('error')
      setError('Invalid or missing verification token')
      return
    }

    const run = async () => {
      setStatus('verifying')
      setError(null)
      try {
        await apiClient.post('/auth/verify-email', { token }, {
          withAuth: false,
          withToast: { loading: 'Verifying your email...', success: 'Email verified. You can now sign in.' },
        })
        setStatus('success')
      } catch (err: any) {
        setError(extractMessage(err))
        setStatus('error')
      }
    }

    run()
  }, [router.isReady, token])


  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      <Head>
        <title>Verify email - AttendanceX</title>
      </Head>

      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-4 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />
            {status === 'verifying' && (
              <>
                <h1 className="text-2xl font-semibold relative">Verifying your email</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 relative">Please wait while we confirm your email address…</p>
                <Button disabled className="w-full">Verifying…</Button>
              </>
            )}
            {status === 'success' && (
              <>
                <h1 className="text-2xl font-semibold relative">Email verified</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 relative">Your email has been successfully verified. You can now sign in.</p>
                <Link href="/auth/login" className="block">
                  <Button className="w-full">Go to sign in</Button>
                </Link>
              </>
            )}
            {status === 'error' && (
              <>
                <h1 className="text-2xl font-semibold relative">Verification failed</h1>
                {error && (
                  <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 relative">{error}</p>
                )}
                <div className="flex gap-2">
                  <Link href="/auth/login" className="flex-1">
                    <Button variant="default" className="w-full">Go to sign in</Button>
                  </Link>
                  <Link href="/" className="flex-1">
                    <Button variant="secondary" className="w-full">Back to home</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

