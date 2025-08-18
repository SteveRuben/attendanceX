import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  Scan,
  UserCheck,
  AlertTriangle,
  MoreVertical,
  Eye,
  Edit
} from 'lucide-react';
import { EventParticipant, AttendanceStatus, ParticipantStatus } from '@attendance-x/shared';
import { participantService } from '@/services/participantService';
import { toast } from 'react-toastify';

interface AttendanceValidationInterfaceProps {
  eventId: string;
  userId: string; // ID du membre qui valide
  canBulkValidate?: boolean;
  canOverride?: boolean;
  maxValidationsPerSession?: number;
}

interface ValidationPermissions {
  canValidate: boolean;
  canOverride: boolean;
  canBulkValidate: boolean;
  maxValidationsPerSession?: number;
  allowedEvents?: string[];
}

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

export const AttendanceValidationInterface: React.FC<AttendanceValidationInterfaceProps> = ({
  eventId,
  userId,
  canBulkValidate = false,
  canOverride = false,
  maxValidationsPerSession
}) => {
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [validationsCount, setValidationsCount] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permissions, setPermissions] = useState<ValidationPermissions>({
    canValidate: true,
    canOverride: false,
    canBulkValidate: false
  });

  useEffect(() => {
    loadParticipants();
    checkPermissions();
  }, [eventId, userId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await participantService.getParticipants(eventId, {
        status: ParticipantStatus.CONFIRMED
      });

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

  const checkPermissions = async () => {
    try {
      // Simuler la vérification des permissions
      // En réalité, cela viendrait du service teamService.canValidateAttendance
      setPermissions({
        canValidate: true,
        canOverride,
        canBulkValidate,
        maxValidationsPerSession
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleValidateAttendance = async (participantId: string, status: AttendanceStatus) => {
    if (!permissions.canValidate) {
      toast.error('Vous n\'avez pas les permissions pour valider les présences');
      return;
    }

    if (maxValidationsPerSession && validationsCount >= maxValidationsPerSession) {
      toast.error(`Limite de validations atteinte (${maxValidationsPerSession})`);
      return;
    }

    try {
      await participantService.markAttendance(eventId, participantId, status, userId);
      toast.success('Présence validée avec succès');
      setValidationsCount(prev => prev + 1);
      loadParticipants();
    } catch (error) {
      toast.error('Erreur lors de la validation');
      console.error('Error validating attendance:', error);
    }
  };

  const handleBulkValidation = async (status: AttendanceStatus) => {
    if (!permissions.canBulkValidate) {
      toast.error('Vous n\'avez pas les permissions pour la validation en masse');
      return;
    }

    if (selectedParticipants.length === 0) {
      toast.warning('Veuillez sélectionner au moins un participant');
      return;
    }

    try {
      const attendances = selectedParticipants.map(participantId => ({
        participantId,
        status
      }));

      const response = await participantService.bulkMarkAttendance(eventId, attendances, userId);
      
      if (response.success && response.data) {
        toast.success(`${response.data.successful} présence(s) validée(s)`);
        if (response.data.failed > 0) {
          toast.warning(`${response.data.failed} validation(s) échouée(s)`);
        }
        setValidationsCount(prev => prev + response.data.successful);
        setSelectedParticipants([]);
        loadParticipants();
      }
    } catch (error) {
      toast.error('Erreur lors de la validation en masse');
      console.error('Error bulk validating:', error);
    }
  };

  const handleQRValidation = async (qrCode: string) => {
    try {
      const response = await participantService.validateQRCode(qrCode, userId);
      
      if (response.success && response.data) {
        if (response.data.valid) {
          toast.success(`Présence validée pour ${response.data.participant?.firstName} ${response.data.participant?.lastName}`);
          setValidationsCount(prev => prev + 1);
          loadParticipants();
        } else {
          toast.error(response.data.message || 'QR code invalide');
        }
      }
    } catch (error) {
      toast.error('Erreur lors de la validation QR');
      console.error('Error validating QR:', error);
    }
  };

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = !searchTerm || 
      participant.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || participant.attendanceStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedParticipants.length === filteredParticipants.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(filteredParticipants.map(p => p.id));
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Validation des Présences</h2>
          <p className="text-gray-600">
            {participants.length} participant(s) • {validationsCount} validation(s) effectuée(s)
            {maxValidationsPerSession && ` • ${maxValidationsPerSession - validationsCount} restante(s)`}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowQRScanner(true)}
            variant="outline"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Scanner QR
          </Button>
          
          {permissions.canBulkValidate && selectedParticipants.length > 0 && (
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => handleBulkValidation(AttendanceStatus.PRESENT)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Présent ({selectedParticipants.length})
              </Button>
              <Button
                onClick={() => handleBulkValidation(AttendanceStatus.ABSENT)}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Absent
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un participant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'all')}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value={AttendanceStatus.PRESENT}>Présent</option>
              <option value={AttendanceStatus.ABSENT}>Absent</option>
              <option value={AttendanceStatus.LATE}>En retard</option>
              <option value={AttendanceStatus.EXCUSED}>Excusé</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Participants List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {permissions.canBulkValidate && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.length === filteredParticipants.length && filteredParticipants.length > 0}
                    onChange={handleSelectAll}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">
                    Sélectionner tout ({filteredParticipants.length})
                  </span>
                </label>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedParticipants.length > 0 && `${selectedParticipants.length} sélectionné(s)`}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredParticipants.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun participant trouvé
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun participant ne correspond à vos critères de recherche.'
                  : 'Aucun participant confirmé pour cet événement.'
                }
              </p>
            </div>
          ) : (
            filteredParticipants.map((participant) => {
              const StatusIcon = participant.attendanceStatus 
                ? ATTENDANCE_STATUS_ICONS[participant.attendanceStatus]
                : Users;
              
              return (
                <div key={participant.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {permissions.canBulkValidate && (
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participant.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipants([...selectedParticipants, participant.id]);
                            } else {
                              setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id));
                            }
                          }}
                        />
                      )}
                      
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      
                      <div>
                        <div className="font-medium text-gray-900">
                          {participant.firstName} {participant.lastName}
                          {participant.isInternalUser && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Interne
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.email}
                          {participant.phone && ` • ${participant.phone}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Current Status */}
                      {participant.attendanceStatus ? (
                        <Badge className={ATTENDANCE_STATUS_COLORS[participant.attendanceStatus]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {participant.attendanceStatus}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Non validé
                        </Badge>
                      )}
                      
                      {/* Validation Time */}
                      {participant.validatedAt && (
                        <div className="text-xs text-gray-500">
                          {new Date(participant.validatedAt).toLocaleTimeString()}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        <Button
                          onClick={() => handleValidateAttendance(participant.id, AttendanceStatus.PRESENT)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!permissions.canValidate || (maxValidationsPerSession && validationsCount >= maxValidationsPerSession)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          onClick={() => handleValidateAttendance(participant.id, AttendanceStatus.LATE)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={!permissions.canValidate || (maxValidationsPerSession && validationsCount >= maxValidationsPerSession)}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          onClick={() => handleValidateAttendance(participant.id, AttendanceStatus.ABSENT)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          disabled={!permissions.canValidate || (maxValidationsPerSession && validationsCount >= maxValidationsPerSession)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        
                        {permissions.canOverride && (
                          <Button
                            onClick={() => handleValidateAttendance(participant.id, AttendanceStatus.EXCUSED)}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Scanner QR Code</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQRScanner(false)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center py-8">
                <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Positionnez le QR code du participant devant la caméra
                </p>
                
                {/* Ici, vous intégreriez une bibliothèque de scan QR comme react-qr-scanner */}
                <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-gray-500">
                    <Scan className="w-8 h-8 mx-auto mb-2" />
                    Caméra QR Scanner
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  Ou saisissez le code manuellement :
                </div>
                <input
                  type="text"
                  placeholder="Code QR"
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleQRValidation(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};