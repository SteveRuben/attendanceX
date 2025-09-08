// src/pages/CheckIn/QRCheckIn.tsx - Page de check-in par QR code

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import QRCodeScanner from '@/components/qr/QRCodeScanner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  Smartphone,
  Camera
} from 'lucide-react';
import { eventService, qrCodeService } from '@/services';
import type { Event } from '../../shared';
import { toast } from 'react-toastify';

const QRCheckIn = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    attendance?: any;
  } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // QR code pré-rempli depuis l'URL
  const prefilledQR = searchParams.get('qr');

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }

    // Si un QR code est fourni dans l'URL, l'utiliser directement
    if (prefilledQR) {
      handleQRCodeScan(prefilledQR);
    }
  }, [eventId, prefilledQR]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEventById(eventId!);
      
      if (response.success && response.data) {
        setEvent(response.data);
      } else {
        toast.error('Événement non trouvé');
        navigate('/events');
      }
    } catch (error: any) {
      console.error('Error loading event:', error);
      toast.error('Erreur lors du chargement de l\'événement');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeScan = async (qrData: string) => {
    if (checkingIn) return;

    try {
      setCheckingIn(true);
      
      // Obtenir la géolocalisation si possible
      const location = await qrCodeService.getCurrentLocation();
      
      // Traiter le check-in
      const result = await qrCodeService.processQRCodeCheckIn(qrData, location || undefined);
      
      setCheckInResult({
        success: result.success,
        message: result.data?.message || (result.success ? 'Check-in réussi !' : 'Erreur lors du check-in'),
        attendance: result.data?.attendance
      });

      if (result.success) {
        toast.success('Check-in effectué avec succès !');
      } else {
        toast.error(result.data?.message || 'Erreur lors du check-in');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      const errorMessage = error.message || 'Erreur lors du check-in';
      
      setCheckInResult({
        success: false,
        message: errorMessage
      });
      
      toast.error(errorMessage);
    } finally {
      setCheckingIn(false);
    }
  };  
  const handleScanError = (error: string) => {
    console.error('QR scan error:', error);
    toast.error(`Erreur de scan: ${error}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Événement non trouvé ou inaccessible.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Check-in</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {/* Informations de l'événement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Informations de l'événement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                {new Date(event.startDateTime).toLocaleString('fr-FR')}
              </span>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{event.location.address || 'Lieu non spécifié'}</span>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{event.participants?.length || 0} participants</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultat du check-in */}
      {checkInResult && (
        <Alert variant={checkInResult.success ? "default" : "destructive"}>
          {checkInResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{checkInResult.message}</p>
              {checkInResult.attendance && (
                <div className="text-sm">
                  <p>Heure d'arrivée: {new Date(checkInResult.attendance.checkInTime).toLocaleTimeString('fr-FR')}</p>
                  <p>Statut: <Badge variant="default">{checkInResult.attendance.status}</Badge></p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Scanner QR Code */}
      {!checkInResult?.success && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2" />
                Comment faire le check-in ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Activez votre caméra</p>
                    <p className="text-sm text-muted-foreground">
                      Cliquez sur "Scanner QR Code" pour activer la caméra
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Scannez le QR code</p>
                    <p className="text-sm text-muted-foreground">
                      Pointez votre caméra vers le QR code affiché par l'organisateur
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Confirmez votre présence</p>
                    <p className="text-sm text-muted-foreground">
                      Votre présence sera automatiquement enregistrée
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => setShowScanner(!showScanner)}
                  className="w-full"
                  disabled={checkingIn}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {showScanner ? 'Masquer le scanner' : 'Scanner QR Code'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scanner */}
          {showScanner && (
            <QRCodeScanner
              onScanSuccess={handleQRCodeScan}
              onScanError={handleScanError}
              isActive={showScanner && !checkingIn}
            />
          )}
        </div>
      )}

      {/* Actions après check-in réussi */}
      {checkInResult?.success && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Check-in réussi !</h3>
            <p className="text-muted-foreground mb-6">
              Votre présence à l'événement "{event.title}" a été enregistrée avec succès.
            </p>
            
            <div className="flex justify-center space-x-4">
              <Button onClick={() => navigate('/events')} variant="outline">
                Voir mes événements
              </Button>
              <Button onClick={() => navigate(`/events/${eventId}`)}>
                Détails de l'événement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QRCheckIn;