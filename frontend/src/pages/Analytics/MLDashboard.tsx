// src/pages/Analytics/MLDashboard.tsx - Dashboard IA principal
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertTriangle,
  Target,
  BarChart3,
  Activity,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  AttendancePredictionCard, 
  AnomalyAlert, 
  InsightsWidget, 
  RecommendationPanel 
} from '@/components/ml';
import { mlService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';

interface MLStats {
  totalPredictions: number;
  accuracyRate: number;
  modelUsage: Record<string, number>;
  activeModels: number;
  anomaliesDetected: number;
  insightsGenerated: number;
}

const MLDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MLStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadMLStats();
  }, [timeframe]);

  const loadMLStats = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const [analyticsResponse, healthResponse] = await Promise.all([
        mlService.getMLAnalytics({
          timeframe: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          }
        }),
        mlService.healthCheck()
      ]);

      if (analyticsResponse.success && healthResponse.success) {
        setStats({
          totalPredictions: analyticsResponse.data?.totalPredictions || 0,
          accuracyRate: analyticsResponse.data?.accuracyRate || 0,
          modelUsage: analyticsResponse.data?.modelUsage || {},
          activeModels: healthResponse.data?.models?.active || 0,
          anomaliesDetected: 12, // Simulation
          insightsGenerated: 8 // Simulation
        });
      }
    } catch (error: any) {
      console.error('Error loading ML stats:', error);
      toast.error('Erreur lors du chargement des statistiques IA');
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeLabel = (value: string) => {
    const labels = {
      '24h': 'Dernières 24h',
      '7d': '7 derniers jours',
      '30d': '30 derniers jours',
      '90d': '90 derniers jours'
    };
    return labels[value as keyof typeof labels] || value;
  };

  if (loading && !stats) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Brain className="w-8 h-8 mr-3 text-primary" />
            Dashboard IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Intelligence artificielle et analytics avancés
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadMLStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prédictions</p>
                  <p className="text-2xl font-bold">{stats.totalPredictions.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="outline" className="text-xs">
                  {getTimeframeLabel(timeframe)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Précision IA</p>
                  <p className="text-2xl font-bold">{Math.round(stats.accuracyRate)}%</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant={stats.accuracyRate >= 80 ? "default" : "secondary"} className="text-xs">
                  {stats.accuracyRate >= 80 ? "Excellente" : "Bonne"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modèles Actifs</p>
                  <p className="text-2xl font-bold">{stats.activeModels}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="outline" className="text-xs">
                  Opérationnels
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Anomalies</p>
                  <p className="text-2xl font-bold">{stats.anomaliesDetected}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant={stats.anomaliesDetected > 5 ? "destructive" : "outline"} className="text-xs">
                  {stats.anomaliesDetected > 5 ? "Attention" : "Normal"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Prédictions
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Anomalies
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights Widget */}
            <InsightsWidget
              type="global"
              timeframe={{
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              maxInsights={3}
              showTrends={true}
              showRecommendations={true}
            />

            {/* Anomaly Alert */}
            <AnomalyAlert
              type="attendance"
              timeframe={{
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              threshold={0.7}
              autoRefresh={true}
              refreshInterval={15}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recommandations */}
            <RecommendationPanel
              type="global"
              targetId="system"
              maxRecommendations={3}
              showPriority={true}
              showActions={true}
            />

            {/* Exemple de prédiction */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Exemple de Prédiction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Voici un exemple de prédiction de présence pour votre profil
                  </p>
                  <AttendancePredictionCard
                    userId={user.uid}
                    eventId="example-event"
                    userName={user.displayName || 'Utilisateur'}
                    compact={false}
                    showFactors={true}
                    showRecommendations={true}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Prédictions de Présence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Prédictions Avancées</h3>
                <p className="text-muted-foreground mb-4">
                  Sélectionnez un événement pour voir les prédictions de présence détaillées
                </p>
                <Button variant="outline">
                  Sélectionner un événement
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <AnomalyAlert
            type="attendance"
            timeframe={{
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString()
            }}
            threshold={0.6}
            autoRefresh={false}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InsightsWidget
              type="global"
              timeframe={{
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              maxInsights={5}
              showTrends={true}
              showRecommendations={true}
              compact={false}
            />

            <InsightsWidget
              type="department"
              targetId="engineering"
              timeframe={{
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              maxInsights={5}
              showTrends={true}
              showRecommendations={false}
              compact={false}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MLDashboard;