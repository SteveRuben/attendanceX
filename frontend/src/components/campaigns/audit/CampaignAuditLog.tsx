import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/badge';
import {
  FileText,
  Search,
  Filter,
  Download,
  User,
  Calendar,
  Activity
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'send' | 'pause' | 'resume' | 'approve' | 'reject';
  resourceType: 'campaign' | 'template' | 'automation' | 'settings';
  resourceId: string;
  resourceName: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

interface CampaignAuditLogProps {
  campaignId?: string;
  organizationId: string;
}

export const CampaignAuditLog: React.FC<CampaignAuditLogProps> = ({ campaignId, organizationId }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    loadAuditLogs();
  }, [campaignId, organizationId]);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, actionFilter, dateFilter, logs]);

  const loadAuditLogs = async () => {
    setLoading(true);

    const mockLogs: AuditLogEntry[] = Array.from({ length: 50 }, (_, i) => {
      const actions = ['create', 'update', 'send', 'pause', 'resume', 'approve'] as const;
      const actionType = actions[Math.floor(Math.random() * actions.length)];
      
      return {
        id: `log-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        userId: `user-${Math.floor(Math.random() * 10) + 1}`,
        userName: `Utilisateur ${Math.floor(Math.random() * 10) + 1}`,
        action: getActionLabel(actionType),
        actionType,
        resourceType: 'campaign',
        resourceId: campaignId || `campaign-${Math.floor(Math.random() * 20) + 1}`,
        resourceName: `Campagne ${Math.floor(Math.random() * 20) + 1}`,
        details: {
          changes: actionType === 'update' ? { subject: 'Nouveau sujet' } : undefined,
          recipients: actionType === 'send' ? Math.floor(Math.random() * 1000) : undefined
        },
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
    });

    mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resourceName.toLowerCase().includes(query)
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.actionType === actionFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  const getActionLabel = (actionType: AuditLogEntry['actionType']) => {
    const labels = {
      create: 'Création',
      update: 'Modification',
      delete: 'Suppression',
      send: 'Envoi',
      pause: 'Mise en pause',
      resume: 'Reprise',
      approve: 'Approbation',
      reject: 'Rejet'
    };
    return labels[actionType];
  };

  const getActionBadge = (actionType: AuditLogEntry['actionType']) => {
    const badges = {
      create: <Badge variant="default" className="bg-green-600">Création</Badge>,
      update: <Badge variant="default" className="bg-blue-600">Modification</Badge>,
      delete: <Badge variant="default" className="bg-red-600">Suppression</Badge>,
      send: <Badge variant="default" className="bg-purple-600">Envoi</Badge>,
      pause: <Badge variant="secondary">Pause</Badge>,
      resume: <Badge variant="default" className="bg-green-600">Reprise</Badge>,
      approve: <Badge variant="default" className="bg-green-600">Approbation</Badge>,
      reject: <Badge variant="default" className="bg-red-600">Rejet</Badge>
    };
    return badges[actionType];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Utilisateur', 'Action', 'Ressource', 'Détails'].join(','),
      ...filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.userName,
        log.action,
        log.resourceName,
        JSON.stringify(log.details)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
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
              <FileText className="h-5 w-5" />
              Journal d'audit
            </CardTitle>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher dans les logs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Toutes les actions</option>
              <option value="create">Création</option>
              <option value="update">Modification</option>
              <option value="send">Envoi</option>
              <option value="pause">Pause</option>
              <option value="resume">Reprise</option>
              <option value="approve">Approbation</option>
            </select>

            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredLogs.map(log => (
              <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getActionBadge(log.actionType)}
                      <span className="text-sm font-semibold text-gray-900">{log.resourceName}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{log.userName}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimestamp(log.timestamp)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>{log.ipAddress}</span>
                      </div>
                    </div>

                    {Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <details>
                          <summary className="cursor-pointer hover:text-gray-700">
                            Voir les détails
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Aucune entrée trouvée</p>
              </div>
            )}
          </div>

          {filteredLogs.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              Affichage de {filteredLogs.length} entrée(s) sur {logs.length}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

