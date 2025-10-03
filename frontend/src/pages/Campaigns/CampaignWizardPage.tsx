import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { CampaignWizard } from '../components/campaigns/CampaignWizard';
import { Card } from '../components/ui/Card';
import { AlertCircle } from 'lucide-react';

export const CampaignWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { user, organization } = useAuth();

  const isEditMode = !!campaignId;

  // Vérifier les permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être connecté pour {isEditMode ? 'modifier' : 'créer'} une campagne.</span>
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
            <span>Vous devez être membre d'une organisation pour {isEditMode ? 'modifier' : 'créer'} des campagnes.</span>
          </div>
        </Card>
      </div>
    );
  }

  // Vérifier les permissions de rôle
  const hasPermission = user.role === 'admin' ||
                       user.role === 'manager' ||
                       user.permissions?.includes('manage_campaigns');

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous n'avez pas les permissions nécessaires pour {isEditMode ? 'modifier' : 'créer'} des campagnes.</span>
          </div>
        </Card>
      </div>
    );
  }

  const handleComplete = (campaignId: string) => {
    const action = isEditMode ? 'updated' : 'created';
    navigate(`/campaigns?${action}=${campaignId}`);
  };

  const handleCancel = () => {
    navigate('/campaigns');
  };

  return (
    <CampaignWizard
      organizationId={organization.organizationId}
      campaignId={campaignId}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};