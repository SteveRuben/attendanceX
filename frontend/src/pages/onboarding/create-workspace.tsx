import { useRouter } from 'next/router'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { apiClient } from '@/services/apiClient'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/contexts/TenantContext'
import { OnboardingAuth } from '@/components/auth/OnboardingAuth'

function CreateWorkspaceContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { refreshTenants, selectTenant } = useTenant()

  const formik = useFormik({
    initialValues: { name: '', slug: '' },
    validationSchema: Yup.object({
      name: Yup.string().min(2).required(),
      slug: Yup.string().matches(/^[a-z0-9-]+$/).min(2).required(),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        if (status !== 'authenticated' || !(session as any)?.accessToken) return
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const payload = await apiClient.post<any>('/tenants/register', {
          name: values.name,
          slug: values.slug,
          industry: 'other', // Valeur par défaut
          size: 'medium', // Valeur par défaut
          planId: 'basic',
          settings: { timezone: tz, locale: 'en-US', currency: 'EUR' },
        }, { withAuth: true, accessToken: (session as any)?.accessToken, suppressTenantHeader: true, withToast: { loading: 'Creating workspace...', success: 'Workspace created' } })
        const tenantId = payload?.tenant?.id || payload?.tenant?.tenant?.id
        if (tenantId) {
          if (typeof window !== 'undefined') localStorage.setItem('currentTenantId', String(tenantId))
          await refreshTenants()
          await selectTenant(String(tenantId))
          router.replace(`/onboarding/setup?tenantId=${tenantId}`)
        } else {
          router.replace('/onboarding/setup')
        }
      } catch (e) {
        console.error('Failed to create workspace:', e)
      } finally {
        setSubmitting(false)
      }
    }
  })


  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <Head>
        <title>Create workspace - AttendanceX</title>
      </Head>
      
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Create your workspace</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome {session?.user?.email}! Let&apos;s set up your organization.
          </p>
        </div>
        <form onSubmit={formik.handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-6">

          <div>
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} />
            {(formik.touched.name || formik.submitCount > 0) && formik.errors.name && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{String(formik.errors.name)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" placeholder="acme-co" value={formik.values.slug} onChange={formik.handleChange} onBlur={formik.handleBlur} />
            {(formik.touched.slug || formik.submitCount > 0) && formik.errors.slug && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{String(formik.errors.slug)}</p>
            )}
          </div>
          <Button type="submit" disabled={formik.isSubmitting || status !== 'authenticated' || !(session as any)?.accessToken} className="w-full">{formik.isSubmitting ? 'Creating...' : 'Create workspace'}</Button>
        </form>
      </div>
    </div>
  )
}

export default function CreateWorkspace() {
  return (
    <OnboardingAuth>
      <CreateWorkspaceContent />
    </OnboardingAuth>
  )
}

