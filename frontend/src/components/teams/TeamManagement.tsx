import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import type { Team, TeamStats } from '../../shared';
import { teamService } from '../services/teamService';
import { toast } from 'react-toastify';

interface TeamManagementProps {
  organizationId: string;
  onTeamSelect?: (team: Team) => void;
  onTeamCreate?: () => void;
  onTeamEdit?: (team: Team) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  organizationId,
  onTeamSelect,
  onTeamCreate,
  onTeamEdit
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [teamStats, setTeamStats] = useState<Record<string, TeamStats>>({});

  useEffect(() => {
    loadTeams();
  }, [organizationId, searchTerm, selectedDepartment]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await teamService.getTeams(organizationId, {
        search: searchTerm || undefined,
        department: selectedDepartment || undefined,
        isActive: true
      });

      if (response.success && response.data) {
        setTeams(response.data.data);
        
        // Charger les statistiques pour chaque équipe
        const statsPromises = response.data.data.map(async (team) => {
          try {
            const statsResponse = await teamService.getTeamStats(organizationId, team.id);
            return { teamId: team.id, stats: statsResponse.data };
          } catch (error) {
            return { teamId: team.id, stats: null };
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, result) => {
          if (result.stats) {
            acc[result.teamId] = result.stats;
          }
          return acc;
        }, {} as Record<string, TeamStats>);

        setTeamStats(statsMap);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des équipes');
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${team.name}" ?`)) {
      return;
    }

    try {
      await teamService.deleteTeam(organizationId, team.id);
      toast.success('Équipe supprimée avec succès');
      loadTeams();
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'équipe');
      console.error('Error deleting team:', error);
    }
  };

  const departments = [...new Set(teams.map(team => team.department).filter(Boolean))];

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
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Équipes</h2>
          <p className="text-gray-600">Gérez les équipes et leurs membres</p>
        </div>
        <Button onClick={onTeamCreate} className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Équipe
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher une équipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les départements</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const stats = teamStats[team.id];
          return (
            <Card key={team.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1" onClick={() => onTeamSelect?.(team)}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {team.name}
                  </h3>
                  {team.department && (
                    <Badge variant="secondary" className="mb-2">
                      {team.department}
                    </Badge>
                  )}
                  {team.description && (
                    <p className="text-sm text-gray-600 mb-3">
                      {team.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTeamEdit?.(team);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTeam(team);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Team Stats */}
              {stats && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.memberCount}
                    </div>
                    <div className="text-xs text-gray-500">Membres</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.eventsCreated}
                    </div>
                    <div className="text-xs text-gray-500">Événements</div>
                  </div>
                </div>
              )}

              {/* Team Permissions */}
              <div className="flex flex-wrap gap-1 mb-4">
                {team.settings.canValidateAttendance && (
                  <Badge variant="outline" className="text-xs">
                    Validation présences
                  </Badge>
                )}
                {team.settings.canCreateEvents && (
                  <Badge variant="outline" className="text-xs">
                    Création événements
                  </Badge>
                )}
                {team.settings.canInviteParticipants && (
                  <Badge variant="outline" className="text-xs">
                    Invitations
                  </Badge>
                )}
              </div>

              {/* Team Members Preview */}
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-1" />
                {team.members.length} membre{team.members.length > 1 ? 's' : ''}
                {stats?.activeMembers !== undefined && (
                  <span className="ml-2">
                    ({stats.activeMembers} actif{stats.activeMembers > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {teams.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune équipe trouvée
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedDepartment 
              ? 'Aucune équipe ne correspond à vos critères de recherche.'
              : 'Commencez par créer votre première équipe.'
            }
          </p>
          {!searchTerm && !selectedDepartment && (
            <Button onClick={onTeamCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une équipe
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};