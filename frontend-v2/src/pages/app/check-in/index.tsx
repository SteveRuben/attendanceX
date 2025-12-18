import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { useTenant } from '@/contexts/TenantContext'
import {
  CheckInConfig,
  CheckInRecord,
  CheckInStats,
  generateQrCode,
  validateQrCode,
  generatePinCode,
  validatePinCode,
  checkIn,
  manualCheckIn,
  getCheckInConfig,
  updateCheckInConfig,
  getCheckInRecords,
  getCheckInStats,
  sendQrCodesToParticipants
} from '@/services/checkinService'
import { CheckInDashboard } from '@/components/check-in/CheckInDashboard'

type ActiveTab = 'config' | 'qr-generator' | 'validation' | 'records' | 'stats'

export default function CheckInPage() {
  const { currentTenant } = useTenant()
  const [activeTab, setActiveTab] = useState<ActiveTab>('config')
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Configuration state
  const [config, setConfig] = useState<CheckInConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  
  // QR Code state
  const [qr, setQr] = useState<{ qrCodeId: string; url?: string; imageBase64?: string; expiresAt?: string; token?: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  
  // PIN Code state
  const [pinCode, setPinCode] = useState<{ pinCode: string; expiresAt: string } | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  
  // Validation state
  const [validationInput, setValidationInput] = useState('')
  const [validationType, setValidationType] = useState<'qr' | 'pin'>('qr')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<string>('')
  
  // Records state
  const [records, setRecords] = useState<CheckInRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  
  // Stats state
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (eventId && activeTab === 'config') {
      loadConfig()
    }
  }, [eventId, activeTab])

  useEffect(() => {
    if (eventId && activeTab === 'records') {
      loadRecords()
    }
  }, [eventId, activeTab])

  useEffect(() => {
    if (eventId && activeTab === 'stats') {
      loadStats()
    }
  }, [eventId, activeTab])

  const loadConfig = async () => {
    if (!eventId) return
    setConfigLoading(true)
    try {
      const configData = await getCheckInConfig(eventId)
      setConfig(configData)
    } catch (error) {
      console.error('Failed to load config:', error)
      // Set default config if not found
      setConfig({
        eventId,
        methods: {
          qrCode: { enabled: true, expirationHours: 24, allowMultipleScans: false },
          pinCode: { enabled: true, codeLength: 6, expirationMinutes: 60 },
          manual: { enabled: true, requiresApproval: false },
          geofencing: { enabled: false, radiusMeters: 100 }
        },
        notifications: {
          sendQrByEmail: true,
          sendQrBySms: false,
          sendReminder: true,
          reminderHoursBefore: 24
        }
      })
    } finally {
      setConfigLoading(false)
    }
  }

  const loadRecords = async () => {
    if (!eventId) return
    setRecordsLoading(true)
    try {
      const recordsData = await getCheckInRecords(eventId)
      setRecords(recordsData)
    } catch (error) {
      console.error('Failed to load records:', error)
      setRecords([])
    } finally {
      setRecordsLoading(false)
    }
  }

  const loadStats = async () => {
    if (!eventId) return
    setStatsLoading(true)
    try {
      const statsData = await getCheckInStats(eventId)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats:', error)
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!config || !eventId) return
    setConfigLoading(true)
    try {
      const updatedConfig = await updateCheckInConfig(eventId, config)
      setConfig(updatedConfig)
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  const handleGenerateQr = async () => {
    if (!eventId) return
    setQrLoading(true)
    try {
      const res = await generateQrCode({ 
        eventId, 
        type: 'event',
        options: { size: 256, format: 'png' } 
      })
      setQr(res)
      setValidationResult('')
    } catch (error) {
      console.error('Failed to generate QR:', error)
    } finally {
      setQrLoading(false)
    }
  }

  const handleGeneratePin = async () => {
    if (!eventId) return
    setPinLoading(true)
    try {
      const res = await generatePinCode({ 
        eventId,
        userId: 'demo-user' // In real app, this would be the selected user
      })
      setPinCode(res)
    } catch (error) {
      console.error('Failed to generate PIN:', error)
    } finally {
      setPinLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!validationInput || !eventId) return
    setValidating(true)
    try {
      let result
      if (validationType === 'qr') {
        result = await validateQrCode({ qrCodeId: validationInput })
      } else {
        result = await validatePinCode({ eventId, pinCode: validationInput })
      }
      setValidationResult(result.valid ? `✅ Valid ${validationType.toUpperCase()}` : `❌ Invalid ${validationType.toUpperCase()}: ${result.message}`)
    } catch (error) {
      setValidationResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setValidating(false)
    }
  }

  const handleSendQrCodes = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      await sendQrCodesToParticipants(eventId, {
        sendEmail: config?.notifications.sendQrByEmail,
        sendSms: config?.notifications.sendQrBySms
      })
    } catch (error) {
      console.error('Failed to send QR codes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentTenant) {
    return (
      <AppShell title="Check-in Management">
        <div className="p-6">
          <EmptyState 
            title="No Organization Selected" 
            description="Please select an organization to manage check-ins." 
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Check-in Management">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Check-in Management</h1>
                <p className="text-sm text-muted-foreground">
                  Configure and manage event check-ins for <span className="font-medium">{currentTenant.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/app/check-in/scan', '_blank')}
                >
                  📱 Open Scanner
                </Button>
                <div className="hidden md:flex items-center gap-1 text-xs">
                  {(['config', 'qr-generator', 'validation', 'records', 'stats'] as ActiveTab[]).map((tab) => (
                    <button 
                      key={tab}
                      type="button" 
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded transition-colors ${
                        activeTab === tab 
                          ? 'text-blue-600 bg-blue-50 dark:bg-blue-950' 
                          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Event ID Input */}
            <div className="mt-4 max-w-md">
              <Label className="text-xs">Event ID</Label>
              <Input 
                value={eventId} 
                onChange={e => setEventId(e.target.value)} 
                placeholder="Enter event ID to configure check-in" 
              />
            </div>
          </div>

          {!eventId ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-8">
                  <EmptyState 
                    title="Enter Event ID" 
                    description="Please enter an event ID above to configure check-in settings." 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🚀 Quick Start Guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">For Event Organizers</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Enter your event ID above</li>
                        <li>Configure check-in methods (QR, PIN, Manual)</li>
                        <li>Generate QR codes for participants</li>
                        <li>Send codes via email/SMS</li>
                        <li>Monitor real-time statistics</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">For Participants</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Receive QR code or PIN via email/SMS</li>
                        <li>Go to the scanner page</li>
                        <li>Scan QR code or enter PIN</li>
                        <li>Get instant confirmation</li>
                        <li>Enjoy the event! 🎉</li>
                      </ol>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 text-xl">💡</div>
                      <div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">Pro Tip</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Use the multi-modal approach: QR codes for tech-savvy users, PIN codes for backup, 
                          and manual check-in for special cases. This ensures 100% coverage!
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Configuration Tab */}
              {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Check-in Methods</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {configLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <div className="text-sm text-muted-foreground">Loading configuration...</div>
                        </div>
                      ) : config ? (
                        <>
                          {/* QR Code Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={config.methods.qrCode.enabled}
                                onChange={e => setConfig({
                                  ...config,
                                  methods: {
                                    ...config.methods,
                                    qrCode: { ...config.methods.qrCode, enabled: e.target.checked }
                                  }
                                })}
                              />
                              <Label className="text-sm font-medium">QR Code Check-in</Label>
                            </div>
                            {config.methods.qrCode.enabled && (
                              <div className="ml-6 space-y-2">
                                <div>
                                  <Label className="text-xs">Expiration (hours)</Label>
                                  <Input 
                                    type="number" 
                                    value={config.methods.qrCode.expirationHours || 24}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        qrCode: { ...config.methods.qrCode, expirationHours: parseInt(e.target.value) }
                                      }
                                    })}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={config.methods.qrCode.allowMultipleScans || false}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        qrCode: { ...config.methods.qrCode, allowMultipleScans: e.target.checked }
                                      }
                                    })}
                                  />
                                  <Label className="text-xs">Allow multiple scans</Label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* PIN Code Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={config.methods.pinCode.enabled}
                                onChange={e => setConfig({
                                  ...config,
                                  methods: {
                                    ...config.methods,
                                    pinCode: { ...config.methods.pinCode, enabled: e.target.checked }
                                  }
                                })}
                              />
                              <Label className="text-sm font-medium">PIN Code Check-in</Label>
                            </div>
                            {config.methods.pinCode.enabled && (
                              <div className="ml-6 space-y-2">
                                <div>
                                  <Label className="text-xs">Code length</Label>
                                  <Input 
                                    type="number" 
                                    min="4" 
                                    max="8"
                                    value={config.methods.pinCode.codeLength || 6}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        pinCode: { ...config.methods.pinCode, codeLength: parseInt(e.target.value) }
                                      }
                                    })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Expiration (minutes)</Label>
                                  <Input 
                                    type="number" 
                                    value={config.methods.pinCode.expirationMinutes || 60}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        pinCode: { ...config.methods.pinCode, expirationMinutes: parseInt(e.target.value) }
                                      }
                                    })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Manual Check-in Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={config.methods.manual.enabled}
                                onChange={e => setConfig({
                                  ...config,
                                  methods: {
                                    ...config.methods,
                                    manual: { ...config.methods.manual, enabled: e.target.checked }
                                  }
                                })}
                              />
                              <Label className="text-sm font-medium">Manual Check-in</Label>
                            </div>
                            {config.methods.manual.enabled && (
                              <div className="ml-6">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={config.methods.manual.requiresApproval || false}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        manual: { ...config.methods.manual, requiresApproval: e.target.checked }
                                      }
                                    })}
                                  />
                                  <Label className="text-xs">Requires approval</Label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Geofencing Settings */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={config.methods.geofencing.enabled}
                                onChange={e => setConfig({
                                  ...config,
                                  methods: {
                                    ...config.methods,
                                    geofencing: { ...config.methods.geofencing, enabled: e.target.checked }
                                  }
                                })}
                              />
                              <Label className="text-sm font-medium">Geofencing Check-in</Label>
                            </div>
                            {config.methods.geofencing.enabled && (
                              <div className="ml-6 space-y-2">
                                <div>
                                  <Label className="text-xs">Radius (meters)</Label>
                                  <Input 
                                    type="number" 
                                    value={config.methods.geofencing.radiusMeters || 100}
                                    onChange={e => setConfig({
                                      ...config,
                                      methods: {
                                        ...config.methods,
                                        geofencing: { ...config.methods.geofencing, radiusMeters: parseInt(e.target.value) }
                                      }
                                    })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-4">
                            <Button onClick={handleSaveConfig} disabled={configLoading}>
                              {configLoading ? 'Saving...' : 'Save Configuration'}
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {config && (
                        <>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={config.notifications.sendQrByEmail || false}
                              onChange={e => setConfig({
                                ...config,
                                notifications: { ...config.notifications, sendQrByEmail: e.target.checked }
                              })}
                            />
                            <Label className="text-sm">Send QR codes by email</Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={config.notifications.sendQrBySms || false}
                              onChange={e => setConfig({
                                ...config,
                                notifications: { ...config.notifications, sendQrBySms: e.target.checked }
                              })}
                            />
                            <Label className="text-sm">Send QR codes by SMS</Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={config.notifications.sendReminder || false}
                              onChange={e => setConfig({
                                ...config,
                                notifications: { ...config.notifications, sendReminder: e.target.checked }
                              })}
                            />
                            <Label className="text-sm">Send reminders</Label>
                          </div>

                          {config.notifications.sendReminder && (
                            <div>
                              <Label className="text-xs">Reminder hours before event</Label>
                              <Input 
                                type="number" 
                                value={config.notifications.reminderHoursBefore || 24}
                                onChange={e => setConfig({
                                  ...config,
                                  notifications: { ...config.notifications, reminderHoursBefore: parseInt(e.target.value) }
                                })}
                              />
                            </div>
                          )}

                          <div className="pt-4">
                            <Button onClick={handleSendQrCodes} disabled={loading}>
                              {loading ? 'Sending...' : 'Send QR Codes to Participants'}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* QR Generator Tab */}
              {activeTab === 'qr-generator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Generate QR Code</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button disabled={qrLoading} onClick={handleGenerateQr}>
                        {qrLoading ? 'Generating...' : 'Generate Event QR Code'}
                      </Button>
                      {qr && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm">QR Code ID: <span className="font-mono">{qr.qrCodeId}</span></div>
                          {qr.imageBase64 ? (
                            <div className="flex justify-center">
                              <img alt="QR code" className="border rounded max-w-64" src={`data:image/png;base64,${qr.imageBase64}`} />
                            </div>
                          ) : qr.url ? (
                            <div className="flex justify-center">
                              <img alt="QR code" className="border rounded max-w-64" src={qr.url} />
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">QR preview unavailable. Use the ID above for validation.</div>
                          )}
                          {qr.expiresAt && (
                            <div className="text-xs text-muted-foreground">
                              Expires: {new Date(qr.expiresAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Generate PIN Code</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="secondary" disabled={pinLoading} onClick={handleGeneratePin}>
                        {pinLoading ? 'Generating...' : 'Generate PIN Code'}
                      </Button>
                      {pinCode && (
                        <div className="mt-4 space-y-2">
                          <div className="text-center">
                            <div className="text-3xl font-mono font-bold text-blue-600">{pinCode.pinCode}</div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Expires: {new Date(pinCode.expiresAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Validation Tab */}
              {activeTab === 'validation' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Test Validation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs">Validation Type</Label>
                        <Select value={validationType} onChange={e => setValidationType(e.target.value as 'qr' | 'pin')}>
                          <option value="qr">QR Code</option>
                          <option value="pin">PIN Code</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {validationType === 'qr' ? 'QR Code ID' : 'PIN Code'}
                        </Label>
                        <Input 
                          value={validationInput} 
                          onChange={e => setValidationInput(e.target.value)} 
                          placeholder={validationType === 'qr' ? 'Enter QR Code ID' : 'Enter PIN Code'} 
                        />
                      </div>
                      <Button 
                        variant="secondary" 
                        disabled={validating || !validationInput} 
                        onClick={handleValidate}
                      >
                        {validating ? 'Validating...' : 'Test Validation Only'}
                      </Button>
                      {validationResult && (
                        <div className="p-3 rounded border bg-gray-50 dark:bg-gray-800">
                          <div className="text-sm">{validationResult}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Direct Check-in Test</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Test the complete check-in flow (validation + attendance recording)
                      </div>
                      <div>
                        <Label className="text-xs">Check-in Method</Label>
                        <Select value={validationType} onChange={e => setValidationType(e.target.value as 'qr' | 'pin')}>
                          <option value="qr">QR Code Check-in</option>
                          <option value="pin">PIN Code Check-in</option>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {validationType === 'qr' ? 'QR Code ID' : 'PIN Code'}
                        </Label>
                        <Input 
                          value={validationInput} 
                          onChange={e => setValidationInput(e.target.value)} 
                          placeholder={validationType === 'qr' ? 'Enter QR Code ID' : 'Enter PIN Code'} 
                        />
                      </div>
                      <Button 
                        disabled={validating || !validationInput || !eventId} 
                        onClick={async () => {
                          if (!eventId || !validationInput) return
                          setValidating(true)
                          try {
                            const result = await checkIn({
                              eventId,
                              method: validationType === 'qr' ? 'qr_code' : 'pin_code',
                              qrCodeId: validationType === 'qr' ? validationInput : undefined,
                              pinCode: validationType === 'pin' ? validationInput : undefined
                            })
                            setValidationResult(`✅ Check-in successful! ID: ${result.id}`)
                          } catch (error) {
                            setValidationResult(`❌ Check-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                          } finally {
                            setValidating(false)
                          }
                        }}
                      >
                        {validating ? 'Processing...' : 'Complete Check-in'}
                      </Button>
                      {validationResult && (
                        <div className="p-3 rounded border bg-gray-50 dark:bg-gray-800">
                          <div className="text-sm">{validationResult}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Records Tab */}
              {activeTab === 'records' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Check-in Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recordsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <div className="text-sm text-muted-foreground">Loading records...</div>
                      </div>
                    ) : records.length === 0 ? (
                      <EmptyState 
                        title="No check-in records" 
                        description="No participants have checked in yet." 
                      />
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {records.map(record => (
                          <div key={record.id} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{record.userName}</div>
                              <div className="text-xs text-muted-foreground">
                                {record.method.replace('_', ' ').toUpperCase()} • {new Date(record.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              record.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status.replace('_', ' ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  {statsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <div className="text-sm text-muted-foreground">Loading statistics...</div>
                    </div>
                  ) : eventId ? (
                    <CheckInDashboard eventId={eventId} />
                  ) : (
                    <EmptyState 
                      title="No statistics available" 
                      description="Enter an event ID to view check-in statistics." 
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

