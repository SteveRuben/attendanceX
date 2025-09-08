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
  SERVICES = 'services',
  ASSOCIATION = 'association',
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
  defaultRoles?: Array<{
    name: string;
    role: OrganizationRole;
    permissions: string[];
  }>;
  preview: {
    features: string[],
    benefits: string[],
  }
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
export const SECTOR_TEMPLATES: Record<OrganizationSector, OrganizationTemplate[]> = {
  [OrganizationSector.SERVICES]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: true,
            requireSymbols: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
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
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      }
    }
  ],
  [OrganizationSector.HOSPITALITY]: [{
    id: 'services-basic',
    name: 'Configuration de base',
    description: 'Configuration simple pour les entreprises de services',
    sector: OrganizationSector.SERVICES,
    features: {
      appointments: true,
      attendance: true,
      events: true
    },
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#EF4444'
    },
    settings: {
      notifications: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        digestFrequency: "daily"
      },
      security: {
        requireTwoFactor: false,
        passwordPolicy: {
          minLength: 8,
          requireSymbols: false,
          requireNumbers: true,
          requireUppercase: false,
          requireLowercase: false
        },
        sessionTimeout: 0
      }
    },
    preview: {
      features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
      benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
    }
  },
  {
    id: 'services-advanced',
    name: 'Configuration avancée',
    description: 'Configuration complète avec toutes les fonctionnalités',
    sector: OrganizationSector.SERVICES,
    features: {
      appointments: true,
      attendance: true,
      events: true
    },
    branding: {
      primaryColor: '#059669',
      secondaryColor: '#DC2626'
    },
    settings: {
      notifications: {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        digestFrequency: "daily"
      },
      security: {
        requireTwoFactor: true,
        passwordPolicy: {
          minLength: 12,
          requireSymbols: true,
          requireNumbers: true,
          requireUppercase: false,
          requireLowercase: false
        },
        sessionTimeout: 0
      }
    },
    preview: {
      features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
      benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
    }
  }
  ],

  [OrganizationSector.HEALTHCARE]: [
    {
      id: 'healthcare-clinic',
      name: 'Clinique médicale',
      description: 'Configuration sécurisée pour les établissements de santé',
      sector: OrganizationSector.HEALTHCARE,
      features: {
        appointments: true,
        attendance: true,
        events: false
      },
      branding: {
        primaryColor: '#10B981',
        secondaryColor: '#3B82F6'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Rendez-vous médicaux', 'Dossiers patients', 'Sécurité RGPD', 'Rappels automatiques'],
        benefits: ['Conformité réglementaire', 'Sécurité maximale', 'Gestion des patients']
      },
      sampleData: {
        departments: ['Urgences', 'Médecine générale', 'Chirurgie', 'Pédiatrie', 'Administration'],
        eventTypes: ['Formation médicale', 'Réunion d\'équipe', 'Conférence', 'Audit qualité'],
        appointmentTypes: ['Consultation', 'Suivi médical', 'Examen', 'Vaccination']
      }
    }
  ],
  [OrganizationSector.EDUCATION]: [
    {
      id: 'education-school',
      name: 'Établissement scolaire',
      description: 'Configuration pour écoles et centres de formation',
      sector: OrganizationSector.EDUCATION,
      features: {
        appointments: false,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#7C3AED',
        secondaryColor: '#F59E0B'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Suivi de présence', 'Gestion des événements', 'Communication parents', 'Rapports académiques'],
        benefits: ['Suivi pédagogique', 'Communication facilitée', 'Rapports détaillés']
      },
      sampleData: {
        departments: ['Administration', 'Enseignement', 'Recherche', 'Services aux étudiants'],
        eventTypes: ['Cours', 'Conférence', 'Examen', 'Réunion pédagogique'],
        appointmentTypes: ['Consultation étudiante', 'Réunion parent-professeur', 'Orientation']
      }
    }
  ],
  [OrganizationSector.RETAIL]: [
    {
      id: 'retail-store',
      name: 'Commerce de détail',
      description: 'Configuration pour magasins et boutiques',
      sector: OrganizationSector.RETAIL,
      features: {
        appointments: false,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#F59E0B',
        secondaryColor: '#EF4444'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des ventes', 'Inventaire produits', 'Fidélité client', 'Événements promotionnels'],
        benefits: ['Suivi des ventes', 'Gestion des stocks', 'Marketing ciblé']
      }
    }
  ],
  [OrganizationSector.CONSULTING]: [
    {
      id: 'consulting-firm',
      name: 'Cabinet de conseil',
      description: 'Configuration pour consultants et cabinets',
      sector: OrganizationSector.CONSULTING,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#374151',
        secondaryColor: '#6B7280'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Rendez-vous clients', 'Suivi des projets', 'Gestion d\'équipe', 'Événements professionnels'],
        benefits: ['Professionnalisme', 'Sécurité des données', 'Collaboration d\'équipe']
      }
    }
  ],
  [OrganizationSector.ASSOCIATION]: [
    {
      id: 'association-nonprofit',
      name: 'Association',
      description: 'Configuration pour associations et organisations à but non lucratif',
      sector: OrganizationSector.ASSOCIATION,
      features: {
        appointments: false,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des membres', 'Événements associatifs', 'Communication', 'Bénévolat'],
        benefits: ['Gestion communautaire', 'Événements simplifiés', 'Communication efficace']
      }
    }
  ],
  [OrganizationSector.OTHER]: [
    {
      id: 'other-basic',
      name: 'Configuration personnalisée',
      description: 'Configuration de base adaptable à votre secteur',
      sector: OrganizationSector.OTHER,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#6B7280',
        secondaryColor: '#374151'
      }, settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Fonctionnalités de base', 'Personnalisation complète', 'Évolutivité', 'Support dédié'],
        benefits: ['Flexibilité maximale', 'Adaptation sur mesure', 'Évolution possible']
      }
    }
  ],
  [OrganizationSector.CORPORATE]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      }, settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      },
      sampleData: {
        departments: ['Administration', 'Services aux citoyens', 'Finances', 'Urbanisme'],
        eventTypes: ['Conseil municipal', 'Réunion publique', 'Formation', 'Audit'],
        appointmentTypes: ['Rendez-vous citoyen', 'Consultation', 'Démarche administrative']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES, features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      },
      sampleData: {
        departments: ['Administration', 'Services aux citoyens', 'Finances', 'Urbanisme'],
        eventTypes: ['Conseil municipal', 'Réunion publique', 'Formation', 'Audit'],
        appointmentTypes: ['Rendez-vous citoyen', 'Consultation', 'Démarche administrative']
      }
    }
  ],
  [OrganizationSector.GOVERNMENT]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES, features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      }
    }
  ],
  [OrganizationSector.NON_PROFIT]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES, features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      },
      settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES, features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      }
    }
  ],
  [OrganizationSector.TECHNOLOGY]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES, features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      },
      sampleData: {
        departments: ['Front Office', 'Back Office', 'Risk Management', 'Compliance', 'IT'],
        eventTypes: ['Comité de direction', 'Formation compliance', 'Audit', 'Présentation'],
        appointmentTypes: ['Conseil client', 'Évaluation crédit', 'Réunion investissement']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      }, settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      },
      sampleData: {
        departments: ['Front Office', 'Back Office', 'Risk Management', 'Compliance', 'IT'],
        eventTypes: ['Comité de direction', 'Formation compliance', 'Audit', 'Présentation'],
        appointmentTypes: ['Conseil client', 'Évaluation crédit', 'Réunion investissement']
      }
    }
  ],
  [OrganizationSector.FINANCE]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      },
      settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      },
      sampleData: {
        departments: ['Front Office', 'Back Office', 'Risk Management', 'Compliance', 'IT'],
        eventTypes: ['Comité de direction', 'Formation compliance', 'Audit', 'Présentation'],
        appointmentTypes: ['Conseil client', 'Évaluation crédit', 'Réunion investissement']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      }, settings: {
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      },
      sampleData: {
        departments: ['Front Office', 'Back Office', 'Risk Management', 'Compliance', 'IT'],
        eventTypes: ['Comité de direction', 'Formation compliance', 'Audit', 'Présentation'],
        appointmentTypes: ['Conseil client', 'Évaluation crédit', 'Réunion investissement']
      }
    }
  ],
  [OrganizationSector.MANUFACTURING]: [
    {
      id: 'services-basic',
      name: 'Configuration de base',
      description: 'Configuration simple pour les entreprises de services',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#EF4444'
      }, settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: false,
          passwordPolicy: {
            minLength: 8,
            requireSymbols: false,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Gestion des rendez-vous', 'Suivi de présence', 'Gestion clients', 'Événements'],
        benefits: ['Interface simple', 'Démarrage rapide', 'Fonctionnalités essentielles']
      },
      sampleData: {
        departments: ['Production', 'Qualité', 'Maintenance', 'Logistique', 'Administration'],
        eventTypes: ['Briefing sécurité', 'Formation technique', 'Audit qualité', 'Réunion production'],
        appointmentTypes: ['Entretien maintenance', 'Contrôle qualité', 'Formation sécurité']
      }
    },
    {
      id: 'services-advanced',
      name: 'Configuration avancée',
      description: 'Configuration complète avec toutes les fonctionnalités',
      sector: OrganizationSector.SERVICES,
      features: {
        appointments: true,
        attendance: true,
        events: true
      },
      branding: {
        primaryColor: '#059669',
        secondaryColor: '#DC2626'
      }, settings: {

        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: false,
          digestFrequency: "daily"
        },
        security: {
          requireTwoFactor: true,
          passwordPolicy: {
            minLength: 12,
            requireSymbols: true,
            requireNumbers: true,
            requireUppercase: false,
            requireLowercase: false
          },
          sessionTimeout: 0
        }
      },
      preview: {
        features: ['Toutes les fonctionnalités', 'Ventes et produits', 'Notifications SMS', 'Sécurité renforcée'],
        benefits: ['Solution complète', 'Évolutivité maximale', 'Sécurité avancée']
      },
      sampleData: {
        departments: ['Production', 'Qualité', 'Maintenance', 'Logistique', 'Administration'],
        eventTypes: ['Briefing sécurité', 'Formation technique', 'Audit qualité', 'Réunion production'],
        appointmentTypes: ['Entretien maintenance', 'Contrôle qualité', 'Formation sécurité']
      }
    }
  ]
};