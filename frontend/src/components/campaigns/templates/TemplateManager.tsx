import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Star,
  Globe,
  Lock,
  MoreHorizontal,
  FileText,
  Calendar
} from 'lucide-react';
import { EmailTemplate } from './TemplateEditor';

interface TemplateManagerProps {
  organizationId: string;
  onCreateTemplate?: () => void;
  onEditTemplate?: (templateId: string) => void;
  onPreviewTemplate?: (template: EmailTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  organizationId,
  onCreateTemplate,
  onEditTemplate,
  onPreviewTemplate
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
          htmlContent: '<div>Template content...</div>',
          variables: [
            { name: 'title', type: 'text', label: 'Titre', defaultValue: 'Newsletter', required: true },
            { name: 'subtitle', type: 'text', label: 'Sous-titre', defaultValue: '', required: false }
          ],
          settings: {
            colorScheme: { primary: '#3B82F6', secondary: '#6B7280', background: '#FFFFFF', text: '#1F2937' },
            typography: { fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '1.6' },
            layout: { width: '600px', padding: '20px', borderRadius: '8px' },
            responsive: true
          },
          tags: ['newsletter', 'moderne', 'responsive'],
          isPublic: true,
          createdBy: 'System',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z'
        },
        {
          id: 'template-2',
          name: 'Annonce Entreprise',
          description: 'Template professionnel pour les annonces d\'entreprise',
          category: 'announcement',
          type: 'organization',
          htmlContent: '<div>Template content...</div>',
          variables: [
            { name: 'title', type: 'text', label: 'Titre de l\'annonce', defaultValue: '', required: true },
            { name: 'content', type: 'text', label: 'Contenu', defaultValue: '', required: true }
          ],
          settings: {
            colorScheme: { primary: '#059669', secondary: '#6B7280', background: '#FFFFFF', text: '#1F2937' },
            typography: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '16px', lineHeight: '1.6' },
            layout: { width: '600px', padding: '20px', borderRadius: '8px' },
            responsive: true
          },
          tags: ['annonce', 'professionnel', 'entreprise'],
          isPublic: false,
          createdBy: 'Marie Dubois',
          createdAt: '2024-01-10T09:15:00Z',
          updatedAt: '2024-01-18T16:45:00Z'
        },
        {
          id: 'template-3',
          name: 'Invitation Événement',
          description: 'Template élégant pour les invitations d\'événements',
          category: 'event',
          type: 'personal',
          htmlContent: '<div>Template content...</div>',
          variables: [
            { name: 'eventName', type: 'text', label: 'Nom de l\'événement', defaultValue: '', required: true },
            { name: 'eventDate', type: 'date', label: 'Date', defaultValue: '', required: true },
            { name: 'eventLocation', type: 'text', label: 'Lieu', defaultValue: '', required: false }
          ],
          settings: {
            colorScheme: { primary: '#7C3AED', secondary: '#6B7280', background: '#FFFFFF', text: '#1F2937' },
            typography: { fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: '1.6' },
            layout: { width: '600px', padding: '20px', borderRadius: '8px' },
            responsive: true
          },
          tags: ['événement', 'invitation', 'élégant'],
          isPublic: false,
          createdBy: 'Jean Martin',
          createdAt: '2024-01-05T11:30:00Z',
          updatedAt: '2024-01-15T13:20:00Z'
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
    const matchesType = selectedType === 'all' || template.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof EmailTemplate] as string;
    const bValue = b[sortBy as keyof EmailTemplate] as string;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const categories = [
    { id: 'all', label: 'Toutes les catégories' },
    { id: 'newsletter', label: 'Newsletter' },
    { id: 'announcement', label: 'Annonces' },
    { id: 'event', label: 'Événements' },
    { id: 'hr', label: 'RH' },
    { id: 'welcome', label: 'Bienvenue' },
    { id: 'marketing', label: 'Marketing' }
  ];

  const types = [
    { id: 'all', label: 'Tous les types' },
    { id: 'system', label: 'Système' },
    { id: 'organization', label: 'Organisation' },
    { id: 'personal', label: 'Personnel' }
  ];

  const handleTemplateAction = (templateId: string, action: string) => {
    switch (action) {
      case 'edit':
        onEditTemplate?.(templateId);
        break;
      case 'preview':
        const template = templates.find(t => t.id === templateId);
        if (template) onPreviewTemplate?.(template);
        break;
      case 'duplicate':
        duplicateTemplate(templateId);
        break;
      case 'delete':
        deleteTemplate(templateId);
        break;
      default:
        break;
    }
  };

  const duplicateTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const duplicatedTemplate: EmailTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copie)`,
      type: 'personal',
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'Current User'
    };

    setTemplates(prev => [duplicatedTemplate, ...prev]);
  };

  const deleteTemplate = async (templateId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const getTypeLabel = (type: EmailTemplate['type']) => {
    const labels = { system: 'Système', organization: 'Organisation', personal: 'Personnel' };
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Templates Email</h1>
          <p className="text-gray-600">
            Gérez vos modèles d'email pour créer des campagnes cohérentes
          </p>
        </div>
        <Button onClick={onCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Template
        </Button>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Date de modification</SelectItem>
                  <SelectItem value="createdAt">Date de création</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">
              {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''} trouvé{filteredTemplates.length > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun template trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier template ou modifiez vos critères de recherche
            </p>
            <Button onClick={onCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredTemplates.map(template => (
            <Card
              key={template.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className={viewMode === 'grid' ? 'p-6' : 'p-4'}>
                {viewMode === 'grid' ? (
                  <div>
                    {/* Preview placeholder */}
                    <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          {template.isPublic ? (
                            <Globe className="h-3 w-3 text-green-500" />
                          ) : (
                            <Lock className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getTypeColor(template.type)}`}>
                          {getTypeLabel(template.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDate(template.updatedAt || template.createdAt || '')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateAction(template.id!, 'preview')}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateAction(template.id!, 'edit')}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateAction(template.id!, 'duplicate')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTemplateAction(template.id!, 'delete')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
                        <h3 className="font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <Badge className={`text-xs ${getTypeColor(template.type)}`}>
                          {getTypeLabel(template.type)}
                        </Badge>
                        {template.isPublic ? (
                          <Globe className="h-3 w-3 text-green-500" />
                        ) : (
                          <Lock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Par {template.createdBy}</span>
                        <span>Modifié le {formatDate(template.updatedAt || template.createdAt || '')}</span>
                        <span>{template.variables.length} variables</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTemplateAction(template.id!, 'preview')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTemplateAction(template.id!, 'edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                      >
                        <MoreHorizontal className="h-4 w-4" />
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
  );
};