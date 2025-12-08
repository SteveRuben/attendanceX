import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CampaignWizardData } from '../types'
import { previewRecipients } from '@/services/campaignService'
import { Users, Target, PenLine, BarChart3 } from 'lucide-react'

interface CampaignRecipientSelectionProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
  errors?: Record<string, string>
}

const AVAILABLE_ROLES = ['Admin', 'Manager', 'Employee', 'Contractor', 'Guest']
const AVAILABLE_DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support']

export function CampaignRecipientSelection({ data, onChange, errors }: CampaignRecipientSelectionProps) {
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const updateCriteria = (key: string, value: any) => {
    onChange({
      recipients: {
        ...data.recipients,
        criteria: { ...data.recipients.criteria, [key]: value },
      },
    })
  }

  const toggleArrayItem = (key: 'roles' | 'departments', item: string) => {
    const current = data.recipients.criteria?.[key] || []
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateCriteria(key, updated.length > 0 ? updated : undefined)
  }

  useEffect(() => {
    const fetchPreview = async () => {
      if (data.recipients.type !== 'criteria') return
      setIsLoading(true)
      try {
        const result = await previewRecipients(data.recipients.criteria, 5)
        setPreviewCount(result.totalCount)
        onChange({ recipients: { ...data.recipients, totalCount: result.totalCount } })
      } catch (e) {
        setPreviewCount(null)
      } finally {
        setIsLoading(false)
      }
    }
    const timer = setTimeout(fetchPreview, 500)
    return () => clearTimeout(timer)
  }, [data.recipients.criteria])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Select Recipients</h2>
        <p className="text-neutral-500">Choose who will receive this campaign</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { type: 'all', label: 'All Members', icon: Users, desc: 'Send to everyone in your organization' },
          { type: 'criteria', label: 'By Criteria', icon: Target, desc: 'Filter by role, department, etc.' },
          { type: 'manual', label: 'Manual Entry', icon: PenLine, desc: 'Enter specific email addresses' },
        ].map(opt => (
          <button
            key={opt.type}
            onClick={() => onChange({ recipients: { ...data.recipients, type: opt.type as any } })}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              data.recipients.type === opt.type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <opt.icon className="h-6 w-6 mb-2 text-blue-600" />
            <h3 className="font-medium">{opt.label}</h3>
            <p className="text-sm text-neutral-500 mt-1">{opt.desc}</p>
          </button>
        ))}
      </div>

      {data.recipients.type === 'criteria' && (
        <>
          <Card>
            <CardHeader><CardTitle>Filter by Role</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_ROLES.map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={data.recipients.criteria?.roles?.includes(role) || false}
                      onCheckedChange={() => toggleArrayItem('roles', role)}
                    />
                    <span className="text-sm">{role}</span>
                  </label>
                ))}
              </div>
              {!data.recipients.criteria?.roles?.length && (
                <p className="text-xs text-neutral-500 mt-2">No filter = all roles included</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Filter by Department</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_DEPARTMENTS.map(dept => (
                  <label key={dept} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={data.recipients.criteria?.departments?.includes(dept) || false}
                      onCheckedChange={() => toggleArrayItem('departments', dept)}
                    />
                    <span className="text-sm">{dept}</span>
                  </label>
                ))}
              </div>
              {!data.recipients.criteria?.departments?.length && (
                <p className="text-xs text-neutral-500 mt-2">No filter = all departments included</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Options</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={data.recipients.criteria?.excludeUnsubscribed ?? true}
                  onCheckedChange={val => updateCriteria('excludeUnsubscribed', val)}
                />
                <div>
                  <span className="text-sm font-medium">Exclude unsubscribed members</span>
                  <p className="text-xs text-neutral-500">Recommended to maintain compliance</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={data.recipients.criteria?.includeInactive || false}
                  onCheckedChange={val => updateCriteria('includeInactive', val)}
                />
                <div>
                  <span className="text-sm font-medium">Include inactive members</span>
                  <p className="text-xs text-neutral-500">Send to members who haven't logged in recently</p>
                </div>
              </label>
            </CardContent>
          </Card>
        </>
      )}

      {data.recipients.type === 'manual' && (
        <Card className={errors?.recipients ? 'border-red-500' : ''}>
          <CardHeader><CardTitle>Enter Email Addresses</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={data.recipients.manualEmails?.join('\n') || ''}
              onChange={e => {
                const emails = e.target.value.split('\n').map(e => e.trim()).filter(Boolean)
                onChange({ recipients: { ...data.recipients, manualEmails: emails, totalCount: emails.length } })
              }}
              className="w-full h-40 p-3 border rounded-lg text-sm font-mono"
              placeholder="Enter one email address per line:&#10;john@example.com&#10;jane@example.com"
            />
            {errors?.recipients && <p className="text-sm text-red-500 mt-1">{errors.recipients}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Estimated recipients</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {isLoading ? '...' : previewCount ?? data.recipients.totalCount ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

