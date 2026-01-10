import { CampaignType } from '@/types/campaign.types'

export interface CampaignWizardData {
  name: string
  subject: string
  type: CampaignType
  tags: string[]
  templateId?: string
  useTemplate: boolean
  // Nouvelle section pour les événements
  eventIntegration?: {
    eventId: string
    eventTitle: string
    generateQRCodes: boolean
    generatePINCodes: boolean
  }
  content: {
    htmlContent: string
    textContent?: string
    templateData?: Record<string, any>
  }
  recipients: {
    type: 'all' | 'criteria' | 'list' | 'manual' | 'event_participants'
    criteria?: {
      teams?: string[]
      roles?: string[]
      departments?: string[]
      excludeUnsubscribed: boolean
      includeInactive?: boolean
    }
    recipientListId?: string
    manualEmails?: string[]
    totalCount: number
  }
  scheduling: {
    type: 'immediate' | 'scheduled'
    scheduledAt?: string
    timezone?: string
  }
  options: {
    trackOpens: boolean
    trackClicks: boolean
    enableUnsubscribe: boolean
    testEmails: string[]
  }
}

export interface EmailTemplate {
  id: string
  name: string
  description?: string
  category: 'newsletter' | 'announcement' | 'reminder' | 'promotional' | 'custom'
  thumbnail?: string
  htmlContent: string
  variables: TemplateVariable[]
  isDefault?: boolean
}

export interface TemplateVariable {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'url' | 'image'
  defaultValue?: string
  required?: boolean
  description?: string
}

export const PERSONALIZATION_VARIABLES = [
  { name: 'firstName', label: 'First Name', example: 'John' },
  { name: 'lastName', label: 'Last Name', example: 'Doe' },
  { name: 'email', label: 'Email', example: 'john@example.com' },
  { name: 'fullName', label: 'Full Name', example: 'John Doe' },
  { name: 'organizationName', label: 'Organization', example: 'Acme Inc' },
  { name: 'department', label: 'Department', example: 'Engineering' },
  { name: 'role', label: 'Role', example: 'Developer' },
  { name: 'currentDate', label: 'Current Date', example: new Date().toLocaleDateString() },
  { name: 'unsubscribeLink', label: 'Unsubscribe Link', example: '#' },
]

export const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string }[] = [
  { value: 'newsletter', label: 'Newsletter', description: 'Regular updates and news' },
  { value: 'announcement', label: 'Announcement', description: 'Important announcements' },
  { value: 'reminder', label: 'Reminder', description: 'Event or task reminders' },
  { value: 'promotional', label: 'Promotional', description: 'Promotional content' },
  { value: 'transactional', label: 'Transactional', description: 'Transactional emails' },
  { value: 'event', label: 'Événement', description: 'Notifications liées à un événement avec codes QR/PIN individuels' },
]

export const DEFAULT_WIZARD_DATA: CampaignWizardData = {
  name: '',
  subject: '',
  type: 'newsletter',
  tags: [],
  useTemplate: true,
  content: {
    htmlContent: '',
    textContent: '',
  },
  recipients: {
    type: 'criteria',
    criteria: {
      excludeUnsubscribed: true,
    },
    totalCount: 0,
  },
  scheduling: {
    type: 'immediate',
  },
  options: {
    trackOpens: true,
    trackClicks: true,
    enableUnsubscribe: true,
    testEmails: [],
  },
}

