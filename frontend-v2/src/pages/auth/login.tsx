import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
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
export default function Login() {
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
        const list = await apiClient.get<any[]>('/tenants', { withAuth: true, withToast: { loading: 'Loading your workspaces...' } })
        const tenants = Array.isArray(list) ? list : (list as any)?.items || []
        if (tenants.length === 1) {
          const id = tenants[0]?.id || tenants[0]?.tenantId
          if (id && typeof window !== 'undefined') localStorage.setItem('currentTenantId', String(id))
          router.replace('/app')
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

  if (status === 'authenticated') {
    if (typeof window !== 'undefined') router.replace('/app')
    return null
  }


  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 blur-3xl opacity-60 dark:from-blue-900/40 dark:to-indigo-900/40" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-200 blur-3xl opacity-60 dark:from-sky-900/40 dark:to-cyan-900/40" />
      <Head>
        <title>Sign in - AttendanceX</title>
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
          <form onSubmit={formik.handleSubmit} className="relative w-full max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-6 md:p-8 shadow-xl space-y-4 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-blue-200/50 dark:bg-blue-900/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-indigo-200/50 dark:bg-indigo-900/20 blur-3xl" />
            <h1 className="text-2xl font-semibold relative">Sign in</h1>
            {error && <p className="text-sm rounded-md border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 relative">{error}</p>}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {(formik.touched.email || formik.submitCount > 0) && formik.errors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Password" value={formik.values.password} onChange={formik.handleChange} onBlur={formik.handleBlur} />
              {(formik.touched.password || formik.submitCount > 0) && formik.errors.password && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{formik.errors.password}</p>
              )}
            </div>
            <Button type="submit" disabled={formik.isSubmitting} className="w-full">{formik.isSubmitting ? 'Signing in...' : 'Sign in'}</Button>
            <p className="text-sm text-center text-neutral-600 dark:text-neutral-300 relative">
              No account? <Link className="text-blue-600 dark:text-blue-400 font-medium" href="/auth/register">Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
