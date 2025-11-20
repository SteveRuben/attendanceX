import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { apiClient } from '@/services/apiClient'
import { EmptyState } from '@/components/ui/empty-state'

import { checkIn } from '@/services/attendanceService'
import { showToast, updateToast } from '@/hooks/use-toast'

interface Participant {
  id: string
  displayName: string
  email?: string
  profilePicture?: string
}

interface EventDetails {
  id: string
  title: string
  participants: Participant[]
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'left_early'

interface ParticipantAttendance {
  userId: string
  status: AttendanceStatus
  method: 'manual' | 'qr_code' | 'geolocation'
  notes: string
  checkInTime?: string
  isModified?: boolean
}



export default function MarkAttendancePage() {
  const router = useRouter()
  const { eventId } = router.query as { eventId?: string }
  const [event, setEvent] = useState<EventDetails | null>(null)
  const [list, setList] = useState<ParticipantAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!eventId) return
    let mounted = true
    ;(async () => {
      try {
        const ev = await apiClient.get<EventDetails>(`/events/${eventId}`, { withToast: { loading: 'Loading event...' } })
        const att = await apiClient.get<any[]>(`/events/${eventId}/attendances`)
        if (!mounted) return
        setEvent(ev)
        const initial = (ev?.participants || []).map(p => {
          const existing = att.find(a => a.userId === p.id)
          return {
            userId: p.id,
            status: (existing?.status || 'absent') as AttendanceStatus,
            method: (existing?.method || 'manual') as any,
            notes: existing?.notes || '',
            checkInTime: existing?.checkInTime,
            isModified: false,
          }
        })
        setList(initial)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [eventId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(it => {
      const user = event?.participants.find(p => p.id === it.userId)
      return (
        user?.displayName.toLowerCase().includes(q) ||
        (user?.email || '').toLowerCase().includes(q)
      )
    })
  }, [list, search, event])

  const stats = useMemo(() => ({
    total: list.length,
    present: list.filter(i => i.status === 'present').length,
    absent: list.filter(i => i.status === 'absent').length,
    late: list.filter(i => i.status === 'late').length,
    modified: list.filter(i => i.isModified).length,
  }), [list])

  const updateItem = (userId: string, patch: Partial<ParticipantAttendance>) => {
    setList(prev => prev.map(it => it.userId === userId ? { ...it, ...patch, isModified: true } : it))
  }

  const handleSave = async () => {
    const changed = list.filter(i => i.isModified)
    if (changed.length === 0) return
    setSaving(true)
    const toastId = showToast({ title: `Saving ${changed.length} change(s)...`, duration: 0 })
    let success = 0
    let failed = 0
    try {
      for (const item of changed) {
        try {
          await checkIn({
            eventId: String(eventId),
            userId: item.userId,
            status: item.status,
            method: item.method,
            notes: item.notes,
          })
          success++
        } catch (e) {
          failed++
        }
      }
      updateToast(toastId, { title: failed > 0 ? `Saved ${success}, failed ${failed}` : `Saved ${success} change(s)`, variant: failed > 0 ? 'destructive' : 'success', duration: 4000 })
      if (success > 0) {
        setList(prev => prev.map(it => ({ ...it, isModified: false })))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Mark attendance">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Mark attendance</h1>
            <p className="text-sm text-muted-foreground">{event?.title || ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {stats.modified > 0 ? <span className="text-sm text-muted-foreground">{stats.modified} modified</span> : null}
            <Button disabled={saving || stats.modified === 0} onClick={handleSave}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Total</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.present}</div><div className="text-sm text-muted-foreground">Present</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.absent}</div><div className="text-sm text-muted-foreground">Absent</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.late}</div><div className="text-sm text-muted-foreground">Late</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Search participant" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="divide-y rounded-md border">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <EmptyState title="No participants" description="No participants found for this event." />
              ) : filtered.map(it => {
                const user = event?.participants.find(p => p.id === it.userId)
                return (
                  <div key={it.userId} className="p-4 flex items-center justify-between gap-6">
                    <div>
                      <div className="font-medium">{user?.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select value={it.status} onChange={e => updateItem(it.userId, { status: e.target.value as AttendanceStatus, checkInTime: e.target.value === 'present' && !it.checkInTime ? new Date().toISOString() : it.checkInTime })}>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                          <option value="left_early">Left early</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Method</Label>
                        <Select value={it.method} onChange={e => updateItem(it.userId, { method: e.target.value as any })}>
                          <option value="manual">Manual</option>
                          <option value="qr_code">QR Code</option>
                          <option value="geolocation">Geolocation</option>
                        </Select>
                      </div>
                      <div className="w-56">
                        <Label className="text-xs">Notes</Label>
                        <Input value={it.notes} onChange={e => updateItem(it.userId, { notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

