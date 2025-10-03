import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
  Mail,
  MailOpen,
  MousePointerClick,
  XCircle,
  UserX,
  Plus,
  X
} from 'lucide-react';

interface CampaignComparisonProps {
  organizationId: string;
  initialCampaignIds?: string[];
}

interface CampaignMetrics {
  id: string;
  name: string;
  type: string;
  status: string;
  sentAt?: string;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  clickToOpenRate: number;
}

interface ComparisonMetric {
  key: string;
  label: string;
  icon: any;
  format: 'number' | 'percentage';
  getValue: (campaign: CampaignMetrics) => number;
}

export const CampaignComparison: React.FC<CampaignComparisonProps> = ({
  organizationId,
  initialCampaignIds = []
}) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(initialCampaignIds);
  const [campaigns, setCampaigns] = useState<CampaignMetrics[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgAverage, setOrgAverage] = useState<Partial<CampaignMetrics> | null>(null);

  const metrics: ComparisonMetric[] = [
    {
      key: 'recipients',
      label: 'Destinataires',
      icon: Users,
      format: 'number',
      getValue: c => c.recipients
    },
    {
      key: 'delivered',
      label: 'Livrés',
      icon: Mail,
      format: 'number',
      getValue: c => c.delivered
    },
    {
      key: 'opened',
      label: 'Ouverts',
      icon: MailOpen,
      format: 'number',
      getValue: c => c.opened
    },
    {
      key: 'clicked',
      label: 'Clics',
      icon: MousePointerClick,
      format: 'number',
      getValue: c => c.clicked
    },
    {
      key: 'openRate',
      label: 'Taux d\'ouverture',
      icon: MailOpen,
      format: 'percentage',
      getValue: c => c.openRate
    },
    {
      key: 'clickRate',
      label: 'Taux de clic',
      icon: MousePointerClick,
      format: 'percentage',
      getValue: c => c.clickRate
    },
    {
      key: 'clickToOpenRate',
      label: 'Clic/Ouverture',
      icon: TrendingUp,
      format: 'percentage',
      getValue: c => c.clickToOpenRate
    },
    {
      key: 'bounceRate',
      label: 'Taux de bounce',
      icon: XCircle,
      format: 'percentage',
      getValue: c => c.bounceRate
    },
    {
      key: 'unsubscribeRate',
      label: 'Taux de désabonnement',
      icon: UserX,
      format: 'percentage',
      getValue: c => c.unsubscribeRate
    }
  ];

  useEffect(() => {
    loadCampaigns();
  }, [organizationId]);

  useEffect(() => {
    if (selectedCampaigns.length > 0) {
      loadSelectedCampaigns();
    }
  }, [selectedCampaigns]);

  const loadCampaigns = async () => {
    setLoading(true);

    const mockCampaigns: CampaignMetrics[] = Array.from({ length: 10 }, (_, i) => ({
      id: `campaign-${i + 1}`,
      name: `Campagne ${i + 1}`,
      type: ['newsletter', 'announcement', 'event_reminder'][i % 3],
      status: 'sent',
      sentAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      recipients: Math.floor(Math.random() * 1000) + 100,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
      clickToOpenRate: 0
    }));

    mockCampaigns.forEach(c => {
      c.delivered = Math.floor(c.recipients * (0.95 + Math.random() * 0.04));
      c.opened = Math.floor(c.delivered * (0.15 + Math.random() * 0.25));
      c.clicked = Math.floor(c.opened * (0.1 + Math.random() * 0.3));
      c.bounced = c.recipients - c.delivered;
      c.unsubscribed = Math.floor(c.delivered * (0.001 + Math.random() * 0.01));
      c.openRate = (c.opened / c.delivered) * 100;
      c.clickRate = (c.clicked / c.delivered) * 100;
      c.bounceRate = (c.bounced / c.recipients) * 100;
      c.unsubscribeRate = (c.unsubscribed / c.delivered) * 100;
      c.clickToOpenRate = c.opened > 0 ? (c.clicked / c.opened) * 100 : 0;
    });

    setAvailableCampaigns(mockCampaigns);

    const avgOpenRate = mockCampaigns.reduce((sum, c) => sum + c.openRate, 0) / mockCampaigns.length;
    const avgClickRate = mockCampaigns.reduce((sum, c) => sum + c.clickRate, 0) / mockCampaigns.length;
    const avgBounceRate = mockCampaigns.reduce((sum, c) => sum + c.bounceRate, 0) / mockCampaigns.length;

    setOrgAverage({
      openRate: avgOpenRate,
      clickRate: avgClickRate,
      bounceRate: avgBounceRate,
      clickToOpenRate: mockCampaigns.reduce((sum, c) => sum + c.clickToOpenRate, 0) / mockCampaigns.length
    });

    setLoading(false);
  };

  const loadSelectedCampaigns = () => {
    const selected = availableCampaigns.filter(c => selectedCampaigns.includes(c.id));
    setCampaigns(selected);
  };

  const addCampaign = (campaignId: string) => {
    if (selectedCampaigns.length >= 4) return;
    if (!selectedCampaigns.includes(campaignId)) {
      setSelectedCampaigns([...selectedCampaigns, campaignId]);
    }
  };

  const removeCampaign = (campaignId: string) => {
    setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaignId));
  };

  const formatValue = (value: number, format: 'number' | 'percentage') => {
    if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getComparisonIndicator = (value: number, avgValue?: number, higherIsBetter: boolean = true) => {
    if (!avgValue) return null;

    const diff = value - avgValue;
    const percentDiff = (diff / avgValue) * 100;

    if (Math.abs(percentDiff) < 5) {
      return (
        <div className="flex items-center gap-1 text-gray-600">
          <Minus className="h-4 w-4" />
          <span className="text-xs">Moyenne</span>
        </div>
      );
    }

    const isPositive = higherIsBetter ? diff > 0 : diff < 0;

    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="text-xs">{Math.abs(percentDiff).toFixed(0)}%</span>
      </div>
    );
  };

  const getBestPerformer = (metric: ComparisonMetric) => {
    if (campaigns.length === 0) return null;
    return campaigns.reduce((best, current) =>
      metric.getValue(current) > metric.getValue(best) ? current : best
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Sélection des campagnes à comparer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {campaigns.map(campaign => (
                <Badge key={campaign.id} variant="default" className="flex items-center gap-2 px-3 py-1">
                  {campaign.name}
                  <button onClick={() => removeCampaign(campaign.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {selectedCampaigns.length < 4 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ajouter une campagne ({selectedCampaigns.length}/4)
                </label>
                <select
                  onChange={e => {
                    if (e.target.value) {
                      addCampaign(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sélectionner une campagne...</option>
                  {availableCampaigns
                    .filter(c => !selectedCampaigns.includes(c.id))
                    .map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} - {new Date(campaign.sentAt!).toLocaleDateString('fr-FR')}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparaison des performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Métrique</th>
                    {campaigns.map(campaign => (
                      <th key={campaign.id} className="text-center py-3 px-2 text-sm font-medium text-gray-700">
                        {campaign.name}
                      </th>
                    ))}
                    <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">
                      Moyenne org.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(metric => {
                    const Icon = metric.icon;
                    const bestPerformer = getBestPerformer(metric);
                    const avgValue = orgAverage?.[metric.key as keyof CampaignMetrics] as number | undefined;

                    return (
                      <tr key={metric.key} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                          </div>
                        </td>
                        {campaigns.map(campaign => {
                          const value = metric.getValue(campaign);
                          const isBest = bestPerformer?.id === campaign.id;

                          return (
                            <td key={campaign.id} className="py-3 px-2 text-center">
                              <div className="space-y-1">
                                <div className={`text-sm font-semibold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                                  {formatValue(value, metric.format)}
                                </div>
                                {getComparisonIndicator(
                                  value,
                                  avgValue,
                                  !['bounceRate', 'unsubscribeRate'].includes(metric.key)
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-3 px-2 text-center">
                          <div className="text-sm font-medium text-gray-600">
                            {avgValue ? formatValue(avgValue, metric.format) : '-'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <GitCompare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Sélectionnez au moins une campagne pour commencer la comparaison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

