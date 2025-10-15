import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Plus, FileText, BarChart3 } from 'lucide-react';
import { CampaignList } from './CampaignList';
import { CampaignStats } from './CampaignStats';
import { CampaignFilters } from './CampaignFilters';
import { useCampaigns } from '../hooks/useCampaigns';

interface CampaignDashboardProps {
  organizationId: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  type: 'newsletter' | 'announcement' | 'event_reminder' | 'hr_communication' | 'custom';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  recipients: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
  createdBy: string;
  templateId?: string;
  tags: string[];
}

export interface CampaignFilters {
  search: string;
  status: string;
  type: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const CampaignDashboard: React.FC<CampaignDashboardProps> = ({ organizationId }) => {
  const navigate = useNavigate();
  const {
    campaigns,
    loading,
    filters,
    stats,
    loadCampaigns,
    setFilters
  } = useCampaigns({ autoLoad: true });

  const handleCreateCampaign = () => {
    navigate(`/organization/${organizationId}/campaigns/new`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes Email</h1>
          <p className="text-gray-600">
            Gérez et suivez vos campagnes de communication par email
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/organization/${organizationId}/campaigns/analytics`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`/organization/${organizationId}/campaigns/templates`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={handleCreateCampaign} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Campagne
          </Button>
        </div>
      </div>

      {/* Statistiques globales */}
      <CampaignStats campaigns={campaigns} />

      {/* Filtres et recherche */}
      <CampaignFilters 
        filters={filters} 
        onFilterChange={setFilters}
        campaignCount={campaigns.length}
      />

      {/* Liste des campagnes */}
      <CampaignList 
        campaigns={campaigns}
        loading={loading}
        onRefresh={loadCampaigns}
      />
    </div>
  );
};