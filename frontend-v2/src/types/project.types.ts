// Types pour les projets d'événements - Frontend
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
  createdAt: string
  updatedAt: string
}

export interface ProjectObjective {
  id: string
  title: string
  description: string
  teamId: string
  phase: ProjectPhase
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string
  assignedTo: string[]
  metrics?: {
    target: number
    current: number
    unit: string
  }
  createdAt: string
  updatedAt: string
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
    registrationDeadline?: string
    confirmationMessage: string
  }
  createdAt: string
  updatedAt: string
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
  
  // Informations de base de l'événement
  eventDetails: {
    eventId?: string // ID de l'événement associé
    type: string
    startDate: string
    endDate: string
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
    // Nouvelles propriétés pour les améliorations
    image?: string // URL de l'image de l'événement
    colorTheme?: string // Couleur principale de l'événement
    timezone?: string // Timezone de l'événement
  }
  
  // Gestion de projet
  teams: ProjectTeam[]
  objectives: ProjectObjective[]
  registrationForm?: RegistrationForm
  
  // Workflow et templates
  workflow: ProjectWorkflow
  templateConfig: TemplateConfig
  
  // Métadonnées
  createdBy: string
  tenantId: string
  createdAt: string
  updatedAt: string
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
  estimatedDuration: number // en jours
  prerequisites: string[]
  tasks: WorkflowTask[]
  isCompleted: boolean
  completedAt?: string
}

export interface WorkflowTask {
  id: string
  title: string
  description: string
  assignedTeam?: string
  estimatedHours: number
  isRequired: boolean
  isCompleted: boolean
  completedAt?: string
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
  metrics?: {
    target: number
    unit: string
  }
}

// Templates prédéfinis
export const PROJECT_TEMPLATES: Record<ProjectTemplate, {
  name: string
  description: string
  icon: string
  color: string
  phases: PhaseCustomization[]
  teams: TeamTemplate[]
  defaultObjectives: ObjectiveTemplate[]
}> = {
  [ProjectTemplate.ACADEMIC]: {
    name: 'Académique',
    description: 'Conférences, formations, séminaires',
    icon: '📚',
    color: 'blue',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Conception & Planning',
        description: 'Définition du programme et des intervenants',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Préparation',
        description: 'Organisation logistique et communication',
        isEnabled: true,
        estimatedDuration: 21,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Exécution',
        description: 'Déroulement de l\'événement',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Clôture',
        description: 'Bilan et suivi post-événement',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Programme',
        description: 'Gestion du contenu et des intervenants',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Expertise métier', 'Coordination']
      },
      {
        name: 'Logistique',
        description: 'Organisation matérielle et technique',
        color: 'green',
        defaultObjectives: [],
        requiredSkills: ['Organisation', 'Technique']
      },
      {
        name: 'Communication',
        description: 'Promotion et relations participants',
        color: 'purple',
        defaultObjectives: [],
        requiredSkills: ['Communication', 'Marketing']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.SPORT]: {
    name: 'Sport',
    description: 'Compétitions, tournois, marathons',
    icon: '🏃',
    color: 'orange',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Planification Sportive',
        description: 'Définition des règles et format de compétition',
        isEnabled: true,
        estimatedDuration: 21,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Préparation Terrain',
        description: 'Mise en place des installations et sécurité',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Compétition',
        description: 'Déroulement de l\'événement sportif',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Résultats & Bilan',
        description: 'Publication des résultats et débriefing',
        isEnabled: true,
        estimatedDuration: 3,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Arbitrage',
        description: 'Officiels et respect des règles',
        color: 'yellow',
        defaultObjectives: [],
        requiredSkills: ['Arbitrage', 'Règlement']
      },
      {
        name: 'Sécurité',
        description: 'Sécurité des participants et spectateurs',
        color: 'red',
        defaultObjectives: [],
        requiredSkills: ['Sécurité', 'Premiers secours']
      },
      {
        name: 'Technique',
        description: 'Installation et maintenance équipements',
        color: 'gray',
        defaultObjectives: [],
        requiredSkills: ['Technique', 'Maintenance']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.COCKTAIL]: {
    name: 'Cocktail',
    description: 'Networking, réceptions, galas',
    icon: '🍸',
    color: 'pink',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Concept & Ambiance',
        description: 'Définition du thème et de l\'ambiance',
        isEnabled: true,
        estimatedDuration: 10,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Organisation',
        description: 'Traiteur, décoration, animation',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Réception',
        description: 'Accueil et animation de la soirée',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Suivi',
        description: 'Remerciements et suivi networking',
        isEnabled: true,
        estimatedDuration: 3,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Accueil',
        description: 'Réception et orientation des invités',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Relationnel', 'Protocole']
      },
      {
        name: 'Service',
        description: 'Coordination traiteur et service',
        color: 'green',
        defaultObjectives: [],
        requiredSkills: ['Service', 'Coordination']
      },
      {
        name: 'Animation',
        description: 'Ambiance et divertissement',
        color: 'purple',
        defaultObjectives: [],
        requiredSkills: ['Animation', 'Créativité']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.PARTY]: {
    name: 'Party',
    description: 'Célébrations, anniversaires, fêtes',
    icon: '🎉',
    color: 'yellow',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Thème & Concept',
        description: 'Choix du thème et planification générale',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Préparatifs',
        description: 'Décoration, musique, animations',
        isEnabled: true,
        estimatedDuration: 10,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Fête',
        description: 'Animation et déroulement de la fête',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Rangement',
        description: 'Nettoyage et bilan',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Décoration',
        description: 'Ambiance visuelle et décoration',
        color: 'pink',
        defaultObjectives: [],
        requiredSkills: ['Créativité', 'Décoration']
      },
      {
        name: 'Animation',
        description: 'Musique et divertissement',
        color: 'orange',
        defaultObjectives: [],
        requiredSkills: ['Animation', 'Musique']
      },
      {
        name: 'Logistique',
        description: 'Organisation pratique',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Organisation', 'Logistique']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.MUSIC]: {
    name: 'Musique',
    description: 'Concerts, festivals, spectacles',
    icon: '🎵',
    color: 'indigo',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Programmation',
        description: 'Sélection des artistes et programmation',
        isEnabled: true,
        estimatedDuration: 30,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Production',
        description: 'Technique, sécurité, logistique',
        isEnabled: true,
        estimatedDuration: 21,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Spectacle',
        description: 'Déroulement du concert/festival',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Démontage',
        description: 'Démontage et bilan artistique',
        isEnabled: true,
        estimatedDuration: 2,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Artistique',
        description: 'Relations artistes et programmation',
        color: 'purple',
        defaultObjectives: [],
        requiredSkills: ['Musique', 'Relations artistes']
      },
      {
        name: 'Technique',
        description: 'Son, éclairage, scène',
        color: 'gray',
        defaultObjectives: [],
        requiredSkills: ['Technique', 'Son', 'Éclairage']
      },
      {
        name: 'Sécurité',
        description: 'Sécurité du public et des artistes',
        color: 'red',
        defaultObjectives: [],
        requiredSkills: ['Sécurité', 'Foule']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.CONFERENCE]: {
    name: 'Conférence',
    description: 'Présentations, symposiums, summits',
    icon: '🎤',
    color: 'teal',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Programme',
        description: 'Définition du programme et speakers',
        isEnabled: true,
        estimatedDuration: 21,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Organisation',
        description: 'Logistique et communication',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Conférence',
        description: 'Déroulement des présentations',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Suivi',
        description: 'Ressources et networking post-événement',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Contenu',
        description: 'Gestion du programme et speakers',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Expertise', 'Coordination']
      },
      {
        name: 'Technique',
        description: 'AV, streaming, enregistrement',
        color: 'gray',
        defaultObjectives: [],
        requiredSkills: ['Technique', 'AV']
      },
      {
        name: 'Participants',
        description: 'Accueil et expérience participants',
        color: 'green',
        defaultObjectives: [],
        requiredSkills: ['Accueil', 'Service']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.WORKSHOP]: {
    name: 'Workshop',
    description: 'Ateliers, formations pratiques',
    icon: '🛠️',
    color: 'amber',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Pédagogie',
        description: 'Conception pédagogique et matériel',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Préparation',
        description: 'Matériel, supports, logistique',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Formation',
        description: 'Animation des ateliers',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Évaluation',
        description: 'Feedback et certification',
        isEnabled: true,
        estimatedDuration: 3,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Formateurs',
        description: 'Animation pédagogique',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Pédagogie', 'Expertise']
      },
      {
        name: 'Support',
        description: 'Assistance technique et logistique',
        color: 'green',
        defaultObjectives: [],
        requiredSkills: ['Support', 'Technique']
      }
    ],
    defaultObjectives: []
  },
  [ProjectTemplate.NETWORKING]: {
    name: 'Networking',
    description: 'Rencontres professionnelles, meetups',
    icon: '🤝',
    color: 'cyan',
    phases: [
      {
        phase: ProjectPhase.CONCEPTION,
        name: 'Ciblage',
        description: 'Définition des profils et objectifs',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      },
      {
        phase: ProjectPhase.PREPARATION,
        name: 'Invitation',
        description: 'Communication et inscriptions',
        isEnabled: true,
        estimatedDuration: 14,
        tasks: []
      },
      {
        phase: ProjectPhase.EXECUTION,
        name: 'Networking',
        description: 'Animation des rencontres',
        isEnabled: true,
        estimatedDuration: 1,
        tasks: []
      },
      {
        phase: ProjectPhase.CLOSURE,
        name: 'Suivi',
        description: 'Mise en relation post-événement',
        isEnabled: true,
        estimatedDuration: 7,
        tasks: []
      }
    ],
    teams: [
      {
        name: 'Animation',
        description: 'Facilitation des échanges',
        color: 'purple',
        defaultObjectives: [],
        requiredSkills: ['Animation', 'Relationnel']
      },
      {
        name: 'Logistique',
        description: 'Organisation pratique',
        color: 'blue',
        defaultObjectives: [],
        requiredSkills: ['Organisation', 'Accueil']
      }
    ],
    defaultObjectives: []
  }
}

// Utilitaires
export const getTemplateConfig = (template: ProjectTemplate) => PROJECT_TEMPLATES[template]

export const getPhaseColor = (phase: ProjectPhase): string => {
  const colors = {
    [ProjectPhase.CONCEPTION]: 'blue',
    [ProjectPhase.PREPARATION]: 'orange',
    [ProjectPhase.EXECUTION]: 'green',
    [ProjectPhase.CLOSURE]: 'purple'
  }
  return colors[phase]
}

export const getStatusColor = (status: ProjectStatus): string => {
  const colors = {
    [ProjectStatus.DRAFT]: 'gray',
    [ProjectStatus.PLANNING]: 'blue',
    [ProjectStatus.PREPARATION]: 'orange',
    [ProjectStatus.EXECUTION]: 'green',
    [ProjectStatus.COMPLETED]: 'emerald',
    [ProjectStatus.CANCELLED]: 'red'
  }
  return colors[status]
}