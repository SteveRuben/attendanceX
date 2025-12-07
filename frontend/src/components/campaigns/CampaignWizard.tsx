import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { CampaignWizardData, DEFAULT_WIZARD_DATA } from './types'
import { CampaignBasicInfo } from './wizard/CampaignBasicInfo'
import { CampaignTemplateSelection } from './wizard/CampaignTemplateSelection'
import { CampaignContentEditor } from './wizard/CampaignContentEditor'
import { CampaignRecipientSelection } from './wizard/CampaignRecipientSelection'
import { CampaignScheduling } from './wizard/CampaignScheduling'
import { CampaignPreview } from './wizard/CampaignPreview'
import { createCampaign, scheduleCampaign, sendCampaign, CreateCampaignPayload, sendTestPreviewEmail } from '@/services/campaignService'

const STEPS = [
  { id: 'basic', title: 'Campaign Info', step: 1 },
  { id: 'template', title: 'Template', step: 2 },
  { id: 'content', title: 'Content', step: 3 },
  { id: 'recipients', title: 'Recipients', step: 4 },
  { id: 'scheduling', title: 'Schedule', step: 5 },
  { id: 'preview', title: 'Preview & Send', step: 6 },
]

interface CampaignWizardProps {
  onComplete?: (campaignId: string) => void
  onCancel?: () => void
}

export function CampaignWizard({ onComplete, onCancel }: CampaignWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<CampaignWizardData>(DEFAULT_WIZARD_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateData = useCallback((updates: Partial<CampaignWizardData>) => {
    setData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }, [])

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {}
    switch (STEPS[stepIndex].id) {
      case 'basic':
        if (!data.name.trim()) newErrors.name = 'Campaign name is required'
        if (!data.subject.trim()) newErrors.subject = 'Email subject is required'
        break
      case 'content':
        if (!data.content.htmlContent?.trim()) newErrors.content = 'Email content is required'
        break
      case 'recipients':
        if (data.recipients.type === 'manual' && (!data.recipients.manualEmails || data.recipients.manualEmails.length === 0)) {
          newErrors.recipients = 'At least one recipient is required'
        }
        break
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const goNext = () => {
    if (validateStep(currentStep) && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const goToStep = (index: number) => {
    if (index < currentStep) setCurrentStep(index)
    else if (index === currentStep + 1 && validateStep(currentStep)) setCurrentStep(index)
  }

  const buildRecipientCriteria = () => {
    const baseCriteria = {
      excludeUnsubscribed: data.recipients.criteria?.excludeUnsubscribed ?? true,
      includeInactive: data.recipients.criteria?.includeInactive ?? false,
    }

    if (data.recipients.type === 'all') {
      return {
        ...baseCriteria,
        roles: ['user'],
      }
    }

    if (data.recipients.type === 'criteria') {
      return {
        ...baseCriteria,
        roles: data.recipients.criteria?.roles?.length ? data.recipients.criteria.roles : ['user'],
        departments: data.recipients.criteria?.departments?.length ? data.recipients.criteria.departments : undefined,
      }
    }

    return {
      ...baseCriteria,
      roles: ['user'],
    }
  }

  const handleSendTestEmail = async (email: string): Promise<boolean> => {
    try {
      const payload: CreateCampaignPayload = {
        name: data.name || 'Test Campaign',
        type: data.type,
        subject: data.subject,
        content: {
          htmlContent: data.content.htmlContent,
          textContent: data.content.textContent || undefined,
        },
        recipientCriteria: buildRecipientCriteria(),
        tags: data.tags.length > 0 ? data.tags : undefined,
      }
      await sendTestPreviewEmail(payload, [email])
      return true
    } catch (error) {
      console.error('Failed to send test email:', error)
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    setIsSubmitting(true)
    try {
      const payload: CreateCampaignPayload = {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: {
          htmlContent: data.content.htmlContent,
          textContent: data.content.textContent || undefined,
        },
        recipientCriteria: buildRecipientCriteria(),
        tags: data.tags.length > 0 ? data.tags : undefined,
      }
      const campaign = await createCampaign(payload)
      if (data.scheduling.type === 'scheduled' && data.scheduling.scheduledAt) {
        await scheduleCampaign(campaign.id, data.scheduling.scheduledAt)
      } else if (data.scheduling.type === 'immediate') {
        await sendCampaign(campaign.id)
      }
      onComplete?.(campaign.id)
      router.push('/app/campaigns')
    } catch (error) {
      console.error('Failed to create campaign:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return <CampaignBasicInfo data={data} onChange={updateData} errors={errors} />
      case 'template':
        return <CampaignTemplateSelection data={data} onChange={updateData} />
      case 'content':
        return <CampaignContentEditor data={data} onChange={updateData} errors={errors} />
      case 'recipients':
        return <CampaignRecipientSelection data={data} onChange={updateData} errors={errors} />
      case 'scheduling':
        return <CampaignScheduling data={data} onChange={updateData} />
      case 'preview':
        return <CampaignPreview data={data} onSendTestEmail={handleSendTestEmail} />
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-1 p-4 overflow-x-auto">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isClickable = index <= currentStep
            return (
              <button
                key={step.id}
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50'
                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-current/10 text-xs">
                  {isCompleted ? '✓' : step.step}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">{renderStepContent()}</div>

      <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex items-center justify-between sticky bottom-0">
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={goBack}>Back</Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={goNext}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : data.scheduling.type === 'immediate' ? 'Send Now' : 'Schedule Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

