import type { AppointmentWithDetails } from '../services/appointmentService';

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentWithDetails[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  appointments: AppointmentWithDetails[];
}

/**
 * Get the start of the week (Monday)
 */
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

/**
 * Get the end of the week (Sunday)
 */
export const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
};

/**
 * Get the start of the month
 */
export const getMonthStart = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Get the end of the month
 */
export const getMonthEnd = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Get calendar weeks for a month view
 */
export const getCalendarWeeks = (
  date: Date, 
  appointments: AppointmentWithDetails[]
): CalendarWeek[] => {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  const calendarStart = getWeekStart(monthStart);
  const calendarEnd = getWeekEnd(monthEnd);

  const weeks: CalendarWeek[] = [];
  const current = new Date(calendarStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (current <= calendarEnd) {
    const week: CalendarWeek = { days: [] };
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(current);
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === dayDate.toDateString();
      });

      week.days.push({
        date: new Date(dayDate),
        isCurrentMonth: dayDate.getMonth() === date.getMonth(),
        isToday: dayDate.toDateString() === today.toDateString(),
        appointments: dayAppointments
      });

      current.setDate(current.getDate() + 1);
    }
    
    weeks.push(week);
  }

  return weeks;
};

/**
 * Get days for a week view
 */
export const getWeekDays = (
  date: Date, 
  appointments: AppointmentWithDetails[]
): CalendarDay[] => {
  const weekStart = getWeekStart(date);
  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === dayDate.toDateString();
    });

    days.push({
      date: new Date(dayDate),
      isCurrentMonth: true,
      isToday: dayDate.toDateString() === today.toDateString(),
      appointments: dayAppointments
    });
  }

  return days;
};

/**
 * Generate time slots for day/week view
 */
export const generateTimeSlots = (
  startHour: number = 8,
  endHour: number = 18,
  interval: number = 30
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      if (hour === endHour && minute > 0) break;
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      slots.push({
        time: timeString,
        hour,
        minute,
        appointments: []
      });
    }
  }
  
  return slots;
};

/**
 * Get appointments for a specific time slot
 */
export const getAppointmentsForTimeSlot = (
  appointments: AppointmentWithDetails[],
  date: Date,
  timeSlot: TimeSlot
): AppointmentWithDetails[] => {
  return appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    if (aptDate.toDateString() !== date.toDateString()) return false;
    
    const [aptHour, aptMinute] = apt.startTime.split(':').map(Number);
    const aptStartMinutes = aptHour * 60 + aptMinute;
    const slotStartMinutes = timeSlot.hour * 60 + timeSlot.minute;
    const slotEndMinutes = slotStartMinutes + 30; // Assuming 30-minute slots
    
    return aptStartMinutes < slotEndMinutes && (aptStartMinutes + apt.duration) > slotStartMinutes;
  });
};

/**
 * Format date for display
 */
export const formatCalendarDate = (date: Date, format: 'short' | 'long' = 'short'): string => {
  if (format === 'long') {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  });
};

/**
 * Format time for display
 */
export const formatTime = (time: string): string => {
  return time;
};

/**
 * Get month name
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

/**
 * Get week range string
 */
export const getWeekRange = (date: Date): string => {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);
  
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  } else {
    return `${formatCalendarDate(weekStart)} - ${formatCalendarDate(weekEnd)}`;
  }
};

/**
 * Navigate to previous period
 */
export const navigatePrevious = (date: Date, view: CalendarView): Date => {
  const newDate = new Date(date);
  
  switch (view) {
    case 'month':
      newDate.setMonth(newDate.getMonth() - 1);
      break;
    case 'week':
      newDate.setDate(newDate.getDate() - 7);
      break;
    case 'day':
      newDate.setDate(newDate.getDate() - 1);
      break;
  }
  
  return newDate;
};

/**
 * Navigate to next period
 */
export const navigateNext = (date: Date, view: CalendarView): Date => {
  const newDate = new Date(date);
  
  switch (view) {
    case 'month':
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case 'week':
      newDate.setDate(newDate.getDate() + 7);
      break;
    case 'day':
      newDate.setDate(newDate.getDate() + 1);
      break;
  }
  
  return newDate;
};

/**
 * Check if appointment can be moved (for drag and drop)
 */
export const canMoveAppointment = (appointment: AppointmentWithDetails): boolean => {
  return appointment.status === 'scheduled' || appointment.status === 'confirmed';
};

/**
 * Calculate appointment position and height for calendar display
 */
export const calculateAppointmentPosition = (
  appointment: AppointmentWithDetails,
  slotHeight: number = 60,
  hourHeight: number = 60
): { top: number; height: number } => {
  const [hour, minute] = appointment.startTime.split(':').map(Number);
  const startMinutes = hour * 60 + minute;
  const baseHour = 8; // Assuming calendar starts at 8 AM
  const baseMinutes = baseHour * 60;
  
  const top = ((startMinutes - baseMinutes) / 60) * hourHeight;
  const height = (appointment.duration / 60) * hourHeight;
  
  return { top, height };
};