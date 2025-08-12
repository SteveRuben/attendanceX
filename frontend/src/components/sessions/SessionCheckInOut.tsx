// src/components/sessions/SessionCheckInOut.tsx - Composant de check-in/out de sessions

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EventSession {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isRequired: boolean;
  sessionType: 'presentation' | 'workshop' | 'break' | 'networking' | 'meal' | 'other';
  location?: string;
  presenter?: string;
  order: number;
}

interface SessionAttendance {
  id: string;
  sessionId: string;
  userId: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late' | 'left_early' | 'partial';
  duration: number;
  method: string;
  notes?: string;
}

interface SessionCheckInOutProps {
  session: EventSession;
  attendance?: SessionAttendance;
  onCheckIn: (sessionId: string) => Promise<void>;
  onCheckOut: (sessionId: string) => Promise<void>;
  disabled?: boolean;
}

const SessionCheckInOut = ({
  session,
  attendance,
  onCheckIn,
  onCheckOut,
  disabled = false
}: SessionCheckInOutProps) => {
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionProgress, setSessionProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Calculer le progrès de la session
      const sessionStart = session.startTime.getTime();
      const sessionEnd = session.endTime.getTime();
      const currentTime = now.getTime();
      
      if (currentTime < sessionStart) {
        setSessionProgress(0);
      } else if (currentTime > sessionEnd) {
        setSessionProgress(100);
      } else {
        const progress = ((currentTime - sessionStart) / (sessionEnd - sessionStart)) * 100;
        setSessionProgress(Math.round(progress));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const handleCheckIn = async () => {
    if (loading || disabled) return;
    
    try {
      setLoading(true);
      await onCheckIn(session.id);
      toast.success(`Check-in effectué pour "${session.title}"`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du check-in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (loading || disabled) return;
    
    try {
      setLoading(true);
      await onCheckOut(session.id);
      toast.success(`Check-out effectué pour "${session.title}"`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du check-out');
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = () => {
    const now = currentTime;
    const start = session.startTime;
    const end = session.endTime;

    if (now < start) {
      return { status: 'upcoming', label: 'À venir', color: 'bg-blue-100 text-blue-800' };
    } else if (now >= start && now <= end) {
      return { status: 'ongoing', label: 'En cours', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'ended', label: 'Terminée', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAttendanceStatus = () => {
    if (!attendance) {
      return { status: 'not_checked_in', label: 'Non enregistré', color: 'bg-gray-100 text-gray-800', icon: XCircle };
    }

    const configs = {
      present: { label: 'Présent', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      late: { label: 'En retard', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      left_early: { label: 'Parti tôt', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      partial: { label: 'Présence partielle', color: 'bg-blue-100 text-blue-800', icon: Timer },
      absent: { label: 'Absent', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = configs[attendance.status as keyof typeof configs] || configs.absent;
    return { status: attendance.status, ...config };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTimeUntilStart = () => {
    const diff = session.startTime.getTime() - currentTime.getTime();
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `Commence dans ${hours}h ${minutes % 60}m`;
    }
    return `Commence dans ${minutes}m`;
  };

  const getTimeRemaining = () => {
    const diff = session.endTime.getTime() - currentTime.getTime();
    if (diff <= 0) return null;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `Se termine dans ${hours}h ${minutes % 60}m`;
    }
    return `Se termine dans ${minutes}m`;
  };

  const sessionStatus = getSessionStatus();
  const attendanceStatus = getAttendanceStatus();
  const AttendanceIcon = attendanceStatus.icon;
  const canCheckIn = sessionStatus.status === 'ongoing' && !attendance?.checkInTime;
  const canCheckOut = sessionStatus.status === 'ongoing' && attendance?.checkInTime && !attendance?.checkOutTime;

  return (
    <Card className={`transition-all hover:shadow-md ${
      session.isRequired ? 'border-l-4 border-l-orange-500' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center">
              {session.title}
              {session.isRequired && (
                <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">
                  Obligatoire
                </Badge>
              )}
            </CardTitle>
            {session.description && (
              <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <Badge className={sessionStatus.color}>
              {sessionStatus.label}
            </Badge>
            <Badge className={attendanceStatus.color}>
              <AttendanceIcon className="w-3 h-3 mr-1" />
              {attendanceStatus.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informations de la session */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {session.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {' - '}
              {session.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {session.location && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{session.location}</span>
            </div>
          )}
          
          {session.presenter && (
            <div className="flex items-center text-muted-foreground">
              <User className="w-4 h-4 mr-2" />
              <span>{session.presenter}</span>
            </div>
          )}
          
          <div className="flex items-center text-muted-foreground">
            <Timer className="w-4 h-4 mr-2" />
            <span>
              {formatDuration(
                Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60))
              )}
            </span>
          </div>
        </div>

        {/* Progrès de la session */}
        {sessionStatus.status === 'ongoing' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progrès de la session</span>
              <span className="font-medium">{sessionProgress}%</span>
            </div>
            <Progress value={sessionProgress} className="h-2" />
            {getTimeRemaining() && (
              <p className="text-xs text-muted-foreground text-center">
                {getTimeRemaining()}
              </p>
            )}
          </div>
        )}

        {/* Temps jusqu'au début */}
        {sessionStatus.status === 'upcoming' && getTimeUntilStart() && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {getTimeUntilStart()}
            </AlertDescription>
          </Alert>
        )}

        {/* Informations de présence */}
        {attendance && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Détails de présence</span>
              <Badge variant="outline">{attendanceStatus.label}</Badge>
            </div>
            
            {attendance.checkInTime && (
              <div className="text-sm text-muted-foreground">
                <strong>Arrivée:</strong> {attendance.checkInTime.toLocaleTimeString('fr-FR')}
                {attendance.status === 'late' && attendance.notes && (
                  <span className="text-yellow-600 ml-2">({attendance.notes})</span>
                )}
              </div>
            )}
            
            {attendance.checkOutTime && (
              <div className="text-sm text-muted-foreground">
                <strong>Départ:</strong> {attendance.checkOutTime.toLocaleTimeString('fr-FR')}
              </div>
            )}
            
            {attendance.duration > 0 && (
              <div className="text-sm text-muted-foreground">
                <strong>Durée:</strong> {formatDuration(attendance.duration)}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {canCheckIn && (
            <Button 
              onClick={handleCheckIn} 
              disabled={loading || disabled}
              className="flex-1"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Check-in...' : 'Check-in'}
            </Button>
          )}
          
          {canCheckOut && (
            <Button 
              onClick={handleCheckOut} 
              disabled={loading || disabled}
              variant="outline"
              className="flex-1"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? 'Check-out...' : 'Check-out'}
            </Button>
          )}
          
          {sessionStatus.status === 'ended' && !attendance && (
            <div className="flex-1 text-center py-2 text-muted-foreground text-sm">
              Session terminée - Aucune présence enregistrée
            </div>
          )}
          
          {sessionStatus.status === 'upcoming' && (
            <div className="flex-1 text-center py-2 text-muted-foreground text-sm">
              Le check-in sera disponible au début de la session
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionCheckInOut;