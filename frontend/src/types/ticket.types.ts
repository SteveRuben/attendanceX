/**
 * Types pour le système de billets - Frontend
 */

export interface EventTicket {
  id: string;
  tenantId: string;
  eventId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  ticketNumber: string;
  qrCode: string;
  securityCode: string;
  type: TicketType;
  status: TicketStatus;
  price?: number;
  currency?: string;
  metadata?: Record<string, any>;
  emailSent: boolean;
  emailSentAt?: Date;
  downloadCount: number;
  lastDownloadAt?: Date;
  checkedInAt?: Date;
  checkedInBy?: string;
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum TicketType {
  STANDARD = 'standard',
  VIP = 'vip',
  EARLY_BIRD = 'early_bird',
  GROUP = 'group',
  COMPLIMENTARY = 'complimentary'
}

export enum TicketStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  USED = 'used',
  EXPIRED = 'expired'
}

export interface CreateTicketRequest {
  eventId: string;
  participantName: string;
  participantEmail: string;
  participantPhone?: string;
  type?: TicketType;
  price?: number;
  currency?: string;
  metadata?: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdateTicketRequest {
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  type?: TicketType;
  price?: number;
  currency?: string;
  metadata?: Record<string, any>;
  validFrom?: Date;
  validUntil?: Date;
}

export interface BulkTicketRequest {
  eventId: string;
  participants: Array<{
    name: string;
    email: string;
    phone?: string;
    type?: TicketType;
    metadata?: Record<string, any>;
  }>;
  defaultType?: TicketType;
  price?: number;
  currency?: string;
}

export interface TicketValidationRequest {
  ticketNumber?: string;
  qrCode?: string;
  securityCode?: string;
}

export interface TicketValidationResult {
  isValid: boolean;
  ticket?: EventTicket;
  message: string;
  canCheckIn: boolean;
  alreadyUsed: boolean;
  expired: boolean;
}

export interface TicketEmailOptions {
  includeCalendarInvite?: boolean;
  includeEventDetails?: boolean;
  customMessage?: string;
  subject?: string;
  copies?: number;
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

export interface PaginatedTicketsResponse {
  tickets: EventTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TicketFilters {
  status?: TicketStatus[];
  type?: TicketType[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  emailSent?: boolean;
  checkedIn?: boolean;
}

export interface TicketSortOptions {
  field: 'createdAt' | 'participantName' | 'participantEmail' | 'status' | 'type';
  direction: 'asc' | 'desc';
}