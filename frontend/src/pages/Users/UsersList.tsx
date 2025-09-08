// src/pages/Users/UsersList.tsx - Liste des utilisateurs avec gestion des rôles
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone,
  Building,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield
} from 'lucide-react';
import { userService } from '@/services';
import type { User, UserRole, UserStatus } from '../../shared';
import { toast } from 'react-toastify';

interface UserFilters {
  search: string;
  role: UserRole | 'all';
  status: UserStatus | 'all';
  department: string;
}

const UsersList = () => {
  const { user: currentUser } = useAuth();
  const { canManageUsers, isAdmin } = usePermissions();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    department: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadUsers();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.search) params.search = filters.search;
      if (filters.role !== 'all') params.role = filters.role;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.department) params.department = filters.department;

      const response = await userService.getUsers(params);
      
      if (response.success && response.data) {
        setUsers(response.data.data || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
      // Reset to safe state on error
      setUsers([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      super_admin: { variant: 'destructive' as const, label: 'Super Admin', icon: Shield },
      admin: { variant: 'destructive' as const, label: 'Admin', icon: Shield },
      organizer: { variant: 'default' as const, label: 'Organisateur', icon: Users },
      moderator: { variant: 'secondary' as const, label: 'Modérateur', icon: UserCheck },
      analyst: { variant: 'outline' as const, label: 'Analyste', icon: Users },
      participant: { variant: 'outline' as const, label: 'Participant', icon: Users }
    };

    const config = roleConfig[role] || { variant: 'outline' as const, label: role, icon: Users };
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
      active: { variant: 'default' as const, label: 'Actif' },
      inactive: { variant: 'secondary' as const, label: 'Inactif' },
      pending: { variant: 'outline' as const, label: 'En attente' },
      suspended: { variant: 'destructive' as const, label: 'Suspendu' }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUserInitials = (user: User) => {
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

  const handleChangeUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const response = await userService.changeUserStatus(userId, newStatus);
      if (response.success) {
        toast.success('Statut utilisateur mis à jour');
        loadUsers();
      }
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les utilisateurs et leurs permissions
          </p>
        </div>
        {canManageUsers && (
          <Button onClick={() => navigate('/users/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher des utilisateurs..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="organizer">Organisateur</SelectItem>
                <SelectItem value="moderator">Modérateur</SelectItem>
                <SelectItem value="analyst">Analyste</SelectItem>
                <SelectItem value="participant">Participant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="suspended">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id} className="card-interactive">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.profilePicture} />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-foreground">
                          {user.displayName || `${user.firstName} ${user.lastName}`}
                        </h3>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {user.phone}
                          </div>
                        )}
                        {user.department && (
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-1" />
                            {user.department}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Inscrit le {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/users/${user.id}`}>
                        Voir profil
                      </Link>
                    </Button>
                    
                    {canManageUsers && user.id !== currentUser?.id && (
                      <>
                        {user.status === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleChangeUserStatus(user.id, 'inactive')}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Désactiver
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleChangeUserStatus(user.id, 'active')}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Activer
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/users/${user.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.role !== 'all' || filters.status !== 'all'
                  ? 'Aucun utilisateur ne correspond à vos critères de recherche.'
                  : 'Aucun utilisateur n\'est encore enregistré.'
                }
              </p>
              {canManageUsers && (
                <Button onClick={() => navigate('/users/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Inviter des utilisateurs
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} utilisateurs
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

export default UsersList;