import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Download
} from 'lucide-react';
import type { Event } from '../../shared';
import { useToast } from '../../hooks/use-toast';

interface RegistrationManagerProps {
  event: Event;
  onRefresh?: () => void;
}

interface Registration {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted';
  registeredAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

export const RegistrationManager: React.FC<RegistrationManagerProps> = ({
  event,
  onRefresh
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    waitlisted: 0,
    cancelled: 0
  });

  useEffect(() => {
    loadRegistrations();
  }, [event.id]);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRegistrations: Registration[] = event.participants?.map((p, idx) => ({
        id: `reg-${idx}`,
        userId: p.id || `user-${idx}`,
        user: {
          id: p.id || `user-${idx}`,
          email: p.email || `user${idx}@example.com`,
          displayName: p.displayName,
          firstName: p.firstName,
          lastName: p.lastName,
          profilePicture: p.profilePicture
        },
        status: idx % 4 === 0 ? 'pending' : idx % 4 === 1 ? 'waitlisted' : 'confirmed',
        registeredAt: new Date(Date.now() - idx * 86400000).toISOString()
      })) || [];

      setRegistrations(mockRegistrations);
      
      const newStats = {
        total: mockRegistrations.length,
        confirmed: mockRegistrations.filter(r => r.status === 'confirmed').length,
        pending: mockRegistrations.filter(r => r.status === 'pending').length,
        waitlisted: mockRegistrations.filter(r => r.status === 'waitlisted').length,
        cancelled: mockRegistrations.filter(r => r.status === 'cancelled').length
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les inscriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRegistration = async (registrationId: string) => {
    toast({
      title: "Inscription confirmée",
      description: "L'inscription a été confirmée avec succès"
    });
    loadRegistrations();
  };

  const handleCancelRegistration = async (registrationId: string) => {
    toast({
      title: "Inscription annulée",
      description: "L'inscription a été annulée"
    });
    loadRegistrations();
  };

  const handleSendReminder = async (registrationId: string) => {
    toast({
      title: "Rappel envoyé",
      description: "Un rappel a été envoyé au participant"
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { variant: 'default' as const, label: 'Confirmé', icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary' as const, label: 'En attente', icon: Clock, color: 'text-yellow-600' },
      waitlisted: { variant: 'outline' as const, label: 'Liste d\'attente', icon: AlertCircle, color: 'text-orange-600' },
      cancelled: { variant: 'destructive' as const, label: 'Annulé', icon: XCircle, color: 'text-red-600' }
    };

    const config = statusConfig[status] || statusConfig.pending;
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

  const filteredRegistrations = registrations.filter(reg =>
    reg.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmés</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Liste d'attente</p>
                <p className="text-2xl font-bold">{stats.waitlisted}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inscriptions ({filteredRegistrations.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
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

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : filteredRegistrations.length > 0 ? (
            <div className="space-y-3">
              {filteredRegistrations.map((registration) => (
                <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={registration.user.profilePicture} />
                      <AvatarFallback>{getUserInitials(registration.user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {registration.user.displayName || 
                         `${registration.user.firstName} ${registration.user.lastName}` ||
                         registration.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{registration.user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {new Date(registration.registeredAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(registration.status)}
                    
                    {registration.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConfirmRegistration(registration.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirmer
                      </Button>
                    )}
                    
                    {registration.status !== 'cancelled' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSendReminder(registration.id)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCancelRegistration(registration.id)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune inscription trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

