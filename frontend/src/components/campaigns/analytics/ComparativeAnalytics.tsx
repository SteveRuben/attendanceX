import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Calendar
} from 'lucide-react';

interface ComparativeAnalyticsProps {
  organizationId: string;
  currentCampaignId?: string;
}

interface CampaignComparison {
  id: string;
  name: string;
  type: string;
  sentAt: string;
  metrics: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    engagementScore: number;
  };
  recipients: number;
}

export const ComparativeAnalytics: React.FC<ComparativeAnalyticsProps> = ({
  organizationId,
  currentCampaignId
}) => {
  const [campaigns, setCampaigns] = useState<CampaignComparison[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [comparisonType, setComparisonType] = useState<'similar' | 'recent' | 'best'>('similar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaignsForComparison();
  }, [organizationId, comparisonType]);

  const loadCampaignsForComparison = async () => {
    try {
      setLoading(true);
      
      // Mock data - à remplacer par l'API réelle
      const mockCampaigns: CampaignComparison[] = [
        {
          id: 'current',
          name: 'Newsletter Janvier 2024',
          type: 'newsletter',
          sentAt: '2024-01-15T10:00:00Z',
          metrics: {
            deliveryRate: 95.8,
            openRate: 63.1,
            clickRate: 25.0,
            bounceRate: 4.2,
            unsubscribeRate: 1.1,
            engagementScore: 78.5
          },
          recipients: 1250
        },
        {
          id: 'comp1',
          name: 'Newsletter Décembre 2023',
          type: 'newsletter',
          sentAt: '2023-12-15T10:00:00Z',
          metrics: {
            deliveryRate: 94.2,
            openRate: 58.7,
            clickRate: 22.3,
            bounceRate: 5.8,
            unsubscribeRate: 1.5,
            engagementScore: 72.1
          },
          recipients: 1180
        },
        {
          id: 'comp2',
          name: 'Newsletter Novembre 2023',
          type: 'newsletter',
          sentAt: '2023-11-15T10:00:00Z',
          metrics: {
            deliveryRate: 96.1,
            openRate: 61.4,
            clickRate: 28.7,
            bounceRate: 3.9,
            unsubscribeRate: 0.8,
            engagementScore: 82.3
          },
          recipients: 1095
        },
        {
          id: 'comp3',
          name: 'Annonce Produit Q4',
          type: 'announcement',
          sentAt: '2023-10-20T14:00:00Z',
          metrics: {
            deliveryRate: 97.3,
            openRate: 71.2,
            clickRate: 35.6,
            bounceRate: 2.7,
            unsubscribeRate: 0.6,
            engagementScore: 89.1
          },
          recipients: 890
        },
        {
          id: 'comp4',
          name: 'Newsletter Octobre 2023',
          type: 'newsletter',
          sentAt: '2023-10-15T10:00:00Z',
          metrics: {
            deliveryRate: 93.8,
            openRate: 55.9,
            clickRate: 19.8,
            bounceRate: 6.2,
            unsubscribeRate: 2.1,
            engagementScore: 68.4
          },
          recipients: 1320
        }
      ];
      
      setCampaigns(mockCampaigns);
      
      // Sélectionner automatiquement les campagnes à comparer selon le type
      if (comparisonType === 'similar') {
        const currentCampaign = mockCampaigns.find(c => c.id === 'current');
        const similarCampaigns = mockCampaigns
          .filter(c => c.id !== 'current' && c.type === currentCampaign?.type)
          .slice(0, 3)
          .map(c => c.id);
        setSelectedCampaigns(['current', ...similarCampaigns]);
      } else if (comparisonType === 'recent') {
        const recentCampaigns = mockCampaigns
          .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
          .slice(0, 4)
          .map(c => c.id);
        setSelectedCampaigns(recentCampaigns);
      } else if (comparisonType === 'best') {
        const bestCampaigns = mockCampaigns
          .sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore)
          .slice(0, 4)
          .map(c => c.id);
        setSelectedCampaigns(bestCampaigns);
      }
      
    } catch (error) {
      console.error('Error loading campaigns for comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour les graphiques
  const comparisonData = selectedCampaigns.map(id => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return null;
    
    return {
      name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
      fullName: campaign.name,
      deliveryRate: campaign.metrics.deliveryRate,
      openRate: campaign.metrics.openRate,
      clickRate: campaign.metrics.clickRate,
      bounceRate: campaign.metrics.bounceRate,
      unsubscribeRate: campaign.metrics.unsubscribeRate,
      engagementScore: campaign.metrics.engagementScore,
      recipients: campaign.recipients,
      isCurrent: id === 'current'
    };
  }).filter(Boolean);

  // Données pour le radar chart
  const radarData = [
    {
      metric: 'Livraison',
      ...Object.fromEntries(comparisonData.map(c => [c!.name, c!.deliveryRate]))
    },
    {
      metric: 'Ouverture',
      ...Object.fromEntries(comparisonData.map(c => [c!.name, c!.openRate]))
    },
    {
      metric: 'Clic',
      ...Object.fromEntries(comparisonData.map(c => [c!.name, c!.clickRate]))
    },
    {
      metric: 'Engagement',
      ...Object.fromEntries(comparisonData.map(c => [c!.name, c!.engagementScore]))
    }
  ];

  // Calculer les insights
  const insights = React.useMemo(() => {
    if (comparisonData.length < 2) return [];
    
    const current = comparisonData.find(c => c?.isCurrent);
    if (!current) return [];
    
    const others = comparisonData.filter(c => !c?.isCurrent);
    const avgOthers = {
      deliveryRate: others.reduce((sum, c) => sum + (c?.deliveryRate || 0), 0) / others.length,
      openRate: others.reduce((sum, c) => sum + (c?.openRate || 0), 0) / others.length,
      clickRate: others.reduce((sum, c) => sum + (c?.clickRate || 0), 0) / others.length,
      engagementScore: others.reduce((sum, c) => sum + (c?.engagementScore || 0), 0) / others.length
    };
    
    const insights = [];
    
    if (current.openRate > avgOthers.openRate) {
      insights.push({
        type: 'positive',
        metric: 'Taux d\'ouverture',
        message: `+${(current.openRate - avgOthers.openRate).toFixed(1)}% par rapport à la moyenne`
      });
    } else {
      insights.push({
        type: 'negative',
        metric: 'Taux d\'ouverture',
        message: `${(current.openRate - avgOthers.openRate).toFixed(1)}% par rapport à la moyenne`
      });
    }
    
    if (current.clickRate > avgOthers.clickRate) {
      insights.push({
        type: 'positive',
        metric: 'Taux de clic',
        message: `+${(current.clickRate - avgOthers.clickRate).toFixed(1)}% par rapport à la moyenne`
      });
    } else {
      insights.push({
        type: 'negative',
        metric: 'Taux de clic',
        message: `${(current.clickRate - avgOthers.clickRate).toFixed(1)}% par rapport à la moyenne`
      });
    }
    
    return insights;
  }, [comparisonData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Analyse Comparative
          </CardTitle>
          <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="similar">Similaires</SelectItem>
              <SelectItem value="recent">Récentes</SelectItem>
              <SelectItem value="best">Meilleures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Insights rapides */}
        {insights.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Insights clés</h4>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center gap-2">
                  {insight.type === 'positive' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">{insight.metric}:</span> {insight.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Graphique en barres */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Comparaison des métriques principales
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  labelFormatter={(label) => {
                    const campaign = comparisonData.find(c => c?.name === label);
                    return campaign?.fullName || label;
                  }}
                />
                <Legend />
                
                <Bar dataKey="deliveryRate" fill="#10B981" name="Livraison" />
                <Bar dataKey="openRate" fill="#8B5CF6" name="Ouverture" />
                <Bar dataKey="clickRate" fill="#F59E0B" name="Clic" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Profil de performance
          </h4>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                {comparisonData.map((campaign, index) => (
                  <Radar
                    key={campaign?.name}
                    name={campaign?.name}
                    dataKey={campaign?.name}
                    stroke={campaign?.isCurrent ? '#3B82F6' : `hsl(${index * 60}, 70%, 50%)`}
                    fill={campaign?.isCurrent ? '#3B82F6' : `hsl(${index * 60}, 70%, 50%)`}
                    fillOpacity={campaign?.isCurrent ? 0.3 : 0.1}
                    strokeWidth={campaign?.isCurrent ? 3 : 2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tableau de comparaison détaillé */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">
            Comparaison détaillée
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">Campagne</th>
                  <th className="text-center py-2 font-medium text-gray-700">Destinataires</th>
                  <th className="text-center py-2 font-medium text-gray-700">Livraison</th>
                  <th className="text-center py-2 font-medium text-gray-700">Ouverture</th>
                  <th className="text-center py-2 font-medium text-gray-700">Clic</th>
                  <th className="text-center py-2 font-medium text-gray-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((campaign, index) => (
                  <tr key={index} className={`border-b ${campaign?.isCurrent ? 'bg-blue-50' : ''}`}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {campaign?.isCurrent && (
                          <Badge variant="default" className="text-xs">Actuelle</Badge>
                        )}
                        <span className="font-medium">{campaign?.fullName}</span>
                      </div>
                    </td>
                    <td className="text-center py-3">
                      {campaign?.recipients.toLocaleString()}
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        (campaign?.deliveryRate || 0) > 95 ? 'text-green-600' : 
                        (campaign?.deliveryRate || 0) > 90 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {campaign?.deliveryRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        (campaign?.openRate || 0) > 60 ? 'text-green-600' : 
                        (campaign?.openRate || 0) > 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {campaign?.openRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <span className={`font-medium ${
                        (campaign?.clickRate || 0) > 25 ? 'text-green-600' : 
                        (campaign?.clickRate || 0) > 15 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {campaign?.clickRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium">{campaign?.engagementScore.toFixed(0)}</span>
                        {(campaign?.engagementScore || 0) > 80 && (
                          <Award className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommandations */}
        <div className="border-t pt-6 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-blue-900 mb-2">
                  Recommandations d'amélioration
                </h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  {insights.some(i => i.type === 'negative') && (
                    <li>• Analysez les campagnes les plus performantes pour identifier les bonnes pratiques</li>
                  )}
                  <li>• Testez différents créneaux d'envoi basés sur les meilleures performances historiques</li>
                  <li>• Optimisez vos lignes d'objet en vous inspirant des campagnes avec les meilleurs taux d'ouverture</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};