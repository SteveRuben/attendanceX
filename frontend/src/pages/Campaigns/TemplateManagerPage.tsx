import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { TemplateManager } from '../components/campaigns/templates/TemplateManager';
import { TemplatePreview } from '../components/campaigns/templates/TemplatePreview';
import { EmailTemplate } from '../components/campaigns/templates/TemplateEditor';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, X } from 'lucide-react';

export const TemplateManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization } = useAuth();
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  // Vérifier les permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Vous devez être connecté pour gérer les templates.</span>
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
            <span>Vous devez être membre d'une organisation pour gérer les templates.</span>
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
            <span>Vous n'avez pas les permissions nécessaires pour gérer les templates.</span>
          </div>
        </Card>
      </div>
    );
  }

  const handleCreateTemplate = () => {
    navigate(`/organization/${organization.organizationId}/campaigns/templates/new`);
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/organization/${organization.organizationId}/campaigns/templates/${templateId}/edit`);
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setPreviewTemplate(template);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Gestionnaire principal */}
          <div className={previewTemplate ? 'flex-1' : 'w-full'}>
            <TemplateManager
              organizationId={organization.organizationId}
              onCreateTemplate={handleCreateTemplate}
              onEditTemplate={handleEditTemplate}
              onPreviewTemplate={handlePreviewTemplate}
            />
          </div>

          {/* Panneau d'aperçu */}
          {previewTemplate && (
            <div className="w-96 flex-shrink-0">
              <Card className="sticky top-8">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold text-gray-900">
                    Aperçu: {previewTemplate.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closePreview}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="max-h-[calc(100vh-200px)] overflow-auto">
                  <TemplatePreview
                    template={previewTemplate}
                    device={previewDevice}
                    onDeviceChange={setPreviewDevice}
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};