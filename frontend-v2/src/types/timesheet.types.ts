// Types pour la gestion des feuilles de temps - Frontend

export enum TimesheetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LOCKED = 'locked'
}

export enum TimeEntryStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

export interface TimeEntry {
  id: string
  employeeId: string
  tenantId: string
  timesheetId: string
  projectId?: string
  activityCodeId?: string
  date: string // YYYY-MM-DD
  startTime?: string
  endTime?: string
  duration: number // en minutes
  description: string
  billable: boolean
  hourlyRate?: number
  totalCost?: number
  status: TimeEntryStatus
  tags?: string[]
  metadata?: {
    source: 'manual' | 'presence' | 'import'
    presenceEntryId?: string
    importBatchId?: string
  }
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}

export interface Timesheet {
  id: string
  employeeId: string
  tenantId: string
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  status: TimesheetStatus
  submittedAt?: string
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
  timeEntries: string[] // IDs des entrées de temps
  totalHours: number
  totalBillableHours: number
  totalCost: number
  metadata?: {
    version: number
    lastCalculated: string
    calculationHash: string
  }
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface Project {
  id: string
  tenantId: string
  clientId?: string
  name: string
  code: string
  description?: string
  status: ProjectStatus
  startDate?: string
  endDate?: string
  budget?: number
  defaultHourlyRate?: number
  billable: boolean
  assignedEmployees: string[]
  activityCodes: string[]
  settings?: {
    requireActivityCode: boolean
    allowOvertime: boolean
    autoApprove: boolean
  }
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
}

export interface ActivityCode {
  id: string
  tenantId: string
  code: string
  name: string
  description?: string
  category: string
  parentId?: string
  billable: boolean
  defaultRate?: number
  isActive: boolean
  projectSpecific: boolean
  hierarchy?: {
    level: number
    path: string
    fullName: string
  }
  createdAt: string
  updatedAt: string
}

export interface TimePeriod {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

export interface CreateTimeEntryRequest {
  projectId?: string
  activityCodeId?: string
  date: string
  startTime?: string
  endTime?: string
  duration?: number
  description: string
  billable?: boolean
  hourlyRate?: number
  tags?: string[]
}

export interface UpdateTimeEntryRequest {
  projectId?: string
  activityCodeId?: string
  date?: string
  startTime?: string
  endTime?: string
  duration?: number
  description?: string
  billable?: boolean
  hourlyRate?: number
  tags?: string[]
}

export interface CreateProjectRequest {
  clientId?: string
  name: string
  code: string
  description?: string
  status?: ProjectStatus
  startDate?: string
  endDate?: string
  budget?: number
  defaultHourlyRate?: number
  billable?: boolean
  assignedEmployees?: string[]
  activityCodes?: string[]
  settings?: {
    requireActivityCode?: boolean
    allowOvertime?: boolean
    autoApprove?: boolean
  }
}

export interface CreateActivityCodeRequest {
  code: string
  name: string
  description?: string
  category: string
  parentId?: string
  billable?: boolean
  defaultRate?: number
  isActive?: boolean
  projectSpecific?: boolean
}

export interface TimesheetFilters {
  status?: TimesheetStatus
  startDate?: string
  endDate?: string
  employeeId?: string
  projectId?: string
}

export interface TimeEntryFilters {
  status?: TimeEntryStatus
  startDate?: string
  endDate?: string
  projectId?: string
  activityCodeId?: string
  billable?: boolean
}

export interface ProjectFilters {
  status?: ProjectStatus
  clientId?: string
  assignedEmployeeId?: string
  billable?: boolean
}

export interface TimesheetListOptions {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'periodStart' | 'status'
  sortOrder?: 'asc' | 'desc'
  filters?: TimesheetFilters
}

export interface TimeEntryListOptions {
  limit?: number
  offset?: number
  sortBy?: 'date' | 'createdAt' | 'duration'
  sortOrder?: 'asc' | 'desc'
  filters?: TimeEntryFilters
}

export interface TimesheetListResponse {
  timesheets: Timesheet[]
  total: number
  hasMore: boolean
}

export interface TimeEntryListResponse {
  timeEntries: TimeEntry[]
  total: number
  hasMore: boolean
}

export interface TimesheetStats {
  totalTimesheets: number
  byStatus: Record<TimesheetStatus, number>
  totalHours: number
  totalBillableHours: number
  totalCost: number
  averageHoursPerTimesheet: number
  billablePercentage: number
}

// Utilitaires pour l'affichage
export const TimesheetStatusLabels: Record<TimesheetStatus, string> = {
  [TimesheetStatus.DRAFT]: 'Brouillon',
  [TimesheetStatus.SUBMITTED]: 'Soumise',
  [TimesheetStatus.UNDER_REVIEW]: 'En révision',
  [TimesheetStatus.APPROVED]: 'Approuvée',
  [TimesheetStatus.REJECTED]: 'Rejetée',
  [TimesheetStatus.LOCKED]: 'Verrouillée'
}

export const TimesheetStatusColors: Record<TimesheetStatus, string> = {
  [TimesheetStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [TimesheetStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
  [TimesheetStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [TimesheetStatus.APPROVED]: 'bg-green-100 text-green-800',
  [TimesheetStatus.REJECTED]: 'bg-red-100 text-red-800',
  [TimesheetStatus.LOCKED]: 'bg-purple-100 text-purple-800'
}

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'Actif',
  [ProjectStatus.INACTIVE]: 'Inactif',
  [ProjectStatus.COMPLETED]: 'Terminé',
  [ProjectStatus.ON_HOLD]: 'En attente'
}

export const ProjectStatusColors: Record<ProjectStatus, string> = {
  [ProjectStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [ProjectStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [ProjectStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800'
}

// Utilitaires pour les calculs
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
}

export const parseDuration = (durationStr: string): number => {
  const match = durationStr.match(/(\d+)h(?:\s*(\d+)m)?/)
  if (!match) return 0
  
  const hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  
  return hours * 60 + minutes
}

export const calculateHours = (minutes: number): number => {
  return Math.round((minutes / 60) * 100) / 100
}

export const isTimesheetEditable = (status: TimesheetStatus): boolean => {
  return status === TimesheetStatus.DRAFT || status === TimesheetStatus.REJECTED
}

export const canSubmitTimesheet = (timesheet: Timesheet): boolean => {
  return timesheet.status === TimesheetStatus.DRAFT && timesheet.timeEntries.length > 0
}

export const getTimesheetPeriodType = (periodStart: string, periodEnd: string): 'weekly' | 'bi-weekly' | 'monthly' | 'custom' => {
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  if (diffDays === 7) return 'weekly'
  if (diffDays === 14) return 'bi-weekly'
  if (diffDays >= 28 && diffDays <= 31) return 'monthly'
  return 'custom'
}