import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Activity,
  TrendingUp,
  Download
} from 'lucide-react';
import { IntegrationProvider } from '@attendance-x/shared';
import { integrationService, type SyncHistory } from '@/services/integrationService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: string;
  provider: IntegrationProvider;
}

interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  lastSync: Date | null;
  avgDuration: number;
}

export const SyncHistoryModal: React.FC<SyncHistoryModalProps> = ({
  isOpen,
  onClose,
  integrationId,
  provider
}) => {
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    if (isOpen && integrationId) {
      loadSyncHistory();
    }
  }, [isOpen, integrationId]);

  const loadSyncHistory = async () => {
    setLoading(true);
    try {
      const response = await integrationService.getSyncHistory(integrationId);
      setSyncHistory(response.history);
      calculateStats(response.history);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history: SyncHistory[]) => {
    if (history.length === 0) {
      setStats({
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        lastSync: null,
        avgDuration: 0
      });
      return;
    }

    const successful = history.filter(h => h.status === 'success').length;
    const failed = history.filter(h => h.status === 'error').length;
    const totalDuration = history.reduce((sum, h) => sum + (h.duration || 0), 0);
    
    setStats({
      totalSyncs: history.length,
      successfulSyncs: successful,
      failedSyncs: failed,
      successRate: (successful / history.length) * 100,
      lastSync: history[0]?.startedAt || null,
      avgDuration: totalDuration / history.length
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.warning}>
        {status === 'success' ? 'Réussi' : 
         status === 'error' ? 'Échec' : 
         status === 'in_progress' ? 'En cours' : 'Attention'}
      </Badge>
    );
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const exportHistory = async () => {
    try {
      const csvContent = [
        ['Date', 'Type', 'Statut', 'Durée', 'Éléments', 'Erreurs'].join(','),
        ...syncHistory.map(h => [
          format(h.startedAt, 'dd/MM/yyyy HH:mm:ss', { locale: fr }),
          h.syncType,
          h.status,
          h.duration ? formatDuration(h.duration) : '',
          h.itemsProcessed || 0,
          h.errors?.join('; ') || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sync-history-${provider}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historique de synchronisation - {provider}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {syncHistory.length} synchronisation(s) enregistrée(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSyncHistory}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportHistory}
                  disabled={syncHistory.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </div>

            <div className="h-96 overflow-y-auto">
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Chargement...</span>
                  </div>
                ) : syncHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune synchronisation enregistrée
                  </div>
                ) : (
                  syncHistory.map((sync, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(sync.status)}
                          <span className="font-medium">
                            {sync.syncType === 'calendar' ? 'Calendrier' : 
                             sync.syncType === 'contacts' ? 'Contacts' : 
                             sync.syncType}
                          </span>
                          {getStatusBadge(sync.status)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(sync.startedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {sync.duration && (
                          <div>
                            <span className="text-gray-500">Durée:</span>
                            <span className="ml-1">{formatDuration(sync.duration)}</span>
                          </div>
                        )}
                        {sync.itemsProcessed !== undefined && (
                          <div>
                            <span className="text-gray-500">Éléments:</span>
                            <span className="ml-1">{sync.itemsProcessed}</span>
                          </div>
                        )}
                        {sync.itemsCreated !== undefined && (
                          <div>
                            <span className="text-gray-500">Créés:</span>
                            <span className="ml-1 text-green-600">{sync.itemsCreated}</span>
                          </div>
                        )}
                        {sync.itemsUpdated !== undefined && (
                          <div>
                            <span className="text-gray-500">Modifiés:</span>
                            <span className="ml-1 text-blue-600">{sync.itemsUpdated}</span>
                          </div>
                        )}
                        {sync.itemsDeleted !== undefined && (
                          <div>
                            <span className="text-gray-500">Supprimés:</span>
                            <span className="ml-1 text-red-600">{sync.itemsDeleted}</span>
                          </div>
                        )}
                      </div>

                      {sync.errors && sync.errors.length > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-500">Erreurs:</span>
                          <div className="ml-1 text-red-600">
                            {sync.errors.map((error, idx) => (
                              <div key={idx}>{error}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalSyncs}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Réussies</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{stats.successfulSyncs}</p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Échecs</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900">{stats.failedSyncs}</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">Taux de réussite</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.successRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Dernière synchronisation
                    </h4>
                    <p className="text-gray-600">
                      {stats.lastSync 
                        ? format(stats.lastSync, 'dd/MM/yyyy à HH:mm', { locale: fr })
                        : 'Aucune synchronisation'
                      }
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Durée moyenne
                    </h4>
                    <p className="text-gray-600">
                      {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : 'N/A'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};