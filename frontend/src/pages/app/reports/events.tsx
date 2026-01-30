import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { getEventReports, type EventReportRow, generateReport, getReportStatus, downloadReport } from '@/services/reportsService'
import { useRouter } from 'next/router'

export default function EventReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EventReportRow[]>([])
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await getEventReports()
        if (mounted) setRows(data || [])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(r => r.name.toLowerCase().includes(t))
  }, [rows, q])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { id } = await generateReport({ kind: 'events', format: 'csv' })
      let status = 'pending'
      const end = Date.now() + 60000
      while (status === 'pending' && Date.now() < end) {
        const s = await getReportStatus(id)
        status = s.status
        if (status === 'pending') await new Promise(r => setTimeout(r, 1500))
      }
      if (status === 'failed') return
      const blob = await downloadReport(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `events-report-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell title="Event reports">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Event reports</h1>
          <div className="flex items-center gap-2">
            <Input placeholder="Search events" value={q} onChange={e => setQ(e.target.value)} className="w-64" />
            <Button variant="outline" disabled={exporting} onClick={handleExport}>{exporting ? 'Exporting...' : 'Export CSV'}</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <EmptyState title="No events" description="No events match your filters" action={{ label: 'Create event', onClick: () => router.push('/app/events/create') }} />
            ) : (
              <div className="rounded-md border divide-y">
                <div className="grid grid-cols-4 text-xs uppercase tracking-wide text-neutral-500 p-3">Event<span>Date</span><span>Attendees</span><span className="justify-self-end">Rate</span></div>
                {filtered.map(r => (
                  <div key={r.id} className="grid grid-cols-4 items-center p-3 text-sm">
                    <div className="font-medium truncate">{r.name}</div>
                    <div className="text-neutral-500">{new Date(r.date).toLocaleString()}</div>
                    <div>{r.attendeesCount}</div>
                    <div className="justify-self-end">{Math.round(r.attendanceRate * 100)}%</div>
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

