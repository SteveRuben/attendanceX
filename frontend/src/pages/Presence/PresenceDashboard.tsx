import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Clock, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Timer
} from 'lucide-react';
import { usePresenceDashboard } from '../hooks/usePresenceDashboard';
import { useAuth } from '../hooks/use-auth';

const PresenceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    currentStatus, 
    todayStats, 
    weekStats, 
    recentEntries, 
    alerts,
    isLoading,
    clockIn,
    clockOut,
    startBreak,
    endBreak
  } = usePresenceDashboard();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleClockIn = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await clockIn({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => {
          // Fallback sans géolocalisation
          clockIn();
        }
      );
    } else {
      await clockIn();
    }
  };

  const handleClockOut = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await clockOut({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => {
          // Fallback sans géolocalisation
          clockOut();
        }
      );
    } else {
      await clockOut();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'on_break': return 'bg-yellow-500';
      case 'late': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'on_break': return 'En pause';
      case 'late': return 'En retard';
      default: return 'Inconnu';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec horloge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de Bord Présence</h1>
          <p className="text-muted-foreground">
            Bonjour {user?.firstName || user?.email}, voici votre statut de présence
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold">
            {currentTime.toLocaleTimeString('fr-FR')}
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
      </div>

      {/* Statut actuel et actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut Actuel</CardTitle>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentStatus?.status || 'absent')}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusText(currentStatus?.status || 'absent')}</div>
            {currentStatus?.clockInTime && (
              <p className="text-xs text-muted-foreground">
                Depuis {new Date(currentStatus.clockInTime).toLocaleTimeString('fr-FR')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures Aujourd'hui</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats?.totalHours ? `${todayStats.totalHours.toFixed(1)}h` : '0h'}
            </div>
            <p className="text-xs text-muted-foreground">
              Objectif: 8h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pauses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats?.totalBreaks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayStats?.totalBreakTime ? `${todayStats.totalBreakTime}min` : '0min'} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Présence Semaine</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weekStats?.attendanceRate ? `${weekStats.attendanceRate}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {weekStats?.daysPresent || 0}/5 jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Gérez votre présence en un clic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {currentStatus?.status === 'absent' && (
              <Button onClick={handleClockIn} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pointer l'arrivée
              </Button>
            )}
            
            {currentStatus?.status === 'present' && (
              <>
                <Button onClick={handleClockOut} variant="outline" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Pointer la sortie
                </Button>
                <Button onClick={startBreak} variant="outline" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Commencer une pause
                </Button>
              </>
            )}
            
            {currentStatus?.status === 'on_break' && (
              <Button onClick={endBreak} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Terminer la pause
              </Button>
            )}
            
            <Button variant="outline" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Voir ma localisation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertes */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <Badge variant="outline">{alert.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique récent */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Historique Récent</TabsTrigger>
          <TabsTrigger value="week">Cette Semaine</TabsTrigger>
          <TabsTrigger value="month">Ce Mois</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dernières Entrées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEntries?.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(entry.status)}`} />
                      <div>
                        <p className="font-medium">
                          {entry.clockInTime && new Date(entry.clockInTime).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.clockInTime && new Date(entry.clockInTime).toLocaleTimeString('fr-FR')} - 
                          {entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString('fr-FR') : 'En cours'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{entry.totalHours?.toFixed(1)}h</p>
                      <Badge variant="outline">{getStatusText(entry.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="week">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques de la Semaine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{weekStats?.daysPresent || 0}</div>
                  <div className="text-sm text-muted-foreground">Jours présents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weekStats?.totalHours?.toFixed(1) || 0}h</div>
                  <div className="text-sm text-muted-foreground">Heures totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weekStats?.averageHours?.toFixed(1) || 0}h</div>
                  <div className="text-sm text-muted-foreground">Moyenne/jour</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{weekStats?.lateCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Retards</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="month">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques du Mois</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Statistiques mensuelles à venir...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PresenceDashboard;