/**
 * Composant de gestion du branding des tenants
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Palette, Upload, Eye, Save, RotateCcw } from 'lucide-react';

interface TenantBranding {
    id: string;
    tenantId: string;
    logoUrl?: string;
    faviconUrl?: string;
    backgroundImageUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    headingFontFamily?: string;
    customCss?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface BrandingTheme {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
}

export const BrandingManager: React.FC = () => {
    const [branding, setBranding] = useState<TenantBranding | null>(null);
    const [themes, setThemes] = useState<BrandingTheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [previewMode, setPreviewMode] = useState(false);

    // État du formulaire
    const [formData, setFormData] = useState({
        logoUrl: '',
        faviconUrl: '',
        backgroundImageUrl: '',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#60a5fa',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontFamily: '',
        headingFontFamily: '',
        customCss: ''
    });

    useEffect(() => {
        loadBranding();
        loadThemes();
    }, []);

    const loadBranding = async () => {
        try {
            const response = await fetch('/api/branding');
            if (response.ok) {
                const data = await response.json();
                setBranding(data);
                setFormData({
                    logoUrl: data.logoUrl || '',
                    faviconUrl: data.faviconUrl || '',
                    backgroundImageUrl: data.backgroundImageUrl || '',
                    primaryColor: data.primaryColor || '#1e40af',
                    secondaryColor: data.secondaryColor || '#3b82f6',
                    accentColor: data.accentColor || '#60a5fa',
                    backgroundColor: data.backgroundColor || '#ffffff',
                    textColor: data.textColor || '#1f2937',
                    fontFamily: data.fontFamily || '',
                    headingFontFamily: data.headingFontFamily || '',
                    customCss: data.customCss || ''
                });
            }
        } catch (error) {
            console.error('Error loading branding:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadThemes = async () => {
        try {
            const response = await fetch('/api/branding/themes');
            if (response.ok) {
                const data = await response.json();
                setThemes(data);
            }
        } catch (error) {
            console.error('Error loading themes:', error);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/branding', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                setBranding(data);
                setMessage({ type: 'success', text: 'Branding mis à jour avec succès' });
            } else {
                throw new Error('Failed to save branding');
            }
        } catch (error) {
            console.error('Error saving branding:', error);
            setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
        } finally {
            setSaving(false);
        }
    };

    const handleApplyTheme = async (themeName: string) => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/branding/themes/${themeName}`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setBranding(data);
                setFormData(prev => ({
                    ...prev,
                    primaryColor: data.primaryColor,
                    secondaryColor: data.secondaryColor,
                    accentColor: data.accentColor,
                    backgroundColor: data.backgroundColor,
                    textColor: data.textColor
                }));
                setMessage({ type: 'success', text: `Thème "${themeName}" appliqué avec succès` });
            } else {
                throw new Error('Failed to apply theme');
            }
        } catch (error) {
            console.error('Error applying theme:', error);
            setMessage({ type: 'error', text: 'Erreur lors de l\'application du thème' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (branding) {
            setFormData({
                logoUrl: branding.logoUrl || '',
                faviconUrl: branding.faviconUrl || '',
                backgroundImageUrl: branding.backgroundImageUrl || '',
                primaryColor: branding.primaryColor || '#1e40af',
                secondaryColor: branding.secondaryColor || '#3b82f6',
                accentColor: branding.accentColor || '#60a5fa',
                backgroundColor: branding.backgroundColor || '#ffffff',
                textColor: branding.textColor || '#1f2937',
                fontFamily: branding.fontFamily || '',
                headingFontFamily: branding.headingFontFamily || '',
                customCss: branding.customCss || ''
            });
        }
    };

    const generatePreviewStyle = () => {
        return {
            '--primary-color': formData.primaryColor,
            '--secondary-color': formData.secondaryColor,
            '--accent-color': formData.accentColor,
            '--background-color': formData.backgroundColor,
            '--text-color': formData.textColor,
            '--font-family': formData.fontFamily || 'inherit',
            '--heading-font-family': formData.headingFontFamily || 'inherit'
        } as React.CSSProperties;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Chargement du branding...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gestion du Branding</h1>
                    <p className="text-gray-600">Personnalisez l'apparence de votre tenant</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPreviewMode(!previewMode)}
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        {previewMode ? 'Masquer' : 'Aperçu'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Réinitialiser
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                </div>
            </div>

            {message && (
                <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <Tabs defaultValue="colors" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="colors">Couleurs</TabsTrigger>
                            <TabsTrigger value="images">Images</TabsTrigger>
                            <TabsTrigger value="typography">Typo</TabsTrigger>
                            <TabsTrigger value="css">CSS</TabsTrigger>
                        </TabsList>

                        <TabsContent value="colors" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="w-5 h-5" />
                                        Palette de couleurs
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="primaryColor">Couleur primaire</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="primaryColor"
                                                    type="color"
                                                    value={formData.primaryColor}
                                                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                                                    className="w-16 h-10 p-1"
                                                />
                                                <Input
                                                    value={formData.primaryColor}
                                                    onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                                                    placeholder="#1e40af"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="secondaryColor"
                                                    type="color"
                                                    value={formData.secondaryColor}
                                                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                                                    className="w-16 h-10 p-1"
                                                />
                                                <Input
                                                    value={formData.secondaryColor}
                                                    onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                                                    placeholder="#3b82f6"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="accentColor">Couleur d'accent</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="accentColor"
                                                    type="color"
                                                    value={formData.accentColor}
                                                    onChange={(e) => handleInputChange('accentColor', e.target.value)}
                                                    className="w-16 h-10 p-1"
                                                />
                                                <Input
                                                    value={formData.accentColor}
                                                    onChange={(e) => handleInputChange('accentColor', e.target.value)}
                                                    placeholder="#60a5fa"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="backgroundColor">Arrière-plan</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="backgroundColor"
                                                    type="color"
                                                    value={formData.backgroundColor}
                                                    onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                                                    className="w-16 h-10 p-1"
                                                />
                                                <Input
                                                    value={formData.backgroundColor}
                                                    onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                                                    placeholder="#ffffff"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <Label htmlFor="textColor">Couleur du texte</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="textColor"
                                                    type="color"
                                                    value={formData.textColor}
                                                    onChange={(e) => handleInputChange('textColor', e.target.value)}
                                                    className="w-16 h-10 p-1"
                                                />
                                                <Input
                                                    value={formData.textColor}
                                                    onChange={(e) => handleInputChange('textColor', e.target.value)}
                                                    placeholder="#1f2937"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Thèmes prédéfinis</Label>
                                        <div className="grid grid-cols-1 gap-2 mt-2">
                                            {themes.map((theme) => (
                                                <Button
                                                    key={theme.name}
                                                    variant="outline"
                                                    onClick={() => handleApplyTheme(theme.name)}
                                                    className="justify-start"
                                                    disabled={saving}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex gap-1">
                                                            <div
                                                                className="w-4 h-4 rounded-full border"
                                                                style={{ backgroundColor: theme.primaryColor }}
                                                            />
                                                            <div
                                                                className="w-4 h-4 rounded-full border"
                                                                style={{ backgroundColor: theme.secondaryColor }}
                                                            />
                                                            <div
                                                                className="w-4 h-4 rounded-full border"
                                                                style={{ backgroundColor: theme.accentColor }}
                                                            />
                                                        </div>
                                                        <span>{theme.name}</span>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="images" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        Images et logos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="logoUrl">URL du logo</Label>
                                        <Input
                                            id="logoUrl"
                                            value={formData.logoUrl}
                                            onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="faviconUrl">URL du favicon</Label>
                                        <Input
                                            id="faviconUrl"
                                            value={formData.faviconUrl}
                                            onChange={(e) => handleInputChange('faviconUrl', e.target.value)}
                                            placeholder="https://example.com/favicon.ico"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="backgroundImageUrl">URL de l'image d'arrière-plan</Label>
                                        <Input
                                            id="backgroundImageUrl"
                                            value={formData.backgroundImageUrl}
                                            onChange={(e) => handleInputChange('backgroundImageUrl', e.target.value)}
                                            placeholder="https://example.com/background.jpg"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="typography" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Typographie</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="fontFamily">Police principale</Label>
                                        <Select
                                            value={formData.fontFamily}
                                            onValueChange={(value) => handleInputChange('fontFamily', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une police" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Par défaut</SelectItem>
                                                <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                                                <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                                                <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                                                <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                                                <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                                                <SelectItem value="Poppins, sans-serif">Poppins</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="headingFontFamily">Police des titres</Label>
                                        <Select
                                            value={formData.headingFontFamily}
                                            onValueChange={(value) => handleInputChange('headingFontFamily', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une police" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Par défaut</SelectItem>
                                                <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                                                <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                                                <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                                                <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                                                <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                                                <SelectItem value="Poppins, sans-serif">Poppins</SelectItem>
                                                <SelectItem value="Playfair Display, serif">Playfair Display</SelectItem>
                                                <SelectItem value="Merriweather, serif">Merriweather</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="css" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>CSS personnalisé</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Label htmlFor="customCss">CSS personnalisé (max 50KB)</Label>
                                        <Textarea
                                            id="customCss"
                                            value={formData.customCss}
                                            onChange={(e) => handleInputChange('customCss', e.target.value)}
                                            placeholder="/* Votre CSS personnalisé ici */"
                                            rows={10}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-sm text-gray-500 mt-2">
                                            Utilisez les variables CSS : --primary-color, --secondary-color, --accent-color, etc.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {previewMode && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Aperçu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="p-6 rounded-lg border"
                                    style={{
                                        ...generatePreviewStyle(),
                                        backgroundColor: formData.backgroundColor,
                                        color: formData.textColor,
                                        fontFamily: formData.fontFamily || 'inherit'
                                    }}
                                >
                                    {formData.logoUrl && (
                                        <img
                                            src={formData.logoUrl}
                                            alt="Logo"
                                            className="h-12 mb-4"
                                        />
                                    )}
                                    <h1
                                        className="text-2xl font-bold mb-4"
                                        style={{
                                            color: formData.primaryColor,
                                            fontFamily: formData.headingFontFamily || formData.fontFamily || 'inherit'
                                        }}
                                    >
                                        Titre principal
                                    </h1>
                                    <p className="mb-4">
                                        Ceci est un exemple de texte avec la couleur de texte sélectionnée.
                                    </p>
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            className="px-4 py-2 rounded text-white"
                                            style={{ backgroundColor: formData.primaryColor }}
                                        >
                                            Bouton primaire
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded text-white"
                                            style={{ backgroundColor: formData.secondaryColor }}
                                        >
                                            Bouton secondaire
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded text-white"
                                            style={{ backgroundColor: formData.accentColor }}
                                        >
                                            Bouton accent
                                        </button>
                                    </div>
                                    <div
                                        className="p-4 rounded border-l-4"
                                        style={{ borderLeftColor: formData.accentColor }}
                                    >
                                        <p>Exemple de contenu avec bordure colorée</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};