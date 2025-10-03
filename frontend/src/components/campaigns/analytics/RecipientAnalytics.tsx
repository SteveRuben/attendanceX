import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/badge';
import {
  Users,
  Search,
  Download,
  Mail,
  MailOpen,
  MousePointerClick,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter
} from 'lucide-react';

interface RecipientAnalyticsProps {
  campaignId: string;
}

interface RecipientActivity {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  lastOpenedAt?: string;
  openCount: number;
  clickedAt?: string;
  lastClickedAt?: string;
  clickCount: number;
  clickedLinks: string[];
  device?: string;
  location?: string;
  bounceReason?: string;
}

interface RecipientStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export const RecipientAnalytics: React.FC<RecipientAnalyticsProps> = ({ campaignId }) => {
  const [recipients, setRecipients] = useState<RecipientActivity[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<RecipientActivity[]>([]);
  const [stats, setStats] = useState<RecipientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientActivity | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadRecipientData();
  }, [campaignId]);

  useEffect(() => {
    filterRecipients();
  }, [searchQuery, statusFilter, recipients]);

  const loadRecipientData = async () => {
    try {
      setLoading(true);

      const mockRecipients: RecipientActivity[] = Array.from({ length: 50 }, (_, i) => ({
        id: `recipient-${i + 1}`,
        email: `user${i + 1}@example.com`,
        firstName: `User`,
        lastName: `${i + 1}`,
        status: ['sent', 'delivered', 'opened', 'clicked', 'bounced'][Math.floor(Math.random() * 5)] as any,
        sentAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        deliveredAt: Math.random() > 0.1 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        openedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        openCount: Math.floor(Math.random() * 5),
        clickedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        clickCount: Math.floor(Math.random() * 3),
        clickedLinks: Math.random() > 0.5 ? ['https://example.com/link1', 'https://example.com/link2'] : [],
        device: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
        location: ['Paris, France', 'Lyon, France', 'Marseille, France'][Math.floor(Math.random() * 3)]
      }));

      const mockStats: RecipientStats = {
        total: mockRecipients.length,
        sent: mockRecipients.length,
        delivered: mockRecipients.filter(r => r.deliveredAt).length,
        opened: mockRecipients.filter(r => r.openedAt).length,
        clicked: mockRecipients.filter(r => r.clickedAt).length,
        bounced: mockRecipients.filter(r => r.status === 'bounced').length,
        unsubscribed: mockRecipients.filter(r => r.status === 'unsubscribed').length
      };

      setRecipients(mockRecipients);
      setFilteredRecipients(mockRecipients);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading recipient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecipients = () => {
    let filtered = [...recipients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.email.toLowerCase().includes(query) ||
          r.firstName?.toLowerCase().includes(query) ||
          r.lastName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredRecipients(filtered);
    setCurrentPage(1);
  };

  const handleExport = () => {
    console.log('Export recipient data');
  };

  const getStatusIcon = (status: RecipientActivity['status']) => {
    const icons = {
      sent: Mail,
      delivered: CheckCircle,
      opened: MailOpen,
      clicked: MousePointerClick,
      bounced: XCircle,
      unsubscribed: XCircle
    };
    return icons[status];
  };

  const getStatusColor = (status: RecipientActivity['status']) => {
    const colors = {
      sent: 'text-blue-600 bg-blue-50',
      delivered: 'text-green-600 bg-green-50',
      opened: 'text-purple-600 bg-purple-50',
      clicked: 'text-orange-600 bg-orange-50',
      bounced: 'text-red-600 bg-red-50',
      unsubscribed: 'text-gray-600 bg-gray-50'
    };
    return colors[status];
  };

  const getStatusLabel = (status: RecipientActivity['status']) => {
    const labels = {
      sent: 'Envoyé',
      delivered: 'Livré',
      opened: 'Ouvert',
      clicked: 'Cliqué',
      bounced: 'Bounce',
      unsubscribed: 'Désabonné'
    };
    return labels[status];
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const paginatedRecipients = filteredRecipients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Total</div>
              <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Envoyés</div>
              <div className="text-xl font-bold text-blue-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Livrés</div>
              <div className="text-xl font-bold text-green-600">{stats.delivered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Ouverts</div>
              <div className="text-xl font-bold text-purple-600">{stats.opened}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Cliqués</div>
              <div className="text-xl font-bold text-orange-600">{stats.clicked}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Bounces</div>
              <div className="text-xl font-bold text-red-600">{stats.bounced}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-gray-600">Désabonnés</div>
              <div className="text-xl font-bold text-gray-600">{stats.unsubscribed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Activité par destinataire
            </CardTitle>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
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
              <option value="sent">Envoyé</option>
              <option value="delivered">Livré</option>
              <option value="opened">Ouvert</option>
              <option value="clicked">Cliqué</option>
              <option value="bounced">Bounce</option>
              <option value="unsubscribed">Désabonné</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-medium">Destinataire</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Envoyé</th>
                  <th className="pb-3 font-medium">Ouvert</th>
                  <th className="pb-3 font-medium">Cliqué</th>
                  <th className="pb-3 font-medium">Appareil</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecipients.map(recipient => {
                  const StatusIcon = getStatusIcon(recipient.status);
                  return (
                    <tr key={recipient.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {recipient.firstName} {recipient.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{recipient.email}</div>
                      </td>
                      <td className="py-3">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(recipient.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {getStatusLabel(recipient.status)}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{formatDate(recipient.sentAt)}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {recipient.openedAt ? (
                          <div>
                            <div>{formatDate(recipient.openedAt)}</div>
                            {recipient.openCount > 1 && (
                              <div className="text-xs text-gray-500">{recipient.openCount} fois</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {recipient.clickedAt ? (
                          <div>
                            <div>{formatDate(recipient.clickedAt)}</div>
                            {recipient.clickCount > 1 && (
                              <div className="text-xs text-gray-500">{recipient.clickCount} fois</div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-600">{recipient.device || '-'}</td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRecipient(recipient)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} ({filteredRecipients.length} résultats)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>Détails de l'activité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {selectedRecipient.firstName} {selectedRecipient.lastName}
                </h4>
                <p className="text-sm text-gray-600">{selectedRecipient.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Appareil</p>
                  <p className="font-medium">{selectedRecipient.device || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Localisation</p>
                  <p className="font-medium">{selectedRecipient.location || '-'}</p>
                </div>
              </div>

              {selectedRecipient.clickedLinks.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Liens cliqués</p>
                  <div className="space-y-1">
                    {selectedRecipient.clickedLinks.map((link, i) => (
                      <div key={i} className="text-sm text-blue-600 truncate">
                        {link}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={() => setSelectedRecipient(null)}>
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

