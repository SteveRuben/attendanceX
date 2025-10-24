import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Clock,
  Calendar,
  Mail,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  Users,
  FileText,
  Download,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ScheduledReportsProps {
  organizationId: string;
}

interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: string;
  lastRun?: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  runCount: number;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  organizationId
}) => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    reportId: '',
    frequency: 'weekly' as const,
    recipients: '',
    format: 'pdf' as const,
    startDate: ''
  });

  useEffect(() => {
    loadScheduledReports();
  }, [organizationId]);

  const loadScheduledReports = async () => {
    try {
      setLoading(true);
      
      // Mock data
      const mockScheduledReports: ScheduledReport[] = [
        {
          id: 'schedule-1',
          reportId: 'report-1',
          reportName: 'Rapport Performance Mensuel',
          frequency: 'monthly',
          nextRun: '2024-02-01T09:00:00Z',
          lastRun: '2024-01-01T09:00:00Z',
          recipients: ['admin@example.com', 'manager@example.com'],
          format: 'pdf',
          isActive: true,
          createdAt: '2024-01-15T10:00:00Z',
          createdBy: 'Marie Dubois',
          runCount: 3,
          lastStatus: 'success'
        },
        {
          id: 'schedule-2',
          reportId: 'report-3',
          reportName: 'Rapport Livraison Hebdomadaire',
          frequency: 'weekly',
          nextRun: '2024-02-05T08:00:00Z',
          lastRun: '2024-01-29T08:00:00Z',
          recipients: ['tech@example.com'],
          format: 'excel',
          isActive: true,
          createdAt: '2024-01-10T14:30:00Z',
          createdBy: 'Jean Martin',
          runCount: 12,
          lastStatus: 'success'
        },
        {
          id: 'schedule-3',
          reportId: 'report-2',
          reportName: 'Analyse Engagement Newsletter',
          frequency: 'weekly',
          nextRun: '2024-02-06T10:00:00Z',
          lastRun: '2024-01-30T10:00:00Z',
          recipients: ['marketing@example.com', 'content@example.com'],
          format: 'pdf',
          isActive: false,
          createdAt: '2024-01-08T11:15:00Z',
          createdBy: 'Sophie Bernard',
          runCount: 8,
          lastStatus: 'failed',
          lastError: 'Erreur de génération du rapport'
        }
      ];
      
      setScheduledReports(mockScheduledReports);
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (scheduleId: string) => {
    setScheduledReports(prev => prev.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, isActive: !schedule.isActive }
        : schedule
    ));
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette programmation ?')) {
      setScheduledReports(prev => prev.filter(s => s.id !== scheduleId));
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.reportId || !newSchedule.recipients) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    const recipients = newSchedule.recipients.split(',').map(email => email.trim());
    
    // Mock création
    const newScheduledReport: ScheduledReport = {
      id: `schedule-${Date.now()}`,
      reportId: newSchedule.reportId,
      reportName: 'Nouveau Rapport Programmé',
      frequency: newSchedule.frequency,
      nextRun: new Date(newSchedule.startDate).toISOString(),
      recipients,
      format: newSchedule.format,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'Current User',
      runCount: 0
    };

    setScheduledReports(prev => [newScheduledReport, ...prev]);
    setShowCreateForm(false);
    setNewSchedule({
      reportId: '',
      frequency: 'weekly',
      recipients: '',
      format: 'pdf',
      startDate: ''
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel'
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getFormatLabel = (format: string) => {
    const labels = {
      pdf: 'PDF',
      excel: 'Excel',
      csv: 'CSV'
    };
    return labels[format as keyof typeof labels] || format;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNextRunStatus = (nextRun: string) => {
    const next = new Date(nextRun);
    const now = new Date();
    const diffHours = Math.floor((next.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return { label: 'En retard', color: 'text-red-600' };
    if (diffHours < 24) return { label: `Dans ${diffHours}h`, color: 'text-orange-600' };
    if (diffHours < 168) return { label: `Dans ${Math.floor(diffHours / 24)}j`, color: 'text-blue-600' };
    
    return { label: formatDate(nextRun), color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rapports Programmés</h2>
          <p className="text-gray-600">
            Automatisez l'envoi de vos rapports d'analytics
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Programmer un rapport
        </Button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Programmer un nouveau rapport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rapport à programmer
                </label>
                <Select value={newSchedule.reportId} onValueChange={(value) => 
                  setNewSchedule(prev => ({ ...prev, reportId: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rapport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report-1">Rapport Performance Mensuel</SelectItem>
                    <SelectItem value="report-2">Analyse Engagement Newsletter</SelectItem>
                    <SelectItem value="report-3">Rapport Livraison Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence
                </label>
                <Select value={newSchedule.frequency} onValueChange={(value: any) => 
                  setNewSchedule(prev => ({ ...prev, frequency: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Quotidien</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format d'export
                </label>
                <Select value={newSchedule.format} onValueChange={(value: any) => 
                  setNewSchedule(prev => ({ ...prev, format: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <Input
                  type="datetime-local"
                  value={newSchedule.startDate}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinataires (emails séparés par des virgules)
              </label>
              <Input
                value={newSchedule.recipients}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, recipients: e.target.value }))}
                placeholder="admin@example.com, manager@example.com"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateSchedule}>
                Programmer
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des rapports programmés */}
      {scheduledReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucun rapport programmé
            </h3>
            <p className="text-gray-600 mb-4">
              Programmez vos rapports pour les recevoir automatiquement par email
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Programmer un rapport
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scheduledReports.map(schedule => {
            const nextRunStatus = getNextRunStatus(schedule.nextRun);
            
            return (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {schedule.reportName}
                        </h3>
                        <Badge 
                          variant={schedule.isActive ? 'default' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {schedule.isActive ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Pause className="h-3 w-3" />
                          )}
                          {schedule.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                        {schedule.lastStatus === 'failed' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Erreur
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{getFrequencyLabel(schedule.frequency)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className={nextRunStatus.color}>
                            {nextRunStatus.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{schedule.recipients.length} destinataire{schedule.recipients.length > 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{getFormatLabel(schedule.format)}</span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        <div>Créé par {schedule.createdBy} le {formatDate(schedule.createdAt)}</div>
                        <div>Exécuté {schedule.runCount} fois</div>
                        {schedule.lastRun && (
                          <div>Dernière exécution: {formatDate(schedule.lastRun)}</div>
                        )}
                        {schedule.lastError && (
                          <div className="text-red-600 mt-1">
                            Erreur: {schedule.lastError}
                          </div>
                        )}
                      </div>

                      {/* Destinataires */}
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">Destinataires:</div>
                        <div className="flex flex-wrap gap-1">
                          {schedule.recipients.map((email, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(schedule.id)}
                        title={schedule.isActive ? 'Désactiver' : 'Activer'}
                      >
                        {schedule.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques des rapports programmés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">
                {scheduledReports.length}
              </div>
              <div className="text-sm text-blue-700">Total programmés</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">
                {scheduledReports.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-green-700">Actifs</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">
                {scheduledReports.reduce((sum, s) => sum + s.runCount, 0)}
              </div>
              <div className="text-sm text-orange-700">Exécutions totales</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-900">
                {scheduledReports.filter(s => s.lastStatus === 'failed').length}
              </div>
              <div className="text-sm text-red-700">En erreur</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};