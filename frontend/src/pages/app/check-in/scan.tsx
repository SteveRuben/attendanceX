import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrScanner } from '@/components/check-in/QrScanner'
import { validateQrCode, validatePinCode, checkIn, CheckInRecord } from '@/services/checkinService'

export default function CheckInScanPage() {
  const [eventId, setEventId] = useState('')
  const [scannerActive, setScannerActive] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    checkIn?: CheckInRecord
  } | null>(null)

  const handleQrScan = async (qrData: string) => {
    if (!eventId) {
      setResult({
        success: false,
        message: 'Please enter an event ID first'
      })
      return
    }

    setValidating(true)
    setScannerActive(false)
    
    try {
      // First validate the QR code
      const validation = await validateQrCode({ 
        qrCodeId: qrData,
        location: await getCurrentLocation()
      })
      
      if (validation.valid) {
        // If valid, perform the actual check-in
        const checkInResult = await checkIn({
          eventId,
          method: 'qr_code',
          location: await getCurrentLocation(),
          qrCodeId: qrData
        })
        
        setResult({
          success: true,
          message: 'Check-in successful!',
          checkIn: checkInResult
        })
      } else {
        setResult({
          success: false,
          message: validation.message || 'Invalid QR code'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed'
      })
    } finally {
      setValidating(false)
    }
  }

  const handlePinValidation = async () => {
    if (!eventId || !pinCode) {
      setResult({
        success: false,
        message: 'Please enter both event ID and PIN code'
      })
      return
    }

    setValidating(true)
    
    try {
      // First validate the PIN code
      const validation = await validatePinCode({ 
        eventId,
        pinCode: pinCode.trim()
      })
      
      if (validation.valid) {
        // If valid, perform the actual check-in
        const checkInResult = await checkIn({
          eventId,
          method: 'pin_code',
          pinCode: pinCode.trim()
        })
        
        setResult({
          success: true,
          message: 'Check-in successful!',
          checkIn: checkInResult
        })
        setPinCode('')
      } else {
        setResult({
          success: false,
          message: validation.message || 'Invalid PIN code'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed'
      })
    } finally {
      setValidating(false)
    }
  }

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        () => {
          resolve(undefined)
        },
        { timeout: 5000 }
      )
    })
  }

  const resetResult = () => {
    setResult(null)
  }

  return (
    <AppShell title="Event Check-in">
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">Event Check-in</h1>
            <p className="text-muted-foreground mt-2">
              Scan your QR code or enter your PIN to check in to the event
            </p>
          </div>

          {/* Event ID Input */}
          <Card>
            <CardHeader>
              <CardTitle>Event Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto">
                <Label className="text-sm">Event ID</Label>
                <Input 
                  value={eventId} 
                  onChange={e => setEventId(e.target.value)} 
                  placeholder="Enter event ID" 
                  className="text-center text-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Check-in Methods */}
          {eventId && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR Code Scanner */}
              <div>
                <QrScanner 
                  isActive={scannerActive}
                  onScan={handleQrScan}
                  onError={(error) => setResult({ success: false, message: error })}
                />
                <div className="mt-4 text-center">
                  <Button 
                    onClick={() => setScannerActive(!scannerActive)}
                    disabled={validating}
                    className="w-full"
                  >
                    {scannerActive ? 'Stop Scanner' : 'Start QR Scanner'}
                  </Button>
                </div>
              </div>

              {/* PIN Code Input */}
              <Card>
                <CardHeader>
                  <CardTitle>PIN Code Check-in</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Enter the PIN code you received via email or SMS
                  </div>
                  
                  <div>
                    <Label className="text-sm">PIN Code</Label>
                    <Input 
                      value={pinCode} 
                      onChange={e => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                      placeholder="Enter PIN code" 
                      className="text-center text-2xl font-mono tracking-widest"
                      maxLength={8}
                    />
                  </div>

                  <Button 
                    onClick={handlePinValidation}
                    disabled={validating || !pinCode.trim()}
                    className="w-full"
                  >
                    {validating ? 'Checking in...' : 'Check in with PIN'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {validating && (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <div className="text-lg font-medium">Processing check-in...</div>
                  <div className="text-sm text-muted-foreground">Please wait</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result Display */}
          {result && !validating && (
            <Card className={`border-2 ${result.success ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className={`text-6xl mb-4 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅' : '❌'}
                  </div>
                  <div className={`text-2xl font-bold mb-2 ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {result.success ? 'Check-in Successful!' : 'Check-in Failed'}
                  </div>
                  <div className={`text-lg mb-4 ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {result.message}
                  </div>
                  
                  {result.checkIn && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                      <div className="text-sm text-muted-foreground mb-2">Check-in Details:</div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Participant:</span> {result.checkIn.userName}</div>
                        <div><span className="font-medium">Method:</span> {result.checkIn.method.replace('_', ' ').toUpperCase()}</div>
                        <div><span className="font-medium">Time:</span> {new Date(result.checkIn.timestamp).toLocaleString()}</div>
                        <div><span className="font-medium">Status:</span> {result.checkIn.status.replace('_', ' ')}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-center">
                    <Button onClick={resetResult} variant="outline">
                      Check in Another Participant
                    </Button>
                    {result.success && (
                      <Button onClick={() => window.print()}>
                        Print Confirmation
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!result && !validating && eventId && (
            <Card>
              <CardHeader>
                <CardTitle>How to Check In</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">📱 QR Code Method</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Click "Start QR Scanner"</li>
                      <li>Allow camera access</li>
                      <li>Point camera at your QR code</li>
                      <li>Wait for automatic detection</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">🔢 PIN Code Method</h4>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Check your email or SMS</li>
                      <li>Find your PIN code</li>
                      <li>Enter the code in the field</li>
                      <li>Click "Check in with PIN"</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}