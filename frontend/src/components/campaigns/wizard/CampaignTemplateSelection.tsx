import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  Eye,
  Copy,
  Star,
  Filter,
  Grid,
  List,
  Plus
} from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';

interface CampaignTemplateSelectionProps {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
  organizationId: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'system' | 'organization' | 'personal';
  previewImage?: string;
  isPopular?: boolean;
  usageCount?: number;
  createdBy?: string;
  createdAt: string;
  tags: string[];
}

export const CampaignTemplateSelection: React.FC<CampaignTemplateSelectionProps> = ({
  data,
  onChange,
  organizationId
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadTemplates();
  }, [organizationId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Mock data - à remplacer par l'API réelle
      const mockTemplates: EmailTemplate[] = [
        {
          id: 'template-1',
          name: 'Newsletter Moderne',
          description: 'Template moderne pour newsletters avec sections personnalisables',
          category: 'newsletter',
          type: 'system',
          isPopular: true,
          usageCount: 245,
          createdAt: '2024-01-15',
          tags: ['newsletter', 'moderne', 'responsive']
        },
        {
          id: 'template-2',
          name: 'Annonce Entreprise',
          description: 'Template professionnel pour les annonces d\'entreprise',
          category: 'announcement',
          type: 'system',
          usageCount: 156,
          createdAt: '2024-01-10',
          tags: ['annonce', 'professionnel', 'entreprise']
        },
        {
          id: 'template-3',
          name: 'Rappel Événement',
          description: 'Template spécialement conçu pour les rappels d\'événements',
          category: 'event',
          type: 'system',
          usageCount: 89,
          createdAt: '2024-01-08',
          tags: ['événement', 'rappel', 'invitation']
        },
        {
          id: 'template-4',
          name: 'Communication RH',
          description: 'Template pour les communications des ressources humaines',
          category: 'hr',
          type: 'organization',
          usageCount: 67,
          createdAt: '2024-01-05',
          createdBy: 'Marie Dubois',
          tags: ['rh', 'communication', 'interne']
        },
        {
          id: 'template-5',
          name: 'Bienvenue Nouveaux Employés',
          description: 'Template d\'accueil pour les nouveaux membres de l\'équipe',
          category: 'welcome',
          type: 'personal',
          usageCount: 34,
          createdAt: '2024-01-03',
          createdBy: 'Jean Martin',
          tags: ['bienvenue', 'onboarding', 'équipe']
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'Tous les templates', count: templates.length },
    { id: 'newsletter', label: 'Newsletter', count: templates.filter(t => t.category === 'newsletter').length },
    { id: 'announcement', label: 'Annonces', count: templates.filter(t => t.category === 'announcement').length },
    { id: 'event', label: 'Événements', count: templates.filter(t => t.category === 'event').length },
    { id: 'hr', label: 'RH', count: templates.filter(t => t.category === 'hr').length },
    { id: 'welcome', label: 'Bienvenue', count: templates.filter(t => t.category === 'welcome').length }
  ];

  const handleTemplateSelect = (templateId: string) => {
    onChange({
      templateId,
      useTemplate: true
    });
  };

  const handleCreateFromScratch = () => {
    onChange({
      templateId: undefined,
      useTemplate: false
    });
  };

  const getTypeLabel = (type: EmailTemplate['type']) => {
    const labels = {
      system: 'Système',
      organization: 'Organisation',
      personal: 'Personnel'
    };
    return labels[type];
  };

  const getTypeColor = (type: EmailTemplate['type']) => {
    const colors = {
      system: 'bg-blue-100 text-blue-800',
      organization: 'bg-green-100 text-green-800',
      personal: 'bg-purple-100 text-purple-800'
    };
    return colors[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Options principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            data.useTemplate ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => onChange({ useTemplate: true })}
        >
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Utiliser un template
            </h3>
            <p className="text-gray-600 text-sm">
              Choisissez parmi nos templates prêts à l'emploi pour gagner du temps
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            !data.useTemplate ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={handleCreateFromScratch}
        >
          <CardContent className="p-6 text-center">
            <Plus className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Créer depuis zéro
            </h3>
            <p className="text-gray-600 text-sm">
              Commencez avec une page vierge et créez votre propre design
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sélection de template */}
      {data.useTemplate && (
        <div className="space-y-4">
          {/* Filtres et recherche */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Catégories */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label} ({category.count})
              </Button>
            ))}
          </div>

          {/* Liste des templates */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun template trouvé
              </h3>
              <p className="text-gray-600">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }>
              {filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    data.templateId === template.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-4'}>
                    {viewMode === 'grid' ? (
                      <div>
                        {/* Preview placeholder */}
                        <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {template.name}
                            </h4>
                            {template.isPopular && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {template.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <Badge className={`text-xs ${getTypeColor(template.type)}`}>
                              {getTypeLabel(template.type)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {template.usageCount} utilisations
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {template.name}
                            </h4>
                            {template.isPopular && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {template.description}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            <Badge className={`text-xs ${getTypeColor(template.type)}`}>
                              {getTypeLabel(template.type)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {template.usageCount} utilisations
                            </span>
                            {template.createdBy && (
                              <span className="text-xs text-gray-500">
                                par {template.createdBy}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template sélectionné */}
      {data.useTemplate && data.templateId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              Template sélectionné: {templates.find(t => t.id === data.templateId)?.name}
            </span>
          </div>
        </div>
      )}

      {/* Création depuis zéro */}
      {!data.useTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              Vous allez créer votre contenu depuis zéro dans l'étape suivante
            </span>
          </div>
        </div>
      )}
    </div>
  );
};