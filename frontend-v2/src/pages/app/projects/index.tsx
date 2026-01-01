import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Plus, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/router';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  eventsCount: number;
  membersCount: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: 'Formation React Avancé',
      description: 'Programme de formation pour développeurs React expérimentés',
      status: 'active',
      createdAt: '2024-01-15',
      eventsCount: 3,
      membersCount: 12
    },
    {
      id: '2',
      name: 'Conférence Tech 2024',
      description: 'Événement annuel sur les nouvelles technologies',
      status: 'active',
      createdAt: '2024-01-10',
      eventsCount: 1,
      membersCount: 8
    },
    {
      id: '3',
      name: 'Workshop UX Design',
      description: 'Atelier pratique sur les principes de design UX',
      status: 'completed',
      createdAt: '2023-12-20',
      eventsCount: 2,
      membersCount: 15
    }
  ]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      completed: 'Terminé'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]} data-cy="project-status">
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell title="Projets">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <FolderOpen className="h-6 w-6" />
                Projets
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos projets et événements
              </p>
            </div>
            <Button 
              onClick={() => router.push('/app/projects/create')}
              data-cy="create-project-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Projet
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des projets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-cy="projects-search"
              />
            </div>
            <Button variant="outline" data-cy="projects-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>

          {/* Projects List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-cy="projects-list">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/app/projects/${project.id}`)}
                data-cy="project-card"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-cy="project-title">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-2" data-cy="project-description">
                        {project.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span data-cy="project-created-date">
                      Créé le {new Date(project.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span>{project.eventsCount} événement(s)</span>
                    <span>{project.membersCount} membre(s)</span>
                  </div>
                  <div className="mt-4" data-cy="project-actions">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/app/projects/${project.id}/edit`);
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun projet trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucun projet ne correspond à votre recherche.' : 'Commencez par créer votre premier projet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/app/projects/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un projet
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}