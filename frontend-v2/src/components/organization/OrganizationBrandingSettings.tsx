import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Palette, Image, Type, Eye } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest, OrganizationBranding } from '@/types/organization.types';

interface OrganizationBrandingSettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationBrandingSettings({ organization, onUpdate }: OrganizationBrandingSettingsProps) {
  const [formData, setFormData] = useState<OrganizationBranding>({
    colors: {
      primary: organization.branding?.colors?.primary || '#3b82f6',
      secondary: organization.branding?.colors?.secondary || '#64748b',
      accent: organization.branding?.colors?.accent || '#10b981',
      background: organization.branding?.colors?.background || '#ffffff',
      text: organization.branding?.colors?.text || '#1f2937'
    },
    fonts: {
      primary: organization.branding?.fonts?.primary || 'Inter',
      secondary: organization.branding?.fonts?.secondary || 'Inter'
    },
    logo: organization.branding?.logo,
    favicon: organization.branding?.favicon,
    backgroundImage: organization.branding?.backgroundImage,
    customCss: organization.branding?.customCss || ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleColorChange = (colorKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
    setError(null);
  };

  const handleFontChange = (fontKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [fontKey]: value
      }
    }));
    setError(null);
  };

  const handleImageUpload = (field: string, url: string, width?: number, height?: number) => {
    if (field === 'logo') {
      setFormData(prev => ({
        ...prev,
        logo: { url, width: width || 0, height: height || 0 }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: url
      }));
    }
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validation des couleurs
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      for (const [key, color] of Object.entries(formData.colors)) {
        if (!colorRegex.test(color)) {
          setError(`Format de couleur invalide pour ${key}: ${color}`);
          return;
        }
      }

      const updates: UpdateOrganizationRequest = {
        branding: formData
      };

      await onUpdate(updates);
      
      toast({
        title: 'Branding sauvegardé',
        description: 'Les paramètres de branding ont été mis à jour avec succès.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde du branding',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Nunito', label: 'Nunito' }
  ];

  return (
    <div className="space-y-6">
      {/* Palette de Couleurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Palette de Couleurs
          </CardTitle>
          <CardDescription>
            Définissez les couleurs principales de votre marque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Couleur primaire</Label>
              <ColorPicker
                value={formData.colors.primary}
                onChange={(value) => handleColorChange('primary', value)}
                label="Couleur principale de votre marque"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur secondaire</Label>
              <ColorPicker
                value={formData.colors.secondary}
                onChange={(value) => handleColorChange('secondary', value)}
                label="Couleur secondaire"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur d'accent</Label>
              <ColorPicker
                value={formData.colors.accent}
                onChange={(value) => handleColorChange('accent', value)}
                label="Couleur pour les éléments d'accent"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur de fond</Label>
              <ColorPicker
                value={formData.colors.background}
                onChange={(value) => handleColorChange('background', value)}
                label="Couleur de fond principale"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Couleur du texte</Label>
              <ColorPicker
                value={formData.colors.text}
                onChange={(value) => handleColorChange('text', value)}
                label="Couleur du texte principal"
              />
            </div>
          </div>

          {/* Aperçu des couleurs */}
          <div className="mt-6 p-4 border rounded-lg" style={{ backgroundColor: formData.colors.background }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: formData.colors.text }}>
              Aperçu des couleurs
            </h3>
            <div className="flex gap-2 mb-3">
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: formData.colors.primary }}
                title="Primaire"
              />
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: formData.colors.secondary }}
                title="Secondaire"
              />
              <div 
                className="w-8 h-8 rounded border"
                style={{ backgroundColor: formData.colors.accent }}
                title="Accent"
              />
            </div>
            <p style={{ color: formData.colors.text }} className="text-sm">
              Ceci est un exemple de texte avec vos couleurs personnalisées.
            </p>
            <button 
              className="mt-2 px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: formData.colors.primary }}
            >
              Bouton exemple
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Typographie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typographie
          </CardTitle>
          <CardDescription>
            Choisissez les polices pour votre marque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Police principale</Label>
              <Select
                value={formData.fonts.primary}
                onValueChange={(value) => handleFontChange('primary', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Police secondaire</Label>
              <Select
                value={formData.fonts.secondary}
                onValueChange={(value) => handleFontChange('secondary', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Aperçu des polices */}
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: formData.fonts.primary }}>
              Titre avec police principale ({formData.fonts.primary})
            </h3>
            <p className="text-sm" style={{ fontFamily: formData.fonts.secondary }}>
              Texte de contenu avec police secondaire ({formData.fonts.secondary})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images et Logos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Images et Logos
          </CardTitle>
          <CardDescription>
            Téléchargez vos logos et images de marque
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo principal</Label>
              <ImageUpload
                value={formData.logo?.url}
                onChange={(url, width, height) => handleImageUpload('logo', url, width, height)}
                accept="image/*"
                maxSize={2 * 1024 * 1024} // 2MB
                className="aspect-[3/1]"
              />
              <p className="text-xs text-muted-foreground">
                Recommandé: 300x100px, format PNG ou SVG
              </p>
            </div>

            <div className="space-y-2">
              <Label>Favicon</Label>
              <ImageUpload
                value={formData.favicon}
                onChange={(url) => handleImageUpload('favicon', url)}
                accept="image/*"
                maxSize={512 * 1024} // 512KB
                className="aspect-square w-24"
              />
              <p className="text-xs text-muted-foreground">
                Recommandé: 32x32px, format ICO ou PNG
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image de fond (optionnel)</Label>
            <ImageUpload
              value={formData.backgroundImage}
              onChange={(url) => handleImageUpload('backgroundImage', url)}
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              className="aspect-[16/9]"
            />
            <p className="text-xs text-muted-foreground">
              Image de fond pour vos formulaires. Recommandé: 1920x1080px
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CSS Personnalisé */}
      <Card>
        <CardHeader>
          <CardTitle>CSS Personnalisé</CardTitle>
          <CardDescription>
            Ajoutez du CSS personnalisé pour une personnalisation avancée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customCss">CSS personnalisé</Label>
            <textarea
              id="customCss"
              value={formData.customCss}
              onChange={(e) => setFormData(prev => ({ ...prev, customCss: e.target.value }))}
              placeholder="/* Votre CSS personnalisé */
.custom-form {
  border-radius: 12px;
}

.custom-button {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}"
              className="w-full h-32 p-3 text-sm font-mono border rounded-md resize-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le CSS sera appliqué à tous vos formulaires. Utilisez des sélecteurs spécifiques pour éviter les conflits.
          </p>
        </CardContent>
      </Card>

      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu du Branding
          </CardTitle>
          <CardDescription>
            Prévisualisation de votre branding sur un formulaire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 border rounded-lg"
            style={{ 
              backgroundColor: formData.colors.background,
              fontFamily: formData.fonts.primary
            }}
          >
            {formData.logo?.url && (
              <img 
                src={formData.logo.url} 
                alt="Logo" 
                className="h-12 mb-4"
              />
            )}
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: formData.colors.text }}
            >
              Formulaire d'exemple
            </h2>
            <div className="space-y-3">
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: formData.colors.text }}
                >
                  Nom complet
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: formData.colors.text }}
                >
                  Email
                </label>
                <input 
                  type="email" 
                  className="w-full p-2 border rounded"
                  placeholder="votre@email.com"
                />
              </div>
              <button 
                className="px-6 py-2 rounded text-white font-medium"
                style={{ backgroundColor: formData.colors.primary }}
              >
                Soumettre
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder le branding
        </Button>
      </div>
    </div>
  );
}