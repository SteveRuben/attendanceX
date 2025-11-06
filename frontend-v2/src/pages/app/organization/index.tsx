import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getOrganizationOverview, OrganizationOverview } from '@/services/organizationService'

export default function OrganizationOverviewPage() {
  const [data, setData] = useState<OrganizationOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await getOrganizationOverview()
        if (!mounted) return
        setData(res)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const inv = data?.invitations

  return (
    <AppShell title="Organization">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Organization</h1>
            <p className="text-sm text-muted-foreground">Overview of your workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/organization/invitations"><Button>Invite teammates</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{loading ? '—' : data?.usersCount ?? 0}</div><div className="text-sm text-muted-foreground">Members</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{loading ? '—' : inv?.pending ?? 0}</div><div className="text-sm text-muted-foreground">Pending invites</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{loading ? '—' : inv?.accepted ?? 0}</div><div className="text-sm text-muted-foreground">Accepted</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{loading ? '—' : inv?.declined ?? 0}</div><div className="text-sm text-muted-foreground">Declined</div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>• Invite your team to join the workspace.</div>
              <div>• Create events and share check-in QR codes.</div>
              <div>• Track attendance from the dashboard and reports.</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/app/events"><Button variant="secondary">Create event</Button></Link>
              <Link href="/app/users"><Button variant="secondary">View members</Button></Link>
              <Link href="/app/organization/invitations"><Button variant="secondary">Send invitations</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

