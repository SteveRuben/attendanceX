// src/components/mobile/MobileCheckIn.tsx - Interface mobile de check-in

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Camera,
  Fingerprint,
  CreditCard,
  Users,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import QRCodeScanner from '../qr/QRCodeScanner';

interface Event {
  id: string;
  title: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  description?: string;
  capacity?: number;
  currentAttendees: number;
  status: 'upcoming' | 'ongoing' | 'ended';
}

interface AttendanceRecord {
  id: string;
  eventId: string;
  userId: string;
  status: 'present' | 'absent' | 'late';
  checkInTime: Date;
  method: string;
}

interface MobileCheckInProps {
  userId: string;
  onCheckInComplete: (record: AttendanceRecord) => void;
}

const MobileCheckIn = ({ userId, onCheckInComplete }: MobileCheckInProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState<'qr' | 'manual' | 'location' | 'biometric' | 'nfc'>('qr');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    loadAvailableEvents();
    getCurrentLocation();
    getDeviceInfo();

    // Écouter les changements de statut réseau
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAvailableEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/user/${userId}/available`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      if (isOnline) {
        toast.error('Erreur lors du chargement des événements');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const getDeviceInfo = () => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString()
    };
    setDeviceInfo(info);
  };

  const handleCheckIn = async (eventId: string, method: string, additionalData?: any) => {
    try {
      setLoading(true);
      
      const checkInData = {
        eventId,
        userId,
        method,
        timestamp: new Date().toISOString(),
        location,
        deviceInfo,
        ...additionalData
      };

      let response;
      
      if (isOnline) {
        // Check-in en ligne
        response = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkInData)
        });
      } else {
        // Check-in hors ligne
        const offlineService = await import('../../services/offlineSync.service');
        const attendanceId = await offlineService.offlineSyncService.recordOfflineAttendance(
          eventId,
          userId,
          method,
          { location, deviceInfo, ...additionalData }
        );
        
        toast.success('Check-in enregistré hors ligne. Sera synchronisé automatiquement.');
        
        // Simuler une réponse pour l'interface
        const mockRecord: AttendanceRecord = {
          id: attendanceId,
          eventId,
          userId,
          status: 'present',
          checkInTime: new Date(),
          method
        };
        
        onCheckInComplete(mockRecord);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Check-in effectué avec succès !');
        onCheckInComplete(data.data);
        
        // Actualiser la liste des événements
        await loadAvailableEvents();
      } else {
        toast.error(data.error || 'Erreur lors du check-in');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.message || 'Erreur lors du check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    try {
      // Valider le QR code et extraire l'ID de l'événement
      const response = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.eventId) {
        await handleCheckIn(data.data.eventId, 'qr_code', { qrData });
        setShowQRScanner(false);
      } else {
        toast.error('QR code invalide ou expiré');
      }
    } catch (error) {
      toast.error('Erreur lors de la validation du QR code');
    }
  };

  const handleLocationCheckIn = async (event: Event) => {
    if (!location) {
      toast.error('Localisation non disponible');
      return;
    }

    // Vérifier si l'utilisateur est dans la zone autorisée
    // (Cette logique devrait être côté serveur pour plus de sécurité)
    await handleCheckIn(event.id, 'geolocation', { 
      coordinates: location,
      accuracy: 'high'
    });
  };

  const getEventStatusBadge = (event: Event) => {
    const now = new Date();
    const start = new Date(event.startDateTime);
    const end = new Date(event.endDateTime);

    if (now < start) {
      const minutesUntilStart = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
      if (minutesUntilStart <= 30) {
        return <Badge className="bg-yellow-100 text-yellow-800">Bientôt ({minutesUntilStart}min)</Badge>;
      }
      return <Badge variant="outline">À venir</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-green-100 text-green-800">En cours</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Terminé</Badge>;
    }
  };

  const getCapacityStatus = (event: Event) => {
    if (!event.capacity) return null;
    
    const percentage = (event.currentAttendees / event.capacity) * 100;
    
    if (percentage >= 95) {
      return <Badge className="bg-red-100 text-red-800">Complet</Badge>;
    } else if (percentage >= 80) {
      return <Badge className="bg-orange-100 text-orange-800">Presque complet</Badge>;
    }
    
    return null;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header avec statut */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Check-in Mobile</h1>
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <Battery className="w-4 h-4 text-gray-600" />
              <Signal className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          
          {!isOnline && (
            <Alert className="mt-2">
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Mode hors ligne - Les check-ins seront synchronisés automatiquement
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Scanner QR */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Scanner QR Code</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRScanner(false)}
              >
                Fermer
              </Button>
            </div>
            <QRCodeScanner
              onScan={handleQRScan}
              onError={(error) => {
                console.error('QR scan error:', error);
                toast.error('Erreur du scanner QR');
              }}
            />
          </div>
        </div>
      )}

      {/* Méthodes de check-in rapide */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Check-in rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex flex-col items-center justify-center space-y-1"
            onClick={() => setShowQRScanner(true)}
          >
            <QrCode className="w-6 h-6" />
            <span className="text-xs">QR Code</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex flex-col items-center justify-center space-y-1"
            onClick={() => getCurrentLocation()}
            disabled={!location}
          >
            <MapPin className="w-6 h-6" />
            <span className="text-xs">Localisation</span>
          </Button>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="px-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Événements disponibles</h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun événement disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <Card key={event.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm leading-tight">{event.title}</h3>
                    <div className="flex flex-col items-end space-y-1">
                      {getEventStatusBadge(event)}
                      {getCapacityStatus(event)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>
                        {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                      </span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {event.capacity && (
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        <span>{event.currentAttendees} / {event.capacity} participants</span>
                      </div>
                    )}
                  </div>

                  {event.status === 'ongoing' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(event.id, 'manual')}
                        disabled={loading}
                        className="text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Check-in
                      </Button>
                      
                      {location && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLocationCheckIn(event)}
                          disabled={loading}
                          className="text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Géoloc.
                        </Button>
                      )}
                    </div>
                  )}

                  {event.status === 'upcoming' && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="w-full text-xs"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Pas encore commencé
                      </Button>
                    </div>
                  )}

                  {event.status === 'ended' && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="w-full text-xs"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Événement terminé
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Statut de synchronisation hors ligne */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4">
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              Mode hors ligne actif. {/* Afficher le nombre d'enregistrements en attente */}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default MobileCheckIn;