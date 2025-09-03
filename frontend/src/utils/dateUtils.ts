/**
 * Utility functions for date and time formatting
 */

/**
 * Format a date object to a readable time string
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a date object to a readable date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format a date object to a readable date and time string
 */
export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get the start of the day for a given date
 */
export const getStartOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get the end of the day for a given date
 */
export const getEndOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Calculate the difference between two dates in hours
 */
export const getHoursDifference = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Get a date string in YYYY-MM-DD format
 */
export const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse a date string and return a Date object
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};