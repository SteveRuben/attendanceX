import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProject } from '@/hooks/useProjects'
import { useTenant } from '@/contexts/TenantContext'
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { ProjectWorkflow } from '@/components/projects/ProjectWorkflow'
import { TeamManagement } from '@/components/projects/TeamManagement'
import { ProjectEventLink } from '@/components/projects/ProjectEventLink'
import { RegistrationFormBuilder } from '@/components/projects/forms/RegistrationFormBuilder'
import { SnapchatFilterGenerator } from '@/components/projects/SnapchatFilterGenerator'
import { ImportDialog } from '@/components/import/ImportDialog'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { TimezoneSelector } from '@/components/ui/TimezoneSelector'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ProjectService from '@/services/projectService'
import { 
  PROJECT_TEMPLATES,
  getStatusColor,
  ProjectPhase,
  ProjectTeam
} from '@/types/project.types'
import { ImportType } from '@/types/import.types'
import { 
  Calendar, 
  Users, 
  Target,
  Edit,
  Play,
  TrendingUp,
  FileText,
  Loader2,
  Settings,
  Clock,
  CheckCircle2,
  Camera,
  Palette,
  Upload,
  Download,
  UserPlus,
  Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProjectDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const projectId = typeof id === 'string' ? id : ''
  
  const {
    project,
    loading,
    error,
    updateProject
  } = useProject(projectId)

  const { currentTenant } = useTenant()
  const { formatDate, formatDateTime, formatRelativeDate, loading: dateTimeLoading } = useDateTimeFormat()
  const [activeTab, setActiveTab] = useState('overview')
  const [showImportDialog, setShowImportDialog] = useState(false)

  // Obtenir la timezone de l'organisation
  const organizationTimezone = currentTenant?.settings?.timezone

  if (loading) {
    return (
      <AppShell title="Chargement...">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (error || !project) {
    return (
      <AppShell title="Projet non trouvé">
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-4">
              {error || 'Projet non trouvé'}
            </h1>
            <Button onClick={() => router.push('/app/projects')}>
              Retour aux projets
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const template = PROJECT_TEMPLATES[project.template]
  
  const handlePhaseChange = async (newPhase: ProjectPhase) => {
    try {
      await updateProject({
        currentPhase: newPhase,
        workflow: {
          ...project.workflow,
          currentPhaseId: newPhase,
          completedPhases: project.workflow.completedPhases.includes(project.currentPhase)
            ? project.workflow.completedPhases
            : [...project.workflow.completedPhases, project.currentPhase]
        }
      })
    } catch (error) {
      console.error('Erreur lors du changement de phase:', error)
    }
  }

  // Fonctions de gestion des équipes - Intégration avec l'API backend
  const handleCreateTeam = async (teamData: Omit<ProjectTeam, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!currentTenant?.id) {
        console.error('Aucun tenant sélectionné')
        return
      }

      // Créer l'équipe dans le système backend
      const { createTeam } = await import('@/services/teamsService')
      const backendTeam = await createTeam(currentTenant.id, {
        name: teamData.name,
        description: teamData.description,
        department: 'Project Team', // Marquer comme équipe de projet
        settings: {
          canValidateAttendance: true,
          canCreateEvents: false,
          canInviteParticipants: true,
          canViewAllEvents: false,
          canExportData: false
        }
      })

      // Créer l'équipe locale du projet avec référence à l'équipe backend
      const newTeam: ProjectTeam = {
        ...teamData,
        id: backendTeam.id, // Utiliser l'ID de l'équipe backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await updateProject({
        teams: [...project.teams, newTeam]
      })

      console.log('Équipe créée avec succès:', backendTeam.name)
    } catch (error) {
      console.error('Erreur lors de la création de l\'équipe:', error)
      // Afficher une notification d'erreur à l'utilisateur
      alert('Erreur lors de la création de l\'équipe. Veuillez réessayer.')
    }
  }

  const handleUpdateTeam = async (teamId: string, updates: Partial<ProjectTeam>) => {
    try {
      if (!currentTenant?.id) {
        console.error('Aucun tenant sélectionné')
        return
      }

      // Mettre à jour l'équipe dans le système backend si elle existe
      try {
        const { updateTeam } = await import('@/services/teamsService')
        await updateTeam(currentTenant.id, teamId, {
          name: updates.name,
          description: updates.description
        })
      } catch (error) {
        console.warn('Équipe non trouvée dans le backend, mise à jour locale uniquement:', error)
      }

      // Mettre à jour l'équipe locale du projet
      const updatedTeams = project.teams.map(team =>
        team.id === teamId
          ? { ...team, ...updates, updatedAt: new Date().toISOString() }
          : team
      )

      await updateProject({
        teams: updatedTeams
      })
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipe:', error)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    try {
      if (!currentTenant?.id) {
        console.error('Aucun tenant sélectionné')
        return
      }

      // Supprimer l'équipe du système backend si elle existe
      try {
        const { deleteTeam } = await import('@/services/teamsService')
        await deleteTeam(currentTenant.id, teamId)
      } catch (error) {
        console.warn('Équipe non trouvée dans le backend, suppression locale uniquement:', error)
      }

      // Supprimer l'équipe locale du projet
      const updatedTeams = project.teams.filter(team => team.id !== teamId)
      
      await updateProject({
        teams: updatedTeams
      })
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'équipe:', error)
    }
  }

  const completedObjectives = project.objectives.filter(obj => obj.status === 'completed').length
  const totalObjectives = project.objectives.length
  const progressPercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0

  return (
    <AppShell title={project.title}>
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Sticky Header - Standard Evelya */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <div className="text-blue-600 dark:text-blue-400">{template.icon}</div>
                  </div>
                  {project.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    className={cn(
                      'text-xs',
                      `bg-${getStatusColor(project.status)}-100 text-${getStatusColor(project.status)}-800 dark:bg-${getStatusColor(project.status)}-900/30 dark:text-${getStatusColor(project.status)}-200`
                    )}
                  >
                    {project.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Phase: {project.currentPhase}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/app/projects/${project.id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  onClick={() => router.push(`/app/events/${project.id}`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Voir l'Événement
                </Button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Progression</p>
                      <p className="text-2xl font-bold">{progressPercentage}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Équipes</p>
                      <p className="text-2xl font-bold">{project.teams.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Objectifs</p>
                      <p className="text-2xl font-bold">{completedObjectives}/{totalObjectives}</p>
                    </div>
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <p className="text-lg font-bold">
                        {formatDate(project.eventDetails.startDate)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Vue d'ensemble
                </TabsTrigger>
                <TabsTrigger value="workflow" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Workflow
                </TabsTrigger>
                <TabsTrigger value="teams" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Équipes
                </TabsTrigger>
                <TabsTrigger value="participants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="registration" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Inscription
                </TabsTrigger>
                <TabsTrigger value="filters" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Filtres
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Event Link */}
                  <ProjectEventLink 
                    project={project} 
                    organizationTimezone={organizationTimezone}
                    onEventCreated={async (eventId) => {
                      try {
                        await updateProject({
                          eventDetails: {
                            ...project.eventDetails,
                            eventId: eventId
                          }
                        })
                      } catch (error) {
                        console.error('Error updating project with event ID:', error)
                      }
                    }}
                  />
                  
                  {/* Project Visual Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Aperçu Visuel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Project Image */}
                      {project.eventDetails.image ? (
                        <div className="relative">
                          <img 
                            src={project.eventDetails.image} 
                            alt={project.title}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div 
                            className="absolute inset-0 rounded-lg opacity-20"
                            style={{ backgroundColor: project.eventDetails.colorTheme || '#3B82F6' }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center"
                          style={{ borderColor: project.eventDetails.colorTheme || '#3B82F6' }}
                        >
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Aucune image définie</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Color Theme Preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: project.eventDetails.colorTheme || '#3B82F6' }}
                          />
                          <span className="text-sm font-medium">Couleur du thème</span>
                        </div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {project.eventDetails.colorTheme || '#3B82F6'}
                        </code>
                      </div>
                      
                      {/* Theme Application Preview */}
                      <div className="p-3 rounded-lg border" style={{ borderColor: project.eventDetails.colorTheme || '#3B82F6' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.eventDetails.colorTheme || '#3B82F6' }}
                          />
                          <span className="text-sm font-medium">{project.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aperçu de l'application du thème sur les éléments de l'interface
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Project Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Détails de l'Événement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Type</span>
                          <p className="capitalize">{project.eventDetails.type}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Lieu</span>
                          <p className="capitalize">{project.eventDetails.location.type}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Début</span>
                          <p>{formatDateTime(project.eventDetails.startDate)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Fin</span>
                          <p>{formatDateTime(project.eventDetails.endDate)}</p>
                        </div>
                      </div>
                      
                      {project.eventDetails.location.name && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Nom du lieu</span>
                          <p>{project.eventDetails.location.name}</p>
                        </div>
                      )}
                      
                      {project.eventDetails.capacity && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Capacité</span>
                          <p>{project.eventDetails.capacity} participants</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Badge variant={project.eventDetails.isPublic ? "default" : "secondary"}>
                          {project.eventDetails.isPublic ? "Public" : "Privé"}
                        </Badge>
                        {project.eventDetails.requiresRegistration && (
                          <Badge variant="outline">Inscription requise</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Activité Récente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>Projet créé</span>
                          <span className="text-muted-foreground ml-auto">
                            {formatRelativeDate(project.createdAt)}
                          </span>
                        </div>
                        {project.teams.length > 0 && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            <span>{project.teams.length} équipe(s) créée(s)</span>
                          </div>
                        )}
                        {project.objectives.length > 0 && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                            <span>{project.objectives.length} objectif(s) défini(s)</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-6">
                <ProjectWorkflow
                  project={project}
                  onPhaseChange={handlePhaseChange}
                />
              </TabsContent>

              <TabsContent value="teams" className="space-y-6">
                <TeamManagement
                  project={project}
                  onCreateTeam={handleCreateTeam}
                  onUpdateTeam={handleUpdateTeam}
                  onDeleteTeam={handleDeleteTeam}
                />
              </TabsContent>

              <TabsContent value="participants" className="space-y-6">
                <div className="space-y-6">
                  {/* Header avec actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gestion des Participants
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Gérez les participants de votre projet et importez des listes depuis des fichiers
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setShowImportDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Importer des participants
                      </Button>
                      <Button variant="outline" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Ajouter un participant
                      </Button>
                    </div>
                  </div>

                  {/* Statistiques des participants */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">0</p>
                          </div>
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Confirmés</p>
                            <p className="text-2xl font-bold">0</p>
                          </div>
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">En attente</p>
                            <p className="text-2xl font-bold">0</p>
                          </div>
                          <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Check-in</p>
                            <p className="text-2xl font-bold">0</p>
                          </div>
                          <Target className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Liste des participants */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Liste des Participants
                      </CardTitle>
                      <CardDescription>
                        Visualisez et gérez tous les participants de votre projet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Aucun participant</h3>
                        <p className="text-muted-foreground mb-4">
                          Commencez par importer une liste de participants ou ajoutez-les manuellement
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            onClick={() => setShowImportDialog(true)}
                            className="flex items-center gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            Importer depuis un fichier
                          </Button>
                          <Button variant="outline" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Ajouter manuellement
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions en lot */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Actions en Lot
                      </CardTitle>
                      <CardDescription>
                        Effectuez des actions sur plusieurs participants à la fois
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Exporter la liste
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Envoyer des invitations
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Générer des badges
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="registration" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Formulaire d'Inscription
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Créez et configurez le formulaire d'inscription pour votre événement
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <RegistrationFormBuilder
                      projectId={project.id}
                      onSave={async (form) => {
                        try {
                          // Transform the form builder data to match the RegistrationForm interface
                          const registrationForm = {
                            projectId: project.id,
                            title: form.settings.title,
                            description: form.settings.description || '',
                            isActive: true,
                            fields: form.sections.flatMap((section, sectionIndex) => 
                              section.fields.map((field, fieldIndex) => ({
                                id: field.id,
                                type: field.type as 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'date' | 'file',
                                label: field.label,
                                placeholder: field.properties?.placeholder,
                                required: field.isRequired || false,
                                options: field.properties?.options?.map(opt => opt.value), // Convert to string array
                                validation: {
                                  minLength: field.validation?.minLength,
                                  maxLength: field.validation?.maxLength,
                                  pattern: field.validation?.pattern
                                },
                                order: sectionIndex * 100 + fieldIndex // Generate order based on position
                              }))
                            ),
                            settings: {
                              requiresApproval: false,
                              confirmationMessage: form.settings.successMessage || 'Merci pour votre inscription !'
                            }
                          }

                          // Check if form already exists
                          const existingForm = await ProjectService.getRegistrationForm(project.id)
                          
                          if (existingForm) {
                            await ProjectService.updateRegistrationForm(project.id, {
                              ...existingForm,
                              ...registrationForm
                            })
                          } else {
                            await ProjectService.createRegistrationForm(project.id, registrationForm)
                          }
                          
                          console.log('Form saved successfully')
                        } catch (error) {
                          console.error('Error saving form:', error)
                          throw error
                        }
                      }}
                      onPublish={async (form) => {
                        try {
                          // First save the form
                          const registrationForm = {
                            projectId: project.id,
                            title: form.settings.title,
                            description: form.settings.description || '',
                            isActive: true,
                            fields: form.sections.flatMap((section, sectionIndex) => 
                              section.fields.map((field, fieldIndex) => ({
                                id: field.id,
                                type: field.type as 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'date' | 'file',
                                label: field.label,
                                placeholder: field.properties?.placeholder,
                                required: field.isRequired || false,
                                options: field.properties?.options?.map(opt => opt.value), // Convert to string array
                                validation: {
                                  minLength: field.validation?.minLength,
                                  maxLength: field.validation?.maxLength,
                                  pattern: field.validation?.pattern
                                },
                                order: sectionIndex * 100 + fieldIndex // Generate order based on position
                              }))
                            ),
                            settings: {
                              requiresApproval: false,
                              confirmationMessage: form.settings.successMessage || 'Merci pour votre inscription !'
                            }
                          }

                          // Check if form already exists
                          const existingForm = await ProjectService.getRegistrationForm(project.id)
                          
                          if (existingForm) {
                            await ProjectService.updateRegistrationForm(project.id, {
                              ...existingForm,
                              ...registrationForm
                            })
                          } else {
                            await ProjectService.createRegistrationForm(project.id, registrationForm)
                          }

                          // Update project to enable registration
                          await updateProject({
                            eventDetails: {
                              ...project.eventDetails,
                              requiresRegistration: true
                            }
                          })
                          
                          console.log('Form published successfully')
                        } catch (error) {
                          console.error('Error publishing form:', error)
                          throw error
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="filters" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Générateur de Filtres
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Créez des filtres personnalisés style Snapchat pour votre événement
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <SnapchatFilterGenerator
                      eventId={project.id}
                      eventImage={project.eventDetails.image}
                      eventColors={project.eventDetails.colorTheme ? [project.eventDetails.colorTheme] : ['#3B82F6', '#10B981', '#F59E0B']}
                      onSave={async (filter) => {
                        console.log('Saving filter:', filter)
                        // Ici on sauvegarderait le filtre via l'API
                      }}
                      onShare={async (filter) => {
                        console.log('Sharing filter:', filter)
                        // Ici on partagerait le filtre
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Configuration Visuelle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Configuration Visuelle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Couleur du thème */}
                      <div>
                        <Label>Couleur du thème</Label>
                        <ColorPicker
                          value={project.eventDetails.colorTheme || '#3B82F6'}
                          onChange={async (color) => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  colorTheme: color
                                }
                              })
                            } catch (error) {
                              console.error('Error updating color:', error)
                            }
                          }}
                          label="Couleur principale de l'événement"
                        />
                      </div>

                      {/* Image de l'événement */}
                      <div>
                        <Label>Image de l'événement</Label>
                        <ImageUpload
                          onImageSelect={async (file, preview) => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  image: preview
                                }
                              })
                            } catch (error) {
                              console.error('Error updating image:', error)
                            }
                          }}
                          onImageRemove={async () => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  image: undefined
                                }
                              })
                            } catch (error) {
                              console.error('Error removing image:', error)
                            }
                          }}
                          currentImage={project.eventDetails.image}
                          aspectRatio="16:9"
                          placeholder="Image de couverture de l'événement"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration Temporelle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Configuration Temporelle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Timezone */}
                      <div>
                        <Label>Fuseau horaire</Label>
                        <TimezoneSelector
                          value={project.eventDetails.timezone || 'Europe/Paris'}
                          onChange={async (timezone) => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  timezone: timezone
                                }
                              })
                            } catch (error) {
                              console.error('Error updating timezone:', error)
                            }
                          }}
                          organizationTimezone={organizationTimezone}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Fuseau horaire utilisé pour l'affichage des dates
                        </p>
                      </div>

                      {/* Dates de l'événement */}
                      <div className="grid grid-cols-1 gap-4">
                        <DateTimePicker
                          label="Date de début"
                          type="datetime-local"
                          value={project.eventDetails.startDate}
                          onChange={async (value) => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  startDate: value
                                }
                              })
                            } catch (error) {
                              console.error('Error updating start date:', error)
                            }
                          }}
                        />
                        
                        <DateTimePicker
                          label="Date de fin"
                          type="datetime-local"
                          value={project.eventDetails.endDate}
                          onChange={async (value) => {
                            try {
                              await updateProject({
                                eventDetails: {
                                  ...project.eventDetails,
                                  endDate: value
                                }
                              })
                            } catch (error) {
                              console.error('Error updating end date:', error)
                            }
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Informations générales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Informations Générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Métadonnées du projet</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Créé par:</span>
                            <p>{project.createdBy}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tenant ID:</span>
                            <p className="font-mono text-xs">{project.tenantId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Créé le:</span>
                            <p>{formatDateTime(project.createdAt)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Modifié le:</span>
                            <p>{formatDateTime(project.updatedAt)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-2">Actions</h3>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Exporter le projet
                          </Button>
                          <Button variant="outline" size="sm">
                            Dupliquer
                          </Button>
                          <Button variant="destructive" size="sm">
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={(result) => {
          console.log('Import completed:', result);
          // TODO: Refresh participants list
          setShowImportDialog(false);
        }}
        importType={ImportType.PARTICIPANTS}
      />
    </AppShell>
  )
}