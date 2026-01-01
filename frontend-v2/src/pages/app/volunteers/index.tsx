import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Search, Filter, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useRouter } from 'next/router';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  availability: string;
  status: 'active' | 'inactive' | 'pending';
  eventsParticipated: number;
  joinedDate: string;
}

export default function VolunteersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [volunteers] = useState<Volunteer[]>([
    {
      id: '1',
      name: 'Marie Dubois',
      email: 'marie.dubois@email.com',
      phone: '+33 6 12 34 56 78',
      location: 'Paris, France',
      skills: ['Organisation', 'Communication', 'Logistique'],
      availability: 'Weekends',
      status: 'active',
      eventsParticipated: 12,
      joinedDate: '2023-06-15'
    },
    {
      id: '2',
      name: 'Pierre Martin',
      email: 'pierre.martin@email.com',
      phone: '+33 6 98 76 54 32',
      location: 'Lyon, France',
      skills: ['Technique', 'Audiovisuel', 'Support IT'],
      availability: 'Soirées et weekends',
      status: 'active',
      eventsParticipated: 8,
      joinedDate: '2023-09-20'
    },
    {
      id: '3',
      name: 'Sophie Leroy',
      email: 'sophie.leroy@email.com',
      phone: '+33 6 45 67 89 01',
      location: 'Marseille, France',
      skills: ['Accueil', 'Traduction', 'Relations publiques'],
      availability: 'Flexible',
      status: 'pending',
      eventsParticipated: 0,
      joinedDate: '2024-01-10'
    }
  ]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      pending: 'En Attente'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]} data-cy="volunteer-status">
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredVolunteers = volunteers.filter(volunteer =>
    volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    volunteer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    volunteer.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppShell title="Bénévoles">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <Heart className="h-6 w-6" />
                Bénévoles
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez votre équipe de bénévoles et leurs affectations
              </p>
            </div>
            <Button 
              onClick={() => router.push('/app/volunteers/invite')}
              data-cy="invite-volunteer-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Inviter un Bénévole
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou compétences..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-cy="volunteers-search"
              />
            </div>
            <Button variant="outline" data-cy="volunteers-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bénévoles</p>
                    <p className="text-2xl font-bold">{volunteers.length}</p>
                  </div>
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bénévoles Actifs</p>
                    <p className="text-2xl font-bold">{volunteers.filter(v => v.status === 'active').length}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Actifs</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">En Attente</p>
                    <p className="text-2xl font-bold">{volunteers.filter(v => v.status === 'pending').length}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Attente</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Volunteers List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-cy="volunteers-list">
            {filteredVolunteers.map((volunteer) => (
              <Card 
                key={volunteer.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/app/volunteers/${volunteer.id}`)}
                data-cy="volunteer-card"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-cy="volunteer-name">
                        {volunteer.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(volunteer.status)}
                        <Badge variant="outline">
                          {volunteer.eventsParticipated} événements
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span data-cy="volunteer-email">{volunteer.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{volunteer.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{volunteer.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Disponible: {volunteer.availability}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Compétences:</p>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Membre depuis {new Date(volunteer.joinedDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredVolunteers.length === 0 && (
            <div className="text-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun bénévole trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucun bénévole ne correspond à votre recherche.' : 'Commencez par inviter vos premiers bénévoles.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/app/volunteers/invite')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Inviter un bénévole
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}