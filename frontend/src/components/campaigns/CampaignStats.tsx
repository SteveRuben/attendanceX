import React from 'react';
import { Card } from '../ui/Card';
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Campaign } from './CampaignDashboard';

interface CampaignStatsProps {
  campaigns: Campaign[];
}

export const CampaignStats: React.FC<CampaignStatsProps> = ({ campaigns }) => {
  // Calculer les statistiques globales
  const stats = React.useMemo(() => {
    const totalCampaigns = campaigns.length;
    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    const activeCampaigns = campaigns.filter(c => ['scheduled', 'sending'].includes(c.status));
    const draftCampaigns = campaigns.filter(c => c.status === 'draft');
    
    const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.openedCount, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.clickedCount, 0);
    const totalBounced = campaigns.reduce((sum, c) => sum + c.bouncedCount, 0);
    
    const avgOpenRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => sum + c.openRate, 0) / sentCampaigns.length 
      : 0;
    
    const avgClickRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => sum + c.clickRate, 0) / sentCampaigns.length 
      : 0;
    
    const avgBounceRate = sentCampaigns.length > 0 
      ? sentCampaigns.reduce((sum, c) => sum + c.bounceRate, 0) / sentCampaigns.length 
      : 0;

    return {
      totalCampaigns,
      sentCampaigns: sentCampaigns.length,
      activeCampaigns: activeCampaigns.length,
      draftCampaigns: draftCampaigns.length,
      totalRecipients,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      avgOpenRate,
      avgClickRate,
      avgBounceRate,
      deliveryRate: totalRecipients > 0 ? (totalDelivered / totalRecipients) * 100 : 0
    };
  }, [campaigns]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    iconColor: string;
    iconBgColor: string;
    trend?: {
      value: number;
      isPositive: boolean;
    };
  }> = ({ title, value, subtitle, icon: Icon, iconColor, iconBgColor, trend }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className={`flex items-center text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Campagnes"
        value={stats.totalCampaigns}
        subtitle={`${stats.sentCampaigns} envoyées, ${stats.activeCampaigns} actives, ${stats.draftCampaigns} brouillons`}
        icon={Mail}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100"
      />

      <StatCard
        title="Destinataires Totaux"
        value={stats.totalRecipients.toLocaleString()}
        subtitle={`${stats.totalDelivered.toLocaleString()} livrés (${stats.deliveryRate.toFixed(1)}%)`}
        icon={Users}
        iconColor="text-green-600"
        iconBgColor="bg-green-100"
      />

      <StatCard
        title="Taux d'Ouverture Moyen"
        value={`${stats.avgOpenRate.toFixed(1)}%`}
        subtitle={`${stats.totalOpened.toLocaleString()} ouvertures totales`}
        icon={Eye}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-100"
        trend={{
          value: 2.3,
          isPositive: true
        }}
      />

      <StatCard
        title="Taux de Clic Moyen"
        value={`${stats.avgClickRate.toFixed(1)}%`}
        subtitle={`${stats.totalClicked.toLocaleString()} clics totaux`}
        icon={MousePointer}
        iconColor="text-orange-600"
        iconBgColor="bg-orange-100"
        trend={{
          value: 1.8,
          isPositive: true
        }}
      />
    </div>
  );
};