import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CampaignWizardData } from '../types'
import { Send, Calendar, AlertTriangle } from 'lucide-react'

interface CampaignSchedulingProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

export function CampaignScheduling({ data, onChange }: CampaignSchedulingProps) {
  const updateScheduling = (updates: Partial<CampaignWizardData['scheduling']>) => {
    onChange({ scheduling: { ...data.scheduling, ...updates } })
  }

  const updateOptions = (updates: Partial<CampaignWizardData['options']>) => {
    onChange({ options: { ...data.options, ...updates } })
  }

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Schedule Your Campaign</h2>
        <p className="text-neutral-500">Choose when to send your campaign</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => updateScheduling({ type: 'immediate' })}
          className={`p-6 rounded-lg border-2 text-left transition-all ${
            data.scheduling.type === 'immediate'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
          }`}
        >
          <Send className="h-8 w-8 mb-3 text-blue-600" />
          <h3 className="font-semibold text-lg mb-1">Send Immediately</h3>
          <p className="text-sm text-neutral-500">Your campaign will be sent right after you confirm</p>
        </button>
        <button
          onClick={() => updateScheduling({ type: 'scheduled' })}
          className={`p-6 rounded-lg border-2 text-left transition-all ${
            data.scheduling.type === 'scheduled'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
          }`}
        >
          <Calendar className="h-8 w-8 mb-3 text-blue-600" />
          <h3 className="font-semibold text-lg mb-1">Schedule for Later</h3>
          <p className="text-sm text-neutral-500">Choose a specific date and time to send</p>
        </button>
      </div>

      {data.scheduling.type === 'scheduled' && (
        <Card>
          <CardHeader><CardTitle>Schedule Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  min={minDateTime}
                  value={data.scheduling.scheduledAt || ''}
                  onChange={e => updateScheduling({ scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={data.scheduling.timezone || 'UTC'}
                  onChange={e => updateScheduling({ timezone: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {data.scheduling.scheduledAt && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Scheduled for: {new Date(data.scheduling.scheduledAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Tracking & Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={data.options.trackOpens}
              onCheckedChange={val => updateOptions({ trackOpens: !!val })}
            />
            <div>
              <span className="text-sm font-medium">Track email opens</span>
              <p className="text-xs text-neutral-500">See how many recipients open your email</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={data.options.trackClicks}
              onCheckedChange={val => updateOptions({ trackClicks: !!val })}
            />
            <div>
              <span className="text-sm font-medium">Track link clicks</span>
              <p className="text-xs text-neutral-500">See which links recipients click</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={data.options.enableUnsubscribe}
              onCheckedChange={val => updateOptions({ enableUnsubscribe: !!val })}
            />
            <div>
              <span className="text-sm font-medium">Include unsubscribe link</span>
              <p className="text-xs text-neutral-500">Recommended for compliance</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {data.scheduling.type === 'immediate' && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Sending Immediately</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Once you confirm, your campaign will be sent immediately to all selected recipients.
                  Make sure to preview your email before sending.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

