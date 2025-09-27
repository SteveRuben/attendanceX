import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Send,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';

interface CampaignSchedulingProps {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

export const CampaignScheduling: React.FC<CampaignSchedulingProps> = ({
  data,
  onChange
}) => {
  const handleSchedulingTypeChange = (type: 'immediate' | 'scheduled') => {
    onChange({
      scheduling: {
        ...data.scheduling,
        type,
        scheduledAt: type === 'immediate' ? undefined : data.scheduling.scheduledAt
      }
    });
  };

  const handleScheduledDateChange = (scheduledAt: string) => {
    onChange({
      scheduling: {
        ...data.scheduling,
        scheduledAt
      }
    });
  };

  const handleTimezoneChange = (timezone: string) => {
    onChange({
      scheduling: {
        ...data.scheduling,
        timezone
      }
    });
  };

  const handleTestEmailsChange = (testEmails: string) => {
    const emails = testEmails.split(',').map(email => email.trim()).filter(email => email);
    onChange({
      options: {
        ...data.options,
        testEmails: emails
      }
    });
  };

  const handleOptionChange = (option: keyof typeof data.options, value: boolean) => {
    onChange({
      options: {
        ...data.options,
        [option]: value
      }
    });
  };

  // Calculer la date/heure minimale (maintenant + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // Formater la date pour l'affichage
  const formatScheduledDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Suggestions de créneaux optimaux
  const getOptimalTimeSlots = () => {
    const now = new Date();
    const suggestions = [];
    
    // Demain à 9h
    const tomorrow9am = new Date(now);
    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);
    
    // Demain à 14h
    const tomorrow2pm = new Date(now);
    tomorrow2pm.setDate(tomorrow2pm.getDate() + 1);
    tomorrow2pm.setHours(14, 0, 0, 0);
    
    // Lundi prochain à 9h
    const nextMonday = new Date(now);
    const daysUntilMonday = (1 + 7 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);
    
    if (tomorrow9am > now) {
      suggestions.push({
        label: 'Demain matin (9h)',
        value: tomorrow9am.toISOString().slice(0, 16),
        description: 'Bon taux d\'ouverture le matin'
      });
    }
    
    if (tomorrow2pm > now) {
      suggestions.push({
        label: 'Demain après-midi (14h)',
        value: tomorrow2pm.toISOString().slice(0, 16),
        description: 'Bon engagement en début d\'après-midi'
      });
    }
    
    suggestions.push({
      label: 'Lundi prochain (9h)',
      value: nextMonday.toISOString().slice(0, 16),
      description: 'Début de semaine, forte attention'
    });
    
    return suggestions;
  };

  const timezones = [
    { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
    { value: 'Europe/London', label: 'Londres (UTC+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' }
  ];

  return (
    <div className="space-y-6">
      {/* Type de programmation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            data.scheduling.type === 'immediate' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => handleSchedulingTypeChange('immediate')}
        >
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Envoyer maintenant
            </h3>
            <p className="text-gray-600 text-sm">
              La campagne sera envoyée immédiatement après validation
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            data.scheduling.type === 'scheduled' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => handleSchedulingTypeChange('scheduled')}
        >
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Programmer l'envoi
            </h3>
            <p className="text-gray-600 text-sm">
              Choisissez la date et l'heure d'envoi optimales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration de la programmation */}
      {data.scheduling.type === 'scheduled' && (
        <div className="space-y-6">
          {/* Suggestions de créneaux */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Créneaux recommandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {getOptimalTimeSlots().map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => handleScheduledDateChange(slot.value)}
                  >
                    <span className="font-medium">{slot.label}</span>
                    <span className="text-xs text-gray-500 mt-1">{slot.description}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sélection manuelle */}
          <Card>
            <CardHeader>
              <CardTitle>Programmation personnalisée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date et heure d'envoi
                </label>
                <Input
                  type="datetime-local"
                  value={data.scheduling.scheduledAt || ''}
                  onChange={(e) => handleScheduledDateChange(e.target.value)}
                  min={getMinDateTime()}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  L'envoi doit être programmé au moins 5 minutes à l'avance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuseau horaire
                </label>
                <Select 
                  value={data.scheduling.timezone || 'Europe/Paris'} 
                  onValueChange={handleTimezoneChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un fuseau horaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aperçu de la programmation */}
              {data.scheduling.scheduledAt && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Envoi programmé pour :
                      </p>
                      <p className="text-sm text-blue-700">
                        {formatScheduledDate(data.scheduling.scheduledAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Options avancées */}
      <Card>
        <CardHeader>
          <CardTitle>Options de suivi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.options.trackOpens}
                onChange={(e) => handleOptionChange('trackOpens', e.target.checked)}
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Suivre les ouvertures
                </span>
                <p className="text-xs text-gray-500">
                  Ajouter un pixel de tracking pour mesurer les ouvertures
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.options.trackClicks}
                onChange={(e) => handleOptionChange('trackClicks', e.target.checked)}
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Suivre les clics
                </span>
                <p className="text-xs text-gray-500">
                  Tracker les clics sur les liens dans l'email
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.options.enableUnsubscribe}
                onChange={(e) => handleOptionChange('enableUnsubscribe', e.target.checked)}
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Lien de désabonnement
                </span>
                <p className="text-xs text-gray-500">
                  Ajouter automatiquement un lien de désabonnement (recommandé)
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Test d'envoi */}
      <Card>
        <CardHeader>
          <CardTitle>Test d'envoi (optionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emails de test
            </label>
            <Input
              value={data.options.testEmails.join(', ')}
              onChange={(e) => handleTestEmailsChange(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Séparez les emails par des virgules. Un email de test sera envoyé avant la campagne.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Résumé de la programmation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Résumé de la programmation</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-gray-500" />
            <span>
              {data.scheduling.type === 'immediate' 
                ? 'Envoi immédiat après validation'
                : data.scheduling.scheduledAt 
                  ? `Programmé pour le ${formatScheduledDate(data.scheduling.scheduledAt)}`
                  : 'Aucune date programmée'
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" />
            <span>Fuseau horaire: {data.scheduling.timezone || 'Europe/Paris'}</span>
          </div>
          
          {data.options.testEmails.length > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Test d'envoi configuré ({data.options.testEmails.length} email{data.options.testEmails.length > 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};