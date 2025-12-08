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

const industries = ['education','healthcare','corporate','government','non_profit','technology','finance','retail','manufacturing','hospitality','consulting','other']
const sizes = ['small','medium','large','enterprise']

export default function CreateWorkspace() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { refreshTenants, selectTenant } = useTenant()

  const formik = useFormik({
    initialValues: { name: '', slug: '', industry: industries[0], size: sizes[0] },
    validationSchema: Yup.object({
      name: Yup.string().min(2).required(),
      slug: Yup.string().matches(/^[a-z0-9-]+$/).min(2).required(),
      industry: Yup.string().required(),
      size: Yup.string().required(),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        if (status !== 'authenticated' || !(session as any)?.accessToken) return
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const payload = await apiClient.post<any>('/tenants/register', {
          name: values.name,
          slug: values.slug,
          industry: values.industry,
          size: values.size,
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
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold mb-6">Create your workspace</h1>
        <form onSubmit={formik.handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-6">
        <Head>
          <title>Create workspace - AttendanceX</title>
        </Head>

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
          <div>
            <Label htmlFor="industry">Industry</Label>
            <select id="industry" name="industry" value={formik.values.industry} onChange={formik.handleChange} className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3">
              {industries.map(i => (<option key={i} value={i}>{i}</option>))}
            </select>
          </div>
          <div>
            <Label htmlFor="size">Organization size</Label>
            <select id="size" name="size" value={formik.values.size} onChange={formik.handleChange} className="w-full h-10 rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3">
              {sizes.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <Button type="submit" disabled={formik.isSubmitting || status !== 'authenticated' || !(session as any)?.accessToken} className="w-full">{formik.isSubmitting ? 'Creating...' : 'Create workspace'}</Button>
        </form>
      </div>
    </div>
  )
}

