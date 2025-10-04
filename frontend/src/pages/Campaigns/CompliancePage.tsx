import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Shield,
  FileText,
  Users,
  Lock
} from 'lucide-react';
import { ConsentManagement } from '../../components/campaigns/compliance/ConsentManagement';
import { CampaignAuditLog } from '../../components/campaigns/audit/CampaignAuditLog';
import { CampaignPermissions } from '../../components/campaigns/permissions/CampaignPermissions';

type ComplianceTab = 'consent' | 'audit' | 'permissions' | 'gdpr';

export const CompliancePage: React.FC = () => {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('consent');

  const tabs = [
    {
      id: 'consent' as ComplianceTab,
      label: 'Gestion des consentements',
      icon: Users,
      description: 'Registre RGPD des consentements'
    },
    {
      id: 'audit' as ComplianceTab,
      label: 'Journal d\'audit',
      icon: FileText,
      description: 'Historique des actions'
    },
    {
      id: 'permissions' as ComplianceTab,
      label: 'Permissions',
      icon: Lock,
      description: 'Gestion des accès'
    },
    {
      id: 'gdpr' as ComplianceTab,
      label: 'Conformité RGPD',
      icon: Shield,
      description: 'Outils de conformité'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Conformité et sécurité</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestion de la conformité RGPD et de la sécurité des campagnes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{tab.description}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === 'consent' && organization && (
            <ConsentManagement organizationId={organization.organizationId} />
          )}

          {activeTab === 'audit' && organization && (
            <CampaignAuditLog organizationId={organization.organizationId} />
          )}

          {activeTab === 'permissions' && organization && (
            <CampaignPermissions organizationId={organization.organizationId} />
          )}

          {activeTab === 'gdpr' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Conformité RGPD
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">
                      Statut de conformité
                    </h4>
                    <p className="text-sm text-green-700">
                      Votre organisation est conforme au RGPD pour les campagnes email.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Lien de désabonnement</p>
                        <p className="text-xs text-gray-600">Inclus automatiquement dans tous les emails</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Registre des consentements</p>
                        <p className="text-xs text-gray-600">Documentation complète des consentements</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Droit à l'oubli</p>
                        <p className="text-xs text-gray-600">Suppression des données sur demande</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Portabilité des données</p>
                        <p className="text-xs text-gray-600">Export des données personnelles</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Journal d'audit</p>
                        <p className="text-xs text-gray-600">Traçabilité de toutes les actions</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Chiffrement des données</p>
                        <p className="text-xs text-gray-600">Protection des données sensibles</p>
                      </div>
                      <span className="text-green-600 font-semibold">✓ Actif</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions RGPD disponibles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button className="w-full p-4 border rounded-lg text-left hover:bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Exporter toutes les données
                    </h4>
                    <p className="text-xs text-gray-600">
                      Télécharger un export complet de toutes les données de campagne
                    </p>
                  </button>

                  <button className="w-full p-4 border rounded-lg text-left hover:bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Générer un rapport de conformité
                    </h4>
                    <p className="text-xs text-gray-600">
                      Créer un rapport détaillé de conformité RGPD
                    </p>
                  </button>

                  <button className="w-full p-4 border rounded-lg text-left hover:bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Anonymiser les données anciennes
                    </h4>
                    <p className="text-xs text-gray-600">
                      Anonymiser les données de plus de 2 ans
                    </p>
                  </button>

                  <button className="w-full p-4 border rounded-lg text-left hover:bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      Vérifier les consentements
                    </h4>
                    <p className="text-xs text-gray-600">
                      Audit des consentements et identification des problèmes
                    </p>
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentation RGPD</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-900">Politique de confidentialité</span>
                    <FileText className="h-4 w-4 text-gray-600" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-900">Conditions d'utilisation</span>
                    <FileText className="h-4 w-4 text-gray-600" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-900">Guide de conformité RGPD</span>
                    <FileText className="h-4 w-4 text-gray-600" />
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-900">Registre des traitements</span>
                    <FileText className="h-4 w-4 text-gray-600" />
                  </a>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

