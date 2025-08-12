import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { AppointmentWithDetails } from '../../../services/appointmentService';
import { 
  getWeekDays,
  generateTimeSlots,
  getAppointmentsForTimeSlot,
  calculateAppointmentPosition,
  canMoveAppointment,
  formatCalendarDate
} from '../../../utils/calendarUtils';
import { 
  getAppointmentStatusColor,
  formatAppointmentTime
} from '../../../utils/appointmentUtils';

interface WeekViewProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onAppointmentSelect?: (appointment: AppointmentWithDetails) => void;
  onCreateAppointment?: (date?: Date, time?: string) => void;
  onEditAppointment?: (appointment: AppointmentWithDetails) => void;
  onAppointmentMove?: (appointment: AppointmentWithDetails, newDate: Date, newTime: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  date,
  appointments,
  onAppointmentSelect,
  onCreateAppointment,
  onEditAppointment,
  onAppointmentMove
}) => {
  const [draggedAppointment, setDraggedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: Date; time: string } | null>(null);

  const weekDays = getWeekDays(date, appointments);
  const timeSlots = generateTimeSlots(8, 18, 30);
  const weekDayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const handleAppointmentClick = (appointment: AppointmentWithDetails) => {
    if (onAppointmentSelect) {
      onAppointmentSelect(appointment);
    }
  };

  const handleSlotClick = (day: Date, timeSlot: string) => {
    if (onCreateAppointment) {
      onCreateAppointment(day, timeSlot);
    }
  };

  const handleDragStart = (e: React.DragEvent, appointment: AppointmentWithDetails) => {
    if (canMoveAppointment(appointment)) {
      setDraggedAppointment(appointment);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, day: Date, timeSlot: string) => {
    if (draggedAppointment) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverSlot({ date: day, time: timeSlot });
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, day: Date, timeSlot: string) => {
    e.preventDefault();
    if (draggedAppointment && onAppointmentMove) {
      onAppointmentMove(draggedAppointment, day, timeSlot);
    }
    setDraggedAppointment(null);
    setDragOverSlot(null);
  };

  const renderAppointment = (appointment: AppointmentWithDetails, day: Date) => {
    const position = calculateAppointmentPosition(appointment, 30, 60);
    const isDragging = draggedAppointment?.id === appointment.id;
    const canDrag = canMoveAppointment(appointment);

    return (
      <div
        key={appointment.id}
        className={`
          absolute left-1 right-1 rounded p-1 text-xs cursor-pointer z-10
          ${isDragging ? 'opacity-50' : ''}
          ${canDrag ? 'cursor-move' : 'cursor-pointer'}
        `}
        style={{
          top: position.top,
          height: Math.max(position.height, 30),
          backgroundColor: getAppointmentStatusColor(appointment.status),
          color: 'white'
        }}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, appointment)}
        onClick={() => handleAppointmentClick(appointment)}
        title={`${appointment.client.firstName} ${appointment.client.lastName} - ${appointment.service.name}`}
      >
        <div className="font-medium truncate">
          {appointment.client.firstName} {appointment.client.lastName}
        </div>
        <div className="truncate opacity-90">
          {appointment.service.name}
        </div>
        <div className="truncate opacity-75">
          {formatAppointmentTime(appointment.startTime, appointment.duration)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
          Heure
        </div>
        {weekDays.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={`
              p-3 text-center border-l border-gray-200 bg-gray-50
              ${day.isToday ? 'bg-blue-50' : ''}
            `}
          >
            <div className="text-sm font-medium text-gray-900">
              {weekDayNames[index]}
            </div>
            <div
              className={`
                text-lg font-semibold mt-1
                ${day.isToday ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-900'}
              `}
            >
              {day.date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots and appointments */}
      <div className="relative">
        {timeSlots.map((timeSlot) => (
          <div key={timeSlot.time} className="grid grid-cols-8 border-b border-gray-100">
            {/* Time label */}
            <div className="p-2 text-xs text-gray-500 text-right border-r border-gray-200 bg-gray-50">
              {timeSlot.time}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day) => {
              const isDropTarget = dragOverSlot?.date.toDateString() === day.date.toDateString() && 
                                 dragOverSlot?.time === timeSlot.time;
              
              return (
                <div
                  key={`${day.date.toISOString()}-${timeSlot.time}`}
                  className={`
                    relative h-15 border-l border-gray-200 cursor-pointer hover:bg-gray-50
                    ${isDropTarget ? 'bg-blue-100' : ''}
                  `}
                  onClick={() => handleSlotClick(day.date, timeSlot.time)}
                  onDragOver={(e) => handleDragOver(e, day.date, timeSlot.time)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.date, timeSlot.time)}
                >
                  {/* Create appointment button */}
                  {onCreateAppointment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 hover:opacity-100 absolute inset-0 h-full w-full rounded-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAppointment(day.date, timeSlot.time);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Appointments overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="grid grid-cols-8 h-full">
            <div></div> {/* Time column spacer */}
            {weekDays.map((day) => (
              <div key={day.date.toISOString()} className="relative border-l border-gray-200 pointer-events-auto">
                {day.appointments.map((appointment) => renderAppointment(appointment, day.date))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};