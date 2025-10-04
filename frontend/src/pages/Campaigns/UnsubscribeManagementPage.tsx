import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import {
  UserX,
  Search,
  Download,
  Upload,
  Filter,
  Calendar,
  Mail,
  RotateCcw,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UnsubscribedContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribedAt: string;
  reason?: string;
  campaignId?: string;
  campaignName?: string;
  canResubscribe: boolean;
}

interface UnsubscribeStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  byReason: Record<string, number>;
}

export const UnsubscribeManagementPage: React.FC = () => {
  const { organization } = useAuth();
  const [contacts, setContacts] = useState<UnsubscribedContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<UnsubscribedContact[]>([]);
  const [stats, setStats] = useState<UnsubscribeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUnsubscribedContacts();
  }, [organization?.organizationId]);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, selectedReason, contacts]);

  const loadUnsubscribedContacts = async () => {
    try {
      setLoading(true);

      const mockContacts: UnsubscribedContact[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          unsubscribedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'too_frequent',
          campaignId: 'camp-1',
          campaignName: 'Newsletter Hebdomadaire',
          canResubscribe: true
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          unsubscribedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'not_relevant',
          campaignId: 'camp-2',
          campaignName: 'Annonces Produits',
          canResubscribe: true
        },
        {
          id: '3',
          email: 'bob.wilson@example.com',
          firstName: 'Bob',
          lastName: 'Wilson',
          unsubscribedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'spam',
          canResubscribe: false
        }
      ];

      const mockStats: UnsubscribeStats = {
        total: 156,
        thisMonth: 23,
        thisWeek: 8,
        byReason: {
          too_frequent: 45,
          not_relevant: 38,
          spam: 12,
          other: 28,
          no_reason: 33
        }
      };

      setContacts(mockContacts);
      setFilteredContacts(mockContacts);
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading unsubscribed contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.email.toLowerCase().includes(query) ||
          c.firstName?.toLowerCase().includes(query) ||
          c.lastName?.toLowerCase().includes(query)
      );
    }

    if (selectedReason !== 'all') {
      filtered = filtered.filter(c => c.reason === selectedReason);
    }

    setFilteredContacts(filtered);
  };

  const handleResubscribe = async (contactId: string) => {
    console.log('Resubscribe:', contactId);
  };

  const handleBulkResubscribe = async () => {
    console.log('Bulk resubscribe:', Array.from(selectedContacts));
  };

  const handleDelete = async (contactId: string) => {
    console.log('Delete:', contactId);
  };

  const handleBulkDelete = async () => {
    console.log('Bulk delete:', Array.from(selectedContacts));
  };

  const handleExportData = async (contactId: string) => {
    console.log('Export data for:', contactId);
  };

  const handleExportAll = async () => {
    console.log('Export all unsubscribed contacts');
  };

  const toggleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const getReasonLabel = (reason?: string) => {
    const labels: Record<string, string> = {
      too_frequent: 'Trop fréquent',
      not_relevant: 'Non pertinent',
      spam: 'Spam',
      other: 'Autre',
      no_reason: 'Aucune raison'
    };
    return labels[reason || 'no_reason'] || 'Inconnu';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des désabonnements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les contacts désabonnés et leurs préférences
          </p>
        </div>
        <Button onClick={handleExportAll} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter tout
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <UserX className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ce mois</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.thisMonth}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cette semaine</p>
                  <p className="text-2xl font-bold text-red-600">{stats.thisWeek}</p>
                </div>
                <Calendar className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Raison principale</p>
                  <p className="text-sm font-medium text-gray-900">
                    {getReasonLabel(Object.keys(stats.byReason).reduce((a, b) => 
                      stats.byReason[a] > stats.byReason[b] ? a : b
                    ))}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contacts désabonnés</CardTitle>
            {selectedContacts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedContacts.size} sélectionné{selectedContacts.size > 1 ? 's' : ''}
                </span>
                <Button size="sm" variant="outline" onClick={handleBulkResubscribe}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réabonner
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            )}
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
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Toutes les raisons</option>
              <option value="too_frequent">Trop fréquent</option>
              <option value="not_relevant">Non pertinent</option>
              <option value="spam">Spam</option>
              <option value="other">Autre</option>
              <option value="no_reason">Aucune raison</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border-b font-medium text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300"
              />
              <div className="flex-1">Contact</div>
              <div className="w-32">Raison</div>
              <div className="w-40">Date</div>
              <div className="w-48">Actions</div>
            </div>

            {filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedContacts.has(contact.id)}
                  onChange={() => toggleSelectContact(contact.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{contact.email}</div>
                  {contact.campaignName && (
                    <div className="text-xs text-gray-500 mt-1">
                      Campagne: {contact.campaignName}
                    </div>
                  )}
                </div>
                <div className="w-32">
                  <Badge variant="secondary">{getReasonLabel(contact.reason)}</Badge>
                </div>
                <div className="w-40 text-sm text-gray-600">
                  {formatDate(contact.unsubscribedAt)}
                </div>
                <div className="w-48 flex items-center gap-2">
                  {contact.canResubscribe && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResubscribe(contact.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Réabonner
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExportData(contact.id)}
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(contact.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredContacts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun contact désabonné trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

