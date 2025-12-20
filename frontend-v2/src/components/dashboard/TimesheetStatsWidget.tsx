import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMyTimesheets, useTimesheetStats } from '@/hooks/useTimesheets'
import { 
  TimesheetStatus, 
  TimesheetStatusLabels, 
  TimesheetStatusColors,
  calculateHours
} from '@/types/timesheet.types'
import { 
  Clock, 
  ArrowRight, 
  TrendingUp,
  FileText,
  BarChart3
} from 'lucide-react'

interface TimesheetStatsWidgetProps {
  className?: string
}

export function TimesheetStatsWidget({ className }: TimesheetStatsWidgetProps) {
  const router = useRouter()
  const { timesheets, loading: timesheetsLoading } = useMyTimesheets({ limit: 5 })
  const { stats, loading: statsLoading } = useTimesheetStats()

  if (timesheetsLoading || statsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Feuilles de temps
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/app/timesheets')}
            >
              Voir tout
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    )
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    return `${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
  }

  const getStatusIcon = (status: TimesheetStatus) => {
    switch (status) {
      case TimesheetStatus.APPROVED:
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case TimesheetStatus.REJECTED:
        return <FileText className="h-4 w-4 text-red-500" />
      case TimesheetStatus.SUBMITTED:
      case TimesheetStatus.UNDER_REVIEW:
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Feuilles de temps
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/app/timesheets')}
          >
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistiques rapides */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">{calculateHours(stats.totalHours * 60)}h</div>
              <div className="text-xs text-muted-foreground">Heures totales</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{Math.round(stats.billablePercentage)}%</div>
              <div className="text-xs text-muted-foreground">Taux facturable</div>
            </div>
          </div>
        )}

        {!timesheets || timesheets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              <div className="font-medium">Aucune feuille de temps</div>
              <div className="text-sm">Créez votre première feuille de temps pour suivre vos heures</div>
            </div>
            <Button 
              size="sm"
              onClick={() => router.push('/app/timesheets/create')}
            >
              Créer une feuille de temps
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {timesheets.slice(0, 3).map((timesheet) => (
              <div 
                key={timesheet.id} 
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/app/timesheets/${timesheet.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(timesheet.status)}
                      <span className="font-medium text-sm">
                        {formatPeriod(timesheet.periodStart, timesheet.periodEnd)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${TimesheetStatusColors[timesheet.status]}`}
                      >
                        {TimesheetStatusLabels[timesheet.status]}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{calculateHours(timesheet.totalHours * 60)}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{timesheet.timeEntries.length} entrée(s)</span>
                      </div>
                    </div>

                    {timesheet.rejectionReason && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 p-1 rounded">
                        Rejetée: {timesheet.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {timesheets.length > 3 && (
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push('/app/timesheets')}
                >
                  Voir {timesheets.length - 3} feuille(s) supplémentaire(s)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}