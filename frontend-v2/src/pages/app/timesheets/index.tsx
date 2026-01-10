import { useState } from 'react'
import { useRouter } from 'next/router'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat'
import { useMyTimesheets, useTimesheetStats } from '@/hooks/useTimesheets'
import { usePermissions } from '@/hooks/usePermissions'
import { TimesheetGuard } from '@/components/auth/PermissionGuard'
import { 
  TimesheetStatus, 
  TimesheetStatusLabels, 
  TimesheetStatusColors,
  calculateHours,
  isTimesheetEditable,
  canSubmitTimesheet
} from '@/types/timesheet.types'
import { 
  Clock, 
  Plus, 
  Calendar, 
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Send,
  BarChart3
} from 'lucide-react'

export default function TimesheetsPage() {
  const router = useRouter()
  const { timesheets, loading } = useMyTimesheets({ limit: 20 })
  const { stats, loading: statsLoading } = useTimesheetStats()
  const { formatDate, formatDateTime } = useDateTimeFormat()
  const { 
    canCreateTimesheet, 
    canEditTimesheet, 
    canSubmitTimesheet: hasSubmitPermission
  } = usePermissions()
  
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTimesheets = timesheets.filter(timesheet => {
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      timesheet.periodStart.includes(searchTerm) ||
      timesheet.periodEnd.includes(searchTerm)
    
    return matchesStatus && matchesSearch
  })

  const handleCreateTimesheet = () => {
    router.push('/app/timesheets/create')
  }

  const handleViewTimesheet = (id: string) => {
    router.push(`/app/timesheets/${id}`)
  }

  const formatPeriod = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const getStatusIcon = (status: TimesheetStatus) => {
    switch (status) {
      case TimesheetStatus.APPROVED:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case TimesheetStatus.REJECTED:
        return <XCircle className="h-4 w-4 text-red-500" />
      case TimesheetStatus.SUBMITTED:
      case TimesheetStatus.UNDER_REVIEW:
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Edit className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <AppShell title="Feuilles de temps">
      <TimesheetGuard action="view">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-6 w-6" />
                Mes feuilles de temps
              </h1>
              <p className="text-sm text-muted-foreground">
                Gérez vos feuilles de temps et suivez vos heures travaillées
              </p>
            </div>
            <TimesheetGuard action="create">
              <Button onClick={handleCreateTimesheet}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle feuille de temps
              </Button>
            </TimesheetGuard>
          </div>

        {/* Statistiques */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalTimesheets}</div>
                <div className="text-sm text-muted-foreground">Feuilles de temps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{calculateHours(stats.totalHours * 60)}h</div>
                <div className="text-sm text-muted-foreground">Heures totales</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{calculateHours(stats.totalBillableHours * 60)}h</div>
                <div className="text-sm text-muted-foreground">Heures facturables</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{Math.round(stats.billablePercentage)}%</div>
                <div className="text-sm text-muted-foreground">Taux facturable</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par période..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select 
                className="w-48"
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | 'all')}
              >
                <option value="all">Tous les statuts</option>
                {Object.values(TimesheetStatus).map(status => (
                  <option key={status} value={status}>
                    {TimesheetStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Liste des feuilles de temps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Feuilles de temps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : filteredTimesheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {timesheets.length === 0 
                  ? "Aucune feuille de temps trouvée"
                  : "Aucune feuille de temps ne correspond aux filtres"
                }
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTimesheets.map(timesheet => (
                  <div 
                    key={timesheet.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewTimesheet(timesheet.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(timesheet.status)}
                        <h3 className="font-medium">
                          {formatPeriod(timesheet.periodStart, timesheet.periodEnd)}
                        </h3>
                        <Badge className={TimesheetStatusColors[timesheet.status]}>
                          {TimesheetStatusLabels[timesheet.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{calculateHours(timesheet.totalHours * 60)}h totales</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{calculateHours(timesheet.totalBillableHours * 60)}h facturables</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>{timesheet.timeEntries.length} entrée(s)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Créée le {formatDate(timesheet.createdAt)}</span>
                        </div>
                      </div>

                      {timesheet.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Raison du rejet:</strong> {timesheet.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {isTimesheetEditable(timesheet.status) && canEditTimesheet() && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canSubmitTimesheet(timesheet) && hasSubmitPermission() && (
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Soumettre
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </TimesheetGuard>
    </AppShell>
  )
}