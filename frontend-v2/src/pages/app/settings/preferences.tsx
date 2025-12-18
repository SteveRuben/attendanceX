import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { getMyProfile, updateMyProfile, UserPreferences } from '@/services/settingsService'
import { Settings, Globe, Clock, Calendar, Sun, Moon, Monitor, Save, Loader2 } from 'lucide-react'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Mumbai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
]

const DATE_FORMATS = [
  { format: 'DD/MM/YYYY', label: 'DD/MM/YYYY (European)', example: '25/12/2024' },
  { format: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)', example: '12/25/2024' },
  { format: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)', example: '2024-12-25' },
]

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
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Settings className="h-6 w-6" /> Preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your application experience and regional settings
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Language & Region
                </CardTitle>
                <CardDescription>Configure your language and regional settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Language
                  </Label>
                  <Select id="language" value={language} onChange={e => setLanguage(e.target.value)}>
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.flag} {l.label}
                      </option>
                    ))}
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Choose your preferred interface language
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Timezone
                  </Label>
                  <Select id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Current time: {new Date().toLocaleTimeString('en-US', { timeZone: timezone })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Date & Time Format
                </CardTitle>
                <CardDescription>Customize how dates and times are displayed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Date Format
                  </Label>
                  <Select id="dateFormat" value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
                    {DATE_FORMATS.map(f => (
                      <option key={f.format} value={f.format}>
                        {f.label} - {f.example}
                      </option>
                    ))}
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Preview: {new Date().toLocaleDateString('en-CA').replace(/(\d{4})-(\d{2})-(\d{2})/, 
                      dateFormat === 'DD/MM/YYYY' ? '$3/$2/$1' :
                      dateFormat === 'MM/DD/YYYY' ? '$2/$3/$1' : '$1-$2-$3'
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Time Format
                  </Label>
                  <Select id="timeFormat" value={timeFormat} onChange={e => setTimeFormat(e.target.value as '12h' | '24h')}>
                    <option value="12h">12-hour (1:00 PM)</option>
                    <option value="24h">24-hour (13:00)</option>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Preview: {timeFormat === '12h' 
                      ? new Date().toLocaleTimeString('en-US', { hour12: true })
                      : new Date().toLocaleTimeString('en-US', { hour12: false })
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Choose your preferred theme and visual style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { 
                    value: 'light', 
                    label: 'Light', 
                    icon: Sun,
                    description: 'Bright and clean interface'
                  },
                  { 
                    value: 'dark', 
                    label: 'Dark', 
                    icon: Moon,
                    description: 'Easy on the eyes at night'
                  },
                  { 
                    value: 'system', 
                    label: 'System', 
                    icon: Monitor,
                    description: 'Follows your device settings'
                  },
                ].map(opt => (
                  <button 
                    key={opt.value} 
                    onClick={() => setTheme(opt.value as any)} 
                    className={`flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                      theme === opt.value 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md' 
                        : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    <opt.icon className={`h-8 w-8 ${theme === opt.value ? 'text-blue-600' : 'text-muted-foreground'}`} />
                    <div className="text-center">
                      <div className={`text-sm font-medium ${theme === opt.value ? 'text-blue-600' : ''}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {opt.description}
                      </div>
                    </div>
                    {theme === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 text-xl">💡</div>
                  <div>
                    <div className="text-sm font-medium">Theme Preview</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Your selected theme will be applied immediately across the entire application
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Save Your Preferences</div>
                <div className="text-xs text-muted-foreground">
                  Changes will be applied immediately after saving
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

