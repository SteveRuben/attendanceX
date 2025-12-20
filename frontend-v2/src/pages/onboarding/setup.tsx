import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Circle, ArrowRight, Users, Settings, Clock, Building, Sparkles } from 'lucide-react'

import { apiClient } from '@/services/apiClient'
import { getOnboardingStatus, markOnboardingComplete } from '@/services/tenantService'
import { useAuthZ } from '@/hooks/use-authz'
import { useTenant } from '@/contexts/TenantContext'

type OnboardingStepId = 'welcome' | 'organization_profile' | 'settings' | 'attendance_policy' | 'user_invitations' | 'completion'

interface OnboardingStepData {
  id: OnboardingStepId
  title: string
  description: string
  completed: boolean
  required: boolean
  order: number
  url: string
}

interface OnboardingStatus {
  completed: boolean
  currentStep: number
  totalSteps: number
  completedSteps: string[]
  steps: OnboardingStepData[]
  nextStep?: OnboardingStepData
  nextStepUrl?: string
}

export default function TenantSetup() {
  const router = useRouter()
  const { status } = useSession()
  const { isSuperAdmin } = useAuthZ()
  const { refreshTenants, selectTenant } = useTenant()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [currentStepId, setCurrentStepId] = useState<OnboardingStepId>('welcome')
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  const timezones = useMemo(() => {
    const s = (Intl as any).supportedValuesOf
    return typeof s === 'function' ? (s('timeZone') as string[]) : ['UTC','Africa/Lagos','Africa/Nairobi','Europe/London','Europe/Paris','America/New_York','Asia/Kolkata']
  }, [])
  const locales = useMemo(() => ['en-US','en-GB','fr-FR','de-DE','es-ES','pt-PT'], [])
  const currencies = useMemo(() => ['USD','EUR','GBP','NGN','GHS','KES','ZAR','XOF','XAF','INR','JPY','CNY'], [])
  const industries = useMemo(() => [
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'government', label: 'Government' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'other', label: 'Other' }
  ], [])

  const detectedTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  // Form states for each step
  const [organizationData, setOrganizationData] = useState({ 
    name: '', 
    industry: '', 
    size: '',
    description: ''
  })
  const [settings, setSettings] = useState({ 
    timezone: '', 
    locale: 'en-US', 
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm'
  })
  const [policy, setPolicy] = useState<{
    workDays: string;
    startHour: string;
    endHour: string;
    graceMinutes: number;
  }>({ 
    workDays: 'Mon-Fri', 
    startHour: '09:00', 
    endHour: '17:00', 
    graceMinutes: 15 
  })
  const [invites, setInvites] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchOnboardingStatus = async (id: string) => {
    try {
      const response = await apiClient.get(`/tenants/${id}/onboarding-status`, { withAuth: true })
      console.log(response);
      const status = response as OnboardingStatus
      setOnboardingStatus(status)
      
      if (status.completed) {
        router.replace('/app')
        return
      }

      // Déterminer l'étape actuelle
      if (status.nextStep) {
        setCurrentStepId(status.nextStep.id)
      } else {
        // Trouver la première étape non complétée
        const nextStep = status.steps.find(step => !step.completed)
        if (nextStep) {
          setCurrentStepId(nextStep.id)
        }
      }

      // Initialiser les données avec les valeurs détectées
      setSettings(s => ({ ...s, timezone: detectedTz }))
      
      // Récupérer les données existantes du tenant pour pré-remplir les formulaires
      await fetchTenantData(id)
    } catch (error) {
      console.error('Error fetching onboarding status:', error)
    }
  }

  const fetchTenantData = async (id: string) => {
    try {
      // Récupérer les informations du tenant pour pré-remplir les données
      const tenantResponse = await apiClient.get(`/tenants/${id}`, { withAuth: true })
      if (tenantResponse) {
        // Pré-remplir les données d'organisation si elles existent
        if (tenantResponse.name) {
          setOrganizationData(prev => ({ ...prev, name: tenantResponse.name }))
        }
        if (tenantResponse.industry) {
          setOrganizationData(prev => ({ ...prev, industry: tenantResponse.industry }))
        }
        if (tenantResponse.size) {
          setOrganizationData(prev => ({ ...prev, size: tenantResponse.size }))
        }
        if (tenantResponse.description) {
          setOrganizationData(prev => ({ ...prev, description: tenantResponse.description }))
        }
        
        // Pré-remplir les settings si ils existent
        if (tenantResponse.settings) {
          const { timezone, locale, currency, dateFormat, timeFormat } = tenantResponse.settings
          setSettings(prev => ({
            ...prev,
            ...(timezone && { timezone }),
            ...(locale && { locale }),
            ...(currency && { currency }),
            ...(dateFormat && { dateFormat }),
            ...(timeFormat && { timeFormat })
          }))
        }
      }
    } catch (error) {
      // Pas grave si on ne peut pas récupérer les données, on utilisera les valeurs par défaut
      console.log('Could not fetch tenant data for pre-filling:', error)
    }
  }

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
        await fetchOnboardingStatus(id)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router, router.query.tenantId, detectedTz])

  if (status !== 'authenticated' || loading || !tenantId || !onboardingStatus) return null

  const currentStep = onboardingStatus.steps.find(step => step.id === currentStepId)
  const currentStepIndex = onboardingStatus.steps.findIndex(step => step.id === currentStepId)
  
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < onboardingStatus.steps.length) {
      setCurrentStepId(onboardingStatus.steps[nextIndex].id)
    }
  }

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStepId(onboardingStatus.steps[prevIndex].id)
    }
  }

  const completeWelcome = async () => {
    setSubmitting(true)
    try {
      await apiClient.post(`/tenants/${tenantId}/onboarding/steps/welcome/complete`, {}, { withAuth: true })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const saveOrganizationProfile = async () => {
    setSubmitting(true)
    try {
      await apiClient.put(`/tenants/${tenantId}/settings`, { 
        settings: {
          name: organizationData.name,
          industry: organizationData.industry,
          size: organizationData.size,
          description: organizationData.description
        }
      }, { withAuth: true, withToast: { loading: 'Saving organization profile...', success: 'Organization profile saved' } })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const saveSettings = async () => {
    setSubmitting(true)
    try {
      await apiClient.put(`/tenants/${tenantId}/settings`, { settings }, { withAuth: true, withToast: { loading: 'Saving settings...', success: 'Settings saved' } })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const savePolicy = async () => {
    setSubmitting(true)
    try {
      // Utiliser le timezone des settings au lieu de demander à nouveau
      const policyWithTimezone = {
        ...policy,
        timezone: settings.timezone || detectedTz
      }
      await apiClient.put(`/tenants/${tenantId}/settings/attendance`, policyWithTimezone, { withAuth: true, withToast: { loading: 'Saving attendance policy...', success: 'Attendance policy saved' } })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const sendInvites = async () => {
    setSubmitting(true)
    try {
      const emails = invites.split(',').map(s => s.trim()).filter(Boolean)
      if (emails.length) {
        const invitations = emails.map(email => ({ email, tenantId: tenantId! }))
        await apiClient.post('/user-invitations/bulk-invite', { 
          invitations,
          sendWelcomeEmail: true 
        }, { withAuth: true, withToast: { loading: 'Sending invitations...', success: 'Invitations sent' } })
      }
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const finishOnboarding = async () => {
    setSubmitting(true)
    try {
      await markOnboardingComplete(tenantId!)
      await refreshTenants()
      if (tenantId) {
        await selectTenant(tenantId)
      }
      router.replace('/app')
    } finally {
      setSubmitting(false)
    }
  }

  const skipOptionalStep = async () => {
    goToNextStep()
  }

  const getStepIcon = (stepId: OnboardingStepId) => {
    switch (stepId) {
      case 'welcome': return <Sparkles className="w-4 h-4" />
      case 'organization_profile': return <Building className="w-4 h-4" />
      case 'settings': return <Settings className="w-4 h-4" />
      case 'attendance_policy': return <Clock className="w-4 h-4" />
      case 'user_invitations': return <Users className="w-4 h-4" />
      case 'completion': return <CheckCircle className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-white relative">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Head>
          <title>Workspace Setup - AttendanceX</title>
        </Head>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to AttendanceX</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Let's set up your workspace in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Step {onboardingStatus.currentStep} of {onboardingStatus.totalSteps}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round((onboardingStatus.completedSteps.length / onboardingStatus.totalSteps) * 100)}% Complete
            </span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {onboardingStatus.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  step.completed 
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' 
                    : step.id === currentStepId
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
                }`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : getStepIcon(step.id)}
                  <span className="font-medium">{step.title}</span>
                  {!step.required && <span className="text-xs opacity-60">(Optional)</span>}
                </div>
                {index < onboardingStatus.steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Welcome Step */}
        {currentStepId === 'welcome' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Welcome to AttendanceX
              </CardTitle>
              <CardDescription>
                Let's get your organization set up for success with our attendance management platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-medium">Team Management</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Invite and manage your team members</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-medium">Attendance Tracking</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Track attendance with multiple methods</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Settings className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <h3 className="font-medium">Customizable</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Configure policies to fit your needs</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={completeWelcome} disabled={submitting}>
                  {submitting ? 'Loading...' : 'Get Started'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Profile Step */}
        {currentStepId === 'organization_profile' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" />
                Organization Profile
              </CardTitle>
              <CardDescription>
                Tell us about your organization to help us customize your experience.
                {organizationData.name && (
                  <span className="block text-sm text-green-600 dark:text-green-400 mt-1">
                    ✓ Some information has been pre-filled from your workspace creation
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input 
                  id="orgName" 
                  placeholder="Enter your organization name"
                  value={organizationData.name} 
                  onChange={e => setOrganizationData({ ...organizationData, name: e.target.value })} 
                />
              </div>
              
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  id="industry" 
                  value={organizationData.industry} 
                  onChange={e => setOrganizationData({ ...organizationData, industry: e.target.value })}
                >
                  <option value="" disabled>Select your industry</option>
                  {industries.map(industry => (
                    <option key={industry.value} value={industry.value}>{industry.label}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Organization Size</Label>
                <Select 
                  id="size" 
                  value={organizationData.size} 
                  onChange={e => setOrganizationData({ ...organizationData, size: e.target.value })}
                >
                  <option value="" disabled>Select organization size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  placeholder="Brief description of your organization"
                  value={organizationData.description} 
                  onChange={e => setOrganizationData({ ...organizationData, description: e.target.value })} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={goToPreviousStep} disabled={currentStepIndex === 0}>
                  Back
                </Button>
                <Button 
                  onClick={saveOrganizationProfile} 
                  disabled={submitting || !organizationData.name || !organizationData.industry || !organizationData.size}
                >
                  {submitting ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Step */}
        {currentStepId === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure your timezone, language, and regional preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select id="timezone" value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })}>
                  <option value="" disabled>Select timezone</option>
                  {timezones.map(tz => (<option key={tz} value={tz}>{tz}</option>))}
                </Select>
              </div>
              <div>
                <Label htmlFor="locale">Language & Locale</Label>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select id="dateFormat" value={settings.dateFormat} onChange={e => setSettings({ ...settings, dateFormat: e.target.value })}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select id="timeFormat" value={settings.timeFormat} onChange={e => setSettings({ ...settings, timeFormat: e.target.value })}>
                    <option value="HH:mm">24-hour (HH:mm)</option>
                    <option value="hh:mm A">12-hour (hh:mm AM/PM)</option>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={saveSettings} disabled={submitting || !settings.timezone}>
                  {submitting ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Policy Step */}
        {currentStepId === 'attendance_policy' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Attendance Policy
              </CardTitle>
              <CardDescription>
                Set up your work schedule and attendance rules. You can modify these later.
                <br />
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Using timezone: {settings.timezone || detectedTz}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workDays">Work Days</Label>
                <Select 
                  id="workDays" 
                  value={policy.workDays} 
                  onChange={e => setPolicy({ ...policy, workDays: e.target.value })}
                >
                  <option value="Mon-Fri">Monday - Friday</option>
                  <option value="Mon-Sat">Monday - Saturday</option>
                  <option value="Mon-Sun">Monday - Sunday</option>
                  <option value="Tue-Sat">Tuesday - Saturday</option>
                  <option value="Custom">Custom</option>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start">Work Start Time</Label>
                  <Input id="start" type="time" value={policy.startHour} onChange={e => setPolicy({ ...policy, startHour: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="end">Work End Time</Label>
                  <Input id="end" type="time" value={policy.endHour} onChange={e => setPolicy({ ...policy, endHour: e.target.value })} />
                </div>
              </div>
              
              <div>
                <Label htmlFor="grace">Grace Period (minutes)</Label>
                <Select 
                  id="grace" 
                  value={policy.graceMinutes.toString()} 
                  onChange={e => setPolicy({ ...policy, graceMinutes: Number(e.target.value) })}
                >
                  <option value="0">No grace period</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </Select>
                <p className="text-xs text-neutral-500 mt-1">
                  Allow employees to check in this many minutes late without being marked as late
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={goToPreviousStep}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={skipOptionalStep}>
                    Skip for Now
                  </Button>
                  <Button onClick={savePolicy} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Invitations Step */}
        {currentStepId === 'user_invitations' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Invite Your Team
              </CardTitle>
              <CardDescription>
                Invite team members to join your organization. You can always add more people later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emails">Email Addresses</Label>
                <textarea
                  id="emails"
                  className="w-full min-h-[120px] p-3 border border-neutral-300 dark:border-neutral-700 rounded-md resize-none"
                  placeholder="Enter email addresses, one per line or comma-separated:&#10;alice@company.com&#10;bob@company.com&#10;charlie@company.com"
                  value={invites}
                  onChange={e => setInvites(e.target.value)}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Enter one email per line or separate multiple emails with commas
                </p>
              </div>
              
              {invites.trim() && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Ready to invite {invites.split(/[,\n]/).map(s => s.trim()).filter(Boolean).length} team member(s)
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={goToPreviousStep}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={skipOptionalStep}>
                    Skip for Now
                  </Button>
                  <Button onClick={sendInvites} disabled={submitting}>
                    {submitting ? 'Sending Invites...' : 'Send Invitations'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Step */}
        {currentStepId === 'completion' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Setup Complete!
              </CardTitle>
              <CardDescription>
                Congratulations! Your workspace is ready to use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Welcome to AttendanceX!</h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Your organization is now set up and ready to track attendance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Next Steps:</h4>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Explore your dashboard</li>
                    <li>• Create your first event</li>
                    <li>• Set up attendance methods</li>
                    <li>• Invite more team members</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Need Help?</h4>
                  <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>• Check our documentation</li>
                    <li>• Watch tutorial videos</li>
                    <li>• Contact support</li>
                    <li>• Join our community</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={goToPreviousStep}>
                  Back
                </Button>
                <Button onClick={finishOnboarding} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? 'Finishing...' : 'Go to Dashboard'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

