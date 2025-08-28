// src/components/certificates/CertificateTemplateEditor.tsx - Éditeur de templates de certificats

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Eye, 
  Download, 
  Upload, 
  Palette, 
  Type, 
  Image as ImageIcon,
  FileText,
  Settings,
  Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface CertificateTemplate {
  id?: string;
  name: string;
  description?: string;
  layout: 'portrait' | 'landscape';
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  title: string;
  subtitle?: string;
  bodyText: string;
  footerText?: string;
  logoPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  signaturePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  includeQRCode: boolean;
  qrCodePosition?: {
    x: number;
    y: number;
    size: number;
  };
  isDefault: boolean;
}

interface CertificateTemplateEditorProps {
  template?: CertificateTemplate;
  onSave: (template: CertificateTemplate) => Promise<void>;
  onCancel: () => void;
  onDelete?: (templateId: string) => Promise<void>;
}

const CertificateTemplateEditor = ({
  template,
  onSave,
  onCancel,
  onDelete
}: CertificateTemplateEditorProps) => {
  const [formData, setFormData] = useState<CertificateTemplate>({
    name: '',
    description: '',
    layout: 'portrait',
    backgroundColor: '#ffffff',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    fontFamily: 'Arial',
    title: 'Certificate of Attendance',
    subtitle: '',
    bodyText: 'This is to certify that {participantName} has successfully attended {eventTitle} on {eventDate}.',
    footerText: 'Issued by {organizationName}',
    logoPosition: { x: 50, y: 50, width: 100, height: 50 },
    signaturePosition: { x: 400, y: 500, width: 150, height: 75 },
    includeQRCode: true,
    qrCodePosition: { x: 50, y: 500, size: 80 },
    isDefault: false,
    ...template
  });

  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const fontOptions = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
    'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS'
  ];

  const handleInputChange = (field: keyof CertificateTemplate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePositionChange = (
    section: 'logoPosition' | 'signaturePosition' | 'qrCodePosition',
    field: string,
    value: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom du template est requis');
      return;
    }

    if (!formData.bodyText.trim()) {
      toast.error('Le texte du corps est requis');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      toast.success('Template sauvegardé avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!template?.id || !onDelete) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
      return;
    }

    try {
      setLoading(true);
      await onDelete(template.id);
      toast.success('Template supprimé avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Définir les dimensions selon l'orientation
    const width = formData.layout === 'portrait' ? 595 : 842; // A4 en points
    const height = formData.layout === 'portrait' ? 842 : 595;
    
    canvas.width = width;
    canvas.height = height;

    // Fond
    ctx.fillStyle = formData.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Titre
    ctx.fillStyle = formData.primaryColor;
    ctx.font = `bold 36px ${formData.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(formData.title, width / 2, 150);

    // Sous-titre
    if (formData.subtitle) {
      ctx.fillStyle = formData.secondaryColor;
      ctx.font = `24px ${formData.fontFamily}`;
      ctx.fillText(formData.subtitle, width / 2, 200);
    }

    // Corps du texte
    ctx.fillStyle = formData.primaryColor;
    ctx.font = `18px ${formData.fontFamily}`;
    ctx.textAlign = 'center';
    
    // Simuler les données pour l'aperçu
    const previewText = formData.bodyText
      .replace('{participantName}', 'John Doe')
      .replace('{eventTitle}', 'Sample Event')
      .replace('{eventDate}', new Date().toLocaleDateString('fr-FR'))
      .replace('{organizationName}', 'Your Organization');

    // Diviser le texte en lignes
    const words = previewText.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = width - 100;

    for (const word of words) {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Afficher les lignes
    const startY = height / 2 - (lines.length * 25) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line.trim(), width / 2, startY + index * 30);
    });

    // Pied de page
    if (formData.footerText) {
      ctx.fillStyle = formData.secondaryColor;
      ctx.font = `14px ${formData.fontFamily}`;
      const footerText = formData.footerText.replace('{organizationName}', 'Your Organization');
      ctx.fillText(footerText, width / 2, height - 50);
    }

    // Placeholder pour le logo
    if (formData.logoPosition) {
      ctx.strokeStyle = formData.secondaryColor;
      ctx.strokeRect(
        formData.logoPosition.x,
        formData.logoPosition.y,
        formData.logoPosition.width,
        formData.logoPosition.height
      );
      ctx.fillStyle = formData.secondaryColor;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'LOGO',
        formData.logoPosition.x + formData.logoPosition.width / 2,
        formData.logoPosition.y + formData.logoPosition.height / 2
      );
    }

    // Placeholder pour la signature
    if (formData.signaturePosition) {
      ctx.strokeStyle = formData.secondaryColor;
      ctx.strokeRect(
        formData.signaturePosition.x,
        formData.signaturePosition.y,
        formData.signaturePosition.width,
        formData.signaturePosition.height
      );
      ctx.fillStyle = formData.secondaryColor;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'SIGNATURE',
        formData.signaturePosition.x + formData.signaturePosition.width / 2,
        formData.signaturePosition.y + formData.signaturePosition.height / 2
      );
    }

    // QR Code placeholder
    if (formData.includeQRCode && formData.qrCodePosition) {
      ctx.strokeStyle = formData.secondaryColor;
      ctx.strokeRect(
        formData.qrCodePosition.x,
        formData.qrCodePosition.y,
        formData.qrCodePosition.size,
        formData.qrCodePosition.size
      );
      ctx.fillStyle = formData.secondaryColor;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        'QR CODE',
        formData.qrCodePosition.x + formData.qrCodePosition.size / 2,
        formData.qrCodePosition.y + formData.qrCodePosition.size / 2
      );
    }
  };

  useEffect(() => {
    if (previewMode) {
      generatePreview();
    }
  }, [formData, previewMode]);

  const downloadPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${formData.name || 'certificate-template'}-preview.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {template ? 'Modifier le template' : 'Nouveau template'}
        </h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Masquer' : 'Aperçu'}
          </Button>
          {previewMode && (
            <Button variant="outline" onClick={downloadPreview}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger aperçu
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire d'édition */}
        <div className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="layout">Mise en page</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du template *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Template événement corporate"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Description du template..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="layout">Orientation</Label>
                    <Select
                      value={formData.layout}
                      onValueChange={(value) => handleInputChange('layout', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Paysage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                    />
                    <Label htmlFor="isDefault">Template par défaut</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="w-5 h-5 mr-2" />
                    Couleurs et police
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backgroundColor">Couleur de fond</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          id="backgroundColor"
                          value={formData.backgroundColor}
                          onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.backgroundColor}
                          onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="primaryColor">Couleur principale</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          id="primaryColor"
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          id="secondaryColor"
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          placeholder="#666666"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="fontFamily">Police</Label>
                      <Select
                        value={formData.fontFamily}
                        onValueChange={(value) => handleInputChange('fontFamily', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map(font => (
                            <SelectItem key={font} value={font}>{font}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Contenu du certificat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Certificate of Attendance"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subtitle">Sous-titre</Label>
                    <Input
                      id="subtitle"
                      value={formData.subtitle || ''}
                      onChange={(e) => handleInputChange('subtitle', e.target.value)}
                      placeholder="Sous-titre optionnel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bodyText">Texte principal *</Label>
                    <Textarea
                      id="bodyText"
                      value={formData.bodyText}
                      onChange={(e) => handleInputChange('bodyText', e.target.value)}
                      placeholder="Utilisez {participantName}, {eventTitle}, {eventDate}, {organizationName}"
                      rows={4}
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Variables disponibles: {'{participantName}'}, {'{eventTitle}'}, {'{eventDate}'}, {'{organizationName}'}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="footerText">Pied de page</Label>
                    <Input
                      id="footerText"
                      value={formData.footerText || ''}
                      onChange={(e) => handleInputChange('footerText', e.target.value)}
                      placeholder="Issued by {organizationName}"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="w-5 h-5 mr-2" />
                    Positionnement des éléments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Position du logo */}
                  <div>
                    <Label className="text-base font-medium">Position du logo</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label htmlFor="logoX">X</Label>
                        <Input
                          id="logoX"
                          type="number"
                          value={formData.logoPosition?.x || 0}
                          onChange={(e) => handlePositionChange('logoPosition', 'x', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="logoY">Y</Label>
                        <Input
                          id="logoY"
                          type="number"
                          value={formData.logoPosition?.y || 0}
                          onChange={(e) => handlePositionChange('logoPosition', 'y', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="logoWidth">Largeur</Label>
                        <Input
                          id="logoWidth"
                          type="number"
                          value={formData.logoPosition?.width || 0}
                          onChange={(e) => handlePositionChange('logoPosition', 'width', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="logoHeight">Hauteur</Label>
                        <Input
                          id="logoHeight"
                          type="number"
                          value={formData.logoPosition?.height || 0}
                          onChange={(e) => handlePositionChange('logoPosition', 'height', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id="includeQRCode"
                        checked={formData.includeQRCode}
                        onChange={(e) => handleInputChange('includeQRCode', e.target.checked)}
                      />
                      <Label htmlFor="includeQRCode" className="text-base font-medium">
                        Inclure un QR code de validation
                      </Label>
                    </div>
                    
                    {formData.includeQRCode && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="qrX">X</Label>
                          <Input
                            id="qrX"
                            type="number"
                            value={formData.qrCodePosition?.x || 0}
                            onChange={(e) => handlePositionChange('qrCodePosition', 'x', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="qrY">Y</Label>
                          <Input
                            id="qrY"
                            type="number"
                            value={formData.qrCodePosition?.y || 0}
                            onChange={(e) => handlePositionChange('qrCodePosition', 'y', parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="qrSize">Taille</Label>
                          <Input
                            id="qrSize"
                            type="number"
                            value={formData.qrCodePosition?.size || 0}
                            onChange={(e) => handlePositionChange('qrCodePosition', 'size', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Aperçu */}
        <div className="space-y-4">
          {previewMode && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu du certificat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto border bg-white"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Les variables comme {'{participantName}'} seront automatiquement remplacées lors de la génération du certificat.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <div>
          {template && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplateEditor;