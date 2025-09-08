import React, { useState, useEffect } from 'react';
import { OrganizationSector, type OrganizationTemplate } from '../../shared';
import { organizationService } from '../../services/organizationService';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_TEMPLATES } from './sector';



interface SectorTemplateSelectorProps {
  sector: OrganizationSector;
  onTemplateSelect: (template: OrganizationTemplate) => void;
  onBack: () => void;
}



export const SectorTemplateSelector: React.FC<SectorTemplateSelectorProps> = ({
  sector,
  onTemplateSelect,
  onBack
}) => {
  const [templates, setTemplates] = useState<OrganizationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<OrganizationTemplate | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        // Essayer de charger les templates depuis le service
        const serverTemplates = await organizationService.getSectorTemplates(sector)
        setTemplates(serverTemplates);
      } catch (error) {
        // Fallback vers les templates par défaut
        console.warn('Failed to load server templates, using defaults:', error);
        setTemplates(DEFAULT_TEMPLATES[sector] || DEFAULT_TEMPLATES[OrganizationSector.OTHER]);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [sector]);

  const handleTemplateSelect = (template: OrganizationTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
    }
  };

  const getSectorLabel = (sector: OrganizationSector): string => {
    const labels = {
      [OrganizationSector.SERVICES]: 'Services',
      [OrganizationSector.RETAIL]: 'Commerce de détail',
      [OrganizationSector.HEALTHCARE]: 'Santé',
      [OrganizationSector.EDUCATION]: 'Éducation',
      [OrganizationSector.CONSULTING]: 'Conseil',
      [OrganizationSector.ASSOCIATION]: 'Association',
      [OrganizationSector.OTHER]: 'Autre',
      [OrganizationSector.CORPORATE ]: 'corporate',
      [OrganizationSector.GOVERNMENT ]: 'government',
      [OrganizationSector.NON_PROFIT ]: 'non_profit',
      [OrganizationSector.TECHNOLOGY ]: 'technology',
      [OrganizationSector.FINANCE ]: 'finance',
      [OrganizationSector.MANUFACTURING ]: 'manufacturing',
      [OrganizationSector.HOSPITALITY]: 'hospitality',
    };
    return labels[sector] || 'Autre';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Chargement des templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Configuration pour {getSectorLabel(sector)}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Choisissez une configuration adaptée à votre activité. Vous pourrez la personnaliser plus tard.
        </p>
      </div>

      <div className="space-y-4">
        {(templates || []).map((template) => (
          <div
            key={template.id}
            className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={selectedTemplate?.id === template.id}
                  onChange={() => handleTemplateSelect(template)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {template.name}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: template.branding.primaryColor }}
                    ></div>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: template.branding.secondaryColor }}
                    ></div>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {template.description}
                </p>
                
                {template.preview && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Fonctionnalités incluses
                      </h5>
                      <ul className="mt-1 text-xs text-gray-600 space-y-1">
                        {template.preview.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Avantages
                      </h5>
                      <ul className="mt-1 text-xs text-gray-600 space-y-1">
                        {template.preview.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center">
                            <svg className="h-3 w-3 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 gap-4">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleConfirm}
          disabled={!selectedTemplate}
        >
          Créer l'organisation
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};