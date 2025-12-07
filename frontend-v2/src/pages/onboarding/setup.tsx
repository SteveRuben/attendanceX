import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

import { apiClient } from '@/services/apiClient'
import { getOnboardingStatus, markOnboardingComplete, OnboardingStep } from '@/services/tenantService'
import { useAuthZ } from '@/hooks/use-authz'
import { useTenant } from '@/contexts/TenantContext'

export default function TenantSetup() {
  const router = useRouter()
  const { status } = useSession()
  const { isSuperAdmin } = useAuthZ()
  const { currentTenant, refreshTenants, selectTenant } = useTenant()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [step, setStep] = useState<OnboardingStep>('settings')
  const [loading, setLoading] = useState(true)
  const timezones = useMemo(() => {
    const s = (Intl as any).supportedValuesOf
    return typeof s === 'function' ? (s('timeZone') as string[]) : ['UTC','Africa/Lagos','Africa/Nairobi','Europe/London','Europe/Paris','America/New_York','Asia/Kolkata']
  }, [])
  const locales = useMemo(() => ['en-US','en-GB','fr-FR','de-DE','es-ES','pt-PT'], [])
  const currencies = useMemo(() => ['USD','EUR','GBP','NGN','GHS','KES','ZAR','XOF','XAF','INR','JPY','CNY'], [])

  const detectedTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const [settings, setSettings] = useState({ timezone: '', locale: 'en-US', currency: 'EUR' })
  const [policy, setPolicy] = useState({ workDays: 5, startHour: '09:00', endHour: '17:00', graceMinutes: 5 })
  const [invites, setInvites] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    const queryTenantId = router.query.tenantId as string | undefined
    const storedTenantId = typeof window !== 'undefined' ? localStorage.getItem('currentTenantId') : null
    const id = queryTenantId || storedTenantId
    if (!id) {
      router.replace('/choose-tenant')
      return
    }
    if (queryTenantId && typeof window !== 'undefined') {
      localStorage.setItem('currentTenantId', queryTenantId)
    }
    setTenantId(id)
    ;(async () => {
      try {
        const st = await getOnboardingStatus(id)
        if (st.completed) {
          router.replace('/app')
          return
        }
        setStep(st.nextStep || 'settings')
        setSettings(s => ({ ...s, timezone: detectedTz }))
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router, router.query.tenantId, detectedTz])

  if (status !== 'authenticated' || loading || !tenantId) return null

  const next = () => setStep(step === 'settings' ? 'policy' : step === 'policy' ? 'invite' : 'invite')
  const back = () => setStep(step === 'invite' ? 'policy' : 'settings')

  const saveSettings = async () => {
    setSubmitting(true)
    try {
      await apiClient.patch(`/tenants/${tenantId}/settings`, { settings }, { withAuth: true, withToast: { loading: 'Saving...', success: 'Saved' } })
      next()
    } finally {
      setSubmitting(false)
    }
  }

  const savePolicy = async () => {
    setSubmitting(true)
    try {
      await apiClient.patch(`/tenants/${tenantId}/settings/attendance`, { policy }, { withAuth: true, withToast: { loading: 'Saving...', success: 'Saved' } })
      next()
    } finally {
      setSubmitting(false)
    }
  }

  const finishOnboarding = async () => {
    await markOnboardingComplete(tenantId!)
    await refreshTenants()
    if (tenantId) {
      await selectTenant(tenantId)
    }
    router.replace('/app')
  }

  const sendInvites = async () => {
    setSubmitting(true)
    try {
      const emails = invites.split(',').map(s => s.trim()).filter(Boolean)
      if (emails.length) await apiClient.post(`/tenants/${tenantId}/invitations/bulk`, { emails }, { withAuth: true, withToast: { loading: 'Sending...', success: 'Invitations sent' } })
      await finishOnboarding()
    } finally {
      setSubmitting(false)
    }
  }

  const skip = async () => {
    await finishOnboarding()
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Head>
          <title>Workspace setup - AttendanceX</title>
        </Head>
        <h1 className="text-2xl font-semibold mb-2">Workspace setup</h1>
        <p className="text-sm text-neutral-500 mb-6">Complete the steps to finish configuring your workspace</p>

        <div className="flex gap-2 mb-6 text-xs">
          <span className={`px-2 py-1 rounded-full border ${step==='settings'?'border-blue-500 text-blue-600 dark:text-blue-400':'border-neutral-300 dark:border-neutral-800 text-neutral-500'}`}>1. Settings</span>
          <span className={`px-2 py-1 rounded-full border ${step==='policy'?'border-blue-500 text-blue-600 dark:text-blue-400':'border-neutral-300 dark:border-neutral-800 text-neutral-500'}`}>2. Attendance policy</span>
          <span className={`px-2 py-1 rounded-full border ${step==='invite'?'border-blue-500 text-blue-600 dark:text-blue-400':'border-neutral-300 dark:border-neutral-800 text-neutral-500'}`}>3. Invite team</span>
        </div>

        {step === 'settings' && (
          <div className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })}>
                <option value="" disabled>Select timezone</option>
                {timezones.map(tz => (<option key={tz} value={tz}>{tz}</option>))}
              </Select>
            </div>
            <div>
              <Label htmlFor="locale">Locale</Label>
              <Select id="locale" value={settings.locale} onChange={e => setSettings({ ...settings, locale: e.target.value })}>
                {locales.map(l => (<option key={l} value={l}>{l}</option>))}
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select id="currency" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                {currencies.map(c => (<option key={c} value={c}>{c}</option>))}
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div />
              <div className="flex gap-2">
                {isSuperAdmin && <Button variant="ghost" onClick={skip}>Skip</Button>}
                <Button onClick={saveSettings} disabled={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
              </div>
            </div>
          </div>
        )}

        {step === 'policy' && (
          <div className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div>
              <Label htmlFor="workDays">Work days</Label>
              <Input id="workDays" type="number" min={1} max={7} value={policy.workDays} onChange={e => setPolicy({ ...policy, workDays: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start time</Label>
                <Input id="start" type="time" value={policy.startHour} onChange={e => setPolicy({ ...policy, startHour: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="end">End time</Label>
                <Input id="end" type="time" value={policy.endHour} onChange={e => setPolicy({ ...policy, endHour: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="grace">Grace minutes</Label>
              <Input id="grace" type="number" min={0} max={60} value={policy.graceMinutes} onChange={e => setPolicy({ ...policy, graceMinutes: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={back}>Back</Button>
              <div className="flex gap-2">
                {isSuperAdmin && <Button variant="ghost" onClick={skip}>Skip</Button>}
                <Button onClick={savePolicy} disabled={submitting}>{submitting ? 'Saving...' : 'Continue'}</Button>
              </div>
            </div>
          </div>
        )}

        {step === 'invite' && (
          <div className="space-y-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div>
              <Label htmlFor="emails">Invite by email</Label>
              <Input id="emails" placeholder="alice@acme.com, bob@acme.com" value={invites} onChange={e => setInvites(e.target.value)} />
              <p className="text-xs text-neutral-500 mt-1">Comma-separated list</p>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={back}>Back</Button>
              <div className="flex gap-2">
                {isSuperAdmin && <Button variant="ghost" onClick={skip}>Skip</Button>}
                <Button onClick={sendInvites} disabled={submitting}>{submitting ? 'Finishing...' : 'Finish'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

