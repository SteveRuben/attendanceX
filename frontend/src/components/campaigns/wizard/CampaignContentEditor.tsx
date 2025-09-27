import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/Input';
import {
  FileText,
  Eye,
  Code,
  Type,
  Image,
  Link,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Palette
} from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';

interface CampaignContentEditorProps {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

export const CampaignContentEditor: React.FC<CampaignContentEditorProps> = ({
  data,
  onChange
}) => {
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleContentChange = (field: 'htmlContent' | 'textContent', value: string) => {
    onChange({
      content: {
        ...data.content,
        [field]: value
      }
    });
  };

  const insertVariable = (variable: string) => {
    const currentContent = data.content.htmlContent || '';
    const newContent = currentContent + `{{${variable}}}`;
    handleContentChange('htmlContent', newContent);
  };

  const availableVariables = [
    { key: 'firstName', label: 'Prénom', example: 'Marie' },
    { key: 'lastName', label: 'Nom', example: 'Dubois' },
    { key: 'email', label: 'Email', example: 'marie.dubois@example.com' },
    { key: 'organizationName', label: 'Nom de l\'organisation', example: 'Mon Entreprise' },
    { key: 'unsubscribeLink', label: 'Lien de désabonnement', example: 'Se désabonner' },
    { key: 'currentDate', label: 'Date actuelle', example: '15 janvier 2024' }
  ];

  // Contenu par défaut si utilisation d'un template
  const getDefaultContent = () => {
    if (data.useTemplate && data.templateId) {
      return `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <header style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333; margin: 0;">{{organizationName}}</h1>
          </header>
          
          <main style="padding: 30px 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Bonjour {{firstName}},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Nous espérons que vous allez bien. Voici les dernières nouvelles de notre organisation.
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Contenu principal</h3>
              <p style="color: #666; line-height: 1.6;">
                Ajoutez ici le contenu principal de votre campagne...
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Cordialement,<br>
              L'équipe {{organizationName}}
            </p>
          </main>
          
          <footer style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            <p>
              Vous recevez cet email car vous êtes membre de {{organizationName}}.
              <br>
              <a href="{{unsubscribeLink}}" style="color: #666;">Se désabonner</a>
            </p>
          </footer>
        </div>
      `;
    }
    return '';
  };

  // Initialiser le contenu si vide
  React.useEffect(() => {
    if (!data.content.htmlContent && (data.useTemplate || !data.useTemplate)) {
      const defaultContent = data.useTemplate ? getDefaultContent() : '';
      handleContentChange('htmlContent', defaultContent);
    }
  }, [data.useTemplate, data.templateId]);

  return (
    <div className="space-y-6">
      {/* Mode d'édition */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={editorMode === 'visual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditorMode('visual')}
          >
            <Type className="h-4 w-4 mr-2" />
            Visuel
          </Button>
          <Button
            variant={editorMode === 'html' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditorMode('html')}
          >
            <Code className="h-4 w-4 mr-2" />
            HTML
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
          >
            Desktop
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
          >
            Mobile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar avec outils */}
        <div className="lg:col-span-1 space-y-4">
          {/* Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableVariables.map(variable => (
                <Button
                  key={variable.key}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => insertVariable(variable.key)}
                >
                  {variable.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Outils de formatage (mode visuel) */}
          {editorMode === 'visual' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Formatage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  <Button variant="outline" size="sm">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Underline className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Link className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blocs de contenu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Blocs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Texte
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Image className="h-4 w-4 mr-2" />
                Image
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Link className="h-4 w-4 mr-2" />
                Bouton
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Palette className="h-4 w-4 mr-2" />
                Séparateur
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Éditeur principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contenu HTML
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editorMode === 'visual' ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 min-h-[400px] bg-white">
                    <div 
                      contentEditable
                      className="outline-none"
                      dangerouslySetInnerHTML={{ __html: data.content.htmlContent || '' }}
                      onBlur={(e) => handleContentChange('htmlContent', e.currentTarget.innerHTML)}
                    />
                  </div>
                </div>
              ) : (
                <textarea
                  value={data.content.htmlContent || ''}
                  onChange={(e) => handleContentChange('htmlContent', e.target.value)}
                  className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
                  placeholder="Entrez votre code HTML ici..."
                />
              )}
            </CardContent>
          </Card>

          {/* Version texte */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Version texte (optionnel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={data.content.textContent || ''}
                onChange={(e) => handleContentChange('textContent', e.target.value)}
                className="w-full h-32 p-4 border rounded-lg"
                placeholder="Version texte de votre email (pour les clients qui ne supportent pas le HTML)..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Cette version sera affichée aux destinataires dont le client email ne supporte pas le HTML
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Aperçu */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Aperçu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`border rounded-lg overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-xs mx-auto' : ''
              }`}>
                <div className="bg-gray-100 p-2 text-xs text-gray-600 text-center">
                  {data.subject || 'Sujet de l\'email'}
                </div>
                <div 
                  className="bg-white p-4 text-sm"
                  style={{ 
                    fontSize: previewMode === 'mobile' ? '12px' : '14px',
                    maxHeight: '400px',
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: data.content.htmlContent?.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                      const variable = availableVariables.find(v => v.key === key);
                      return variable ? variable.example : match;
                    }) || '<p>Aucun contenu</p>'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Résumé */}
      {data.content.htmlContent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              Contenu configuré ({Math.round((data.content.htmlContent.length / 1000))} Ko)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};