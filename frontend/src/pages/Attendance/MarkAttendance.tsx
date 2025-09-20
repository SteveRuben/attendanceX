// src/pages/Attendance/MarkAttendance.tsx - Validation manuelle des présences
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Search, 
  Users, 
  QrCode,
  MapPin,
  Camera,
  Smartphone,
  Save,
  ArrowLeft,
  UserCheck,
  UserX,
  Timer,
  Calendar
} from 'lucide-react';
import { eventService, attendanceService } from '../services';
import type { Event, Attendance, AttendanceStatus, AttendanceMethod } from '../../shared';
import { toast } from 'react-toastify';

interface ParticipantAttendance {
  userId: string;
  user: any;
  status: AttendanceStatus;
  method: AttendanceMethod;
  notes: string;
  checkInTime?: string;
  checkOutTime?: string;
  isModified: boolean;
}

const MarkAttendance = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageAttendances } = usePermissions();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participantAttendances, setParticipantAttendances] = useState<ParticipantAttendance[]>([]);
  const [existingAttendances, setExistingAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const [bulkAction, setBulkAction] = useState<{
    status: AttendanceStatus;
    method: AttendanceMethod;
    notes: string;
  }>({
    status: 'present',
    method: 'manual',
    notes: ''
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (eventId) {
      loadEventAndAttendances();
    }
  }, [eventId]);

  const loadEventAndAttendances = async () => {
    try {
      setLoading(true);
      
      // Load event details
      const eventResponse = await eventService.getEventById(eventId!);
      if (!eventResponse.success || !eventResponse.data) {
        toast.error('Événement non trouvé');
        navigate('/events');
        return;
      }
      
      const eventData = eventResponse.data;
      setEvent(eventData);
      
      // Load existing attendances
      const attendanceResponse = await attendanceService.getEventAttendances(eventId!);
      const existingAttendances = attendanceResponse.success ? attendanceResponse.data : [];
      setExistingAttendances(existingAttendances);
      
      // Initialize participant attendances
      const participantAttendances: ParticipantAttendance[] = eventData.participants?.map(participant => {
        const existingAttendance = existingAttendances.find(a => a.userId === participant.id);
        
        return {
          userId: participant.id,
          user: participant,
          status: existingAttendance?.status || 'absent',
          method: existingAttendance?.method || 'manual',
          notes: existingAttendance?.notes || '',
          checkInTime: existingAttendance?.checkInTime,
          checkOutTime: existingAttendance?.checkOutTime,
          isModified: false
        };
      }) || [];
      
      setParticipantAttendances(participantAttendances);
      
    } catch (error: any) {
      console.error('Error loading event and attendances:', error);
      toast.error('Erreur lors du chargement');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const updateParticipantAttendance = (userId: string, updates: Partial<ParticipantAttendance>) => {
    setParticipantAttendances(prev => 
      prev.map(pa => 
        pa.userId === userId 
          ? { ...pa, ...updates, isModified: true }
          : pa
      )
    );
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const statusConfig = {
      present: { variant: 'default' as const, label: 'Présent', icon: CheckCircle },
      absent: { variant: 'destructive' as const, label: 'Absent', icon: XCircle },
      late: { variant: 'secondary' as const, label: 'En retard', icon: Timer },
      excused: { variant: 'outline' as const, label: 'Excusé', icon: AlertCircle },
      left_early: { variant: 'secondary' as const, label: 'Parti tôt', icon: Timer }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status, icon: AlertCircle };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getMethodBadge = (method: AttendanceMethod) => {
    const methodConfig = {
      qr_code: { variant: 'default' as const, label: 'QR Code', icon: QrCode },
      geolocation: { variant: 'secondary' as const, label: 'Géolocalisation', icon: MapPin },
      manual: { variant: 'outline' as const, label: 'Manuel', icon: UserCheck },
      biometric: { variant: 'default' as const, label: 'Biométrique', icon: Camera },
      nfc: { variant: 'secondary' as const, label: 'NFC', icon: Smartphone }
    };

    const config = methodConfig[method] || { variant: 'outline' as const, label: method, icon: UserCheck };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const handleBulkAction = () => {
    if (selectedParticipants.length === 0) {
      toast.warning('Aucun participant sélectionné');
      return;
    }

    selectedParticipants.forEach(userId => {
      updateParticipantAttendance(userId, {
        status: bulkAction.status,
        method: bulkAction.method,
        notes: bulkAction.notes,
        checkInTime: bulkAction.status === 'present' ? new Date().toISOString() : undefined
      });
    });

    setSelectedParticipants([]);
    toast.success(`${selectedParticipants.length} présence(s) mise(s) à jour`);
  };

  const handleSaveAttendances = async () => {
    const modifiedAttendances = participantAttendances.filter(pa => pa.isModified);
    
    if (modifiedAttendances.length === 0) {
      toast.info('Aucune modification à sauvegarder');
      return;
    }

    try {
      setSaving(true);
      
      // Use bulk mark attendance API
      const attendancesByStatus = modifiedAttendances.reduce((acc, pa) => {
        if (!acc[pa.status]) acc[pa.status] = [];
        acc[pa.status].push(pa.userId);
        return acc;
      }, {} as Record<AttendanceStatus, string[]>);

      const promises = Object.entries(attendancesByStatus).map(([status, userIds]) => {
        const operation = status === 'present' ? 'mark_present' : 
                         status === 'late' ? 'mark_late' : 'mark_absent';
        
        return attendanceService.bulkMarkAttendance(
          operation as any,
          eventId!,
          userIds,
          `Marquage manuel par ${user?.displayName || user?.email}`
        );
      });

      await Promise.all(promises);
      
      toast.success('Présences sauvegardées avec succès');
      
      // Reset modification flags
      setParticipantAttendances(prev => 
        prev.map(pa => ({ ...pa, isModified: false }))
      );
      
    } catch (error: any) {
      console.error('Error saving attendances:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const filteredParticipants = participantAttendances.filter(pa => {
    const matchesSearch = !searchTerm || 
      pa.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pa.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pa.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pa.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || pa.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: participantAttendances.length,
    present: participantAttendances.filter(pa => pa.status === 'present').length,
    absent: participantAttendances.filter(pa => pa.status === 'absent').length,
    late: participantAttendances.filter(pa => pa.status === 'late').length,
    excused: participantAttendances.filter(pa => pa.status === 'excused').length,
    modified: participantAttendances.filter(pa => pa.isModified).length
  };

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!event || !canManageAttendances) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions pour marquer les présences de cet événement.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/events/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'événement
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marquer les présences</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {stats.modified > 0 && (
            <Badge variant="secondary">
              {stats.modified} modification(s) en attente
            </Badge>
          )}
          <Button 
            onClick={handleSaveAttendances} 
            disabled={saving || stats.modified === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-sm text-muted-foreground">Présents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <div className="text-sm text-muted-foreground">Absents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <div className="text-sm text-muted-foreground">En retard</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.excused}</div>
            <div className="text-sm text-muted-foreground">Excusés</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="individual">Marquage individuel</TabsTrigger>
          <TabsTrigger value="bulk">Actions groupées</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Rechercher un participant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as AttendanceStatus | 'all')}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="present">Présent</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="excused">Excusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Participants List */}
          <div className="space-y-4">
            {filteredParticipants.map((pa) => (
              <Card key={pa.userId} className={`${pa.isModified ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={pa.user?.profilePicture} />
                        <AvatarFallback>{getUserInitials(pa.user)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {pa.user?.displayName || `${pa.user?.firstName} ${pa.user?.lastName}`}
                          </h3>
                          {pa.isModified && (
                            <Badge variant="secondary" className="text-xs">
                              Modifié
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{pa.user?.email}</p>
                        {pa.checkInTime && (
                          <p className="text-xs text-muted-foreground">
                            Arrivé le {new Date(pa.checkInTime).toLocaleString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-2">
                        <Select 
                          value={pa.status} 
                          onValueChange={(value) => updateParticipantAttendance(pa.userId, { 
                            status: value as AttendanceStatus,
                            checkInTime: value === 'present' && !pa.checkInTime ? new Date().toISOString() : pa.checkInTime
                          })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Présent</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">En retard</SelectItem>
                            <SelectItem value="excused">Excusé</SelectItem>
                            <SelectItem value="left_early">Parti tôt</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select 
                          value={pa.method} 
                          onValueChange={(value) => updateParticipantAttendance(pa.userId, { method: value as AttendanceMethod })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manuel</SelectItem>
                            <SelectItem value="qr_code">QR Code</SelectItem>
                            <SelectItem value="geolocation">Géolocalisation</SelectItem>
                            <SelectItem value="biometric">Biométrique</SelectItem>
                            <SelectItem value="nfc">NFC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {getStatusBadge(pa.status)}
                        {getMethodBadge(pa.method)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div className="mt-4">
                    <Textarea
                      placeholder="Notes (optionnel)..."
                      value={pa.notes}
                      onChange={(e) => updateParticipantAttendance(pa.userId, { notes: e.target.value })}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredParticipants.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Aucun participant trouvé
                  </h3>
                  <p className="text-muted-foreground">
                    Aucun participant ne correspond à vos critères de recherche.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions groupées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Action Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Statut</label>
                  <Select 
                    value={bulkAction.status} 
                    onValueChange={(value) => setBulkAction(prev => ({ ...prev, status: value as AttendanceStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Présent</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">En retard</SelectItem>
                      <SelectItem value="excused">Excusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Méthode</label>
                  <Select 
                    value={bulkAction.method} 
                    onValueChange={(value) => setBulkAction(prev => ({ ...prev, method: value as AttendanceMethod }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manuel</SelectItem>
                      <SelectItem value="qr_code">QR Code</SelectItem>
                      <SelectItem value="geolocation">Géolocalisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleBulkAction}
                    disabled={selectedParticipants.length === 0}
                    className="w-full"
                  >
                    Appliquer ({selectedParticipants.length})
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (optionnel)</label>
                <Textarea
                  placeholder="Notes pour l'action groupée..."
                  value={bulkAction.notes}
                  onChange={(e) => setBulkAction(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Participant Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Sélectionner les participants</h4>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedParticipants(participantAttendances.map(pa => pa.userId))}
                    >
                      Tout sélectionner
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedParticipants([])}
                    >
                      Tout désélectionner
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {participantAttendances.map((pa) => (
                    <div 
                      key={pa.userId}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedParticipants.includes(pa.userId) 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedParticipants(prev => 
                          prev.includes(pa.userId)
                            ? prev.filter(id => id !== pa.userId)
                            : [...prev, pa.userId]
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(pa.userId)}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={pa.user?.profilePicture} />
                        <AvatarFallback className="text-xs">{getUserInitials(pa.user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {pa.user?.displayName || `${pa.user?.firstName} ${pa.user?.lastName}`}
                        </p>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(pa.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarkAttendance;