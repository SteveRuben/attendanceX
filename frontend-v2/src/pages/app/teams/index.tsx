import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Search, Filter, User, Crown, Shield } from 'lucide-react';
import { useRouter } from 'next/router';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  projectsCount: number;
  eventsCount: number;
  createdDate: string;
  status: 'active' | 'inactive';
}

export default function TeamsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [teams] = useState<Team[]>([]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-600" />;
      default:
        return <User className="h-3 w-3 text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      owner: 'Propriétaire',
      admin: 'Administrateur',
      member: 'Membre'
    };
    return labels[role as keyof typeof labels] || 'Membre';
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.members.some(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <AppShell title="Équipes">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <Users className="h-6 w-6" />
                Équipes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos équipes et leurs membres
              </p>
            </div>
            <Button 
              onClick={() => router.push('/app/teams/create')}
              data-cy="create-team-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une Équipe
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des équipes ou des membres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-cy="teams-search"
              />
            </div>
            <Button variant="outline" data-cy="teams-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>

          {/* Teams List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-cy="teams-list">
            {filteredTeams.map((team) => (
              <Card 
                key={team.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/app/teams/${team.id}`)}
                data-cy="team-card"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-cy="team-name">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="mt-2" data-cy="team-description">
                        {team.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {team.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{team.members.length}</p>
                      <p className="text-xs text-muted-foreground">Membres</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{team.projectsCount}</p>
                      <p className="text-xs text-muted-foreground">Projets</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{team.eventsCount}</p>
                      <p className="text-xs text-muted-foreground">Événements</p>
                    </div>
                  </div>

                  {/* Team Members Preview */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Membres de l'équipe:</p>
                    <div className="space-y-1">
                      {team.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="flex-1">{member.name}</span>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            <span className="text-xs text-muted-foreground">
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{team.members.length - 3} autres membres
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Créée le {new Date(team.createdDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune équipe trouvée</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucune équipe ne correspond à votre recherche.' : 'Commencez par créer votre première équipe.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/app/teams/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une équipe
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}