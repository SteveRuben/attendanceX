import React, { useState, useEffect } from 'react';
import { organizationService } from '../../services/organizationService';
import { toast } from 'react-toastify';

interface OrganizationMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  lastActivity?: Date;
  avatar?: string;
}

interface OrganizationInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  message?: string;
}

interface OrganizationMembersListProps {
  organizationId: string;
  currentUserId: string;
  canManageMembers: boolean;
}

const ROLE_LABELS = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  manager: 'Manager',
  employee: 'Employé',
  guest: 'Invité'
};

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  employee: 'bg-green-100 text-green-800',
  guest: 'bg-gray-100 text-gray-800'
};

export const OrganizationMembersList: React.FC<OrganizationMembersListProps> = ({
  organizationId,
  currentUserId,
  canManageMembers
}) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, invitationsData] = await Promise.all([
        organizationService.getOrganizationMembers(organizationId),
        organizationService.getOrganizationInvitations(organizationId)
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      return;
    }

    try {
      await organizationService.removeMember(organizationId, memberId);
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Membre supprimé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la suppression du membre');
      console.error('Error removing member:', error);
    }
  };

  const handleChangeRole = (member: OrganizationMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedMember) return;

    try {
      await organizationService.updateMemberRole(organizationId, selectedMember.id, newRole);
      setMembers(members.map(m => 
        m.id === selectedMember.id ? { ...m, role: newRole } : m
      ));
      setShowRoleModal(false);
      setSelectedMember(null);
      toast.success('Rôle mis à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
      console.error('Error updating member role:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) {
      return;
    }

    try {
      await organizationService.cancelInvitation(organizationId, invitationId);
      setInvitations(invitations.filter(i => i.id !== invitationId));
      toast.success('Invitation annulée avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'annulation de l\'invitation');
      console.error('Error canceling invitation:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      pending: 'En attente'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      pending: 'En attente',
      accepted: 'Acceptée',
      expired: 'Expirée'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header avec onglets */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Gestion des membres</h3>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les membres et les invitations de votre organisation
          </p>
        </div>
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Membres ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Invitations ({invitations.filter(i => i.status === 'pending').length})
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="px-6 py-4">
        {activeTab === 'members' && (
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun membre</h3>
                <p className="mt-1 text-sm text-gray-500">Commencez par inviter des membres à votre organisation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {member.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={member.avatar} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}`
                            : member.email
                          }
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS]}`}>
                            {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS]}
                          </span>
                          {getStatusBadge(member.status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Rejoint le {formatDate(member.joinedAt)}
                        </p>
                        {member.lastActivity && (
                          <p className="text-xs text-gray-400">
                            Dernière activité: {formatDate(member.lastActivity)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {canManageMembers && member.id !== currentUserId && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleChangeRole(member)}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          Modifier le rôle
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-500 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune invitation</h3>
                <p className="mt-1 text-sm text-gray-500">Les invitations envoyées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                        {getInvitationStatusBadge(invitation.status)}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[invitation.role as keyof typeof ROLE_COLORS]}`}>
                          {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS]}
                        </span>
                        <p className="text-xs text-gray-500">
                          Envoyée le {formatDate(invitation.createdAt)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expire le {formatDate(invitation.expiresAt)}
                        </p>
                      </div>
                      {invitation.message && (
                        <p className="text-sm text-gray-600 mt-2 italic">"{invitation.message}"</p>
                      )}
                    </div>
                    
                    {canManageMembers && invitation.status === 'pending' && (
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-500 text-sm font-medium ml-4"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de changement de rôle */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Modifier le rôle de {selectedMember.firstName || selectedMember.email}
              </h3>
              
              <div className="space-y-3">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <label key={value} className="flex items-center">
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={newRole === value}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-3 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRole}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};