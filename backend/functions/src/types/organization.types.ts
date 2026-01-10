// Types pour la gestion des organisations et domaines personnalisés

// Configuration SMTP (définie en premier)
export interface SmtpConfiguration {
  // Configuration du serveur SMTP
  enabled: boolean
  host: string
  port: number
  secure: boolean // true pour 465, false pour autres ports
  
  // Authentification
  auth: {
    user: string
    pass: string
  }
  
  // Paramètres d'envoi
  from: {
    name: string
    email: string
  }
  
  // Paramètres avancés
  connectionTimeout?: number // en ms
  greetingTimeout?: number // en ms
  socketTimeout?: number // en ms
  
  // Limites
  maxConnections?: number
  maxMessages?: number
  rateDelta?: number // en ms
  rateLimit?: number // messages par rateDelta
  
  // Sécurité
  requireTLS?: boolean
  ignoreTLS?: boolean
  
  // Test et validation
  lastTested?: Date
  testStatus?: 'success' | 'failed' | 'pending'
  testError?: string
  
  // Métriques
  totalSent?: number
  totalFailed?: number
  lastUsed?: Date
}

// Configuration SMS (définie en second)
export interface SmsConfiguration {
  // Configuration du fournisseur SMS
  enabled: boolean
  provider: 'twilio' | 'aws-sns' | 'nexmo' | 'custom'
  
  // Credentials selon le fournisseur
  credentials: {
    // Twilio
    accountSid?: string
    authToken?: string
    fromNumber?: string
    
    // AWS SNS
    accessKeyId?: string
    secretAccessKey?: string
    region?: string
    
    // Nexmo/Vonage
    apiKey?: string
    apiSecret?: string
    
    // Custom webhook
    webhookUrl?: string
    webhookApiKey?: string
    headers?: Record<string, string>
  }
  
  // Paramètres d'envoi
  defaultFrom?: string
  
  // Limites et quotas
  dailyLimit?: number
  monthlyLimit?: number
  
  // Test et validation
  lastTested?: Date
  testStatus?: 'success' | 'failed' | 'pending'
  testError?: string
  
  // Métriques
  totalSent?: number
  totalFailed?: number
  lastUsed?: Date
  
  // Coûts (optionnel)
  costPerMessage?: number
  currency?: string
}

// Configuration SSL
export interface SslConfiguration {
  // Statut SSL
  enabled: boolean
  status: 'pending' | 'active' | 'failed' | 'expired'
  
  // Certificat
  certificate?: {
    issuer: string
    validFrom: Date
    validTo: Date
    fingerprint: string
  }
  
  // Auto-renouvellement
  autoRenew: boolean
  
  // Dernière vérification
  lastChecked?: Date
}

// Enregistrement DNS
export interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT'
  name: string
  value: string
  ttl?: number
  priority?: number
  required: boolean
  status: 'pending' | 'verified' | 'failed'
}

// Configuration DNS
export interface DnsConfiguration {
  // Enregistrements DNS requis
  records: DnsRecord[]
  
  // Statut de la configuration DNS
  status: DnsStatus
  
  // Dernière vérification
  lastChecked: Date
  
  // Erreurs de configuration
  errors?: string[]
}

// Vérification de domaine
export interface DomainVerification {
  // Statut de vérification
  status: 'pending' | 'verified' | 'failed' | 'expired'
  
  // Token de vérification
  verificationToken: string
  
  // Méthode de vérification
  method: 'dns' | 'file' | 'email'
  
  // Dates
  verifiedAt?: Date
  expiresAt?: Date
  
  // Tentatives
  attempts: number
  lastAttempt?: Date
}

// Domaine d'organisation
export interface OrganizationDomain {
  // Sous-domaine principal (ex: "mon-org" pour mon-org.attendancex.com)
  subdomain: string
  
  // Domaine personnalisé (ex: "forms.monentreprise.com")
  customDomain?: string
  
  // Configuration DNS
  dnsConfig: DnsConfiguration
  
  // Statut de vérification
  verification: DomainVerification
  
  // SSL/TLS
  ssl: SslConfiguration
}

// Paramètres d'organisation (utilise SmtpConfiguration et SmsConfiguration)
export interface OrganizationSettings {
  // Paramètres généraux
  timezone: string
  locale: string
  currency: string
  
  // Paramètres de formulaire
  defaultFormSettings: {
    theme: {
      primaryColor: string
      secondaryColor: string
      fontFamily: string
    }
    footer: {
      showPoweredBy: boolean
      customText?: string
    }
  }
  
  // Configuration SMTP
  smtp: SmtpConfiguration
  
  // Paramètres de notification
  notifications: {
    email: boolean
    webhook?: string
    slackWebhook?: string
    smsProvider?: SmsConfiguration
  }
  
  // Paramètres de sécurité
  security: {
    requireSsl: boolean
    allowedOrigins: string[]
    rateLimiting: {
      enabled: boolean
      requestsPerMinute: number
    }
    twoFactorAuth: {
      enabled: boolean
      required: boolean
    }
  }
  
  // Paramètres d'intégration
  integrations: {
    googleAnalytics?: string
    facebookPixel?: string
    customScripts?: string[]
  }
  
  // Paramètres de stockage
  storage: {
    provider: 'firebase' | 'aws' | 'gcp'
    maxFileSize: number // en MB
    allowedFileTypes: string[]
  }
}

// Branding d'organisation
export interface OrganizationBranding {
  // Logo
  logo?: {
    url: string
    width: number
    height: number
  }
  
  // Couleurs
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  
  // Typographie
  fonts: {
    primary: string
    secondary: string
  }
  
  // Images
  favicon?: string
  backgroundImage?: string
  
  // CSS personnalisé
  customCss?: string
}

// Organisation principale
export interface Organization {
  id: string
  tenantId: string
  name: string
  displayName: string
  description?: string
  logo?: string
  website?: string
  
  // Configuration des domaines
  domain: OrganizationDomain
  
  // Paramètres
  settings: OrganizationSettings
  
  // Branding
  branding: OrganizationBranding
  
  // Métadonnées
  createdBy: string
  createdAt: Date
  updatedAt: Date
  status: OrganizationStatus
}

// Enums
export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  ARCHIVED = 'archived'
}

export enum DnsStatus {
  PENDING = 'pending',
  CONFIGURING = 'configuring',
  VERIFIED = 'verified',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

// Requêtes API
export interface CreateOrganizationRequest {
  name: string
  displayName: string
  description?: string
  subdomain: string
  customDomain?: string
  settings?: Partial<OrganizationSettings>
  branding?: Partial<OrganizationBranding>
}

export interface UpdateOrganizationRequest {
  name?: string
  displayName?: string
  description?: string
  settings?: Partial<OrganizationSettings>
  branding?: Partial<OrganizationBranding>
}

export interface UpdateDomainRequest {
  customDomain?: string
  subdomain?: string
  sslEnabled?: boolean
}

export interface VerifyDomainRequest {
  method: 'dns' | 'file' | 'email'
}

// Réponses API
export interface DomainCheckResponse {
  available: boolean
  suggestions?: string[]
  conflicts?: string[]
}

export interface DnsCheckResponse {
  status: DnsStatus
  records: DnsRecord[]
  errors?: string[]
  nextCheck?: Date
}

export interface SslCheckResponse {
  status: 'active' | 'pending' | 'failed'
  certificate?: {
    issuer: string
    validFrom: Date
    validTo: Date
    daysUntilExpiry: number
  }
  errors?: string[]
}

// Document interne (avec champs sensibles)
export interface OrganizationDocument extends Organization {
  // Propriétés sensibles/internes
  internalNotes?: string
  auditLog?: AuditEntry[]
}

export interface AuditEntry {
  action: string
  performedBy: string
  performedAt: Date
  details?: Record<string, any>
  ipAddress?: string
}