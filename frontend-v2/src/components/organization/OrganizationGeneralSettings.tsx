import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Building, Globe, Clock, DollarSign } from 'lucide-react';
import { TimezoneSelector } from '@/components/ui/TimezoneSelector';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest } from '@/types/organization.types';

interface OrganizationGeneralSettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationGeneralSettings({ organization, onUpdate }: OrganizationGeneralSettingsProps) {
  const [formData, setFormData] = useState({
    name: organization.name || '',
    displayName: organization.displayName || '',
    description: organization.description || '',
    website: organization.website || '',
    timezone: organization.settings?.timezone || 'Europe/Paris',
    locale: organization.settings?.locale || 'fr-FR',
    currency: organization.settings?.currency || 'EUR'
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validation
      if (!formData.name.trim()) {
        setError('Le nom de l\'organisation est requis');
        return;
      }

      if (!formData.displayName.trim()) {
        setError('Le nom d\'affichage est requis');
        return;
      }

      const updates: UpdateOrganizationRequest = {
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim() || undefined,
        settings: {
          ...organization.settings,
          timezone: formData.timezone,
          locale: formData.locale,
          currency: formData.currency
        }
      };

      await onUpdate(updates);
      
      toast({
        title: 'Paramètres sauvegardés',
        description: 'Les paramètres généraux ont été mis à jour avec succès.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde des paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const localeOptions = [
    { value: 'fr-FR', label: 'Français (France)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Español (España)' },
    { value: 'de-DE', label: 'Deutsch (Deutschland)' },
    { value: 'it-IT', label: 'Italiano (Italia)' }
  ];

  const currencyOptions = [
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' }
  ];

  return (
    <div className="space-y-6">
      {/* Informations de Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informations de Base
          </CardTitle>
          <CardDescription>
            Informations principales de votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'organisation *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Mon Organisation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Mon Organisation Inc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Description de votre organisation..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.monorganisation.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres Régionaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Paramètres Régionaux
          </CardTitle>
          <CardDescription>
            Configuration du fuseau horaire, langue et devise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <TimezoneSelector
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Langue</Label>
              <Select
                value={formData.locale}
                onValueChange={(value) => handleInputChange('locale', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Devise</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations Système */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
          <CardDescription>
            Informations en lecture seule sur votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>ID de l'organisation</Label>
              <Input value={organization.id} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Input value={organization.status} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Créé le</Label>
              <Input 
                value={new Date(organization.createdAt).toLocaleDateString('fr-FR')} 
                readOnly 
                className="bg-muted" 
              />
            </div>
            <div className="space-y-2">
              <Label>Dernière modification</Label>
              <Input 
                value={new Date(organization.updatedAt).toLocaleDateString('fr-FR')} 
                readOnly 
                className="bg-muted" 
              />
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
          Sauvegarder les modifications
        </Button>
      </div>
    </div>
  );
}