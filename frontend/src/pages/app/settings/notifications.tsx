import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from '@/services/settingsService'
import { Bell, Mail, Smartphone, MessageSquare, Save, Loader2, Calendar, ClipboardCheck, AlertCircle } from 'lucide-react'

type Channel = 'email' | 'push' | 'sms'

interface ChannelConfig {
  id: Channel
  icon: any
  label: string
  description: string
}

const CHANNELS: ChannelConfig[] = [
  { id: 'email', icon: Mail, label: 'Email', description: 'Receive notifications via email' },
  { id: 'push', icon: Smartphone, label: 'Push', description: 'Browser and mobile push notifications' },
  { id: 'sms', icon: MessageSquare, label: 'SMS', description: 'Text message alerts' },
]

const NOTIFICATION_TYPES = [
  { key: 'eventReminders', icon: Calendar, label: 'Event Reminders', description: 'Upcoming event notifications' },
  { key: 'attendanceAlerts', icon: ClipboardCheck, label: 'Attendance Alerts', description: 'Check-in and attendance updates' },
  { key: 'systemUpdates', icon: AlertCircle, label: 'System Updates', description: 'Important system announcements' },
]

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const data = await getNotificationPreferences()
        setPrefs(data)
      } catch (e) {
        console.error(e)
        setPrefs(defaultPrefs())
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateChannel = (channel: Channel, key: string, value: boolean) => {
    if (!prefs) return
    setPrefs({ ...prefs, [channel]: { ...prefs[channel], [key]: value } })
  }

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      await updateNotificationPreferences(prefs)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !prefs) {
    return (
      <AppShell title="Notifications">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Notifications">
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Bell className="h-6 w-6" /> Notifications</h1>
        {CHANNELS.map(ch => (
          <Card key={ch.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ch.icon className="h-5 w-5" /> {ch.label}</CardTitle>
              <CardDescription>{ch.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <Label htmlFor={`${ch.id}-enabled`} className="font-medium">Enable {ch.label}</Label>
                <Switch id={`${ch.id}-enabled`} checked={prefs[ch.id].enabled} onCheckedChange={v => updateChannel(ch.id, 'enabled', v)} />
              </div>
              {NOTIFICATION_TYPES.map(nt => (
                <div key={nt.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <nt.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor={`${ch.id}-${nt.key}`}>{nt.label}</Label>
                      <p className="text-xs text-muted-foreground">{nt.description}</p>
                    </div>
                  </div>
                  <Switch id={`${ch.id}-${nt.key}`} checked={(prefs[ch.id] as any)[nt.key]} onCheckedChange={v => updateChannel(ch.id, nt.key, v)} disabled={!prefs[ch.id].enabled} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Preferences
          </Button>
        </div>
      </div>
    </AppShell>
  )
}

function defaultPrefs(): NotificationPreferences {
  const channel = { enabled: true, eventReminders: true, attendanceAlerts: true, systemUpdates: false }
  return { email: { ...channel }, push: { ...channel }, sms: { enabled: false, eventReminders: false, attendanceAlerts: false, systemUpdates: false } }
}

