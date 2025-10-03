import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/badge';
import {
  Shield,
  Search,
  Download,
  Check,
  X,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ConsentRecord {
  id: string;
  userId: string;
  email: string;
  name: string;
  hasConsent: boolean;
  consentDate?: string;
  consentSource: 'signup' | 'settings' | 'campaign' | 'import' | 'api';
  consentType: 'explicit' | 'implicit' | 'legitimate_interest';
  withdrawalDate?: string;
  withdrawalReason?: string;
  ipAddress?: string;
  userAgent?: string;
  lastUpdated: string;
}

interface ConsentManagementProps {
  organizationId: string;
}

export const ConsentManagement: React.FC<ConsentManagementProps> = ({ organizationId }) => {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);

  const stats = {
    total: records.length,
    withConsent: records.filter(r => r.hasConsent).length,
    withoutConsent: records.filter(r => !r.hasConsent).length,
    explicit: records.filter(r => r.consentType === 'explicit').length
  };

  useEffect(() => {
    loadConsentRecords();
  }, [organizationId]);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, statusFilter, records]);

  const loadConsentRecords = async () => {
    setLoading(true);

    const mockRecords: ConsentRecord[] = Array.from({ length: 100 }, (_, i) => {
      const hasConsent = Math.random() > 0.2;
      const sources = ['signup', 'settings', 'campaign', 'import'] as const;
      const types = ['explicit', 'implicit', 'legitimate_interest'] as const;

      return {
        id: `consent-${i + 1}`,
        userId: `user-${i + 1}`,
        email: `user${i + 1}@example.com`,
        name: `Utilisateur ${i + 1}`,
        hasConsent,
        consentDate: hasConsent ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        consentSource: sources[Math.floor(Math.random() * sources.length)],
        consentType: types[Math.floor(Math.random() * types.length)],
        withdrawalDate: !hasConsent && Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        withdrawalReason: !hasConsent && Math.random() > 0.5 ? 'Too frequent emails' : undefined,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0',
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    });

    setRecords(mockRecords);
    setFilteredRecords(mockRecords);
    setLoading(false);
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.email.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter === 'with_consent') {
      filtered = filtered.filter(r => r.hasConsent);
    } else if (statusFilter === 'without_consent') {
      filtered = filtered.filter(r => !r.hasConsent);
    } else if (statusFilter === 'explicit') {
      filtered = filtered.filter(r => r.consentType === 'explicit');
    }

    setFilteredRecords(filtered);
  };

  const handleExport = () => {
    const csv = [
      ['Email', 'Nom', 'Consentement', 'Date', 'Source', 'Type', 'Retrait'].join(','),
      ...filteredRecords.map(r => [
        r.email,
        r.name,
        r.hasConsent ? 'Oui' : 'Non',
        r.consentDate || '',
        r.consentSource,
        r.consentType,
        r.withdrawalDate || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent-records-${new Date().toISOString()}.csv`;
    a.click();
  };

  const handleBulkExport = () => {
    const selected = records.filter(r => selectedRecords.includes(r.id));
    console.log('Exporting data for', selected.length, 'users');
  };

  const getConsentBadge = (hasConsent: boolean) => {
    return hasConsent ? (
      <Badge variant="default" className="bg-green-600">
        <Check className="h-3 w-3 mr-1" />
        Consentement
      </Badge>
    ) : (
      <Badge variant="secondary">
        <X className="h-3 w-3 mr-1" />
        Pas de consentement
      </Badge>
    );
  };

  const getSourceLabel = (source: ConsentRecord['consentSource']) => {
    const labels = {
      signup: 'Inscription',
      settings: 'Paramètres',
      campaign: 'Campagne',
      import: 'Import',
      api: 'API'
    };
    return labels[source];
  };

  const getTypeLabel = (type: ConsentRecord['consentType']) => {
    const labels = {
      explicit: 'Explicite',
      implicit: 'Implicite',
      legitimate_interest: 'Intérêt légitime'
    };
    return labels[type];
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
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total contacts</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{stats.withConsent}</div>
            <div className="text-sm text-gray-600">Avec consentement</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-red-600">{stats.withoutConsent}</div>
            <div className="text-sm text-gray-600">Sans consentement</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.explicit}</div>
            <div className="text-sm text-gray-600">Consentement explicite</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Registre des consentements
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedRecords.length > 0 && (
                <Button variant="outline" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter sélection ({selectedRecords.length})
                </Button>
              )}
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exporter tout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Conformité RGPD
                </h4>
                <p className="text-sm text-blue-700">
                  Ce registre documente tous les consentements conformément au RGPD. Les utilisateurs peuvent retirer leur consentement à tout moment.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="with_consent">Avec consentement</option>
              <option value="without_consent">Sans consentement</option>
              <option value="explicit">Consentement explicite</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedRecords(filteredRecords.map(r => r.id));
                        } else {
                          setSelectedRecords([]);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Source</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.slice(0, 20).map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedRecords([...selectedRecords, record.id]);
                          } else {
                            setSelectedRecords(selectedRecords.filter(id => id !== record.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{record.name}</div>
                        <div className="text-xs text-gray-600">{record.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getConsentBadge(record.hasConsent)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getTypeLabel(record.consentType)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getSourceLabel(record.consentSource)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {record.consentDate ? new Date(record.consentDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > 20 && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              Affichage de 20 sur {filteredRecords.length} enregistrements
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

