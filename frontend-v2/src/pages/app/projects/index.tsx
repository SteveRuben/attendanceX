import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/error-components'
import { LoadingOverlay } from '@/components/ui/loading-skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { EventGuard } from '@/components/auth/PermissionGuard'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { 
  ProjectTemplate, 
  ProjectStatus, 
  PROJECT_TEMPLATES 
} from '@/types/project.types'
import { 
  Plus, 
  Briefcase, 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react'

export default function ProjectsPage() {
  const router = useRouter()
  const { canCreateEvents } = usePermissions()
  const { 
    projects, 
    loading, 
    error, 
    total, 
    hasMore, 
    loadProjects 
  } = useProjects()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [templateFilter, setTemplateFilter] = useState<ProjectTemplate | ''>('')
  const [page, setPage] = useState(1)
  const limit = 12

  // Charger les projets avec filtres
  useEffect(() => {
    loadProjects({
      page,
      limit,
      status: statusFilter || undefined,
      template: templateFilter || undefined
    })
  }, [page, statusFilter, templateFilter]) // Retirer loadProjects des dépendances

  // Filtrer par terme de recherche côté client
  const filteredProjects = (projects || []).filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateProject = useCallback(() => {
    router.push('/app/projects/create')
  }, [router])

  const handlePreviousPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setPage(p => p + 1)
  }, [])

  const start = filteredProjects.length ? (page - 1) * limit + 1 : 0
  const end = Math.min(page * limit, total)
  const canPrev = page > 1
  const canNext = hasMore

  // Loading state selon standards Evelya
  if (loading && page === 1) {
    return (
      <AppShell title="Projets">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Projets">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Sticky Header - Standard Evelya */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Projets d'Événements
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez vos projets avec des workflows structurés et des équipes organisées
            </p>
          </div>

          <EventGuard action="view">
            {/* Page Content */}
            <div className="space-y-6">
              {/* Action Button */}
              <div className="flex justify-end">
                <EventGuard action="create">
                  <Button onClick={handleCreateProject}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Projet
                  </Button>
                </EventGuard>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtres et Recherche
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un projet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="draft">Brouillon</option>
                      <option value="planning">Planification</option>
                      <option value="preparation">Préparation</option>
                      <option value="execution">Exécution</option>
                      <option value="completed">Terminé</option>
                      <option value="cancelled">Annulé</option>
                    </Select>
                    
                    <Select
                      value={templateFilter}
                      onChange={(e) => setTemplateFilter(e.target.value as ProjectTemplate | '')}
                    >
                      <option value="">Tous les templates</option>
                      {Object.entries(PROJECT_TEMPLATES).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.icon} {template.name}
                        </option>
                      ))}
                    </Select>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('')
                        setTemplateFilter('')
                        setPage(1)
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Error State */}
              {error && (
                <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                  <CardContent className="p-6">
                    <div className="text-red-800 dark:text-red-200">
                      <strong>Erreur:</strong> {error}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects Grid */}
              {filteredProjects.length === 0 && !loading ? (
                <Card>
                  <CardContent className="p-8">
                    <EmptyState 
                      icon={<Briefcase className="h-12 w-12 text-gray-400" />}
                      title="Aucun projet trouvé" 
                      description={searchTerm || statusFilter || templateFilter 
                        ? "Aucun projet ne correspond à vos critères de recherche" 
                        : "Créez votre premier projet pour commencer à organiser vos événements"
                      } 
                      action={canCreateEvents() && !searchTerm && !statusFilter && !templateFilter ? { 
                        label: 'Créer un projet', 
                        onClick: handleCreateProject,
                        icon: <Plus className="h-4 w-4" />
                      } : undefined} 
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onView={(project) => router.push(`/app/projects/${project.id}`)}
                        onEdit={(project) => router.push(`/app/projects/${project.id}/edit`)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {total > limit && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div>
                            {total > 0 ? `Affichage de ${start}–${end} sur ${total} projets` : 'Aucun projet'}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={!canPrev || loading} 
                              onClick={handlePreviousPage}
                            >
                              <ChevronLeft className="h-4 w-4 mr-2" />
                              Précédent
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={!canNext || loading} 
                              onClick={handleNextPage}
                            >
                              Suivant
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Quick Stats - Standard Evelya */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Projets</p>
                        <p className="text-2xl font-bold">{total}</p>
                      </div>
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">En Cours</p>
                        <p className="text-2xl font-bold">
                          {projects.filter(p => ['planning', 'preparation', 'execution'].includes(p.status)).length}
                        </p>
                      </div>
                      <Sparkles className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Terminés</p>
                        <p className="text-2xl font-bold">
                          {projects.filter(p => p.status === 'completed').length}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Templates Utilisés</p>
                        <p className="text-2xl font-bold">
                          {new Set(projects.map(p => p.template)).size}
                        </p>
                      </div>
                      <div className="text-2xl">🎯</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </EventGuard>
        </div>
      </div>
    </AppShell>
  )
}