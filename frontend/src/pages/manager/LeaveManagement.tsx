/**
 * Interface de gestion des congés pour les managers
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Calendar,
  Checkbox
} from '@/components/ui';
import {
  FileText,
  Calendar as CalendarIcon,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  Filter,
  Search,
  Download,
  RefreshCw,
  Plus,
  BarChart3,
  PieChart,
  TrendingUp
} from 'lucide-react';
import { LeaveCalendarView } from '@/components/leave/LeaveCalendarView';
import { LeaveApprovalQueue } from '@/components/leave/LeaveApprovalQueue';
import { LeaveBalanceManager } from '@/components/leave/LeaveBalanceManager';
import { LeaveReports } from '@/components/leave/LeaveReports';
import { LeaveRequestForm } from '@/components/presence/LeaveRequestForm';
import { useAuth } from '@/hooks/useAuth';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { LeaveRequest } from '@attendance-x/shared';
import { formatDate } from '@/utils/dateUtils';

export const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const {
    leaveRequests,
    loading,
    error,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveStats,
    refresh
  } = useLeaveRequests();

  // Filtrer les demandes selon les critères
  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
      request.employee?.department === selectedDepartment;
    
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    const matchesType = selectedType === 'all' || request.type === selectedType;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesType;
  });

  // Obtenir les statistiques
  const stats = getLeaveStats();

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusé</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  // Obtenir le badge de type
  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      vacation: 'Congés payés',
      sick: 'Maladie',
      personal: 'Personnel',
      maternity: 'Maternité',
      paternity: 'Paternité',
      other: 'Autre'
    };

    const typeColors: Record<string, any> = {
      vacation: 'default',
      sick: 'destructive',
      personal: 'secondary',
      maternity: 'success',
      paternity: 'success',
      other: 'outline'
    };

    return (
      <Badge variant={typeColors[type] || 'outline'}>
        {typeLabels[type] || type}
      </Badge>
    );
  };

  // Gérer l'approbation/rejet
  const handleApproval = async () => {
    if (!selectedRequest) return;

    try {
      if (approvalAction === 'approve') {
        await approveLeaveRequest(selectedRequest.id!, approvalNotes);
      } else {
        await rejectLeaveRequest(selectedRequest.id!, approvalNotes);
      }
      
      setApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalNotes('');
      refresh();
    } catch (error) {
      console.error('Failed to process leave request:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des congés</h1>
          <p className="text-muted-foreground">
            Gérez les demandes de congé de votre équipe
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button onClick={() => setShowNewRequestForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total demandes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approuvées</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours approuvés</p>
                <p className="text-2xl font-bold text-purple-600">{stats.approvedDays}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {stats.pending > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {stats.pending} demande{stats.pending > 1 ? 's' : ''} en attente d'approbation
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab('approval')}
            >
              Traiter maintenant
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="requests" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Demandes
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approbation
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Soldes
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Rapports
          </TabsTrigger>
        </TabsList>

        {/* Liste des demandes */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Demandes de congé ({filteredRequests.length})</span>
                <div className="flex items-center space-x-2">
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
                    placeholder="Rechercher un employé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Département" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="dev">Développement</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Ventes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvées</SelectItem>
                    <SelectItem value="rejected">Refusées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="vacation">Congés payés</SelectItem>
                    <SelectItem value="sick">Maladie</SelectItem>
                    <SelectItem value="personal">Personnel</SelectItem>
                    <SelectItem value="maternity">Maternité</SelectItem>
                    <SelectItem value="paternity">Paternité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tableau des demandes */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date demande</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.employee?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.employee?.employeeId} • {request.employee?.department}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(request.type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Du {formatDate(new Date(request.startDate))}</div>
                          <div>Au {formatDate(new Date(request.endDate))}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {request.daysRequested} jour{request.daysRequested > 1 ? 's' : ''}
                        </div>
                        {request.isHalfDay && (
                          <div className="text-xs text-muted-foreground">
                            Demi-journée ({request.halfDayPeriod})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(new Date(request.createdAt))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Détails de la demande</DialogTitle>
                                <DialogDescription>
                                  {request.employee?.name} - {getTypeBadge(request.type)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Période</label>
                                    <div className="text-sm">
                                      Du {formatDate(new Date(request.startDate))} au {formatDate(new Date(request.endDate))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Durée</label>
                                    <div className="text-sm">
                                      {request.daysRequested} jour{request.daysRequested > 1 ? 's' : ''}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Motif</label>
                                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                                    {request.reason}
                                  </div>
                                </div>

                                {request.managerNotes && (
                                  <div>
                                    <label className="text-sm font-medium">Notes du manager</label>
                                    <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                                      {request.managerNotes}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                {request.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setApprovalAction('reject');
                                        setApprovalDialog(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Refuser
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setApprovalAction('approve');
                                        setApprovalDialog(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approuver
                                    </Button>
                                  </div>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {request.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setApprovalAction('approve');
                                setApprovalDialog(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucune demande de congé trouvée</p>
                  <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File d'approbation */}
        <TabsContent value="approval" className="space-y-6">
          <LeaveApprovalQueue 
            organizationId={user?.organizationId}
            managerId={user?.uid}
          />
        </TabsContent>

        {/* Vue calendrier */}
        <TabsContent value="calendar" className="space-y-6">
          <LeaveCalendarView 
            organizationId={user?.organizationId}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        {/* Gestion des soldes */}
        <TabsContent value="balances" className="space-y-6">
          <LeaveBalanceManager 
            organizationId={user?.organizationId}
            selectedDepartment={selectedDepartment}
          />
        </TabsContent>

        {/* Rapports */}
        <TabsContent value="reports" className="space-y-6">
          <LeaveReports 
            organizationId={user?.organizationId}
            managerId={user?.uid}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog d'approbation/rejet */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approuver' : 'Refuser'} la demande
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.employee?.name} - {selectedRequest?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={`Notes ${approvalAction === 'approve' ? 'd\'approbation' : 'de refus'}...`}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Annuler
            </Button>
            <Button
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleApproval}
              disabled={loading}
            >
              {approvalAction === 'approve' ? 'Approuver' : 'Refuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulaire de nouvelle demande */}
      {showNewRequestForm && (
        <Dialog open={showNewRequestForm} onOpenChange={setShowNewRequestForm}>
          <DialogContent className="max-w-4xl">
            <LeaveRequestForm
              onSuccess={() => {
                setShowNewRequestForm(false);
                refresh();
              }}
              onCancel={() => setShowNewRequestForm(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};