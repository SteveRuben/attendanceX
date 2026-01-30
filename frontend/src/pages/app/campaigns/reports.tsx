import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { getCampaigns, getCampaignAnalytics, getEngagementInsights, type Campaign, type CampaignAnalytics } from '@/services/campaignService'
import { BarChart3, Mail, Send, Eye, MousePointerClick, UserMinus, ArrowLeft, TrendingUp } from 'lucide-react'

interface CampaignWithAnalytics extends Campaign { analytics?: CampaignAnalytics }

export default function CampaignReportsPage() {
  const router = useRouter()
  const { id: selectedId } = router.query
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<CampaignWithAnalytics[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getCampaigns()
        const sentCampaigns = data.filter(c => c.status === 'sent')
        const withAnalytics = await Promise.all(sentCampaigns.map(async c => {
          try { const analytics = await getCampaignAnalytics(c.id); return { ...c, analytics } }
          catch { return c }
        }))
        setCampaigns(withAnalytics)
        try { const ins = await getEngagementInsights({}); setInsights(ins) } catch {}
      } finally { setLoading(false) }
    })()
  }, [])

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) : null
  const totalSent = campaigns.reduce((sum, c) => sum + (c.analytics?.delivered || 0), 0)
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.analytics?.opened || 0), 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.analytics?.clicked || 0), 0)
  const avgOpenRate = campaigns.length ? campaigns.reduce((sum, c) => sum + (c.analytics?.openRate || 0), 0) / campaigns.length : 0
  const avgClickRate = campaigns.length ? campaigns.reduce((sum, c) => sum + (c.analytics?.clickRate || 0), 0) / campaigns.length : 0

  const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
    <Card><CardContent className="p-4"><div className="flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div><div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div></div></CardContent></Card>
  )

  return (
    <AppShell title="Campaign Reports">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          {selected && <Button variant="ghost" size="sm" onClick={() => router.push('/app/campaigns/reports')}><ArrowLeft className="w-4 h-4" /></Button>}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{selected ? selected.name : 'Campaign Reports'}</h1>
            <p className="text-sm text-gray-500">{selected ? `Sent on ${new Date(selected.sentAt!).toLocaleDateString()}` : 'Analytics and performance metrics for your email campaigns'}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reports...</div>
        ) : selected ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Send} label="Delivered" value={selected.analytics?.delivered || 0} color="bg-blue-500" />
              <StatCard icon={Eye} label="Opens" value={selected.analytics?.opened || 0} sub={`${(selected.analytics?.openRate || 0).toFixed(1)}% rate`} color="bg-green-500" />
              <StatCard icon={MousePointerClick} label="Clicks" value={selected.analytics?.clicked || 0} sub={`${(selected.analytics?.clickRate || 0).toFixed(1)}% rate`} color="bg-purple-500" />
              <StatCard icon={UserMinus} label="Unsubscribed" value={selected.analytics?.unsubscribed || 0} color="bg-red-500" />
            </div>
            <Card><CardHeader><CardTitle>Performance Details</CardTitle></CardHeader><CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div><p className="text-sm text-gray-500 mb-1">Bounce Rate</p><p className="text-xl font-semibold">{(selected.analytics?.bounceRate || 0).toFixed(2)}%</p></div>
                <div><p className="text-sm text-gray-500 mb-1">Total Recipients</p><p className="text-xl font-semibold">{selected.analytics?.totalRecipients || 0}</p></div>
              </div>
            </CardContent></Card>
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState icon={<BarChart3 className="w-12 h-12 text-gray-300" />} title="No campaign data" description="Send some campaigns to see analytics here" action={{ label: 'Go to Campaigns', onClick: () => router.push('/app/campaigns') }} />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <StatCard icon={Mail} label="Campaigns Sent" value={campaigns.length} color="bg-blue-500" />
              <StatCard icon={Send} label="Emails Delivered" value={totalSent} color="bg-indigo-500" />
              <StatCard icon={Eye} label="Total Opens" value={totalOpens} sub={`${avgOpenRate.toFixed(1)}% avg`} color="bg-green-500" />
              <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} sub={`${avgClickRate.toFixed(1)}% avg`} color="bg-purple-500" />
              <StatCard icon={TrendingUp} label="Avg Open Rate" value={`${avgOpenRate.toFixed(1)}%`} color="bg-amber-500" />
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Campaign Performance</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="grid grid-cols-6 text-xs uppercase tracking-wide text-gray-500 p-4 border-b bg-gray-50">
                    <span className="col-span-2">Campaign</span><span className="text-center">Delivered</span><span className="text-center">Opens</span><span className="text-center">Clicks</span><span className="text-center">Open Rate</span>
                  </div>
                  {campaigns.map(c => (
                    <div key={c.id} className="grid grid-cols-6 items-center p-4 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/app/campaigns/reports?id=${c.id}`)}>
                      <div className="col-span-2"><p className="font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{new Date(c.sentAt!).toLocaleDateString()}</p></div>
                      <p className="text-center">{c.analytics?.delivered || 0}</p><p className="text-center">{c.analytics?.opened || 0}</p><p className="text-center">{c.analytics?.clicked || 0}</p>
                      <p className="text-center font-medium">{(c.analytics?.openRate || 0).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}

