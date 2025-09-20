/**
 * Composant de pointage pour les employés
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
  Separator
} from '../components/ui';
import { 
  Clock, 
  MapPin, 
  Coffee, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Play,
  Square
} from 'lucide-react';
import { usePresence } from '../hooks/usePresence';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';
import { PresenceEntry, GeoLocation } from '../../shared';
import { formatTime, formatDuration } from '../utils/dateUtils';

interface PresenceTrackerProps {
  employeeId?: string;
  className?: string;
}

export const PresenceTracker: React.FC<PresenceTrackerProps> = ({
  employeeId,
  className = ''
}) => {
  const { user } = useAuth();
  const { location, error: locationError, requestLocation } = useGeolocation();
  const {
    currentStatus,
    todayEntry,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    loading,
    error
  } = usePresence(employeeId || user?.employeeId);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mettre à jour l'heure actuelle chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculer la durée de travail actuelle
  const getCurrentWorkDuration = (): string => {
    if (!todayEntry?.clockInTime) return '00:00:00';
    
    const startTime = new Date(todayEntry.clockInTime);
    const endTime = todayEntry.clockOutTime ? new Date(todayEntry.clockOutTime) : currentTime;
    
    return formatDuration(endTime.getTime() - startTime.getTime());
  };

  // Calculer la durée de pause actuelle
  const getCurrentBreakDuration = (): string => {
    if (!todayEntry?.breakEntries) return '00:00:00';
    
    const totalBreakMs = todayEntry.breakEntries.reduce((total, breakEntry) => {
      if (breakEntry.startTime) {
        const startTime = new Date(breakEntry.startTime);
        const endTime = breakEntry.endTime ? new Date(breakEntry.endTime) : currentTime;
        return total + (endTime.getTime() - startTime.getTime());
      }
      return total;
    }, 0);
    
    return formatDuration(totalBreakMs);
  };

  // Gérer le pointage d'arrivée
  const handleClockIn = async () => {
    setActionLoading('clock-in');
    try {
      await requestLocation();
      await clockIn({
        location,
        notes: ''
      });
    } catch (err) {
      console.error('Clock-in failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Gérer le pointage de sortie
  const handleClockOut = async () => {
    setActionLoading('clock-out');
    try {
      await requestLocation();
      await clockOut({
        location,
        notes: ''
      });
    } catch (err) {
      console.error('Clock-out failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Gérer le début de pause
  const handleStartBreak = async (type: 'lunch' | 'coffee' | 'personal' | 'other') => {
    setActionLoading('start-break');
    try {
      await requestLocation();
      await startBreak({
        type,
        location,
        notes: ''
      });
    } catch (err) {
      console.error('Start break failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Gérer la fin de pause
  const handleEndBreak = async () => {
    setActionLoading('end-break');
    try {
      await requestLocation();
      const activeBreak = todayEntry?.breakEntries?.find(b => !b.endTime);
      if (activeBreak) {
        await endBreak({
          breakId: activeBreak.id,
          location,
          notes: ''
        });
      }
    } catch (err) {
      console.error('End break failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Obtenir le statut actuel
  const getStatusInfo = () => {
    if (!todayEntry) {
      return {
        status: 'not_started',
        label: 'Pas encore pointé',
        color: 'gray',
        icon: Clock
      };
    }

    if (todayEntry.clockOutTime) {
      return {
        status: 'completed',
        label: 'Journée terminée',
        color: 'green',
        icon: CheckCircle
      };
    }

    const activeBreak = todayEntry.breakEntries?.find(b => !b.endTime);
    if (activeBreak) {
      return {
        status: 'on_break',
        label: 'En pause',
        color: 'orange',
        icon: Coffee
      };
    }

    return {
      status: 'working',
      label: 'Au travail',
      color: 'blue',
      icon: Play
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Pointage
          </span>
          <Badge variant={statusInfo.color as any} className="flex items-center">
            <StatusIcon className="h-4 w-4 mr-1" />
            {statusInfo.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Heure actuelle */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold">
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
        </div>

        {/* Informations de la journée */}
        {todayEntry && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Arrivée</div>
              <div className="font-medium">
                {todayEntry.clockInTime ? formatTime(new Date(todayEntry.clockInTime)) : '--:--'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Sortie</div>
              <div className="font-medium">
                {todayEntry.clockOutTime ? formatTime(new Date(todayEntry.clockOutTime)) : '--:--'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Temps de travail</div>
              <div className="font-medium">{getCurrentWorkDuration()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Temps de pause</div>
              <div className="font-medium">{getCurrentBreakDuration()}</div>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions de pointage */}
        <div className="space-y-3">
          {statusInfo.status === 'not_started' && (
            <Button
              onClick={handleClockIn}
              disabled={actionLoading === 'clock-in'}
              className="w-full"
              size="lg"
            >
              {actionLoading === 'clock-in' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Pointer l'arrivée
            </Button>
          )}

          {statusInfo.status === 'working' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStartBreak('lunch')}
                  disabled={!!actionLoading}
                  size="sm"
                >
                  {actionLoading === 'start-break' ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Coffee className="h-4 w-4 mr-1" />
                  )}
                  Pause déjeuner
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStartBreak('coffee')}
                  disabled={!!actionLoading}
                  size="sm"
                >
                  <Coffee className="h-4 w-4 mr-1" />
                  Pause café
                </Button>
              </div>
              <Button
                onClick={handleClockOut}
                disabled={actionLoading === 'clock-out'}
                variant="destructive"
                className="w-full"
              >
                {actionLoading === 'clock-out' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Pointer la sortie
              </Button>
            </div>
          )}

          {statusInfo.status === 'on_break' && (
            <Button
              onClick={handleEndBreak}
              disabled={actionLoading === 'end-break'}
              className="w-full"
            >
              {actionLoading === 'end-break' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Reprendre le travail
            </Button>
          )}

          {statusInfo.status === 'completed' && (
            <div className="text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Journée de travail terminée</p>
              <p className="text-sm">
                Temps total: {todayEntry?.totalHours?.toFixed(2) || '0'} heures
              </p>
            </div>
          )}
        </div>

        {/* Alertes et erreurs */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
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

        {/* Informations de localisation */}
        {location && (
          <div className="text-xs text-muted-foreground text-center">
            <MapPin className="h-3 w-3 inline mr-1" />
            Position: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};