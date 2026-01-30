import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Eye,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { EventProject } from '@/types/project.types'
import { createFromProject } from '@/services/eventsService'

interface ProjectEventLinkProps {
  project: EventProject
  onEventCreated?: (eventId: string) => void
  organizationTimezone?: string
}

export const ProjectEventLink: React.FC<ProjectEventLinkProps> = ({ 
  project, 
  onEventCreated,
  organizationTimezone
}) => {
  const router = useRouter()
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [eventId, setEventId] = useState<string | null>(project.eventDetails.eventId || null)

  // Ne plus créer automatiquement l'événement - seulement sur demande utilisateur
  // useEffect supprimé pour éviter la création automatique

  const createEventManually = async () => {
    setIsCreatingEvent(true)
    try {
      // Appeler l'API réelle pour créer l'événement depuis le projet
      const response = await createFromProject(project, organizationTimezone)
      const newEventId = response.id
      
      setEventId(newEventId)
      onEventCreated?.(newEventId)
      
      console.log('Événement créé manuellement:', newEventId)
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'événement:', error)
      
      // Afficher un message d'erreur plus spécifique
      let errorMessage = 'Erreur lors de la création de l\'événement'
      
      if (error?.response?.data?.error) {
        const apiError = error.response.data.error
        if (typeof apiError === 'string') {
          errorMessage = apiError
        } else if (apiError.message) {
          errorMessage = apiError.message
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      console.warn('Message d\'erreur pour l\'utilisateur:', errorMessage)
      
      // TODO: Afficher une notification toast à l'utilisateur
      // toast.error(errorMessage)
      
      // En cas d'erreur, on peut toujours afficher un message à l'utilisateur
      // mais on ne bloque pas l'interface
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleViewEvent = () => {
    if (eventId) {
      router.push(`/app/events/${eventId}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLocationDisplay = () => {
    const { location } = project.eventDetails
    switch (location.type) {
      case 'physical':
        return location.name || 'Lieu physique'
      case 'virtual':
        return 'Événement virtuel'
      case 'hybrid':
        return 'Événement hybride'
      default:
        return 'Lieu à définir'
    }
  }

  const getCompletionStatus = () => {
    let completed = 0
    let total = 6

    if (project.eventDetails.startDate) completed++
    if (project.eventDetails.endDate) completed++
    if (project.eventDetails.location.name) completed++
    if (project.eventDetails.image) completed++
    if (project.eventDetails.capacity) completed++
    if (project.eventDetails.tags.length > 0) completed++

    return { completed, total, percentage: Math.round((completed / total) * 100) }
  }

  const status = getCompletionStatus()

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Événement Associé
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCreatingEvent ? (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Création...
              </Badge>
            ) : eventId ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Créé
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                En attente
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statut de création */}
        {!eventId && !isCreatingEvent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Événement non créé</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Cliquez sur "Créer l'Événement" pour générer l'événement à partir de ce projet
            </p>
          </div>
        )}

        {/* Statut de création en cours */}
        {isCreatingEvent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Création de l'événement...</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              L'événement est en cours de création à partir des informations du projet
            </p>
          </div>
        )}

        {/* Barre de progression de completion */}
        {eventId && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completion de l'événement</span>
              <span className="text-sm text-gray-600">{status.completed}/{status.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {status.percentage < 100 
                ? `${100 - status.percentage}% restant à compléter dans l'événement`
                : 'Événement complètement configuré'
              }
            </p>
          </div>
        )}

        {/* Image de l'événement si disponible */}
        {project.eventDetails.image && (
          <div className="relative h-32 w-full rounded-lg overflow-hidden">
            <img 
              src={project.eventDetails.image} 
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
              style={{ backgroundColor: project.eventDetails.colorTheme + '20' }}
            />
          </div>
        )}

        {/* Informations de l'événement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <div>
              <div className="font-medium">Début</div>
              <div>{project.eventDetails.startDate ? formatDate(project.eventDetails.startDate) : 'À définir'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <div>
              <div className="font-medium">Fin</div>
              <div>{project.eventDetails.endDate ? formatDate(project.eventDetails.endDate) : 'À définir'}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4" />
            <div>
              <div className="font-medium">Lieu</div>
              <div>{getLocationDisplay()}</div>
            </div>
          </div>
          
          {project.eventDetails.capacity && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <div>
                <div className="font-medium">Capacité</div>
                <div>{project.eventDetails.capacity} participants</div>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {project.eventDetails.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.eventDetails.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!eventId && !isCreatingEvent ? (
            // Bouton pour créer l'événement manuellement
            <Button 
              onClick={createEventManually}
              className="flex-1"
              style={{ 
                backgroundColor: project.eventDetails.colorTheme || '#3B82F6',
                borderColor: project.eventDetails.colorTheme || '#3B82F6'
              }}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Créer l'Événement
            </Button>
          ) : (
            // Bouton pour aller à l'événement existant
            <Button 
              onClick={handleViewEvent}
              disabled={!eventId || isCreatingEvent}
              className="flex-1"
              style={{ 
                backgroundColor: project.eventDetails.colorTheme || '#3B82F6',
                borderColor: project.eventDetails.colorTheme || '#3B82F6'
              }}
            >
              {isCreatingEvent ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Aller à l'Événement
                </>
              )}
            </Button>
          )}
          
          {eventId && !isCreatingEvent && (
            <Button 
              variant="outline" 
              onClick={() => router.push(`/app/events/${eventId}/edit`)}
            >
              Compléter
            </Button>
          )}
        </div>

        {/* Informations sur la création automatique */}
        {eventId && !isCreatingEvent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Événement créé avec succès</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Cliquez sur "Aller à l'Événement" pour voir et compléter les détails manquants
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectEventLink