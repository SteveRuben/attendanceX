import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getMyProfile, updateMyProfile, UserPreferences } from '@/services/settingsService'
import { Settings, Globe, Clock, Calendar, Sun, Moon, Monitor, Save, Loader2 } from 'lucide-react'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
]

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC')
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile()
        if (profile.preferences) {
          setLanguage(profile.preferences.language ?? 'en')
          setTimezone(profile.preferences.timezone ?? 'UTC')
          setDateFormat(profile.preferences.dateFormat ?? 'YYYY-MM-DD')
          setTimeFormat(profile.preferences.timeFormat ?? '24h')
          setTheme(profile.preferences.theme ?? 'system')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMyProfile({
        preferences: { language, timezone, dateFormat, timeFormat, theme } as any,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppShell title="Preferences">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Preferences">
      <div className="p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Settings className="h-6 w-6" /> Preferences</h1>
        <Card>
          <CardHeader>
            <CardTitle>Language &amp; Region</CardTitle>
            <CardDescription>Configure your language and regional settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Language</Label>
                <Select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2"><Clock className="h-4 w-4" /> Timezone</Label>
                <Select id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateFormat" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date Format</Label>
                <Select id="dateFormat" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                  {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select id="timeFormat" value={timeFormat} onChange={e => setTimeFormat(e.target.value as '12h' | '24h')}>
                  <option value="12h">12-hour (1:00 PM)</option>
                  <option value="24h">24-hour (13:00)</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value as any)} className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${theme === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-muted hover:border-muted-foreground/30'}`}>
                  <opt.icon className="h-6 w-6" />
                  <span className="text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
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

