// src/components/qr/QRCodeDisplay.tsx - Composant d'affichage de QR code

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  Download, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Copy,
  Share2,
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface QRCodeDisplayProps {
  eventId: string;
  eventTitle: string;
  qrCodeData?: string;
  expiresAt?: Date;
  isActive?: boolean;
  usageCount?: number;
  maxUsage?: number;
  onRegenerate?: () => void;
  onDownload?: () => void;
  className?: string;
}

const QRCodeDisplay = ({
  eventId,
  eventTitle,
  qrCodeData,
  expiresAt,
  isActive = true,
  usageCount = 0,
  maxUsage,
  onRegenerate,
  onDownload,
  className = ''
}: QRCodeDisplayProps) => {
  const [showQRCode, setShowQRCode] = useState(true);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>('');

  useEffect(() => {
    if (expiresAt) {
      const updateTimer = () => {
        const now = new Date();
        const timeLeft = expiresAt.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
          setTimeUntilExpiry('Expiré');
          return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeUntilExpiry(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeUntilExpiry(`${minutes}m ${seconds}s`);
        } else {
          setTimeUntilExpiry(`${seconds}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [expiresAt]);

  const handleCopyQRData = async () => {
    if (!qrCodeData) return;
    
    try {
      await navigator.clipboard.writeText(qrCodeData);
      toast.success('Données QR code copiées !');
    } catch (err) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/checkin/${eventId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check-in: ${eventTitle}`,
          text: 'Scannez ce QR code pour vous enregistrer à l\'événement',
          url: shareUrl
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copier l'URL
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Lien de check-in copié !');
      } catch (err) {
        toast.error('Erreur lors de la copie du lien');
      }
    }
  };

  const getStatusBadge = () => {
    if (!isActive) {
      return <Badge variant="destructive">Inactif</Badge>;
    }
    
    if (expiresAt && new Date() > expiresAt) {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    
    if (maxUsage && usageCount >= maxUsage) {
      return <Badge variant="secondary">Limite atteinte</Badge>;
    }
    
    return <Badge variant="default">Actif</Badge>;
  };

  const isExpired = expiresAt && new Date() > expiresAt;
  const isLimitReached = maxUsage && usageCount >= maxUsage;
  const needsAttention = !isActive || isExpired || isLimitReached;

  return (
    <Card className={`${className} ${needsAttention ? 'border-destructive' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <QrCode className="w-5 h-5 mr-2" />
            QR Code de l'événement
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alertes */}
        {needsAttention && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {!isActive && "Ce QR code est inactif."}
              {isExpired && "Ce QR code a expiré."}
              {isLimitReached && "La limite d'utilisation a été atteinte."}
              {" "}Régénérez-le pour permettre les check-ins.
            </AlertDescription>
          </Alert>
        )}

        {/* Zone QR Code */}
        <div className="text-center">
          {showQRCode && qrCodeData ? (
            <div className="relative inline-block">
              {/* Placeholder pour le QR code - dans un vrai projet, utiliser une librairie QR */}
              <div className="w-64 h-64 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">QR Code</p>
                  <p className="text-xs text-gray-400 mt-1 break-all px-2">
                    {qrCodeData.substring(0, 20)}...
                  </p>
                </div>
              </div>
              
              {/* Overlay pour masquer si nécessaire */}
              {!isActive && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="text-white text-center">
                    <EyeOff className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">QR Code inactif</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="text-center text-muted-foreground">
                <QrCode className="w-16 h-16 mx-auto mb-2" />
                <p>Aucun QR code généré</p>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowQRCode(!showQRCode)}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            {showQRCode ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Masquer
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Afficher
              </>
            )}
          </Button>
        </div>

        {/* Informations */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>Utilisations: {usageCount}</span>
              {maxUsage && <span className="text-muted-foreground">/{maxUsage}</span>}
            </div>
            
            {expiresAt && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {isExpired ? 'Expiré' : `Expire dans: ${timeUntilExpiry}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Événement: {eventTitle}</span>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span>ID: {eventId}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onDownload}
            variant="outline"
            size="sm"
            disabled={!qrCodeData}
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          
          <Button
            onClick={handleCopyQRData}
            variant="outline"
            size="sm"
            disabled={!qrCodeData}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier données
          </Button>
          
          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          
          <Button
            onClick={onRegenerate}
            variant="outline"
            size="sm"
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Régénérer
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <p className="font-medium mb-1">Instructions pour les participants :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ouvrez l'appareil photo de votre téléphone</li>
            <li>Pointez vers le QR code</li>
            <li>Appuyez sur le lien qui apparaît</li>
            <li>Ou utilisez l'application de l'événement pour scanner</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;