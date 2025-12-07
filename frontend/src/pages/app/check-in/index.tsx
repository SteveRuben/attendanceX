import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateQrCode, validateQrCode } from '@/services/checkinService'

export default function CheckInPage() {
  const [eventId, setEventId] = useState('')
  const [qr, setQr] = useState<{ qrCodeId: string; url?: string; imageBase64?: string; expiresAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<string>('')

  const handleGenerate = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      const res = await generateQrCode({ eventId, options: { size: 256, format: 'png' } })
      setQr(res)
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async () => {
    if (!qr?.qrCodeId) return
    setValidating(true)
    try {
      const res = await validateQrCode({ qrCodeId: qr.qrCodeId })
      setResult(res.valid ? 'QR code valid' : 'Invalid QR code')
    } finally {
      setValidating(false)
    }
  }

  return (
    <AppShell title="QR Check-in">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">QR Check-in</h1>
            <p className="text-sm text-muted-foreground">Generate a QR code for an event and test validation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Generate QR code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Event ID</Label>
                <Input value={eventId} onChange={e => setEventId(e.target.value)} placeholder="e.g., 123" />
              </div>
              <Button disabled={loading || !eventId} onClick={handleGenerate}>{loading ? 'Generating...' : 'Generate'}</Button>
              {qr ? (
                <div className="mt-4 space-y-2">
                  <div className="text-sm">QR Code ID: <span className="font-mono">{qr.qrCodeId}</span></div>
                  {qr.imageBase64 ? (
                    <img alt="QR code" className="border rounded" src={`data:image/png;base64,${qr.imageBase64}`} />
                  ) : qr.url ? (
                    <img alt="QR code" className="border rounded" src={qr.url} />
                  ) : (
                    <div className="text-xs text-muted-foreground">QR preview unavailable from API. Use the ID above to validate.</div>
                  )}
                  {qr.expiresAt ? <div className="text-xs text-muted-foreground">Expires at {new Date(qr.expiresAt).toLocaleString()}</div> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Validate QR code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">Use the generated QR Code ID to validate.</div>
              <Button variant="secondary" disabled={validating || !qr?.qrCodeId} onClick={handleValidate}>{validating ? 'Validating...' : 'Validate'}</Button>
              {result ? <div className="text-sm">{result}</div> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

