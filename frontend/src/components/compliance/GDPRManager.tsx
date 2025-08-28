/**
 * Composant de gestion de la conformité GDPR
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Progress,
  Separator
} from '@/components/ui';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Database,
  Lock,
  Unlock,
  Calendar,
  BarChart3,
  Settings,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatDuration } from '@/utils/dateUtils';

interface GDPRRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestedBy: string;
  reason?: string;
  data?: any;
}

interface DataRetentionInfo {
  dataType: string;
  description: string;
  retentionPeriod: number;
  currentCount: number;
  oldestRecord: Date;
  canBeDeleted: number;
  legalBasis: string;
}

interface ComplianceStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageProcessingTime: number;
  complianceRate: number;
  dataSubjects: number;
}

export const GDPRManager: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les demandes GDPR
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
  const [requestDialog, setRequestDialog] = useState(false);

  // États pour la rétention des données
  const [retentionInfo, setRetentionInfo] = useState<DataRetentionInfo[]>([]);
  const [cleanupDialog, setCleanupDialog] = useState(false);

  // États pour les statistiques
  const [complianceStats, setComplianceStats] = useState<ComplianceStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    averageProcessingTime: 0,
    complianceRate: 0,
    dataSubjects: 0
  });

  // États pour les nouvelles demandes
  const [newRequest, setNewRequest] = useState({
    employeeId: '',
    type: 'access' as GDPRRequest['type'],
    reason: ''
  });

  useEffect(() => {
    loadGDPRData();
  }, []);

  const loadGDPRData = async () => {
    setLoading(true);
    try {
      // Charger les demandes GDPR
      await loadGDPRRequests();
      
      // Charger les informations de rétention
      await loadRetentionInfo();
      
      // Charger les statistiques
      await loadComplianceStats();
    } catch (err) {
      setError('Erreur lors du chargement des données GDPR');
    } finally {
      setLoading(false);
    }
  };

  const loadGDPRRequests = async () => {
    // Simuler le chargement des demandes GDPR
    const mockRequests: GDPRRequest[] = [
      {
        id: 'req-1',
        employeeId: 'emp-1',
        employeeName: 'Jean Dupont',
        type: 'access',
        status: 'completed',
        requestDate: new Date('2024-01-15'),
        completionDate: new Date('2024-01-20'),
        requestedBy: 'emp-1',
        reason: 'Demande d\'accès aux données personnelles'
      },
      {
        id: 'req-2',
        employeeId: 'emp-2',
        employeeName: 'Marie Martin',
        type: 'erasure',
        status: 'pending',
        requestDate: new Date('2024-01-20'),
        requestedBy: 'emp-2',
        reason: 'Demande de suppression après départ'
      }
    ];
    setGdprRequests(mockRequests);
  };

  const loadRetentionInfo = async () => {
    // Simuler le chargement des informations de rétention
    const mockRetentionInfo: DataRetentionInfo[] = [
      {
        dataType: 'presence_entries',
        description: 'Données de pointage',
        retentionPeriod: 2555, // 7 ans
        currentCount: 15420,
        oldestRecord: new Date('2017-01-01'),
        canBeDeleted: 1250,
        legalBasis: 'Obligation légale - Code du travail'
      },
      {
        dataType: 'location_data',
        description: 'Données de géolocalisation',
        retentionPeriod: 90, // 3 mois
        currentCount: 8750,
        oldestRecord: new Date('2023-10-01'),
        canBeDeleted: 2100,
        legalBasis: 'Intérêt légitime - Sécurité'
      },
      {
        dataType: 'audit_logs',
        description: 'Journaux d\'audit',
        retentionPeriod: 1095, // 3 ans
        currentCount: 45600,
        oldestRecord: new Date('2021-01-01'),
        canBeDeleted: 5200,
        legalBasis: 'Obligation légale - Audit'
      }
    ];
    setRetentionInfo(mockRetentionInfo);
  };

  const loadComplianceStats = async () => {
    // Simuler le chargement des statistiques
    setComplianceStats({
      totalRequests: 25,
      pendingRequests: 3,
      completedRequests: 22,
      averageProcessingTime: 5.2, // jours
      complianceRate: 96, // %
      dataSubjects: 150
    });
  };

  const submitGDPRRequest = async () => {
    if (!newRequest.employeeId || !newRequest.type) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Simuler la soumission de la demande
      const request: GDPRRequest = {
        id: `req-${Date.now()}`,
        employeeId: newRequest.employeeId,
        employeeName: 'Employé Test', // À récupérer depuis l'API
        type: newRequest.type,
        status: 'pending',
        requestDate: new Date(),
        requestedBy: user?.id || '',
        reason: newRequest.reason
      };

      setGdprRequests(prev => [request, ...prev]);
      setNewRequest({ employeeId: '', type: 'access', reason: '' });
      setRequestDialog(false);
      
      // Mettre à jour les statistiques
      setComplianceStats(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        pendingRequests: prev.pendingRequests + 1
      }));

    } catch (err) {
      setError('Erreur lors de la soumission de la demande');
    }
  };

  const processGDPRRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const updatedRequests = gdprRequests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status: action === 'approve' ? 'processing' as const : 'rejected' as const,
            completionDate: action === 'reject' ? new Date() : undefined
          };
        }
        return req;
      });

      setGdprRequests(updatedRequests);
      
      // Simuler le traitement automatique si approuvé
      if (action === 'approve') {
        setTimeout(() => {
          setGdprRequests(prev => prev.map(req => {
            if (req.id === requestId && req.status === 'processing') {
              return {
                ...req,
                status: 'completed',
                completionDate: new Date()
              };
            }
            return req;
          }));
        }, 2000);
      }

    } catch (err) {
      setError('Erreur lors du traitement de la demande');
    }
  };

  const performDataCleanup = async (dataType: string) => {
    try {
      setLoading(true);
      
      // Simuler le nettoyage des données
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mettre à jour les informations de rétention
      setRetentionInfo(prev => prev.map(info => {
        if (info.dataType === dataType) {
          return {
            ...info,
            currentCount: info.currentCount - info.canBeDeleted,
            canBeDeleted: 0,
            oldestRecord: new Date()
          };
        }
        return info;
      }));

      setCleanupDialog(false);
    } catch (err) {
      setError('Erreur lors du nettoyage des données');
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async (requestId: string) => {
    try {
      // Simuler l'export des données
      const request = gdprRequests.find(r => r.id === requestId);
      if (!request) return;

      // Créer un fichier JSON simulé
      const userData = {
        exportDate: new Date().toISOString(),
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        data: {
          presenceEntries: [],
          leaveRequests: [],
          personalData: {}
        }
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-export-${request.employeeId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Erreur lors de l\'export des données');
    }
  };

  const getStatusBadge = (status: GDPRRequest['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>;
      case 'processing':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const getTypeBadge = (type: GDPRRequest['type']) => {
    const typeLabels = {
      access: 'Accès',
      rectification: 'Rectification',
      erasure: 'Effacement',
      portability: 'Portabilité',
      restriction: 'Limitation'
    };
    
    return <Badge variant="outline">{typeLabels[type]}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="h-8 w-8 mr-3 text-blue-600" />
            Gestion GDPR
          </h1>
          <p className="text-muted-foreground">
            Conformité et protection des données personnelles
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle demande GDPR</DialogTitle>
                <DialogDescription>
                  Créer une nouvelle demande de traitement des données personnelles
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>ID Employé</Label>
                  <Input
                    value={newRequest.employeeId}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <Label>Type de demande</Label>
                  <Select
                    value={newRequest.type}
                    onValueChange={(value) => setNewRequest(prev => ({ ...prev, type: value as GDPRRequest['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access">Accès aux données</SelectItem>
                      <SelectItem value="rectification">Rectification</SelectItem>
                      <SelectItem value="erasure">Effacement</SelectItem>
                      <SelectItem value="portability">Portabilité</SelectItem>
                      <SelectItem value="restriction">Limitation du traitement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Motif (optionnel)</Label>
                  <Textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Motif de la demande..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={submitGDPRRequest}>
                  Soumettre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistiques de conformité */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Demandes totales</p>
                <p className="text-2xl font-bold">{complianceStats.totalRequests}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-orange-600">{complianceStats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de conformité</p>
                <p className="text-2xl font-bold text-green-600">{complianceStats.complianceRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps moyen</p>
                <p className="text-2xl font-bold">{complianceStats.averageProcessingTime}j</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Demandes GDPR
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Rétention des données
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Rapports de conformité
          </TabsTrigger>
        </TabsList>

        {/* Onglet Demandes GDPR */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demandes GDPR</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date de demande</TableHead>
                    <TableHead>Délai restant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gdprRequests.map((request) => {
                    const daysRemaining = request.status === 'pending' || request.status === 'processing'
                      ? Math.max(0, 30 - Math.floor((Date.now() - request.requestDate.getTime()) / (1000 * 60 * 60 * 24)))
                      : null;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.employeeName}</div>
                            <div className="text-sm text-muted-foreground">{request.employeeId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(request.type)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(request.requestDate)}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null && (
                            <div className={`text-sm ${daysRemaining <= 5 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              {daysRemaining} jours
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => processGDPRRequest(request.id, 'approve')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => processGDPRRequest(request.id, 'reject')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {(request.status === 'completed' && (request.type === 'access' || request.type === 'portability')) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportUserData(request.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Rétention des données */}
        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Politiques de rétention des données</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {retentionInfo.map((info) => (
                <div key={info.dataType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{info.description}</h3>
                      <p className="text-sm text-muted-foreground">{info.legalBasis}</p>
                    </div>
                    <Badge variant="outline">
                      {Math.floor(info.retentionPeriod / 365)} ans
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total d'enregistrements</p>
                      <p className="text-lg font-medium">{info.currentCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Plus ancien</p>
                      <p className="text-lg font-medium">{formatDate(info.oldestRecord)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Peut être supprimé</p>
                      <p className="text-lg font-medium text-orange-600">{info.canBeDeleted.toLocaleString()}</p>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCleanupDialog(true)}
                        disabled={info.canBeDeleted === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Nettoyer
                      </Button>
                    </div>
                  </div>
                  
                  <Progress 
                    value={(info.canBeDeleted / info.currentCount) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Rapports de conformité */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rapports de conformité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                <p>Fonctionnalité de rapports en cours de développement</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de nettoyage des données */}
      <Dialog open={cleanupDialog} onOpenChange={setCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le nettoyage des données</DialogTitle>
            <DialogDescription>
              Cette action supprimera définitivement les données expirées selon les politiques de rétention.
              Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => performDataCleanup('example')}
              disabled={loading}
            >
              {loading ? 'Nettoyage...' : 'Confirmer le nettoyage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};