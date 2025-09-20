// src/components/attendance/RealTimeDashboard.tsx - Tableau de bord temps réel

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  Activity,
  Eye,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'react-toastify';

interface RealTimeStats {
  eventId: string;
  totalInvited: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  attendanceRate: number;
  punctualityRate: number;
  lastUpdated: Date;
  timeline: TimelineEntry[];
  alerts: AttendanceAlert[];
}

interface TimelineEntry {
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'check_in' | 'check_out' | 'status_change';
  status: string;
  method: string;
}

interface AttendanceAlert {
  id: string;
  type: 'low_attendance' | 'capacity_reached' | 'late_start' | 'high_absence';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface RealTimeDashboardProps {
  eventId: string;
  eventTitle: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onStatsUpdate?: (stats: RealTimeStats) => void;
}

const RealTimeDashboard = ({
  eventId,
  eventTitle,
  autoRefresh = true,
  refreshInterval = 5000,
  onStatsUpdate
}: RealTimeDashboardProps) => {
  const [stats, setStats] = useState<RealTimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadInitialStats();
    
    if (autoRefresh) {
      setupRealTimeConnection();
    }

    return () => {
      cleanup();
    };
  }, [eventId, autoRefresh]);

  const loadInitialStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler un appel API - à remplacer par le vrai service
      const mockStats: RealTimeStats = {
        eventId,
        totalInvited: 150,
        totalPresent: 89,
        totalAbsent: 45,
        totalLate: 16,
        totalExcused: 0,
        attendanceRate: 70.0,
        punctualityRate: 84.8,
        lastUpdated: new Date(),
        timeline: [
          {
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            userId: 'user1',
            userName: 'Marie Dupont',
            action: 'check_in',
            status: 'present',
            method: 'qr_code'
          },
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            userId: 'user2',
            userName: 'Jean Martin',
            action: 'check_in',
            status: 'late',
            method: 'manual'
          }
        ],
        alerts: [
          {
            id: 'alert1',
            type: 'low_attendance',
            severity: 'warning',
            message: 'Taux de présence inférieur à 75%',
            timestamp: new Date(),
            acknowledged: false
          }
        ]
      };

      setStats(mockStats);
      if (onStatsUpdate) {
        onStatsUpdate(mockStats);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeConnection = () => {
    // Simuler une connexion WebSocket
    setIsConnected(true);
    
    intervalRef.current = setInterval(() => {
      if (stats) {
        // Simuler des mises à jour
        const updatedStats = {
          ...stats,
          totalPresent: stats.totalPresent + Math.floor(Math.random() * 3),
          lastUpdated: new Date()
        };
        
        updatedStats.attendanceRate = (updatedStats.totalPresent / updatedStats.totalInvited) * 100;
        
        setStats(updatedStats);
        if (onStatsUpdate) {
          onStatsUpdate(updatedStats);
        }
      }
    }, refreshInterval);
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const handleRefresh = () => {
    loadInitialStats();
  };

  const acknowledgeAlert = (alertId: string) => {
    if (stats) {
      const updatedStats = {
        ...stats,
        alerts: stats.alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      };
      setStats(updatedStats);
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-2">
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) return null;  ret
urn (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tableau de bord temps réel</h2>
          <p className="text-muted-foreground">{eventTitle}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </Badge>
          
          <Button
            onClick={() => setNotifications(!notifications)}
            variant="outline"
            size="sm"
          >
            {notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {stats.alerts.filter(alert => !alert.acknowledged).length > 0 && (
        <div className="space-y-2">
          {stats.alerts
            .filter(alert => !alert.acknowledged)
            .map(alert => (
              <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.message}</span>
                  <Button
                    onClick={() => acknowledgeAlert(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Acquitter
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
        </div>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Présents</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalPresent}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              {getTrendIcon(stats.totalPresent, stats.totalPresent - 2)}
              <span className="ml-1 text-muted-foreground">vs dernière mise à jour</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalLate}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">
                {Math.round((stats.totalLate / stats.totalInvited) * 100)}% du total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absents</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
              </div>
              <UserX className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">
                {Math.round((stats.totalAbsent / stats.totalInvited) * 100)}% du total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de présence</p>
                <p className={`text-2xl font-bold ${getStatusColor(stats.attendanceRate, { good: 80, warning: 60 })}`}>
                  {stats.attendanceRate.toFixed(1)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">
                {stats.totalPresent + stats.totalLate} / {stats.totalInvited}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques et timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline des arrivées */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.timeline.length > 0 ? (
                stats.timeline.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        entry.status === 'present' ? 'bg-green-500' :
                        entry.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{entry.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.action === 'check_in' ? 'Arrivée' : 'Départ'} • {entry.method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        entry.status === 'present' ? 'default' :
                        entry.status === 'late' ? 'secondary' : 'destructive'
                      }>
                        {entry.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.timestamp.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2" />
                  <p>Aucune activité récente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Métriques détaillées */}
        <Card>
          <CardHeader>
            <CardTitle>Métriques détaillées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taux de ponctualité</span>
                <span className={`font-medium ${getStatusColor(stats.punctualityRate, { good: 85, warning: 70 })}`}>
                  {stats.punctualityRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total invités</span>
                <span className="font-medium">{stats.totalInvited}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Excusés</span>
                <span className="font-medium">{stats.totalExcused}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dernière mise à jour</span>
                <span className="font-medium text-xs">
                  {stats.lastUpdated.toLocaleTimeString('fr-FR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealTimeDashboard;