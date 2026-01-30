import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  ProjectPhase, 
  ProjectStatus, 
  EventProject,
  getPhaseColor,
  getStatusColor 
} from '@/types/project.types'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Play, 
  Users, 
  Target,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectWorkflowProps {
  project: EventProject
  onPhaseChange?: (phase: ProjectPhase) => void
  className?: string
}

export const ProjectWorkflow: React.FC<ProjectWorkflowProps> = ({
  project,
  onPhaseChange,
  className
}) => {
  const phases = [
    {
      phase: ProjectPhase.CONCEPTION,
      name: 'Conception',
      description: 'Planification et définition du projet',
      icon: Circle,
      estimatedDays: 14
    },
    {
      phase: ProjectPhase.PREPARATION,
      name: 'Préparation',
      description: 'Organisation et mise en place',
      icon: Clock,
      estimatedDays: 21
    },
    {
      phase: ProjectPhase.EXECUTION,
      name: 'Exécution',
      description: 'Déroulement de l\'événement',
      icon: Play,
      estimatedDays: 1
    },
    {
      phase: ProjectPhase.CLOSURE,
      name: 'Clôture',
      description: 'Bilan et suivi post-événement',
      icon: CheckCircle,
      estimatedDays: 7
    }
  ]

  const getPhaseStatus = (phase: ProjectPhase) => {
    if (project.workflow.completedPhases.includes(phase)) {
      return 'completed'
    }
    if (project.currentPhase === phase) {
      return 'current'
    }
    return 'pending'
  }

  const getPhaseProgress = (phase: ProjectPhase) => {
    const phaseObjectives = project.objectives.filter(obj => obj.phase === phase)
    if (phaseObjectives.length === 0) return 0
    
    const completedObjectives = phaseObjectives.filter(obj => obj.status === 'completed')
    return Math.round((completedObjectives.length / phaseObjectives.length) * 100)
  }

  const canAdvanceToPhase = (phase: ProjectPhase) => {
    const phaseIndex = phases.findIndex(p => p.phase === phase)
    const currentPhaseIndex = phases.findIndex(p => p.phase === project.currentPhase)
    
    // Peut avancer à la phase suivante ou revenir à une phase précédente
    return phaseIndex <= currentPhaseIndex + 1
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* En-tête du workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Workflow du Projet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge 
                className={cn(
                  'text-sm',
                  `bg-${getStatusColor(project.status)}-100 text-${getStatusColor(project.status)}-800`
                )}
              >
                {project.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Phase actuelle : <span className="font-medium">{project.currentPhase}</span>
            </div>
          </div>
          
          {/* Barre de progression globale */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span>{Math.round((project.workflow.completedPhases.length / phases.length) * 100)}%</span>
            </div>
            <Progress 
              value={(project.workflow.completedPhases.length / phases.length) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline des phases */}
      <div className="space-y-4">
        {phases.map((phaseInfo, index) => {
          const status = getPhaseStatus(phaseInfo.phase)
          const progress = getPhaseProgress(phaseInfo.phase)
          const Icon = phaseInfo.icon
          const phaseObjectives = project.objectives.filter(obj => obj.phase === phaseInfo.phase)
          const phaseTeams = project.teams.filter(team => 
            team.objectives.some(obj => obj.phase === phaseInfo.phase)
          )

          return (
            <Card 
              key={phaseInfo.phase}
              className={cn(
                'transition-all duration-200',
                status === 'current' && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20',
                status === 'completed' && 'bg-green-50 dark:bg-green-950/20'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-full',
                      status === 'completed' && 'bg-green-100 text-green-600',
                      status === 'current' && 'bg-blue-100 text-blue-600',
                      status === 'pending' && 'bg-gray-100 text-gray-400'
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{phaseInfo.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {phaseInfo.estimatedDays} jours
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-normal">
                        {phaseInfo.description}
                      </p>
                    </div>
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    {status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        Terminé
                      </Badge>
                    )}
                    {status === 'current' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        En cours
                      </Badge>
                    )}
                    {status === 'pending' && onPhaseChange && canAdvanceToPhase(phaseInfo.phase) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPhaseChange(phaseInfo.phase)}
                      >
                        Commencer
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Progression de la phase */}
                {phaseObjectives.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                  </div>
                )}

                {/* Statistiques de la phase */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>{phaseObjectives.length} objectifs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{phaseTeams.length} équipes impliquées</span>
                  </div>
                </div>

                {/* Objectifs de la phase */}
                {phaseObjectives.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Objectifs principaux :</h4>
                    <div className="space-y-1">
                      {phaseObjectives.slice(0, 3).map((objective) => (
                        <div key={objective.id} className="flex items-center gap-2 text-sm">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            objective.status === 'completed' && 'bg-green-500',
                            objective.status === 'in_progress' && 'bg-blue-500',
                            objective.status === 'pending' && 'bg-gray-300'
                          )} />
                          <span className={cn(
                            objective.status === 'completed' && 'line-through text-muted-foreground'
                          )}>
                            {objective.title}
                          </span>
                        </div>
                      ))}
                      {phaseObjectives.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{phaseObjectives.length - 3} autres objectifs
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Flèche vers la phase suivante */}
              {index < phases.length - 1 && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default ProjectWorkflow