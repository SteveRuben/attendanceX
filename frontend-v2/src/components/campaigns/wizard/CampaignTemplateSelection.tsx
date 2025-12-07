import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CampaignWizardData, EmailTemplate } from '../types'
import { FileEdit, Check } from 'lucide-react'

interface CampaignTemplateSelectionProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Template',
    description: 'Start from scratch with a clean slate',
    category: 'custom',
    htmlContent: '',
    variables: [],
    isDefault: true,
  },
  {
    id: 'newsletter-modern',
    name: 'Modern Newsletter',
    description: 'Clean, modern layout for weekly updates',
    category: 'newsletter',
    htmlContent: `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <header style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">{{organizationName}}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your Weekly Newsletter</p>
  </header>
  <main style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin: 0 0 20px;">Hello {{firstName}},</h2>
    <p style="color: #4b5563; line-height: 1.7; margin: 0 0 20px;">We hope this email finds you well. Here are the latest updates from our team.</p>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #1f2937; margin: 0 0 10px;">📌 Highlights</h3>
      <p style="color: #4b5563; margin: 0;">Add your main content here...</p>
    </div>
    <p style="color: #4b5563; line-height: 1.7;">Best regards,<br><strong>The {{organizationName}} Team</strong></p>
  </main>
  <footer style="background: #f9fafb; padding: 20px 30px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">You're receiving this because you're a member of {{organizationName}}.</p>
    <a href="{{unsubscribeLink}}" style="color: #6b7280; font-size: 12px;">Unsubscribe</a>
  </footer>
</div>`,
    variables: [],
  },
  {
    id: 'announcement',
    name: 'Announcement',
    description: 'Bold design for important announcements',
    category: 'announcement',
    htmlContent: `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px 30px; margin-bottom: 20px;">
    <p style="color: #92400e; margin: 0; font-weight: 600;">📢 Important Announcement</p>
  </div>
  <main style="padding: 20px 30px;">
    <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 20px;">Hello {{firstName}},</h1>
    <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">We have an important update to share with you.</p>
    <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin: 25px 0;">
      <p style="color: #1f2937; font-size: 16px; margin: 0;">Your announcement content goes here...</p>
    </div>
    <p style="color: #4b5563;">If you have any questions, please don't hesitate to reach out.</p>
    <p style="color: #4b5563; margin-top: 30px;">Best,<br>{{organizationName}}</p>
  </main>
</div>`,
    variables: [],
  },
  {
    id: 'event-reminder',
    name: 'Event Reminder',
    description: 'Perfect for event invitations and reminders',
    category: 'reminder',
    htmlContent: `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <header style="background: #10b981; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <p style="color: rgba(255,255,255,0.9); margin: 0 0 5px; font-size: 14px;">📅 EVENT REMINDER</p>
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Don't Miss Out!</h1>
  </header>
  <main style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="color: #4b5563; font-size: 16px;">Hi {{firstName}},</p>
    <p style="color: #4b5563; line-height: 1.7;">This is a friendly reminder about the upcoming event.</p>
    <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #065f46; margin: 0 0 10px;">Event Details</h3>
      <p style="color: #047857; margin: 5px 0;"><strong>📍 Location:</strong> [Add location]</p>
      <p style="color: #047857; margin: 5px 0;"><strong>🕐 Time:</strong> [Add time]</p>
    </div>
    <p style="color: #4b5563;">See you there!</p>
  </main>
</div>`,
    variables: [],
  },
]

export function CampaignTemplateSelection({ data, onChange }: CampaignTemplateSelectionProps) {
  const [selectedId, setSelectedId] = useState<string>(data.templateId || 'blank')

  const handleSelect = (template: EmailTemplate) => {
    setSelectedId(template.id)
    onChange({
      templateId: template.id === 'blank' ? undefined : template.id,
      useTemplate: template.id !== 'blank',
      content: {
        ...data.content,
        htmlContent: template.htmlContent,
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Choose a Template</h2>
        <p className="text-neutral-500">Select a template to get started or create from scratch</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_TEMPLATES.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedId === template.id
                ? 'ring-2 ring-blue-500 border-blue-500'
                : 'hover:border-neutral-400'
            }`}
            onClick={() => handleSelect(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {selectedId === template.id && (
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-xs">✓</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 mb-3">{template.description}</p>
              <div className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                {template.id === 'blank' ? (
                  <div className="h-full flex items-center justify-center text-neutral-400">
                    <FileEdit className="h-8 w-8" />
                  </div>
                ) : (
                  <div
                    className="h-full overflow-hidden p-2 transform scale-[0.3] origin-top-left"
                    style={{ width: '333%', height: '333%' }}
                    dangerouslySetInnerHTML={{ __html: template.htmlContent }}
                  />
                )}
              </div>
              <span className="inline-block mt-3 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs text-neutral-600 dark:text-neutral-400 capitalize">
                {template.category}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

