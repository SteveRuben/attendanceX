// Backend types for project management system
export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  PREPARATION = 'preparation',
  EXECUTION = 'execution',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectTemplate {
  ACADEMIC = 'academic',
  SPORT = 'sport',
  COCKTAIL = 'cocktail',
  PARTY = 'party',
  MUSIC = 'music',
  CONFERENCE = 'conference',
  WORKSHOP = 'workshop',
  NETWORKING = 'networking'
}

export enum ProjectPhase {
  CONCEPTION = 'conception',
  PREPARATION = 'preparation',
  EXECUTION = 'execution',
  CLOSURE = 'closure'
}

export interface ProjectTeam {
  id: string
  name: string
  description: string
  color: string
  members: string[]
  leaderId: string
  objectives: ProjectObjective[]
  createdAt: Date
  updatedAt: Date
}

export interface ProjectObjective {
  id: string
  title: string
  description: string
  teamId: string
  phase: ProjectPhase
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: Date
  assignedTo: string[]
  metrics?: {
    target: number
    current: number
    unit: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationForm {
  id: string
  projectId: string
  title: string
  description: string
  fields: RegistrationField[]
  isActive: boolean
  settings: {
    requiresApproval: boolean
    maxParticipants?: number
    registrationDeadline?: Date
    confirmationMessage: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationField {
  id: string
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'date' | 'file'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
  order: number
}

export interface EventProject {
  id: string
  title: string
  description: string
  template: ProjectTemplate
  status: ProjectStatus
  currentPhase: ProjectPhase
  
  // Event details
  eventDetails: {
    type: string
    startDate: Date
    endDate: Date
    location: {
      type: 'physical' | 'virtual' | 'hybrid'
      name?: string
      address?: {
        street: string
        city: string
        country: string
        postalCode?: string
        province?: string
      }
      virtualUrl?: string
    }
    capacity?: number
    isPublic: boolean
    requiresRegistration: boolean
    tags: string[]
  }
  
  // Project management
  teams: ProjectTeam[]
  objectives: ProjectObjective[]
  registrationForm?: RegistrationForm
  
  // Workflow and templates
  workflow: ProjectWorkflow
  templateConfig: TemplateConfig
  
  // Metadata
  createdBy: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectWorkflow {
  phases: WorkflowPhase[]
  currentPhaseId: string
  completedPhases: string[]
}

export interface WorkflowPhase {
  id: string
  name: string
  description: string
  phase: ProjectPhase
  order: number
  estimatedDuration: number // in days
  prerequisites: string[]
  tasks: WorkflowTask[]
  isCompleted: boolean
  completedAt?: Date
}

export interface WorkflowTask {
  id: string
  title: string
  description: string
  assignedTeam?: string
  estimatedHours: number
  isRequired: boolean
  isCompleted: boolean
  completedAt?: Date
  dependencies: string[]
}

export interface TemplateConfig {
  template: ProjectTemplate
  customizations: {
    phases: PhaseCustomization[]
    teams: TeamTemplate[]
    objectives: ObjectiveTemplate[]
    registrationFields: RegistrationField[]
  }
}

export interface PhaseCustomization {
  phase: ProjectPhase
  name: string
  description: string
  isEnabled: boolean
  estimatedDuration: number
  tasks: WorkflowTask[]
}

export interface TeamTemplate {
  name: string
  description: string
  color: string
  defaultObjectives: ObjectiveTemplate[]
  requiredSkills: string[]
}

export interface ObjectiveTemplate {
  title: string
  description: string
  phase: ProjectPhase
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  requiredSkills: string[]
}

// Request/Response types
export interface CreateProjectRequest {
  title: string
  description: string
  template: ProjectTemplate
  eventDetails: EventProject['eventDetails']
  teams?: Omit<ProjectTeam, 'id' | 'createdAt' | 'updatedAt'>[]
  objectives?: Omit<ProjectObjective, 'id' | 'createdAt' | 'updatedAt'>[]
}

export interface UpdateProjectRequest {
  title?: string
  description?: string
  status?: ProjectStatus
  currentPhase?: ProjectPhase
  eventDetails?: Partial<EventProject['eventDetails']>
  workflow?: Partial<ProjectWorkflow>
  templateConfig?: Partial<TemplateConfig>
}

export interface ProjectListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  status?: ProjectStatus
  template?: ProjectTemplate
  phase?: ProjectPhase
  searchTerm?: string
  tags?: string[]
  createdBy?: string
  startDate?: Date
  endDate?: Date
}

export interface ProjectListResponse {
  projects: EventProject[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ProjectStats {
  total: number
  byStatus: Record<ProjectStatus, number>
  byTemplate: Record<ProjectTemplate, number>
  byPhase: Record<ProjectPhase, number>
  averageCompletionTime: number
  totalTeams: number
  totalObjectives: number
  completionRate: number
}