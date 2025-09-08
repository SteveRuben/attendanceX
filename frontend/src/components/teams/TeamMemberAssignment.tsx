import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  X, 
  Search,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Eye
} from 'lucide-react';
import { Team, TeamMember, OrganizationUser, TeamRole } from '../../shared';
import { teamService } from '@/services/teamService';
import { organizationService } from '@/services/organizationService';
import { toast } from 'react-toastify';

interface TeamMemberAssignmentProps {
  organizationId: string;
  team: Team;
  onUpdate?: () => void;
}

const ROLE_ICONS = {
  [TeamRole.MANAGER]: Crown,
  [TeamRole.MEMBER]: Shield,
  [TeamRole.VIEWER]: Eye
};

const ROLE_LABELS = {
  [TeamRole.MANAGER]: 'Manager',
  [TeamRole.MEMBER]: 'Membre',
  [TeamRole.VIEWER]: 'Observateur'
};

const ROLE_COLORS = {
  [TeamRole.MANAGER]: 'bg-purple-100 text-purple-800',
  [TeamRole.MEMBER]: 'bg-blue-100 text-blue-800',
  [TeamRole.VIEWER]: 'bg-gray-100 text-gray-800'
};

export const TeamMemberAssignment: React.FC<TeamMemberAssignmentProps> = ({
  organizationId,
  team,
  onUpdate
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<TeamRole>(TeamRole.MEMBER);

  useEffect(() => {
    loadTeamMembers();
    loadAvailableUsers();
  }, [organizationId, team.id]);

  const loadTeamMembers = async () => {
    try {
      const response = await teamService.getTeamMembers(organizationId, team.id);
      if (response.success && response.data) {
        setTeamMembers(response.data.data);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des membres');
      console.error('Error loading team members:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      // Charger tous les utilisateurs de l'organisation
      const response = await organizationService.getMembers(organizationId);
      if (response.success && response.data) {
        // Filtrer les utilisateurs qui ne sont pas déjà dans l'équipe
        const currentMemberIds = teamMembers.map(member => member.userId);
        const available = response.data.filter(
          user => !currentMemberIds.includes(user.userId)
        );
        setAvailableUsers(available);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
      console.error('Error loading available users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const promises = selectedUsers.map(userId =>
        teamService.addTeamMember(organizationId, team.id, userId, selectedRole)
      );

      await Promise.all(promises);
      toast.success(`${selectedUsers.length} membre(s) ajouté(s) avec succès`);
      
      setSelectedUsers([]);
      setShowAddModal(false);
      loadTeamMembers();
      loadAvailableUsers();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout des membres');
      console.error('Error adding team members:', error);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ce membre de l'équipe ?`)) {
      return;
    }

    try {
      await teamService.removeTeamMember(organizationId, team.id, member.userId);
      toast.success('Membre retiré avec succès');
      loadTeamMembers();
      loadAvailableUsers();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la suppression du membre');
      console.error('Error removing team member:', error);
    }
  };

  const handleUpdateMemberRole = async (member: TeamMember, newRole: TeamRole) => {
    try {
      await teamService.updateTeamMemberRole(organizationId, team.id, member.userId, newRole);
      toast.success('Rôle mis à jour avec succès');
      loadTeamMembers();
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
      console.error('Error updating member role:', error);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Membres de l'équipe "{team.name}"
          </h3>
          <p className="text-gray-600">
            {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter des membres
        </Button>
      </div>

      {/* Current Members */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Membres actuels</h4>
        
        {teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun membre dans cette équipe</p>
            <Button 
              variant="outline" 
              onClick={() => setShowAddModal(true)}
              className="mt-4"
            >
              Ajouter le premier membre
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role];
              return (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {/* Nom de l'utilisateur - à récupérer via une jointure */}
                        Utilisateur {member.userId}
                      </div>
                      <div className="text-sm text-gray-500">
                        Membre depuis {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Role Selector */}
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateMemberRole(member, e.target.value as TeamRole)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                    
                    <Badge className={ROLE_COLORS[member.role]}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Members Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ajouter des membres</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rôle par défaut
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Available Users */}
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucun utilisateur disponible
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredAvailableUsers.map((user) => (
                      <label
                        key={user.userId}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.userId]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.userId));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email} • {user.department || 'Aucun département'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <div className="text-sm text-gray-600">
                {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddMembers}
                  disabled={selectedUsers.length === 0}
                >
                  Ajouter {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};