import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePreferencesContext } from '../hooks/usePreferences';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'react-toastify';
import { 
  Building, 
  Palette, 
  Globe, 
  Settings, 
  Bell, 
  Shield,
  Save,
  RefreshCw,
  Upload
} from 'lucide-react';
import type { OrganizationPreferences } from '../services/preferencesService';

interface OrganizationPreferencesSettingsProps {
  organizationId: string;
  canEdit?: boolean;
}

export const OrganizationPreferencesSettings: React.FC<OrganizationPreferencesSettingsProps> = ({
  organizationId,
  canEdit = true
}) => {
  const { preferences, updateOrganizationPreferences, loading } = usePreferencesContext();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm<OrganizationPreferences>({
    defaultValues: preferences?.organization
  });

  // Mettre à jour les valeurs du formulaire quand les préférences changent
  React.useEffect(() => {
    if (preferences?.organization) {
      Object.entries(preferences.organization).forEach(([key, value]) => {
        setValue(key as keyof OrganizationPreferences, value);
      });
    }
  }, [preferences, setValue]);

  const onSubmit = async (data: OrganizationPreferences) => {
    if (!canEdit) return;

    try {
      setSaving(true);
      await updateOrganizationPreferences(data);
      toast.success('Préférences de l\'organisation mises à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des préférences');
      console.error('Error updating organization preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement des préférences...</span>
      </div>
    );
  }

  const watchedValues = watch();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Préférences de l'Organisation</h2>
        <p className="text-muted-foreground">
          Configurez les paramètres globaux de votre organisation
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Personnalisez l'apparence de votre organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    className="w-16 h-10 p-1 border rounded"
                    {...register('branding.primaryColor')}
                    disabled={!canEdit}
                  />
                  <Input
                    type="text"
                    placeholder="#3b82f6"
                    {...register('branding.primaryColor')}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    className="w-16 h-10 p-1 border rounded"
                    {...register('branding.secondaryColor')}
                    disabled={!canEdit}
                  />
                  <Input
                    type="text"
                    placeholder="#64748b"
                    {...register('branding.secondaryColor')}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo de l'organisation</Label>
              <div className="flex items-center gap-4">
                {watchedValues.branding?.logo && (
                  <img 
                    src={watchedValues.branding.logo} 
                    alt="Logo" 
                    className="h-12 w-12 object-contain border rounded"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Télécharger un logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres généraux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Paramètres généraux
            </CardTitle>
            <CardDescription>
              Configurez les paramètres par défaut de l'organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Langue par défaut</Label>
                <Select
                  value={watchedValues.general?.language}
                  onValueChange={(value) => setValue('general.language', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select
                  value={watchedValues.general?.timezone}
                  onValueChange={(value) => setValue('general.timezone', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Format de date</Label>
                <Select
                  value={watchedValues.general?.dateFormat}
                  onValueChange={(value) => setValue('general.dateFormat', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">Format d'heure</Label>
                <Select
                  value={watchedValues.general?.timeFormat}
                  onValueChange={(value) => setValue('general.timeFormat', value as '12h' | '24h')}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 heures</SelectItem>
                    <SelectItem value="12h">12 heures (AM/PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStartsOn">Début de semaine</Label>
              <Select
                value={watchedValues.general?.weekStartsOn?.toString()}
                onValueChange={(value) => setValue('general.weekStartsOn', parseInt(value) as 0 | 1)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lundi</SelectItem>
                  <SelectItem value="0">Dimanche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Fonctionnalités
            </CardTitle>
            <CardDescription>
              Activez ou désactivez les fonctionnalités de l'organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableQRCodes">QR Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre l'utilisation de QR codes pour les événements
                  </p>
                </div>
                <Switch
                  id="enableQRCodes"
                  checked={watchedValues.features?.enableQRCodes}
                  onCheckedChange={(checked) => setValue('features.enableQRCodes', checked)}
                  disabled={!canEdit}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableTeamManagement">Gestion d'équipes</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre la création et gestion d'équipes
                  </p>
                </div>
                <Switch
                  id="enableTeamManagement"
                  checked={watchedValues.features?.enableTeamManagement}
                  onCheckedChange={(checked) => setValue('features.enableTeamManagement', checked)}
                  disabled={!canEdit}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAnalytics">Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer les fonctionnalités d'analyse et de reporting
                  </p>
                </div>
                <Switch
                  id="enableAnalytics"
                  checked={watchedValues.features?.enableAnalytics}
                  onCheckedChange={(checked) => setValue('features.enableAnalytics', checked)}
                  disabled={!canEdit}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableCampaigns">Campagnes email</Label>
                  <p className="text-sm text-muted-foreground">
                    Permettre l'envoi de campagnes email
                  </p>
                </div>
                <Switch
                  id="enableCampaigns"
                  checked={watchedValues.features?.enableCampaigns}
                  onCheckedChange={(checked) => setValue('features.enableCampaigns', checked)}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Configurez les paramètres de sécurité de l'organisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="requireTwoFactor">Authentification à deux facteurs</Label>
                <p className="text-sm text-muted-foreground">
                  Exiger l'authentification à deux facteurs pour tous les membres
                </p>
              </div>
              <Switch
                id="requireTwoFactor"
                checked={watchedValues.security?.requireTwoFactor}
                onCheckedChange={(checked) => setValue('security.requireTwoFactor', checked)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Délai d'expiration de session (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="30"
                max="1440"
                {...register('security.sessionTimeout', { valueAsNumber: true })}
                disabled={!canEdit}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowGuestAccess">Accès invité</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre l'accès aux invités sans compte
                </p>
              </div>
              <Switch
                id="allowGuestAccess"
                checked={watchedValues.security?.allowGuestAccess}
                onCheckedChange={(checked) => setValue('security.allowGuestAccess', checked)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {canEdit && (
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={!isDirty || saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};