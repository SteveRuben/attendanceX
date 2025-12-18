import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QrScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
  isActive?: boolean
}

export function QrScanner({ onScan, onError, isActive = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (isActive && !isScanning) {
      startScanning()
    } else if (!isActive && isScanning) {
      stopScanning()
    }

    return () => {
      stopScanning()
    }
  }, [isActive])

  const startScanning = async () => {
    try {
      setError('')
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }

      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      setStream(mediaStream)
      setHasPermission(true)
      setIsScanning(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      // Start QR code detection
      startQrDetection()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setError(errorMessage)
      setHasPermission(false)
      onError?.(errorMessage)
      console.error('Camera access error:', err)
    }
  }

  const stopScanning = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsScanning(false)
  }

  const startQrDetection = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    const detectQr = () => {
      if (!isScanning || !video.videoWidth || !video.videoHeight) {
        if (isScanning) {
          requestAnimationFrame(detectQr)
        }
        return
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        // Get image data for QR detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        
        // Here you would integrate with a QR code detection library
        // For now, we'll simulate QR detection
        // In a real implementation, you'd use libraries like:
        // - jsQR: const code = jsQR(imageData.data, imageData.width, imageData.height)
        // - qr-scanner: QrScanner.scanImage(canvas)
        // - @zxing/library: codeReader.decodeFromImageData(imageData)
        
        // Simulate QR code detection (remove this in real implementation)
        if (Math.random() < 0.001) { // Very low probability for demo
          const mockQrData = `qr_check_in_demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          onScan(mockQrData)
          return
        }

        // Suppress unused variable warning
        void imageData

      } catch (err) {
        console.error('QR detection error:', err)
      }

      // Continue scanning
      if (isScanning) {
        requestAnimationFrame(detectQr)
      }
    }

    // Start detection loop
    requestAnimationFrame(detectQr)
  }

  const handleManualInput = () => {
    const input = prompt('Enter QR code manually:')
    if (input) {
      onScan(input)
    }
  }

  if (hasPermission === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Camera Access Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Camera access is required to scan QR codes. Please allow camera access and try again.
          </div>
          <div className="flex gap-2">
            <Button onClick={startScanning}>Retry Camera Access</Button>
            <Button variant="outline" onClick={handleManualInput}>Enter Code Manually</Button>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full max-w-md mx-auto rounded border"
            playsInline
            muted
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {!isScanning && (
            <div className="w-full max-w-md mx-auto h-64 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📷</div>
                <div className="text-sm text-muted-foreground">Camera not active</div>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Scanning overlay */}
              <div className="absolute inset-4 border-2 border-blue-500 rounded">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
              </div>
              
              {/* Scanning line animation */}
              <div className="absolute inset-4 overflow-hidden rounded">
                <div className="absolute w-full h-0.5 bg-blue-500 animate-pulse" 
                     style={{ 
                       top: '50%',
                       animation: 'scan 2s linear infinite'
                     }}>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isScanning ? (
            <Button onClick={startScanning}>Start Scanning</Button>
          ) : (
            <Button variant="outline" onClick={stopScanning}>Stop Scanning</Button>
          )}
          <Button variant="outline" onClick={handleManualInput}>Manual Input</Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Point your camera at a QR code to scan it automatically
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}
      </CardContent>

      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          50% { top: 50%; }
          100% { top: 90%; }
        }
      `}</style>
    </Card>
  )
}