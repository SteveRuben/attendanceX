import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimpleSwitch as Switch } from '@/components/ui/simple-switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { usePermissions } from '@/hooks/usePermissions'
import { AdminGuard, PermissionGuard } from '@/components/auth/PermissionGuard'
import { useProjects, useActivityCodes } from '@/hooks/useTimesheets'
import TimesheetService from '@/services/timesheetService'
import { ProjectStatus, ProjectStatusLabels, ProjectStatusColors } from '@/types/timesheet.types'
import { 
  Clock, 
  Plus, 
  FolderOpen, 
  Tag,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'

export default function TimesheetSettings() {
  const { projects, loading: projectsLoading, refresh: refreshProjects } = useProjects()
  const { activityCodes, loading: activityCodesLoading, refresh: refreshActivityCodes } = useActivityCodes()
  const { canCreateProject, canCreateActivityCode } = usePermissions()
  
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showCreateActivity, setShowCreateActivity] = useState(false)

  // Formulaire nouveau projet
  const [newProject, setNewProject] = useState({
    name: '',
    code: '',
    description: '',
    status: ProjectStatus.ACTIVE,
    defaultHourlyRate: '',
    billable: true,
    settings: {
      requireActivityCode: false,
      allowOvertime: true,
      autoApprove: false
    }
  })

  // Formulaire nouveau code d'activité
  const [newActivity, setNewActivity] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    billable: true,
    defaultRate: '',
    isActive: true,
    projectSpecific: false
  })

  const handleCreateProject = async () => {
    try {
      await TimesheetService.createProject({
        ...newProject,
        defaultHourlyRate: newProject.defaultHourlyRate ? parseFloat(newProject.defaultHourlyRate) : undefined
      })
      
      setNewProject({
        name: '',
        code: '',
        description: '',
        status: ProjectStatus.ACTIVE,
        defaultHourlyRate: '',
        billable: true,
        settings: {
          requireActivityCode: false,
          allowOvertime: true,
          autoApprove: false
        }
      })
      setShowCreateProject(false)
      refreshProjects()
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error)
    }
  }

  const handleCreateActivity = async () => {
    try {
      await TimesheetService.createActivityCode({
        ...newActivity,
        defaultRate: newActivity.defaultRate ? parseFloat(newActivity.defaultRate) : undefined
      })
      
      setNewActivity({
        code: '',
        name: '',
        description: '',
        category: '',
        billable: true,
        defaultRate: '',
        isActive: true,
        projectSpecific: false
      })
      setShowCreateActivity(false)
      refreshActivityCodes()
    } catch (error) {
      console.error('Erreur lors de la création du code d\'activité:', error)
    }
  }

  return (
    <AppShell title="Paramètres des feuilles de temps">
      <AdminGuard>
        <div className="h-full overflow-y-auto scroll-smooth">
          <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Paramètres des feuilles de temps
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez les projets, codes d'activité et paramètres des feuilles de temps
              </p>
            </div>

          {/* Section Projets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Projets
                </div>
                <PermissionGuard permission="create_project">
                  <Button 
                    onClick={() => setShowCreateProject(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau projet
                  </Button>
                </PermissionGuard>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showCreateProject && canCreateProject() && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium mb-4">Créer un nouveau projet</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-name">Nom du projet</Label>
                    <Input
                      id="project-name"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nom du projet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-code">Code du projet</Label>
                    <Input
                      id="project-code"
                      value={newProject.code}
                      onChange={(e) => setNewProject(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="CODE_PROJET"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={newProject.description}
                      onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description du projet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-status">Statut</Label>
                    <Select 
                      value={newProject.status} 
                      onChange={(e) => setNewProject(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
                    >
                      {Object.values(ProjectStatus).map(status => (
                        <option key={status} value={status}>
                          {ProjectStatusLabels[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project-rate">Taux horaire par défaut (€)</Label>
                    <Input
                      id="project-rate"
                      type="number"
                      step="0.01"
                      value={newProject.defaultHourlyRate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, defaultHourlyRate: e.target.value }))}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="project-billable"
                        checked={newProject.billable}
                        onCheckedChange={(checked: boolean) => setNewProject(prev => ({ ...prev, billable: checked }))}
                      />
                      <Label htmlFor="project-billable">Projet facturable</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="project-require-activity"
                        checked={newProject.settings.requireActivityCode}
                        onCheckedChange={(checked: boolean) => setNewProject(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, requireActivityCode: checked }
                        }))}
                      />
                      <Label htmlFor="project-require-activity">Exiger un code d'activité</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="project-allow-overtime"
                        checked={newProject.settings.allowOvertime}
                        onCheckedChange={(checked: boolean) => setNewProject(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, allowOvertime: checked }
                        }))}
                      />
                      <Label htmlFor="project-allow-overtime">Autoriser les heures supplémentaires</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="project-auto-approve"
                        checked={newProject.settings.autoApprove}
                        onCheckedChange={(checked: boolean) => setNewProject(prev => ({ 
                          ...prev, 
                          settings: { ...prev.settings, autoApprove: checked }
                        }))}
                      />
                      <Label htmlFor="project-auto-approve">Approbation automatique</Label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleCreateProject}>
                    <Save className="h-4 w-4 mr-2" />
                    Créer le projet
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateProject(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {projectsLoading ? (
              <div className="text-center py-8">Chargement des projets...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun projet configuré
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{project.name}</h3>
                        <Badge className={ProjectStatusColors[project.status]}>
                          {ProjectStatusLabels[project.status]}
                        </Badge>
                        {project.billable && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Facturable
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Code: {project.code}
                      </p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.defaultHourlyRate && (
                          <span>Taux: {project.defaultHourlyRate}€/h</span>
                        )}
                        <span>Employés: {project.assignedEmployees.length}</span>
                        <span>Codes d'activité: {project.activityCodes.length}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <PermissionGuard permission="edit_project">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission="delete_project">
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section Codes d'activité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Codes d'activité
              </div>
              <PermissionGuard permission="create_activity_code">
                <Button 
                  onClick={() => setShowCreateActivity(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau code d'activité
                </Button>
              </PermissionGuard>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showCreateActivity && canCreateActivityCode() && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium mb-4">Créer un nouveau code d'activité</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="activity-code">Code</Label>
                    <Input
                      id="activity-code"
                      value={newActivity.code}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="DEV001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-name">Nom</Label>
                    <Input
                      id="activity-name"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Développement"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-category">Catégorie</Label>
                    <Input
                      id="activity-category"
                      value={newActivity.category}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Développement"
                    />
                  </div>
                  <div>
                    <Label htmlFor="activity-rate">Taux par défaut (€)</Label>
                    <Input
                      id="activity-rate"
                      type="number"
                      step="0.01"
                      value={newActivity.defaultRate}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, defaultRate: e.target.value }))}
                      placeholder="60.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="activity-description">Description</Label>
                    <Textarea
                      id="activity-description"
                      value={newActivity.description}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description de l'activité"
                    />
                  </div>
                  <div className="col-span-2 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="activity-billable"
                        checked={newActivity.billable}
                        onCheckedChange={(checked: boolean) => setNewActivity(prev => ({ ...prev, billable: checked }))}
                      />
                      <Label htmlFor="activity-billable">Activité facturable</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="activity-active"
                        checked={newActivity.isActive}
                        onCheckedChange={(checked: boolean) => setNewActivity(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="activity-active">Activité active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="activity-project-specific"
                        checked={newActivity.projectSpecific}
                        onCheckedChange={(checked: boolean) => setNewActivity(prev => ({ ...prev, projectSpecific: checked }))}
                      />
                      <Label htmlFor="activity-project-specific">Spécifique à un projet</Label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleCreateActivity}>
                    <Save className="h-4 w-4 mr-2" />
                    Créer le code d'activité
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateActivity(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {activityCodesLoading ? (
              <div className="text-center py-8">Chargement des codes d'activité...</div>
            ) : activityCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun code d'activité configuré
              </div>
            ) : (
              <div className="space-y-3">
                {activityCodes.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{activity.name}</h3>
                        <Badge variant="outline">{activity.code}</Badge>
                        <Badge variant="outline">{activity.category}</Badge>
                        {activity.billable && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Facturable
                          </Badge>
                        )}
                        {!activity.isActive && (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.defaultRate && (
                          <span>Taux: {activity.defaultRate}€/h</span>
                        )}
                        {activity.projectSpecific && (
                          <span>Spécifique au projet</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <PermissionGuard permission="edit_activity_code">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission="delete_activity_code">
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </AdminGuard>
    </AppShell>
  )
}