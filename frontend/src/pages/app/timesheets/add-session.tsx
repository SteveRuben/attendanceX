import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useProjects, useActivityCodes, useMyTimesheets } from '@/hooks/useTimesheets'
import TimesheetService from '@/services/timesheetService'
import { formatDuration, parseDuration } from '@/types/timesheet.types'
import { 
  Clock, 
  Save, 
  ArrowLeft,
  Calendar,
  FileText
} from 'lucide-react'

export default function AddSessionPage() {
  const router = useRouter()
  const { taskId, taskTitle } = router.query
  const { projects } = useProjects()
  const { activityCodes } = useActivityCodes()
  const { timesheets } = useMyTimesheets({ limit: 10 })
  
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    duration: '',
    description: taskTitle ? `Travail sur la tâche: ${taskTitle}` : '',
    projectId: '',
    activityCodeId: '',
    timesheetId: ''
  })

  // Trouver ou créer une feuille de temps pour la date sélectionnée
  useEffect(() => {
    if (session.date && timesheets.length > 0) {
      const selectedDate = new Date(session.date)
      const matchingTimesheet = timesheets.find(timesheet => {
        const start = new Date(timesheet.periodStart)
        const end = new Date(timesheet.periodEnd)
        return selectedDate >= start && selectedDate <= end
      })
      
      if (matchingTimesheet) {
        setSession(prev => ({ ...prev, timesheetId: matchingTimesheet.id }))
      }
    }
  }, [session.date, timesheets])

  // Calculer la durée automatiquement si les heures de début et fin sont renseignées
  useEffect(() => {
    if (session.startTime && session.endTime) {
      const start = new Date(`2000-01-01T${session.startTime}:00`)
      const end = new Date(`2000-01-01T${session.endTime}:00`)
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime()
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        setSession(prev => ({ ...prev, duration: formatDuration(diffMinutes) }))
      }
    }
  }, [session.startTime, session.endTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let timesheetId = session.timesheetId

      // Créer une feuille de temps si nécessaire
      if (!timesheetId) {
        const selectedDate = new Date(session.date)
        const startOfWeek = new Date(selectedDate)
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1) // Lundi
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6) // Dimanche

        const newTimesheet = await TimesheetService.createTimesheet({
          periodStart: startOfWeek.toISOString().split('T')[0],
          periodEnd: endOfWeek.toISOString().split('T')[0]
        })
        timesheetId = newTimesheet.id
      }

      // Créer l'entrée de temps
      const durationMinutes = session.duration ? parseDuration(session.duration) : 0
      
      await TimesheetService.createTimeEntry(timesheetId, {
        date: session.date,
        startTime: session.startTime || undefined,
        endTime: session.endTime || undefined,
        duration: durationMinutes,
        description: session.description,
        projectId: session.projectId || undefined,
        activityCodeId: session.activityCodeId || undefined,
        billable: true
      })

      // Si c'est depuis une tâche, créer aussi la liaison
      if (taskId) {
        await TimesheetService.createSessionFromTask({
          resolutionId: taskId as string,
          date: session.date,
          duration: durationMinutes,
          description: session.description,
          projectId: session.projectId || undefined,
          activityCodeId: session.activityCodeId || undefined
        })
      }

      router.push(`/app/timesheets/${timesheetId}`)
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <AppShell title="Ajouter une session de travail">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Ajouter une session de travail
            </h1>
            {taskTitle && (
              <p className="text-sm text-muted-foreground">
                Pour la tâche: {taskTitle}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Détails de la session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={session.date}
                    onChange={(e) => setSession(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Durée</Label>
                  <Input
                    id="duration"
                    value={session.duration}
                    onChange={(e) => setSession(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="2h 30m"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: 2h 30m ou remplissez les heures de début/fin
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Heure de début (optionnel)</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={session.startTime}
                    onChange={(e) => setSession(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Heure de fin (optionnel)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={session.endTime}
                    onChange={(e) => setSession(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={session.description}
                  onChange={(e) => setSession(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez le travail effectué..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Projet (optionnel)</Label>
                  <Select 
                    id="project"
                    value={session.projectId} 
                    onChange={(e) => setSession(prev => ({ ...prev, projectId: e.target.value }))}
                  >
                    <option value="">Aucun projet</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="activity">Code d'activité (optionnel)</Label>
                  <Select 
                    id="activity"
                    value={session.activityCodeId} 
                    onChange={(e) => setSession(prev => ({ ...prev, activityCodeId: e.target.value }))}
                  >
                    <option value="">Aucune activité</option>
                    {activityCodes.map(activity => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name} ({activity.code})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {session.timesheetId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Cette session sera ajoutée à votre feuille de temps existante pour cette période.
                  </p>
                </div>
              )}

              {!session.timesheetId && session.date && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Une nouvelle feuille de temps sera créée pour cette période.
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Enregistrement...' : 'Enregistrer la session'}
                </Button>
                <Button type="button" variant="outline" onClick={handleBack}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}