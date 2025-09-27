import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  Eye,
  MousePointer,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PerformanceMetricsChart } from './PerformanceMetricsChart';
import { EngagementHeatmap } from './EngagementHeatmap';
import { DeliveryStatusMonitor } from './DeliveryStatusMonitor';
import { ComparativeAnalytics } from './ComparativeAnalytics';
import { CampaignTimeline } from './CampaignTimeline';

interface CampaignAnalyticsDashboardProps {
  campaignId?: string;
  organizationId: string;
}

interface AnalyticsData {
  overview: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    engagementScore: number;
  };
  timeline: Array<{
    timestamp: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locations: Array<{
    country: string;
    opens: number;
    clicks: number;
  }>;
  topLinks: Array<{
    url: string;
    clicks: number;
    clickRate: number;
  }>;
}

export const CampaignAnalyticsDashboard: React.FC<CampaignAnalyticsDashboardProps> = ({
  campaignId,
  organizationId
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('opens');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [campaignId, organizationId, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Mock data - à remplacer par l'API réelle
      const mockData: AnalyticsData = {
        overview: {
          totalSent: 1250,
          totalDelivered: 1198,
          totalOpened: 756,
          totalClicked: 189,
          totalBounced: 52,
          totalUnsubscribed: 8,
          deliveryRate: 95.8,
          openRate: 63.1,
          clickRate: 25.0,
          bounceRate: 4.2,
          unsubscribeRate: 1.1,
          engagementScore: 78.5
        },
        timeline: generateTimelineData(),
        devices: {
          desktop: 45.2,
          mobile: 42.8,
          tablet: 12.0
        },
        locations: [
          { country: 'France', opens: 456, clicks: 123 },
          { country: 'Belgique', opens: 189, clicks: 45 },
          { country: 'Suisse', opens: 78, clicks: 21 },
          { country: 'Canada', opens: 33, clicks: 8 }
        ],
        topLinks: [
          { url: 'https://example.com/product', clicks: 89, clickRate: 47.1 },
          { url: 'https://example.com/blog', clicks: 56, clickRate: 29.6 },
          { url: 'https://example.com/contact', clicks: 44, clickRate: 23.3 }
        ]
      };
      
      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimelineData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        timestamp: date.toISOString(),
        sent: Math.floor(Math.random() * 200) + 100,
        delivered: Math.floor(Math.random() * 190) + 95,
        opened: Math.floor(Math.random() * 120) + 60,
        clicked: Math.floor(Math.random() * 30) + 15,
        bounced: Math.floor(Math.random() * 10) + 2
      });
    }
    
    return data;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const exportData = () => {
    // Logique d'export des données
    console.log('Exporting analytics data...');
  };

  const getMetricTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 1
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center p-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucune donnée disponible
        </h3>
        <p className="text-gray-600">
          Les analytics apparaîtront ici une fois que la campagne aura été envoyée.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics de Campagne</h1>
          <p className="text-gray-600">
            Analyse détaillée des performances et de l'engagement
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de livraison</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.overview.deliveryRate}%
                  </p>
                  <div className="flex items-center text-sm text-green-600">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    2.1%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analyticsData.overview.totalDelivered.toLocaleString()} / {analyticsData.overview.totalSent.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux d'ouverture</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.overview.openRate}%
                  </p>
                  <div className="flex items-center text-sm text-green-600">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    5.3%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analyticsData.overview.totalOpened.toLocaleString()} ouvertures
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de clic</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.overview.clickRate}%
                  </p>
                  <div className="flex items-center text-sm text-red-600">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    1.2%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analyticsData.overview.totalClicked.toLocaleString()} clics
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score d'engagement</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.overview.engagementScore}
                  </p>
                  <Badge variant="default" className="text-xs">
                    Excellent
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Basé sur l'activité globale
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceMetricsChart 
          data={analyticsData.timeline}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
        
        <EngagementHeatmap 
          data={analyticsData.timeline}
          timeRange={timeRange}
        />
      </div>

      {/* Monitoring et comparaison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeliveryStatusMonitor 
          campaignId={campaignId}
          organizationId={organizationId}
        />
        
        <ComparativeAnalytics 
          organizationId={organizationId}
          currentCampaignId={campaignId}
        />
      </div>

      {/* Timeline détaillée */}
      <CampaignTimeline 
        data={analyticsData.timeline}
        overview={analyticsData.overview}
      />

      {/* Détails supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Répartition par appareil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition par appareil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analyticsData.devices).map(([device, percentage]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{device}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top liens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Liens les plus cliqués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.topLinks.map((link, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 truncate">
                      {link.url.replace('https://', '')}
                    </span>
                    <span className="text-sm font-medium">{link.clicks}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-orange-600 h-1 rounded-full" 
                      style={{ width: `${link.clickRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Géolocalisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Répartition géographique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.locations.map((location, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{location.country}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{location.opens} ouvertures</div>
                    <div className="text-xs text-gray-500">{location.clicks} clics</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};