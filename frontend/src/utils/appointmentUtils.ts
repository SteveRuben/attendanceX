import {
  Appointment,
  AppointmentStatus
} from '@attendance-x/shared';
import { AppointmentWithDetails } from '../services/appointmentService';

// Status colors and labels for frontend display
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#3B82F6', // blue
  confirmed: '#10B981', // green
  completed: '#059669', // emerald
  cancelled: '#EF4444', // red
  'no-show': '#F59E0B', // amber
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Programmé',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  'no-show': 'Absent',
};

// Time utilities
export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

export const WORKING_HOURS_DEFAULT = {
  start: '08:00',
  end: '18:00',
};

/**
 * Utility functions for appointment management
 */

/**
 * Format appointment date for display
 */
export const formatAppointmentDate = (date: Date | string): string => {
  const appointmentDate = typeof date === 'string' ? new Date(date) : date;
  return appointmentDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format appointment time for display
 */
export const formatAppointmentTime = (startTime: string, duration: number): string => {
  const endTime = calculateEndTime(startTime, duration);
  return `${startTime} - ${endTime}`;
};

/**
 * Calculate end time from start time and duration
 */
export const calculateEndTime = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

/**
 * Format duration for display
 */
export const formatDuration = (duration: number): string => {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes}min`;
  }
};

/**
 * Get status color for appointment
 */
export const getAppointmentStatusColor = (status: AppointmentStatus): string => {
  return APPOINTMENT_STATUS_COLORS[status] || '#6B7280';
};

/**
 * Get status label for appointment
 */
export const getAppointmentStatusLabel = (status: AppointmentStatus): string => {
  return APPOINTMENT_STATUS_LABELS[status] || status;
};

/**
 * Check if appointment is in the past
 */
export const isAppointmentPast = (appointment: Appointment): boolean => {
  const appointmentDateTime = new Date(appointment.date);
  const [hours, minutes] = appointment.startTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  return appointmentDateTime < new Date();
};

/**
 * Check if appointment is today
 */
export const isAppointmentToday = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.date);
  const today = new Date();
  
  return appointmentDate.toDateString() === today.toDateString();
};

/**
 * Check if appointment is upcoming (within next 24 hours)
 */
export const isAppointmentUpcoming = (appointment: Appointment): boolean => {
  const appointmentDateTime = new Date(appointment.date);
  const [hours, minutes] = appointment.startTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  return appointmentDateTime >= now && appointmentDateTime <= tomorrow;
};

/**
 * Check if appointment can be cancelled
 */
export const canCancelAppointment = (
  appointment: Appointment,
  cancellationDeadlineHours: number = 24
): boolean => {
  if (appointment.status === 'cancelled' || 
      appointment.status === 'completed' ||
      appointment.status === 'no-show') {
    return false;
  }

  const appointmentDateTime = new Date(appointment.date);
  const [hours, minutes] = appointment.startTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  
  const deadlineTime = new Date(appointmentDateTime.getTime() - (cancellationDeadlineHours * 60 * 60 * 1000));
  
  return new Date() < deadlineTime;
};

/**
 * Check if appointment can be modified
 */
export const canModifyAppointment = (appointment: Appointment): boolean => {
  return appointment.status === 'scheduled' || appointment.status === 'confirmed';
};

/**
 * Check if appointment can be confirmed
 */
export const canConfirmAppointment = (appointment: Appointment): boolean => {
  return appointment.status === 'scheduled';
};

/**
 * Check if appointment can be completed
 */
export const canCompleteAppointment = (appointment: Appointment): boolean => {
  return (appointment.status === 'confirmed' || appointment.status === 'scheduled') && 
         !isAppointmentPast(appointment);
};

/**
 * Check if appointment can be marked as no-show
 */
export const canMarkNoShow = (appointment: Appointment): boolean => {
  return (appointment.status === 'confirmed' || appointment.status === 'scheduled') && 
         isAppointmentPast(appointment);
};

/**
 * Get available actions for an appointment
 */
export const getAvailableActions = (appointment: Appointment): string[] => {
  const actions: string[] = [];
  
  if (canConfirmAppointment(appointment)) {
    actions.push('confirm');
  }
  
  if (canModifyAppointment(appointment)) {
    actions.push('modify');
  }
  
  if (canCompleteAppointment(appointment)) {
    actions.push('complete');
  }
  
  if (canMarkNoShow(appointment)) {
    actions.push('no-show');
  }
  
  if (canCancelAppointment(appointment)) {
    actions.push('cancel');
  }
  
  return actions;
};

/**
 * Sort appointments by date and time
 */
export const sortAppointmentsByDateTime = (appointments: Appointment[]): Appointment[] => {
  return [...appointments].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Same date, sort by time
    return a.startTime.localeCompare(b.startTime);
  });
};

/**
 * Group appointments by date
 */
export const groupAppointmentsByDate = (appointments: Appointment[]): Record<string, Appointment[]> => {
  return appointments.reduce((groups, appointment) => {
    const dateKey = new Date(appointment.date).toISOString().split('T')[0];
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);
};

/**
 * Filter appointments by status
 */
export const filterAppointmentsByStatus = (
  appointments: Appointment[],
  statuses: AppointmentStatus[]
): Appointment[] => {
  return appointments.filter(appointment => statuses.includes(appointment.status));
};

/**
 * Filter appointments by date range
 */
export const filterAppointmentsByDateRange = (
  appointments: Appointment[],
  startDate: Date,
  endDate: Date
): Appointment[] => {
  return appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate >= startDate && appointmentDate <= endDate;
  });
};

/**
 * Search appointments by text
 */
export const searchAppointments = (
  appointments: AppointmentWithDetails[],
  query: string
): AppointmentWithDetails[] => {
  if (!query.trim()) {
    return appointments;
  }
  
  const searchQuery = query.toLowerCase();
  
  return appointments.filter(appointment => {
    return (
      appointment.client.firstName.toLowerCase().includes(searchQuery) ||
      appointment.client.lastName.toLowerCase().includes(searchQuery) ||
      appointment.client.email.toLowerCase().includes(searchQuery) ||
      appointment.service.name.toLowerCase().includes(searchQuery) ||
      appointment.practitioner.displayName.toLowerCase().includes(searchQuery) ||
      appointment.notes?.toLowerCase().includes(searchQuery) ||
      false
    );
  });
};

/**
 * Generate time slots for a day
 */
export const generateTimeSlots = (
  startTime: string = WORKING_HOURS_DEFAULT.start,
  endTime: string = WORKING_HOURS_DEFAULT.end,
  interval: number = 30
): string[] => {
  const slots: string[] = [];
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
  }
  
  return slots;
};

/**
 * Check if a time slot is available
 */
export const isTimeSlotAvailable = (
  appointments: Appointment[],
  date: string,
  startTime: string,
  duration: number,
  excludeAppointmentId?: string
): boolean => {
  const slotStart = startTime;
  const slotEnd = calculateEndTime(startTime, duration);
  
  return !appointments.some(appointment => {
    if (appointment.id === excludeAppointmentId) {
      return false;
    }
    
    if (new Date(appointment.date).toISOString().split('T')[0] !== date) {
      return false;
    }
    
    if (appointment.status === 'cancelled') {
      return false;
    }
    
    const appointmentEnd = calculateEndTime(appointment.startTime, appointment.duration);
    
    // Check for overlap
    return (slotStart < appointmentEnd && slotEnd > appointment.startTime);
  });
};

/**
 * Calculate appointment statistics
 */
export const calculateAppointmentStats = (appointments: Appointment[]) => {
  const total = appointments.length;
  
  if (total === 0) {
    return {
      total: 0,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      attendanceRate: 0,
      cancellationRate: 0,
      noShowRate: 0
    };
  }
  
  const statusCounts = appointments.reduce((counts, appointment) => {
    counts[appointment.status] = (counts[appointment.status] || 0) + 1;
    return counts;
  }, {} as Record<AppointmentStatus, number>);
  
  const completed = statusCounts.completed || 0;
  const cancelled = statusCounts.cancelled || 0;
  const noShow = statusCounts['no-show'] || 0;
  
  return {
    total,
    scheduled: statusCounts.scheduled || 0,
    confirmed: statusCounts.confirmed || 0,
    completed,
    cancelled,
    noShow,
    attendanceRate: (completed / total) * 100,
    cancellationRate: (cancelled / total) * 100,
    noShowRate: (noShow / total) * 100
  };
};

/**
 * Validate appointment data
 */
export const validateAppointmentData = (data: {
  clientId?: string;
  practitionerId?: string;
  serviceId?: string;
  date?: string;
  startTime?: string;
  notes?: string;
}): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  if (!data.clientId) {
    errors.clientId = 'Client is required';
  }
  
  if (!data.practitionerId) {
    errors.practitionerId = 'Practitioner is required';
  }
  
  if (!data.serviceId) {
    errors.serviceId = 'Service is required';
  }
  
  if (!data.date) {
    errors.date = 'Date is required';
  } else {
    const appointmentDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      errors.date = 'Date cannot be in the past';
    }
  }
  
  if (!data.startTime) {
    errors.startTime = 'Start time is required';
  } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.startTime)) {
    errors.startTime = 'Invalid time format (HH:MM)';
  }
  
  if (data.notes && data.notes.length > 1000) {
    errors.notes = 'Notes cannot exceed 1000 characters';
  }
  
  return errors;
};

/**
 * Format appointment for calendar display
 */
export const formatAppointmentForCalendar = (appointment: AppointmentWithDetails) => {
  const startDateTime = new Date(appointment.date);
  const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
  startDateTime.setHours(startHour, startMinute, 0, 0);
  
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);
  
  return {
    id: appointment.id!,
    title: `${appointment.client.firstName} ${appointment.client.lastName} - ${appointment.service.name}`,
    start: startDateTime,
    end: endDateTime,
    color: getAppointmentStatusColor(appointment.status),
    appointment
  };
};