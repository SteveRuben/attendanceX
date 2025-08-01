import {
  ReportConfiguration,
  ReportFilter,
  ReportFormat,
  ReportType,
} from "@attendance-x/shared";

/**
 * Configuration avancée des types de rapports
 */
export interface ReportTypeConfig {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  availableFormats: ReportFormat[];
  defaultFormat: ReportFormat;
  permissions: string[];
  settings: {
    enableFiltering?: boolean;
    enableSorting?: boolean;
    enableGrouping?: boolean;
    includeCharts?: boolean;
    includeRawData?: boolean;
    includeMetrics?: boolean;
    includeTrends?: boolean;
    includeComparisons?: boolean;
    includeRecommendations?: boolean;
    maxTimeRangeDays?: number;
    maxRecords?: number;
    autoGenerate?: boolean;
    estimatedGenerationTime?: number; // en secondes
  };
  defaultFilters?: Partial<ReportFilter>;
  defaultConfiguration?: Partial<ReportConfiguration>;
  variables: string[];
  dependencies?: string[]; // Services ou données requis
}

/**
 * Configuration des formats de rapport
 */
export interface ReportFormatConfig {
  id: string;
  name: string;
  contentType: string;
  extension: string;
  maxFileSize: number; // en bytes
  settings: {
    // PDF
    pageSize?: "A4" | "A3" | "Letter" | "Legal";
    orientation?: "portrait" | "landscape";
    includeHeader?: boolean;
    includeFooter?: boolean;
    includePagination?: boolean;
    enableEncryption?: boolean;
    compressionLevel?: "low" | "medium" | "high";

    // Excel
    includeFormatting?: boolean;
    includeFormulas?: boolean;
    includePivotTables?: boolean;
    includeCharts?: boolean;
    protectSheets?: boolean;
    splitSheetsBySection?: boolean;

    // CSV
    delimiter?: string;
    includeHeaders?: boolean;
    charset?: string;
    quoteAll?: boolean;
    dateFormat?: string;
    timeFormat?: string;

    // JSON
    pretty?: boolean;
    indentation?: number;
    includeMetadata?: boolean;
    includeSchema?: boolean;
    flattenNested?: boolean;

    // HTML
    includeCSS?: boolean;
    includeJS?: boolean;
    responsive?: boolean;
    printOptimized?: boolean;
  };
}

/**
 * Catégories de rapports
 */
export enum ReportCategory {
  ATTENDANCE = "attendance",
  ANALYTICS = "analytics",
  COMPLIANCE = "compliance",
  FINANCIAL = "financial",
  OPERATIONAL = "operational",
  STRATEGIC = "strategic",
  CUSTOM = "custom"
}

/**
 * Configuration complète des types de rapports
 */
export const reportTypes: Record<ReportType, ReportTypeConfig> = {
  [ReportType.ATTENDANCE_SUMMARY]: {
    id: ReportType.ATTENDANCE_SUMMARY,
    name: "Résumé des présences",
    description: "Synthèse globale des présences avec statistiques clés et tendances",
    category: ReportCategory.ATTENDANCE,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_advanced_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      maxTimeRangeDays: 365,
      maxRecords: 10000,
      estimatedGenerationTime: 30,
    },
    defaultFilters: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
      endDate: new Date(),
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeSummary: true,
      includeMetrics: true,
      groupBy: ["department", "eventType"],
      sortBy: "attendanceRate",
      sortOrder: "desc",
      dateGrouping: "week",
    },
    variables: ["period", "totalEvents", "totalParticipants", "avgAttendanceRate", "topDepartment"],
    dependencies: ["attendance.service", "event.service", "user.service"],
  },

  [ReportType.USER_ATTENDANCE]: {
    id: ReportType.USER_ATTENDANCE,
    name: "Présences par utilisateur",
    description: "Historique détaillé des présences par utilisateur avec métriques personnalisées",
    category: ReportCategory.ATTENDANCE,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_user_details"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      maxTimeRangeDays: 365,
      maxRecords: 5000,
      estimatedGenerationTime: 15,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["month"],
      sortBy: "attendanceRate",
      sortOrder: "desc",
      dateGrouping: "month",
    },
    variables: ["userName", "period", "totalEvents", "attendanceRate", "punctualityRate", "ranking"],
    dependencies: ["attendance.service", "user.service", "event.service"],
  },

  [ReportType.EVENT_ANALYTICS]: {
    id: ReportType.EVENT_ANALYTICS,
    name: "Analytique d'événements",
    description: "Analyse complète des événements avec métriques de performance et insights",
    category: ReportCategory.ANALYTICS,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_event_analytics"],
    settings: {
      enableFiltering: true,
      enableGrouping: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 365,
      estimatedGenerationTime: 45,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["eventType", "department"],
      sortBy: "attendanceRate",
      sortOrder: "desc",
      dateGrouping: "month",
    },
    variables: ["period", "totalEvents", "avgAttendanceRate", "mostPopularEvent", "recommendations"],
    dependencies: ["event.service", "attendance.service", "ml.service"],
  },

  [ReportType.DEPARTMENT_STATS]: {
    id: ReportType.DEPARTMENT_STATS,
    name: "Statistiques par département",
    description: "Analyse comparative des performances par département avec benchmarks",
    category: ReportCategory.ANALYTICS,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.JSON],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_department_stats"],
    settings: {
      enableFiltering: true,
      enableGrouping: true,
      includeCharts: true,
      includeMetrics: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 365,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["department"],
      sortBy: "attendanceRate",
      sortOrder: "desc",
      dateGrouping: "quarter",
    },
    variables: ["period", "totalDepartments", "topDepartment", "avgAttendanceRate", "improvements"],
    dependencies: ["user.service", "attendance.service", "event.service", "ml.service"],
  },

  [ReportType.ABSENCE_REPORT]: {
    id: ReportType.ABSENCE_REPORT,
    name: "Rapport d'absences",
    description: "Analyse détaillée des absences avec patterns et alertes",
    category: ReportCategory.COMPLIANCE,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_absence_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      includeRecommendations: true,
      maxTimeRangeDays: 180,
      estimatedGenerationTime: 25,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["reason", "department"],
      sortBy: "absenceCount",
      sortOrder: "desc",
      dateGrouping: "week",
    },
    variables: ["period", "totalAbsences", "absenceRate", "frequentAbsentees", "patterns"],
    dependencies: ["attendance.service", "user.service", "ml.service"],
  },

  [ReportType.PUNCTUALITY_REPORT]: {
    id: ReportType.PUNCTUALITY_REPORT,
    name: "Rapport de ponctualité",
    description: "Analyse de la ponctualité avec métriques détaillées et tendances",
    category: ReportCategory.OPERATIONAL,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      maxTimeRangeDays: 90,
      estimatedGenerationTime: 20,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["timeOfDay", "dayOfWeek"],
      sortBy: "punctualityRate",
      sortOrder: "asc",
      dateGrouping: "week",
    },
    variables: ["period", "avgDelay", "punctualityRate", "patterns", "improvements"],
    dependencies: ["attendance.service", "event.service"],
  },

  [ReportType.ENGAGEMENT_REPORT]: {
    id: ReportType.ENGAGEMENT_REPORT,
    name: "Rapport d'engagement",
    description: "Mesure de l'engagement des participants avec insights comportementaux",
    category: ReportCategory.STRATEGIC,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.JSON],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_ml_insights"],
    settings: {
      enableFiltering: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      includeRecommendations: true,
      maxTimeRangeDays: 180,
      estimatedGenerationTime: 40,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["eventType", "participant"],
      sortBy: "engagementScore",
      sortOrder: "desc",
      dateGrouping: "month",
    },
    variables: ["period", "avgEngagement", "topParticipants", "engagementTrends", "actionItems"],
    dependencies: ["attendance.service", "event.service", "ml.service"],
  },

  [ReportType.COMPLIANCE_REPORT]: {
    id: ReportType.COMPLIANCE_REPORT,
    name: "Rapport de conformité",
    description: "Analyse de conformité aux politiques et réglementations",
    category: ReportCategory.COMPLIANCE,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_compliance_reports"],
    settings: {
      enableFiltering: true,
      includeCharts: true,
      includeMetrics: true,
      includeRecommendations: true,
      autoGenerate: true,
      maxTimeRangeDays: 365,
      estimatedGenerationTime: 50,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["policy", "department"],
      sortBy: "complianceRate",
      sortOrder: "asc",
      dateGrouping: "quarter",
    },
    variables: ["period", "complianceRate", "violations", "riskAreas", "recommendations"],
    dependencies: ["attendance.service", "user.service", "event.service"],
  },

  [ReportType.COST_ANALYSIS]: {
    id: ReportType.COST_ANALYSIS,
    name: "Analyse des coûts",
    description: "Analyse financière des événements et ressources",
    category: ReportCategory.FINANCIAL,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.JSON],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "view_financial_reports"],
    settings: {
      enableFiltering: true,
      enableGrouping: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      maxTimeRangeDays: 365,
      estimatedGenerationTime: 35,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["eventType", "department"],
      sortBy: "totalCost",
      sortOrder: "desc",
      dateGrouping: "month",
    },
    variables: ["period", "totalCost", "costPerParticipant", "costTrends", "savings"],
    dependencies: ["event.service", "attendance.service", "notification.service"],
  },

  [ReportType.PERFORMANCE_METRICS]: {
    id: ReportType.PERFORMANCE_METRICS,
    name: "Métriques de performance",
    description: "KPIs et métriques de performance clés avec benchmarks",
    category: ReportCategory.STRATEGIC,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.PDF,
    permissions: ["view_reports", "view_advanced_reports"],
    settings: {
      enableFiltering: true,
      enableGrouping: true,
      includeCharts: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      autoGenerate: true,
      maxTimeRangeDays: 365,
      estimatedGenerationTime: 45,
    },
    defaultConfiguration: {
      includeCharts: true,
      includeDetails: true,
      includeMetrics: true,
      groupBy: ["kpi", "period"],
      sortBy: "performance",
      sortOrder: "desc",
      dateGrouping: "month",
    },
    variables: ["period", "kpis", "benchmarks", "trends", "achievements", "targets"],
    dependencies: ["attendance.service", "event.service", "user.service", "ml.service"],
  },

  [ReportType.CUSTOM]: {
    id: ReportType.CUSTOM,
    name: "Rapport personnalisé",
    description: "Rapport entièrement personnalisable avec métriques et filtres configurables",
    category: ReportCategory.CUSTOM,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "create_custom_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 730, // 2 ans
      maxRecords: 50000,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: false,
      includeDetails: true,
      includeMetrics: false,
      groupBy: [],
      sortBy: "date",
      sortOrder: "desc",
      dateGrouping: "day",
    },
    variables: ["customFields", "period", "filters", "metrics", "data"],
    dependencies: ["attendance.service", "event.service", "user.service", "notification.service"],
  },
  [ReportType.USER_PERFORMANCE]: {
    id: ReportType.USER_PERFORMANCE,
    name: "Rapport personnalisé",
    description: "Rapport entièrement personnalisable avec métriques et filtres configurables",
    category: ReportCategory.CUSTOM,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "create_custom_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 730, // 2 ans
      maxRecords: 50000,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: false,
      includeDetails: true,
      includeMetrics: false,
      groupBy: [],
      sortBy: "date",
      sortOrder: "desc",
      dateGrouping: "day",
    },
    variables: ["customFields", "period", "filters", "metrics", "data"],
    dependencies: ["attendance.service", "event.service", "user.service", "notification.service"],
  },
  [ReportType.EVENT_DETAIL]: {
    id: ReportType.EVENT_DETAIL,
    name: "Rapport personnalisé",
    description: "Rapport entièrement personnalisable avec métriques et filtres configurables",
    category: ReportCategory.CUSTOM,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "create_custom_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 730, // 2 ans
      maxRecords: 50000,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: false,
      includeDetails: true,
      includeMetrics: false,
      groupBy: [],
      sortBy: "date",
      sortOrder: "desc",
      dateGrouping: "day",
    },
    variables: ["customFields", "period", "filters", "metrics", "data"],
    dependencies: ["attendance.service", "event.service", "user.service", "notification.service"],
  },
  [ReportType.DEPARTMENT_ANALYTICS]: {
    id: ReportType.DEPARTMENT_ANALYTICS,
    name: "Rapport personnalisé",
    description: "Rapport entièrement personnalisable avec métriques et filtres configurables",
    category: ReportCategory.CUSTOM,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "create_custom_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 730, // 2 ans
      maxRecords: 50000,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: false,
      includeDetails: true,
      includeMetrics: false,
      groupBy: [],
      sortBy: "date",
      sortOrder: "desc",
      dateGrouping: "day",
    },
    variables: ["customFields", "period", "filters", "metrics", "data"],
    dependencies: ["attendance.service", "event.service", "user.service", "notification.service"],
  },
  [ReportType.MONTHLY_SUMMARY]: {
    id: ReportType.MONTHLY_SUMMARY,
    name: "Rapport personnalisé",
    description: "Rapport entièrement personnalisable avec métriques et filtres configurables",
    category: ReportCategory.CUSTOM,
    availableFormats: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV, ReportFormat.JSON, ReportFormat.HTML],
    defaultFormat: ReportFormat.EXCEL,
    permissions: ["view_reports", "create_custom_reports"],
    settings: {
      enableFiltering: true,
      enableSorting: true,
      enableGrouping: true,
      includeCharts: true,
      includeRawData: true,
      includeMetrics: true,
      includeTrends: true,
      includeComparisons: true,
      includeRecommendations: true,
      maxTimeRangeDays: 730, // 2 ans
      maxRecords: 50000,
      estimatedGenerationTime: 60,
    },
    defaultConfiguration: {
      includeCharts: false,
      includeDetails: true,
      includeMetrics: false,
      groupBy: [],
      sortBy: "date",
      sortOrder: "desc",
      dateGrouping: "day",
    },
    variables: ["customFields", "period", "filters", "metrics", "data"],
    dependencies: ["attendance.service", "event.service", "user.service", "notification.service"],
  },
};

/**
 * Configuration des formats de rapport
 */
export const reportFormats: Record<ReportFormat, ReportFormatConfig> = {
  [ReportFormat.PDF]: {
    id: ReportFormat.PDF,
    name: "PDF",
    contentType: "application/pdf",
    extension: ".pdf",
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    settings: {
      pageSize: "A4",
      orientation: "portrait",
      includeHeader: true,
      includeFooter: true,
      includePagination: true,
      enableEncryption: false,
      compressionLevel: "medium",
    },
  },

  [ReportFormat.EXCEL]: {
    id: ReportFormat.EXCEL,
    name: "Excel",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    settings: {
      includeFormatting: true,
      includeFormulas: true,
      includePivotTables: true,
      includeCharts: true,
      protectSheets: false,
      splitSheetsBySection: true,
    },
  },

  [ReportFormat.CSV]: {
    id: ReportFormat.CSV,
    name: "CSV",
    contentType: "text/csv",
    extension: ".csv",
    maxFileSize: 200 * 1024 * 1024, // 200 MB
    settings: {
      delimiter: ",",
      includeHeaders: true,
      charset: "UTF-8",
      quoteAll: false,
      dateFormat: "YYYY-MM-DD",
      timeFormat: "HH:mm:ss",
    },
  },

  [ReportFormat.JSON]: {
    id: ReportFormat.JSON,
    name: "JSON",
    contentType: "application/json",
    extension: ".json",
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    settings: {
      pretty: true,
      indentation: 2,
      includeMetadata: true,
      includeSchema: false,
      flattenNested: false,
    },
  },

  [ReportFormat.HTML]: {
    id: ReportFormat.HTML,
    name: "HTML",
    contentType: "text/html",
    extension: ".html",
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    settings: {
      includeCSS: true,
      includeJS: false,
      responsive: true,
      printOptimized: true,
    },
  },
};

/**
 * Configuration générale des rapports
 */
export const reportConfig = {
  // Paramètres généraux
  defaultReportType: ReportType.ATTENDANCE_SUMMARY,
  defaultFormat: ReportFormat.PDF,
  maxReportSize: 500 * 1024 * 1024, // 500 MB
  maxConcurrentReports: parseInt(process.env.MAX_CONCURRENT_REPORTS || "5", 10),

  // Génération
  generation: {
    timeoutMinutes: parseInt(process.env.REPORT_GENERATION_TIMEOUT_MINUTES || "30", 10),
    retryAttempts: parseInt(process.env.REPORT_RETRY_ATTEMPTS || "3", 10),
    retryDelayMs: parseInt(process.env.REPORT_RETRY_DELAY_MS || "5000", 10),
    enableParallelProcessing: process.env.REPORT_PARALLEL_PROCESSING !== "false",
    maxMemoryUsage: parseInt(process.env.REPORT_MAX_MEMORY_MB || "512", 10) * 1024 * 1024,
  },

  // Stockage
  storage: {
    enabled: process.env.REPORT_STORAGE_ENABLED !== "false",
    path: process.env.REPORT_STORAGE_PATH || "reports",
    provider: process.env.REPORT_STORAGE_PROVIDER || "firebase", // firebase, aws, azure, local
    lifetimeDays: parseInt(process.env.REPORT_LIFETIME_DAYS || "30", 10),
    compressionEnabled: process.env.REPORT_COMPRESSION_ENABLED !== "false",
    encryptionEnabled: process.env.REPORT_ENCRYPTION_ENABLED === "true",
    cleanupIntervalHours: parseInt(process.env.REPORT_CLEANUP_INTERVAL_HOURS || "24", 10),
  },

  // Email et partage
  delivery: {
    enableEmailDelivery: process.env.ENABLE_REPORT_EMAIL_DELIVERY !== "false",
    enableLinkSharing: process.env.ENABLE_REPORT_LINK_SHARING !== "false",
    defaultEmailSubject: "Rapport {{reportName}} - {{date}}",
    defaultEmailBody: "Veuillez trouver ci-joint votre rapport {{reportName}} généré le {{date}}.",
    linkExpirationHours: parseInt(process.env.REPORT_LINK_EXPIRATION_HOURS || "72", 10),
    maxEmailSize: parseInt(process.env.MAX_REPORT_EMAIL_SIZE_MB || "25", 10) * 1024 * 1024,
  },

  // Génération périodique
  scheduling: {
    enabled: process.env.ENABLE_SCHEDULED_REPORTS !== "false",
    defaultDailyTime: process.env.DEFAULT_DAILY_REPORT_TIME || "04:00",
    defaultWeeklyTime: process.env.DEFAULT_WEEKLY_REPORT_TIME || "Monday 05:00",
    defaultMonthlyTime: process.env.DEFAULT_MONTHLY_REPORT_TIME || "1 06:00",
    maxScheduledReportsPerUser: parseInt(process.env.MAX_SCHEDULED_REPORTS_PER_USER || "10", 10),
    enableAutoCleanup: process.env.ENABLE_SCHEDULED_REPORT_CLEANUP !== "false",
  },

  // Limites et quotas
  limits: {
    maxRowsPerReport: parseInt(process.env.MAX_ROWS_PER_REPORT || "100000", 10),
    userDailyReportLimit: parseInt(process.env.USER_DAILY_REPORT_LIMIT || "20", 10),
    userMonthlyReportLimit: parseInt(process.env.USER_MONTHLY_REPORT_LIMIT || "100", 10),
    maxTimeRangeDays: parseInt(process.env.MAX_REPORT_TIME_RANGE_DAYS || "730", 10), // 2 ans
    maxCustomFields: parseInt(process.env.MAX_CUSTOM_FIELDS || "20", 10),
    maxFilters: parseInt(process.env.MAX_REPORT_FILTERS || "10", 10),
  },

  // Cache et performance
  cache: {
    enabled: process.env.REPORT_CACHE_ENABLED !== "false",
    ttlMinutes: parseInt(process.env.REPORT_CACHE_TTL_MINUTES || "60", 10),
    maxCacheSize: parseInt(process.env.REPORT_CACHE_SIZE_MB || "100", 10) * 1024 * 1024,
    cacheKey: "reports:cache:",
    enableCacheWarming: process.env.ENABLE_REPORT_CACHE_WARMING === "true",
  },

  // Templates et branding
  templates: {
    defaultTemplate: process.env.DEFAULT_REPORT_TEMPLATE || "standard",
    enableCustomBranding: process.env.ENABLE_CUSTOM_REPORT_BRANDING !== "false",
    logoMaxSize: parseInt(process.env.REPORT_LOGO_MAX_SIZE_KB || "500", 10) * 1024,
    supportedLogoFormats: ["png", "jpg", "jpeg", "svg"],
    defaultColors: {
      primary: process.env.REPORT_PRIMARY_COLOR || "#2563eb",
      secondary: process.env.REPORT_SECONDARY_COLOR || "#64748b",
      accent: process.env.REPORT_ACCENT_COLOR || "#059669",
    },
  },

  // Analytics et monitoring
  analytics: {
    trackGeneration: process.env.TRACK_REPORT_GENERATION !== "false",
    trackDownloads: process.env.TRACK_REPORT_DOWNLOADS !== "false",
    trackSharing: process.env.TRACK_REPORT_SHARING !== "false",
    retentionDays: parseInt(process.env.REPORT_ANALYTICS_RETENTION_DAYS || "90", 10),
    enablePerformanceMetrics: process.env.ENABLE_REPORT_PERFORMANCE_METRICS !== "false",
  },

  // Sécurité
  security: {
    enableWatermark: process.env.ENABLE_REPORT_WATERMARK === "true",
    watermarkText: process.env.REPORT_WATERMARK_TEXT || "Confidentiel - {{organizationName}}",
    enableDigitalSignature: process.env.ENABLE_REPORT_DIGITAL_SIGNATURE === "true",
    requireApproval: process.env.REQUIRE_REPORT_APPROVAL === "true",
    auditLog: process.env.ENABLE_REPORT_AUDIT_LOG !== "false",
    sensitiveDataHandling: process.env.REPORT_SENSITIVE_DATA_HANDLING || "anonymize",
  },
};

/**
 * Templates de rapport par défaut
 */
export const reportTemplates = {
  standard: {
    name: "Template Standard",
    description: "Template de base avec header, footer et pagination",
    layout: "standard",
    sections: ["header", "summary", "details", "charts", "footer"],
    colors: {
      primary: "#2563eb",
      secondary: "#64748b",
      accent: "#059669",
    },
  },
  minimal: {
    name: "Template Minimal",
    description: "Template épuré sans header ni footer",
    layout: "minimal",
    sections: ["summary", "details"],
    colors: {
      primary: "#374151",
      secondary: "#6b7280",
      accent: "#059669",
    },
  },
  executive: {
    name: "Template Exécutif",
    description: "Template professionnel pour la direction",
    layout: "executive",
    sections: ["cover", "executive_summary", "key_metrics", "trends", "recommendations"],
    colors: {
      primary: "#1f2937",
      secondary: "#374151",
      accent: "#dc2626",
    },
  },
  detailed: {
    name: "Template Détaillé",
    description: "Template complet avec toutes les sections",
    layout: "detailed",
    sections: ["cover", "toc", "summary", "methodology", "details", "charts", "analysis", "appendix"],
    colors: {
      primary: "#1e40af",
      secondary: "#3b82f6",
      accent: "#f59e0b",
    },
  },
};

/**
 * Obtenir la configuration d'un type de rapport
 */
export function getReportTypeConfig(type: ReportType): ReportTypeConfig {
  const config = reportTypes[type];
  if (!config) {
    throw new Error(`Report type configuration not found: ${type}`);
  }
  return config;
}

/**
 * Obtenir la configuration d'un format de rapport
 */
export function getReportFormatConfig(format: ReportFormat): ReportFormatConfig {
  const config = reportFormats[format];
  if (!config) {
    throw new Error(`Report format configuration not found: ${format}`);
  }
  return config;
}

/**
 * Valider une demande de rapport
 */
export function validateReportRequest(
  type: ReportType,
  format: ReportFormat,
  filters: ReportFilter,
  userPermissions: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérifier le type
  const typeConfig = getReportTypeConfig(type);

  // Vérifier les permissions
  const hasPermission = typeConfig.permissions.some((permission) =>
    userPermissions.includes(permission)
  );
  if (!hasPermission) {
    errors.push(`Insufficient permissions for report type: ${type}`);
  }

  // Vérifier le format
  if (!typeConfig.availableFormats.includes(format)) {
    errors.push(`Format ${format} not available for report type ${type}`);
  }

  // Vérifier la plage de dates
  if (filters.startDate && filters.endDate) {
    const daysDiff = Math.ceil(
      (filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (typeConfig.settings.maxTimeRangeDays && daysDiff > typeConfig.settings.maxTimeRangeDays) {
      errors.push(`Time range too large: ${daysDiff} days (max: ${typeConfig.settings.maxTimeRangeDays})`);
    }

    if (filters.endDate < filters.startDate) {
      errors.push("End date must be after start date");
    }
  }

  // Vérifier les filtres
  if (filters.userIds && filters.userIds.length > 1000) {
    errors.push("Too many users selected (max: 1000)");
  }

  if (filters.eventIds && filters.eventIds.length > 500) {
    errors.push("Too many events selected (max: 500)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Estimer le temps de génération d'un rapport
 */
export function estimateGenerationTime(
  type: ReportType,
  format: ReportFormat,
  estimatedRecords: number
): number {
  const typeConfig = getReportTypeConfig(type);
  const baseTime = typeConfig.settings.estimatedGenerationTime || 30;

  // Facteur de complexité par format
  const formatMultiplier: Record<ReportFormat, number> = {
    [ReportFormat.PDF]: 1.5,
    [ReportFormat.EXCEL]: 1.2,
    [ReportFormat.CSV]: 0.8,
    [ReportFormat.JSON]: 0.6,
    [ReportFormat.HTML]: 1.0,
  };

  // Facteur de volume
  const volumeMultiplier = Math.max(1, Math.log10(estimatedRecords / 1000));

  return Math.ceil(baseTime * formatMultiplier[format] * volumeMultiplier);
}

/**
 * Obtenir les catégories de rapports disponibles
 */
export function getAvailableCategories(): Array<{ category: ReportCategory; name: string; description: string; reportTypes: ReportType[] }> {
  const categoryMap = new Map<ReportCategory, { name: string; description: string; reportTypes: ReportType[] }>();

  Object.values(reportTypes).forEach((config) => {
    if (!categoryMap.has(config.category)) {
      categoryMap.set(config.category, {
        name: getCategoryDisplayName(config.category),
        description: getCategoryDescription(config.category),
        reportTypes: [],
      });
    }
    categoryMap.get(config.category)!.reportTypes.push(config.id as ReportType);
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));
}

/**
 * Obtenir le nom d'affichage d'une catégorie
 */
function getCategoryDisplayName(category: ReportCategory): string {
  const names: Record<ReportCategory, string> = {
    [ReportCategory.ATTENDANCE]: "Présences",
    [ReportCategory.ANALYTICS]: "Analytics",
    [ReportCategory.COMPLIANCE]: "Conformité",
    [ReportCategory.FINANCIAL]: "Financier",
    [ReportCategory.OPERATIONAL]: "Opérationnel",
    [ReportCategory.STRATEGIC]: "Stratégique",
    [ReportCategory.CUSTOM]: "Personnalisé",
  };
  return names[category];
}

/**
 * Obtenir la description d'une catégorie
 */
function getCategoryDescription(category: ReportCategory): string {
  const descriptions: Record<ReportCategory, string> = {
    [ReportCategory.ATTENDANCE]: "Rapports liés aux présences et absences",
    [ReportCategory.ANALYTICS]: "Analyses et métriques avancées",
    [ReportCategory.COMPLIANCE]: "Conformité aux politiques et réglementations",
    [ReportCategory.FINANCIAL]: "Analyses financières et de coûts",
    [ReportCategory.OPERATIONAL]: "Métriques opérationnelles quotidiennes",
    [ReportCategory.STRATEGIC]: "Insights stratégiques et KPIs",
    [ReportCategory.CUSTOM]: "Rapports personnalisables",
  };
  return descriptions[category];
}

/**
 * Vérifier si un utilisateur peut générer un rapport
 */
export function canUserGenerateReport(
  userId: string,
  type: ReportType,
  userPermissions: string[],
  dailyReportsGenerated: number,
  monthlyReportsGenerated: number
): { allowed: boolean; reason?: string } {
  const typeConfig = getReportTypeConfig(type);

  // Vérifier les permissions
  const hasPermission = typeConfig.permissions.some((permission) =>
    userPermissions.includes(permission)
  );
  if (!hasPermission) {
    return {allowed: false, reason: "Permissions insuffisantes"};
  }

  // Vérifier les limites quotidiennes
  if (dailyReportsGenerated >= reportConfig.limits.userDailyReportLimit) {
    return {allowed: false, reason: "Limite quotidienne de rapports atteinte"};
  }

  // Vérifier les limites mensuelles
  if (monthlyReportsGenerated >= reportConfig.limits.userMonthlyReportLimit) {
    return {allowed: false, reason: "Limite mensuelle de rapports atteinte"};
  }

  return {allowed: true};
}

/**
 * Obtenir les formats disponibles pour un type de rapport
 */
export function getAvailableFormats(type: ReportType): ReportFormatConfig[] {
  const typeConfig = getReportTypeConfig(type);
  return typeConfig.availableFormats.map((format) => getReportFormatConfig(format));
}

/**
 * Générer un nom de fichier pour un rapport
 */
export function generateReportFileName(
  type: ReportType,
  format: ReportFormat,
  filters: ReportFilter,
  timestamp: Date = new Date()
): string {
  const typeConfig = getReportTypeConfig(type);
  const formatConfig = getReportFormatConfig(format);

  const dateStr = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = timestamp.toISOString().split("T")[1].substring(0, 5).replace(":", ""); // HHMM

  let fileName = `${typeConfig.name.toLowerCase().replace(/\s+/g, "_")}_${dateStr}_${timeStr}`;

  // Ajouter des informations contextuelles
  if (filters.startDate && filters.endDate) {
    const startStr = filters.startDate.toISOString().split("T")[0];
    const endStr = filters.endDate.toISOString().split("T")[0];
    fileName += `_${startStr}_to_${endStr}`;
  }

  if (filters.departments && filters.departments.length === 1) {
    fileName += `_${filters.departments[0].toLowerCase().replace(/\s+/g, "_")}`;
  }

  return `${fileName}${formatConfig.extension}`;
}

/**
 * Validation de la configuration des rapports
 */
export function validateReportConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier la configuration de stockage
  if (reportConfig.storage.enabled && !reportConfig.storage.path) {
    errors.push("Storage path must be configured when storage is enabled");
  }

  // Vérifier la configuration email
  if (reportConfig.delivery.enableEmailDelivery) {
    if (!reportConfig.delivery.defaultEmailSubject) {
      errors.push("Default email subject must be configured");
    }
    if (!reportConfig.delivery.defaultEmailBody) {
      errors.push("Default email body must be configured");
    }
  }

  // Vérifier les limites
  if (reportConfig.limits.maxRowsPerReport < 1000) {
    warnings.push("Max rows per report is very low (< 1000)");
  }

  if (reportConfig.limits.userDailyReportLimit > 50) {
    warnings.push("Daily report limit is very high (> 50)");
  }

  // Vérifier les timeouts
  if (reportConfig.generation.timeoutMinutes < 5) {
    warnings.push("Generation timeout is very low (< 5 minutes)");
  }

  // Vérifier la configuration du cache
  if (reportConfig.cache.enabled && reportConfig.cache.ttlMinutes < 10) {
    warnings.push("Cache TTL is very low (< 10 minutes)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Obtenir les métriques de performance des rapports
 */
export function getReportPerformanceMetrics(): {
  avgGenerationTime: number;
  successRate: number;
  popularTypes: Array<{ type: ReportType; count: number; avgTime: number }>;
  formatDistribution: Array<{ format: ReportFormat; percentage: number }>;
  } {
  // Cette fonction devrait être implémentée avec de vraies données
  // Pour l'instant, elle retourne des données d'exemple
  return {
    avgGenerationTime: 45, // secondes
    successRate: 96.5, // pourcentage
    popularTypes: [
      {type: ReportType.ATTENDANCE_SUMMARY, count: 1250, avgTime: 32},
      {type: ReportType.USER_ATTENDANCE, count: 890, avgTime: 18},
      {type: ReportType.EVENT_ANALYTICS, count: 567, avgTime: 56},
    ],
    formatDistribution: [
      {format: ReportFormat.PDF, percentage: 45},
      {format: ReportFormat.EXCEL, percentage: 35},
      {format: ReportFormat.CSV, percentage: 15},
      {format: ReportFormat.JSON, percentage: 5},
    ],
  };
}

// Export par défaut
export default {
  reportTypes,
  reportFormats,
  reportConfig,
  reportTemplates,
  getReportTypeConfig,
  getReportFormatConfig,
  validateReportRequest,
  estimateGenerationTime,
  getAvailableCategories,
  canUserGenerateReport,
  getAvailableFormats,
  generateReportFileName,
  validateReportConfig,
  getReportPerformanceMetrics,
};
