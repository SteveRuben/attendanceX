// src/components/qr/QRCodeScanner.tsx - Composant de scan de QR code

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Flashlight,
  FlashlightOff,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface QRCodeScannerProps {
  onScanSuccess: (qrData: string) => void;
  onScanError?: (error: string) => void;
  isActive?: boolean;
  className?: string;
}

interface ScanResult {
  success: boolean;
  data?: string;
  error?: string;
  timestamp: Date;
}

const QRCodeScanner = ({ 
  onScanSuccess, 
  onScanError, 
  isActive = true, 
  className = '' 
}: QRCodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (isActive) {
      requestCameraPermission();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isActive]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setHasPermission(true);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setHasPermission(false);
      setError('Accès à la caméra refusé. Veuillez autoriser l\'accès à la caméra pour scanner les QR codes.');
      
      if (onScanError) {
        onScanError('Camera permission denied');
      }
    }
  };

  const startScanning = async () => {
    if (!hasPermission || !videoRef.current) return;

    setIsScanning(true);
    setError(null);

    try {
      await videoRef.current.play();
      scanQRCode();
    } catch (err: any) {
      console.error('Error starting video:', err);
      setError('Erreur lors du démarrage de la caméra');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanQRCode);
      return;
    }

    // Ajuster la taille du canvas à la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner la frame vidéo sur le canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Simuler la détection de QR code
      // Dans un vrai projet, utiliser une librairie comme jsQR ou qr-scanner
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = this.detectQRCode(imageData);

      if (qrCode) {
        handleScanSuccess(qrCode);
        return;
      }
    } catch (err) {
      console.error('QR scan error:', err);
    }

    // Continuer le scan
    if (isScanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  const detectQRCode = (imageData: ImageData): string | null => {
    // Placeholder pour la détection de QR code
    // Dans un vrai projet, utiliser jsQR ou une autre librairie
    
    // Simuler une détection aléatoire pour les tests
    if (Math.random() < 0.001) { // 0.1% de chance par frame
      return 'sample-qr-code-data-' + Date.now();
    }
    
    return null;
  };

  const handleScanSuccess = (qrData: string) => {
    const result: ScanResult = {
      success: true,
      data: qrData,
      timestamp: new Date()
    };
    
    setLastScan(result);
    setIsScanning(false);
    
    toast.success('QR code scanné avec succès !');
    onScanSuccess(qrData);
  };

  const handleScanFailure = (error: string) => {
    const result: ScanResult = {
      success: false,
      error,
      timestamp: new Date()
    };
    
    setLastScan(result);
    setError(error);
    
    if (onScanError) {
      onScanError(error);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        });
        setTorchEnabled(!torchEnabled);
      } else {
        toast.warning('Flash non disponible sur cet appareil');
      }
    } catch (err) {
      console.error('Torch toggle error:', err);
      toast.error('Erreur lors de l\'activation du flash');
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    stopScanning();
    await requestCameraPermission();
    
    if (isScanning) {
      startScanning();
    }
  };

  const resetScanner = () => {
    setError(null);
    setLastScan(null);
    stopScanning();
    requestCameraPermission();
  };

  if (hasPermission === null) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Demande d'accès à la caméra...</p>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CameraOff className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Accès à la caméra requis</h3>
          <p className="text-muted-foreground mb-4">
            Pour scanner les QR codes, veuillez autoriser l'accès à la caméra.
          </p>
          <Button onClick={requestCameraPermission}>
            <Camera className="w-4 h-4 mr-2" />
            Autoriser la caméra
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Scanner QR Code
          </span>
          <div className="flex items-center space-x-2">
            {isScanning && (
              <Badge variant="default" className="animate-pulse">
                <Camera className="w-3 h-3 mr-1" />
                Scan en cours
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Zone de scan */}
        <div className="relative">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Overlay de scan */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-primary animate-pulse rounded-lg"></div>
                )}
              </div>
            </div>

            {/* Canvas caché pour le traitement */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex justify-center space-x-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Démarrer le scan
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="flex-1">
              <CameraOff className="w-4 h-4 mr-2" />
              Arrêter le scan
            </Button>
          )}
          
          <Button onClick={toggleTorch} variant="outline" size="icon">
            {torchEnabled ? (
              <FlashlightOff className="w-4 h-4" />
            ) : (
              <Flashlight className="w-4 h-4" />
            )}
          </Button>
          
          <Button onClick={switchCamera} variant="outline" size="icon">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                onClick={resetScanner} 
                variant="outline" 
                size="sm" 
                className="ml-2"
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dernier résultat de scan */}
        {lastScan && (
          <Alert variant={lastScan.success ? "default" : "destructive"}>
            {lastScan.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {lastScan.success ? (
                <>
                  <strong>Scan réussi !</strong>
                  <br />
                  <code className="text-xs">{lastScan.data}</code>
                </>
              ) : (
                <>
                  <strong>Erreur de scan :</strong> {lastScan.error}
                </>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {lastScan.timestamp.toLocaleTimeString()}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Pointez la caméra vers un QR code pour le scanner automatiquement</p>
          <p className="mt-1">Assurez-vous que le QR code est bien visible et éclairé</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeScanner;