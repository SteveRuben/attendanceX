import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function AdminDashboardPage() {
  return (
    <AppShell title="Admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <div className="flex gap-2">
            <Link href="/app/admin/presence-settings"><Button variant="secondary">Presence settings</Button></Link>
            <Link href="/app/admin/grace-period"><Button variant="secondary">Grace period</Button></Link>
            <Link href="/app/admin/timesheet-settings"><Button variant="secondary">Timesheet settings</Button></Link>
            <Link href="/app/admin/promo-codes"><Button variant="secondary">Promo codes</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent>
              <EmptyState title="No admin insights yet" description="We’ll surface policy compliance, approvals, and recent changes here." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/app/organization/invitations"><Button variant="secondary">Invite users</Button></Link>
              <Link href="/app/events/create"><Button variant="secondary">Create event</Button></Link>
              <Link href="/app/reports/attendance"><Button variant="secondary">Attendance reports</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

