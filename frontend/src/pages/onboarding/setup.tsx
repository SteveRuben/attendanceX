import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useSession, getSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Circle, ArrowRight, Users, Settings, Clock, Building, Sparkles, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

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

  const detectedTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  // Form states for each step
  const [organizationData, setOrganizationData] = useState({ 
    name: '', 
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
  const isFetchingRef = useRef(false)

  const fetchTenantData = useCallback(async (id: string) => {
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      // Récupérer les informations du tenant pour pré-remplir les données
      const tenantResponse = await apiClient.get(`/tenants/${id}`, { 
        withAuth: true,
        accessToken 
      })
      if (tenantResponse) {
        // Pré-remplir les données d'organisation si elles existent
        if (tenantResponse.name) {
          setOrganizationData(prev => ({ ...prev, name: tenantResponse.name }))
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
  }, [])

  const fetchOnboardingStatus = useCallback(async (id: string) => {
    if (isFetchingRef.current) return // Prevent duplicate calls
    
    isFetchingRef.current = true
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      const response = await apiClient.get(`/tenants/${id}/onboarding-status`, { 
        withAuth: true,
        accessToken 
      })
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
      
      // Récupérer les données existantes du tenant pour pré-remplir les formulaires
      await fetchTenantData(id)
    } catch (error) {
      console.error('Error fetching onboarding status:', error)
    } finally {
      isFetchingRef.current = false
    }
  }, [router, fetchTenantData])

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
    
    // Initialize timezone with detected value
    setSettings(s => ({ ...s, timezone: detectedTz }))
    
    ;(async () => {
      try {
        await fetchOnboardingStatus(id)
      } finally {
        setLoading(false)
      }
    })()
  }, [status, router.query.tenantId, detectedTz, fetchOnboardingStatus])

  if (status !== 'authenticated' || loading || !tenantId || !onboardingStatus) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

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
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      await apiClient.post(`/tenants/${tenantId}/onboarding/steps/welcome/complete`, {}, { 
        withAuth: true,
        accessToken 
      })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const saveOrganizationProfile = async () => {
    setSubmitting(true)
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      await apiClient.put(`/tenants/${tenantId}/settings`, { 
        settings: {
          name: organizationData.name,
          description: organizationData.description
        }
      }, { 
        withAuth: true, 
        accessToken,
        withToast: { loading: 'Saving organization profile...', success: 'Organization profile saved' } 
      })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const saveSettings = async () => {
    setSubmitting(true)
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      await apiClient.put(`/tenants/${tenantId}/settings`, { settings }, { 
        withAuth: true, 
        accessToken,
        withToast: { loading: 'Saving settings...', success: 'Settings saved' } 
      })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const savePolicy = async () => {
    setSubmitting(true)
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      // Utiliser le timezone des settings au lieu de demander à nouveau
      const policyWithTimezone = {
        ...policy,
        timezone: settings.timezone || detectedTz
      }
      await apiClient.put(`/tenants/${tenantId}/settings/attendance`, policyWithTimezone, { 
        withAuth: true, 
        accessToken,
        withToast: { loading: 'Saving attendance policy...', success: 'Attendance policy saved' } 
      })
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } finally {
      setSubmitting(false)
    }
  }

  const sendInvites = async () => {
    setSubmitting(true)
    try {
      const session = await getSession()
      const accessToken = (session as any)?.accessToken
      
      const emails = invites.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      if (emails.length) {
        // Optimisation: Traitement par batch pour éviter les timeouts
        const batchSize = 5 // Traiter 5 invitations à la fois
        const batches = []
        
        for (let i = 0; i < emails.length; i += batchSize) {
          batches.push(emails.slice(i, i + batchSize))
        }
        
        let totalSent = 0
        for (const batch of batches) {
          const invitations = batch.map(email => ({ 
            email, 
            firstName: email.split('@')[0] || 'User', // Extract name from email or use default
            lastName: 'User', // Default last name for onboarding invitations
            role: 'user', // Default role for onboarding invitations
            tenantId: tenantId!,
            isOnboardingInvitation: true // Flag pour optimiser le traitement backend
          }))
          
          try {
            await apiClient.post('/user-invitations/bulk-invite', { 
              invitations,
              sendWelcomeEmail: true 
            }, { 
              withAuth: true, 
              accessToken,
              withToast: false, // Désactiver les toasts individuels
              timeout: 30000 // Timeout de 30 secondes par batch
            })
            totalSent += batch.length
          } catch (error) {
            console.error(`Error sending batch of ${batch.length} invitations:`, error)
            // Continuer avec les autres batches même si un échoue
          }
        }
        
        if (totalSent > 0) {
          // Toast de succès global
          console.log(`Successfully sent ${totalSent} out of ${emails.length} invitations`)
        }
      }
      await fetchOnboardingStatus(tenantId)
      goToNextStep()
    } catch (error) {
      console.error('Error in sendInvites:', error)
      // Ne pas bloquer l'onboarding même si les invitations échouent
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
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 relative">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Head>
          <title>Workspace Setup - AttendanceX</title>
        </Head>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">Welcome to AttendanceX</h1>
          <p className="text-slate-600 dark:text-slate-400">Let&apos;s set up your workspace in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Step {onboardingStatus.currentStep} of {onboardingStatus.totalSteps}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-500">
              {Math.round((onboardingStatus.completedSteps.length / onboardingStatus.totalSteps) * 100)}% Complete
            </span>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {onboardingStatus.steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                <div className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium
                  transition-all duration-200
                  ${step.completed 
                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 text-green-700 dark:text-green-400 shadow-sm' 
                    : step.id === currentStepId
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 text-blue-700 dark:text-blue-400 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }
                `}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : getStepIcon(step.id)}
                  <span>{step.title}</span>
                  {!step.required && <span className="text-xs opacity-70">(Optional)</span>}
                </div>
                {index < onboardingStatus.steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Welcome Step */}
        {currentStepId === 'welcome' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Welcome to AttendanceX
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Let&apos;s get your organization set up for success with our attendance management platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="group relative text-center p-6 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative inline-flex p-4 mb-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Team Management</h3>
                  <p className="relative text-sm text-slate-600 dark:text-slate-400">Invite and manage your team members</p>
                </div>
                <div className="group relative text-center p-6 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative inline-flex p-4 mb-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Attendance Tracking</h3>
                  <p className="relative text-sm text-slate-600 dark:text-slate-400">Track attendance with multiple methods</p>
                </div>
                <div className="group relative text-center p-6 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative inline-flex p-4 mb-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Customizable</h3>
                  <p className="relative text-sm text-slate-600 dark:text-slate-400">Configure policies to fit your needs</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={completeWelcome} 
                  disabled={submitting}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Profile Step */}
        {currentStepId === 'organization_profile' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Organization Profile
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Tell us about your organization. This information helps us set up your event management workspace.
                {organizationData.name && (
                  <span className="block text-sm text-green-600 dark:text-green-400 mt-1">
                    ✓ Some information has been pre-filled from your workspace creation
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Organization Name
                </Label>
                <Input 
                  id="orgName" 
                  placeholder="Enter your organization name"
                  value={organizationData.name} 
                  onChange={e => setOrganizationData({ ...organizationData, name: e.target.value })}
                  className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description (Optional)
                </Label>
                <Input 
                  id="description" 
                  placeholder="Brief description of your organization"
                  value={organizationData.description} 
                  onChange={e => setOrganizationData({ ...organizationData, description: e.target.value })}
                  className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                />
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={goToPreviousStep} 
                  disabled={currentStepIndex === 0}
                  className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                >
                  Back
                </Button>
                <Button 
                  onClick={saveOrganizationProfile} 
                  disabled={submitting || !organizationData.name}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Step */}
        {currentStepId === 'settings' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                System Settings
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Configure your timezone, language, and regional preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Timezone
                </Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="locale" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Language & Locale
                </Label>
                <Select value={settings.locale} onValueChange={(value) => setSettings({ ...settings, locale: value })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Currency
                </Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Date Format
                  </Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}>
                    <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Time Format
                  </Label>
                  <Select value={settings.timeFormat} onValueChange={(value) => setSettings({ ...settings, timeFormat: value })}>
                    <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HH:mm">24-hour (HH:mm)</SelectItem>
                      <SelectItem value="hh:mm A">12-hour (hh:mm AM/PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={goToPreviousStep}
                  className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                >
                  Back
                </Button>
                <Button 
                  onClick={saveSettings} 
                  disabled={submitting || !settings.timezone}
                  className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Policy Step */}
        {currentStepId === 'attendance_policy' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Attendance Policy
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Set up your work schedule and attendance rules. You can modify these later.
                <br />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1 inline-block">
                  Using timezone: {settings.timezone || detectedTz}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="workDays" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Work Days
                </Label>
                <Select value={policy.workDays} onValueChange={(value) => setPolicy({ ...policy, workDays: value })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                    <SelectValue placeholder="Select work days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mon-Fri">Monday - Friday</SelectItem>
                    <SelectItem value="Mon-Sat">Monday - Saturday</SelectItem>
                    <SelectItem value="Mon-Sun">Monday - Sunday</SelectItem>
                    <SelectItem value="Tue-Sat">Tuesday - Saturday</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Work Start Time
                  </Label>
                  <Input 
                    id="start" 
                    type="time" 
                    value={policy.startHour} 
                    onChange={e => setPolicy({ ...policy, startHour: e.target.value })}
                    className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Work End Time
                  </Label>
                  <Input 
                    id="end" 
                    type="time" 
                    value={policy.endHour} 
                    onChange={e => setPolicy({ ...policy, endHour: e.target.value })}
                    className="h-12 px-4 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grace" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Grace Period (minutes)
                </Label>
                <Select value={policy.graceMinutes.toString()} onValueChange={(value) => setPolicy({ ...policy, graceMinutes: Number(value) })}>
                  <SelectTrigger className="h-12 rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500">
                    <SelectValue placeholder="Select grace period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No grace period</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Allow employees to check in this many minutes late without being marked as late
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={goToPreviousStep}
                  className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={skipOptionalStep}
                    className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                  >
                    Skip for Now
                  </Button>
                  <Button 
                    onClick={savePolicy} 
                    disabled={submitting}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Invitations Step */}
        {currentStepId === 'user_invitations' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Invite Your Team
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Invite team members to join your organization. You can always add more people later.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emails" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Addresses
                </Label>
                <Textarea
                  id="emails"
                  className="min-h-[120px] resize-none rounded-lg border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-200"
                  placeholder="Enter email addresses, one per line or comma-separated:&#10;alice@company.com&#10;bob@company.com&#10;charlie@company.com"
                  value={invites}
                  onChange={e => setInvites(e.target.value)}
                />
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Enter one email per line or separate multiple emails with commas
                </p>
              </div>
              
              {invites.trim() && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Ready to invite {invites.split(/[,\n]/).map(s => s.trim()).filter(Boolean).length} team member(s)
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={goToPreviousStep}
                  className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={skipOptionalStep}
                    className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                  >
                    Skip for Now
                  </Button>
                  <Button 
                    onClick={sendInvites} 
                    disabled={submitting}
                    className="h-12 px-8 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Invites...
                      </>
                    ) : (
                      'Send Invitations'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Step */}
        {currentStepId === 'completion' && (
          <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                Setup Complete!
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Congratulations! Your workspace is ready to use.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Welcome to AttendanceX!</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  Your organization is now set up and ready to track attendance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors duration-200">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Next Steps:
                  </h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">•</span>
                      <span>Explore your dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">•</span>
                      <span>Create your first event</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">•</span>
                      <span>Set up attendance methods</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400">•</span>
                      <span>Invite more team members</span>
                    </li>
                  </ul>
                </div>
                <div className="p-6 border-2 border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors duration-200">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Need Help?
                  </h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Check our documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Watch tutorial videos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Contact support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 dark:text-purple-400">•</span>
                      <span>Join our community</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="ghost" 
                  onClick={goToPreviousStep}
                  className="h-12 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium rounded-lg transition-colors duration-200"
                >
                  Back
                </Button>
                <Button 
                  onClick={finishOnboarding} 
                  disabled={submitting} 
                  className="h-12 px-8 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    'Go to Dashboard'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

