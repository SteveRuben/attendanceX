/**
 * Graphiques de participation par équipe
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Award,
  RefreshCw,
  Filter
} from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { teamService } from '@/services/teamService';
import type { Team } from '../../shared';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from 'react-day-picker';

interface TeamParticipationChartProps {
  organizationId: string;
  selectedTeams?: string[];
  onTeamSelect?: (teamIds: string[]) => void;
}

interface TeamTrendData {
  teamId: string;
  teamName: string;
  trends: Array<{
    date: string;
    events: number;
    participants: number;
    attendanceRate: number;
    averageEngagement: number;
  }>;
  summary: {
    totalEvents: number;
    totalParticipants: number;
    averageAttendanceRate: number;
    bestMonth: string;
    improvement: number; // pourcentage d'amélioration
  };
}

const TEAM_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff00ff', '#00ffff', '#ff0000', '#0000ff', '#ffff00'
];

export const TeamParticipationChart: React.FC<TeamParticipationChartProps> = ({
  organizationId,
  selectedTeams = [],
  onTeamSelect
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamTrends, setTeamTrends] = useState<TeamTrendData[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(selectedTeams);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'radar'>('line');
  const [metric, setMetric] = useState<'attendanceRate' | 'events' | 'participants'>('attendanceRate');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 jours
    to: new Date()
  });

  useEffect(() => {
    loadTeams();
  }, [organizationId]);

  useEffect(() => {
    if (selectedTeamIds.length > 0 && dateRange?.from && dateRange?.to) {
      loadTeamTrends();
    }
  }, [selectedTeamIds, dateRange]);

  const loadTeams = async () => {
    try {
      const response = await teamService.getTeams(organizationId);
      if (response.data) {
        setTeams(response.data.data);
        
        // Sélectionner les 3 premières équipes par défaut si aucune sélection
        if (selectedTeamIds.length === 0 && response.data.data.length > 0) {
          const defaultTeams = response.data.data.slice(0, 3).map(team => team.id);
          setSelectedTeamIds(defaultTeams);
          onTeamSelect?.(defaultTeams);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les équipes",
        variant: "destructive"
      });
    }
  };

  const loadTeamTrends = async () => {
    try {
      setLoading(true);
      
      if (!dateRange?.from || !dateRange?.to) return;

      const trendsData = await analyticsService.getTeamParticipationTrends(
        organizationId,
        selectedTeamIds,
        dateRange.from,
        dateRange.to
      );

      setTeamTrends(trendsData);
    } catch (error) {
      console.error('Erreur lors du chargement des tendances:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les tendances des équipes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelection = (teamId: string, selected: boolean) => {
    let newSelection: string[];
    
    if (selected) {
      newSelection = [...selectedTeamIds, teamId];
    } else {
      newSelection = selectedTeamIds.filter(id => id !== teamId);
    }
    
    setSelectedTeamIds(newSelection);
    onTeamSelect?.(newSelection);
  };

  const prepareChartData = () => {
    if (teamTrends.length === 0) return [];

    // Combiner toutes les dates
    const allDates = new Set<string>();
    teamTrends.forEach(team => {
      team.trends.forEach(trend => allDates.add(trend.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(date => {
      const dataPoint: any = { date };
      
      teamTrends.forEach(team => {
        const trend = team.trends.find(t => t.date === date);
        if (trend) {
          dataPoint[`${team.teamName}_${metric}`] = trend[metric];
        } else {
          dataPoint[`${team.teamName}_${metric}`] = 0;
        }
      });

      return dataPoint;
    });
  };

  const prepareRadarData = () => {
    if (teamTrends.length === 0) return [];

    const metrics = ['events', 'participants', 'attendanceRate', 'averageEngagement'];
    
    return metrics.map(metricName => {
      const dataPoint: any = { metric: metricName };
      
      teamTrends.forEach(team => {
        // Calculer la moyenne pour cette métrique
        const average = team.trends.reduce((sum, trend) => {
          return sum + (trend[metricName as keyof typeof trend] as number);
        }, 0) / team.trends.length;
        
        dataPoint[team.teamName] = average;
      });

      return dataPoint;
    });
  };

  const renderChart = () => {
    const data = chartType === 'radar' ? prepareRadarData() : prepareChartData();

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {teamTrends.map((team, index) => (
                <Line
                  key={team.teamId}
                  type="monotone"
                  dataKey={`${team.teamName}_${metric}`}
                  stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                  strokeWidth={2}
                  name={team.teamName}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {teamTrends.map((team, index) => (
                <Bar
                  key={team.teamId}
                  dataKey={`${team.teamName}_${metric}`}
                  fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                  name={team.teamName}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {teamTrends.map((team, index) => (
                <Area
                  key={team.teamId}
                  type="monotone"
                  dataKey={`${team.teamName}_${metric}`}
                  stackId="1"
                  stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                  fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                  name={team.teamName}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {teamTrends.map((team, index) => (
                <Radar
                  key={team.teamId}
                  name={team.teamName}
                  dataKey={team.teamName}
                  stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                  fill={TEAM_COLORS[index % TEAM_COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'attendanceRate': return 'Taux de Présence (%)';
      case 'events': return 'Nombre d\'Événements';
      case 'participants': return 'Nombre de Participants';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex flex-wrap gap-4 items-center">
        <DatePickerWithRange
          date={dateRange}
          onDateChange={setDateRange}
        />

        <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attendanceRate">Taux de Présence</SelectItem>
            <SelectItem value="events">Nombre d'Événements</SelectItem>
            <SelectItem value="participants">Participants</SelectItem>
          </SelectContent>
        </Select>

        <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Ligne</SelectItem>
            <SelectItem value="bar">Barres</SelectItem>
            <SelectItem value="area">Aires</SelectItem>
            <SelectItem value="radar">Radar</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTeamTrends}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Sélection des équipes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Sélection des Équipes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <Badge
                key={team.id}
                variant={selectedTeamIds.includes(team.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleTeamSelection(team.id, !selectedTeamIds.includes(team.id))}
              >
                {team.name}
                {selectedTeamIds.includes(team.id) && (
                  <span className="ml-1">✓</span>
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Résumé des performances */}
      {teamTrends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamTrends.map((team, index) => (
            <Card key={team.teamId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }}
                  />
                  {team.teamName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Événements:</span>
                  <span className="font-semibold">{team.summary.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Participants:</span>
                  <span className="font-semibold">{team.summary.totalParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taux présence:</span>
                  <span className="font-semibold">
                    {team.summary.averageAttendanceRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Meilleur mois:</span>
                  <span className="font-semibold">{team.summary.bestMonth}</span>
                </div>
                {team.summary.improvement !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Évolution:</span>
                    <div className={`flex items-center ${team.summary.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span className="font-semibold">
                        {team.summary.improvement > 0 ? '+' : ''}{team.summary.improvement.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Graphique principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {getMetricLabel()} par Équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamTrends.length > 0 ? (
            renderChart()
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sélectionnez des équipes pour voir les tendances</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights et recommandations */}
      {teamTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Insights et Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Équipe la plus performante */}
              {(() => {
                const bestTeam = teamTrends.reduce((best, current) => 
                  current.summary.averageAttendanceRate > best.summary.averageAttendanceRate ? current : best
                );
                return (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">🏆 Équipe la plus performante</h4>
                    <p className="text-green-700">
                      <strong>{bestTeam.teamName}</strong> avec un taux de présence moyen de{' '}
                      <strong>{bestTeam.summary.averageAttendanceRate.toFixed(1)}%</strong>
                    </p>
                  </div>
                );
              })()}

              {/* Équipe avec la plus grande amélioration */}
              {(() => {
                const mostImproved = teamTrends.reduce((best, current) => 
                  current.summary.improvement > best.summary.improvement ? current : best
                );
                if (mostImproved.summary.improvement > 0) {
                  return (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">📈 Plus grande amélioration</h4>
                      <p className="text-blue-700">
                        <strong>{mostImproved.teamName}</strong> s'est améliorée de{' '}
                        <strong>+{mostImproved.summary.improvement.toFixed(1)}%</strong> sur la période
                      </p>
                    </div>
                  );
                }
              })()}

              {/* Recommandations générales */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Recommandations</h4>
                <ul className="text-yellow-700 space-y-1 text-sm">
                  <li>• Organisez des sessions de partage de bonnes pratiques entre équipes</li>
                  <li>• Identifiez les facteurs de succès des équipes performantes</li>
                  <li>• Mettez en place un système de reconnaissance pour les équipes assidues</li>
                  <li>• Analysez les créneaux horaires les plus favorables à la participation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};