/**
 * File d'approbation des demandes de congé
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Checkbox,
  Progress
} from '../components/ui';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import { LeaveRequest } from '../../shared';
import { formatDate, formatDuration } from '../utils/dateUtils';

interface LeaveApprovalQueueProps {
  organizationId?: string;
  managerId?: string;
  className?: string;
}

interface BatchApprovalData {
  requestIds: string[];
  action: 'approve' | 'reject';
  notes: string;
}

export const LeaveApprovalQueue: React.FC<LeaveApprovalQueueProps> = ({
  organizationId,
  managerId,
  className = ''
}) => {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [batchDialog, setBatchDialog] = useState(false);
  const [batchData, setBatchData] = useState<BatchApprovalData>({
    requestIds: [],
    action: 'approve',
    notes: ''
  });
  const [individualDialog, setIndividualDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [individualNotes, setIndividualNotes] = useState('');
  const [individualAction, setIndividualAction] = useState<'approve' | 'reject'>('approve');
  const [loading, setLoading] = useState(false);

  const {
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    refresh,
    error
  } = useLeaveRequests();

  // Filtrer les demandes en attente
  useEffect(() => {
    const pending = leaveRequests.filter(request => request.status === 'pending');
    setPendingRequests(pending);
  }, [leaveRequests]);

  // Gérer la sélection d'une demande
  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests(prev => [...prev, requestId]);
    } else {
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  // Sélectionner toutes les demandes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(pendingRequests.map(r => r.id!));
    } else {
      setSelectedRequests([]);
    }
  };

  // Traitement individuel
  const handleIndividualApproval = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      
      if (individualAction === 'approve') {
        await approveLeaveRequest(selectedRequest.id!, individualNotes);
      } else {
        await rejectLeaveRequest(selectedRequest.id!, individualNotes);
      }
      
      setIndividualDialog(false);
      setSelectedRequest(null);
      setIndividualNotes('');
      refresh();
    } catch (error) {
      console.error('Failed to process leave request:', error);
    } finally {
      setLoading(false);
    }
  };

  // Traitement en lot
  const handleBatchApproval = async () => {
    try {
      setLoading(true);
      
      // Traiter chaque demande sélectionnée
      const promises = batchData.requestIds.map(requestId => {
        if (batchData.action === 'approve') {
          return approveLeaveRequest(requestId, batchData.notes);
        } else {
          return rejectLeaveRequest(requestId, batchData.notes);
        }
      });
      
      await Promise.all(promises);
      
      setBatchDialog(false);
      setSelectedRequests([]);
      setBatchData({ requestIds: [], action: 'approve', notes: '' });
      refresh();
    } catch (error) {
      console.error('Failed to batch process leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtenir la priorité d'une demande
  const getRequestPriority = (request: LeaveRequest): 'high' | 'medium' | 'low' => {
    const startDate = new Date(request.startDate);
    const now = new Date();
    const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilStart <= 7) return 'high';
    if (daysUntilStart <= 30) return 'medium';
    return 'low';
  };

  // Obtenir le badge de priorité
  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'medium':
        return <Badge variant="warning">Modéré</Badge>;
      case 'low':
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  // Calculer les statistiques de la file
  const getQueueStats = () => {
    const total = pendingRequests.length;
    const urgent = pendingRequests.filter(r => getRequestPriority(r) === 'high').length;
    const avgDaysRequested = total > 0 
      ? pendingRequests.reduce((sum, r) => sum + (r.daysRequested || 0), 0) / total 
      : 0;
    
    return { total, urgent, avgDaysRequested };
  };

  const stats = getQueueStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques de la file */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.avgDaysRequested.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Jours moy.</div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {stats.urgent > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.urgent} demande{stats.urgent > 1 ? 's' : ''} urgente{stats.urgent > 1 ? 's' : ''} nécessitant une attention immédiate
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File d'approbation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              File d'approbation ({pendingRequests.length})
            </span>
            <div className="flex items-center space-x-2">
              {selectedRequests.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBatchData({
                      requestIds: selectedRequests,
                      action: 'approve',
                      notes: ''
                    });
                    setBatchDialog(true);
                  }}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Traiter sélection ({selectedRequests.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {/* Sélection globale */}
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Checkbox
                  checked={selectedRequests.length === pendingRequests.length && pendingRequests.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Sélectionner tout ({pendingRequests.length})
                </span>
              </div>

              {/* Liste des demandes */}
              {pendingRequests
                .sort((a, b) => {
                  // Trier par priorité puis par date de création
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  const aPriority = getRequestPriority(a);
                  const bPriority = getRequestPriority(b);
                  
                  if (aPriority !== bPriority) {
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                  }
                  
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                })
                .map((request) => {
                  const priority = getRequestPriority(request);
                  const isSelected = selectedRequests.includes(request.id!);
                  
                  return (
                    <div
                      key={request.id}
                      className={`p-4 border rounded-lg ${
                        priority === 'high' ? 'border-red-200 bg-red-50' :
                        priority === 'medium' ? 'border-orange-200 bg-orange-50' :
                        'border-gray-200'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRequest(request.id!, checked as boolean)}
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="font-medium">{request.employee?.name}</div>
                              {getPriorityBadge(priority)}
                              <Badge variant="outline">
                                {request.type === 'vacation' ? 'Congés payés' :
                                 request.type === 'sick' ? 'Maladie' :
                                 request.type === 'personal' ? 'Personnel' : request.type}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-muted-foreground mb-2">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {request.employee?.employeeId}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Du {formatDate(new Date(request.startDate))} au {formatDate(new Date(request.endDate))}
                                </span>
                                <span>
                                  {request.daysRequested} jour{request.daysRequested > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-sm">
                              <div className="font-medium mb-1">Motif:</div>
                              <div className="text-muted-foreground">
                                {request.reason.length > 100 
                                  ? `${request.reason.substring(0, 100)}...` 
                                  : request.reason
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIndividualAction('reject');
                              setIndividualDialog(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIndividualAction('approve');
                              setIndividualDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Aucune demande en attente</p>
              <p className="text-sm">Toutes les demandes ont été traitées</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog d'approbation individuelle */}
      <Dialog open={individualDialog} onOpenChange={setIndividualDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {individualAction === 'approve' ? 'Approuver' : 'Refuser'} la demande
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.employee?.name} - {selectedRequest?.type}
              <br />
              Du {selectedRequest && formatDate(new Date(selectedRequest.startDate))} au {selectedRequest && formatDate(new Date(selectedRequest.endDate))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motif de la demande</label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {selectedRequest?.reason}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Notes {individualAction === 'approve' ? 'd\'approbation' : 'de refus'}
              </label>
              <Textarea
                placeholder={`Ajoutez vos notes ${individualAction === 'approve' ? 'd\'approbation' : 'de refus'}...`}
                value={individualNotes}
                onChange={(e) => setIndividualNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndividualDialog(false)}>
              Annuler
            </Button>
            <Button
              variant={individualAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleIndividualApproval}
              disabled={loading}
            >
              {loading ? 'Traitement...' : (individualAction === 'approve' ? 'Approuver' : 'Refuser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de traitement en lot */}
      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Traitement en lot</DialogTitle>
            <DialogDescription>
              Traiter {batchData.requestIds.length} demande{batchData.requestIds.length > 1 ? 's' : ''} sélectionnée{batchData.requestIds.length > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                variant={batchData.action === 'approve' ? 'default' : 'outline'}
                onClick={() => setBatchData(prev => ({ ...prev, action: 'approve' }))}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approuver tout
              </Button>
              <Button
                variant={batchData.action === 'reject' ? 'destructive' : 'outline'}
                onClick={() => setBatchData(prev => ({ ...prev, action: 'reject' }))}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser tout
              </Button>
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Notes {batchData.action === 'approve' ? 'd\'approbation' : 'de refus'}
              </label>
              <Textarea
                placeholder={`Notes pour toutes les demandes ${batchData.action === 'approve' ? 'approuvées' : 'refusées'}...`}
                value={batchData.notes}
                onChange={(e) => setBatchData(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialog(false)}>
              Annuler
            </Button>
            <Button
              variant={batchData.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleBatchApproval}
              disabled={loading}
            >
              {loading ? 'Traitement...' : `${batchData.action === 'approve' ? 'Approuver' : 'Refuser'} ${batchData.requestIds.length} demande${batchData.requestIds.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};