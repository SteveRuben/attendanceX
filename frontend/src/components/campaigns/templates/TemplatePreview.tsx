import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { EmailTemplate } from './TemplateEditor';

interface TemplatePreviewProps {
  template: EmailTemplate;
  device: 'desktop' | 'mobile' | 'tablet';
  onDeviceChange: (device: 'desktop' | 'mobile' | 'tablet') => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  device,
  onDeviceChange
}) => {
  // Variables d'exemple pour l'aperçu
  const sampleVariables = {
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@example.com',
    organizationName: 'Mon Entreprise',
    title: 'Newsletter Mensuelle',
    subtitle: 'Janvier 2024',
    unsubscribeLink: '#unsubscribe',
    currentDate: new Date().toLocaleDateString('fr-FR'),
    userName: 'Marie Dubois',
    companyName: 'Mon Entreprise'
  };

  // Remplacer les variables dans le contenu
  const processedContent = template.htmlContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return sampleVariables[key as keyof typeof sampleVariables] || match;
  });

  // Appliquer les styles du template
  const applyTemplateStyles = (content: string) => {
    const { colorScheme, typography, layout } = template.settings;
    
    // Injecter les styles CSS personnalisés
    const customStyles = `
      <style>
        .template-container {
          max-width: ${layout.width};
          margin: 0 auto;
          font-family: ${typography.fontFamily};
          font-size: ${typography.fontSize};
          line-height: ${typography.lineHeight};
          background-color: ${colorScheme.background};
          color: ${colorScheme.text};
        }
        .template-container h1, .template-container h2, .template-container h3 {
          color: ${colorScheme.primary};
        }
        .template-container a {
          color: ${colorScheme.primary};
        }
        .template-container .btn-primary {
          background-color: ${colorScheme.primary};
          color: ${colorScheme.background};
        }
        .template-container .btn-secondary {
          border-color: ${colorScheme.primary};
          color: ${colorScheme.primary};
        }
      </style>
    `;
    
    return customStyles + `<div class="template-container">${content}</div>`;
  };

  const styledContent = applyTemplateStyles(processedContent);

  // Dimensions selon l'appareil
  const getDeviceDimensions = () => {
    switch (device) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
      default:
        return { width: '100%', height: '600px' };
    }
  };

  const dimensions = getDeviceDimensions();

  const refreshPreview = () => {
    // Force un re-render de l'aperçu
    window.location.reload();
  };

  const exportPreview = () => {
    // Créer un blob avec le contenu HTML
    const blob = new Blob([styledContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name || 'template'}-preview.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Aperçu
        </h3>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={refreshPreview}
            title="Actualiser l'aperçu"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={exportPreview}
            title="Exporter l'aperçu"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sélecteur d'appareil */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        <Button
          size="sm"
          variant={device === 'desktop' ? 'default' : 'ghost'}
          onClick={() => onDeviceChange('desktop')}
          className="flex-1"
        >
          <Monitor className="h-3 w-3 mr-1" />
          Desktop
        </Button>
        <Button
          size="sm"
          variant={device === 'tablet' ? 'default' : 'ghost'}
          onClick={() => onDeviceChange('tablet')}
          className="flex-1"
        >
          <Tablet className="h-3 w-3 mr-1" />
          Tablet
        </Button>
        <Button
          size="sm"
          variant={device === 'mobile' ? 'default' : 'ghost'}
          onClick={() => onDeviceChange('mobile')}
          className="flex-1"
        >
          <Smartphone className="h-3 w-3 mr-1" />
          Mobile
        </Button>
      </div>

      {/* Informations sur l'aperçu */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Dimensions:</span>
          <span>{dimensions.width} × {dimensions.height}</span>
        </div>
        <div className="flex justify-between">
          <span>Variables:</span>
          <span>{template.variables.length} définies</span>
        </div>
        <div className="flex justify-between">
          <span>Responsive:</span>
          <Badge variant={template.settings.responsive ? 'default' : 'secondary'} className="text-xs">
            {template.settings.responsive ? 'Activé' : 'Désactivé'}
          </Badge>
        </div>
      </div>

      {/* Aperçu du template */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Barre d'adresse simulée */}
        <div className="bg-gray-100 px-3 py-2 border-b flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
          <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-gray-500">
            Email Preview - {template.name}
          </div>
        </div>

        {/* Contenu de l'email */}
        <div 
          className="overflow-auto bg-gray-50"
          style={{ 
            width: device === 'desktop' ? '100%' : dimensions.width,
            height: dimensions.height,
            margin: device === 'desktop' ? '0' : '0 auto'
          }}
        >
          <div className="p-4">
            {/* En-tête de l'email simulé */}
            <div className="bg-white rounded-t-lg border border-b-0 p-3 text-xs text-gray-600">
              <div className="flex justify-between mb-1">
                <span>De: {sampleVariables.organizationName} &lt;noreply@example.com&gt;</span>
                <span>Maintenant</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>À: {sampleVariables.email}</span>
              </div>
              <div className="font-medium text-gray-900">
                {template.variables.find(v => v.name === 'title')?.defaultValue || 'Sujet de l\'email'}
              </div>
            </div>

            {/* Contenu de l'email */}
            <div 
              className="bg-white rounded-b-lg border overflow-hidden"
              style={{ 
                fontSize: device === 'mobile' ? '14px' : '16px',
                maxWidth: device === 'desktop' ? '600px' : '100%',
                margin: '0 auto'
              }}
              dangerouslySetInnerHTML={{ __html: styledContent }}
            />
          </div>
        </div>
      </div>

      {/* Variables utilisées */}
      {template.variables.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">
            Variables dans l'aperçu:
          </h4>
          <div className="space-y-1">
            {template.variables.map((variable, index) => (
              <div key={index} className="flex justify-between text-xs">
                <code className="bg-gray-100 px-1 rounded">
                  {`{{${variable.name}}}`}
                </code>
                <span className="text-gray-600">
                  {sampleVariables[variable.name as keyof typeof sampleVariables] || variable.defaultValue || '(vide)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => {
            const subject = template.variables.find(v => v.name === 'title')?.defaultValue || 'Test Email';
            const body = encodeURIComponent(processedContent.replace(/<[^>]*>/g, ''));
            window.open(`mailto:?subject=${subject}&body=${body}`);
          }}
        >
          <Share2 className="h-3 w-3 mr-2" />
          Tester par email
        </Button>
      </div>
    </div>
  );
};