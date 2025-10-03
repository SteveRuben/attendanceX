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
      const t = (strings: TemplateStringsArray) => strings.join('');
      switch (data.templateId) {
        case 'template-1':
          // Newsletter Moderne
          return t`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#ffffff;border:1px solid #eee;border-radius:8px;overflow:hidden">
            <header style="background:#1f2937;color:#fff;padding:24px;text-align:center">
              <h1 style="margin:0;font-size:22px">{{organizationName}}</h1>
              <p style="margin:8px 0 0;font-size:13px;opacity:.9">Newsletter</p>
            </header>
            <main style="padding:24px">
              <h2 style="margin:0 0 12px;color:#111">Bonjour {{firstName}},</h2>
              <p style="margin:0 0 16px;color:#444;line-height:1.6">Bienvenue dans notre édition. Voici les dernières nouvelles.</p>
              <div style="display:grid;grid-template-columns:1fr;gap:12px">
                <div style="background:#f3f4f6;padding:16px;border-radius:8px">
                  <h3 style="margin:0 0 8px;color:#111">Point fort #1</h3>
                  <p style="margin:0;color:#555">Texte d'exemple du premier encart.</p>
                </div>
                <div style="background:#f3f4f6;padding:16px;border-radius:8px">
                  <h3 style="margin:0 0 8px;color:#111">Point fort #2</h3>
                  <p style="margin:0;color:#555">Texte d'exemple du second encart.</p>
                </div>
              </div>
              <p style="margin:16px 0 0;color:#444">Cordialement,<br>L'équipe {{organizationName}}</p>
            </main>
            <footer style="background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#6b7280">
              <a href="{{unsubscribeLink}}" style="color:#6b7280">Se désabonner</a>
            </footer>
          </div>`;
        case 'template-2':
          // Annonce Entreprise
          return t`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif">
            <div style="background:#eef2ff;padding:24px;border-radius:8px 8px 0 0;text-align:center">
              <h1 style="margin:0;color:#111">Annonce importante</h1>
              <p style="margin:8px 0 0;color:#374151">{{organizationName}}</p>
            </div>
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px">
              <p style="color:#374151;line-height:1.6">Nous sommes ravis d'annoncer une mise à jour importante...</p>
              <a href="#" style="display:inline-block;margin-top:12px;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">En savoir plus</a>
            </div>
          </div>`;
        case 'template-3':
          // Rappel Événement
          return t`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;border-radius:8px">
            <div style="padding:24px;text-align:center">
              <h1 style="margin:0;color:#111">Rappel : Événement à venir</h1>
              <p style="margin:8px 0 0;color:#6b7280">{{currentDate}}</p>
            </div>
            <div style="padding:0 24px 24px">
              <p style="color:#374151">Bonjour {{firstName}}, n'oubliez pas notre événement. Cliquez ci-dessous pour ajouter au calendrier.</p>
              <a href="#" style="display:inline-block;margin-top:12px;background:#10b981;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Ajouter au calendrier</a>
            </div>
          </div>`;
        case 'template-4':
          // Communication RH
          return t`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px">
            <div style="padding:24px;background:#f3f4f6;border-radius:8px 8px 0 0">
              <h2 style="margin:0;color:#111">Communication RH</h2>
            </div>
            <div style="padding:24px">
              <p style="color:#374151;line-height:1.6">Chers collaborateurs,</p>
              <ul style="color:#374151;line-height:1.6;margin:0 0 0 18px">
                <li>Politique de télétravail mise à jour</li>
                <li>Programme bien-être Q2</li>
                <li>Prochaine session d'onboarding</li>
              </ul>
            </div>
          </div>`;
        case 'template-5':
          // Bienvenue Nouveaux Employés
          return t`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fff;border:1px solid #eee;border-radius:8px">
            <div style="padding:24px;text-align:center;background:#fdf2f8;border-radius:8px 8px 0 0">
              <h1 style="margin:0;color:#111">Bienvenue !</h1>
            </div>
            <div style="padding:24px">
              <p style="color:#374151">Bonjour {{firstName}}, nous sommes heureux de vous compter parmi nous.</p>
              <p style="color:#374151">Vous trouverez ci-joint les premières étapes pour démarrer.</p>
            </div>
          </div>`;
        default:
          break;
      }
      // Fallback generic template
      return `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <header style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">{{organizationName}}</h1>
        </header>
        <main style="padding: 30px 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Bonjour {{firstName}},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">Contenu générique...</p>
        </main>
      </div>`;
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