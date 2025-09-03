// src/pages/Users/UserProfile.tsx - Profil détaillé d'un utilisateur
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar, 
  MapPin,
  Shield,
  Edit,
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ArrowLeft,
  UserCheck,
  UserX
} from 'lucide-react';
import { userService, attendanceService, eventService } from '@/services';
import type { User as UserType, UserRole, UserStatus } from '@attendance-x/shared';
import { toast } from 'react-toastify';

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { canManageUsers, canViewReports } = usePermissions();
  
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    totalEvents: 0,
    attendedEvents: 0,
    attendanceRate: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    averageCheckInTime: '',
    streak: 0
  });
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  // Check if viewing own profile
  const isOwnProfile = !id || id === currentUser?.id;
  const targetUserId = isOwnProfile ? currentUser?.id : id;

  useEffect(() => {
    if (targetUserId) {
      loadUserProfile();
      loadUserStats();
    }
  }, [targetUserId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      let userData: UserType;
      
      if (isOwnProfile) {
        const response = await userService.getMyProfile();
        if (!response.success || !response.data) {
          throw new Error('Impossible de charger votre profil');
        }
        userData = response.data;
      } else {
        const response = await userService.getUserById(targetUserId!);
        if (!response.success || !response.data) {
          throw new Error('Utilisateur non trouvé');
        }
        userData = response.data;
      }
      
      setUser(userData);
      
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      toast.error(error.message || 'Erreur lors du chargement du profil');
      if (!isOwnProfile) {
        navigate('/users');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Load attendance stats
      const attendanceResponse = await attendanceService.getAttendanceStats({
        userId: targetUserId
      });
      
      if (attendanceResponse.success && attendanceResponse.data) {
        setAttendanceStats({
          totalEvents: attendanceResponse.data.totalEvents || 0,
          attendedEvents: attendanceResponse.data.attendedEvents || 0,
          attendanceRate: attendanceResponse.data.attendanceRate || 0,
          totalPresent: attendanceResponse.data.totalPresent || 0,
          totalAbsent: attendanceResponse.data.totalAbsent || 0,
          totalLate: attendanceResponse.data.totalLate || 0,
          averageCheckInTime: attendanceResponse.data.averageCheckInTime || '',
          streak: attendanceResponse.data.streak || 0
        });
      }

      // Load recent attendances
      const recentResponse = await attendanceService.getMyAttendances({
        limit: 10
      });
      
      if (recentResponse.success && recentResponse.data) {
        setRecentAttendances(recentResponse.data);
      }

      // Load upcoming events if user is participant
      if (canViewReports) {
        const eventsResponse = await eventService.getEvents({
          participantId: targetUserId,
          status: 'published',
          limit: 5
        });
        
        if (eventsResponse.success && eventsResponse.data) {
          setUpcomingEvents(eventsResponse.data.data || []);
        }
      }
      
    } catch (error: any) {
      console.error('Error loading user stats:', error);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      super_admin: { variant: 'destructive' as const, label: 'Super Admin', icon: Shield },
      admin: { variant: 'destructive' as const, label: 'Admin', icon: Shield },
      organizer: { variant: 'default' as const, label: 'Organisateur', icon: User },
      moderator: { variant: 'secondary' as const, label: 'Modérateur', icon: UserCheck },
      analyst: { variant: 'outline' as const, label: 'Analyste', icon: BarChart3 },
      participant: { variant: 'outline' as const, label: 'Participant', icon: User }
    };

    const config = roleConfig[role] || { variant: 'outline' as const, label: role, icon: User };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: UserStatus) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Actif', icon: CheckCircle },
      inactive: { variant: 'secondary' as const, label: 'Inactif', icon: XCircle },
      pending: { variant: 'outline' as const, label: 'En attente', icon: Clock },
      suspended: { variant: 'destructive' as const, label: 'Suspendu', icon: XCircle }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status, icon: Clock };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUserInitials = (user: UserType) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleChangeUserStatus = async (newStatus: UserStatus) => {
    if (!user || !canManageUsers) return;
    
    try {
      const response = await userService.changeUserStatus(user.id, newStatus);
      if (response.success) {
        setUser(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('Statut utilisateur mis à jour');
      }
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Utilisateur non trouvé ou vous n'avez pas les permissions pour voir ce profil.
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
          {!isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isOwnProfile ? 'Mon profil' : 'Profil utilisateur'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {user.displayName || `${user.firstName} ${user.lastName}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isOwnProfile && (
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          )}
          {canManageUsers && !isOwnProfile && (
            <>
              {user.status === 'active' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleChangeUserStatus('inactive')}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Désactiver
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleChangeUserStatus('active')}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Activer
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback className="text-2xl">{getUserInitials(user)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-2xl font-semibold">
                      {user.displayName || `${user.firstName} ${user.lastName}`}
                    </h2>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    {user.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Téléphone</p>
                          <p className="text-muted-foreground">{user.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {user.department && (
                      <div className="flex items-center space-x-3">
                        <Building className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Département</p>
                          <p className="text-muted-foreground">{user.department}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Membre depuis</p>
                        <p className="text-muted-foreground">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          {canViewReports && (
            <Card>
              <CardHeader>
                <CardTitle>Statistiques de présence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{attendanceStats.totalEvents || 0}</div>
                    <div className="text-sm text-muted-foreground">Événements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{attendanceStats.attendedEvents || 0}</div>
                    <div className="text-sm text-muted-foreground">Participés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{(attendanceStats.attendanceRate || 0).toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Taux présence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{attendanceStats.streak || 0}</div>
                    <div className="text-sm text-muted-foreground">Série actuelle</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs Content */}
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activity">Activité récente</TabsTrigger>
              {canViewReports && (
                <TabsTrigger value="events">Événements à venir</TabsTrigger>
              )}
              <TabsTrigger value="details">Détails du compte</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Présences récentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentAttendances.length > 0 ? (
                    <div className="space-y-3">
                      {recentAttendances.map((attendance) => (
                        <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              attendance.status === 'present' ? 'bg-green-500' :
                              attendance.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-medium">{attendance.event?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {attendance.checkInTime ? formatDateTime(attendance.checkInTime) : 'Non marqué'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={
                            attendance.status === 'present' ? 'default' :
                            attendance.status === 'late' ? 'secondary' : 'destructive'
                          }>
                            {attendance.status === 'present' ? 'Présent' :
                             attendance.status === 'late' ? 'En retard' : 'Absent'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucune activité récente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {canViewReports && (
              <TabsContent value="events">
                <Card>
                  <CardHeader>
                    <CardTitle>Événements à venir</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingEvents.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTime(event.startDate)}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">{event.type}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Aucun événement à venir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Détails du compte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">ID utilisateur</p>
                      <p className="text-muted-foreground font-mono text-sm">{user.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Email vérifié</p>
                      <div className="flex items-center space-x-2">
                        {user.emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-muted-foreground">
                          {user.emailVerified ? 'Vérifié' : 'Non vérifié'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">2FA activé</p>
                      <div className="flex items-center space-x-2">
                        {user.twoFactorEnabled ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-muted-foreground">
                          {user.twoFactorEnabled ? 'Activé' : 'Désactivé'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Dernière connexion</p>
                      <p className="text-muted-foreground">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Jamais'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Présences</span>
                <span className="font-medium">{attendanceStats.totalPresent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Absences</span>
                <span className="font-medium">{attendanceStats.totalAbsent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Retards</span>
                <span className="font-medium">{attendanceStats.totalLate || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taux de présence</span>
                <span className="font-medium">{(attendanceStats.attendanceRate || 0).toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Statut du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Statut</span>
                {getStatusBadge(user.status)}
              </div>
              <div className="flex items-center justify-between">
                <span>Rôle</span>
                {getRoleBadge(user.role)}
              </div>
              {user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date() && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Compte verrouillé jusqu'au {formatDateTime(user.accountLockedUntil)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;