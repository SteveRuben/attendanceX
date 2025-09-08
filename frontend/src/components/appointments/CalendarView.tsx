import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Filter,
  Plus,
  Grid3X3,
  List,
  Clock
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { appointmentService } from '../../services';
import type { AppointmentFilters, AppointmentStatus } from '../../shared';
import type { AppointmentWithDetails, Practitioner } from '../../services/appointmentService';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import {
  CalendarView as CalendarViewType,
  navigatePrevious,
  navigateNext,
  getMonthName,
  getWeekRange,
  formatCalendarDate
} from '../../utils/calendarUtils';

interface CalendarViewProps {
  organizationId: string;
  onAppointmentSelect?: (appointment: AppointmentWithDetails) => void;
  onCreateAppointment?: (date?: Date, time?: string) => void;
  onEditAppointment?: (appointment: AppointmentWithDetails) => void;
  showCreateButton?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  organizationId,
  onAppointmentSelect,
  onCreateAppointment,
  onEditAppointment,
  showCreateButton = true
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>('month');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [practitionerFilter, setPractitionerFilter] = useState<string>('all');
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);

  // Load appointments based on current view and date
  useEffect(() => {
    loadAppointments();
  }, [organizationId, currentDate, view, statusFilter, practitionerFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AppointmentFilters = {};

      // Set date range based on view
      let startDate: Date, endDate: Date;
      
      switch (view) {
        case 'month':
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          break;
        case 'week':
          const weekStart = new Date(currentDate);
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
          weekStart.setDate(diff);
          startDate = weekStart;
          endDate = new Date(weekStart);
          endDate.setDate(weekStart.getDate() + 6);
          break;
        case 'day':
          startDate = new Date(currentDate);
          endDate = new Date(currentDate);
          break;
      }

      filters.startDate = startDate;
      filters.endDate = endDate;

      // Apply status filter
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }

      // Apply practitioner filter
      if (practitionerFilter !== 'all') {
        filters.practitionerId = practitionerFilter;
      }

      const response = await appointmentService.getAppointments(organizationId, filters);
      setAppointments(response.appointments);
      
      // Extract unique practitioners
      const uniquePractitioners = new Map();
      response.appointments.forEach(apt => {
        if (!uniquePractitioners.has(apt.practitionerId)) {
          uniquePractitioners.set(apt.practitionerId, apt.practitioner);
        }
      });
      setPractitioners(Array.from(uniquePractitioners.values()));
      
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentDate(navigatePrevious(currentDate, view));
  };

  const handleNext = () => {
    setCurrentDate(navigateNext(currentDate, view));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewChange = (newView: CalendarViewType) => {
    setView(newView);
  };

  const handleAppointmentMove = async (
    appointment: AppointmentWithDetails,
    newDate: Date,
    newTime: string
  ) => {
    try {
      await appointmentService.updateAppointment(organizationId, appointment.id!, {
        date: newDate,
        startTime: newTime
      });
      
      // Reload appointments
      await loadAppointments();
    } catch (err: any) {
      setError(err.message || 'Failed to move appointment');
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'month':
        return getMonthName(currentDate);
      case 'week':
        return getWeekRange(currentDate);
      case 'day':
        return formatCalendarDate(currentDate, 'long');
      default:
        return '';
    }
  };

  const renderCalendarView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    switch (view) {
      case 'month':
        return (
          <MonthView
            date={currentDate}
            appointments={appointments}
            onAppointmentSelect={onAppointmentSelect}
            onCreateAppointment={onCreateAppointment}
            onEditAppointment={onEditAppointment}
          />
        );
      case 'week':
        return (
          <WeekView
            date={currentDate}
            appointments={appointments}
            onAppointmentSelect={onAppointmentSelect}
            onCreateAppointment={onCreateAppointment}
            onEditAppointment={onEditAppointment}
            onAppointmentMove={handleAppointmentMove}
          />
        );
      case 'day':
        return (
          <DayView
            date={currentDate}
            appointments={appointments}
            onAppointmentSelect={onAppointmentSelect}
            onCreateAppointment={onCreateAppointment}
            onEditAppointment={onEditAppointment}
            onAppointmentMove={handleAppointmentMove}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Calendrier</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {showCreateButton && onCreateAppointment && (
            <Button onClick={() => onCreateAppointment()} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouveau rendez-vous
            </Button>
          )}
        </div>
      </div>

      {/* View Controls and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {getViewTitle()}
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {/* View Selector */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('month')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Mois
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('week')}
              className="rounded-none border-x"
            >
              <List className="h-4 w-4 mr-1" />
              Semaine
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('day')}
              className="rounded-l-none"
            >
              <Clock className="h-4 w-4 mr-1" />
              Jour
            </Button>
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="scheduled">Programmé</SelectItem>
              <SelectItem value="confirmed">Confirmé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
              <SelectItem value="no-show">Absent</SelectItem>
            </SelectContent>
          </Select>

          {/* Practitioner Filter */}
          {practitioners.length > 0 && (
            <Select value={practitionerFilter} onValueChange={setPractitionerFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Praticien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les praticiens</SelectItem>
                {practitioners.map((practitioner) => (
                  <SelectItem key={practitioner.id} value={practitioner.id}>
                    {practitioner.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAppointments}
            className="mt-2"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* Calendar View */}
      <Card className="p-0 overflow-hidden">
        {renderCalendarView()}
      </Card>
    </div>
  );
};