// shared/utils/formatting/attendance-formatters.ts

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