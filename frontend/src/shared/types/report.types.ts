// shared/types/report.types.ts

import { AttendanceStatus, AttendanceMethod } from "./attendance.types";
import { BaseEntity } from "./common.types";
import { EventType } from "./event.types";
import { UserRole } from "./role.types";


// 📊 ÉNUMÉRATIONS
export enum ReportType {
  ATTENDANCE_SUMMARY = 'attendance_summary',
  USER_ATTENDANCE = 'user_attendance',
  USER_PERFORMANCE = 'user_performance',
  EVENT_DETAIL = 'event_detail',
  EVENT_ANALYTICS = 'event_analytics',
  DEPARTMENT_ANALYTICS = 'department_analytics',
  DEPARTMENT_STATS = 'department_stats',
  MONTHLY_SUMMARY = 'monthly_summary',
  ABSENCE_REPORT = 'absence_report',
  PUNCTUALITY_REPORT = 'punctuality_report',
  ENGAGEMENT_REPORT = 'engagement_report',
  COMPLIANCE_REPORT = 'compliance_report',
  COST_ANALYSIS = 'cost_analysis',
  PERFORMANCE_METRICS = 'performance_metrics',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html'
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

// 🔍 FILTRES ET CONFIGURATION
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  userIds?: string[];
  eventIds?: string[];
  departments?: string[];
  eventTypes?: EventType[];
  attendanceStatuses?: AttendanceStatus[];
  roles?: UserRole[];
  tags?: string[];
  locations?: string[];
  minAttendanceRate?: number;
  maxAttendanceRate?: number;
  organizerId?: string;
  month?: number;
  year?: number;
  userId?: string;
  eventId?: string;
  department?: string;
}

export interface ReportConfiguration {
  includeCharts: boolean;
  includeDetails: boolean;
  includeSummary: boolean;
  includeMetrics: boolean;
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateGrouping?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  customFields?: string[];
  branding?: {
    logo?: string;
    companyName?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
}

// 📝 REQUÊTES DE GÉNÉRATION
export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  name?: string;
  description?: string;
  filters: ReportFilter;
  configuration: ReportConfiguration;
  scheduledFor?: Date;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
  };
}

export interface GenerateReportRequest {
  type: ReportType;
  format: ReportFormat;
  name?: string;
  description?: string;
  filters?: ReportFilter;
  configuration?: ReportConfiguration;
  generatedBy: string;
  isPublic?: boolean;
  expiresAt?: Date;
}

// 📊 DONNÉES DE RAPPORT DE BASE
export interface ReportData {
  type: ReportType;
  period?: { start: Date; end: Date };
  summary: {
    totalRecords: number;
    totalEvents?: number;
    totalUsers?: number;
    totalAttendances?: number;
    attendanceRate?: number;
    punctualityRate?: number;
  };
  insights?: string[];
}

// 📈 RAPPORT DE RÉSUMÉ DE PRÉSENCE
export interface AttendanceReport extends ReportData {
  type: ReportType.ATTENDANCE_SUMMARY;
  statusBreakdown: Record<AttendanceStatus, number>;
  trends: Array<{
    date: string;
    attendanceRate: number;
    totalEvents: number;
  }>;
  departmentStats: Array<{
    department: string;
    totalUsers: number;
    attendanceRate: number;
    punctualityRate: number;
  }>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    department: string;
    attendanceRate: number;
    totalEvents: number;
    punctualityRate: number;
  }>;
  bottomPerformers: Array<{
    userId: string;
    userName: string;
    department: string;
    attendanceRate: number;
    totalEvents: number;
    punctualityRate: number;
  }>;
  methodAnalysis: Record<AttendanceMethod, number>;
}

// 📅 RAPPORT DÉTAIL D'ÉVÉNEMENT
export interface EventReport extends ReportData {
  type: ReportType.EVENT_DETAIL;
  event: {
    id: string;
    title: string;
    type: EventType;
    startDateTime: Date;
    endDateTime: Date;
    location: any;
    organizer: string;
  };
  statusBreakdown: Record<AttendanceStatus, number>;
  checkInTimeline: Array<{
    time: Date;
    userId: string;
    userName: string;
    status: AttendanceStatus;
    method: AttendanceMethod;
    minutesFromStart: number;
  }>;
  lateArrivals: Array<{
    userId: string;
    userName: string;
    checkInTime: Date;
    minutesLate: number;
  }>;
  absentees: Array<{
    userId: string;
    userName: string;
    department: string;
  }>;
  departmentStats: Array<{
    department: string;
    totalParticipants: number;
    attendanceRate: number;
    punctualityRate: number;
  }>;
  methodUsage: Record<AttendanceMethod, number>;
}

// 👤 RAPPORT PRÉSENCE UTILISATEUR
export interface UserReport extends ReportData {
  type: ReportType.USER_ATTENDANCE;
  user: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: UserRole;
  };
  statusBreakdown: Record<AttendanceStatus, number>;
  monthlyTrends: Array<{
    month: string;
    attendanceRate: number;
    punctualityRate: number;
  }>;
  eventTypeStats: Record<EventType, {
    total: number;
    attended: number;
    late: number;
  }>;
  punctualityPattern: {
    averageArrivalTime: number;
    mostCommonTimeSlot: string;
    tendencyToLate: number;
  };
  recentAttendances: Array<{
    eventId: string;
    eventTitle: string;
    status: AttendanceStatus;
    checkInTime?: Date;
    method: AttendanceMethod;
    date?: Date;
  }>;
}

// 🏢 RAPPORT DÉPARTEMENT
export interface DepartmentReport extends ReportData {
  type: ReportType.DEPARTMENT_STATS;
  department: {
    name: string;
    totalEmployees: number;
    activeEmployees: number;
  };
  employeeStats: Array<{
    userId: string;
    userName: string;
    position: string;
    totalEvents: number;
    attendanceRate: number;
    punctualityRate: number;
    lastActivity: number;
  }>;
  trends: Array<{
    date: string;
    attendanceRate: number;
    eventCount: number;
  }>;
  eventTypeAnalysis: Record<EventType, {
    totalEvents: number;
    averageAttendance: number;
    popularityScore: number;
  }>;
  statusBreakdown: Record<AttendanceStatus, number>;
}

// 📊 RAPPORT PERSONNALISÉ
export interface CustomReport extends ReportData {
  type: ReportType.CUSTOM|ReportType.MONTHLY_SUMMARY;
  data: {
    aggregatedData: any[];
    rawDataSample?: any[];
    weeklyAnalysis?: any[];
    topEvents?: any[];
    departmentAnalysis?: any[];
    trends?: any[];
  };
  charts?: Array<{
    type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
    title: string;
    data: any[];
    generated?: boolean;
  }>;
}

// 📄 RAPPORT GÉNÉRÉ
export interface GeneratedReport extends BaseEntity {
  type: ReportType;
  format: ReportFormat;
  name: string;
  description?: string;
  filters: ReportFilter;
  configuration: ReportConfiguration;
  generatedBy: string;
  
  // Données du rapport
  data?: ReportData;
  
  // Fichier généré
  fileName?: string;
  fileUrl?: string;
  filePath?: string;
  fileSize?: number;
  
  // État et progression
  status: ReportStatus;
  progress?: number; // 0-100
  error?: string;
  
  // Métadonnées de génération
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  
  // Statistiques du rapport
  recordCount?: number;
  processingTime?: number; // en millisecondes
  
  // Récurrence
  isRecurring: boolean;
  parentReportId?: string;
  nextScheduledAt?: Date;
  
  // Partage et accès
  isPublic: boolean;
  sharedWith?: string[];
  accessToken?: string;
  downloadCount?: number;
  lastDownloadedAt?: Date;
}

// 📈 MÉTRIQUES DE RAPPORT
export interface ReportMetrics {
  totalReports: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
  popularTypes: { type: ReportType; count: number }[];
  storageUsed: number;
  costThisMonth?: number;
}

// 📊 STATISTIQUES ET ANALYSES
export interface ReportStats {
  total: number;
  byType: Record<ReportType, number>;
  byStatus: Record<ReportStatus, number>;
  byFormat: Record<ReportFormat, number>;
  averageGenerationTime: number;
  totalDownloads: number;
}

// 🔄 OPTIONS DE LISTE
export interface ReportListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: ReportType;
  status?: ReportStatus;
  generatedBy?: string;
  dateRange?: { start: Date; end: Date };
  format?: ReportFormat;
}

// 📊 CONFIGURATION D'AGRÉGATION PERSONNALISÉE
export interface DataAggregation {
  groupBy: string[];
  aggregations: Array<{
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias?: string;
  }>;
  filters?: Record<string, any>;
  sort?: { field: string; order: 'asc' | 'desc' }[];
}

// 📈 CONFIGURATION DE GRAPHIQUES
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  title: string;
  xAxis: { field: string; label: string };
  yAxis: { field: string; label: string };
  colors?: string[];
  options?: Record<string, any>;
}

// 📋 TEMPLATE DE RAPPORT
export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  defaultFilters: ReportFilter;
  defaultConfiguration: ReportConfiguration;
  requiredPermissions: string[];
  isCustomizable: boolean;
  estimatedDuration: number; // en secondes
  category: 'attendance' | 'analytics' | 'compliance' | 'management';
  popularity: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 🔄 RAPPORT PROGRAMMÉ
export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  filters: ReportFilter;
  configuration: ReportConfiguration;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 pour weekly
    dayOfMonth?: number; // 1-31 pour monthly
    time: string; // HH:mm
  };
  recipients: string[];
  isActive: boolean;
  lastGenerated?: Date;
  nextGeneration: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 📊 INSIGHT AUTOMATIQUE
export interface ReportInsight {
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  confidence: number; // 0-1
  actionable: boolean;
  recommendedActions?: string[];
  data?: Record<string, any>;
  createdAt: Date;
}

// 🎯 TYPES D'EXPORT SPÉCIALISÉS
export interface ExportOptions {
  format: ReportFormat;
  includeCharts: boolean;
  includeMetadata: boolean;
  compression?: boolean;
  password?: string;
}

export interface ReportExport {
  reportId: string;
  format: ReportFormat;
  fileUrl: string;
  expiresAt: Date;
  downloadCount: number;
  createdAt: Date;
}

// 📧 DISTRIBUTION DE RAPPORT
export interface ReportDistribution {
  reportId: string;
  recipients: Array<{
    userId: string;
    email: string;
    method: 'email' | 'notification' | 'both';
    delivered: boolean;
    deliveredAt?: Date;
    error?: string;
  }>;
  subject: string;
  message?: string;
  scheduledFor?: Date;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  createdBy: string;
  createdAt: Date;
}

// 🔍 RECHERCHE ET FILTRAGE AVANCÉ
export interface ReportSearchQuery {
  text?: string;
  type?: ReportType[];
  status?: ReportStatus[];
  generatedBy?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  hasData?: boolean;
  isPublic?: boolean;
  minSize?: number;
  maxSize?: number;
}

// 💾 CACHE DE RAPPORT
export interface ReportCache {
  key: string;
  reportId: string;
  data: any;
  size: number;
  hits: number;
  lastAccessed: Date;
  expiresAt: Date;
  createdAt: Date;
}

// 📊 RAPPORT D'UTILISATION
export interface ReportUsageStats {
  period: { start: Date; end: Date };
  totalReports: number;
  totalDownloads: number;
  mostPopularTypes: Array<{
    type: ReportType;
    count: number;
    percentage: number;
  }>;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    reportsGenerated: number;
    reportsDownloaded: number;
  }>;
  averageGenerationTime: number;
  storageUsed: number;
  trends: Array<{
    date: string;
    reportsGenerated: number;
    reportsDownloaded: number;
  }>;
}

// 🏷️ TYPE GUARD HELPERS
export type Report = GeneratedReport;

export type SpecificReportData = 
  | AttendanceReport 
  | EventReport 
  | UserReport 
  | DepartmentReport 
  | CustomReport;

// 📤 TYPES D'EXPORT PAR DÉFAUT
export {
 /*  ReportType,
  ReportFormat,
  ReportStatus, */
  GeneratedReport as default
};