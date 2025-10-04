import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../ui/badge';
import {
  Workflow,
  Plus,
  Search,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Zap,
  Calendar,
  Users as UsersIcon,
  Clock
} from 'lucide-react';
import { AutomationBuilder } from '../../components/campaigns/automation/AutomationBuilder';

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'event' | 'date' | 'user_action' | 'schedule';
    label: string;
  };
  status: 'draft' | 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
  stats: {
    triggered: number;
    completed: number;
    active: number;
  };
}

export const AutomationPage: React.FC = () => {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, [organization?.organizationId]);

  useEffect(() => {
    filterWorkflows();
  }, [searchQuery, statusFilter, workflows]);

  const loadWorkflows = async () => {
    setLoading(true);

    const mockWorkflows: AutomationWorkflow[] = [
      {
        id: 'workflow-1',
        name: 'Séquence de bienvenue',
        description: 'Emails automatiques pour les nouveaux utilisateurs',
        trigger: { type: 'event', label: 'Nouvel utilisateur inscrit' },
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        stats: { triggered: 245, completed: 198, active: 47 }
      },
      {
        id: 'workflow-2',
        name: 'Rappel événement',
        description: 'Rappels automatiques avant les événements',
        trigger: { type: 'schedule', label: '3 jours avant événement' },
        status: 'active',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        stats: { triggered: 89, completed: 89, active: 0 }
      },
      {
        id: 'workflow-3',
        name: 'Réengagement inactifs',
        description: 'Campagne pour réengager les utilisateurs inactifs',
        trigger: { type: 'schedule', label: 'Tous les lundis' },
        status: 'paused',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        stats: { triggered: 156, completed: 142, active: 14 }
      },
      {
        id: 'workflow-4',
        name: 'Anniversaire employé',
        description: 'Message d\'anniversaire automatique',
        trigger: { type: 'date', label: 'Date d\'anniversaire' },
        status: 'draft',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        stats: { triggered: 0, completed: 0, active: 0 }
      }
    ];

    setWorkflows(mockWorkflows);
    setFilteredWorkflows(mockWorkflows);
    setLoading(false);
  };

  const filterWorkflows = () => {
    let filtered = [...workflows];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        w =>
          w.name.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    setFilteredWorkflows(filtered);
  };

  const handleCreate = () => {
    setSelectedWorkflow(null);
    setShowBuilder(true);
  };

  const handleEdit = (workflow: AutomationWorkflow) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleDelete = async (workflowId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette automatisation ?')) {
      setWorkflows(workflows.filter(w => w.id !== workflowId));
    }
  };

  const handleDuplicate = async (workflow: AutomationWorkflow) => {
    const duplicate = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      name: `${workflow.name} (copie)`,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { triggered: 0, completed: 0, active: 0 }
    };
    setWorkflows([...workflows, duplicate]);
  };

  const handleToggleStatus = async (workflowId: string) => {
    setWorkflows(
      workflows.map(w =>
        w.id === workflowId
          ? {
              ...w,
              status: w.status === 'active' ? 'paused' : 'active'
            }
          : w
      )
    );
  };

  const getStatusBadge = (status: AutomationWorkflow['status']) => {
    const badges = {
      draft: <Badge variant="secondary">Brouillon</Badge>,
      active: <Badge variant="default" className="bg-green-600">Actif</Badge>,
      paused: <Badge variant="secondary">En pause</Badge>
    };
    return badges[status];
  };

  const getTriggerIcon = (type: AutomationWorkflow['trigger']['type']) => {
    const icons = {
      event: Zap,
      date: Calendar,
      user_action: UsersIcon,
      schedule: Clock
    };
    return icons[type];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedWorkflow ? 'Modifier l\'automatisation' : 'Nouvelle automatisation'}
              </h1>
              <Button variant="outline" onClick={() => setShowBuilder(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AutomationBuilder
            workflow={selectedWorkflow as any}
            onSave={workflow => {
              console.log('Workflow saved', workflow);
              setShowBuilder(false);
              loadWorkflows();
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Automatisations</h1>
              <p className="text-sm text-gray-600 mt-1">
                Créez des workflows automatisés pour vos campagnes email
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle automatisation
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Workflows</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="paused">En pause</option>
                  <option value="draft">Brouillon</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredWorkflows.map(workflow => {
                const TriggerIcon = getTriggerIcon(workflow.trigger.type);

                return (
                  <div
                    key={workflow.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                          {getStatusBadge(workflow.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <TriggerIcon className="h-4 w-4" />
                            <span>{workflow.trigger.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span>
                              {workflow.stats.triggered} déclenchés • {workflow.stats.completed} terminés
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          Créé le {formatDate(workflow.createdAt)} • Modifié le{' '}
                          {formatDate(workflow.updatedAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {workflow.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(workflow.id)}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {workflow.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(workflow.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(workflow)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(workflow)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredWorkflows.length === 0 && (
                <div className="text-center py-12">
                  <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Aucune automatisation trouvée</p>
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer votre première automatisation
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

