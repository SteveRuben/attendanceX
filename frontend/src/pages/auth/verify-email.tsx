import { useRouter } from 'next/router'
import { useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/services/apiClient'
import { showToast } from '@/hooks/use-toast'

export default function VerifyEmail() {
  const router = useRouter()
  const { email } = router.query
  const [resending, setResending] = useState(false)

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    try {
      await apiClient.post('/auth/send-email-verification', { email }, {
        withAuth: false,
        withToast: { loading: 'Sending verification email...', success: 'Verification email sent!' }
      })
    } catch (err: any) {
      showToast({ title: err?.message || 'Failed to resend email', variant: 'destructive' })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
      <Head>
        <title>Verify your email - AttendanceX</title>
      </Head>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600" />
            <span className="text-lg font-semibold tracking-tight">AttendanceX</span>
          </Link>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-6 overflow-hidden text-center">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />

            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h1 className="text-2xl font-semibold mb-2">Check your email</h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                We&apos;ve sent a verification link to:
              </p>
              {email && (
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-4">{email}</p>
              )}
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Click the link in your email to verify your account. The link expires in 24 hours.
              </p>
            </div>

            <div className="relative space-y-3">
              <Button variant="outline" onClick={handleResend} disabled={resending || !email} className="w-full">
                {resending ? 'Sending...' : 'Resend verification email'}
              </Button>
              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">Back to login</Button>
              </Link>
            </div>

            <p className="relative text-xs text-neutral-500">
              Didn&apos;t receive the email? Check your spam folder or request a new link.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

