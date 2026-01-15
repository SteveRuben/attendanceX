import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Brain, Calendar, Users, Clock, MapPin, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { useAI } from '@/hooks/useAI'

export default function EventGeneratorPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const { 
    loading, 
    creating, 
    error, 
    generatedEvent, 
    generateEvent, 
    createEventFromGenerated, 
    clearError 
  } = useAI()

  const handleGenerate = async () => {
    if (!input.trim()) return

    await generateEvent({
      naturalLanguageInput: input.trim()
    })
  }

  const handleCreateEvent = async () => {
    if (!generatedEvent) return

    const result = await createEventFromGenerated({
      generatedEventData: generatedEvent.event
    })

    if (result) {
      // Rediriger vers l'événement créé avec option de retour à la liste
      router.push(`/app/events/${result.eventId}?from=ai-generator`)
    }
  }

  const getTypeColor = (type: string) => {
    const colors = {
      conference: 'bg-blue-100 text-blue-800',
      meeting: 'bg-green-100 text-green-800',
      workshop: 'bg-purple-100 text-purple-800',
      social: 'bg-pink-100 text-pink-800',
      wedding: 'bg-rose-100 text-rose-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || colors.other
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <AppShell title="Générateur d'Événements IA">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-600" />
              Générateur d'Événements IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Décrivez votre événement en langage naturel et laissez l'IA créer un plan complet en 30 secondes
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Décrivez votre événement
              </CardTitle>
              <CardDescription>
                Exemple : "Organise un brunch d'équipe pour 20 personnes samedi prochain avec un budget de 500€"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Décrivez votre événement en détail..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {input.length}/1000 caractères
                </span>
                <Button 
                  onClick={handleGenerate}
                  disabled={!input.trim() || loading || input.length > 1000}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Générer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

              {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearError}>
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Event Display */}
          {generatedEvent && (
            <div className="space-y-6">
              {/* Event Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {generatedEvent.event.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(generatedEvent.event.type)}>
                        {generatedEvent.event.type}
                      </Badge>
                      <Badge variant="outline">
                        Confiance: {Math.round(generatedEvent.event.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {generatedEvent.event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {generatedEvent.event.estimatedParticipants} participants
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {Math.round(generatedEvent.event.estimatedDuration / 60)}h
                      </span>
                    </div>
                    {generatedEvent.event.suggestedDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(generatedEvent.event.suggestedDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                    {generatedEvent.event.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {generatedEvent.event.budget.min}-{generatedEvent.event.budget.max}€
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Tâches à réaliser ({generatedEvent.event.tasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generatedEvent.event.tasks.map((task, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{task.title}</h4>
                            <Badge size="sm" className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>⏱️ {task.estimatedTime} min</span>
                            {task.dueDate && (
                              <span>📅 {new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Lieu & Équipement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedEvent.event.requirements.venue.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Lieu</h4>
                        <div className="flex flex-wrap gap-1">
                          {generatedEvent.event.requirements.venue.map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedEvent.event.requirements.equipment.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Équipement</h4>
                        <div className="flex flex-wrap gap-1">
                          {generatedEvent.event.requirements.equipment.map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Services</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedEvent.event.requirements.catering.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Restauration</h4>
                        <div className="flex flex-wrap gap-1">
                          {generatedEvent.event.requirements.catering.map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedEvent.event.requirements.staff.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Personnel</h4>
                        <div className="flex flex-wrap gap-1">
                          {generatedEvent.event.requirements.staff.map((item, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions */}
              {(generatedEvent.suggestions.venues.length > 0 || 
                generatedEvent.suggestions.improvements.length > 0 || 
                generatedEvent.suggestions.alternatives.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Suggestions IA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedEvent.suggestions.venues.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Lieux recommandés</h4>
                        <div className="flex flex-wrap gap-1">
                          {generatedEvent.suggestions.venues.map((venue, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {venue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {generatedEvent.suggestions.improvements.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Améliorations suggérées</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {generatedEvent.suggestions.improvements.map((improvement, index) => (
                            <li key={index}>• {improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Généré en {generatedEvent.metadata.processingTime}ms avec {generatedEvent.metadata.model}
                    </span>
                    <Button 
                      onClick={handleCreateEvent}
                      disabled={creating}
                      className="min-w-[140px]"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 mr-2" />
                          Créer l'événement
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}