// Types pour le constructeur de formulaires avancé

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  FILE = 'file',
  IMAGE = 'image',
  URL = 'url',
  RATING = 'rating',
  SLIDER = 'slider',
  SIGNATURE = 'signature',
  LOCATION = 'location',
  DIVIDER = 'divider',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph'
}

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormFieldOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
}

export interface FormFieldProperties {
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: FormFieldOption[];
  multiple?: boolean;
  allowOther?: boolean;
  columns?: number;
  rows?: number;
  accept?: string; // Pour les fichiers
  maxFileSize?: number; // En MB
  maxFiles?: number;
  aspectRatio?: string; // Pour les images
  showMap?: boolean; // Pour la localisation
  ratingMax?: number; // Pour les ratings
  ratingIcon?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  showLabels?: boolean;
  currency?: string; // Pour les champs monétaires
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  margin?: number;
  padding?: number;
}

export interface FormFieldCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  validation: FormFieldValidation;
  properties: FormFieldProperties;
  conditions?: FormFieldCondition[];
  sectionId?: string;
  order: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
  isVisible?: boolean;
  isRequired?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  conditions?: FormFieldCondition[];
  backgroundColor?: string;
  borderColor?: string;
  padding?: number;
  margin?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  sections: FormSection[];
  fields: FormField[];
  isPublic: boolean;
  tags: string[];
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSettings {
  title: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
  allowMultipleSubmissions?: boolean;
  requireAuthentication?: boolean;
  collectEmail?: boolean;
  collectName?: boolean;
  showProgressBar?: boolean;
  allowSaveAndContinue?: boolean;
  enableNotifications?: boolean;
  notificationEmail?: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    borderRadius?: number;
  };
  captcha?: {
    enabled: boolean;
    provider?: 'recaptcha' | 'hcaptcha';
    siteKey?: string;
  };
  analytics?: {
    enabled: boolean;
    trackingId?: string;
  };
}

export interface FormData {
  id: string;
  settings: FormSettings;
  sections: FormSection[];
  fields: FormField[];
  template?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  submissions: number;
  lastSubmission?: Date;
  createdBy: string;
  tenantId: string;
  projectId?: string;
  eventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedBy?: string;
  submitterEmail?: string;
  submitterName?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  completionTime?: number; // En secondes
  isComplete: boolean;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormAnalytics {
  formId: string;
  totalViews: number;
  totalSubmissions: number;
  completionRate: number;
  averageCompletionTime: number;
  abandonmentRate: number;
  fieldAnalytics: Record<string, {
    views: number;
    interactions: number;
    completions: number;
    averageTime: number;
    errorRate: number;
  }>;
  conversionFunnel: Array<{
    step: string;
    views: number;
    completions: number;
    dropoffRate: number;
  }>;
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  timeAnalytics: {
    hourly: Record<string, number>;
    daily: Record<string, number>;
    monthly: Record<string, number>;
  };
}

// Templates prédéfinis par type d'événement
export const FORM_TEMPLATES: Record<string, Partial<FormTemplate>> = {
  eventRegistration: {
    name: 'Inscription Événement',
    description: 'Formulaire standard pour l\'inscription à un événement',
    category: 'event',
    sections: [
      {
        id: 'personal-info',
        title: 'Informations Personnelles',
        description: 'Vos informations de base',
        order: 1,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'event-preferences',
        title: 'Préférences pour l\'Événement',
        description: 'Vos préférences et attentes',
        order: 2,
        isCollapsible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    fields: [
      {
        id: 'firstName',
        type: FormFieldType.TEXT,
        label: 'Prénom',
        name: 'firstName',
        sectionId: 'personal-info',
        order: 1,
        width: 'half',
        validation: { required: true, minLength: 2, maxLength: 50 },
        properties: { placeholder: 'Votre prénom' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'lastName',
        type: FormFieldType.TEXT,
        label: 'Nom',
        name: 'lastName',
        sectionId: 'personal-info',
        order: 2,
        width: 'half',
        validation: { required: true, minLength: 2, maxLength: 50 },
        properties: { placeholder: 'Votre nom de famille' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        name: 'email',
        sectionId: 'personal-info',
        order: 3,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'votre.email@exemple.com' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'phone',
        type: FormFieldType.PHONE,
        label: 'Numéro de téléphone',
        name: 'phone',
        sectionId: 'personal-info',
        order: 4,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: '+33 1 23 45 67 89' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'city',
        type: FormFieldType.TEXT,
        label: 'Ville',
        name: 'city',
        sectionId: 'personal-info',
        order: 5,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre ville' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'profilePhoto',
        type: FormFieldType.IMAGE,
        label: 'Photo pour le filtre',
        name: 'profilePhoto',
        sectionId: 'personal-info',
        order: 6,
        width: 'half',
        validation: { required: false },
        properties: { 
          helpText: 'Photo utilisée pour générer votre filtre personnalisé',
          accept: 'image/*',
          maxFileSize: 5,
          aspectRatio: '1:1'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'expectations',
        type: FormFieldType.TEXTAREA,
        label: 'Vos attentes',
        name: 'expectations',
        sectionId: 'event-preferences',
        order: 7,
        width: 'full',
        validation: { required: false, maxLength: 500 },
        properties: { 
          placeholder: 'Que souhaitez-vous retirer de cet événement ?',
          rows: 4,
          helpText: 'Partagez vos attentes pour nous aider à personnaliser votre expérience'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },
  
  conference: {
    name: 'Inscription Conférence',
    description: 'Formulaire spécialisé pour les conférences',
    category: 'conference',
    fields: [
      {
        id: 'company',
        type: FormFieldType.TEXT,
        label: 'Entreprise',
        name: 'company',
        order: 8,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Nom de votre entreprise' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'jobTitle',
        type: FormFieldType.TEXT,
        label: 'Poste',
        name: 'jobTitle',
        order: 9,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre fonction' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'industry',
        type: FormFieldType.SELECT,
        label: 'Secteur d\'activité',
        name: 'industry',
        order: 10,
        width: 'full',
        validation: { required: true },
        properties: {
          options: [
            { label: 'Technologie', value: 'tech' },
            { label: 'Finance', value: 'finance' },
            { label: 'Santé', value: 'health' },
            { label: 'Éducation', value: 'education' },
            { label: 'Commerce', value: 'retail' },
            { label: 'Autre', value: 'other' }
          ],
          allowOther: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },

  workshop: {
    name: 'Inscription Atelier',
    description: 'Formulaire pour les ateliers pratiques',
    category: 'workshop',
    fields: [
      {
        id: 'skillLevel',
        type: FormFieldType.RADIO,
        label: 'Niveau d\'expérience',
        name: 'skillLevel',
        order: 8,
        width: 'full',
        validation: { required: true },
        properties: {
          options: [
            { label: 'Débutant', value: 'beginner' },
            { label: 'Intermédiaire', value: 'intermediate' },
            { label: 'Avancé', value: 'advanced' },
            { label: 'Expert', value: 'expert' }
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'equipment',
        type: FormFieldType.CHECKBOX,
        label: 'Équipement disponible',
        name: 'equipment',
        order: 9,
        width: 'full',
        validation: { required: false },
        properties: {
          options: [
            { label: 'Ordinateur portable', value: 'laptop' },
            { label: 'Tablette', value: 'tablet' },
            { label: 'Smartphone', value: 'smartphone' },
            { label: 'Aucun', value: 'none' }
          ],
          multiple: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  },

  training: {
    name: 'Inscription Formation',
    description: 'Formulaire pour les formations professionnelles',
    category: 'training',
    fields: [
      {
        id: 'currentRole',
        type: FormFieldType.TEXT,
        label: 'Poste actuel',
        name: 'currentRole',
        order: 8,
        width: 'full',
        validation: { required: true },
        properties: { placeholder: 'Décrivez votre poste actuel' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'learningGoals',
        type: FormFieldType.TEXTAREA,
        label: 'Objectifs d\'apprentissage',
        name: 'learningGoals',
        order: 9,
        width: 'full',
        validation: { required: true, maxLength: 300 },
        properties: { 
          placeholder: 'Que souhaitez-vous apprendre ?',
          rows: 3
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'certification',
        type: FormFieldType.RADIO,
        label: 'Certification souhaitée',
        name: 'certification',
        order: 10,
        width: 'full',
        validation: { required: true },
        properties: {
          options: [
            { label: 'Oui, je souhaite obtenir une certification', value: 'yes' },
            { label: 'Non, formation pour information seulement', value: 'no' },
            { label: 'Je ne sais pas encore', value: 'maybe' }
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
};

// Templates complets avec toutes les propriétés requises
export const COMPLETE_FORM_TEMPLATES: Record<string, FormTemplate> = {
  eventRegistration: {
    id: 'eventRegistration',
    name: 'Inscription Événement',
    description: 'Formulaire standard pour l\'inscription à un événement',
    category: 'Événement',
    icon: '🎤',
    sections: [
      {
        id: 'personal-info',
        title: 'Informations Personnelles',
        description: 'Vos informations de base',
        order: 1,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'event-preferences',
        title: 'Préférences pour l\'Événement',
        description: 'Vos préférences et attentes',
        order: 2,
        isCollapsible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    fields: [
      {
        id: 'firstName',
        type: FormFieldType.TEXT,
        label: 'Prénom',
        name: 'firstName',
        sectionId: 'personal-info',
        order: 1,
        width: 'half',
        validation: { required: true, minLength: 2, maxLength: 50 },
        properties: { placeholder: 'Votre prénom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'lastName',
        type: FormFieldType.TEXT,
        label: 'Nom',
        name: 'lastName',
        sectionId: 'personal-info',
        order: 2,
        width: 'half',
        validation: { required: true, minLength: 2, maxLength: 50 },
        properties: { placeholder: 'Votre nom de famille' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        name: 'email',
        sectionId: 'personal-info',
        order: 3,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'votre.email@exemple.com' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'expectations',
        type: FormFieldType.TEXTAREA,
        label: 'Vos attentes',
        name: 'expectations',
        sectionId: 'event-preferences',
        order: 4,
        width: 'full',
        validation: { required: false, maxLength: 500 },
        properties: { 
          placeholder: 'Que souhaitez-vous retirer de cet événement ?',
          rows: 4,
          helpText: 'Partagez vos attentes pour nous aider à personnaliser votre expérience'
        },
        isVisible: true,
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    isPublic: true,
    tags: ['événement', 'inscription', 'standard'],
    usageCount: 150,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  conference: {
    id: 'conference',
    name: 'Inscription Conférence',
    description: 'Formulaire spécialisé pour les conférences professionnelles',
    category: 'Professionnel',
    icon: '🛠️',
    sections: [
      {
        id: 'personal-info',
        title: 'Informations Personnelles',
        description: 'Vos informations de base',
        order: 1,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'professional-info',
        title: 'Informations Professionnelles',
        description: 'Votre contexte professionnel',
        order: 2,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    fields: [
      {
        id: 'firstName',
        type: FormFieldType.TEXT,
        label: 'Prénom',
        name: 'firstName',
        sectionId: 'personal-info',
        order: 1,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre prénom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'lastName',
        type: FormFieldType.TEXT,
        label: 'Nom',
        name: 'lastName',
        sectionId: 'personal-info',
        order: 2,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre nom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        name: 'email',
        sectionId: 'personal-info',
        order: 3,
        width: 'full',
        validation: { required: true },
        properties: { placeholder: 'votre.email@entreprise.com' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'company',
        type: FormFieldType.TEXT,
        label: 'Entreprise',
        name: 'company',
        sectionId: 'professional-info',
        order: 4,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Nom de votre entreprise' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'jobTitle',
        type: FormFieldType.TEXT,
        label: 'Poste',
        name: 'jobTitle',
        sectionId: 'professional-info',
        order: 5,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre fonction' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    isPublic: true,
    tags: ['conférence', 'professionnel', 'entreprise'],
    usageCount: 89,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  workshop: {
    id: 'workshop',
    name: 'Inscription Atelier',
    description: 'Formulaire pour les ateliers pratiques et formations',
    category: 'Formation',
    icon: '🎉',
    sections: [
      {
        id: 'personal-info',
        title: 'Informations Personnelles',
        description: 'Vos informations de base',
        order: 1,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'workshop-info',
        title: 'Informations Atelier',
        description: 'Votre niveau et équipement',
        order: 2,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    fields: [
      {
        id: 'firstName',
        type: FormFieldType.TEXT,
        label: 'Prénom',
        name: 'firstName',
        sectionId: 'personal-info',
        order: 1,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre prénom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'lastName',
        type: FormFieldType.TEXT,
        label: 'Nom',
        name: 'lastName',
        sectionId: 'personal-info',
        order: 2,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre nom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        name: 'email',
        sectionId: 'personal-info',
        order: 3,
        width: 'full',
        validation: { required: true },
        properties: { placeholder: 'votre.email@exemple.com' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'skillLevel',
        type: FormFieldType.RADIO,
        label: 'Niveau d\'expérience',
        name: 'skillLevel',
        sectionId: 'workshop-info',
        order: 4,
        width: 'full',
        validation: { required: true },
        properties: {
          options: [
            { label: 'Débutant', value: 'beginner' },
            { label: 'Intermédiaire', value: 'intermediate' },
            { label: 'Avancé', value: 'advanced' }
          ]
        },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    isPublic: true,
    tags: ['atelier', 'formation', 'pratique'],
    usageCount: 67,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  networking: {
    id: 'networking',
    name: 'Événement Networking',
    description: 'Formulaire pour les événements de networking professionnel',
    category: 'Networking',
    icon: '🤝',
    sections: [
      {
        id: 'personal-info',
        title: 'Informations Personnelles',
        description: 'Vos informations de base',
        order: 1,
        isCollapsible: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'networking-goals',
        title: 'Objectifs de Networking',
        description: 'Ce que vous recherchez',
        order: 2,
        isCollapsible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    fields: [
      {
        id: 'firstName',
        type: FormFieldType.TEXT,
        label: 'Prénom',
        name: 'firstName',
        sectionId: 'personal-info',
        order: 1,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre prénom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'lastName',
        type: FormFieldType.TEXT,
        label: 'Nom',
        name: 'lastName',
        sectionId: 'personal-info',
        order: 2,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre nom' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        name: 'email',
        sectionId: 'personal-info',
        order: 3,
        width: 'full',
        validation: { required: true },
        properties: { placeholder: 'votre.email@exemple.com' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'company',
        type: FormFieldType.TEXT,
        label: 'Entreprise',
        name: 'company',
        sectionId: 'personal-info',
        order: 4,
        width: 'half',
        validation: { required: true },
        properties: { placeholder: 'Votre entreprise' },
        isVisible: true,
        isRequired: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'goals',
        type: FormFieldType.TEXTAREA,
        label: 'Vos objectifs',
        name: 'goals',
        sectionId: 'networking-goals',
        order: 5,
        width: 'full',
        validation: { required: false, maxLength: 300 },
        properties: { 
          placeholder: 'Que recherchez-vous dans cet événement ?',
          rows: 3
        },
        isVisible: true,
        isRequired: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    isPublic: true,
    tags: ['networking', 'professionnel', 'rencontres'],
    usageCount: 45,
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Utilitaires pour les templates
export const getTemplateByCategory = (category: string): Partial<FormTemplate> | undefined => {
  return FORM_TEMPLATES[category];
};

export const getAllTemplates = (): Array<{ id: string; template: FormTemplate }> => {
  return Object.entries(COMPLETE_FORM_TEMPLATES).map(([id, template]) => ({ id, template }));
};

export const mergeTemplateFields = (baseTemplate: Partial<FormTemplate>, additionalFields: FormField[]): FormField[] => {
  const baseFields = baseTemplate.fields || [];
  const maxOrder = Math.max(...baseFields.map(f => f.order), 0);
  
  const adjustedAdditionalFields = additionalFields.map((field, index) => ({
    ...field,
    order: maxOrder + index + 1
  }));
  
  return [...baseFields, ...adjustedAdditionalFields];
};

// Types pour l'export/import de formulaires
export interface FormExportData {
  form: FormData;
  submissions?: FormSubmission[];
  analytics?: FormAnalytics;
  exportedAt: Date;
  exportedBy: string;
  version: string;
}

export interface FormImportOptions {
  includeSubmissions?: boolean;
  includeAnalytics?: boolean;
  overwriteExisting?: boolean;
  preserveIds?: boolean;
}

// Types pour les webhooks et intégrations
export interface FormWebhook {
  id: string;
  formId: string;
  url: string;
  events: Array<'submission' | 'update' | 'delete'>;
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  lastTriggered?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormIntegration {
  id: string;
  formId: string;
  type: 'email' | 'crm' | 'spreadsheet' | 'database' | 'webhook';
  config: Record<string, any>;
  fieldMapping: Record<string, string>;
  isActive: boolean;
  lastSync?: Date;
  syncCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour le Form Builder
export interface RegistrationFormBuilder {
  id: string;
  settings: FormSettings;
  sections: FormSection[];
  fields: FormField[];
  template?: string;
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdBy: string;
  tenantId: string;
  projectId?: string;
  eventId?: string;
  // Nouvelles propriétés pour l'entête et le pied de page
  header?: FormHeader;
  footer?: FormFooter;
  // Liens de publication
  publicationLinks?: PublicationLinks;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormHeader {
  showLogo: boolean;
  logoUrl?: string;
  logoPosition: 'left' | 'center' | 'right';
  showTitle: boolean;
  title?: string;
  showDescription: boolean;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  backgroundImage?: string;
  height: 'small' | 'medium' | 'large';
}

export interface FormFooter {
  showFooter: boolean;
  content?: string;
  showPoweredBy: boolean;
  backgroundColor?: string;
  textColor?: string;
  links?: FooterLink[];
  contactInfo?: ContactInfo;
}

export interface FooterLink {
  id: string;
  text: string;
  url: string;
  openInNewTab: boolean;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

export interface PublicationLinks {
  longUrl: string;
  shortUrl: string;
  qrCodeUrl?: string;
  embedCode?: string;
  isPublished: boolean;
  publishedAt?: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  // Nouvelles propriétés pour les sous-domaines
  organizationDomain?: string;
  organizationSubdomain?: string;
  customDomain?: string;
}

export interface FormBuilderState {
  form: RegistrationFormBuilder;
  selectedSectionId?: string;
  selectedFieldId?: string;
  previewMode: boolean;
  isDirty: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  history: RegistrationFormBuilder[];
  historyIndex: number;
}

export type FormBuilderAction =
  | { type: 'SET_FORM'; payload: RegistrationFormBuilder }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<FormSettings> }
  | { type: 'UPDATE_HEADER'; payload: Partial<FormHeader> }
  | { type: 'UPDATE_FOOTER'; payload: Partial<FormFooter> }
  | { type: 'ADD_SECTION' }
  | { type: 'UPDATE_SECTION'; payload: { id: string; updates: Partial<FormSection> } }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'ADD_FIELD'; payload: { sectionId: string; fieldType: FormFieldType } }
  | { type: 'UPDATE_FIELD'; payload: { id: string; updates: Partial<FormField> } }
  | { type: 'DELETE_FIELD'; payload: string }
  | { type: 'SELECT_SECTION'; payload: string }
  | { type: 'SELECT_FIELD'; payload: string }
  | { type: 'TOGGLE_PREVIEW' }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { field: string; message: string } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'GENERATE_PUBLICATION_LINKS'; payload: PublicationLinks }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_TO_HISTORY' };

// Fonctions utilitaires
export const getDefaultFormSettings = (): FormSettings => {
  return {
    title: 'Nouveau Formulaire',
    description: '',
    submitButtonText: 'Envoyer',
    successMessage: 'Merci pour votre inscription !',
    allowMultipleSubmissions: false,
    requireAuthentication: false,
    collectEmail: true,
    collectName: true,
    showProgressBar: true,
    allowSaveAndContinue: false,
    enableNotifications: false,
    theme: {
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter, sans-serif',
      borderRadius: 8
    },
  }
}

export const getDefaultFormHeader = (): FormHeader => {
  return {
    showLogo: false,
    logoPosition: 'center',
    showTitle: true,
    title: 'Formulaire d\'inscription',
    showDescription: true,
    description: 'Veuillez remplir ce formulaire pour vous inscrire',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    height: 'medium'
  }
}

export const getDefaultFormFooter = (): FormFooter => {
  return {
    showFooter: true,
    content: 'Merci de votre participation !',
    showPoweredBy: true,
    backgroundColor: '#f8fafc',
    textColor: '#64748b',
    links: [],
    contactInfo: {}
  }
}

export const generatePublicationLinks = (
  formId: string, 
  organizationData?: {
    subdomain?: string;
    customDomain?: string;
    name?: string;
  }
): PublicationLinks => {
  // Déterminer l'URL de base selon la configuration de l'organisation
  let baseUrl = 'https://app.attendancex.com'
  let organizationSubdomain: string | undefined
  let organizationDomain: string | undefined
  
  if (organizationData?.customDomain) {
    // Domaine personnalisé de l'organisation (ex: events.monentreprise.com)
    baseUrl = `https://${organizationData.customDomain}`
    organizationDomain = organizationData.customDomain
  } else if (organizationData?.subdomain) {
    // Sous-domaine AttendanceX (ex: monentreprise.attendancex.app)
    baseUrl = `https://${organizationData.subdomain}.attendancex.app`
    organizationSubdomain = organizationData.subdomain
  }
  
  const longUrl = `${baseUrl}/forms/${formId}`
  const shortUrl = `https://attendx.co/${formId.substring(0, 8)}`
  
  return {
    longUrl,
    shortUrl,
    qrCodeUrl: `${baseUrl}/api/qr?url=${encodeURIComponent(longUrl)}`,
    embedCode: `<iframe src="${longUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`,
    isPublished: false,
    accessCount: 0,
    organizationDomain,
    organizationSubdomain
  }
}

export const createNewSection = (title: string = 'Nouvelle Section', order: number = 0): FormSection => {
  return {
    id: `section_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    title,
    description: '',
    order,
    fields: [],
    isCollapsible: false,
    isCollapsed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export const createNewField = (type: FormFieldType, sectionId?: string, order: number = 0): FormField => {
  const id = `field_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const name = `field_${type}_${Date.now()}`;
  
  return {
    id,
    type,
    label: getDefaultFieldLabel(type),
    name,
    validation: {
      required: false
    },
    properties: getDefaultFieldProperties(type),
    sectionId,
    order,
    width: 'full',
    isVisible: true,
    isRequired: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

const getDefaultFieldLabel = (type: FormFieldType): string => {
  const labels: Record<FormFieldType, string> = {
    [FormFieldType.TEXT]: 'Champ Texte',
    [FormFieldType.EMAIL]: 'Email',
    [FormFieldType.PHONE]: 'Téléphone',
    [FormFieldType.NUMBER]: 'Nombre',
    [FormFieldType.TEXTAREA]: 'Zone de Texte',
    [FormFieldType.SELECT]: 'Liste Déroulante',
    [FormFieldType.RADIO]: 'Boutons Radio',
    [FormFieldType.CHECKBOX]: 'Cases à Cocher',
    [FormFieldType.DATE]: 'Date',
    [FormFieldType.TIME]: 'Heure',
    [FormFieldType.DATETIME]: 'Date et Heure',
    [FormFieldType.FILE]: 'Fichier',
    [FormFieldType.IMAGE]: 'Image',
    [FormFieldType.URL]: 'URL',
    [FormFieldType.RATING]: 'Évaluation',
    [FormFieldType.SLIDER]: 'Curseur',
    [FormFieldType.SIGNATURE]: 'Signature',
    [FormFieldType.LOCATION]: 'Localisation',
    [FormFieldType.DIVIDER]: 'Séparateur',
    [FormFieldType.HEADING]: 'Titre',
    [FormFieldType.PARAGRAPH]: 'Paragraphe'
  };
  
  return labels[type] || 'Champ';
};

const getDefaultFieldProperties = (type: FormFieldType): FormFieldProperties => {
  const baseProperties: FormFieldProperties = {};
  
  switch (type) {
    case FormFieldType.TEXT:
    case FormFieldType.EMAIL:
    case FormFieldType.PHONE:
      return { ...baseProperties, placeholder: 'Saisissez votre réponse' };
    
    case FormFieldType.TEXTAREA:
      return { ...baseProperties, placeholder: 'Saisissez votre réponse', rows: 3 };
    
    case FormFieldType.SELECT:
    case FormFieldType.RADIO:
    case FormFieldType.CHECKBOX:
      return {
        ...baseProperties,
        options: [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' }
        ]
      };
    
    case FormFieldType.NUMBER:
      return { ...baseProperties, placeholder: '0' };
    
    case FormFieldType.DATE:
      return { ...baseProperties, dateFormat: 'DD/MM/YYYY', allowPastDates: true, allowFutureDates: true };
    
    case FormFieldType.TIME:
      return { ...baseProperties, timeFormat: '24h' };
    
    case FormFieldType.FILE:
      return { ...baseProperties, maxFileSize: 10, maxFiles: 1 };
    
    case FormFieldType.IMAGE:
      return { ...baseProperties, accept: 'image/*', maxFileSize: 5, aspectRatio: '16:9' };
    
    case FormFieldType.RATING:
      return { ...baseProperties, ratingMax: 5, ratingIcon: 'star' };
    
    case FormFieldType.SLIDER:
      return { ...baseProperties, sliderMin: 0, sliderMax: 100, sliderStep: 1 };
    
    case FormFieldType.HEADING:
      return { ...baseProperties, headingLevel: 2, textAlign: 'left', fontSize: 'large' };
    
    case FormFieldType.PARAGRAPH:
      return { ...baseProperties, textAlign: 'left', fontSize: 'medium' };
    
    default:
      return baseProperties;
  }
};