import React from 'react';
import { usePreferencesContext } from '@/hooks/usePreferences';
import { preferencesService } from '@/services/preferencesService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Clock, Globe, Palette, Calendar } from 'lucide-react';

interface PreferencesDisplayProps {
  showCard?: boolean;
  compact?: boolean;
}

export const PreferencesDisplay: React.FC<PreferencesDisplayProps> = ({
  showCard = true,
  compact = false
}) => {
  const { preferences } = usePreferencesContext();

  // Fonctions de formatage utilisant directement le service
  const formatDate = (date: Date): string => {
    if (!preferences) return date.toLocaleDateString();
    return preferencesService.formatDate(date, preferences);
  };

  const formatTime = (date: Date): string => {
    if (!preferences) return date.toLocaleTimeString();
    return preferencesService.formatTime(date, preferences);
  };

  if (!preferences) {
    return null;
  }

  const { effective } = preferences;
  const now = new Date();

  const content = (
    <div className={`space-y-${compact ? '2' : '4'}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Thème</p>
            <Badge variant="secondary" className="text-xs">
              {effective.theme === 'light' ? 'Clair' : 
               effective.theme === 'dark' ? 'Sombre' : 'Automatique'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Langue</p>
            <Badge variant="secondary" className="text-xs">
              {effective.language === 'fr' ? 'Français' : 
               effective.language === 'en' ? 'English' : 
               effective.language}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Fuseau horaire</p>
            <Badge variant="secondary" className="text-xs">
              {effective.timezone}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Format</p>
            <Badge variant="secondary" className="text-xs">
              {effective.dateFormat} / {effective.timeFormat}
            </Badge>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Exemple de date :</p>
              <p>{formatDate(now)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Exemple d'heure :</p>
              <p>{formatTime(now)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Préférences actives</CardTitle>
        <CardDescription>
          Paramètres actuellement appliqués à votre interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

/**
 * Composant compact pour afficher les préférences dans la barre de navigation
 */
export const PreferencesIndicator: React.FC = () => {
  const { preferences } = usePreferencesContext();

  if (!preferences) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="text-xs">
        {preferences.effective.theme === 'light' ? '☀️' : 
         preferences.effective.theme === 'dark' ? '🌙' : '🔄'}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {preferences.effective.language.toUpperCase()}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {preferences.effective.timezone.split('/')[1]}
      </Badge>
    </div>
  );
};