import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  UserPlus,
  Shield,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { teamService } from '@/services';
import type { Team } from '../../shared';
import { toast } from 'react-toastify';

interface TeamManagementCenterProps {
  organizationId: string;
}

export const TeamManagementCenter: React.FC<TeamManagementCenterProps> = ({ organizationId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMembers: 0,
    activeTeams: 0,
    departments: [] as string[]
  });

  useEffect(() => {
    loadTeams();
    loadStats();
  }, [organizationId, departmentFilter]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await teamService.getTeams(organizationId, {
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        search: searchTerm || undefined,
        isActive: true
      });

      if (response.success && response.data) {
        setTeams(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Erreur lors du chargement des équipes');
      
      // Données de fallback pour la démonstration
      const mockTeams: Team[] = [
        {
          id: '1',
          name: 'Équipe Développement',
          description: 'Équipe en charge du développement des applications',
          department: 'IT',
          managerId: 'manager1',
          members: [
            {
              id: 'member1',
              userId: 'user1',
              teamId: '1',
              role: 'developer',
              joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              isActive: true
            },
            {
              id: 'member2',
              userId: 'user2',
              teamId: '1',
              role: 'senior_developer',
              joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              isActive: true
            }
          ],
          isActive: true,
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Équipe Marketing',
          description: 'Équipe en charge des campagnes marketing et communication',
          department: 'Marketing',
          managerId: 'manager2',
          members: [
            {
              id: 'member3',
              userId: 'user3',
              teamId: '2',
              role: 'marketing_specialist',
              joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              isActive: true
            }
          ],
          isActive: true,
          createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Support Client',
          description: 'Équipe de support et relation client',
          department: 'Support',
          managerId: 'manager3',
          members: [
            {
              id: 'member4',
              userId: 'user4',
              teamId: '3',
              role: 'support_agent',
              joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              isActive: true
            },
            {
              id: 'member5',
              userId: 'user5',
              teamId: '3',
              role: 'support_lead',
              joinedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
              isActive: true
            }
          ],
          isActive: true,
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setTeams(mockTeams);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculer les statistiques à partir des équipes mockées
      const totalTeams = 3;
      const totalMembers = 5;
      const activeTeams = 3;
      const departments = ['IT', 'Marketing', 'Support'];

      setStats({
        totalTeams,
        totalMembers,
        activeTeams,
        departments
      });
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { variant: any; label: string }> = {
      manager: { variant: 'default', label: 'Manager' },
      senior_developer: { variant: 'secondary', label: 'Senior Dev' },
      developer: { variant: 'outline', label: 'Développeur' },
      marketing_specialist: { variant: 'outline', label: 'Marketing' },
      support_agent: { variant: 'outline', label: 'Support' },
      support_lead: { variant: 'secondary', label: 'Lead Support' }
    };

    const config = roleConfig[role] || { variant: 'outline', label: role };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Équipes</h1>
          <p className="text-gray-600">
            Organisez vos équipes et gérez les membres
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Équipe
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Équipes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Membres</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Équipes Actives</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTeams}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Départements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.departments.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une équipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les départements</option>
            {stats.departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Actions rapides */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Plus className="h-6 w-6" />
            <span>Créer une Équipe</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <UserPlus className="h-6 w-6" />
            <span>Inviter des Membres</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Shield className="h-6 w-6" />
            <span>Gérer les Permissions</span>
          </Button>
        </div>
      </Card>

      {/* Liste des équipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeams.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Aucune équipe trouvée' : 'Aucune équipe'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Essayez de modifier vos critères de recherche.'
                  : 'Créez votre première équipe pour commencer.'
                }
              </p>
              {!searchTerm && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une équipe
                </Button>
              )}
            </Card>
          </div>
        ) : (
          filteredTeams.map((team) => (
            <Card key={team.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {team.department}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{team.description}</p>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Membres</span>
                  <span className="font-medium">{team.members.length}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Créée le</span>
                  <span className="font-medium">{formatDate(team.createdAt)}</span>
                </div>

                {team.members.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Membres récents :</p>
                    <div className="space-y-1">
                      {team.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">Membre {member.userId}</span>
                          {getRoleBadge(member.role)}
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{team.members.length - 3} autres membres
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Mail className="h-4 w-4 mr-1" />
                  Contacter
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};