// Types pour les résolutions - Frontend
export enum ResolutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ResolutionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ResolutionComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

export interface Resolution {
  id: string
  eventId: string
  title: string
  description: string
  assignedTo: string[]
  assignedToNames?: string[]
  createdBy: string
  createdByName?: string
  dueDate?: string
  status: ResolutionStatus
  priority: ResolutionPriority
  tags?: string[]
  attachments?: string[]
  comments?: ResolutionComment[]
  progress?: number
  estimatedHours?: number
  actualHours?: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreateResolutionRequest {
  title: string
  description: string
  assignedTo: string[]
  dueDate?: string
  priority?: ResolutionPriority
  tags?: string[]
  estimatedHours?: number
}

export interface UpdateResolutionRequest {
  title?: string
  description?: string
  assignedTo?: string[]
  dueDate?: string
  status?: ResolutionStatus
  priority?: ResolutionPriority
  tags?: string[]
  progress?: number
  actualHours?: number
}

export interface ResolutionFilters {
  status?: ResolutionStatus
  assignedTo?: string
  priority?: ResolutionPriority
  overdue?: boolean
}

export interface ResolutionSortOptions {
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export interface ResolutionListOptions extends ResolutionFilters, ResolutionSortOptions {
  limit?: number
  offset?: number
}

export interface ResolutionListResponse {
  resolutions: Resolution[]
  total: number
  hasMore: boolean
}

export interface ResolutionStats {
  total: number
  byStatus: Record<ResolutionStatus, number>
  byPriority: Record<ResolutionPriority, number>
  overdue: number
  completionRate: number
  avgCompletionTime?: number
}

// Utilitaires pour l'affichage
export const ResolutionStatusLabels: Record<ResolutionStatus, string> = {
  [ResolutionStatus.PENDING]: 'En attente',
  [ResolutionStatus.IN_PROGRESS]: 'En cours',
  [ResolutionStatus.COMPLETED]: 'Terminé',
  [ResolutionStatus.CANCELLED]: 'Annulé'
}

export const ResolutionPriorityLabels: Record<ResolutionPriority, string> = {
  [ResolutionPriority.LOW]: 'Faible',
  [ResolutionPriority.MEDIUM]: 'Moyenne',
  [ResolutionPriority.HIGH]: 'Élevée',
  [ResolutionPriority.URGENT]: 'Urgente'
}

export const ResolutionStatusColors: Record<ResolutionStatus, string> = {
  [ResolutionStatus.PENDING]: 'bg-gray-100 text-gray-800',
  [ResolutionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [ResolutionStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [ResolutionStatus.CANCELLED]: 'bg-red-100 text-red-800'
}

export const ResolutionPriorityColors: Record<ResolutionPriority, string> = {
  [ResolutionPriority.LOW]: 'bg-gray-100 text-gray-800',
  [ResolutionPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [ResolutionPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [ResolutionPriority.URGENT]: 'bg-red-100 text-red-800'
}

// Utilitaires pour les dates
export interface TimeRemaining {
  days: number
  hours: number
  isOverdue: boolean
}

export const calculateTimeRemaining = (dueDate: string): TimeRemaining | null => {
  if (!dueDate) return null

  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()

  if (diff < 0) {
    const overdueDiff = Math.abs(diff)
    return {
      days: Math.floor(overdueDiff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      isOverdue: true
    }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    isOverdue: false
  }
}

export const isResolutionOverdue = (resolution: Resolution): boolean => {
  if (!resolution.dueDate || resolution.status === ResolutionStatus.COMPLETED) {
    return false
  }
  return new Date(resolution.dueDate) < new Date()
}

export const isDueSoon = (dueDate: string, hoursThreshold: number = 24): boolean => {
  if (!dueDate) return false
  const threshold = new Date(Date.now() + hoursThreshold * 60 * 60 * 1000)
  return new Date(dueDate) <= threshold
}