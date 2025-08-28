import React, { useState } from 'react';
import { Plus, Clock, User } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import type { AppointmentWithDetails } from '../../../services/appointmentService';
import { 
  generateTimeSlots,
  calculateAppointmentPosition,
  canMoveAppointment,
  formatCalendarDate
} from '../../../utils/calendarUtils';
import { 
  getAppointmentStatusColor,
  formatAppointmentTime,
  getAppointmentStatusLabel
} from '../../../utils/appointmentUtils';

interface DayViewProps {
  date: Date;
  appointments: AppointmentWithDetails[];
  onAppointmentSelect?: (appointment: AppointmentWithDetails) => void;
  onCreateAppointment?: (date?: Date, time?: string) => void;
  onEditAppointment?: (appointment: AppointmentWithDetails) => void;
  onAppointmentMove?: (appointment: AppointmentWithDetails, newDate: Date, newTime: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  appointments,
  onAppointmentSelect,
  onCreateAppointment,
  onEditAppointment,
  onAppointmentMove
}) => {
  const [draggedAppointment, setDraggedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);

  const timeSlots = generateTimeSlots(8, 18, 30);
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === date.toDateString();
  });

  const handleAppointmentClick = (appointment: AppointmentWithDetails) => {
    if (onAppointmentSelect) {
      onAppointmentSelect(appointment);
    }
  };

  const handleSlotClick = (timeSlot: string) => {
    if (onCreateAppointment) {
      onCreateAppointment(date, timeSlot);
    }
  };

  const handleDragStart = (e: React.DragEvent, appointment: AppointmentWithDetails) => {
    if (canMoveAppointment(appointment)) {
      setDraggedAppointment(appointment);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, timeSlot: string) => {
    if (draggedAppointment) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverTime(timeSlot);
    }
  };

  const handleDragLeave = () => {
    setDragOverTime(null);
  };

  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    if (draggedAppointment && onAppointmentMove) {
      onAppointmentMove(draggedAppointment, date, timeSlot);
    }
    setDraggedAppointment(null);
    setDragOverTime(null);
  };

  const renderAppointment = (appointment: AppointmentWithDetails) => {
    const position = calculateAppointmentPosition(appointment, 30, 60);
    const isDragging = draggedAppointment?.id === appointment.id;
    const canDrag = canMoveAppointment(appointment);

    return (
      <div
        key={appointment.id}
        className={`
          absolute left-2 right-2 rounded-lg p-3 cursor-pointer z-10 shadow-sm border-l-4
          ${isDragging ? 'opacity-50' : ''}
          ${canDrag ? 'cursor-move' : 'cursor-pointer'}
        `}
        style={{
          top: position.top,
          height: Math.max(position.height, 60),
          backgroundColor: 'white',
          borderLeftColor: getAppointmentStatusColor(appointment.status)
        }}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, appointment)}
        onClick={() => handleAppointmentClick(appointment)}
      >
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-900">
                {formatAppointmentTime(appointment.startTime, appointment.duration)}
              </span>
              <span 
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: getAppointmentStatusColor(appointment.status) }}
              >
                {getAppointmentStatusLabel(appointment.status)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {appointment.client.firstName} {appointment.client.lastName}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 truncate">
              {appointment.service.name}
            </div>
            
            <div className="text-xs text-gray-500 truncate">
              {appointment.practitioner.displayName}
            </div>
            
            {appointment.notes && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {appointment.notes}
              </div>
            )}
          </div>
          
          {onEditAppointment && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEditAppointment(appointment);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatCalendarDate(date, 'long')}
        </h3>
        <p className="text-sm text-gray-600">
          {dayAppointments.length} rendez-vous programmé{dayAppointments.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Time slots and appointments */}
      <div className="relative">
        {timeSlots.map((timeSlot) => {
          const isDropTarget = dragOverTime === timeSlot.time;
          
          return (
            <div
              key={timeSlot.time}
              className={`
                flex border-b border-gray-100 min-h-[60px] hover:bg-gray-50
                ${isDropTarget ? 'bg-blue-100' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, timeSlot.time)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, timeSlot.time)}
            >
              {/* Time label */}
              <div className="w-20 p-3 text-xs text-gray-500 text-right border-r border-gray-200 bg-gray-50">
                {timeSlot.time}
              </div>
              
              {/* Appointment area */}
              <div 
                className="flex-1 relative cursor-pointer"
                onClick={() => handleSlotClick(timeSlot.time)}
              >
                {/* Create appointment button */}
                {onCreateAppointment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 hover:opacity-100 absolute inset-0 h-full w-full rounded-none justify-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAppointment(date, timeSlot.time);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un rendez-vous
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Appointments overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="flex h-full">
            <div className="w-20"></div> {/* Time column spacer */}
            <div className="flex-1 relative pointer-events-auto">
              {dayAppointments.map((appointment) => renderAppointment(appointment))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {dayAppointments.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun rendez-vous</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun rendez-vous programmé pour cette journée.
          </p>
          {onCreateAppointment && (
            <Button onClick={() => onCreateAppointment(date)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer un rendez-vous
            </Button>
          )}
        </div>
      )}
    </div>
  );
};