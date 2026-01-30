import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getEventById, updateEvent, type EventItem } from '@/services/eventsService'

export default function EditEventPage() {
  const router = useRouter()
  const { id } = router.query
  const eventId = typeof id === 'string' ? id : ''
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState('')

  useEffect(() => {
    if (!eventId) return
    let mounted = true
    ;(async () => {
      try {
        const data = await getEventById(eventId)
        if (!mounted || !data) return
        setName(data.name)
        const dt = new Date(data.startTime)
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        setStart(local.toISOString().slice(0,16))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [eventId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !start || !eventId) return
    setSubmitting(true)
    try {
      const startIso = new Date(start).toISOString()
      await updateEvent(eventId, { name, startTime: startIso })
      router.replace(`/app/events/${eventId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Edit event">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Edit event</h1>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <div className="text-sm mb-1">Name</div>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Event name" />
                </div>
                <div>
                  <div className="text-sm mb-1">Start time</div>
                  <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                  <Button disabled={submitting} type="submit">Save</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

