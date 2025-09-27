import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import { exportExecutiveSummary } from '../../../utils/reportExport';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  Mail,
  Eye,
  MousePointer,
  Calendar,
  Download,
  Share2,
  Lightbulb,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface ExecutiveSummaryProps {
  organizationId: string;
  timeRange?: string;
  onExport?: (format: string) => void;
}

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric: string;
  value: number;
  trend: number;
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
}

interface SummaryData {
  period: {
    start: string;
    end: string;
    label: string;
  };
  overview: {
    totalCampaigns: number;
    totalRecipients: number;
    avgDeliveryRate: number;
    avgOpenRate: number;
    avgClickRate: number;
    totalRevenue?: number;
  };
  trends: {
    campaignsGrowth: number;
    recipientsGrowth: number;
    deliveryGrowth: number;
    openRateGrowth: number;
    clickRateGrowth: number;
  };
  bestPerforming: {
    campaign: string;
    metric: string;
    value: number;
  };
  worstPerforming: {
    campaign: string;
    metric: string;
    value: number;
  };
  insights: Insight[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  organizationId,
  timeRange = '30d',
  onExport
}) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData();
  }, [organizationId, timeRange]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, this would come from the API
      const mockData: SummaryData = {
        period: {
          start: '2024-01-01',
          end: '2024-01-31',
          label: 'Janvier 2024'
        },
        overview: {
          totalCampaigns: 24,
          totalRecipients: 18750,
          avgDeliveryRate: 95.2,
          avgOpenRate: 62.8,
          avgClickRate: 24.1
        },
        trends: {
          campaignsGrowth: 12.5,
          recipientsGrowth: 8.3,
          deliveryGrowth: 2.1,
          openRateGrowth: -3.2,
          clickRateGrowth: 5.7
        },
        bestPerforming: {
          campaign: 'Newsletter Produit Janvier',
          metric: 'Taux de clic',
          value: 42.3
        },
        worstPerforming: {
          campaign: 'Annonce Maintenance',
          metric: 'Taux d\'ouverture',
          value: 28.1
        },
        insights: [
          {
            id: 'insight-1',
            type: 'positive',
            title: 'Excellent taux de clic sur les newsletters',
            description: 'Les newsletters produit ont un taux de clic 68% supérieur à la moyenne',
            metric: 'clickRate',
            value: 42.3,
            trend: 15.2,
            priority: 'high',
            recommendations: [
              'Reproduire le format des newsletters produit pour d\'autres campagnes',
              'Analyser les éléments qui génèrent le plus de clics',
              'Augmenter la fréquence des newsletters produit'
            ]
          },
          {
            id: 'insight-2',
            type: 'warning',
            title: 'Baisse du taux d\'ouverture global',
            description: 'Le taux d\'ouverture a diminué de 3.2% par rapport au mois précédent',
            metric: 'openRate',
            value: 62.8,
            trend: -3.2,
            priority: 'high',
            recommendations: [
              'Tester de nouveaux objets d\'email plus accrocheurs',
              'Segmenter davantage les listes de diffusion',
              'Optimiser l\'heure d\'envoi selon les segments'
            ]
          },
          {
            id: 'insight-3',
            type: 'positive',
            title: 'Croissance soutenue de l\'audience',
            description: 'Le nombre de destinataires a augmenté de 8.3% ce mois-ci',
            metric: 'recipients',
            value: 18750,
            trend: 8.3,
            priority: 'medium',
            recommendations: [
              'Maintenir les efforts d\'acquisition',
              'Mettre en place un programme de parrainage',
              'Optimiser les formulaires d\'inscription'
            ]
          },
          {
            id: 'insight-4',
            type: 'negative',
            title: 'Performance faible des annonces système',
            description: 'Les annonces de maintenance ont des taux d\'engagement très bas',
            metric: 'engagement',
            value: 28.1,
            trend: -12.5,
            priority: 'medium',
            recommendations: [
              'Revoir le ton et le contenu des annonces système',
              'Ajouter des éléments visuels pour capter l\'attention',
              'Programmer les annonces à des moments plus favorables'
            ]
          }
        ],
        recommendations: {
          immediate: [
            'Tester de nouveaux objets d\'email pour améliorer le taux d\'ouverture',
            'Analyser les newsletters produit pour identifier les bonnes pratiques',
            'Segmenter les annonces système par type d\'utilisateur'
          ],
          shortTerm: [
            'Mettre en place des tests A/B systématiques sur les objets',
            'Développer des templates spécialisés par type de campagne',
            'Implémenter un système de scoring d\'engagement'
          ],
          longTerm: [
            'Développer une stratégie de personnalisation avancée',
            'Intégrer l\'intelligence artificielle pour l\'optimisation',
            'Créer un programme de fidélisation des abonnés'
          ]
        }
      };
      
      setSummaryData(mockData);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'negative':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'border-green-200 bg-green-50';
      case 'negative':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else if (trend < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'powerpoint') => {
    try {
      await exportExecutiveSummary({
        organizationId,
        format,
        timeRange
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export du résumé exécutif');
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Impossible de charger le résumé
          </h3>
          <p className="text-gray-600">
            Une erreur s'est produite lors du chargement des données.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résumé Exécutif</h1>
          <p className="text-gray-600">
            Période: {summaryData.period.label}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('powerpoint')}>
            <Download className="h-4 w-4 mr-2" />
            PowerPoint
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Partager
          </Button>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Vue d'ensemble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Mail className="h-4 w-4 text-gray-500" />
                {getTrendIcon(summaryData.trends.campaignsGrowth)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summaryData.overview.totalCampaigns}
              </div>
              <div className="text-sm text-gray-600">Campagnes</div>
              <div className={`text-xs ${getTrendColor(summaryData.trends.campaignsGrowth)}`}>
                {summaryData.trends.campaignsGrowth > 0 ? '+' : ''}{formatPercentage(summaryData.trends.campaignsGrowth)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="h-4 w-4 text-gray-500" />
                {getTrendIcon(summaryData.trends.recipientsGrowth)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(summaryData.overview.totalRecipients)}
              </div>
              <div className="text-sm text-gray-600">Destinataires</div>
              <div className={`text-xs ${getTrendColor(summaryData.trends.recipientsGrowth)}`}>
                {summaryData.trends.recipientsGrowth > 0 ? '+' : ''}{formatPercentage(summaryData.trends.recipientsGrowth)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-4 w-4 text-gray-500" />
                {getTrendIcon(summaryData.trends.deliveryGrowth)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(summaryData.overview.avgDeliveryRate)}
              </div>
              <div className="text-sm text-gray-600">Livraison</div>
              <div className={`text-xs ${getTrendColor(summaryData.trends.deliveryGrowth)}`}>
                {summaryData.trends.deliveryGrowth > 0 ? '+' : ''}{formatPercentage(summaryData.trends.deliveryGrowth)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="h-4 w-4 text-gray-500" />
                {getTrendIcon(summaryData.trends.openRateGrowth)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(summaryData.overview.avgOpenRate)}
              </div>
              <div className="text-sm text-gray-600">Ouverture</div>
              <div className={`text-xs ${getTrendColor(summaryData.trends.openRateGrowth)}`}>
                {summaryData.trends.openRateGrowth > 0 ? '+' : ''}{formatPercentage(summaryData.trends.openRateGrowth)}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MousePointer className="h-4 w-4 text-gray-500" />
                {getTrendIcon(summaryData.trends.clickRateGrowth)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(summaryData.overview.avgClickRate)}
              </div>
              <div className="text-sm text-gray-600">Clic</div>
              <div className={`text-xs ${getTrendColor(summaryData.trends.clickRateGrowth)}`}>
                {summaryData.trends.clickRateGrowth > 0 ? '+' : ''}{formatPercentage(summaryData.trends.clickRateGrowth)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performances remarquables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-5 w-5" />
              Meilleure Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {summaryData.bestPerforming.campaign}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {summaryData.bestPerforming.metric}
              </div>
              <div className="text-3xl font-bold text-green-600">
                {formatPercentage(summaryData.bestPerforming.value)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="h-5 w-5" />
              À Améliorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {summaryData.worstPerforming.campaign}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {summaryData.worstPerforming.metric}
              </div>
              <div className="text-3xl font-bold text-red-600">
                {formatPercentage(summaryData.worstPerforming.value)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights clés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Clés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summaryData.insights.map(insight => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      <Badge 
                        variant={insight.priority === 'high' ? 'destructive' : 
                                insight.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {insight.priority === 'high' ? 'Priorité haute' :
                         insight.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{insight.description}</p>
                    
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Recommandations:</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommandations par horizon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Plan d'Action Recommandé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                Actions Immédiates
              </h4>
              <ul className="space-y-2">
                {summaryData.recommendations.immediate.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-red-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                Court Terme (1-3 mois)
              </h4>
              <ul className="space-y-2">
                {summaryData.recommendations.shortTerm.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Long Terme (3+ mois)
              </h4>
              <ul className="space-y-2">
                {summaryData.recommendations.longTerm.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};