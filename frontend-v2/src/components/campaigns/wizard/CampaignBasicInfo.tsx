import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CampaignWizardData, CAMPAIGN_TYPES } from '../types'

interface CampaignBasicInfoProps {
  data: CampaignWizardData
  onChange: (updates: Partial<CampaignWizardData>) => void
  errors?: Record<string, string>
}

export function CampaignBasicInfo({ data, onChange, errors }: CampaignBasicInfoProps) {
  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean)
    onChange({ tags })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2">Campaign Details</h2>
        <p className="text-neutral-500">Start by giving your campaign a name and setting up the basics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Newsletter - December 2024"
              value={data.name}
              onChange={e => onChange({ name: e.target.value })}
              className={errors?.name ? 'border-red-500' : ''}
            />
            {errors?.name && <p className="text-sm text-red-500">{errors.name}</p>}
            <p className="text-xs text-neutral-500">Internal name to identify this campaign</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Campaign Type</Label>
            <Select
              id="type"
              value={data.type}
              onChange={e => onChange({ type: e.target.value as any })}
            >
              {CAMPAIGN_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500">
              {CAMPAIGN_TYPES.find(t => t.value === data.type)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              placeholder="e.g., 🎉 Your weekly update from {{organizationName}}"
              value={data.subject}
              onChange={e => onChange({ subject: e.target.value })}
              className={errors?.subject ? 'border-red-500' : ''}
            />
            {errors?.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
            <p className="text-xs text-neutral-500">
              Use {'{{firstName}}'} or {'{{organizationName}}'} for personalization
            </p>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Preview:</p>
            <p className="text-sm">
              {data.subject.replace(/\{\{firstName\}\}/g, 'John').replace(/\{\{organizationName\}\}/g, 'Acme Inc') || 'Your subject line will appear here'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="newsletter, december, update"
              value={data.tags.join(', ')}
              onChange={e => handleTagsChange(e.target.value)}
            />
            <p className="text-xs text-neutral-500">Comma-separated tags to organize your campaigns</p>
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {data.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

