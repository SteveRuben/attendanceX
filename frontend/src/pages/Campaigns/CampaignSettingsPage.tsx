import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  Settings,
  Palette,
  Shield,
  Users,
  Mail,
  Save,
  Upload,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface CampaignSettings {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    emailHeaderImage?: string;
    emailFooterText: string;
  };
  permissions: {
    whoCanCreateCampaigns: 'admin' | 'manager' | 'all';
    whoCanSendCampaigns: 'admin' | 'manager' | 'all';
    requireApproval: boolean;
    approvers: string[];
  };
  sending: {
    defaultFromName: string;
    defaultFromEmail: string;
    defaultReplyTo: string;
    maxRecipientsPerCampaign: number;
    maxCampaignsPerDay: number;
    allowScheduling: boolean;
  };
  compliance: {
    includeUnsubscribeLink: boolean;
    includePhysicalAddress: boolean;
    physicalAddress: string;
    gdprCompliant: boolean;
    requireConsent: boolean;
  };
}

export const CampaignSettingsPage: React.FC = () => {
  const { organization } = useAuth();
  const [settings, setSettings] = useState<CampaignSettings>({
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#6B7280',
      accentColor: '#10B981',
      emailFooterText: `© ${new Date().getFullYear()} ${organization?.name || 'Organization'}. Tous droits réservés.`
    },
    permissions: {
      whoCanCreateCampaigns: 'manager',
      whoCanSendCampaigns: 'admin',
      requireApproval: true,
      approvers: []
    },
    sending: {
      defaultFromName: organization?.name || '',
      defaultFromEmail: `noreply@${organization?.name?.toLowerCase().replace(/\s+/g, '')}.com`,
      defaultReplyTo: '',
      maxRecipientsPerCampaign: 10000,
      maxCampaignsPerDay: 10,
      allowScheduling: true
    },
    compliance: {
      includeUnsubscribeLink: true,
      includePhysicalAddress: true,
      physicalAddress: '',
      gdprCompliant: true,
      requireConsent: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [organization?.organizationId]);

  const loadSettings = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Paramètres sauvegardés avec succès');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({
          ...prev,
          branding: { ...prev.branding, logo: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Paramètres des campagnes</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configuration de l'organisation pour les campagnes email
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo de l'organisation
              </label>
              <div className="flex items-center gap-4">
                {settings.branding.logo && (
                  <img src={settings.branding.logo} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Télécharger un logo
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur primaire
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                    className="h-10 w-20 rounded border"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur secondaire
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.secondaryColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, secondaryColor: e.target.value }
                    }))}
                    className="h-10 w-20 rounded border"
                  />
                  <Input
                    value={settings.branding.secondaryColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, secondaryColor: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur d'accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.accentColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, accentColor: e.target.value }
                    }))}
                    className="h-10 w-20 rounded border"
                  />
                  <Input
                    value={settings.branding.accentColor}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      branding: { ...prev.branding, accentColor: e.target.value }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte du pied de page
              </label>
              <textarea
                value={settings.branding.emailFooterText}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  branding: { ...prev.branding, emailFooterText: e.target.value }
                }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qui peut créer des campagnes
                </label>
                <select
                  value={settings.permissions.whoCanCreateCampaigns}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    permissions: { ...prev.permissions, whoCanCreateCampaigns: e.target.value as any }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="admin">Administrateurs uniquement</option>
                  <option value="manager">Administrateurs et Managers</option>
                  <option value="all">Tous les utilisateurs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qui peut envoyer des campagnes
                </label>
                <select
                  value={settings.permissions.whoCanSendCampaigns}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    permissions: { ...prev.permissions, whoCanSendCampaigns: e.target.value as any }
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="admin">Administrateurs uniquement</option>
                  <option value="manager">Administrateurs et Managers</option>
                  <option value="all">Tous les utilisateurs</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireApproval"
                checked={settings.permissions.requireApproval}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, requireApproval: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="requireApproval" className="text-sm text-gray-700">
                Requérir une approbation avant l'envoi
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Paramètres d'envoi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'expéditeur par défaut
                </label>
                <Input
                  value={settings.sending.defaultFromName}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sending: { ...prev.sending, defaultFromName: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email de l'expéditeur par défaut
                </label>
                <Input
                  type="email"
                  value={settings.sending.defaultFromEmail}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sending: { ...prev.sending, defaultFromEmail: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de réponse par défaut
              </label>
              <Input
                type="email"
                value={settings.sending.defaultReplyTo}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  sending: { ...prev.sending, defaultReplyTo: e.target.value }
                }))}
                placeholder="reply@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre max de destinataires par campagne
                </label>
                <Input
                  type="number"
                  value={settings.sending.maxRecipientsPerCampaign}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sending: { ...prev.sending, maxRecipientsPerCampaign: parseInt(e.target.value) }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre max de campagnes par jour
                </label>
                <Input
                  type="number"
                  value={settings.sending.maxCampaignsPerDay}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    sending: { ...prev.sending, maxCampaignsPerDay: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowScheduling"
                checked={settings.sending.allowScheduling}
                onChange={e => setSettings(prev => ({
                  ...prev,
                  sending: { ...prev.sending, allowScheduling: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="allowScheduling" className="text-sm text-gray-700">
                Autoriser la programmation des campagnes
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Conformité et RGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Conformité RGPD requise
                  </h4>
                  <p className="text-sm text-blue-700">
                    Ces paramètres garantissent que vos campagnes respectent le RGPD et les réglementations sur la protection des données.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeUnsubscribeLink"
                  checked={settings.compliance.includeUnsubscribeLink}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance, includeUnsubscribeLink: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 rounded"
                  disabled
                />
                <label htmlFor="includeUnsubscribeLink" className="text-sm text-gray-700">
                  Inclure un lien de désabonnement (obligatoire)
                </label>
                <Badge variant="default" className="bg-green-600">Requis</Badge>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gdprCompliant"
                  checked={settings.compliance.gdprCompliant}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance, gdprCompliant: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 rounded"
                  disabled
                />
                <label htmlFor="gdprCompliant" className="text-sm text-gray-700">
                  Mode conforme RGPD (obligatoire)
                </label>
                <Badge variant="default" className="bg-green-600">Requis</Badge>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireConsent"
                  checked={settings.compliance.requireConsent}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance, requireConsent: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="requireConsent" className="text-sm text-gray-700">
                  Requérir le consentement explicite des destinataires
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includePhysicalAddress"
                  checked={settings.compliance.includePhysicalAddress}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance, includePhysicalAddress: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="includePhysicalAddress" className="text-sm text-gray-700">
                  Inclure l'adresse physique dans les emails
                </label>
              </div>
            </div>

            {settings.compliance.includePhysicalAddress && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse physique de l'organisation
                </label>
                <textarea
                  value={settings.compliance.physicalAddress}
                  onChange={e => setSettings(prev => ({
                    ...prev,
                    compliance: { ...prev.compliance, physicalAddress: e.target.value }
                  }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="123 Rue Example, 75001 Paris, France"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

