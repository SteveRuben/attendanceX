import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  Users,
  UserCheck,
  Upload,
  Search,
  Filter,
  Eye,
  Download,
  Plus,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';
import { campaignService } from '../../../services/campaignService';

interface CampaignRecipientSelectionProps {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
  organizationId: string;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
}

interface Role {
  id: string;
  name: string;
  userCount: number;
}

interface Department {
  id: string;
  name: string;
  memberCount: number;
}

interface Event {
  id: string;
  name: string;
  participantCount: number;
  date: string;
}

interface RecipientPreview {
  email: string;
  firstName: string;
  lastName: string;
  team?: string;
  role?: string;
}

interface RecipientList {
  id: string;
  name: string;
  recipientCount: number;
  createdAt: string;
}


export const CampaignRecipientSelection: React.FC<CampaignRecipientSelectionProps> = ({
  data,
  onChange,
  organizationId
}) => {
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<RecipientPreview[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadOrganizationData();
  }, [organizationId]);

  useEffect(() => {
    if (data.recipients.type === 'criteria') {
      loadRecipientPreview();
    }
  }, [data.recipients.criteria]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);

      // Mock data - à remplacer par les APIs réelles
      setTeams([
        { id: 'team-1', name: 'Équipe Marketing', memberCount: 12 },
        { id: 'team-2', name: 'Équipe Développement', memberCount: 18 },
        { id: 'team-3', name: 'Équipe Ventes', memberCount: 8 },
        { id: 'team-4', name: 'Équipe Support', memberCount: 6 }
      ]);

      setRoles([
        { id: 'role-1', name: 'Manager', userCount: 5 },
        { id: 'role-2', name: 'Employé', userCount: 35 },
        { id: 'role-3', name: 'Stagiaire', userCount: 4 }
      ]);

      // Mock recipient lists
      setRecipientLists([
        { id: 'list-1', name: 'Newsletter Générale', recipientCount: 120, createdAt: '2024-01-10' },
        { id: 'list-2', name: 'Clients Premium', recipientCount: 34, createdAt: '2024-02-05' },
        { id: 'list-3', name: 'Participants Événements', recipientCount: 58, createdAt: '2024-03-01' }
      ]);

      setDepartments([
        { id: 'dept-1', name: 'Technologie', memberCount: 20 },
        { id: 'dept-2', name: 'Commercial', memberCount: 15 },
        { id: 'dept-3', name: 'Administration', memberCount: 9 }
      ]);

      setEvents([
        { id: 'event-1', name: 'Conférence Annuelle 2024', participantCount: 85, date: '2024-03-15' },
        { id: 'event-2', name: 'Formation Sécurité', participantCount: 44, date: '2024-02-20' },
        { id: 'event-3', name: 'Team Building', participantCount: 32, date: '2024-02-10' }
      ]);
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientPreview = async () => {
    try {
      setPreviewLoading(true);

      const allRecipients = campaignService.getRecipients();
      let filteredRecipients = [...allRecipients];

      if (data.recipients.criteria?.teams && data.recipients.criteria.teams.length > 0) {
        filteredRecipients = filteredRecipients.filter(r =>
          data.recipients.criteria?.teams?.includes(r.team || '')
        );
      }

      if (data.recipients.criteria?.roles && data.recipients.criteria.roles.length > 0) {
        filteredRecipients = filteredRecipients.filter(r =>
          data.recipients.criteria?.roles?.includes(r.role || '')
        );
      }

      if (data.recipients.criteria?.departments && data.recipients.criteria.departments.length > 0) {
        filteredRecipients = filteredRecipients.filter(r =>
          data.recipients.criteria?.departments?.includes(r.department || '')
        );
      }

      const mockPreview: RecipientPreview[] = filteredRecipients.slice(0, 5).map(r => ({
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        team: r.team,
        role: r.role
      }));

      setRecipientPreview(mockPreview);

      const totalCount = filteredRecipients.length;
      onChange({
        recipients: {
          ...data.recipients,
          previewRecipients: mockPreview,
          totalCount
        }
      });
    } catch (error) {
      console.error('Error loading recipient preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRecipientTypeChange = (type: 'criteria' | 'list' | 'import') => {
    onChange({
      recipients: {
        ...data.recipients,
        type,
        totalCount: 0,
        previewRecipients: []
      }
    });
  };

  const handleCriteriaChange = (field: string, values: string[]) => {
    const newCriteria = {
      ...data.recipients.criteria,
      [field]: values,
      excludeUnsubscribed: data.recipients.criteria?.excludeUnsubscribed ?? true
    };

    onChange({
      recipients: {
        ...data.recipients,
        criteria: newCriteria
      }
    });
  };

  const handleSelectList = (listId: string) => {
    setSelectedListId(listId);
    const list = recipientLists.find(l => l.id === listId);
    const totalCount = list ? list.recipientCount : 0;
    onChange({
      recipients: {
        ...data.recipients,
        type: 'list',
        recipientListId: listId,
        totalCount,
        previewRecipients: []
      }
    });
  };

  const handleFileImport: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    if (!file.name.endsWith('.csv')) {
      setImportError("Format non support9 en mode maquette. Veuillez fournir un fichier .csv");
      return;
    }
    const text = await file.text();
    // Simple CSV parsing (comma-separated, header row)
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setImportError('Fichier CSV vide ou sans donn9es');
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf('email');
    const firstIdx = headers.indexOf('firstname');
    const lastIdx = headers.indexOf('lastname');
    if (emailIdx === -1) {
      setImportError("La colonne 'email' est requise dans l'en-tate");
      return;
    }
    const rows = lines.slice(1);
    const parsed: RecipientPreview[] = [];
    for (const row of rows) {
      const cols = row.split(',');
      const email = (cols[emailIdx] || '').trim();
      if (!email) continue;
      parsed.push({
        email,
        firstName: (cols[firstIdx] || '').trim(),
        lastName: (cols[lastIdx] || '').trim()
      });
    }
    setImportPreview(parsed);
    onChange({
      recipients: {
        ...data.recipients,
        type: 'import',
        externalRecipients: parsed.map(p => ({ email: p.email, firstName: p.firstName, lastName: p.lastName } as any)),
        totalCount: parsed.length,
        previewRecipients: parsed
      }
    });
  };


  const handleExcludeUnsubscribedChange = (exclude: boolean) => {
    onChange({
      recipients: {
        ...data.recipients,
        criteria: {
          ...data.recipients.criteria,
          excludeUnsubscribed: exclude
        }
      }
    });
  };

  const renderCriteriaSelection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Équipes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Équipes
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {teams.map(team => (
              <label key={team.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.recipients.criteria?.teams?.includes(team.id) || false}
                  onChange={(e) => {
                    const currentTeams = data.recipients.criteria?.teams || [];
                    const newTeams = e.target.checked
                      ? [...currentTeams, team.id]
                      : currentTeams.filter(id => id !== team.id);
                    handleCriteriaChange('teams', newTeams);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{team.name}</span>
                <Badge variant="secondary" className="text-xs">


                  {team.memberCount}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Rôles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rôles
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {roles.map(role => (
              <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.recipients.criteria?.roles?.includes(role.id) || false}
                  onChange={(e) => {
                    const currentRoles = data.recipients.criteria?.roles || [];
                    const newRoles = e.target.checked
                      ? [...currentRoles, role.id]
                      : currentRoles.filter(id => id !== role.id);
                    handleCriteriaChange('roles', newRoles);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{role.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {role.userCount}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Départements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Départements
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {departments.map(dept => (
              <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.recipients.criteria?.departments?.includes(dept.id) || false}
                  onChange={(e) => {
                    const currentDepts = data.recipients.criteria?.departments || [];
                    const newDepts = e.target.checked
                      ? [...currentDepts, dept.id]
                      : currentDepts.filter(id => id !== dept.id);
                    handleCriteriaChange('departments', newDepts);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{dept.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {dept.memberCount}
                </Badge>
              </label>
            ))}
          </div>
        </div>

        {/* Participants d'événements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Participants d'événements
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
            {events.map(event => (
              <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.recipients.criteria?.eventParticipants?.includes(event.id) || false}
                  onChange={(e) => {
                    const currentEvents = data.recipients.criteria?.eventParticipants || [];
                    const newEvents = e.target.checked
                      ? [...currentEvents, event.id]
                      : currentEvents.filter(id => id !== event.id);
                    handleCriteriaChange('eventParticipants', newEvents);
                  }}
                  className="rounded border-gray-300"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-900">{event.name}</span>
                  <div className="text-xs text-gray-500">
                    {new Date(event.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {event.participantCount}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.recipients.criteria?.excludeUnsubscribed || false}
            onChange={(e) => handleExcludeUnsubscribedChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-900">
            Exclure les utilisateurs désabonnés
          </span>
        </label>
      </div>

      {/* Aperçu des destinataires */}
      {data.recipients.totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Aperçu des destinataires ({data.recipients.totalCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {recipientPreview.slice(0, 5).map((recipient, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {recipient.firstName} {recipient.lastName}
                      </span>
                      <div className="text-xs text-gray-500">
                        {recipient.email}
                      </div>
                    </div>
                    {recipient.team && (
                      <Badge variant="outline" className="text-xs">
                        {recipient.team}
                      </Badge>
                    )}
                  </div>
                ))}

                {recipientPreview.length > 5 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-gray-500">
                      ... et {recipientPreview.length - 5} autres destinataires
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Voir tous les destinataires
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter la liste
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sélection du type de destinataires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            data.recipients.type === 'criteria' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => handleRecipientTypeChange('criteria')}
        >
          <CardContent className="p-6 text-center">
            <Filter className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Par critères
            </h3>
            <p className="text-sm text-gray-600">
              Sélectionnez par équipes, rôles ou événements
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            data.recipients.type === 'list' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => handleRecipientTypeChange('list')}
        >
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Liste existante
            </h3>
            <p className="text-sm text-gray-600">
              Utilisez une liste de destinataires sauvegardée
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            data.recipients.type === 'import' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={() => handleRecipientTypeChange('import')}
        >
          <CardContent className="p-6 text-center">
            <Upload className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              Importer
            </h3>
            <p className="text-sm text-gray-600">
              Importez depuis un fichier CSV ou Excel
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contenu selon le type sélectionné */}
      {data.recipients.type === 'criteria' && renderCriteriaSelection()}

      {data.recipients.type === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipientLists.map(list => (
              <Card key={list.id} className={`${selectedListId === list.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{list.name}</div>
                    <div className="text-sm text-gray-500">
                      {list.recipientCount} contacts • créé le {new Date(list.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Button size="sm" variant={selectedListId === list.id ? 'default' : 'outline'} onClick={() => handleSelectList(list.id)}>
                    Sélectionner
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedListId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Liste sélectionnée: {recipientLists.find(l => l.id === selectedListId)?.name} ({recipientLists.find(l => l.id === selectedListId)?.recipientCount})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {data.recipients.type === 'import' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="file" accept=".csv" onChange={handleFileImport} />
            <Button variant="outline" size="sm" onClick={() => {
              setImportPreview([]);
              onChange({ recipients: { ...data.recipients, externalRecipients: [], totalCount: 0, previewRecipients: [] } });
            }}>
              Réinitialiser
            </Button>
          </div>
          {importError && (
            <div className="text-sm text-red-600">{importError}</div>
          )}
          {data.recipients.totalCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Aperçu de l'import ({data.recipients.totalCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(data.recipients.previewRecipients || []).slice(0, 5).map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {r.firstName} {r.lastName}
                      </span>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Résumé */}
      {data.recipients.totalCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {data.recipients.totalCount} destinataire{data.recipients.totalCount > 1 ? 's' : ''} sélectionné{data.recipients.totalCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};