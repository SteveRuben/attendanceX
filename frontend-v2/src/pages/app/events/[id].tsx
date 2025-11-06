import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getEventById, type EventItem } from '@/services/eventsService'

export default function EventDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const eventId = typeof id === 'string' ? id : ''
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<EventItem | null>(null)

  useEffect(() => {
    if (!eventId) return
    let mounted = true
    ;(async () => {
      try {
        const data = await getEventById(eventId)
        if (mounted) setItem(data)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [eventId])

  return (
    <AppShell title={item?.name || 'Event'}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{item?.name || 'Event'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/app/events/${eventId}/edit`)}>Edit</Button>
            <Button onClick={() => router.push(`/app/attendance/mark/${eventId}`)}>Mark attendance</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : !item ? (
              <div className="text-sm text-muted-foreground">Not found</div>
            ) : (
              <>
                <div className="text-sm"><span className="text-muted-foreground">Starts:</span> {new Date(item.startTime).toLocaleString()}</div>
                <div className="text-sm"><span className="text-muted-foreground">Attendees:</span> {item.attendeesCount ?? 0}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

