// src/components/workflows/AppointmentWorkflow.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Edit,
  Send,
  RefreshCw,
  FileText,
  Bell
} from 'lucide-react';
import { appointmentService } from '@/services/appointmentService';
import { publicBookingService } from '@/services/publicBookingService';
import { clientService } from '@/services/clientService';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: string;
  details?: any;
}

interface AppointmentWorkflowData {
  appointmentId: string;
  clientId: string;
  serviceId: string;
  practitionerId: string;
  dateTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  clientInfo: {
    name: string;
    email: string;
    phone: string;
  };
  serviceInfo: {
    name: string;
    duration: number;
    price: number;
  };
  practitionerInfo: {
    name: string;
    email: string;
  };
  notifications: {
    confirmationSent: boolean;
    remindersSent: number;
    lastReminderSent?: string;
  };
}

const AppointmentWorkflow: React.FC = () => {
  const [workflows, setWorkflows] = useState<AppointmentWorkflowData[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AppointmentWorkflowData | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await appointmentService.getWorkflows();

      // Mock data
      const mockWorkflows: AppointmentWorkflowData[] = [
        {
          appointmentId: 'apt-001',
          clientId: 'client-001',
          serviceId: 'service-001',
          practitionerId: 'prac-001',
          dateTime: '2024-01-15T14:30:00Z',
          status: 'pending',
          clientInfo: {
            name: 'Jean Dupont',
            email: 'jean.dupont@email.com',
            phone: '+33123456789'
          },
          serviceInfo: {
            name: 'Consultation générale',
            duration: 30,
            price: 50
          },
          practitionerInfo: {
            name: 'Dr. Martin',
            email: 'dr.martin@clinic.com'
          },
          notifications: {
            confirmationSent: false,
            remindersSent: 0
          }
        },
        {
          appointmentId: 'apt-002',
          clientId: 'client-002',
          serviceId: 'service-002',
          practitionerId: 'prac-002',
          dateTime: '2024-01-16T10:00:00Z',
          status: 'confirmed',
          clientInfo: {
            name: 'Marie Dubois',
            email: 'marie.dubois@email.com',
            phone: '+33987654321'
          },
          serviceInfo: {
            name: 'Consultation spécialisée',
            duration: 45,
            price: 75
          },
          practitionerInfo: {
            name: 'Dr. Leroy',
            email: 'dr.leroy@clinic.com'
          },
          notifications: {
            confirmationSent: true,
            remindersSent: 1,
            lastReminderSent: '2024-01-15T10:00:00Z'
          }
        }
      ];

      setWorkflows(mockWorkflows);
    } catch (err: any) {
      setError('Erreur lors du chargement des workflows');
    } finally {
      setLoading(false);
    }
  };

  const generateWorkflowSteps = (workflow: AppointmentWorkflowData): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'booking',
        title: 'Réservation initiale',
        description: 'Le client a effectué une réservation',
        status: 'completed',
        timestamp: new Date(workflow.dateTime).toISOString(),
        details: {
          service: workflow.serviceInfo.name,
          practitioner: workflow.practitionerInfo.name,
          dateTime: workflow.dateTime
        }
      },
      {
        id: 'confirmation',
        title: 'Confirmation de réservation',
        description: 'Envoi de l\'email de confirmation au client',
        status: workflow.notifications.confirmationSent ? 'completed' : 'pending',
        timestamp: workflow.notifications.confirmationSent ? new Date().toISOString() : undefined
      },
      {
        id: 'practitioner_notification',
        title: 'Notification au praticien',
        description: 'Notification du nouveau rendez-vous au praticien',
        status: workflow.status !== 'pending' ? 'completed' : 'pending'
      },
      {
        id: 'reminder_24h',
        title: 'Rappel 24h avant',
        description: 'Envoi du rappel 24h avant le rendez-vous',
        status: workflow.notifications.remindersSent > 0 ? 'completed' : 'pending',
        timestamp: workflow.notifications.lastReminderSent
      },
      {
        id: 'reminder_2h',
        title: 'Rappel 2h avant',
        description: 'Envoi du rappel 2h avant le rendez-vous',
        status: workflow.notifications.remindersSent > 1 ? 'completed' : 'pending'
      },
      {
        id: 'appointment',
        title: 'Rendez-vous',
        description: 'Déroulement du rendez-vous',
        status: workflow.status === 'completed' ? 'completed' :
          workflow.status === 'no_show' ? 'failed' : 'pending'
      },
      {
        id: 'follow_up',
        title: 'Suivi post-rendez-vous',
        description: 'Envoi d\'un email de suivi si nécessaire',
        status: workflow.status === 'completed' ? 'completed' : 'pending'
      }
    ];

    return steps;
  };

  const executeWorkflowStep = async (workflowId: string, stepId: string) => {
    try {
      setProcessing(true);
      setError('');

      const workflow = workflows.find(w => w.appointmentId === workflowId);
      if (!workflow) return;

      switch (stepId) {
        case 'confirmation':
          await sendConfirmationEmail(workflow);
          break;
        case 'practitioner_notification':
          await notifyPractitioner(workflow);
          break;
        case 'reminder_24h':
        case 'reminder_2h':
          await sendReminder(workflow, stepId);
          break;
        case 'appointment':
          await updateAppointmentStatus(workflow, 'completed');
          break;
        case 'follow_up':
          await sendFollowUpEmail(workflow);
          break;
      }

      // Refresh workflows
      await loadWorkflows();
      if (selectedWorkflow) {
        const updatedWorkflow = workflows.find(w => w.appointmentId === selectedWorkflow.appointmentId);
        if (updatedWorkflow) {
          setSelectedWorkflow(updatedWorkflow);
          setWorkflowSteps(generateWorkflowSteps(updatedWorkflow));
        }
      }

      setSuccess('Étape exécutée avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de l\'exécution de l\'étape');
    } finally {
      setProcessing(false);
    }
  };

  const sendConfirmationEmail = async (workflow: AppointmentWorkflowData) => {
    // TODO: Replace with actual API call
    // await notificationService.sendConfirmation(workflow.appointmentId);
    console.log('Sending confirmation email for:', workflow.appointmentId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const notifyPractitioner = async (workflow: AppointmentWorkflowData) => {
    // TODO: Replace with actual API call
    // await notificationService.notifyPractitioner(workflow.practitionerId, workflow.appointmentId);
    console.log('Notifying practitioner:', workflow.practitionerInfo.name);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const sendReminder = async (workflow: AppointmentWorkflowData, reminderType: string) => {
    // TODO: Replace with actual API call
    // await notificationService.sendReminder(workflow.appointmentId, reminderType);
    console.log('Sending reminder:', reminderType, 'for:', workflow.appointmentId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const updateAppointmentStatus = async (workflow: AppointmentWorkflowData, status: string) => {
    // TODO: Replace with actual API call
    // await appointmentService.updateStatus(workflow.appointmentId, status);
    console.log('Updating appointment status:', workflow.appointmentId, 'to:', status);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const sendFollowUpEmail = async (workflow: AppointmentWorkflowData) => {
    // TODO: Replace with actual API call
    // await notificationService.sendFollowUp(workflow.appointmentId);
    console.log('Sending follow-up email for:', workflow.appointmentId);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows des rendez-vous</h1>
          <p className="text-gray-600">Suivez et gérez le cycle de vie complet des rendez-vous</p>
        </div>
        <Button onClick={loadWorkflows} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Workflows List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {workflows.map((workflow) => (
          <Card key={workflow.appointmentId} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{workflow.clientInfo.name}</CardTitle>
                <Badge className={getStatusColor(workflow.status)}>
                  {workflow.status === 'pending' && 'En attente'}
                  {workflow.status === 'confirmed' && 'Confirmé'}
                  {workflow.status === 'completed' && 'Terminé'}
                  {workflow.status === 'cancelled' && 'Annulé'}
                  {workflow.status === 'no_show' && 'Absent'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(workflow.dateTime).toLocaleDateString('fr-FR')}</span>
                <Clock className="w-4 h-4 ml-2" />
                <span>{new Date(workflow.dateTime).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{workflow.practitionerInfo.name}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{workflow.serviceInfo.name}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-1">
                  {workflow.notifications.confirmationSent && (
                    <span title="Confirmation envoyée">
                      <Mail className="w-4 h-4 text-green-600" />
                    </span>
                  )}
                  {workflow.notifications.remindersSent > 0 && (
                    <span title={`${workflow.notifications.remindersSent} rappel(s) envoyé(s)`}>
                      <Bell className="w-4 h-4 text-blue-600" />
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setWorkflowSteps(generateWorkflowSteps(workflow));
                  }}
                >
                  Voir détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun workflow de rendez-vous en cours</p>
          </CardContent>
        </Card>
      )}

      {/* Workflow Details Dialog */}
      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Workflow - {selectedWorkflow?.clientInfo.name}
            </DialogTitle>
          </DialogHeader>

          {selectedWorkflow && (
            <div className="space-y-6">
              {/* Appointment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informations du rendez-vous</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Client</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{selectedWorkflow.clientInfo.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{selectedWorkflow.clientInfo.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{selectedWorkflow.clientInfo.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Rendez-vous</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(selectedWorkflow.dateTime).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(selectedWorkflow.dateTime).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{selectedWorkflow.practitionerInfo.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{selectedWorkflow.serviceInfo.name} ({selectedWorkflow.serviceInfo.duration} min)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Étapes du workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workflowSteps.map((step, index) => (
                      <div key={step.id} className="flex items-start space-x-4">
                        <div className="flex flex-col items-center">
                          {getStatusIcon(step.status)}
                          {index < workflowSteps.length - 1 && (
                            <div className="w-px h-8 bg-gray-200 mt-2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{step.title}</h4>
                              <p className="text-sm text-gray-600">{step.description}</p>
                              {step.timestamp && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(step.timestamp).toLocaleString('fr-FR')}
                                </p>
                              )}
                            </div>

                            {step.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => executeWorkflowStep(selectedWorkflow.appointmentId, step.id)}
                                disabled={processing}
                              >
                                {processing ? (
                                  <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                )}
                                Exécuter
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions rapides</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeWorkflowStep(selectedWorkflow.appointmentId, 'confirmation')}
                      disabled={processing || selectedWorkflow.notifications.confirmationSent}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer confirmation
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeWorkflowStep(selectedWorkflow.appointmentId, 'reminder_24h')}
                      disabled={processing}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Envoyer rappel
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedWorkflow, 'confirmed')}
                      disabled={processing || selectedWorkflow.status === 'confirmed'}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmer RDV
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAppointmentStatus(selectedWorkflow, 'completed')}
                      disabled={processing || selectedWorkflow.status === 'completed'}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marquer terminé
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentWorkflow;