import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  Globe,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { 
  EventParticipant, 
  ParticipantStatus, 
  AttendanceStatus,
  ParticipantFilters 
} from '../../shared';
import { participantService } from '@/services/participantService';
import { toast } from 'react-toastify';

interface ParticipantListManagerProps {
  eventId: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  onParticipantSelect?: (participant: EventParticipant) => void;
}

const STATUS_COLORS = {
  [ParticipantStatus.INVITED]: 'bg-blue-100 text-blue-800',
  [ParticipantStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [ParticipantStatus.DECLINED]: 'bg-red-100 text-red-800',
  [ParticipantStatus.ATTENDED]: 'bg-purple-100 text-purple-800',
  [ParticipantStatus.ABSENT]: 'bg-gray-100 text-gray-800'
};

const ATTENDANCE_STATUS_COLORS = {
  [AttendanceStatus.PRESENT]: 'bg-green-100 text-green-800',
  [AttendanceStatus.ABSENT]: 'bg-red-100 text-red-800',
  [AttendanceStatus.LATE]: 'bg-yellow-100 text-yellow-800',
  [AttendanceStatus.EXCUSED]: 'bg-blue-100 text-blue-800'
};

const ATTENDANCE_STATUS_ICONS = {
  [AttendanceStatus.PRESENT]: CheckCircle,
  [AttendanceStatus.ABSENT]: XCircle,
  [AttendanceStatus.LATE]: Clock,
  [AttendanceStatus.EXCUSED]: AlertTriangle
};

export const ParticipantListManager: React.FC<ParticipantListManagerProps> = ({
  eventId,
  canEdit = true,
  canDelete = true,
  canExport = true,
  onParticipantSelect
}) => {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [filters, setFilters] = useState<ParticipantFilters>({
    search: '',
    status: undefined,
    attendanceStatus: undefined,
    isInternalUser: undefined,
    language: undefined
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadParticipants();
    loadStats();
  }, [eventId, filters]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await participantService.getParticipants(eventId, filters);
      
      if (response.success && response.data) {
        setParticipants(response.data.data);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des participants');
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await participantService.getParticipantStats(eventId);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = (searchTerm: string) => {
    setFilters({ ...filters, search: searchTerm });
  };

  const handleFilterChange = (key: keyof ParticipantFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleSelectAll = () => {
    if (selectedParticipants.length === participants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(participants.map(p => p.id));
    }
  };

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleBulkAction = async (action: 'email' | 'sms' | 'delete' | 'export') => {
    if (selectedParticipants.length === 0) {
      toast.warning('Veuillez sélectionner au moins un participant');
      return;
    }

    try {
      switch (action) {
        case 'email':
          await participantService.sendBulkInvitations(eventId, selectedParticipants, {
            channels: ['email']
          });
          toast.success('Emails envoyés avec succès');
          break;
          
        case 'sms':
          await participantService.sendBulkInvitations(eventId, selectedParticipants, {
            channels: ['sms']
          });
          toast.success('SMS envoyés avec succès');
          break;
          
        case 'delete':
          if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedParticipants.length} participant(s) ?`)) {
            const promises = selectedParticipants.map(id =>
              participantService.deleteParticipant(eventId, id)
            );
            await Promise.all(promises);
            toast.success('Participants supprimés avec succès');
            setSelectedParticipants([]);
            loadParticipants();
          }
          break;
          
        case 'export':
          await participantService.exportParticipants(eventId, 'csv', {
            // Filtrer par les participants sélectionnés
          });
          toast.success('Export en cours...');
          break;
      }
    } catch (error) {
      toast.error('Erreur lors de l\'action en masse');
      console.error('Bulk action error:', error);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce participant ?')) {
      return;
    }

    try {
      await participantService.deleteParticipant(eventId, participantId);
      toast.success('Participant supprimé avec succès');
      loadParticipants();
      loadStats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error('Delete error:', error);
    }
  };

  const getContactInfo = (participant: EventParticipant) => {
    const contacts = [];
    if (participant.email) contacts.push(participant.email);
    if (participant.phone) contacts.push(participant.phone);
    return contacts.join(' • ');
  };

  const getNotificationChannels = (participant: EventParticipant) => {
    const channels = [];
    if (participant.notificationPreferences.email) channels.push('Email');
    if (participant.notificationPreferences.sms) channels.push('SMS');
    return channels.join(', ') || 'Aucune';
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
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Participants</h2>
          <p className="text-gray-600">
            {participants.length} participant(s) • {selectedParticipants.length} sélectionné(s)
          </p>
        </div>
        
        {stats && (
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.confirmed}</div>
              <div className="text-xs text-gray-500">Confirmés</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.attended}</div>
              <div className="text-xs text-gray-500">Présents</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{stats.internalUsers}</div>
              <div className="text-xs text-gray-500">Internes</div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            
            {canExport && (
              <Button
                variant="outline"
                onClick={() => participantService.exportParticipants(eventId)}
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Tous</option>
                <option value={ParticipantStatus.INVITED}>Invité</option>
                <option value={ParticipantStatus.CONFIRMED}>Confirmé</option>
                <option value={ParticipantStatus.DECLINED}>Décliné</option>
                <option value={ParticipantStatus.ATTENDED}>Présent</option>
                <option value={ParticipantStatus.ABSENT}>Absent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Présence
              </label>
              <select
                value={filters.attendanceStatus || ''}
                onChange={(e) => handleFilterChange('attendanceStatus', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Tous</option>
                <option value={AttendanceStatus.PRESENT}>Présent</option>
                <option value={AttendanceStatus.ABSENT}>Absent</option>
                <option value={AttendanceStatus.LATE}>En retard</option>
                <option value={AttendanceStatus.EXCUSED}>Excusé</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.isInternalUser === undefined ? '' : filters.isInternalUser.toString()}
                onChange={(e) => handleFilterChange('isInternalUser', 
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Tous</option>
                <option value="true">Utilisateurs internes</option>
                <option value="false">Participants externes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langue
              </label>
              <select
                value={filters.language || ''}
                onChange={(e) => handleFilterChange('language', e.target.value || undefined)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Toutes</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedParticipants.length > 0 && (
        <Card className="p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-900">
              {selectedParticipants.length} participant(s) sélectionné(s)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleBulkAction('email')}
                size="sm"
                variant="outline"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button
                onClick={() => handleBulkAction('sms')}
                size="sm"
                variant="outline"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                SMS
              </Button>
              {canExport && (
                <Button
                  onClick={() => handleBulkAction('export')}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exporter
                </Button>
              )}
              {canDelete && (
                <Button
                  onClick={() => handleBulkAction('delete')}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Participants List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedParticipants.length === participants.length && participants.length > 0}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="text-sm font-medium">
                Sélectionner tout ({participants.length})
              </span>
            </label>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {participants.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun participant trouvé
              </h3>
              <p className="text-gray-600">
                {Object.values(filters).some(v => v) 
                  ? 'Aucun participant ne correspond à vos critères de recherche.'
                  : 'Aucun participant pour cet événement.'
                }
              </p>
            </div>
          ) : (
            participants.map((participant) => {
              const AttendanceIcon = participant.attendanceStatus 
                ? ATTENDANCE_STATUS_ICONS[participant.attendanceStatus]
                : null;
              
              return (
                <div key={participant.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleParticipantSelect(participant.id)}
                      />
                      
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900">
                            {participant.firstName} {participant.lastName}
                          </div>
                          
                          {participant.isInternalUser && (
                            <Badge variant="outline" className="text-xs">
                              Interne
                            </Badge>
                          )}
                          
                          {participant.notificationPreferences.language && (
                            <Badge variant="secondary" className="text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              {participant.notificationPreferences.language.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {getContactInfo(participant)}
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          Notifications: {getNotificationChannels(participant)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Status Badges */}
                      <Badge className={STATUS_COLORS[participant.status]}>
                        {participant.status}
                      </Badge>
                      
                      {participant.attendanceStatus && AttendanceIcon && (
                        <Badge className={ATTENDANCE_STATUS_COLORS[participant.attendanceStatus]}>
                          <AttendanceIcon className="w-3 h-3 mr-1" />
                          {participant.attendanceStatus}
                        </Badge>
                      )}
                      
                      {/* Validation Info */}
                      {participant.validatedAt && (
                        <div className="text-xs text-gray-500">
                          Validé le {new Date(participant.validatedAt).toLocaleString()}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        {canEdit && (
                          <Button
                            onClick={() => onParticipantSelect?.(participant)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {canDelete && (
                          <Button
                            onClick={() => handleDeleteParticipant(participant.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};