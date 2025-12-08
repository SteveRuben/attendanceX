import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { getCampaigns, deleteCampaign, sendCampaign, pauseCampaign, cancelCampaign, duplicateCampaign, type Campaign, type CampaignStatus } from '@/services/campaignService'
import { Mail, Plus, Search, MoreHorizontal, Send, Pause, Copy, Trash2, BarChart3, X } from 'lucide-react'

const statusStyles: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  paused: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
}

function ActionMenu({ campaign, onAction, loading }: { campaign: Campaign; onAction: (fn: () => Promise<any>) => void; loading: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAction = (fn: () => Promise<any>) => { setOpen(false); onAction(fn) }

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} disabled={loading}><MoreHorizontal className="w-4 h-4" /></Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-md shadow-lg z-10 py-1">
          {campaign.status === 'draft' && <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => handleAction(() => sendCampaign(campaign.id))}><Send className="w-4 h-4" /> Send Now</button>}
          {campaign.status === 'sending' && <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => handleAction(() => pauseCampaign(campaign.id))}><Pause className="w-4 h-4" /> Pause</button>}
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => handleAction(() => cancelCampaign(campaign.id))}><X className="w-4 h-4" /> Cancel</button>}
          <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => handleAction(() => duplicateCampaign(campaign.id, `${campaign.name} (Copy)`))}><Copy className="w-4 h-4" /> Duplicate</button>
          {campaign.status === 'draft' && <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600" onClick={() => handleAction(() => deleteCampaign(campaign.id))}><Trash2 className="w-4 h-4" /> Delete</button>}
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadCampaigns = async () => {
    try {
      const { data } = await getCampaigns()
      setCampaigns(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCampaigns() }, [])

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()))

  const handleAction = async (action: () => Promise<any>, id: string) => {
    setActionLoading(id)
    try {
      await action()
      await loadCampaigns()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AppShell title="Email Campaigns">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage email campaigns for your organization</p>
          </div>
          <Button onClick={() => router.push('/app/campaigns/create')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" /> All Campaigns</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8"><EmptyState icon={<Mail className="w-12 h-12 text-gray-300" />} title="No campaigns yet" description="Create your first email campaign to engage with your members" action={{ label: 'Create Campaign', onClick: () => router.push('/app/campaigns/create') }} /></div>
            ) : (
              <div className="divide-y">
                {filtered.map(campaign => (
                  <div key={campaign.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600" onClick={() => router.push(`/app/campaigns/${campaign.id}`)}>{campaign.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusStyles[campaign.status]}`}>{campaign.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">{campaign.subject}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="capitalize">{campaign.type}</span>
                          <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                          {campaign.sentAt && <span>Sent {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/app/campaigns/reports?id=${campaign.id}`)}><BarChart3 className="w-4 h-4" /></Button>
                        <ActionMenu campaign={campaign} onAction={fn => handleAction(fn, campaign.id)} loading={actionLoading === campaign.id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

