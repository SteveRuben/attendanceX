import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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

export const CampaignRecipientSelection: React.FC<CampaignRecipientSelectionProps> = ({
  data,
  onChange,
  organizationId
}) => {
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
      
      // Mock preview data
      const mockPreview: RecipientPreview[] = [
        { email: 'marie.dubois@example.com', firstName: 'Marie', lastName: 'Dubois', team: 'Marketing', role: 'Manager' },
        { email: 'jean.martin@example.com', firstName: 'Jean', lastName: 'Martin', team: 'Développement', role: 'Employé' },
        { email: 'sophie.bernard@example.com', firstName: 'Sophie', lastName: 'Bernard', team: 'Ventes', role: 'Employé' }
      ];
      
      setRecipientPreview(mockPreview);
      
      // Calculer le nombre total
      const totalCount = mockPreview.length;
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
      [field]: values
    };
    
    onChange({
      recipients: {
        ...data.recipients,
        criteria: newCriteria
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
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sélection par liste existante
          </h3>
          <p className="text-gray-600 mb-4">
            Cette fonctionnalité sera disponible prochainement
          </p>
        </div>
      )}

      {data.recipients.type === 'import' && (
        <div className="text-center py-12">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Import de destinataires
          </h3>
          <p className="text-gray-600 mb-4">
            Cette fonctionnalité sera disponible prochainement
          </p>
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