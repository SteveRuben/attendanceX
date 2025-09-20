/**
 * Composant d'analyses de présence pour managers
 */

import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Progress } from '../ui/progress';

interface PresenceAnalyticsProps {
  organizationId?: string;
  selectedDate: string;
  selectedDepartment: string;
  className?: string;
}

interface AnalyticsData {
  overview: {
    totalEmployees: number;
    averageHours: number;
    attendanceRate: number;
    punctualityRate: number;
    overtimeHours: number;
    efficiency: number;
  };
  trends: {
    daily: Array<{
      date: string;
      present: number;
      hours: number;
      efficiency: number;
    }>;
    hourly: Array<{
      hour: number;
      count: number;
      percentage: number;
    }>;
  };
  departments: Array<{
    name: string;
    employees: number;
    averageHours: number;
    attendanceRate: number;
    efficiency: number;
  }>;
  patterns: {
    peakHours: Array<{ hour: number; count: number }>;
    commonBreakTimes: Array<{ time: string; count: number }>;
    lateArrivals: Array<{ time: string; count: number }>;
    earlyDepartures: Array<{ time: string; count: number }>;
  };
  performance: {
    topPerformers: Array<{
      employeeId: string;
      name: string;
      efficiency: number;
      hours: number;
      punctuality: number;
    }>;
    improvementNeeded: Array<{
      employeeId: string;
      name: string;
      issues: string[];
      suggestions: string[];
    }>;
  };
}

export const PresenceAnalytics: React.FC<PresenceAnalyticsProps> = ({
  organizationId,
  selectedDate,
  selectedDepartment,
  className = ''
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState('overview');

  // Charger les données d'analyse
  const loadAnalytics = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // Simuler des données d'analyse (en production, cela viendrait de l'API)
      const mockData: AnalyticsData = {
        overview: {
          totalEmployees: 45,
          averageHours: 7.8,
          attendanceRate: 92.3,
          punctualityRate: 87.5,
          overtimeHours: 12.5,
          efficiency: 89.2
        },
        trends: {
          daily: [
            { date: '2023-12-01', present: 42, hours: 8.2, efficiency: 91.5 },
            { date: '2023-12-02', present: 38, hours: 7.9, efficiency: 88.3 },
            { date: '2023-12-03', present: 44, hours: 8.1, efficiency: 92.1 },
            { date: '2023-12-04', present: 41, hours: 7.7, efficiency: 86.8 },
            { date: '2023-12-05', present: 43, hours: 8.0, efficiency: 90.2 }
          ],
          hourly: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: hour >= 8 && hour <= 18 ? Math.floor(Math.random() * 40) + 10 : Math.floor(Math.random() * 5),
            percentage: hour >= 8 && hour <= 18 ? Math.floor(Math.random() * 80) + 20 : Math.floor(Math.random() * 10)
          }))
        },
        departments: [
          { name: 'Développement', employees: 15, averageHours: 8.2, attendanceRate: 94.1, efficiency: 92.3 },
          { name: 'Design', employees: 8, averageHours: 7.9, attendanceRate: 91.2, efficiency: 88.7 },
          { name: 'Marketing', employees: 12, averageHours: 7.6, attendanceRate: 89.8, efficiency: 85.4 },
          { name: 'Ventes', employees: 10, averageHours: 8.1, attendanceRate: 93.5, efficiency: 90.1 }
        ],
        patterns: {
          peakHours: [
            { hour: 9, count: 38 },
            { hour: 10, count: 42 },
            { hour: 14, count: 35 },
            { hour: 15, count: 40 }
          ],
          commonBreakTimes: [
            { time: '10:30', count: 25 },
            { time: '12:00', count: 40 },
            { time: '15:30', count: 22 }
          ],
          lateArrivals: [
            { time: '09:15', count: 8 },
            { time: '09:30', count: 5 },
            { time: '10:00', count: 3 }
          ],
          earlyDepartures: [
            { time: '16:30', count: 4 },
            { time: '17:00', count: 7 },
            { time: '17:30', count: 2 }
          ]
        },
        performance: {
          topPerformers: [
            { employeeId: 'EMP001', name: 'Alice Martin', efficiency: 98.5, hours: 8.3, punctuality: 100 },
            { employeeId: 'EMP002', name: 'Bob Dupont', efficiency: 96.2, hours: 8.1, punctuality: 95.8 },
            { employeeId: 'EMP003', name: 'Claire Moreau', efficiency: 94.8, hours: 8.0, punctuality: 97.2 }
          ],
          improvementNeeded: [
            {
              employeeId: 'EMP010',
              name: 'David Leroy',
              issues: ['Retards fréquents', 'Heures insuffisantes'],
              suggestions: ['Ajuster horaire de début', 'Suivi personnalisé']
            },
            {
              employeeId: 'EMP015',
              name: 'Emma Rousseau',
              issues: ['Pauses prolongées', 'Efficacité faible'],
              suggestions: ['Formation gestion du temps', 'Objectifs clairs']
            }
          ]
        }
      };

      setAnalyticsData(mockData);
    } catch (err) {
      setError('Erreur lors du chargement des analyses');
      console.error('Failed to load analytics:', err);
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
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  useEffect(() => {
    loadAnalytics();
  }, [organizationId, selectedDate, selectedDepartment, period]);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error || 'Aucune donnée d\'analyse disponible'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Contrôles */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Analyses de présence</h3>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.totalEmployees}</div>
            <div className="text-sm text-muted-foreground">Employés</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.averageHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Moy. heures</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.attendanceRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Assiduité</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.punctualityRate.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Ponctualité</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.overtimeHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Heures sup.</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">{analyticsData.overview.efficiency.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Efficacité</div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="departments">Départements</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Répartition horaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Répartition horaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.trends.hourly
                    .filter(h => h.hour >= 7 && h.hour <= 19)
                    .map((hourData) => (
                      <div key={hourData.hour} className="flex items-center justify-between">
                        <span className="text-sm w-12">
                          {hourData.hour.toString().padStart(2, '0')}h
                        </span>
                        <div className="flex-1 mx-3">
                          <Progress value={hourData.percentage} className="h-2" />
                        </div>
                        <span className="text-sm w-8 text-right">
                          {hourData.count}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Patterns de comportement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Patterns de comportement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Heures de pointe</h4>
                  <div className="space-y-1">
                    {analyticsData.patterns.peakHours.map((peak) => (
                      <div key={peak.hour} className="flex items-center justify-between text-sm">
                        <span>{peak.hour}h00</span>
                        <Badge variant="secondary">{peak.count} employés</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pauses communes</h4>
                  <div className="space-y-1">
                    {analyticsData.patterns.commonBreakTimes.map((breakTime) => (
                      <div key={breakTime.time} className="flex items-center justify-between text-sm">
                        <span>{breakTime.time}</span>
                        <Badge variant="outline">{breakTime.count} employés</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tendances */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Évolution sur {period === 'day' ? 'la journée' : period === 'week' ? 'la semaine' : 'le mois'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.trends.daily.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {new Date(day.date).toLocaleDateString('fr-FR', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.present} présents • {day.hours.toFixed(1)}h moy.
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{day.efficiency.toFixed(0)}%</div>
                        <div className="text-sm text-muted-foreground">Efficacité</div>
                      </div>
                      <Progress value={day.efficiency} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Départements */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData.departments.map((dept) => (
              <Card key={dept.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{dept.name}</span>
                    <Badge variant="secondary">{dept.employees} employés</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Heures moyennes</div>
                      <div className="font-medium">{dept.averageHours.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Assiduité</div>
                      <div className={`font-medium ${getPercentageColor(dept.attendanceRate)}`}>
                        {dept.attendanceRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Efficacité</span>
                      <span className={getPercentageColor(dept.efficiency)}>
                        {dept.efficiency.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={dept.efficiency} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Meilleurs performeurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.topPerformers.map((performer, index) => (
                    <div key={performer.employeeId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{performer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {performer.hours.toFixed(1)}h • {performer.punctuality.toFixed(0)}% ponctuel
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">{performer.efficiency.toFixed(0)}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Amélioration nécessaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                  Amélioration nécessaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.improvementNeeded.map((employee) => (
                    <div key={employee.employeeId} className="p-3 border rounded-lg">
                      <div className="font-medium mb-2">{employee.name}</div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium text-red-600 mb-1">Problèmes:</div>
                          <div className="flex flex-wrap gap-1">
                            {employee.issues.map((issue, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-blue-600 mb-1">Suggestions:</div>
                          <div className="flex flex-wrap gap-1">
                            {employee.suggestions.map((suggestion, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {suggestion}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};