/**
 * Rapport de validation des présences
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  Download,
  RefreshCw,
  Shield,
  TrendingUp
} from 'lucide-react';
import { analyticsService, AttendanceValidationReport as ValidationReportData } from '@/services/analyticsService';
import { teamService } from '@/services/teamService';
import { Team } from '@attendance-x/shared';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

interface AttendanceValidationReportProps {
  organizationId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AttendanceValidationReport: React.FC<AttendanceValidationReportProps> = ({
  organizationId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState<ValidationReportData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    to: new Date()
  });

  useEffect(() => {
    loadData();
  }, [organizationId, dateRange, selectedTeam]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les équipes
      const teamsResponse = await teamService.getTeams(organizationId);
      if (teamsResponse.data) {
        setTeams(teamsResponse.data.data);
      }

      // Charger le rapport de validation
      if (dateRange?.from && dateRange?.to) {
        const reportResponse = await analyticsService.getAttendanceValidationReport(
          organizationId,
          dateRange.from,
          dateRange.to
        );
        setReportData(reportResponse);
      }

    } catch (error) {
      console.error('Erreur lors du chargement du rapport:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le rapport de validation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Rapport actualisé",
      description: "Les données de validation ont été mises à jour"
    });
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (!dateRange?.from || !dateRange?.to) return;

      const blob = await analyticsService.exportAnalytics(organizationId, 'validation', {
        format,
        includeCharts: format === 'pdf',
        dateRange: {
          startDate: dateRange.from,
          endDate: dateRange.to
        },
        filters: selectedTeam ? { teams: [selectedTeam] } : undefined
      });

      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `rapport-validation-${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: `Le rapport a été exporté en ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le rapport",
        variant: "destructive"
      });
    }
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    description?: string,
    variant: 'default' | 'success' | 'warning' | 'destructive' = 'default'
  ) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2 rounded-full ${
            variant === 'success' ? 'bg-green-100 text-green-600' :
            variant === 'warning' ? 'bg-yellow-100 text-yellow-600' :
            variant === 'destructive' ? 'bg-red-100 text-red-600' :
            'bg-blue-100 text-blue-600'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getFilteredTeamData = () => {
    if (!reportData || !selectedTeam) return reportData?.validatedByTeam || [];
    return reportData.validatedByTeam.filter(team => team.teamId === selectedTeam);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement du rapport...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rapport de Validation des Présences</h1>
          <p className="text-muted-foreground">
            Analyse des validations effectuées par les membres d'équipe
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les équipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les équipes</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Select onValueChange={(format) => handleExport(format as 'csv' | 'excel' | 'pdf')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Exporter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {reportData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="teams">Par Équipe</TabsTrigger>
            <TabsTrigger value="methods">Méthodes</TabsTrigger>
            <TabsTrigger value="issues">Problèmes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Métriques principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard(
                "Total Validations",
                reportData.totalValidations.toLocaleString(),
                <CheckCircle className="h-6 w-6" />,
                undefined,
                'success'
              )}
              {renderMetricCard(
                "Équipes Actives",
                reportData.validatedByTeam.length,
                <Users className="h-6 w-6" />
              )}
              {renderMetricCard(
                "Temps Moyen",
                `${reportData.validationTimes.average.toFixed(1)} min`,
                <Clock className="h-6 w-6" />,
                "Temps de validation moyen"
              )}
              {renderMetricCard(
                "Problèmes Détectés",
                reportData.issues.reduce((sum, issue) => sum + issue.count, 0),
                <AlertTriangle className="h-6 w-6" />,
                undefined,
                reportData.issues.length > 0 ? 'warning' : 'success'
              )}
            </div>

            {/* Graphiques de répartition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Méthodes de Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.validationMethods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ method, percentage }) => `${method}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {reportData.validationMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution des Temps de Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.validationTimes.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeRange" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {getFilteredTeamData().map((team) => (
                <Card key={team.teamId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {team.teamName}
                      <Badge variant="secondary">
                        {team.validations} validations
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Validateurs actifs: {team.validators.length}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold">Top Validateurs:</h4>
                        {team.validators
                          .sort((a, b) => b.validationCount - a.validationCount)
                          .slice(0, 5)
                          .map((validator) => (
                            <div key={validator.userId} className="flex justify-between items-center">
                              <span className="text-sm">{validator.userName}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {validator.validationCount} validations
                                </Badge>
                                <Shield className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Graphique des validations par équipe */}
            <Card>
              <CardHeader>
                <CardTitle>Validations par Équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getFilteredTeamData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="validations" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportData.validationMethods.map((method, index) => (
                <Card key={method.method}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {method.method.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-2xl font-bold">{method.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {method.percentage.toFixed(1)}% du total
                        </p>
                      </div>
                      <div className={`p-2 rounded-full`} style={{ backgroundColor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}>
                        {method.method === 'qr_code' && <CheckCircle className="h-6 w-6" />}
                        {method.method === 'manual' && <Users className="h-6 w-6" />}
                        {method.method === 'geolocation' && <TrendingUp className="h-6 w-6" />}
                        {method.method === 'bulk' && <Shield className="h-6 w-6" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Évolution des Méthodes de Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.validationMethods}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            {reportData.issues.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    Aucun problème détecté
                  </h3>
                  <p className="text-muted-foreground">
                    Toutes les validations se sont déroulées sans incident
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reportData.issues.map((issue, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        {issue.type.replace('_', ' ').toUpperCase()}
                        <Badge variant="destructive">{issue.count} cas</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {issue.events.slice(0, 5).map((event) => (
                          <div key={event.eventId} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span className="font-medium">{event.eventTitle}</span>
                            <span className="text-sm text-muted-foreground">
                              {event.issueDetails}
                            </span>
                          </div>
                        ))}
                        {issue.events.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... et {issue.events.length - 5} autres événements
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};