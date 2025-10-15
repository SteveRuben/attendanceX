import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Save,
  Eye,
  Code,
  Type,
  Image,
  Link,
  Palette,
  Layout,
  Smartphone,
  Monitor,
  Undo,
  Redo,
  Copy,
  Trash2,
  Settings,
  Plus,
  X
} from 'lucide-react';
import { TemplateBlockLibrary } from './TemplateBlockLibrary';
import { TemplatePreview } from './TemplatePreview';
import { TemplateSettings } from './TemplateSettings';

interface TemplateEditorProps {
  templateId?: string;
  organizationId: string;
  onSave?: (template: EmailTemplate) => void;
  onCancel?: () => void;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  type: 'system' | 'organization' | 'personal';
  htmlContent: string;
  textContent?: string;
  variables: TemplateVariable[];
  settings: TemplateSettings;
  previewImage?: string;
  tags: string[];
  isPublic: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'image' | 'url' | 'date' | 'number';
  label: string;
  defaultValue?: string;
  required: boolean;
  description?: string;
}

export interface TemplateSettings {
  colorScheme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
  };
  layout: {
    width: string;
    padding: string;
    borderRadius: string;
  };
  responsive: boolean;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  templateId,
  organizationId,
  onSave,
  onCancel
}) => {
  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    description: '',
    category: 'newsletter',
    type: 'personal',
    htmlContent: '',
    variables: [],
    settings: {
      colorScheme: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        background: '#FFFFFF',
        text: '#1F2937'
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.6'
      },
      layout: {
        width: '600px',
        padding: '20px',
        borderRadius: '8px'
      },
      responsive: true
    },
    tags: [],
    isPublic: false
  });

  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activePanel, setActivePanel] = useState<'blocks' | 'settings' | 'preview'>('blocks');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      // Initialiser avec un template de base
      initializeDefaultTemplate();
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      // Mock data - à remplacer par l'API réelle
      const mockTemplate: EmailTemplate = {
        id,
        name: 'Newsletter Moderne',
        description: 'Template moderne pour newsletters avec sections personnalisables',
        category: 'newsletter',
        type: 'organization',
        htmlContent: getDefaultTemplateContent(),
        variables: [
          {
            name: 'title',
            type: 'text',
            label: 'Titre principal',
            defaultValue: 'Newsletter',
            required: true,
            description: 'Le titre principal de la newsletter'
          },
          {
            name: 'subtitle',
            type: 'text',
            label: 'Sous-titre',
            defaultValue: '',
            required: false,
            description: 'Sous-titre optionnel'
          }
        ],
        settings: template.settings,
        tags: ['newsletter', 'moderne'],
        isPublic: false,
        createdBy: 'user123',
        createdAt: '2024-01-15T10:00:00Z'
      };
      
      setTemplate(mockTemplate);
      addToHistory(mockTemplate.htmlContent);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const initializeDefaultTemplate = () => {
    const defaultContent = getDefaultTemplateContent();
    setTemplate(prev => ({ ...prev, htmlContent: defaultContent }));
    addToHistory(defaultContent);
  };

  const getDefaultTemplateContent = () => {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background-color: #ffffff;">
        <!-- Header -->
        <header style="background-color: #3B82F6; padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            {{title}}
          </h1>
          {{#if subtitle}}
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">
            {{subtitle}}
          </p>
          {{/if}}
        </header>

        <!-- Main Content -->
        <main style="padding: 40px 20px;">
          <section style="margin-bottom: 30px;">
            <h2 style="color: #1F2937; font-size: 24px; margin-bottom: 15px;">
              Bonjour {{firstName}},
            </h2>
            <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
              Nous espérons que vous allez bien. Voici les dernières nouvelles de {{organizationName}}.
            </p>
          </section>

          <!-- Content Block -->
          <section style="background-color: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h3 style="color: #1F2937; font-size: 20px; margin-bottom: 15px;">
              Contenu principal
            </h3>
            <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
              Ajoutez ici le contenu principal de votre newsletter. Vous pouvez inclure des nouvelles, 
              des annonces, ou toute autre information importante.
            </p>
            <a href="#" style="display: inline-block; background-color: #3B82F6; color: #ffffff; 
                              padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                              font-weight: 500;">
              En savoir plus
            </a>
          </section>

          <!-- Secondary Content -->
          <section style="margin-bottom: 30px;">
            <h3 style="color: #1F2937; font-size: 18px; margin-bottom: 15px;">
              Autres actualités
            </h3>
            <ul style="color: #4B5563; line-height: 1.6; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Première actualité importante</li>
              <li style="margin-bottom: 8px;">Deuxième information à retenir</li>
              <li style="margin-bottom: 8px;">Troisième point d'intérêt</li>
            </ul>
          </section>
        </main>

        <!-- Footer -->
        <footer style="background-color: #F3F4F6; padding: 30px 20px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 15px;">
            Cordialement,<br>
            L'équipe {{organizationName}}
          </p>
          <div style="border-top: 1px solid #D1D5DB; padding-top: 20px; margin-top: 20px;">
            <p style="color: #9CA3AF; font-size: 12px; margin-bottom: 10px;">
              Vous recevez cet email car vous êtes membre de {{organizationName}}.
            </p>
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              <a href="{{unsubscribeLink}}" style="color: #6B7280; text-decoration: underline;">
                Se désabonner
              </a>
            </p>
          </div>
        </footer>
      </div>
    `;
  };

  const addToHistory = (content: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTemplate(prev => ({ ...prev, htmlContent: history[newIndex] }));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTemplate(prev => ({ ...prev, htmlContent: history[newIndex] }));
    }
  };

  const handleContentChange = (content: string) => {
    setTemplate(prev => ({ ...prev, htmlContent: content }));
    addToHistory(content);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validation
      if (!template.name.trim()) {
        alert('Le nom du template est requis');
        return;
      }

      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const savedTemplate = {
        ...template,
        id: template.id || `template-${Date.now()}`,
        updatedAt: new Date().toISOString()
      };

      onSave?.(savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addVariable = (variable: TemplateVariable) => {
    setTemplate(prev => ({
      ...prev,
      variables: [...prev.variables, variable]
    }));
  };

  const removeVariable = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const updateSettings = (newSettings: Partial<TemplateSettings>) => {
    setTemplate(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Input
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nom du template"
              className="text-lg font-semibold border-none shadow-none p-0 h-auto"
            />
            <Badge variant="outline">{template.category}</Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Historique */}
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo className="h-4 w-4" />
            </Button>

            {/* Mode d'édition */}
            <div className="flex border rounded-lg">
              <Button
                variant={editorMode === 'visual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('visual')}
                className="rounded-r-none"
              >
                <Layout className="h-4 w-4 mr-2" />
                Visuel
              </Button>
              <Button
                variant={editorMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEditorMode('code')}
                className="rounded-l-none"
              >
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
            </div>

            {/* Actions */}
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activePanel === 'blocks'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActivePanel('blocks')}
            >
              Blocs
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activePanel === 'settings'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActivePanel('settings')}
            >
              Paramètres
            </button>
            <button
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activePanel === 'preview'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setActivePanel('preview')}
            >
              Aperçu
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto">
            {activePanel === 'blocks' && (
              <TemplateBlockLibrary
                onAddBlock={(block) => {
                  const newContent = template.htmlContent + block.html;
                  handleContentChange(newContent);
                }}
              />
            )}
            
            {activePanel === 'settings' && (
              <TemplateSettings
                template={template}
                onUpdateTemplate={setTemplate}
                onUpdateSettings={updateSettings}
                onAddVariable={addVariable}
                onRemoveVariable={removeVariable}
              />
            )}
            
            {activePanel === 'preview' && (
              <TemplatePreview
                template={template}
                device={previewDevice}
                onDeviceChange={setPreviewDevice}
              />
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {editorMode === 'visual' ? 'Éditeur visuel' : 'Éditeur de code'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 p-4">
            {editorMode === 'visual' ? (
              <div className="h-full border rounded-lg bg-white">
                <div 
                  className="h-full p-4 overflow-auto"
                  contentEditable
                  dangerouslySetInnerHTML={{ __html: template.htmlContent }}
                  onBlur={(e) => handleContentChange(e.currentTarget.innerHTML)}
                />
              </div>
            ) : (
              <textarea
                value={template.htmlContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full p-4 border rounded-lg font-mono text-sm resize-none"
                placeholder="Entrez votre code HTML ici..."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};