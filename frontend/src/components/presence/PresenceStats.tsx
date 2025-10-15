/**
 * Composant de statistiques de présence
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  Badge
} from '../components/ui';
import {
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { presenceApi } from '../services/api/presence.api';
import { useAuth } from '../hooks/useAuth';

interface PresenceStatsProps {
  employeeId?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  compact?: boolean;
  className?: string;
}

interface StatsData {
  totalHours: number;
  expectedHours: number;
  workingDays: number;
  expectedDays: number;
  averageHoursPerDay: number;
  punctualityRate: number;
  attendanceRate: number;
  overtimeHours: number;
  lateArrivals: number;
  earlyDepartures: number;
  anomalies: number;
  efficiency: number;
  trend: {
    hours: number;
    attendance: number;
    punctuality: number;
  };
}

export const PresenceStats: React.FC<PresenceStatsProps> = ({
  employeeId,
  period = 'month',
  compact = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const targetEmployeeId = employeeId || user?.employeeId;

  // Charger les statistiques
  const loadStats = async () => {
    if (!targetEmployeeId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await presenceApi.getEmployeeStats(targetEmployeeId, {
        period: selectedPeriod
      });
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load presence stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir la couleur selon le pourcentage
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Obtenir l'icône de tendance
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  // Formater la tendance
  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  // Obtenir le niveau de performance
  const getPerformanceLevel = (efficiency: number) => {
    if (efficiency >= 95) return { label: 'Excellent', color: 'success', icon: Award };
    if (efficiency >= 85) return { label: 'Très bien', color: 'success', icon: CheckCircle };
    if (efficiency >= 75) return { label: 'Bien', color: 'warning', icon: Target };
    if (efficiency >= 60) return { label: 'Moyen', color: 'warning', icon: AlertTriangle };
    return { label: 'À améliorer', color: 'destructive', icon: AlertTriangle };
  };

  useEffect(() => {
    loadStats();
  }, [targetEmployeeId, selectedPeriod]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error || 'Aucune donnée disponible'}</p>
        </CardContent>
      </Card>
    );
  }

  const performanceLevel = getPerformanceLevel(stats.efficiency);
  const PerformanceIcon = performanceLevel.icon;

  if (compact) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Heures travaillées</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Assiduité</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Ponctualité</span>
            <span className={getPercentageColor(stats.punctualityRate)}>
              {stats.punctualityRate.toFixed(0)}%
            </span>
          </div>
          <Progress value={stats.punctualityRate} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sélecteur de période */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Statistiques de présence</h3>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heures travaillées</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">
                  sur {stats.expectedHours.toFixed(1)}h attendues
                </p>
              </div>
              <div className="flex flex-col items-end">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="flex items-center mt-1">
                  {getTrendIcon(stats.trend.hours)}
                  <span className="text-xs ml-1">{formatTrend(stats.trend.hours)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assiduité</p>
                <p className="text-2xl font-bold">{stats.attendanceRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.workingDays}/{stats.expectedDays} jours
                </p>
              </div>
              <div className="flex flex-col items-end">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="flex items-center mt-1">
                  {getTrendIcon(stats.trend.attendance)}
                  <span className="text-xs ml-1">{formatTrend(stats.trend.attendance)}</span>
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
                <p className="text-2xl font-bold">{stats.punctualityRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {stats.lateArrivals} retard{stats.lateArrivals > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <Target className="h-8 w-8 text-purple-600" />
                <div className="flex items-center mt-1">
                  {getTrendIcon(stats.trend.punctuality)}
                  <span className="text-xs ml-1">{formatTrend(stats.trend.punctuality)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-2xl font-bold">{stats.efficiency.toFixed(0)}%</p>
                <Badge variant={performanceLevel.color as any} className="text-xs">
                  {performanceLevel.label}
                </Badge>
              </div>
              <PerformanceIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détails et indicateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Indicateurs de performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Assiduité</span>
                <span className={getPercentageColor(stats.attendanceRate)}>
                  {stats.attendanceRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.attendanceRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Ponctualité</span>
                <span className={getPercentageColor(stats.punctualityRate)}>
                  {stats.punctualityRate.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.punctualityRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Efficacité</span>
                <span className={getPercentageColor(stats.efficiency)}>
                  {stats.efficiency.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.efficiency} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Heures réalisées</span>
                <span className={getPercentageColor((stats.totalHours / stats.expectedHours) * 100)}>
                  {((stats.totalHours / stats.expectedHours) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(stats.totalHours / stats.expectedHours) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Détails de la période</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Moyenne/jour</div>
                <div className="font-medium">{stats.averageHoursPerDay.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Heures sup.</div>
                <div className="font-medium">{stats.overtimeHours.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-muted-foreground">Retards</div>
                <div className="font-medium">{stats.lateArrivals}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Départs anticipés</div>
                <div className="font-medium">{stats.earlyDepartures}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Anomalies</div>
                <div className="font-medium text-orange-600">{stats.anomalies}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Jours travaillés</div>
                <div className="font-medium">{stats.workingDays}/{stats.expectedDays}</div>
              </div>
            </div>

            {stats.anomalies > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center text-orange-800">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    {stats.anomalies} anomalie{stats.anomalies > 1 ? 's' : ''} détectée{stats.anomalies > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Consultez votre historique pour plus de détails
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};