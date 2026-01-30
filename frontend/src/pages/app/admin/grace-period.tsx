import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/services/apiClient'

interface GracePolicy {
  lateThresholdMinutes: number
  earlyCheckinMinutes: number
  allowWindowExtensionMinutes: number
}

const defaults: GracePolicy = {
  lateThresholdMinutes: 5,
  earlyCheckinMinutes: 10,
  allowWindowExtensionMinutes: 0,
}

export default function GracePeriodPage() {
  const [data, setData] = useState<GracePolicy>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiClient.get<GracePolicy>('/settings/grace')
        if (mounted && res) setData(res)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await apiClient.put('/settings/grace', data, { withToast: { loading: 'Saving...', success: 'Saved' } })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Grace period">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Grace period</h1>
        <Card>
          <CardHeader><CardTitle>Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Late threshold (minutes)</Label>
                  <Input type="number" min={0} value={data.lateThresholdMinutes} onChange={e => setData({ ...data, lateThresholdMinutes: Number(e.target.value || 0) })} />
                </div>
                <div>
                  <Label className="text-xs">Early check-in allowed (minutes)</Label>
                  <Input type="number" min={0} value={data.earlyCheckinMinutes} onChange={e => setData({ ...data, earlyCheckinMinutes: Number(e.target.value || 0) })} />
                </div>
                <div>
                  <Label className="text-xs">Window extension (minutes)</Label>
                  <Input type="number" min={0} value={data.allowWindowExtensionMinutes} onChange={e => setData({ ...data, allowWindowExtensionMinutes: Number(e.target.value || 0) })} />
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save policy'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

