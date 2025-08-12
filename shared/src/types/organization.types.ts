// shared/src/types/organization.types.ts - Types pour les organisations

export interface Organization {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  sector: OrganizationSector;
  status: OrganizationStatus;
  settings: OrganizationSettings;
  branding: OrganizationBranding;
  subscription: OrganizationSubscription;
  contactInfo: OrganizationContactInfo;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  memberCount: number;
  maxMembers?: number;
  isActive: boolean;
  features: OrganizationFeatures;
  metadata: Record<string, any>;
}

export interface OrganizationSettings {
  timezone?: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  currency?: string;
  workingHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    workingDays: number[]; // 0-6, 0 = Sunday
  };
  notifications?: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  };
  security?: {
    requireTwoFactor: boolean;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    sessionTimeout: number; // minutes
    allowedDomains?: string[];
  };
  integrations?: {
    allowedIntegrations: string[];
    webhookUrl?: string;
    apiKeys: Record<string, string>;
  };
}

export interface OrganizationBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  favicon?: string;
  emailTemplate?: {
    headerColor: string;
    footerText: string;
    logoUrl?: string;
  };
}

export interface OrganizationSubscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxUsers: number;
    maxEvents: number;
    maxStorage: number; // in MB
    maxIntegrations: number;
  };
  paymentMethod?: {
    type: 'card' | 'bank' | 'invoice';
    lastFour?: string;
    expiryDate?: string;
  };
}

export interface OrganizationContactInfo {
  email: string;
  phone?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

export interface OrganizationFeatures {
  attendance: boolean;
  events: boolean;
  appointments: boolean;
  analytics: boolean;
  integrations: boolean;
  customBranding: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  ssoIntegration: boolean;
  auditLogs: boolean;
}

export enum OrganizationSector {
  EDUCATION = 'education',
  HEALTHCARE = 'healthcare',
  CORPORATE = 'corporate',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  HOSPITALITY = 'hospitality',
  CONSULTING = 'consulting',
  OTHER = 'other'
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  TRIAL = 'trial',
  EXPIRED = 'expired'
}

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  permissions: string[];
  joinedAt: Date;
  invitedBy?: string;
  isActive: boolean;
  lastActiveAt?: Date;
  department?: string;
  jobTitle?: string;
  metadata: Record<string, any>;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  permissions: string[];
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  token: string;
  status: OrganizationInvitationStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  message?: string;
  metadata: Record<string, any>;
}

export enum OrganizationInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface OrganizationTemplate {
  id: string;
  name: string;
  sector: OrganizationSector;
  description: string;
  settings: Partial<OrganizationSettings>;
  branding: Partial<OrganizationBranding>;
  features: Partial<OrganizationFeatures>;
  defaultRoles: Array<{
    name: string;
    role: OrganizationRole;
    permissions: string[];
  }>;
  sampleData?: {
    departments: string[];
    eventTypes: string[];
    appointmentTypes: string[];
  };
}

export interface CreateOrganizationRequest {
  name: string;
  displayName?: string;
  description?: string;
  sector: OrganizationSector;
  contactInfo: Omit<OrganizationContactInfo, 'socialMedia'>;
  settings?: Partial<OrganizationSettings>;
  branding?: Partial<OrganizationBranding>;
  templateId?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  displayName?: string;
  description?: string;
  contactInfo?: Partial<OrganizationContactInfo>;
  settings?: Partial<OrganizationSettings>;
  branding?: Partial<OrganizationBranding>;
  features?: Partial<OrganizationFeatures>;
}

export interface OrganizationStats {
  memberCount: number;
  activeMembers: number;
  totalEvents: number;
  totalAppointments: number;
  storageUsed: number; // in MB
  apiCallsThisMonth: number;
  lastActivity: Date;
  growthMetrics: {
    membersThisMonth: number;
    eventsThisMonth: number;
    appointmentsThisMonth: number;
  };
}

export interface OrganizationAuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Permissions système
export const ORGANIZATION_PERMISSIONS = {
  // Gestion de l'organisation
  MANAGE_ORGANIZATION: 'manage_organization',
  VIEW_ORGANIZATION: 'view_organization',
  UPDATE_ORGANIZATION_SETTINGS: 'update_organization_settings',
  MANAGE_ORGANIZATION_BRANDING: 'manage_organization_branding',
  
  // Gestion des membres
  MANAGE_MEMBERS: 'manage_members',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  VIEW_MEMBERS: 'view_members',
  ASSIGN_ROLES: 'assign_roles',
  
  // Gestion des événements
  MANAGE_EVENTS: 'manage_events',
  CREATE_EVENTS: 'create_events',
  VIEW_ALL_EVENTS: 'view_all_events',
  DELETE_EVENTS: 'delete_events',
  
  // Gestion des rendez-vous
  MANAGE_APPOINTMENTS: 'manage_appointments',
  CREATE_APPOINTMENTS: 'create_appointments',
  VIEW_ALL_APPOINTMENTS: 'view_all_appointments',
  DELETE_APPOINTMENTS: 'delete_appointments',
  
  // Rapports et analytiques
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  
  // Intégrations
  MANAGE_INTEGRATIONS: 'manage_integrations',
  VIEW_API_KEYS: 'view_api_keys',
  MANAGE_WEBHOOKS: 'manage_webhooks',
  
  // Administration système
  MANAGE_BILLING: 'manage_billing',
  VIEW_USAGE_STATS: 'view_usage_stats',
  MANAGE_SECURITY: 'manage_security'
} as const;

export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[keyof typeof ORGANIZATION_PERMISSIONS];

// Rôles par défaut avec leurs permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermission[]> = {
  [OrganizationRole.OWNER]: Object.values(ORGANIZATION_PERMISSIONS),
  [OrganizationRole.ADMIN]: [
    ORGANIZATION_PERMISSIONS.VIEW_ORGANIZATION,
    ORGANIZATION_PERMISSIONS.UPDATE_ORGANIZATION_SETTINGS,
    ORGANIZATION_PERMISSIONS.MANAGE_MEMBERS,
    ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
    ORGANIZATION_PERMISSIONS.REMOVE_MEMBERS,
    ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
    ORGANIZATION_PERMISSIONS.ASSIGN_ROLES,
    ORGANIZATION_PERMISSIONS.MANAGE_EVENTS,
    ORGANIZATION_PERMISSIONS.CREATE_EVENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ALL_EVENTS,
    ORGANIZATION_PERMISSIONS.DELETE_EVENTS,
    ORGANIZATION_PERMISSIONS.MANAGE_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.CREATE_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.DELETE_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ANALYTICS,
    ORGANIZATION_PERMISSIONS.EXPORT_DATA,
    ORGANIZATION_PERMISSIONS.VIEW_AUDIT_LOGS,
    ORGANIZATION_PERMISSIONS.MANAGE_INTEGRATIONS,
    ORGANIZATION_PERMISSIONS.VIEW_USAGE_STATS
  ],
  [OrganizationRole.MANAGER]: [
    ORGANIZATION_PERMISSIONS.VIEW_ORGANIZATION,
    ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
    ORGANIZATION_PERMISSIONS.INVITE_MEMBERS,
    ORGANIZATION_PERMISSIONS.MANAGE_EVENTS,
    ORGANIZATION_PERMISSIONS.CREATE_EVENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ALL_EVENTS,
    ORGANIZATION_PERMISSIONS.MANAGE_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.CREATE_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ALL_APPOINTMENTS,
    ORGANIZATION_PERMISSIONS.VIEW_ANALYTICS,
    ORGANIZATION_PERMISSIONS.EXPORT_DATA
  ],
  [OrganizationRole.MEMBER]: [
    ORGANIZATION_PERMISSIONS.VIEW_ORGANIZATION,
    ORGANIZATION_PERMISSIONS.VIEW_MEMBERS,
    ORGANIZATION_PERMISSIONS.CREATE_EVENTS,
    ORGANIZATION_PERMISSIONS.CREATE_APPOINTMENTS
  ],
  [OrganizationRole.VIEWER]: [
    ORGANIZATION_PERMISSIONS.VIEW_ORGANIZATION,
    ORGANIZATION_PERMISSIONS.VIEW_MEMBERS
  ]
};

// Templates par secteur
export const SECTOR_TEMPLATES: Record<OrganizationSector, Partial<OrganizationTemplate>> = {
  [OrganizationSector.EDUCATION]: {
    name: 'Établissement d\'enseignement',
    settings: {
      workingHours: {
        start: '08:00',
        end: '18:00',
        workingDays: [1, 2, 3, 4, 5] // Lundi à vendredi
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'weekly'
      }
    },
    sampleData: {
      departments: ['Administration', 'Enseignement', 'Recherche', 'Services aux étudiants'],
      eventTypes: ['Cours', 'Conférence', 'Examen', 'Réunion pédagogique'],
      appointmentTypes: ['Consultation étudiante', 'Réunion parent-professeur', 'Orientation']
    }
  },
  [OrganizationSector.HEALTHCARE]: {
    name: 'Établissement de santé',
    settings: {
      workingHours: {
        start: '07:00',
        end: '19:00',
        workingDays: [1, 2, 3, 4, 5, 6] // Lundi à samedi
      },
      security: {
        requireTwoFactor: true,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true
        },
        sessionTimeout: 30
      }
    },
    sampleData: {
      departments: ['Urgences', 'Médecine générale', 'Chirurgie', 'Pédiatrie', 'Administration'],
      eventTypes: ['Formation médicale', 'Réunion d\'équipe', 'Conférence', 'Audit qualité'],
      appointmentTypes: ['Consultation', 'Suivi médical', 'Examen', 'Vaccination']
    }
  },
  [OrganizationSector.CORPORATE]: {
    name: 'Entreprise',
    settings: {
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        digestFrequency: 'daily'
      }
    },
    sampleData: {
      departments: ['Direction', 'RH', 'Finance', 'Marketing', 'IT', 'Ventes'],
      eventTypes: ['Réunion', 'Formation', 'Présentation', 'Team building'],
      appointmentTypes: ['Entretien RH', 'Réunion client', 'Coaching', 'Évaluation']
    }
  },
  [OrganizationSector.GOVERNMENT]: {
    name: 'Administration publique',
    settings: {
      workingHours: {
        start: '08:30',
        end: '17:30',
        workingDays: [1, 2, 3, 4, 5]
      },
      security: {
        requireTwoFactor: true,
        passwordPolicy: {
          minLength: 10,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false
        },
        sessionTimeout: 60
      }
    },
    sampleData: {
      departments: ['Administration', 'Services aux citoyens', 'Finances', 'Urbanisme'],
      eventTypes: ['Conseil municipal', 'Réunion publique', 'Formation', 'Audit'],
      appointmentTypes: ['Rendez-vous citoyen', 'Consultation', 'Démarche administrative']
    }
  },
  [OrganizationSector.NON_PROFIT]: {
    name: 'Organisation à but non lucratif',
    settings: {
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    sampleData: {
      departments: ['Direction', 'Programmes', 'Fundraising', 'Communication', 'Bénévoles'],
      eventTypes: ['Assemblée générale', 'Formation bénévoles', 'Événement fundraising'],
      appointmentTypes: ['Entretien bénévole', 'Consultation', 'Réunion donateur']
    }
  },
  [OrganizationSector.TECHNOLOGY]: {
    name: 'Entreprise technologique',
    settings: {
      workingHours: {
        start: '10:00',
        end: '18:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    sampleData: {
      departments: ['Développement', 'Product', 'Design', 'DevOps', 'QA', 'Support'],
      eventTypes: ['Sprint planning', 'Demo', 'Tech talk', 'Hackathon'],
      appointmentTypes: ['Code review', '1-on-1', 'Architecture review', 'Support client']
    }
  },
  [OrganizationSector.FINANCE]: {
    name: 'Institution financière',
    settings: {
      workingHours: {
        start: '08:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      },
      security: {
        requireTwoFactor: true,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true
        },
        sessionTimeout: 30
      }
    },
    sampleData: {
      departments: ['Front Office', 'Back Office', 'Risk Management', 'Compliance', 'IT'],
      eventTypes: ['Comité de direction', 'Formation compliance', 'Audit', 'Présentation'],
      appointmentTypes: ['Conseil client', 'Évaluation crédit', 'Réunion investissement']
    }
  },
  [OrganizationSector.RETAIL]: {
    name: 'Commerce de détail',
    settings: {
      workingHours: {
        start: '09:00',
        end: '19:00',
        workingDays: [1, 2, 3, 4, 5, 6]
      }
    },
    sampleData: {
      departments: ['Ventes', 'Stock', 'Marketing', 'Service client', 'Administration'],
      eventTypes: ['Formation produit', 'Réunion équipe', 'Lancement produit', 'Inventaire'],
      appointmentTypes: ['Conseil client', 'Service après-vente', 'Formation vendeur']
    }
  },
  [OrganizationSector.MANUFACTURING]: {
    name: 'Industrie manufacturière',
    settings: {
      workingHours: {
        start: '07:00',
        end: '15:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    sampleData: {
      departments: ['Production', 'Qualité', 'Maintenance', 'Logistique', 'Administration'],
      eventTypes: ['Briefing sécurité', 'Formation technique', 'Audit qualité', 'Réunion production'],
      appointmentTypes: ['Entretien maintenance', 'Contrôle qualité', 'Formation sécurité']
    }
  },
  [OrganizationSector.HOSPITALITY]: {
    name: 'Hôtellerie et restauration',
    settings: {
      workingHours: {
        start: '06:00',
        end: '23:00',
        workingDays: [1, 2, 3, 4, 5, 6, 0] // 7 jours sur 7
      }
    },
    sampleData: {
      departments: ['Réception', 'Restauration', 'Housekeeping', 'Événementiel', 'Administration'],
      eventTypes: ['Briefing équipe', 'Formation service', 'Événement client', 'Réunion management'],
      appointmentTypes: ['Réservation', 'Consultation événement', 'Service client']
    }
  },
  [OrganizationSector.CONSULTING]: {
    name: 'Cabinet de conseil',
    settings: {
      workingHours: {
        start: '09:00',
        end: '18:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    sampleData: {
      departments: ['Consulting', 'Business Development', 'Administration', 'Research'],
      eventTypes: ['Présentation client', 'Workshop', 'Formation', 'Réunion interne'],
      appointmentTypes: ['Consultation client', 'Entretien candidat', 'Réunion projet']
    }
  },
  [OrganizationSector.OTHER]: {
    name: 'Autre secteur',
    settings: {
      workingHours: {
        start: '09:00',
        end: '17:00',
        workingDays: [1, 2, 3, 4, 5]
      }
    },
    sampleData: {
      departments: ['Administration', 'Opérations', 'Support'],
      eventTypes: ['Réunion', 'Formation', 'Présentation'],
      appointmentTypes: ['Consultation', 'Réunion', 'Entretien']
    }
  }
};