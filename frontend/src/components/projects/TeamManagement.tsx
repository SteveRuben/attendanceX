import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  ProjectTeam, 
  ProjectObjective,
  EventProject 
} from '@/types/project.types'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus,
  Target,
  Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamManagementProps {
  project: EventProject
  onCreateTeam?: (team: Omit<ProjectTeam, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateTeam?: (teamId: string, updates: Partial<ProjectTeam>) => void
  onDeleteTeam?: (teamId: string) => void
  className?: string
}

const TEAM_COLORS = [
  'blue', 'green', 'purple', 'orange', 'red', 'yellow', 'pink', 'indigo', 'teal', 'gray'
]

export const TeamManagement: React.FC<TeamManagementProps> = ({
  project,
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  className
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    leaderId: '',
    members: [] as string[]
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: 'blue',
      leaderId: '',
      members: []
    })
    setShowCreateForm(false)
    setEditingTeam(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingTeam) {
      // Update existing team
      onUpdateTeam?.(editingTeam, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        leaderId: formData.leaderId,
        members: formData.members
      })
    } else {
      // Create new team
      onCreateTeam?.({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        leaderId: formData.leaderId,
        members: formData.members,
        objectives: []
      })
    }
    
    resetForm()
  }

  const handleEdit = (team: ProjectTeam) => {
    setFormData({
      name: team.name,
      description: team.description,
      color: team.color,
      leaderId: team.leaderId,
      members: team.members
    })
    setEditingTeam(team.id)
    setShowCreateForm(true)
  }

  const getTeamObjectives = (teamId: string): ProjectObjective[] => {
    return project.objectives.filter(obj => obj.teamId === teamId)
  }

  const getTeamProgress = (teamId: string): number => {
    const objectives = getTeamObjectives(teamId)
    if (objectives.length === 0) return 0
    
    const completed = objectives.filter(obj => obj.status === 'completed').length
    return Math.round((completed / objectives.length) * 100)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestion des équipes
          </h2>
          <p className="text-muted-foreground mt-1">
            Organisez vos équipes et assignez les responsabilités
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle équipe
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTeam ? 'Modifier l\'équipe' : 'Créer une nouvelle équipe'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamName">Nom de l'équipe *</Label>
                  <Input
                    id="teamName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Équipe logistique"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="teamColor">Couleur</Label>
                  <select
                    id="teamColor"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {TEAM_COLORS.map(color => (
                      <option key={color} value={color}>
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="teamDescription">Description</Label>
                <textarea
                  id="teamDescription"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez le rôle et les responsabilités de cette équipe..."
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div>
                <Label htmlFor="teamLeader">Chef d'équipe</Label>
                <Input
                  id="teamLeader"
                  value={formData.leaderId}
                  onChange={(e) => setFormData(prev => ({ ...prev, leaderId: e.target.value }))}
                  placeholder="ID ou email du chef d'équipe"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTeam ? 'Mettre à jour' : 'Créer l\'équipe'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Teams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.teams.map(team => {
          const objectives = getTeamObjectives(team.id)
          const progress = getTeamProgress(team.id)
          
          return (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-4 h-4 rounded-full',
                      `bg-${team.color}-500`
                    )} />
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {team.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(team)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTeam?.(team.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Chef d'équipe */}
                  {team.leaderId && (
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Chef: {team.leaderId}</span>
                    </div>
                  )}
                  
                  {/* Membres */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Membres</span>
                      <Button variant="ghost" size="sm">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {team.members.length > 0 ? (
                        team.members.slice(0, 3).map((member, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {member}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucun membre</span>
                      )}
                      {team.members.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{team.members.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Objectifs */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Objectifs ({objectives.length})
                      </span>
                    </div>
                    
                    {objectives.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progression</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              'h-2 rounded-full transition-all duration-300',
                              `bg-${team.color}-500`
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Users className="h-4 w-4 mr-2" />
                      Gérer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {/* Empty State */}
        {project.teams.length === 0 && !showCreateForm && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune équipe créée</h3>
              <p className="text-muted-foreground text-center mb-4">
                Créez votre première équipe pour organiser votre projet
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une équipe
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default TeamManagement