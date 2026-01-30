import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getCampaign, updateCampaign, sendCampaign, scheduleCampaign, sendTestCampaign, type Campaign, type CampaignType } from '@/services/campaignService'
import { ArrowLeft, Send, Save, Clock, TestTube } from 'lucide-react'

const campaignTypes: { value: CampaignType; label: string }[] = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
]

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700', sending: 'bg-yellow-100 text-yellow-700', sent: 'bg-green-100 text-green-700', paused: 'bg-orange-100 text-orange-700', cancelled: 'bg-red-100 text-red-700',
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [form, setForm] = useState({ name: '', type: 'newsletter' as CampaignType, subject: '', htmlContent: '', tags: '' })
  const [testEmail, setTestEmail] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')

  useEffect(() => {
    if (!id || typeof id !== 'string') return
    (async () => {
      try {
        const data = await getCampaign(id)
        setCampaign(data)
        setForm({ name: data.name, type: data.type, subject: data.subject, htmlContent: data.content.htmlContent, tags: data.tags?.join(', ') || '' })
      } finally { setLoading(false) }
    })()
  }, [id])

  const handleSave = async () => {
    if (!campaign) return
    setSaving(true)
    try {
      await updateCampaign(campaign.id, { name: form.name, subject: form.subject, content: { htmlContent: form.htmlContent }, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined })
      router.push('/app/campaigns')
    } finally { setSaving(false) }
  }

  const handleSendTest = async () => {
    if (!campaign || !testEmail) return
    await sendTestCampaign(campaign.id, [testEmail])
    setTestEmail('')
  }

  const handleSchedule = async () => {
    if (!campaign || !scheduleDate) return
    await scheduleCampaign(campaign.id, new Date(scheduleDate).toISOString())
    router.push('/app/campaigns')
  }

  const handleSendNow = async () => {
    if (!campaign) return
    await sendCampaign(campaign.id)
    router.push('/app/campaigns')
  }

  if (loading) return <AppShell title="Campaign"><div className="p-6">Loading...</div></AppShell>
  if (!campaign) return <AppShell title="Campaign"><div className="p-6">Campaign not found</div></AppShell>

  const isDraft = campaign.status === 'draft'

  return (
    <AppShell title={campaign.name}>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusStyles[campaign.status]}`}>{campaign.status}</span>
              </div>
              <p className="text-sm text-gray-500">Created {new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          {isDraft && <Button onClick={handleSendNow} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"><Send className="w-4 h-4 mr-2" /> Send Now</Button>}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={!isDraft} /></div>
                  <div className="space-y-2"><Label>Type</Label><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as CampaignType })} disabled={!isDraft}>{campaignTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></div>
                </div>
                <div className="space-y-2"><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} disabled={!isDraft} /></div>
                <div className="space-y-2"><Label>Content</Label><textarea className="w-full min-h-[200px] p-3 border rounded-md font-mono text-sm resize-y" value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })} disabled={!isDraft} /></div>
                {isDraft && <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {isDraft && <Card><CardHeader><CardTitle className="text-base">Send Test</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} /><Button variant="outline" className="w-full" onClick={handleSendTest} disabled={!testEmail}><TestTube className="w-4 h-4 mr-2" /> Send Test</Button></CardContent></Card>}
            {isDraft && <Card><CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader><CardContent className="space-y-3"><Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} /><Button variant="outline" className="w-full" onClick={handleSchedule} disabled={!scheduleDate}><Clock className="w-4 h-4 mr-2" /> Schedule</Button></CardContent></Card>}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

