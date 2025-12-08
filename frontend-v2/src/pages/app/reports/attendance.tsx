import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { getAttendanceReports, type AttendanceRow, generateReport, getReportStatus, downloadReport } from '@/services/reportsService'
import { useRouter } from 'next/router'

export default function AttendanceReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await getAttendanceReports()
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
    return rows.filter(r => r.userName.toLowerCase().includes(t) || r.eventName.toLowerCase().includes(t))
  }, [rows, q])

  const statusColor = (s: AttendanceRow['status']) => s === 'Present' ? 'bg-green-100 text-green-700' : s === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

  const handleExport = async () => {
    setExporting(true)
    try {
      const { id } = await generateReport({ kind: 'attendance', format: 'csv' })
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
      a.download = `attendance-report-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell title="Attendance reports">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Attendance reports</h1>
          <div className="flex items-center gap-2">
            <Input placeholder="Search user or event" value={q} onChange={e => setQ(e.target.value)} className="w-64" />
            <Button variant="outline" disabled={exporting} onClick={handleExport}>{exporting ? 'Exporting...' : 'Export CSV'}</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <EmptyState title="No records" description="No attendance records match your filters" />
            ) : (
              <div className="rounded-md border divide-y">
                <div className="grid grid-cols-4 text-xs uppercase tracking-wide text-neutral-500 p-3">User/Event<span></span><span></span><span className="justify-self-end">Status</span></div>
                {filtered.map(r => (
                  <div key={r.id} className="grid grid-cols-4 items-center p-3 text-sm">
                    <div>
                      <div className="font-medium">{r.userName}</div>
                      <div className="text-xs text-neutral-500">{r.eventName}</div>
                    </div>
                    <div className="text-neutral-500">{new Date(r.time).toLocaleString()}</div>
                    <div></div>
                    <div className="justify-self-end"><span className={`px-2 py-0.5 text-xs rounded ${statusColor(r.status)}`}>{r.status}</span></div>
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

