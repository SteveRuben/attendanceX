/**
 * Composant d'historique de présence
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import {
  Calendar,
  Clock,
  TrendingUp,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Coffee,
  Eye
} from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { presenceApi } from '@/services/api/presence.api';
import { PresenceEntry } from '@attendance-x/shared';
import { formatTime, formatDate, formatDuration } from '@/utils/dateUtils';

interface PresenceHistoryProps {
  employeeId?: string;
  className?: string;
}

interface HistoryFilters {
  startDate: string;
  endDate: string;
  status: string;
  hasAnomalies: boolean;
}

export const PresenceHistory: React.FC<PresenceHistoryProps> = ({
  employeeId,
  className = ''
}) => {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PresenceEntry | null>(null);
  
  const [filters, setFilters] = useState<HistoryFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours
    endDate: new Date().toISOString().split('T')[0],
    status: 'all',
    hasAnomalies: false
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  });

  // Charger l'historique
  const loadHistory = async (page = 1) => {
    if (!employeeId) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        employeeId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page,
        limit: pagination.limit,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.hasAnomalies && { hasAnomalies: true })
      };

      const response = await presenceApi.listPresenceEntries(params);
      
      if (response.success) {
        if (page === 1) {
          setEntries(response.data);
        } else {
          setEntries(prev => [...prev, ...response.data]);
        }
        
        setPagination(prev => ({
          ...prev,
          page,
          total: response.pagination?.total || response.data.length,
          hasMore: response.pagination?.hasMore || false
        }));
      } else {
        setError(response.error || 'Erreur lors du chargement de l\'historique');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load presence history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Charger plus d'entrées
  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      loadHistory(pagination.page + 1);
    }
  };

  // Appliquer les filtres
  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadHistory(1);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'all',
      hasAnomalies: false
    });
  };

  // Exporter l'historique
  const exportHistory = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!employeeId) return;

    try {
      setLoading(true);
      
      const params = {
        employeeId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        format
      };

      const response = await presenceApi.exportPresenceData(params);
      
      if (response.success) {
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError(response.error || 'Erreur lors de l\'export');
      }
    } catch (err) {
      setError('Erreur lors de l\'export');
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le badge de statut
  const getStatusBadge = (entry: PresenceEntry) => {
    if (entry.clockOutTime) {
      return <Badge variant="success">Terminé</Badge>;
    }
    
    const activeBreak = entry.breakEntries?.find(b => !b.endTime);
    if (activeBreak) {
      return <Badge variant="warning">En pause</Badge>;
    }
    
    if (entry.clockInTime) {
      return <Badge variant="info">En cours</Badge>;
    }
    
    return <Badge variant="secondary">Absent</Badge>;
  };

  // Calculer les statistiques
  const getStats = () => {
    const totalHours = entries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const workingDays = entries.filter(entry => entry.clockInTime).length;
    const anomalies = entries.filter(entry => entry.hasAnomalies).length;
    const averageHours = workingDays > 0 ? totalHours / workingDays : 0;

    return {
      totalHours,
      workingDays,
      anomalies,
      averageHours,
      totalDays: entries.length
    };
  };

  const stats = getStats();

  // Charger les données au montage et quand les filtres changent
  useEffect(() => {
    if (employeeId) {
      loadHistory(1);
    }
  }, [employeeId]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Heures totales</p>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours travaillés</p>
                <p className="text-2xl font-bold">{stats.workingDays}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Moyenne/jour</p>
                <p className="text-2xl font-bold">{stats.averageHours.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalies</p>
                <p className="text-2xl font-bold text-orange-600">{stats.anomalies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique de présence</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportHistory('excel')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Du:</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Au:</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anomalies"
                checked={filters.hasAnomalies}
                onChange={(e) => setFilters(prev => ({ ...prev, hasAnomalies: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="anomalies" className="text-sm font-medium">
                Anomalies uniquement
              </label>
            </div>

            <Button onClick={applyFilters} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Appliquer
            </Button>

            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>

          <Tabs defaultValue="table" className="w-full">
            <TabsList>
              <TabsTrigger value="table">Tableau</TabsTrigger>
              <TabsTrigger value="calendar">Calendrier</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Arrivée</TableHead>
                    <TableHead>Sortie</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Pauses</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatDate(new Date(entry.date))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.clockInTime ? formatTime(new Date(entry.clockInTime)) : '--:--'}
                      </TableCell>
                      <TableCell>
                        {entry.clockOutTime ? formatTime(new Date(entry.clockOutTime)) : '--:--'}
                      </TableCell>
                      <TableCell>
                        {entry.totalHours ? `${entry.totalHours.toFixed(2)}h` : '--'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Coffee className="h-4 w-4 mr-1" />
                          {entry.breakEntries?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(entry)}
                          {entry.hasAnomalies && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Anomalie
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {entries.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucune entrée de présence trouvée</p>
                  <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
                </div>
              )}

              {pagination.hasMore && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Chargement...' : 'Charger plus'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>Vue calendrier en cours de développement</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Détails d'une entrée */}
      {selectedEntry && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Détails du {formatDate(new Date(selectedEntry.date))}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEntry(null)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Horaires</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Arrivée:</span>
                    <span className="font-medium">
                      {selectedEntry.clockInTime ? formatTime(new Date(selectedEntry.clockInTime)) : 'Non pointé'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sortie:</span>
                    <span className="font-medium">
                      {selectedEntry.clockOutTime ? formatTime(new Date(selectedEntry.clockOutTime)) : 'Non pointé'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Durée totale:</span>
                    <span className="font-medium">
                      {selectedEntry.totalHours ? `${selectedEntry.totalHours.toFixed(2)}h` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heures effectives:</span>
                    <span className="font-medium">
                      {selectedEntry.effectiveHours ? `${selectedEntry.effectiveHours.toFixed(2)}h` : '--'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Pauses</h4>
                {selectedEntry.breakEntries && selectedEntry.breakEntries.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEntry.breakEntries.map((breakEntry, index) => (
                      <div key={index} className="text-sm border rounded p-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{breakEntry.type}</span>
                          <span>
                            {breakEntry.duration ? formatDuration(breakEntry.duration * 1000) : '--'}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {breakEntry.startTime ? formatTime(new Date(breakEntry.startTime)) : '--'} - {' '}
                          {breakEntry.endTime ? formatTime(new Date(breakEntry.endTime)) : 'En cours'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Aucune pause</div>
                )}
              </div>
            </div>

            {selectedEntry.notes && (
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <div className="text-sm bg-muted p-3 rounded">
                  {selectedEntry.notes}
                </div>
              </div>
            )}

            {selectedEntry.hasAnomalies && selectedEntry.anomalyTypes && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Anomalies détectées:</div>
                  <div className="text-sm mt-1">
                    {selectedEntry.anomalyTypes.join(', ')}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};