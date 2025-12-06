import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { createCampaign, type CampaignType } from '@/services/campaignService'
import { ArrowLeft, Send, Save } from 'lucide-react'

const campaignTypes: { value: CampaignType; label: string }[] = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
]

export default function CreateCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'newsletter' as CampaignType, subject: '', htmlContent: '', tags: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject || !form.htmlContent) return
    setLoading(true)
    try {
      await createCampaign({
        name: form.name,
        type: form.type,
        subject: form.subject,
        content: { htmlContent: form.htmlContent },
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      })
      router.push('/app/campaigns')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Create Campaign">
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create Campaign</h1>
            <p className="text-sm text-gray-500">Set up a new email campaign</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input id="name" placeholder="e.g., Weekly Newsletter" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CampaignType })}>
                    {campaignTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject *</Label>
                <Input id="subject" placeholder="Your email subject line" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" placeholder="e.g., newsletter, weekly, updates" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Email Content</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="content">HTML Content *</Label>
                <textarea id="content" className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="<h1>Hello!</h1><p>Your email content here...</p>" value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })} required />
                <p className="text-xs text-gray-500">Use HTML to format your email. Variables like {'{{firstName}}'} can be used for personalization.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.name || !form.subject || !form.htmlContent} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Save className="w-4 h-4 mr-2" /> {loading ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}

