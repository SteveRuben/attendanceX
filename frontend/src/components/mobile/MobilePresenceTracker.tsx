/**
 * Composant mobile pour le suivi de présence
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Progress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui';
import {
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Camera,
  User,
  Calendar,
  Timer,
  Pause,
  Play,
  Square
} from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/hooks/useAuth';
import { formatTime, formatDuration } from '@/utils/dateUtils';

interface MobilePresenceTrackerProps {
  className?: string;
}

export const MobilePresenceTracker: React.FC<MobilePresenceTrackerProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const {
    currentPresence,
    todayPresence,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    loading,
    error
  } = usePresence();
  
  const {
    location,
    accuracy,
    loading: locationLoading,
    error: locationError,
    requestLocation
  } = useGeolocation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'clockIn' | 'clockOut' | 'startBreak' | 'endBreak'>('clockIn');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workDuration, setWorkDuration] = useState(0);
  const [breakDuration, setBreakDuration] = useState(0);

  // Mettre à jour l'heure actuelle
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Surveiller la connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculer les durées de travail
  useEffect(() => {
    if (todayPresence) {
      let totalWork = 0;
      let totalBreak = 0;

      todayPresence.forEach(entry => {
        if (entry.clockInTime && entry.clockOutTime) {
          const workTime = new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime();
          totalWork += workTime;
        }
        
        if (entry.breaks) {
          entry.breaks.forEach(breakEntry => {
            if (breakEntry.startTime && breakEntry.endTime) {
              const breakTime = new Date(breakEntry.endTime).getTime() - new Date(breakEntry.startTime).getTime();
              totalBreak += breakTime;
            }
          });
        }
      });

      setWorkDuration(totalWork);
      setBreakDuration(totalBreak);
    }
  }, [todayPresence]);

  // Obtenir le statut actuel
  const getCurrentStatus = () => {
    if (!currentPresence) return 'absent';
    if (currentPresence.onBreak) return 'break';
    if (currentPresence.clockInTime && !currentPresence.clockOutTime) return 'present';
    return 'absent';
  };

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600';
      case 'break': return 'text-orange-600';
      case 'absent': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Présent</Badge>;
      case 'break':
        return <Badge variant="warning" className="flex items-center"><Pause className="h-3 w-3 mr-1" />En pause</Badge>;
      case 'absent':
        return <Badge variant="secondary" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  // Gérer les actions de présence
  const handlePresenceAction = async (action: 'clockIn' | 'clockOut' | 'startBreak' | 'endBreak') => {
    if (!location && action === 'clockIn') {
      await requestLocation();
      return;
    }

    try {
      switch (action) {
        case 'clockIn':
          await clockIn(location);
          break;
        case 'clockOut':
          await clockOut(location);
          break;
        case 'startBreak':
          await startBreak();
          break;
        case 'endBreak':
          await endBreak();
          break;
      }
      setConfirmDialog(false);
    } catch (err) {
      console.error('Presence action failed:', err);
    }
  };

  // Ouvrir le dialog de confirmation
  const openConfirmDialog = (action: 'clockIn' | 'clockOut' | 'startBreak' | 'endBreak') => {
    setActionType(action);
    setConfirmDialog(true);
  };

  const status = getCurrentStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Statut de connexion */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Battery className="h-4 w-4 text-gray-600" />
          <Signal className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      {/* Heure actuelle */}
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold mb-2">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statut actuel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Statut actuel</span>
            {getStatusBadge(status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations de localisation */}
          {location && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                Position: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                {accuracy && ` (±${accuracy.toFixed(0)}m)`}
              </span>
            </div>
          )}

          {/* Durées de travail */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(workDuration)}
              </div>
              <div className="text-sm text-muted-foreground">Temps de travail</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatDuration(breakDuration)}
              </div>
              <div className="text-sm text-muted-foreground">Temps de pause</div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-2">
            {status === 'absent' && (
              <Button
                onClick={() => openConfirmDialog('clockIn')}
                disabled={loading || locationLoading}
                className="w-full"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                {locationLoading ? 'Localisation...' : 'Pointer l\'arrivée'}
              </Button>
            )}

            {status === 'present' && (
              <div className="space-y-2">
                <Button
                  onClick={() => openConfirmDialog('startBreak')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Commencer une pause
                </Button>
                <Button
                  onClick={() => openConfirmDialog('clockOut')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Pointer le départ
                </Button>
              </div>
            )}

            {status === 'break' && (
              <div className="space-y-2">
                <Button
                  onClick={() => openConfirmDialog('endBreak')}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Reprendre le travail
                </Button>
                <Button
                  onClick={() => openConfirmDialog('clockOut')}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Pointer le départ
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résumé de la journée */}
      {todayPresence && todayPresence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Résumé de la journée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayPresence.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">
                    {entry.clockInTime && formatTime(new Date(entry.clockInTime))}
                    {entry.clockOutTime && ` - ${formatTime(new Date(entry.clockOutTime))}`}
                  </span>
                </div>
                {entry.clockInTime && entry.clockOutTime && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(
                      new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime()
                    )}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {locationError && (
        <Alert variant="destructive">
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            Erreur de géolocalisation: {locationError}
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && (
        <Alert variant="warning">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Mode hors ligne. Les données seront synchronisées lors de la reconnexion.
          </AlertDescription>
        </Alert>
      )}

      {/* Dialog de confirmation */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'clockIn' && 'Confirmer l\'arrivée'}
              {actionType === 'clockOut' && 'Confirmer le départ'}
              {actionType === 'startBreak' && 'Commencer une pause'}
              {actionType === 'endBreak' && 'Reprendre le travail'}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>Heure: {formatTime(currentTime)}</p>
                {location && (
                  <p className="text-sm text-muted-foreground">
                    Position: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                )}
                {actionType === 'clockOut' && workDuration > 0 && (
                  <p className="text-sm">
                    Temps de travail aujourd'hui: {formatDuration(workDuration)}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => handlePresenceAction(actionType)}
              disabled={loading}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};