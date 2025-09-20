/**
 * Tableau de bord avancé pour les managers
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Coffee,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { PresenceDashboard } from '../components/presence/PresenceDashboard';
import { TeamPresenceOverview } from '../components/manager/TeamPresenceOverview';
import { PresenceAnalytics } from '../components/manager/PresenceAnalytics';
import { AnomalyManagement } from '../components/manager/AnomalyManagement';
import { TeamScheduleView } from '../components/manager/TeamScheduleView';
import { PresenceReports } from '../pages/manager/PresenceReports';

import { usePresenceDashboard } from '../hooks/usePresenceDashboard';
import { formatTime, formatDate } from '../utils/dateUtils';

interface ManagerDashboardProps {
  organizationId?: string;
  userId?: string;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ 
  organizationId,
  userId 
}) => {
  // Utiliser les props au lieu du hook useAuth pour éviter les problèmes de contexte
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000); // 30 secondes

  const {
    currentlyPresent,
    teamSummary,
    presenceEntries,
    anomalies,
    stats,
    loading,
    error,
    refreshData
  } = usePresenceDashboard(organizationId, selectedDate);

  // Actualisation automatique
  useEffect(() => {
    if (refreshInterval && activeTab === 'overview') {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, activeTab, refreshData]);

  // Calculer les métriques avancées
  const getAdvancedMetrics = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Taux de présence par heure
    const presenceByHour = Array.from({ length: 24 }, (_, hour) => {
      const count = currentlyPresent?.filter(emp => {
        if (!emp.todayEntry?.clockInTime) return false;
        const clockInHour = new Date(emp.todayEntry.clockInTime).getHours();
        return clockInHour <= hour && (!emp.todayEntry.clockOutTime || new Date(emp.todayEntry.clockOutTime).getHours() > hour);
      }).length || 0;
      
      return { hour, count };
    });

    // Employés en retard
    const lateEmployees = presenceEntries?.filter(entry => {
      if (!entry.clockInTime) return false;
      const clockInTime = new Date(entry.clockInTime);
      const expectedTime = new Date(clockInTime);
      expectedTime.setHours(9, 0, 0, 0); // Supposons 9h comme heure standard
      return clockInTime > expectedTime;
    }).length || 0;

    // Taux de ponctualité
    const punctualityRate = presenceEntries?.length > 0 
      ? ((presenceEntries.length - lateEmployees) / presenceEntries.length) * 100 
      : 100;

    // Heures supplémentaires
    const overtimeHours = presenceEntries?.reduce((total, entry) => {
      if (entry.totalHours && entry.totalHours > 8) {
        return total + (entry.totalHours - 8);
      }
      return total;
    }, 0) || 0;

    return {
      presenceByHour,
      lateEmployees,
      punctualityRate,
      overtimeHours,
      currentPresenceRate: stats?.totalEmployees > 0 
        ? (stats.presentEmployees / stats.totalEmployees) * 100 
        : 0
    };
  };

  const metrics = getAdvancedMetrics();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Manager</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de la présence de votre équipe
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Département" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              <SelectItem value="dev">Développement</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="sales">Ventes</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Présents maintenant</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.presentEmployees || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  sur {stats?.totalEmployees || 0} employés
                </p>
              </div>
              <div className="flex flex-col items-end">
                <Users className="h-8 w-8 text-green-600" />
                <div className="text-xs text-green-600 font-medium">
                  {metrics.currentPresenceRate.toFixed(0)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ponctualité</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.punctualityRate.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics.lateEmployees} retard{metrics.lateEmployees > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="flex items-center">
                  {metrics.punctualityRate >= 90 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heures sup.</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.overtimeHours.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">
                  Aujourd'hui
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies</p>
                <p className="text-2xl font-bold text-orange-600">
                  {anomalies?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  À traiter
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes importantes */}
      {(anomalies?.length || 0) > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {anomalies?.length} anomalie{(anomalies?.length || 0) > 1 ? 's' : ''} détectée{(anomalies?.length || 0) > 1 ? 's' : ''} nécessitant votre attention
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab('anomalies')}
            >
              Voir les détails
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Équipe
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analyses
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Rapports
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Présence en temps réel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Présence en temps réel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Taux de présence</span>
                    <span className="font-medium">{metrics.currentPresenceRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={metrics.currentPresenceRate} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Présents:</span>
                      <Badge variant="success">{stats?.presentEmployees || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Absents:</span>
                      <Badge variant="secondary">{(stats?.totalEmployees || 0) - (stats?.presentEmployees || 0)}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">En pause:</span>
                      <Badge variant="warning">
                        {currentlyPresent?.filter(emp => 
                          emp.todayEntry?.breakEntries?.some(b => !b.endTime)
                        ).length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">En retard:</span>
                      <Badge variant="destructive">{metrics.lateEmployees}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tendances de la journée */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Tendances de la journée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heures moyennes/employé</span>
                    <span className="font-medium">{stats?.averageHours?.toFixed(1) || '0.0'}h</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Heures supplémentaires</span>
                    <span className="font-medium text-purple-600">{metrics.overtimeHours.toFixed(1)}h</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Efficacité équipe</span>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">
                        {((stats?.averageHours || 0) / 8 * 100).toFixed(0)}%
                      </span>
                      {(stats?.averageHours || 0) >= 7.5 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employés actuellement présents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Employés présents ({currentlyPresent?.length || 0})
                </span>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('team')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir tout
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentlyPresent?.slice(0, 6).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {employee.todayEntry?.clockInTime ? 
                          `Arrivé à ${formatTime(new Date(employee.todayEntry.clockInTime))}` : 
                          'Pas encore pointé'
                        }
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {employee.todayEntry?.breakEntries?.some(b => !b.endTime) ? (
                        <Badge variant="warning">
                          <Coffee className="h-3 w-3 mr-1" />
                          Pause
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Présent
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {(currentlyPresent?.length || 0) === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun employé actuellement présent</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue équipe */}
        <TabsContent value="team" className="space-y-6">
          <TeamPresenceOverview 
            organizationId={organizationId}
            selectedDate={selectedDate}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        {/* Analyses */}
        <TabsContent value="analytics" className="space-y-6">
          <PresenceAnalytics 
            organizationId={organizationId}
            selectedDate={selectedDate}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        {/* Gestion des anomalies */}
        <TabsContent value="anomalies" className="space-y-6">
          <AnomalyManagement 
            organizationId={organizationId}
            anomalies={anomalies}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* Planning d'équipe */}
        <TabsContent value="schedule" className="space-y-6">
          <TeamScheduleView 
            organizationId={organizationId}
            selectedDate={selectedDate}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        {/* Rapports */}
        <TabsContent value="reports" className="space-y-6">
          <PresenceReports 
            organizationId={organizationId}
            managerId={userId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};