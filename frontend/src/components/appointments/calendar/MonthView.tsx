import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import type { AppointmentWithDetails } from '../../../services/appointmentService';
import { 
  getCalendarWeeks,
  formatCalendarDate,
  CalendarDay
} from '../../../utils/calendarUtils';
import { 
  getAppointmentStatusColor,
  formatAppointmentTime
} from '../../../utils/appointmentUtils';

interface MonthViewProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onAppointmentSelect?: (appointment: AppointmentWithDetails) => void;
  onCreateAppointment?: (date?: Date, time?: string) => void;
  onEditAppointment?: (appointment: AppointmentWithDetails) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  date,
  appointments,
  onAppointmentSelect,
  onCreateAppointment,
  onEditAppointment
}) => {
  const weeks = getCalendarWeeks(date, appointments);
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handleDayClick = (day: CalendarDay) => {
    if (onCreateAppointment) {
      onCreateAppointment(day.date);
    }
  };

  const handleAppointmentClick = (appointment: AppointmentWithDetails, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAppointmentSelect) {
      onAppointmentSelect(appointment);
    }
  };

  return (
    <div className="bg-white">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) =>
          week.days.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`
                min-h-[120px] border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50
                ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                ${day.isToday ? 'bg-blue-50' : ''}
              `}
              onClick={() => handleDayClick(day)}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`
                    text-sm font-medium
                    ${day.isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                  `}
                >
                  {day.date.getDate()}
                </span>
                
                {onCreateAppointment && day.isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAppointment(day.date);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {day.appointments.slice(0, 3).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                    style={{
                      backgroundColor: getAppointmentStatusColor(appointment.status),
                      color: 'white'
                    }}
                    onClick={(e) => handleAppointmentClick(appointment, e)}
                    title={`${appointment.startTime} - ${appointment.client.firstName} ${appointment.client.lastName}`}
                  >
                    <div className="font-medium truncate">
                      {appointment.startTime} {appointment.client.firstName} {appointment.client.lastName}
                    </div>
                    <div className="truncate opacity-90">
                      {appointment.service.name}
                    </div>
                  </div>
                ))}
                
                {day.appointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{day.appointments.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};