import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { usePreferencesContext } from '../hooks/usePreferences';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { toast } from 'react-toastify';
import { 
  Palette, 
  Globe, 
  Clock, 
  Bell, 
  Layout, 
  Shield,
  Save,
  RefreshCw
} from 'lucide-react';
import type { UserPreferences } from '../services/preferencesService';

export const UserPreferencesSettings: React.FC = () => {
  const { preferences, updateUserPreferences, loading } = usePreferencesContext();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm<UserPreferences>({
    defaultValues: preferences?.user
  });

  // Mettre à jour les valeurs du formulaire quand les préférences changent
  React.useEffect(() => {
    if (preferences?.user) {
      Object.entries(preferences.user).forEach(([key, value]) => {
        setValue(key as keyof UserPreferences, value);
      });
    }
  }, [preferences, setValue]);

  const onSubmit = async (data: UserPreferences) => {
    try {
      setSaving(true);
      await updateUserPreferences(data);
      toast.success('Préférences mises à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des préférences');
      console.error('Error updating preferences:', error);
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
        <h2 className="text-2xl font-bold">Préférences du Compte</h2>
        <p className="text-muted-foreground">
          Personnalisez votre expérience utilisateur
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Apparence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Apparence
            </CardTitle>
            <CardDescription>
              Personnalisez l'apparence de l'interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Thème</Label>
              <Select
                value={watchedValues.theme || 'auto'}
                onValueChange={(value) => setValue('theme', value as 'light' | 'dark' | 'auto')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="auto">Automatique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Localisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Localisation
            </CardTitle>
            <CardDescription>
              Configurez votre langue et fuseau horaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Langue</Label>
                <Select
                  value={watchedValues.language || 'fr'}
                  onValueChange={(value) => setValue('language', value)}
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
                  value={watchedValues.timezone || 'Europe/Paris'}
                  onValueChange={(value) => setValue('timezone', value)}
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
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Notifications par email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications par email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={watchedValues.notifications?.email}
                  onCheckedChange={(checked) => 
                    setValue('notifications.email', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Notifications push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications push dans le navigateur
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={watchedValues.notifications?.push}
                  onCheckedChange={(checked) => 
                    setValue('notifications.push', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="event-reminders">Rappels d'événements</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des rappels avant les événements
                  </p>
                </div>
                <Switch
                  id="event-reminders"
                  checked={watchedValues.notifications?.eventReminders}
                  onCheckedChange={(checked) => 
                    setValue('notifications.eventReminders', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-updates">Mises à jour d'équipe</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des notifications sur les activités d'équipe
                  </p>
                </div>
                <Switch
                  id="team-updates"
                  checked={watchedValues.notifications?.teamUpdates}
                  onCheckedChange={(checked) => 
                    setValue('notifications.teamUpdates', checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau de bord */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Tableau de bord
            </CardTitle>
            <CardDescription>
              Personnalisez l'affichage de votre tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultView">Vue par défaut</Label>
                <Select
                  value={watchedValues.dashboard?.defaultView}
                  onValueChange={(value) => setValue('dashboard.defaultView', value as 'grid' | 'list')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grille</SelectItem>
                    <SelectItem value="list">Liste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsPerPage">Éléments par page</Label>
                <Select
                  value={watchedValues.dashboard?.itemsPerPage?.toString()}
                  onValueChange={(value) => setValue('dashboard.itemsPerPage', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="welcome-message">Message de bienvenue</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher le message de bienvenue sur le tableau de bord
                </p>
              </div>
              <Switch
                id="welcome-message"
                checked={watchedValues.dashboard?.showWelcomeMessage}
                onCheckedChange={(checked) => 
                  setValue('dashboard.showWelcomeMessage', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Confidentialité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confidentialité
            </CardTitle>
            <CardDescription>
              Gérez vos paramètres de confidentialité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileVisibility">Visibilité du profil</Label>
              <Select
                value={watchedValues.privacy?.profileVisibility}
                onValueChange={(value) => setValue('privacy.profileVisibility', value as 'public' | 'organization' | 'private')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="organization">Organisation uniquement</SelectItem>
                  <SelectItem value="private">Privé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="online-status">Statut en ligne</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher votre statut en ligne aux autres membres
                </p>
              </div>
              <Switch
                id="online-status"
                checked={watchedValues.privacy?.showOnlineStatus}
                onCheckedChange={(checked) => 
                  setValue('privacy.showOnlineStatus', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="direct-messages">Messages directs</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser les autres membres à vous envoyer des messages directs
                </p>
              </div>
              <Switch
                id="direct-messages"
                checked={watchedValues.privacy?.allowDirectMessages}
                onCheckedChange={(checked) => 
                  setValue('privacy.allowDirectMessages', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
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
      </form>
    </div>
  );
};