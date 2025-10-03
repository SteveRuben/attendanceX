import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  Mail,
  Bell,
  Shield,
  Save,
  Check,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

interface CampaignPreferencesProps {
  userId: string;
}

interface UserCampaignPreferences {
  emailCommunications: {
    newsletters: boolean;
    announcements: boolean;
    eventReminders: boolean;
    productUpdates: boolean;
    marketingEmails: boolean;
  };
  frequency: {
    maxEmailsPerWeek: number;
    digestMode: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
  };
  consent: {
    hasGivenConsent: boolean;
    consentDate?: string;
    consentSource: string;
    canWithdrawConsent: boolean;
  };
  privacy: {
    allowTracking: boolean;
    allowPersonalization: boolean;
    shareDataWithPartners: boolean;
  };
}

export const CampaignPreferences: React.FC<CampaignPreferencesProps> = ({ userId }) => {
  const [preferences, setPreferences] = useState<UserCampaignPreferences>({
    emailCommunications: {
      newsletters: true,
      announcements: true,
      eventReminders: true,
      productUpdates: false,
      marketingEmails: false
    },
    frequency: {
      maxEmailsPerWeek: 5,
      digestMode: false,
      digestFrequency: 'weekly'
    },
    consent: {
      hasGivenConsent: true,
      consentDate: new Date().toISOString(),
      consentSource: 'user_settings',
      canWithdrawConsent: true
    },
    privacy: {
      allowTracking: true,
      allowPersonalization: true,
      shareDataWithPartners: false
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Préférences sauvegardées');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (confirm('Êtes-vous sûr de vouloir retirer votre consentement ? Vous ne recevrez plus aucune communication par email.')) {
      setPreferences(prev => ({
        ...prev,
        consent: { ...prev.consent, hasGivenConsent: false },
        emailCommunications: {
          newsletters: false,
          announcements: false,
          eventReminders: false,
          productUpdates: false,
          marketingEmails: false
        }
      }));
      toast.success('Consentement retiré');
    }
  };

  const handleGiveConsent = () => {
    setPreferences(prev => ({
      ...prev,
      consent: {
        hasGivenConsent: true,
        consentDate: new Date().toISOString(),
        consentSource: 'user_settings',
        canWithdrawConsent: true
      }
    }));
    toast.success('Consentement accordé');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Consentement RGPD
            </CardTitle>
            {preferences.consent.hasGivenConsent ? (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Consentement accordé
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="h-3 w-3 mr-1" />
                Consentement retiré
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences.consent.hasGivenConsent ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Vous avez donné votre consentement pour recevoir des communications par email le{' '}
                  {preferences.consent.consentDate && new Date(preferences.consent.consentDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Button variant="outline" onClick={handleWithdrawConsent}>
                Retirer mon consentement
              </Button>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Vous n'avez pas donné votre consentement pour recevoir des communications par email.
                  Vous ne recevrez que les emails transactionnels essentiels.
                </p>
              </div>
              <Button onClick={handleGiveConsent}>
                Donner mon consentement
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Types de communications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Newsletters</p>
              <p className="text-xs text-gray-600">Actualités et mises à jour régulières</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCommunications.newsletters}
              onChange={e => setPreferences(prev => ({
                ...prev,
                emailCommunications: { ...prev.emailCommunications, newsletters: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Annonces</p>
              <p className="text-xs text-gray-600">Annonces importantes de l'organisation</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCommunications.announcements}
              onChange={e => setPreferences(prev => ({
                ...prev,
                emailCommunications: { ...prev.emailCommunications, announcements: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Rappels d'événements</p>
              <p className="text-xs text-gray-600">Notifications pour les événements à venir</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCommunications.eventReminders}
              onChange={e => setPreferences(prev => ({
                ...prev,
                emailCommunications: { ...prev.emailCommunications, eventReminders: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Mises à jour produit</p>
              <p className="text-xs text-gray-600">Nouvelles fonctionnalités et améliorations</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCommunications.productUpdates}
              onChange={e => setPreferences(prev => ({
                ...prev,
                emailCommunications: { ...prev.emailCommunications, productUpdates: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Emails marketing</p>
              <p className="text-xs text-gray-600">Offres spéciales et promotions</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailCommunications.marketingEmails}
              onChange={e => setPreferences(prev => ({
                ...prev,
                emailCommunications: { ...prev.emailCommunications, marketingEmails: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Fréquence des emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre maximum d'emails par semaine
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={preferences.frequency.maxEmailsPerWeek}
              onChange={e => setPreferences(prev => ({
                ...prev,
                frequency: { ...prev.frequency, maxEmailsPerWeek: parseInt(e.target.value) }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1</span>
              <span className="font-semibold">{preferences.frequency.maxEmailsPerWeek}</span>
              <span>20</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="digestMode"
              checked={preferences.frequency.digestMode}
              onChange={e => setPreferences(prev => ({
                ...prev,
                frequency: { ...prev.frequency, digestMode: e.target.checked }
              }))}
              disabled={!preferences.consent.hasGivenConsent}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="digestMode" className="text-sm text-gray-700">
              Recevoir un résumé groupé au lieu d'emails individuels
            </label>
          </div>

          {preferences.frequency.digestMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fréquence du résumé
              </label>
              <select
                value={preferences.frequency.digestFrequency}
                onChange={e => setPreferences(prev => ({
                  ...prev,
                  frequency: { ...prev.frequency, digestFrequency: e.target.value as any }
                }))}
                disabled={!preferences.consent.hasGivenConsent}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les préférences'}
        </Button>
      </div>
    </div>
  );
};

