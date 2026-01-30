import React from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  EventProject, 
  PROJECT_TEMPLATES,
  getStatusColor,
  getPhaseColor 
} from '@/types/project.types'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Eye,
  Edit,
  Target,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: EventProject
  onEdit?: (project: EventProject) => void
  onView?: (project: EventProject) => void
  className?: string
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onView,
  className
}) => {
  const router = useRouter()
  const template = PROJECT_TEMPLATES[project.template]
  
  const handleView = () => {
    if (onView) {
      onView(project)
    } else {
      router.push(`/app/projects/${project.id}`)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(project)
    } else {
      router.push(`/app/projects/${project.id}/edit`)
    }
  }

  const completedObjectives = project.objectives.filter(obj => obj.status === 'completed').length
  const totalObjectives = project.objectives.length
  const progressPercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-1',
        className
      )}
      onClick={handleView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <div className="text-xl text-blue-600 dark:text-blue-400">{template.icon}</div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{project.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge 
              className={cn(
                'text-xs',
                `bg-${getStatusColor(project.status)}-100 text-${getStatusColor(project.status)}-800 dark:bg-${getStatusColor(project.status)}-900/30 dark:text-${getStatusColor(project.status)}-200`
              )}
            >
              {project.status}
            </Badge>
            <Badge 
              variant="outline" 
              className="text-xs"
            >
              {template.name}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Phase actuelle */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              `bg-${getPhaseColor(project.currentPhase)}-500`
            )} />
            <span className="text-sm font-medium">Phase: {project.currentPhase}</span>
          </div>

          {/* Progression des objectifs */}
          {totalObjectives > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Objectifs</span>
                <span>{completedObjectives}/{totalObjectives}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Informations de l'événement */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {new Date(project.eventDetails.startDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate capitalize">
                {project.eventDetails.location.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{project.teams.length} équipes</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>{totalObjectives} objectifs</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleView}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Voir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProjectCard