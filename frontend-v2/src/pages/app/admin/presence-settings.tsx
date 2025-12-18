import { useEffect, useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { apiClient } from '@/services/apiClient'

interface AttendanceSettings {
  timezone: string
  workDays: string
  startHour: string
  endHour: string
  graceMinutes: number
}

const defaultSettings: AttendanceSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  workDays: 'Mon-Fri',
  startHour: '09:00',
  endHour: '17:00',
  graceMinutes: 5,
}

export default function PresenceSettingsPage() {
  const [data, setData] = useState<AttendanceSettings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cfg = await apiClient.get<AttendanceSettings>('/attendances/settings', { withToast: { loading: 'Loading settings...' } })
        if (mounted && cfg) setData(cfg)
      } catch (e) {
        // surface toast via apiClient; keep defaults in UI
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const timezones = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') as string[] : ['UTC']

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/attendances/settings', data, { withToast: { loading: 'Saving...', success: 'Saved' } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Presence settings">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Presence settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Attendance policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Timezone</Label>
                  <Select value={data.timezone} onChange={e => setData({ ...data, timezone: e.target.value })}>
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Work days</Label>
                  <Input value={data.workDays} onChange={e => setData({ ...data, workDays: e.target.value })} />
                </div>
                <div>
                  <Label>Start hour</Label>
                  <Input type="time" value={data.startHour} onChange={e => setData({ ...data, startHour: e.target.value })} />
                </div>
                <div>
                  <Label>End hour</Label>
                  <Input type="time" value={data.endHour} onChange={e => setData({ ...data, endHour: e.target.value })} />
                </div>
                <div>
                  <Label>Grace minutes</Label>
                  <Input type="number" min={0} value={data.graceMinutes} onChange={e => setData({ ...data, graceMinutes: Number(e.target.value || 0) })} />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

