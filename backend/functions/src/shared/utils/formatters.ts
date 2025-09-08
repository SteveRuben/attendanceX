// shared/utils/formatters.ts

export class DateFormatters {
  static formatDate(date: Date, locale: string = 'fr-FR'): string {
    return new Intl.DateTimeFormat(locale).format(date);
  }

  static formatDateTime(date: Date, locale: string = 'fr-FR'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  static formatTime(date: Date, locale: string = 'fr-FR'): string {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  static formatRelative(date: Date, locale: string = 'fr-FR'): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'À l\'instant';
    }
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    }
    if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    }
    
    return this.formatDate(date, locale);
  }

  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h${remainingMinutes}`;
  }

  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  static isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  }

  static isThisWeek(date: Date): boolean {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    return date >= startOfWeek && date <= endOfWeek;
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  static getStartOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static getEndOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }
}

export class AttendanceFormatters {
  static formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'present': 'Présent',
      'absent': 'Absent',
      'excused': 'Excusé',
      'late': 'En retard',
      'left_early': 'Parti tôt',
      'partial': 'Présence partielle',
      'pending': 'En attente'
    };
    
    return statusMap[status] || status;
  }

  static formatMethod(method: string): string {
    const methodMap: Record<string, string> = {
      'qr_code': 'Code QR',
      'geolocation': 'Géolocalisation',
      'manual': 'Manuel',
      'automatic': 'Automatique',
      'biometric': 'Biométrique',
      'nfc': 'NFC',
      'bluetooth': 'Bluetooth'
    };
    
    return methodMap[method] || method;
  }

  static getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'present': 'text-green-600',
      'absent': 'text-red-600',
      'excused': 'text-blue-600',
      'late': 'text-orange-600',
      'left_early': 'text-yellow-600',
      'partial': 'text-purple-600',
      'pending': 'text-gray-600'
    };
    
    return colorMap[status] || 'text-gray-600';
  }

  static getStatusBadge(status: string): string {
    const badgeMap: Record<string, string> = {
      'present': 'bg-green-100 text-green-800',
      'absent': 'bg-red-100 text-red-800',
      'excused': 'bg-blue-100 text-blue-800',
      'late': 'bg-orange-100 text-orange-800',
      'left_early': 'bg-yellow-100 text-yellow-800',
      'partial': 'bg-purple-100 text-purple-800',
      'pending': 'bg-gray-100 text-gray-800'
    };
    
    return badgeMap[status] || 'bg-gray-100 text-gray-800';
  }
}