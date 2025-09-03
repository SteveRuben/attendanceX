import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { TemplateEditor, EmailTemplate } from '@/components/campaigns/templates/TemplateEditor';
import { Card } from '@/components/ui/Card';
import { AlertCircle } from 'lucide-react';

export const TemplateEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const { user, organization } = useAuth();

  // Vérifier les permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être connecté pour éditer des templates.</span>
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
            <span>Vous devez être membre d'une organisation pour éditer des templates.</span>
          </div>
        </Card>
      </div>
    );
  }

  // Vérifier les permissions de rôle
  const hasPermission = user.role === 'admin' || 
                       user.role === 'manager' || 
                       user.permissions?.includes('manage_templates');

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous n'avez pas les permissions nécessaires pour éditer des templates.</span>
          </div>
        </Card>
      </div>
    );
  }

  const handleSave = (template: EmailTemplate) => {
    // Rediriger vers le gestionnaire de templates avec un message de succès
    navigate(`/organization/${organization.organizationId}/campaigns/templates?saved=${template.id}`);
  };

  const handleCancel = () => {
    // Retourner au gestionnaire de templates
    navigate(`/organization/${organization.organizationId}/campaigns/templates`);
  };

  return (
    <TemplateEditor
      templateId={templateId}
      organizationId={organization.organizationId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
};