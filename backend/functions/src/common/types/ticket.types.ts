// Types pour le système de billets d'événement

import { BaseEntity } from "./common.types";
import { TenantScopedEntity } from "./tenant.types";

export enum TicketStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  USED = 'used',
  EXPIRED = 'expired'
}

export enum TicketType {
  STANDARD = 'standard',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  STUDENT = 'student',
  COMPLIMENTARY = 'complimentary'
}

export interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  headerImage?: string;
  footerText?: string;
  includeQRCode: boolean;
  includeBarcode: boolean;
  customFields: TicketCustomField[];
  layout: 'standard' | 'compact' | 'premium';
  dimensions: {
    width: number;
    height: number;
  };
  fonts: {
    title: string;
    body: string;
    footer: string;
  };
  isDefault: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketCustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'image' | 'qr' | 'barcode';
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  style: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
  };
  isRequired: boolean;
  defaultValue?: string;
}

export interface EventTicket extends BaseEntity, TenantScopedEntity {
  // Informations de base
  ticketNumber: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  
  // Participant
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  
  // Type et statut
  type: TicketType;
  status: TicketStatus;
  
  // Codes de sécurité
  qrCode: string;
  barcode?: string;
  securityCode: string;
  
  // Template et personnalisation
  templateId: string;
  customData: Record<string, any>;
  
  // Métadonnées
  issuedAt: Date;
  validFrom: Date;
  validUntil: Date;
  usedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // Fichiers générés
  pdfUrl?: string;
  imageUrl?: string;
  
  // Historique
  emailSent: boolean;
  emailSentAt?: Date;
  downloadCount: number;
  lastDownloadAt?: Date;
  
  // Validation
  checkInAllowed: boolean;
  transferAllowed: boolean;
  refundAllowed: boolean;
  
  // Informations d'organisation
  organizationName: string;
  organizationLogo?: string;
  
  // Données d'inscription
  registrationData?: Record<string, any>;
  specialRequirements?: string;
  
  // Audit
  generatedBy: string;
  lastModifiedBy?: string;
  version: number;
}

export interface CreateTicketRequest {
  eventId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  type?: TicketType;
  templateId?: string;
  customData?: Record<string, any>;
  registrationData?: Record<string, any>;
  specialRequirements?: string;
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  type?: TicketType;
  customData?: Record<string, any>;
  specialRequirements?: string;
  checkInAllowed?: boolean;
  transferAllowed?: boolean;
  refundAllowed?: boolean;
}

export interface TicketValidationResult {
  isValid: boolean;
  ticket?: EventTicket;
  error?: string;
  warnings?: string[];
}

export interface BulkTicketRequest {
  eventId: string;
  participants: Array<{
    participantId: string;
    participantName: string;
    participantEmail: string;
    participantPhone?: string;
    type?: TicketType;
    customData?: Record<string, any>;
    registrationData?: Record<string, any>;
  }>;
  templateId?: string;
  sendEmail?: boolean;
}

export interface TicketEmailOptions {
  subject?: string;
  message?: string;
  includeCalendarInvite?: boolean;
  includeEventDetails?: boolean;
  customTemplate?: string;
  sendCopy?: boolean;
  copyEmails?: string[];
}

export interface TicketStatistics {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byType: Record<TicketType, number>;
  emailsSent: number;
  downloadsCount: number;
  checkInsCount: number;
  cancellationsCount: number;
  validTickets: number;
  expiredTickets: number;
}

// Templates par défaut
export const DEFAULT_TICKET_TEMPLATES: Partial<TicketTemplate>[] = [
  {
    name: 'Standard Event Ticket',
    description: 'Template standard pour les événements',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    includeQRCode: true,
    includeBarcode: false,
    layout: 'standard',
    dimensions: { width: 400, height: 600 },
    fonts: {
      title: 'Arial Bold',
      body: 'Arial',
      footer: 'Arial'
    },
    isDefault: true
  },
  {
    name: 'Premium Event Ticket',
    description: 'Template premium avec design élégant',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    includeQRCode: true,
    includeBarcode: true,
    layout: 'premium',
    dimensions: { width: 450, height: 650 },
    fonts: {
      title: 'Helvetica Bold',
      body: 'Helvetica',
      footer: 'Helvetica Light'
    },
    isDefault: false
  },
  {
    name: 'Compact Ticket',
    description: 'Template compact pour impression facile',
    backgroundColor: '#f8f9fa',
    textColor: '#212529',
    includeQRCode: true,
    includeBarcode: false,
    layout: 'compact',
    dimensions: { width: 350, height: 200 },
    fonts: {
      title: 'Arial Bold',
      body: 'Arial',
      footer: 'Arial'
    },
    isDefault: false
  }
];