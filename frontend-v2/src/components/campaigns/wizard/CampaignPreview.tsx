import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CampaignWizardData, PERSONALIZATION_VARIABLES, CAMPAIGN_TYPES } from '../types'
import { Monitor, Smartphone, Send, Calendar, CheckCircle } from 'lucide-react'

interface CampaignPreviewProps {
  data: CampaignWizardData
  onSendTestEmail?: (email: string) => Promise<boolean>
}

type PreviewMode = 'desktop' | 'mobile'

export function CampaignPreview({ data, onSendTestEmail }: CampaignPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testSent, setTestSent] = useState(false)
  const [testError, setTestError] = useState(false)

  const getPreviewHtml = () => {
    let html = data.content.htmlContent
    PERSONALIZATION_VARIABLES.forEach(v => {
      html = html.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.example)
    })
    return html
  }

  const getPreviewSubject = () => {
    let subject = data.subject
    PERSONALIZATION_VARIABLES.forEach(v => {
      subject = subject.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), v.example)
    })
    return subject
  }

  const handleSendTest = async () => {
    if (!testEmail || !onSendTestEmail) return
    setIsSendingTest(true)
    setTestError(false)
    try {
      const success = await onSendTestEmail(testEmail)
      if (success) {
        setTestSent(true)
        setTimeout(() => setTestSent(false), 3000)
      } else {
        setTestError(true)
        setTimeout(() => setTestError(false), 3000)
      }
    } catch {
      setTestError(true)
      setTimeout(() => setTestError(false), 3000)
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Review & Send</h2>
        <p className="text-neutral-500">Preview your campaign before sending</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Email Preview</h3>
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
              {(['desktop', 'mobile'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    previewMode === mode
                      ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {mode === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  <span className="capitalize">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="py-3 px-4 border-b bg-neutral-50 dark:bg-neutral-800">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                </div>
                <div className="text-sm">
                  <p className="text-neutral-500">From: <span className="text-neutral-900 dark:text-white">Your Organization &lt;noreply@example.com&gt;</span></p>
                  <p className="text-neutral-500">Subject: <span className="text-neutral-900 dark:text-white font-medium">{getPreviewSubject()}</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-neutral-100 dark:bg-neutral-900">
              <div
                className={`bg-white dark:bg-neutral-800 mx-auto transition-all duration-300 rounded-lg shadow overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'
                }`}
              >
                {data.content.htmlContent ? (
                  <iframe
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${getPreviewHtml()}</body></html>`}
                    className="w-full h-[400px] border-0"
                    title="Email Preview"
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-neutral-400">No content</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Send Test Email</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendTest}
                  disabled={!testEmail || isSendingTest || !onSendTestEmail}
                  variant={testError ? 'destructive' : testSent ? 'default' : 'default'}
                >
                  {isSendingTest ? 'Sending...' : testSent ? 'Sent!' : testError ? 'Failed' : 'Send Test'}
                </Button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Send a test email to yourself before launching</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Campaign Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Campaign Name</p>
                <p className="font-medium">{data.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Type</p>
                <p className="font-medium">{CAMPAIGN_TYPES.find(t => t.value === data.type)?.label}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Subject</p>
                <p className="font-medium">{data.subject || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Recipients</p>
                <p className="font-medium">
                  {data.recipients.type === 'all' && 'All Members'}
                  {data.recipients.type === 'criteria' && `${data.recipients.totalCount || 0} recipients (filtered)`}
                  {data.recipients.type === 'manual' && `${data.recipients.manualEmails?.length || 0} emails`}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wide">Scheduling</p>
                <p className="font-medium flex items-center gap-1.5">
                  {data.scheduling.type === 'immediate' ? (
                    <><Send className="h-3.5 w-3.5" /> Immediate</>
                  ) : (
                    <><Calendar className="h-3.5 w-3.5" /> {new Date(data.scheduling.scheduledAt || '').toLocaleString()}</>
                  )}
                </p>
              </div>
              {data.tags.length > 0 && (
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {data.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">Ready to Send</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Click the button below to {data.scheduling.type === 'immediate' ? 'send now' : 'schedule'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

