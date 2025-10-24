import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { CampaignAnalyticsDashboard } from '../components/campaigns/analytics/CampaignAnalyticsDashboard';
import { Card } from '../components/ui/Card';
import { AlertCircle } from 'lucide-react';

export const CampaignAnalyticsPage: React.FC = () => {
  const { campaignId } = useParams();
  const { user, organization } = useAuth();

  // Vérifier les permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être connecté pour voir les analytics.</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être membre d'une organisation pour voir les analytics.</span>
          </div>
        </Card>
      </div>
    );
  }

  // Vérifier les permissions de rôle
  const hasPermission = user.role === 'admin' || 
                       user.role === 'manager' || 
                       user.permissions?.includes('view_analytics');

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous n'avez pas les permissions nécessaires pour voir les analytics.</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CampaignAnalyticsDashboard 
          organizationId={organization.organizationId}
          campaignId={campaignId}
        />
      </div>
    </div>
  );
};