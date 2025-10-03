import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/badge';
import {
  Workflow,
  Plus,
  Trash2,
  Clock,
  Mail,
  Filter,
  GitBranch,
  Play,
  Pause,
  Settings,
  Calendar,
  Users,
  Zap
} from 'lucide-react';

interface AutomationTrigger {
  type: 'event' | 'date' | 'user_action' | 'schedule';
  event?: string;
  date?: string;
  action?: string;
  schedule?: string;
}

interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

interface AutomationAction {
  id: string;
  type: 'send_email' | 'wait' | 'add_tag' | 'remove_tag' | 'update_field';
  delay?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  campaignId?: string;
  templateId?: string;
  tag?: string;
  field?: string;
  value?: string;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  status: 'draft' | 'active' | 'paused';
  createdAt: string;
  stats?: {
    triggered: number;
    completed: number;
    active: number;
  };
}

interface AutomationBuilderProps {
  workflow?: AutomationWorkflow;
  onSave?: (workflow: AutomationWorkflow) => void;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({ workflow, onSave }) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<AutomationWorkflow>(
    workflow || {
      id: `workflow-${Date.now()}`,
      name: 'Nouvelle automatisation',
      description: '',
      trigger: { type: 'event' },
      conditions: [],
      actions: [],
      status: 'draft',
      createdAt: new Date().toISOString()
    }
  );

  const addCondition = () => {
    const newCondition: AutomationCondition = {
      id: `condition-${Date.now()}`,
      field: 'email',
      operator: 'equals',
      value: ''
    };
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: [...currentWorkflow.conditions, newCondition]
    });
  };

  const removeCondition = (conditionId: string) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: currentWorkflow.conditions.filter(c => c.id !== conditionId)
    });
  };

  const updateCondition = (conditionId: string, updates: Partial<AutomationCondition>) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      conditions: currentWorkflow.conditions.map(c =>
        c.id === conditionId ? { ...c, ...updates } : c
      )
    });
  };

  const addAction = (type: AutomationAction['type']) => {
    const newAction: AutomationAction = {
      id: `action-${Date.now()}`,
      type,
      delay: type === 'wait' ? 1 : undefined,
      delayUnit: type === 'wait' ? 'days' : undefined
    };
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: [...currentWorkflow.actions, newAction]
    });
  };

  const removeAction = (actionId: string) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.filter(a => a.id !== actionId)
    });
  };

  const updateAction = (actionId: string, updates: Partial<AutomationAction>) => {
    setCurrentWorkflow({
      ...currentWorkflow,
      actions: currentWorkflow.actions.map(a => (a.id === actionId ? { ...a, ...updates } : a))
    });
  };

  const handleSave = () => {
    onSave?.(currentWorkflow);
  };

  const handleActivate = () => {
    setCurrentWorkflow({ ...currentWorkflow, status: 'active' });
  };

  const handlePause = () => {
    setCurrentWorkflow({ ...currentWorkflow, status: 'paused' });
  };

  const getActionIcon = (type: AutomationAction['type']) => {
    const icons = {
      send_email: Mail,
      wait: Clock,
      add_tag: Plus,
      remove_tag: Trash2,
      update_field: Settings
    };
    return icons[type];
  };

  const getActionLabel = (type: AutomationAction['type']) => {
    const labels = {
      send_email: 'Envoyer un email',
      wait: 'Attendre',
      add_tag: 'Ajouter un tag',
      remove_tag: 'Retirer un tag',
      update_field: 'Mettre à jour un champ'
    };
    return labels[type];
  };

  const getTriggerIcon = (type: AutomationTrigger['type']) => {
    const icons = {
      event: Zap,
      date: Calendar,
      user_action: Users,
      schedule: Clock
    };
    return icons[type];
  };

  const getStatusBadge = () => {
    const badges = {
      draft: <Badge variant="secondary">Brouillon</Badge>,
      active: <Badge variant="default" className="bg-green-600">Actif</Badge>,
      paused: <Badge variant="secondary">En pause</Badge>
    };
    return badges[currentWorkflow.status];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Configuration de l'automatisation
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
            <Input
              value={currentWorkflow.name}
              onChange={e => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
              placeholder="Ex: Séquence de bienvenue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={currentWorkflow.description}
              onChange={e =>
                setCurrentWorkflow({ ...currentWorkflow, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              placeholder="Décrivez l'objectif de cette automatisation..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Déclencheur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de déclencheur
              </label>
              <select
                value={currentWorkflow.trigger.type}
                onChange={e =>
                  setCurrentWorkflow({
                    ...currentWorkflow,
                    trigger: { type: e.target.value as AutomationTrigger['type'] }
                  })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="event">Événement</option>
                <option value="date">Date spécifique</option>
                <option value="user_action">Action utilisateur</option>
                <option value="schedule">Planification récurrente</option>
              </select>
            </div>

            {currentWorkflow.trigger.type === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Événement</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option>Nouvel utilisateur inscrit</option>
                  <option>Participation à un événement</option>
                  <option>Anniversaire</option>
                  <option>Fin de période d'essai</option>
                </select>
              </div>
            )}

            {currentWorkflow.trigger.type === 'date' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <Input type="date" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Conditions
            </CardTitle>
            <Button onClick={addCondition} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentWorkflow.conditions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune condition. L'automatisation s'appliquera à tous les déclenchements.
            </p>
          ) : (
            <div className="space-y-3">
              {currentWorkflow.conditions.map(condition => (
                <div key={condition.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <select
                    value={condition.field}
                    onChange={e => updateCondition(condition.id, { field: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="role">Rôle</option>
                    <option value="team">Équipe</option>
                    <option value="tag">Tag</option>
                  </select>

                  <select
                    value={condition.operator}
                    onChange={e =>
                      updateCondition(condition.id, {
                        operator: e.target.value as AutomationCondition['operator']
                      })
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="equals">est égal à</option>
                    <option value="not_equals">n'est pas égal à</option>
                    <option value="contains">contient</option>
                  </select>

                  <Input
                    value={condition.value}
                    onChange={e => updateCondition(condition.id, { value: e.target.value })}
                    placeholder="Valeur..."
                    className="flex-1"
                  />

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCondition(condition.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Actions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => addAction('send_email')} size="sm" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button onClick={() => addAction('wait')} size="sm" variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Attente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentWorkflow.actions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune action configurée. Ajoutez des actions pour définir le comportement de
              l'automatisation.
            </p>
          ) : (
            <div className="space-y-3">
              {currentWorkflow.actions.map((action, index) => {
                const ActionIcon = getActionIcon(action.type);
                return (
                  <div key={action.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                        </div>
                        <ActionIcon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {getActionLabel(action.type)}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeAction(action.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {action.type === 'send_email' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template
                          </label>
                          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                            <option>Email de bienvenue</option>
                            <option>Rappel d'événement</option>
                            <option>Newsletter</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {action.type === 'wait' && (
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={action.delay || 1}
                          onChange={e =>
                            updateAction(action.id, { delay: parseInt(e.target.value) })
                          }
                          className="w-24"
                        />
                        <select
                          value={action.delayUnit || 'days'}
                          onChange={e =>
                            updateAction(action.id, {
                              delayUnit: e.target.value as AutomationAction['delayUnit']
                            })
                          }
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Heures</option>
                          <option value="days">Jours</option>
                        </select>
                      </div>
                    )}

                    {action.type === 'add_tag' && (
                      <Input placeholder="Nom du tag..." />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {currentWorkflow.stats && (
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{currentWorkflow.stats.triggered}</div>
                <div className="text-sm text-gray-600">Déclenchés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{currentWorkflow.stats.active}</div>
                <div className="text-sm text-gray-600">En cours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{currentWorkflow.stats.completed}</div>
                <div className="text-sm text-gray-600">Terminés</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleSave}>
          Sauvegarder
        </Button>
        {currentWorkflow.status === 'draft' && (
          <Button onClick={handleActivate}>
            <Play className="h-4 w-4 mr-2" />
            Activer
          </Button>
        )}
        {currentWorkflow.status === 'active' && (
          <Button onClick={handlePause} variant="outline">
            <Pause className="h-4 w-4 mr-2" />
            Mettre en pause
          </Button>
        )}
      </div>
    </div>
  );
};

