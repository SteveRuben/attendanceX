// src/pages/Attendance/AttendanceList.tsx - Liste des présences avec filtres et statistiques
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckSquare, 
  Search, 
  Calendar, 
  Clock, 
  MapPin,
  Users,
  TrendingUp,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer
} from 'lucide-react';
import { attendanceService } from '@/services';
import type { Attendance, AttendanceStatus, AttendanceMethod } from '@attendance-x/shared';
import { toast } from 'react-toastify';

interface AttendanceFilters {
  search: string;
  status: AttendanceStatus | 'all';
  method: AttendanceMethod | 'all';
  eventId: string;
  startDate: string;
  endDate: string;
}

const AttendanceList = () => {
  const { user } = useAuth();
  const { canViewAttendances, canManageAttendances } = usePermissions();
  const navigate = useNavigate();
  
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendanceRate: 0
  });
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '',
    status: 'all',
    method: 'all',
    eventId: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadAttendances();
    loadStats();
  }, [filters, pagination.page]);

  const loadAttendances = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'checkInTime',
        sortOrder: 'desc'
      };

      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.method !== 'all') params.method = filters.method;
      if (filters.eventId) params.eventId = filters.eventId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = canViewAttendances 
        ? await attendanceService.getAttendances(params)
        : await attendanceService.getMyAttendances(params);
      
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setAttendances(response.data);
        } else {
          setAttendances(response.data.data);
          setPagination(prev => ({
            ...prev,
            total: response.data.pagination?.total || 0,
            totalPages: response.data.pagination?.totalPages || 0
          }));
        }
      }
    } catch (error: any) {
      console.error('Error loading attendances:', error);
      toast.error('Erreur lors du chargement des présences');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await attendanceService.getAttendanceStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof AttendanceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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
      qr_code: { variant: 'default' as const, label: 'QR Code' },
      geolocation: { variant: 'secondary' as const, label: 'Géolocalisation' },
      manual: { variant: 'outline' as const, label: 'Manuel' },
      biometric: { variant: 'default' as const, label: 'Biométrique' },
      nfc: { variant: 'secondary' as const, label: 'NFC' }
    };

    const config = methodConfig[method] || { variant: 'outline' as const, label: method };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportAttendances = async () => {
    try {
      const response = await attendanceService.exportAttendances(filters, 'csv');
      if (response.success) {
        toast.success('Export en cours de téléchargement');
        // Handle file download
      }
    } catch (error: any) {
      toast.error('Erreur lors de l\'export');
    }
  };

  if (loading && attendances.length === 0) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Présences</h1>
          <p className="text-muted-foreground mt-1">
            Suivez et gérez les présences aux événements
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {canViewAttendances && (
            <Button variant="outline" onClick={handleExportAttendances}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {canViewAttendances && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Total présences</p>
                  <p className="metric-value">{stats.total}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Présents</p>
                  <p className="metric-value">{stats.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Absents</p>
                  <p className="metric-value">{stats.absent}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Taux de présence</p>
                  <p className="metric-value">{stats.attendanceRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="present">Présent</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">En retard</SelectItem>
                <SelectItem value="excused">Excusé</SelectItem>
                <SelectItem value="left_early">Parti tôt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.method} onValueChange={(value) => handleFilterChange('method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les méthodes</SelectItem>
                <SelectItem value="qr_code">QR Code</SelectItem>
                <SelectItem value="geolocation">Géolocalisation</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="biometric">Biométrique</SelectItem>
                <SelectItem value="nfc">NFC</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Date de début"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendances List */}
      <div className="space-y-4">
        {attendances.length > 0 ? (
          attendances.map((attendance) => (
            <Card key={attendance.id} className="card-interactive">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={attendance.user?.profilePicture} />
                      <AvatarFallback>{getUserInitials(attendance.user)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {attendance.user?.displayName || 
                           `${attendance.user?.firstName} ${attendance.user?.lastName}` ||
                           attendance.user?.email}
                        </h3>
                        {getStatusBadge(attendance.status)}
                        {getMethodBadge(attendance.method)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {attendance.event?.title || 'Événement supprimé'}
                        </div>
                        {attendance.checkInTime && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDateTime(attendance.checkInTime)}
                          </div>
                        )}
                        {attendance.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {attendance.location.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {attendance.event && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/events/${attendance.event.id}`}>
                          Voir événement
                        </Link>
                      </Button>
                    )}
                    
                    {canManageAttendances && attendance.validationStatus === 'pending' && (
                      <Button variant="outline" size="sm">
                        Valider
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucune présence trouvée
              </h3>
              <p className="text-muted-foreground mb-4">
                {Object.values(filters).some(f => f && f !== 'all')
                  ? 'Aucune présence ne correspond à vos critères de recherche.'
                  : 'Aucune présence n\'a encore été enregistrée.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} présences
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;