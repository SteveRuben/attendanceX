
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useMyTasks } from '@/hooks/useResolutions'
import { useEvents } from '@/hooks/useEvent'
import { 
  Resolution, 
  ResolutionStatus, 
  ResolutionPriority,
  ResolutionStatusLabels,
  ResolutionPriorityLabels,
  ResolutionStatusColors,
  ResolutionPriorityColors,
  isResolutionOverdue
} from '@/types/resolution.types'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Calendar,
  User,
  FileText,
  ExternalLink,
  Plus
} from 'lucide-react'

interface PersonalTasksEmailWidgetProps {
  className?: string
}



export function PersonalTasksEmailWidget({ className }: PersonalTasksEmailWidgetProps) {
  const router = useRouter()
  const { resolutions: tasks, loading: isLoading, error } = useMyTasks({
    limit: 10
  })
  
  // Récupérer les informations des événements
  const eventIds = tasks ? tasks.map(task => task.eventId) : []
  const events = useEvents(eventIds)

  const getPriorityIcon = (priority: ResolutionPriority) => {
    switch (priority) {
      case ResolutionPriority.HIGH:
      case ResolutionPriority.URGENT:
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case ResolutionPriority.MEDIUM:
        return <Clock className="h-4 w-4 text-yellow-500" />
      case ResolutionPriority.LOW:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventName = (eventId: string) => {
    // Utiliser les données d'événement récupérées via l'API
    if (events[eventId]) {
      return events[eventId].name
    }
    
    // Fallback générique si l'événement n'est pas trouvé
    return `Événement ${eventId.slice(-6).toUpperCase()}`
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mes Tâches
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/app/my-tasks')}
            >
              Voir tout
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Erreur lors du chargement des tâches. Veuillez vérifier que le backend est démarré.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mes Tâches
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/app/my-tasks')}
          >
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement...</div>
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState 
            title="Aucune tâche" 
            description="Vous n'avez pas de tâches assignées pour le moment" 
          />
        ) : (
          <div className="space-y-2">
            {tasks
              .filter(task => task.status === ResolutionStatus.PENDING || task.status === ResolutionStatus.IN_PROGRESS)
              .slice(0, 5)
              .map((task: Resolution) => (
                <div 
                  key={task.id} 
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => router.push(`/app/events/${task.eventId}/resolutions?resolution=${task.id}`)}
                >
                  {/* En-tête style email */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getPriorityIcon(task.priority)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            Réf: #{task.id.slice(-6).toUpperCase()}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${ResolutionStatusColors[task.status]}`}
                          >
                            {ResolutionStatusLabels[task.status]}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${ResolutionPriorityColors[task.priority]}`}
                          >
                            {ResolutionPriorityLabels[task.priority]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/app/timesheets/add-session?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}`)
                        }}
                        title="Ajouter une session de travail"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                  </div>

                  {/* Titre de la tâche */}
                  <h4 className="font-semibold text-base mb-2 text-gray-900">
                    {task.title}
                  </h4>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {task.description}
                  </p>

                  {/* Informations détaillées */}
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span className="font-medium">Événement:</span>
                        <span 
                          className="text-blue-600 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/app/events/${task.eventId}`)
                          }}
                        >
                          {getEventName(task.eventId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium">Créé par:</span>
                        <span>{task.createdByName || 'Inconnu'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">Créé le:</span>
                        <span>{formatDate(task.createdAt)}</span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">Échéance:</span>
                          <span className={isResolutionOverdue(task) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(task.dueDate)}
                            {isResolutionOverdue(task) && ' (En retard)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression si disponible */}
                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progression</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            
            {tasks.filter(task => task.status === ResolutionStatus.PENDING || task.status === ResolutionStatus.IN_PROGRESS).length > 5 && (
              <div className="pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push('/app/my-tasks')}
                >
                  Voir {tasks.filter(task => task.status === ResolutionStatus.PENDING || task.status === ResolutionStatus.IN_PROGRESS).length - 5} tâche(s) supplémentaire(s)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}