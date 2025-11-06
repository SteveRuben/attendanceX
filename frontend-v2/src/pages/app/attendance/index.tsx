import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { listAttendances } from '@/services/attendanceService'

interface AttendanceItem {
  id: string
  userName: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'left_early'
  eventName?: string
  checkInTime?: string
}

const mockAttendances: AttendanceItem[] = [
  { id: '1', userName: 'Alice Johnson', status: 'present', eventName: 'Daily Standup', checkInTime: new Date().toISOString() },
  { id: '2', userName: 'Bob Smith', status: 'late', eventName: 'Daily Standup', checkInTime: new Date().toISOString() },
  { id: '3', userName: 'Claire Lee', status: 'absent', eventName: 'Daily Standup' },
]

export default function AttendancePage() {
  const router = useRouter()
  const [items, setItems] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { items: list, total } = await listAttendances({ page, limit, sortBy: 'checkInTime', sortOrder: 'desc' })
        if (!mounted) return
        const mapped: AttendanceItem[] = list.map(r => ({
          id: r.id,
          userName: r.userName || 'Unknown',
          status: r.status,
          eventName: r.eventName,
          checkInTime: r.checkInTime,
        }))
        setItems(mapped)
        setTotal(total)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [page, limit])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(i =>
      i.userName.toLowerCase().includes(q) ||
      (i.eventName || '').toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q)
    )
  }, [items, search])

  const stats = useMemo(() => ({
    total: items.length,
    present: items.filter(i => i.status === 'present').length,
    absent: items.filter(i => i.status === 'absent').length,
    late: items.filter(i => i.status === 'late').length,
    excused: items.filter(i => i.status === 'excused').length,
  }), [items])

  return (
    <AppShell title="Attendance">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance</h1>
            <p className="text-sm text-muted-foreground">Review and manage attendance records</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/app/attendance/mark/sample-event')}>Mark Attendance</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Total</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.present}</div><div className="text-sm text-muted-foreground">Present</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.absent}</div><div className="text-sm text-muted-foreground">Absent</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">{stats.late}</div><div className="text-sm text-muted-foreground">Late</div></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.excused}</div><div className="text-sm text-muted-foreground">Excused</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input placeholder="Search by name, status or event" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="divide-y rounded-md border">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <EmptyState title="No records" description="No attendance records available" />
              ) : filtered.map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.userName}</div>
                    <div className="text-xs text-muted-foreground">{item.eventName || '—'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm capitalize">{item.status.replace('_', ' ')}</span>
                    {item.checkInTime ? (
                      <span className="text-xs text-muted-foreground">{new Date(item.checkInTime).toLocaleString()}</span>
                    ) : null}

                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <div>{total > 0 ? `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}` : ' '}</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="ghost" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
