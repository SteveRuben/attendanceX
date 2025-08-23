/**
 * Configuration pour la migration vers les services unifiés
 */

// Mapping des anciens services vers les nouveaux
export const SERVICE_MIGRATION_MAP = {
  // Attendance Services
  'attendanceService': 'unified/attendanceService',
  'presenceService': 'unified/attendanceService',
  
  // Analytics Services  
  'analyticsService': 'unified/analyticsService',
  'organizationAnalyticsService': 'unified/analyticsService',
  
  // QR Code Service
  'qrCodeService': 'unified/qrCodeService',
  
  // Report Service
  'reportService': 'unified/reportService'
} as const;

// Mapping des méthodes qui ont changé de nom
export const METHOD_MIGRATION_MAP = {
  // AttendanceService
  'getPresenceEntries': 'getAttendances',
  'getMyPresenceStatus': 'getCurrentAttendanceStatus',
  'getPresenceStats': 'getAttendanceStats',
  'getPresenceAlerts': 'getAttendanceAlerts',
  
  // AnalyticsService
  'getOrganizationStats': 'getOrganizationAnalytics',
  'getRecentActivity': 'getInsights',
  'getUsageMetrics': 'getOrganizationAnalytics',
  'getPerformanceMetrics': 'getRealtimeStats',
  
  // QRCodeService
  'processQRCodeCheckIn': 'processQRCodeCheckIn', // Même nom mais signature améliorée
  'downloadQRCodeImage': 'downloadQRCodeImage',   // Même nom mais options étendues
  
  // ReportService
  'generateAttendanceReport': 'generateAttendanceReport', // Centralisé
  'generateUserReport': 'generateUserReport',             // Centralisé
  'generateMonthlySummary': 'generateMonthlySummary'      // Centralisé
} as const;

// Endpoints qui ont changé
export const ENDPOINT_MIGRATION_MAP = {
  // Harmonisation singulier/pluriel
  '/attendances': '/api/attendance',
  '/presence': '/api/attendance',
  
  // Préfixe API unifié
  '/analytics': '/api/analytics',
  '/qr-codes': '/api/qr-codes',
  '/reports': '/api/reports'
} as const;

// Fonctionnalités dépréciées avec leurs remplacements
export const DEPRECATED_FEATURES = {
  // AttendanceService
  'clockIn': {
    replacement: 'checkIn',
    service: 'attendanceService',
    reason: 'Méthode renommée pour plus de clarté'
  },
  'clockOut': {
    replacement: 'checkOut', 
    service: 'attendanceService',
    reason: 'Méthode renommée pour plus de clarté'
  },
  
  // AnalyticsService
  'exportAnalytics': {
    replacement: 'reportService.generateReport',
    service: 'reportService',
    reason: 'Fonctionnalité centralisée dans reportService'
  },
  
  // Doublons supprimés
  'presenceService.getPresenceStats': {
    replacement: 'attendanceService.getAttendanceStats',
    service: 'attendanceService', 
    reason: 'Service dupliqué supprimé'
  },
  'organizationAnalyticsService.getOrganizationStats': {
    replacement: 'analyticsService.getOrganizationAnalytics',
    service: 'analyticsService',
    reason: 'Services fusionnés'
  }
} as const;

// Nouvelles fonctionnalités disponibles
export const NEW_FEATURES = {
  attendanceService: [
    'getCurrentAttendanceStatus',
    'getAttendanceAlerts', 
    'diagnoseAttendanceIssues',
    'canCheckIn'
  ],
  analyticsService: [
    'getInsights',
    'getRecommendations',
    'getBenchmarkData',
    'getPredictions',
    'getRealtimeStats'
  ],
  qrCodeService: [
    'getRealtimeScanAnalytics',
    'diagnoseQRCodeIssues',
    'generateShareableLink',
    'testQRCode',
    'updateValidationRules'
  ],
  reportService: [
    'previewReport',
    'scheduleReport',
    'getReportTemplates',
    'createReportTemplate',
    'getSystemHealth'
  ]
} as const;

// Configuration de migration par étapes
export const MIGRATION_PHASES = {
  phase1: {
    name: 'Migration des imports',
    description: 'Remplacer les imports par les services unifiés',
    services: ['attendanceService', 'analyticsService'],
    estimatedEffort: 'Low',
    breaking: false
  },
  phase2: {
    name: 'Migration des appels d\'API',
    description: 'Adapter les appels aux nouvelles signatures',
    services: ['qrCodeService', 'reportService'],
    estimatedEffort: 'Medium', 
    breaking: true
  },
  phase3: {
    name: 'Adoption des nouvelles fonctionnalités',
    description: 'Utiliser les nouvelles capacités des services',
    services: ['all'],
    estimatedEffort: 'High',
    breaking: false
  },
  phase4: {
    name: 'Suppression des services legacy',
    description: 'Nettoyer les anciens services',
    services: ['legacy'],
    estimatedEffort: 'Low',
    breaking: true
  }
} as const;

// Utilitaires de migration
export class MigrationHelper {
  /**
   * Vérifier si un service est déprécié
   */
  static isDeprecated(serviceName: string): boolean {
    return serviceName in SERVICE_MIGRATION_MAP;
  }

  /**
   * Obtenir le service de remplacement
   */
  static getReplacementService(serviceName: string): string | null {
    return SERVICE_MIGRATION_MAP[serviceName as keyof typeof SERVICE_MIGRATION_MAP] || null;
  }

  /**
   * Obtenir les nouvelles fonctionnalités d'un service
   */
  static getNewFeatures(serviceName: string): string[] {
    return NEW_FEATURES[serviceName as keyof typeof NEW_FEATURES] || [];
  }

  /**
   * Générer un rapport de migration
   */
  static generateMigrationReport(currentServices: string[]): {
    deprecated: string[];
    replacements: Record<string, string>;
    newFeatures: Record<string, string[]>;
    phases: typeof MIGRATION_PHASES;
  } {
    const deprecated = currentServices.filter(service => this.isDeprecated(service));
    const replacements: Record<string, string> = {};
    const newFeatures: Record<string, string[]> = {};

    deprecated.forEach(service => {
      const replacement = this.getReplacementService(service);
      if (replacement) {
        replacements[service] = replacement;
        newFeatures[service] = this.getNewFeatures(replacement.split('/')[1]);
      }
    });

    return {
      deprecated,
      replacements,
      newFeatures,
      phases: MIGRATION_PHASES
    };
  }
}

// Configuration des warnings de développement
export const DEV_WARNINGS = {
  showDeprecationWarnings: process.env.NODE_ENV === 'development',
  showMigrationTips: process.env.NODE_ENV === 'development',
  logServiceUsage: process.env.NODE_ENV === 'development'
} as const;