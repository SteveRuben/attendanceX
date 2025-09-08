/**
 * Vue calendrier des congés
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Alert,
  AlertDescription
} from '@/components/ui';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  Eye,
  Filter,
  Download
} from 'lucide-react';
import { leaveApi } from '@/services/api/leave.api';
import { LeaveRequest } from '../../shared';
import { formatDate } from '@/utils/dateUtils';

interface LeaveCalendarViewProps {
  organizationId?: string;
  selectedDepartment?: string;
  className?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaveRequests: LeaveRequest[];
  employeeCount: number;
}

interface CalendarWeek {
  days: CalendarDay[];
}

export const LeaveCalendarView: React.FC<LeaveCalendarViewProps> = ({
  organizationId,
  selectedDepartment = 'all',
  className = ''
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarWeek[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données du calendrier
  const loadCalendarData = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Étendre la plage pour inclure les jours des semaines partielles
      const calendarStart = new Date(startDate);
      calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
      
      const calendarEnd = new Date(endDate);
      calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

      const response = await leaveApi.getLeaveCalendar({
        organizationId,
        ...(selectedDepartment !== 'all' && { departmentId: selectedDepartment }),
        startDate: calendarStart.toISOString().split('T')[0],
        endDate: calendarEnd.toISOString().split('T')[0]
      });

      if (response.success) {
        const allRequests = response.data.flatMap(emp => emp.leaveRequests);
        setLeaveRequests(allRequests);
        generateCalendar(calendarStart, calendarEnd, allRequests);
      } else {
        setError('Erreur lors du chargement du calendrier');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Générer la structure du calendrier
  const generateCalendar = (startDate: Date, endDate: Date, requests: LeaveRequest[]) => {
    const weeks: CalendarWeek[] = [];
    const currentWeek: CalendarDay[] = [];
    const today = new Date();
    const currentMonth = currentDate.getMonth();

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayRequests = requests.filter(request => {
        if (statusFilter !== 'all' && request.status !== statusFilter) return false;
        
        const requestStart = new Date(request.startDate);
        const requestEnd = new Date(request.endDate);
        const currentDay = new Date(date);
        
        return currentDay >= requestStart && currentDay <= requestEnd;
      });

      const calendarDay: CalendarDay = {
        date: new Date(date),
        isCurrentMonth: date.getMonth() === currentMonth,
        isToday: date.toDateString() === today.toDateString(),
        leaveRequests: dayRequests,
        employeeCount: new Set(dayRequests.map(r => r.employeeId)).size
      };

      currentWeek.push(calendarDay);

      if (currentWeek.length === 7) {
        weeks.push({ days: [...currentWeek] });
        currentWeek.length = 0;
      }
    }

    if (currentWeek.length > 0) {
      weeks.push({ days: currentWeek });
    }

    setCalendarData(weeks);
  };

  // Navigation du calendrier
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Obtenir la couleur selon le nombre d'employés en congé
  const getDayIntensity = (employeeCount: number): string => {
    if (employeeCount === 0) return '';
    if (employeeCount <= 2) return 'bg-blue-100 border-blue-200';
    if (employeeCount <= 5) return 'bg-orange-100 border-orange-200';
    return 'bg-red-100 border-red-200';
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" className="text-xs">Approuvé</Badge>;
      case 'pending':
        return <Badge variant="warning" className="text-xs">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Refusé</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  // Obtenir les statistiques du mois
  const getMonthStats = () => {
    const monthRequests = leaveRequests.filter(request => {
      const requestDate = new Date(request.startDate);
      return requestDate.getMonth() === currentDate.getMonth() &&
             requestDate.getFullYear() === currentDate.getFullYear();
    });

    const totalDays = monthRequests.reduce((sum, request) => sum + (request.daysRequested || 0), 0);
    const uniqueEmployees = new Set(monthRequests.map(r => r.employeeId)).size;
    const approvedRequests = monthRequests.filter(r => r.status === 'approved').length;

    return {
      totalRequests: monthRequests.length,
      totalDays,
      uniqueEmployees,
      approvedRequests
    };
  };

  const monthStats = getMonthStats();

  // Charger les données au montage et quand les paramètres changent
  useEffect(() => {
    loadCalendarData();
  }, [organizationId, currentDate, selectedDepartment, statusFilter]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques du mois */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{monthStats.totalRequests}</div>
            <div className="text-sm text-muted-foreground">Demandes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{monthStats.approvedRequests}</div>
            <div className="text-sm text-muted-foreground">Approuvées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{monthStats.totalDays}</div>
            <div className="text-sm text-muted-foreground">Jours total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{monthStats.uniqueEmployees}</div>
            <div className="text-sm text-muted-foreground">Employés</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendrier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-medium min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Aujourd'hui
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="rejected">Refusées</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille du calendrier */}
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`
                      min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                      ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                      ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                      ${getDayIntensity(day.employeeCount)}
                      hover:bg-gray-50
                    `}
                    onClick={() => day.leaveRequests.length > 0 && setSelectedDay(day)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${day.isToday ? 'font-bold' : ''}`}>
                        {day.date.getDate()}
                      </span>
                      {day.employeeCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {day.employeeCount}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {day.leaveRequests.slice(0, 2).map((request, index) => (
                        <div
                          key={index}
                          className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                        >
                          {request.employee?.name}
                        </div>
                      ))}
                      {day.leaveRequests.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.leaveRequests.length - 2} autre{day.leaveRequests.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Légende */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span>1-2 employés</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
              <span>3-5 employés</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>6+ employés</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog des détails du jour */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Congés du {selectedDay && formatDate(selectedDay.date)}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.employeeCount} employé{selectedDay?.employeeCount > 1 ? 's' : ''} en congé
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedDay?.leaveRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{request.employee?.name}</div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    <Badge variant="outline">
                      {request.type === 'vacation' ? 'Congés payés' :
                       request.type === 'sick' ? 'Maladie' :
                       request.type === 'personal' ? 'Personnel' : request.type}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  <div>Du {formatDate(new Date(request.startDate))} au {formatDate(new Date(request.endDate))}</div>
                  <div>{request.daysRequested} jour{request.daysRequested > 1 ? 's' : ''}</div>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium mb-1">Motif:</div>
                  <div className="text-muted-foreground">
                    {request.reason.length > 100 
                      ? `${request.reason.substring(0, 100)}...` 
                      : request.reason
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};