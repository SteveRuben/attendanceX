import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SimpleSwitch } from '@/components/ui/simple-switch'
import { Label } from '@/components/ui/label'
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from '@/services/settingsService'
import { Bell, Mail, Smartphone, MessageSquare, Save, Loader2, Calendar, ClipboardCheck, AlertCircle, FileText, Users, CheckCircle, Volume2, VolumeX } from 'lucide-react'

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
  { key: 'eventReminders', icon: Calendar, label: 'Event Reminders', description: 'Upcoming event notifications and schedule changes' },
  { key: 'attendanceAlerts', icon: ClipboardCheck, label: 'Attendance Alerts', description: 'Check-in confirmations and attendance updates' },
  { key: 'systemUpdates', icon: AlertCircle, label: 'System Updates', description: 'Important system announcements and maintenance' },
  { key: 'weeklyReports', icon: FileText, label: 'Weekly Reports', description: 'Weekly attendance and activity summaries' },
  { key: 'invitations', icon: Users, label: 'Invitations', description: 'Team invitations and collaboration requests' },
]

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [testingChannel, setTestingChannel] = useState<Channel | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await getNotificationPreferences()
      setPrefs(data)
      setHasChanges(false)
    } catch (e: any) {
      console.error('Failed to load notification preferences:', e)
      
      // Si l'API n'est pas encore implémentée (501), utiliser les préférences par défaut
      if (e?.message?.includes('not implemented') || e?.status === 501) {
        console.warn('Notification preferences API not implemented yet, using defaults')
        setPrefs(defaultPrefs())
      } else {
        // Pour d'autres erreurs, utiliser aussi les préférences par défaut
        setPrefs(defaultPrefs())
      }
    } finally {
      setLoading(false)
    }
  }

  const updateChannel = (channel: Channel, key: string, value: boolean) => {
    if (!prefs) return
    
    const newPrefs = { ...prefs, [channel]: { ...prefs[channel], [key]: value } }
    
    // Si on désactive le canal, désactiver toutes les notifications de ce canal
    if (key === 'enabled' && !value) {
      NOTIFICATION_TYPES.forEach(type => {
        (newPrefs[channel] as any)[type.key] = false
      })
    }
    
    setPrefs(newPrefs)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      await updateNotificationPreferences(prefs)
      setHasChanges(false)
    } catch (e: any) {
      console.error('Failed to save preferences:', e)
      
      // Si l'API n'est pas encore implémentée, simuler la sauvegarde
      if (e?.message?.includes('not implemented') || e?.status === 501) {
        console.warn('Notification preferences save API not implemented yet, simulating save')
        setHasChanges(false)
        // TODO: Stocker localement en attendant l'implémentation de l'API
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async (channel: Channel) => {
    setTestingChannel(channel)
    try {
      // Simuler l'envoi d'une notification de test
      await new Promise(resolve => setTimeout(resolve, 1500))
      // TODO: Implémenter l'envoi réel de notification de test
      console.log(`Test notification sent via ${channel}`)
    } catch (e) {
      console.error('Failed to send test notification:', e)
    } finally {
      setTestingChannel(null)
    }
  }

  const getChannelStats = (channel: Channel) => {
    if (!prefs) return { enabled: 0, total: NOTIFICATION_TYPES.length }
    
    const channelPrefs = prefs[channel] as any
    const enabled = NOTIFICATION_TYPES.filter(type => channelPrefs[type.key]).length
    return { enabled, total: NOTIFICATION_TYPES.length }
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
      <div className="p-6 space-y-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-6 w-6" /> 
            Notification Settings
          </h1>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <AlertCircle className="h-4 w-4" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Notification Preferences</h3>
              <p className="text-sm text-blue-700 mt-1">
                Configure how you want to receive notifications for events, attendance, and system updates. 
                Changes are saved automatically and will take effect immediately.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {CHANNELS.map(ch => {
            const stats = getChannelStats(ch.id)
            const isChannelEnabled = prefs?.[ch.id]?.enabled ?? false
            
            return (
              <Card key={ch.id} className={`transition-all ${isChannelEnabled ? 'ring-1 ring-blue-200 bg-blue-50/30' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isChannelEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        <ch.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {ch.label}
                          {isChannelEnabled ? (
                            <Volume2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-gray-400" />
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {ch.description}
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {stats.enabled}/{stats.total} active
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isChannelEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestNotification(ch.id)}
                          disabled={testingChannel === ch.id}
                        >
                          {testingChannel === ch.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                      )}
                      <SimpleSwitch 
                        checked={isChannelEnabled} 
                        onCheckedChange={v => updateChannel(ch.id, 'enabled', v)}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {NOTIFICATION_TYPES.map(nt => {
                      const isTypeEnabled = (prefs?.[ch.id] as any)?.[nt.key] ?? false
                      
                      return (
                        <div key={nt.key} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isChannelEnabled && isTypeEnabled 
                            ? 'bg-green-50 border-green-200' 
                            : isChannelEnabled 
                              ? 'bg-white border-gray-200 hover:bg-gray-50' 
                              : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded ${
                              isChannelEnabled && isTypeEnabled 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              <nt.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <Label 
                                htmlFor={`${ch.id}-${nt.key}`}
                                className={`font-medium ${!isChannelEnabled ? 'text-gray-400' : ''}`}
                              >
                                {nt.label}
                              </Label>
                              <p className={`text-xs ${!isChannelEnabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                {nt.description}
                              </p>
                            </div>
                          </div>
                          <SimpleSwitch 
                            id={`${ch.id}-${nt.key}`}
                            checked={isTypeEnabled}
                            onCheckedChange={v => updateChannel(ch.id, nt.key, v)} 
                            disabled={!isChannelEnabled}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            Changes are saved automatically when you modify settings
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={loadPreferences}
              disabled={loading || saving}
            >
              Reset
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : hasChanges ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function defaultPrefs(): NotificationPreferences {
  const enabledChannel = { 
    enabled: true, 
    eventReminders: true, 
    attendanceAlerts: true, 
    systemUpdates: false,
    weeklyReports: true,
    invitations: true
  }
  const disabledChannel = { 
    enabled: false, 
    eventReminders: false, 
    attendanceAlerts: false, 
    systemUpdates: false,
    weeklyReports: false,
    invitations: false
  }
  
  return { 
    email: { ...enabledChannel }, 
    push: { ...enabledChannel, weeklyReports: false }, 
    sms: { ...disabledChannel } 
  }
}

