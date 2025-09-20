import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Settings,
  Palette,
  Type,
  Layout,
  Plus,
  X,
  Eye,
  EyeOff,
  Tag,
  Globe,
  Lock,
  Trash2
} from 'lucide-react';
import { EmailTemplate, TemplateVariable, TemplateSettings as ITemplateSettings } from './TemplateEditor';

interface TemplateSettingsProps {
  template: EmailTemplate;
  onUpdateTemplate: (template: EmailTemplate) => void;
  onUpdateSettings: (settings: Partial<ITemplateSettings>) => void;
  onAddVariable: (variable: TemplateVariable) => void;
  onRemoveVariable: (index: number) => void;
}

export const TemplateSettings: React.FC<TemplateSettingsProps> = ({
  template,
  onUpdateTemplate,
  onUpdateSettings,
  onAddVariable,
  onRemoveVariable
}) => {
  const [newTag, setNewTag] = useState('');
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [newVariable, setNewVariable] = useState<Partial<TemplateVariable>>({
    name: '',
    type: 'text',
    label: '',
    defaultValue: '',
    required: false,
    description: ''
  });

  const handleBasicInfoChange = (field: keyof EmailTemplate, value: any) => {
    onUpdateTemplate({ ...template, [field]: value });
  };

  const handleColorChange = (colorType: keyof ITemplateSettings['colorScheme'], color: string) => {
    onUpdateSettings({
      colorScheme: {
        ...template.settings.colorScheme,
        [colorType]: color
      }
    });
  };

  const handleTypographyChange = (field: keyof ITemplateSettings['typography'], value: string) => {
    onUpdateSettings({
      typography: {
        ...template.settings.typography,
        [field]: value
      }
    });
  };

  const handleLayoutChange = (field: keyof ITemplateSettings['layout'], value: string) => {
    onUpdateSettings({
      layout: {
        ...template.settings.layout,
        [field]: value
      }
    });
  };

  const addTag = () => {
    if (newTag.trim() && !template.tags.includes(newTag.trim())) {
      handleBasicInfoChange('tags', [...template.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleBasicInfoChange('tags', template.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddVariable = () => {
    if (newVariable.name && newVariable.label) {
      onAddVariable(newVariable as TemplateVariable);
      setNewVariable({
        name: '',
        type: 'text',
        label: '',
        defaultValue: '',
        required: false,
        description: ''
      });
      setShowVariableForm(false);
    }
  };

  const categories = [
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'announcement', label: 'Annonce' },
    { value: 'event', label: 'Événement' },
    { value: 'hr', label: 'RH' },
    { value: 'welcome', label: 'Bienvenue' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'transactional', label: 'Transactionnel' }
  ];

  const fontFamilies = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Informations générales */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Informations générales
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={template.description}
              onChange={(e) => handleBasicInfoChange('description', e.target.value)}
              placeholder="Description du template..."
              className="w-full p-2 text-sm border rounded-lg resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <Select 
              value={template.category} 
              onValueChange={(value) => handleBasicInfoChange('category', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type
            </label>
            <Select 
              value={template.type} 
              onValueChange={(value) => handleBasicInfoChange('type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personnel</SelectItem>
                <SelectItem value="organization">Organisation</SelectItem>
                <SelectItem value="system">Système</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={template.isPublic}
              onChange={(e) => handleBasicInfoChange('isPublic', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPublic" className="text-xs text-gray-700 flex items-center gap-1">
              {template.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              Template public
            </label>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tags
        </h3>

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            placeholder="Ajouter un tag..."
            className="flex-1 text-sm"
          />
          <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Variables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Type className="h-4 w-4" />
            Variables ({template.variables.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVariableForm(!showVariableForm)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Formulaire d'ajout de variable */}
        {showVariableForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Nom (ex: title)"
                value={newVariable.name}
                onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                className="text-sm"
              />
              <Select 
                value={newVariable.type} 
                onValueChange={(value) => setNewVariable(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Nombre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Label (ex: Titre principal)"
              value={newVariable.label}
              onChange={(e) => setNewVariable(prev => ({ ...prev, label: e.target.value }))}
              className="text-sm"
            />

            <Input
              placeholder="Valeur par défaut (optionnel)"
              value={newVariable.defaultValue}
              onChange={(e) => setNewVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
              className="text-sm"
            />

            <textarea
              placeholder="Description (optionnel)"
              value={newVariable.description}
              onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 text-sm border rounded resize-none"
              rows={2}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={newVariable.required}
                onChange={(e) => setNewVariable(prev => ({ ...prev, required: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="required" className="text-xs text-gray-700">
                Variable obligatoire
              </label>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddVariable}>
                Ajouter
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowVariableForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Liste des variables */}
        {template.variables.length > 0 && (
          <div className="space-y-2">
            {template.variables.map((variable, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded bg-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-1 rounded">
                      {`{{${variable.name}}}`}
                    </code>
                    <span className="text-sm font-medium">{variable.label}</span>
                    {variable.required && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  {variable.description && (
                    <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveVariable(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Couleurs */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Couleurs
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Couleur principale
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={template.settings.colorScheme.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
              />
              <Input
                value={template.settings.colorScheme.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Couleur secondaire
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={template.settings.colorScheme.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
              />
              <Input
                value={template.settings.colorScheme.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Arrière-plan
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={template.settings.colorScheme.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
              />
              <Input
                value={template.settings.colorScheme.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Couleur du texte
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={template.settings.colorScheme.text}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="w-8 h-8 border rounded cursor-pointer"
              />
              <Input
                value={template.settings.colorScheme.text}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typographie */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Type className="h-4 w-4" />
          Typographie
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Police
            </label>
            <Select 
              value={template.settings.typography.fontFamily} 
              onValueChange={(value) => handleTypographyChange('fontFamily', value)}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontFamilies.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Taille
              </label>
              <Input
                value={template.settings.typography.fontSize}
                onChange={(e) => handleTypographyChange('fontSize', e.target.value)}
                placeholder="16px"
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Hauteur de ligne
              </label>
              <Input
                value={template.settings.typography.lineHeight}
                onChange={(e) => handleTypographyChange('lineHeight', e.target.value)}
                placeholder="1.6"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mise en page */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Layout className="h-4 w-4" />
          Mise en page
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Largeur maximale
            </label>
            <Input
              value={template.settings.layout.width}
              onChange={(e) => handleLayoutChange('width', e.target.value)}
              placeholder="600px"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Padding
              </label>
              <Input
                value={template.settings.layout.padding}
                onChange={(e) => handleLayoutChange('padding', e.target.value)}
                placeholder="20px"
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Border radius
              </label>
              <Input
                value={template.settings.layout.borderRadius}
                onChange={(e) => handleLayoutChange('borderRadius', e.target.value)}
                placeholder="8px"
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="responsive"
              checked={template.settings.responsive}
              onChange={(e) => onUpdateSettings({ responsive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="responsive" className="text-xs text-gray-700">
              Design responsive
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};