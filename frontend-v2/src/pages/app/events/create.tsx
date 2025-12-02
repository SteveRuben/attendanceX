import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createEvent } from '@/services/eventsService'

export default function CreateEventPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !start) return
    setSubmitting(true)
    try {
      const startIso = new Date(start).toISOString()
      const res = await createEvent({ name, startTime: startIso })
      const newId = (res as any)?.id
      if (newId) router.replace(`/app/events/${newId}`)
      else router.replace('/app/events')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="Create event">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Create event</h1>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Button disabled={submitting} type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

