/**
 * Composant de gestion des relances de paiement
 * Interface pour créer, suivre et gérer les processus de recouvrement
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Input } from '../ui/Input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { 
  AlertTriangle, 
  Play, 
  Pause, 
  X, 
  Eye, 
  MoreHorizontal,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Activity
} from 'lucide-react';
import { 
  dunningService, 
  DunningProcess, 
  DunningStatus, 
  DunningStats,
  CreateDunningProcessRequest 
} from '../../services/dunningService';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';

export const DunningManagement: React.FC = () => {
  const [processes, setProcesses] = useState<DunningProcess[]>([]);
  const [stats, setStats] = useState<DunningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState<DunningStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<DunningProcess | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [processesData, statsData] = await Promise.all([
        dunningService.getDunningProcesses(statusFilter),
        dunningService.getDunningStats(30)
      ]);
      
      setProcesses(processesData.processes);
      setStats(statsData);
    } catch (err) {
      setError('Erreur lors du chargement des données de relance');
      console.error('Error loading dunning data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteStep = async (processId: string) => {
    try {
      await dunningService.executeNextStep(processId);
      await loadData(); // Recharger les données
    } catch (err) {
      setError('Erreur lors de l\'exécution de l\'étape');
      console.error('Error executing step:', err);
    }
  };

  const handlePauseProcess = async (processId: string) => {
    try {
      await dunningService.pauseDunningProcess(processId, 'Suspendu manuellement');
      await loadData();
    } catch (err) {
      setError('Erreur lors de la suspension du processus');
      console.error('Error pausing process:', err);
    }
  };

  const handleResumeProcess = async (processId: string) => {
    try {
      await dunningService.resumeDunningProcess(processId);
      await loadData();
    } catch (err) {
      setError('Erreur lors de la reprise du processus');
      console.error('Error resuming process:', err);
    }
  };

  const handleCancelProcess = async (processId: string) => {
    try {
      await dunningService.cancelDunningProcess(processId, 'Annulé manuellement');
      await loadData();
    } catch (err) {
      setError('Erreur lors de l\'annulation du processus');
      console.error('Error cancelling process:', err);
    }
  };

  const getStatusBadge = (status: DunningStatus) => {
    const config = {
      [DunningStatus.ACTIVE]: { variant: 'default' as const, color: 'bg-blue-500' },
      [DunningStatus.PAUSED]: { variant: 'secondary' as const, color: 'bg-yellow-500' },
      [DunningStatus.COMPLETED]: { variant: 'default' as const, color: 'bg-green-500' },
      [DunningStatus.CANCELLED]: { variant: 'outline' as const, color: 'bg-gray-500' },
      [DunningStatus.FAILED]: { variant: 'destructive' as const, color: 'bg-red-500' }
    };

    const { variant, color } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        {dunningService.getStatusLabel(status)}
      </Badge>
    );
  };

  const getStatusIcon = (status: DunningStatus) => {
    const icons = {
      [DunningStatus.ACTIVE]: <Activity className="h-4 w-4 text-blue-500" />,
      [DunningStatus.PAUSED]: <Pause className="h-4 w-4 text-yellow-500" />,
      [DunningStatus.COMPLETED]: <CheckCircle className="h-4 w-4 text-green-500" />,
      [DunningStatus.CANCELLED]: <XCircle className="h-4 w-4 text-gray-500" />,
      [DunningStatus.FAILED]: <AlertCircle className="h-4 w-4 text-red-500" />
    };
    
    return icons[status];
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
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestion des relances</h1>
          <p className="text-gray-600 mt-1">
            Suivez et gérez les processus de recouvrement des factures impayées
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle relance
        </Button>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="processes">Processus</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques générales */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processus actifs</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.activeProcesses}</div>
                  <p className="text-xs text-muted-foreground">
                    sur {stats.stats.totalProcesses} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taux de recouvrement</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.recoveryRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.stats.recoveredAmount)} récupérés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Montant total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.stats.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Période de {stats.period.days} jours
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processus terminés</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.completedProcesses}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.stats.cancelledProcesses} annulés, {stats.stats.failedProcesses} échoués
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processus nécessitant une attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Processus nécessitant une attention
              </CardTitle>
              <CardDescription>
                Processus échoués ou en retard d'exécution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processes
                  .filter(process => dunningService.requiresAttention(process))
                  .slice(0, 5)
                  .map((process) => (
                    <div key={process.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(process.status)}
                        <div>
                          <p className="font-medium">
                            Facture {process.metadata?.invoiceNumber || process.invoiceId}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(process.metadata?.invoiceAmount || 0)} - 
                            Étape {process.currentStep}/{process.totalSteps}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(process.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProcess(process)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                
                {processes.filter(process => dunningService.requiresAttention(process)).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucun processus ne nécessite d'attention particulière</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Statut:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {statusFilter === 'all' ? 'Tous' : dunningService.getStatusLabel(statusFilter)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        Tous les statuts
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter(DunningStatus.ACTIVE)}>
                        Actifs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter(DunningStatus.PAUSED)}>
                        Suspendus
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter(DunningStatus.COMPLETED)}>
                        Terminés
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter(DunningStatus.FAILED)}>
                        Échoués
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des processus */}
          <Card>
            <CardHeader>
              <CardTitle>Processus de relance</CardTitle>
              <CardDescription>
                {processes.length} processus trouvés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facture</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Progression</TableHead>
                      <TableHead>Prochaine action</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Aucun processus de relance trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      processes.map((process) => (
                        <TableRow key={process.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {process.metadata?.invoiceNumber || process.invoiceId}
                              </p>
                              <p className="text-sm text-gray-600">
                                Démarré {formatRelativeTime(process.startedAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {formatCurrency(process.metadata?.invoiceAmount || 0)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(process.status)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Étape {process.currentStep}/{process.totalSteps}</span>
                                <span>{dunningService.getProcessProgress(process)}%</span>
                              </div>
                              <Progress value={dunningService.getProcessProgress(process)} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {process.nextActionAt ? (
                              <div>
                                <p className="text-sm">
                                  {formatDate(process.nextActionAt)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {formatRelativeTime(process.nextActionAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setSelectedProcess(process)}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir les détails
                                </DropdownMenuItem>
                                
                                {process.status === DunningStatus.ACTIVE && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleExecuteStep(process.id)}
                                      className="flex items-center gap-2"
                                    >
                                      <Play className="h-4 w-4" />
                                      Exécuter l'étape
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handlePauseProcess(process.id)}
                                      className="flex items-center gap-2"
                                    >
                                      <Pause className="h-4 w-4" />
                                      Suspendre
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                {process.status === DunningStatus.PAUSED && (
                                  <DropdownMenuItem 
                                    onClick={() => handleResumeProcess(process.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Play className="h-4 w-4" />
                                    Reprendre
                                  </DropdownMenuItem>
                                )}
                                
                                {[DunningStatus.ACTIVE, DunningStatus.PAUSED].includes(process.status) && (
                                  <DropdownMenuItem 
                                    onClick={() => handleCancelProcess(process.id)}
                                    className="flex items-center gap-2 text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                    Annuler
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {/* Graphiques et analyses détaillées */}
          <Card>
            <CardHeader>
              <CardTitle>Analyses des relances</CardTitle>
              <CardDescription>
                Statistiques détaillées sur les performances de recouvrement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>Analyses détaillées à venir</p>
                <p className="text-sm">Graphiques de performance, tendances et prédictions</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de création de processus */}
      <CreateDunningProcessDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProcessCreated={loadData}
      />

      {/* Dialog de détails du processus */}
      {selectedProcess && (
        <ProcessDetailsDialog
          process={selectedProcess}
          onClose={() => setSelectedProcess(null)}
          onProcessUpdated={loadData}
        />
      )}
    </div>
  );
};

// Composant pour créer un nouveau processus
const CreateDunningProcessDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessCreated: () => void;
}> = ({ open, onOpenChange, onProcessCreated }) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!invoiceId.trim()) return;

    try {
      setCreating(true);
      await dunningService.createDunningProcess({ invoiceId: invoiceId.trim() });
      onProcessCreated();
      onOpenChange(false);
      setInvoiceId('');
    } catch (error) {
      console.error('Error creating dunning process:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un processus de relance</DialogTitle>
          <DialogDescription>
            Démarrer un nouveau processus de recouvrement pour une facture impayée
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">ID de la facture</label>
            <Input
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="Entrez l'ID de la facture"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!invoiceId.trim() || creating}>
            {creating ? 'Création...' : 'Créer le processus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Composant pour afficher les détails d'un processus
const ProcessDetailsDialog: React.FC<{
  process: DunningProcess;
  onClose: () => void;
  onProcessUpdated: () => void;
}> = ({ process, onClose, onProcessUpdated }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Détails du processus de relance
          </DialogTitle>
          <DialogDescription>
            Facture {process.metadata?.invoiceNumber || process.invoiceId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Statut</label>
              <div className="mt-1">
                {/* Utiliser la fonction getStatusBadge du composant parent */}
                <Badge>{dunningService.getStatusLabel(process.status)}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Progression</label>
              <div className="mt-1">
                <Progress value={dunningService.getProcessProgress(process)} />
                <p className="text-sm text-gray-600 mt-1">
                  Étape {process.currentStep} sur {process.totalSteps}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center py-4">
            <p className="text-gray-500">Détails complets du processus à implémenter</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DunningManagement;