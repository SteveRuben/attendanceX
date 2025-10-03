import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft,
  BarChart3,
  Users,
  GitCompare,
  FileText,
  Eye,
  FlaskConical
} from 'lucide-react';
import { RecipientAnalytics } from '../../components/campaigns/analytics/RecipientAnalytics';
import { CampaignComparison } from '../../components/campaigns/analytics/CampaignComparison';
import { EmailClientPreview } from '../../components/campaigns/preview/EmailClientPreview';
import { ABTestingManager } from '../../components/campaigns/ABTestingManager';

type AnalyticsTab = 'recipients' | 'comparison' | 'preview' | 'abtesting';

export const AdvancedAnalyticsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('recipients');

  const tabs = [
    {
      id: 'recipients' as AnalyticsTab,
      label: 'Analyse par destinataire',
      icon: Users,
      description: 'Détails de l\'activité de chaque destinataire'
    },
    {
      id: 'comparison' as AnalyticsTab,
      label: 'Comparaison',
      icon: GitCompare,
      description: 'Comparer avec d\'autres campagnes'
    },
    {
      id: 'preview' as AnalyticsTab,
      label: 'Aperçu clients email',
      icon: Eye,
      description: 'Rendu dans différents clients email'
    },
    {
      id: 'abtesting' as AnalyticsTab,
      label: 'Tests A/B',
      icon: FlaskConical,
      description: 'Configuration et résultats des tests'
    }
  ];

  const handleBack = () => {
    if (campaignId) {
      navigate(`/organization/${organization?.organizationId}/campaigns/${campaignId}/analytics`);
    } else {
      navigate(`/organization/${organization?.organizationId}/campaigns/analytics`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analyses avancées</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Outils d'analyse détaillée pour vos campagnes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{tab.description}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === 'recipients' && campaignId && (
            <RecipientAnalytics campaignId={campaignId} />
          )}

          {activeTab === 'recipients' && !campaignId && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                Sélectionnez une campagne pour voir l'analyse par destinataire
              </p>
            </div>
          )}

          {activeTab === 'comparison' && organization && (
            <CampaignComparison
              organizationId={organization.organizationId}
              initialCampaignIds={campaignId ? [campaignId] : []}
            />
          )}

          {activeTab === 'preview' && (
            <EmailClientPreview
              campaignId={campaignId}
              htmlContent="<h1>Exemple de contenu</h1><p>Ceci est un exemple de contenu d'email.</p>"
              subject="Ligne d'objet de test"
            />
          )}

          {activeTab === 'abtesting' && (
            <ABTestingManager
              campaignId={campaignId}
              onSave={config => console.log('A/B test config saved', config)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

