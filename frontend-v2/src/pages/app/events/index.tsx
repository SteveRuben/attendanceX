import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { usePermissions } from '@/hooks/usePermissions'
import { EventGuard } from '@/components/auth/PermissionGuard'
import { getEvents, type EventItem } from '@/services/eventsService'

export default function EventsPage() {
  const router = useRouter()
  const { canCreateEvents, canViewAllEvents } = usePermissions()
  const [items, setItems] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const { items, total } = await getEvents({ limit, offset: (page - 1) * limit })
        if (!mounted) return
        setItems(items)
        setTotal(total)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [page, limit])

  const start = items.length ? (page - 1) * limit + 1 : 0
  const end = items.length ? (page - 1) * limit + items.length : 0
  const canPrev = page > 1
  const canNext = page * limit < total

  return (
    <AppShell title="Events">
      <EventGuard action="view">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Events</h1>
            <div className="flex gap-2">
              <EventGuard action="create">
                <Button onClick={() => router.push('/app/events/create')}>Create event</Button>
              </EventGuard>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : items.length === 0 ? (
                <EmptyState 
                  title="No events" 
                  description="Create an event to get started" 
                  action={canCreateEvents() ? { 
                    label: 'Create event', 
                    onClick: () => router.push('/app/events/create') 
                  } : undefined} 
                />
              ) : (
                <div className="divide-y rounded-md border">
                  {items.map(e => (
                    <div key={e.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.startTime).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/app/attendance/mark/${e.id}`)}>Mark</Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/app/events/${e.id}`)}>View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>{total > 0 ? `Showing ${start}–${end} of ${total}` : ' '}</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={!canPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={!canNext} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </EventGuard>
    </AppShell>
  )
}
