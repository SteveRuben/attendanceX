/**
 * Types pour la gestion des feuilles de temps
 */

import { BaseEntity } from './common.types';

// Enums pour les statuts des entrées de temps
export enum TimeEntryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Enums pour les statuts des feuilles de temps
export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LOCKED = 'locked'
}

// Enums pour les statuts des projets
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

// Enums pour les statuts d'approbation
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated'
}

// Interface pour les entrées de temps
export interface TimeEntry extends BaseEntity {
  employeeId: string;
  tenantId: string;
  timesheetId: string;
  projectId?: string;
  activityCodeId?: string;
  date: string; // YYYY-MM-DD
  startTime?: Date;
  endTime?: Date;
  duration: number; // en minutes
  description: string;
  billable: boolean;
  hourlyRate?: number;
  totalCost?: number;
  status: TimeEntryStatus;
  tags?: string[];
  metadata?: {
    source: 'manual' | 'presence' | 'import';
    presenceEntryId?: string;
    importBatchId?: string;
  };
  createdBy: string;
  updatedBy?: string;
}

// Interface pour les feuilles de temps
export interface Timesheet extends BaseEntity {
  employeeId: string;
  tenantId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  status: TimesheetStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  timeEntries: string[]; // IDs des entrées de temps
  // Statut et workflow
  submittedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionComments?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
  reopenComments?: string;
  lockedAt?: Date;
  lockedBy?: string;
  
  // Corrections
  returnedToDraftAt?: Date;
  returnedBy?: string;
  returnReason?: string;
  returnComments?: string;
  correctionGuideId?: string;
  
  // Totaux calculés
  totalHours: number;
  totalBillableHours: number;
  totalCost: number;
  metadata?: {
    version: number;
    lastCalculated: Date;
    calculationHash: string;
  };
  createdBy?: string;
  updatedBy?: string;
}

// Types pour les entrées de temps détaillées (pour les services)
export interface TimeEntryDetails {
  id: string;
  timesheetId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description: string;
  projectId?: string;
  activityCodeId?: string;
  billable: boolean;
  rate?: number;
  cost?: number;
}

// Interface pour les projets
export interface Project extends BaseEntity {
  tenantId: string;
  clientId?: string;
  name: string;
  code: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  defaultHourlyRate?: number;
  billable: boolean;
  assignedEmployees: string[];
  activityCodes: string[];
  settings?: {
    requireActivityCode: boolean;
    allowOvertime: boolean;
    autoApprove: boolean;
  };
  createdBy: string;
  updatedBy?: string;
}

// Interface pour les codes d'activité
export interface ActivityCode extends BaseEntity {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  parentId?: string;
  billable: boolean;
  defaultRate?: number;
  isActive: boolean;
  projectSpecific: boolean;
  hierarchy?: {
    level: number;
    path: string;
    fullName: string;
  };
}

// Interface pour les workflows d'approbation
export interface ApprovalWorkflow extends BaseEntity {
  tenantId: string;
  timesheetId: string;
  employeeId: string;
  approverId: string;
  status: ApprovalStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  comments?: string;
  rejectionReason?: string;
  escalatedTo?: string;
  escalatedAt?: Date;
  history?: ApprovalHistoryEntry[];
}

// Interface pour l'historique d'approbation
export interface ApprovalHistoryEntry {
  action: 'submitted' | 'approved' | 'rejected' | 'escalated';
  performedBy: string;
  performedAt: Date;
  comments?: string;
}

// Interface pour les périodes de temps
export interface TimePeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

// Interface pour les entrées de temps (input)
export interface TimeEntryInput {
  projectId?: string;
  activityCodeId?: string;
  date: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  description: string;
  billable?: boolean;
  hourlyRate?: number;
  tags?: string[];
}

// Interface pour les projets (input)
export interface ProjectInput {
  clientId?: string;
  name: string;
  code: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  defaultHourlyRate?: number;
  billable?: boolean;
  assignedEmployees?: string[];
  activityCodes?: string[];
  settings?: {
    requireActivityCode?: boolean;
    allowOvertime?: boolean;
    autoApprove?: boolean;
  };
}

// Interface pour les codes d'activité (input)
export interface ActivityCodeInput {
  code: string;
  name: string;
  description?: string;
  category: string;
  parentId?: string;
  billable?: boolean;
  defaultRate?: number;
  isActive?: boolean;
  projectSpecific?: boolean;
}

// Interface pour les filtres de feuilles de temps
export interface TimesheetFilters {
  status?: TimesheetStatus;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  projectId?: string;
}

// Interface pour les filtres de projets
export interface ProjectFilters {
  status?: ProjectStatus;
  clientId?: string;
  assignedEmployeeId?: string;
  billable?: boolean;
}

// Interface pour les filtres de codes d'activité
export interface ActivityCodeFilters {
  category?: string;
  billable?: boolean;
  isActive?: boolean;
  projectSpecific?: boolean;
}

// Interface pour les totaux de feuilles de temps
export interface TimesheetTotals {
  totalHours: number;
  totalBillableHours: number;
  totalCost: number;
  entriesCount: number;
}

// Interface pour les résultats de validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Interface pour les informations de conflit
export interface ConflictInfo {
  conflictType: 'overlap' | 'gap' | 'duplicate';
  existingEntryId: string;
  conflictDetails: string;
  suggestedResolution?: string;
}

// Interface pour les statistiques de projet
export interface ProjectStats {
  totalHours: number;
  totalCost: number;
  billableHours: number;
  nonBillableHours: number;
  employeeCount: number;
  averageHourlyRate: number;
  completionPercentage?: number;
}

// Interface pour les rapports de rentabilité
export interface ProfitabilityReport {
  projectId: string;
  projectName: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  hoursWorked: number;
  averageRate: number;
}

// Interface pour les statistiques d'activité
export interface ActivityStats {
  activityCodeId: string;
  activityName: string;
  totalHours: number;
  percentage: number;
  employeeCount: number;
}

// Interface pour l'arbre hiérarchique des codes d'activité
export interface ActivityCodeTree {
  id: string;
  code: string;
  name: string;
  level: number;
  children: ActivityCodeTree[];
}

// Interface pour les résultats de synchronisation
export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
}

// Interface pour les formats d'export
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  PDF = 'pdf'
}

// Interface pour les filtres d'export
export interface ExportFilters {
  tenantId: string;
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  projectIds?: string[];
  status?: TimesheetStatus;
  billableOnly?: boolean;
}

// Interface pour les résultats d'export
export interface ExportResult {
  format: ExportFormat;
  fileName: string;
  fileUrl: string;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
}

// Interface pour l'export de paie
export interface PayrollExport {
  tenantId: string;
  period: TimePeriod;
  employees: PayrollEmployeeData[];
  totals: {
    totalEmployees: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalCost: number;
  };
}

// Interface pour les données d'employé pour la paie
export interface PayrollEmployeeData {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  regularRate: number;
  overtimeRate: number;
  totalCost: number;
}

// Interface pour l'export de facturation
export interface BillingExport {
  clientId: string;
  clientName: string;
  period: TimePeriod;
  projects: BillingProjectData[];
  totals: {
    totalHours: number;
    totalBillableHours: number;
    totalAmount: number;
  };
}

// Interface pour les données de projet pour la facturation
export interface BillingProjectData {
  projectId: string;
  projectName: string;
  projectCode: string;
  hours: number;
  rate: number;
  amount: number;
  activities: BillingActivityData[];
}

// Interface pour les données d'activité pour la facturation
export interface BillingActivityData {
  activityCode: string;
  activityName: string;
  hours: number;
  rate: number;
  amount: number;
}

// Interface pour les rapports de temps
export interface TimeReport {
  title: string;
  period: TimePeriod;
  generatedAt: Date;
  data: TimeReportData[];
  summary: TimeReportSummary;
}

// Interface pour les données de rapport de temps
export interface TimeReportData {
  employeeId: string;
  employeeName: string;
  projectId?: string;
  projectName?: string;
  activityCode?: string;
  activityName?: string;
  date: string;
  hours: number;
  billableHours: number;
  rate?: number;
  cost?: number;
}

// Interface pour le résumé de rapport de temps
export interface TimeReportSummary {
  totalEmployees: number;
  totalHours: number;
  totalBillableHours: number;
  totalCost: number;
  averageHoursPerEmployee: number;
  billablePercentage: number;
}

// Interface pour les rapports de productivité
export interface ProductivityReport {
  tenantId: string;
  period: TimePeriod;
  employees: ProductivityEmployeeData[];
  averages: {
    hoursPerDay: number;
    billablePercentage: number;
    efficiency: number;
  };
}

// Interface pour les données de productivité par employé
export interface ProductivityEmployeeData {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  billableHours: number;
  workingDays: number;
  averageHoursPerDay: number;
  billablePercentage: number;
  efficiency: number;
  topActivities: {
    activityName: string;
    hours: number;
    percentage: number;
  }[];
}

// Interface pour les filtres de rapport
export interface ReportFilters {
  tenantId: string;
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  projectIds?: string[];
  clientIds?: string[];
  activityCodeIds?: string[];
  billableOnly?: boolean;
  groupBy?: 'employee' | 'project' | 'activity' | 'date';
}