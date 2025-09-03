/**
 * Composant de gestion des anomalies de présence
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Eye,
  MessageSquare,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';

// Local type definition since it's not available in shared package
interface PresenceAnomaly {
  entryId: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  types: string[];
  severity: 'low' | 'medium' | 'high';
  status?: 'new' | 'investigating' | 'resolved' | 'dismissed';
  details?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}


interface AnomalyManagementProps {
  organizationId?: string;
  anomalies?: PresenceAnomaly[];
  onRefresh?: () => void;
  className?: string;
}

interface AnomalyAction {
  id: string;
  action: 'approve' | 'correct' | 'investigate' | 'dismiss';
  notes: string;
  followUp?: boolean;
}

export const AnomalyManagement: React.FC<AnomalyManagementProps> = ({
  organizationId,
  anomalies = [],
  onRefresh,
  className = ''
}) => {
  const [filteredAnomalies, setFilteredAnomalies] = useState<PresenceAnomaly[]>(anomalies);
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<PresenceAnomaly | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [batchActionDialog, setBatchActionDialog] = useState(false);
  const [actionData, setActionData] = useState<AnomalyAction>({
    id: '',
    action: 'investigate',
    notes: '',
    followUp: false
  });
  const [loading, setLoading] = useState(false);

  // Filtrer les anomalies
  React.useEffect(() => {
    let filtered = anomalies.filter(anomaly => {
      const matchesSearch = !searchTerm ||
        anomaly.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anomaly.types.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeverity = severityFilter === 'all' || anomaly.severity === severityFilter;
      const matchesType = typeFilter === 'all' || anomaly.types.includes(typeFilter);
      const matchesStatus = statusFilter === 'all' || anomaly.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesType && matchesStatus;
    });

    setFilteredAnomalies(filtered);
  }, [anomalies, searchTerm, severityFilter, typeFilter, statusFilter]);

  // Obtenir le badge de sévérité
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">Élevée</Badge>;
      case 'medium':
        return <Badge variant="secondary">Moyenne</Badge>;
      case 'low':
        return <Badge variant="secondary">Faible</Badge>;
      default:
        return <Badge variant="outline">Inconnue</Badge>;
    }
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Résolue</Badge>;
      case 'investigating':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'dismissed':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Ignorée</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Nouvelle</Badge>;
    }
  };

  // Obtenir l'icône du type d'anomalie
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'late_arrival':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'early_departure':
        return <Clock className="h-4 w-4 text-red-500" />;
      case 'missing_clock_out':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'location_anomaly':
        return <MapPin className="h-4 w-4 text-purple-500" />;
      case 'long_break':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Traduire les types d'anomalies
  const translateAnomalyType = (type: string) => {
    const translations: Record<string, string> = {
      'late_arrival': 'Arrivée tardive',
      'early_departure': 'Départ anticipé',
      'missing_clock_out': 'Oubli de pointage sortie',
      'location_anomaly': 'Anomalie de localisation',
      'long_break': 'Pause prolongée',
      'overtime': 'Heures supplémentaires',
      'short_day': 'Journée courte',
      'duplicate_entry': 'Entrée dupliquée'
    };
    return translations[type] || type;
  };

  // Gérer la sélection d'anomalies
  const handleSelectAnomaly = (anomalyId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnomalies(prev => [...prev, anomalyId]);
    } else {
      setSelectedAnomalies(prev => prev.filter(id => id !== anomalyId));
    }
  };

  // Sélectionner toutes les anomalies
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAnomalies(filteredAnomalies.map(a => `${a.entryId}-${a.types.join('-')}`));
    } else {
      setSelectedAnomalies([]);
    }
  };

  // Traiter une anomalie
  const handleProcessAnomaly = async (anomaly: PresenceAnomaly, action: AnomalyAction) => {
    try {
      setLoading(true);

      // Simuler le traitement de l'anomalie
      console.log('Processing anomaly:', anomaly, action);

      // En production, appeler l'API appropriée
      // await presenceApi.processAnomaly(anomaly.entryId, action);

      onRefresh?.();
      setActionDialog(false);
      setSelectedAnomaly(null);
      setActionData({ id: '', action: 'investigate', notes: '', followUp: false });
    } catch (error) {
      console.error('Failed to process anomaly:', error);
    } finally {
      setLoading(false);
    }
  };

  // Traitement en lot
  const handleBatchProcess = async (action: string, notes: string) => {
    try {
      setLoading(true);

      // Simuler le traitement en lot
      console.log('Batch processing:', selectedAnomalies, action, notes);

      // En production, appeler l'API de traitement en lot
      // await presenceApi.batchProcessAnomalies(selectedAnomalies, action, notes);

      onRefresh?.();
      setBatchActionDialog(false);
      setSelectedAnomalies([]);
    } catch (error) {
      console.error('Failed to batch process anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les statistiques des anomalies
  const getAnomalyStats = () => {
    const total = filteredAnomalies.length;
    const high = filteredAnomalies.filter(a => a.severity === 'high').length;
    const medium = filteredAnomalies.filter(a => a.severity === 'medium').length;
    const low = filteredAnomalies.filter(a => a.severity === 'low').length;
    const resolved = filteredAnomalies.filter(a => a.status === 'resolved').length;

    return { total, high, medium, low, resolved };
  };

  const stats = getAnomalyStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques des anomalies */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <div className="text-sm text-muted-foreground">Élevée</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.medium}</div>
            <div className="text-sm text-muted-foreground">Moyenne</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.low}</div>
            <div className="text-sm text-muted-foreground">Faible</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Résolues</div>
          </CardContent>
        </Card>
      </div>

      {/* Gestion des anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Anomalies de présence ({filteredAnomalies.length})
            </span>
            <div className="flex items-center space-x-2">
              {selectedAnomalies.length > 0 && (
                <Dialog open={batchActionDialog} onOpenChange={setBatchActionDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Traiter la sélection ({selectedAnomalies.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Traitement en lot</DialogTitle>
                      <DialogDescription>
                        Traiter {selectedAnomalies.length} anomalie(s) sélectionnée(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select defaultValue="investigate">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investigate">Enquêter</SelectItem>
                          <SelectItem value="approve">Approuver</SelectItem>
                          <SelectItem value="dismiss">Ignorer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Notes sur le traitement..." />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBatchActionDialog(false)}>
                        Annuler
                      </Button>
                      <Button onClick={() => handleBatchProcess('investigate', '')}>
                        Traiter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Rechercher une anomalie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sévérités</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="late_arrival">Retard</SelectItem>
                <SelectItem value="early_departure">Départ anticipé</SelectItem>
                <SelectItem value="missing_clock_out">Oubli sortie</SelectItem>
                <SelectItem value="location_anomaly">Localisation</SelectItem>
                <SelectItem value="long_break">Pause longue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="new">Nouvelles</SelectItem>
                <SelectItem value="investigating">En cours</SelectItem>
                <SelectItem value="resolved">Résolues</SelectItem>
                <SelectItem value="dismissed">Ignorées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tableau des anomalies */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedAnomalies.length === filteredAnomalies.length && filteredAnomalies.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Employé</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Types</TableHead>
                <TableHead>Sévérité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnomalies.map((anomaly) => {
                const anomalyId = `${anomaly.entryId}-${anomaly.types.join('-')}`;
                return (
                  <TableRow key={anomalyId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAnomalies.includes(anomalyId)}
                        onCheckedChange={(checked) => handleSelectAnomaly(anomalyId, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{anomaly.employeeName}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {anomaly.employeeId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(new Date(anomaly.date))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {anomaly.types.map((type) => (
                          <div key={type} className="flex items-center space-x-1">
                            {getTypeIcon(type)}
                            <span className="text-xs">{translateAnomalyType(type)}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSeverityBadge(anomaly.severity)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(anomaly.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAnomaly(anomaly)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Détails de l'anomalie</DialogTitle>
                              <DialogDescription>
                                {anomaly.employeeName} - {formatDate(new Date(anomaly.date))}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Types d'anomalies</label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {anomaly.types.map((type) => (
                                      <Badge key={type} variant="outline">
                                        {translateAnomalyType(type)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Sévérité</label>
                                  <div className="mt-1">
                                    {getSeverityBadge(anomaly.severity)}
                                  </div>
                                </div>
                              </div>

                              {anomaly.details && (
                                <div>
                                  <label className="text-sm font-medium">Détails</label>
                                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(anomaly.details, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedAnomaly(anomaly);
                                  setActionDialog(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Traiter
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={actionDialog} onOpenChange={setActionDialog}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Traiter l'anomalie</DialogTitle>
                              <DialogDescription>
                                Comment souhaitez-vous traiter cette anomalie ?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select
                                value={actionData.action}
                                onValueChange={(value: any) => setActionData(prev => ({ ...prev, action: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="investigate">Enquêter</SelectItem>
                                  <SelectItem value="approve">Approuver (pas d'action)</SelectItem>
                                  <SelectItem value="correct">Corriger l'entrée</SelectItem>
                                  <SelectItem value="dismiss">Ignorer</SelectItem>
                                </SelectContent>
                              </Select>

                              <Textarea
                                placeholder="Notes sur le traitement..."
                                value={actionData.notes}
                                onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                              />

                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="followUp"
                                  checked={actionData.followUp}
                                  onCheckedChange={(checked) => setActionData(prev => ({ ...prev, followUp: checked as boolean }))}
                                />
                                <label htmlFor="followUp" className="text-sm">
                                  Programmer un suivi
                                </label>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setActionDialog(false)}>
                                Annuler
                              </Button>
                              <Button
                                onClick={() => selectedAnomaly && handleProcessAnomaly(selectedAnomaly, actionData)}
                                disabled={loading}
                              >
                                {loading ? 'Traitement...' : 'Traiter'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredAnomalies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Aucune anomalie trouvée</p>
              <p className="text-sm">
                {anomalies.length === 0
                  ? 'Aucune anomalie détectée'
                  : 'Ajustez vos filtres pour voir plus de résultats'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};