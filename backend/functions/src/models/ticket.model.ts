import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  EventTicket, 
  TicketStatus, 
  TicketType, 
  CreateTicketRequest
} from "../common/types/ticket.types";
import { ValidationError } from "../utils/common/errors";
import { generateSecureId, generateQRCode } from "../utils/security";

export class TicketModel extends BaseModel<EventTicket> {
  constructor(data: Partial<EventTicket>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const ticket = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(ticket, [
      "ticketNumber", "eventId", "eventTitle", "eventDate", "eventLocation",
      "participantId", "participantName", "participantEmail", "tenantId",
      "qrCode", "securityCode", "templateId", "issuedAt", "validFrom", "validUntil"
    ]);

    // Validation du numéro de billet
    if (!ticket.ticketNumber || ticket.ticketNumber.length < 8) {
      throw new ValidationError("Ticket number must be at least 8 characters long");
    }

    // Validation de l'email
    if (!this.isValidEmail(ticket.participantEmail)) {
      throw new ValidationError("Invalid participant email format");
    }

    // Validation des dates
    if (ticket.validFrom && ticket.validUntil && ticket.validFrom >= ticket.validUntil) {
      throw new ValidationError("Valid from date must be before valid until date");
    }

    if (ticket.eventDate && ticket.validUntil && ticket.eventDate > ticket.validUntil) {
      throw new ValidationError("Event date cannot be after ticket expiration");
    }

    // Validation du statut
    if (!Object.values(TicketStatus).includes(ticket.status)) {
      throw new ValidationError("Invalid ticket status");
    }

    // Validation du type
    if (!Object.values(TicketType).includes(ticket.type)) {
      throw new ValidationError("Invalid ticket type");
    }

    // Validation du code QR
    if (!ticket.qrCode || ticket.qrCode.length < 10) {
      throw new ValidationError("QR code must be at least 10 characters long");
    }

    // Validation du code de sécurité
    if (!ticket.securityCode || ticket.securityCode.length < 6) {
      throw new ValidationError("Security code must be at least 6 characters long");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  // Sérialisation sécurisée pour API
  public toAPI(): Partial<EventTicket> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Supprimer les champs sensibles si nécessaire
    // (pour l'instant, tous les champs sont publics pour le propriétaire du billet)
    
    return cleaned;
  }

  // Sérialisation publique (pour les vérifications)
  public toPublicAPI(): Partial<EventTicket> {
    const data = this.data;
    return {
      id: data.id,
      ticketNumber: data.ticketNumber,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      participantName: data.participantName,
      type: data.type,
      status: data.status,
      qrCode: data.qrCode,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      checkInAllowed: data.checkInAllowed,
      organizationName: data.organizationName,
      organizationLogo: data.organizationLogo
    };
  }

  static fromFirestore(doc: DocumentSnapshot): TicketModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = TicketModel.prototype.convertDatesFromFirestore(data);

    return new TicketModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateTicketRequest & { 
      tenantId: string; 
      eventTitle: string;
      eventDate: Date;
      eventLocation: string;
      organizationName: string;
      organizationLogo?: string;
      generatedBy: string;
    }
  ): TicketModel {
    const now = new Date();
    const ticketNumber = this.generateTicketNumber();
    const qrCode = generateQRCode(`TICKET:${ticketNumber}:${request.eventId}:${request.participantId}`);
    const securityCode = generateSecureId(6).toUpperCase();

    const ticketData: Partial<EventTicket> = {
      ticketNumber,
      eventId: request.eventId,
      eventTitle: request.eventTitle,
      eventDate: request.eventDate,
      eventLocation: request.eventLocation,
      participantId: request.participantId,
      participantName: request.participantName,
      participantEmail: request.participantEmail,
      participantPhone: request.participantPhone,
      type: request.type || TicketType.STANDARD,
      status: TicketStatus.CONFIRMED,
      qrCode,
      securityCode,
      templateId: request.templateId || 'default',
      customData: request.customData || {},
      issuedAt: now,
      validFrom: request.validFrom || now,
      validUntil: request.validUntil || new Date(request.eventDate.getTime() + 24 * 60 * 60 * 1000), // 24h après l'événement
      emailSent: false,
      downloadCount: 0,
      checkInAllowed: true,
      transferAllowed: false,
      refundAllowed: true,
      organizationName: request.organizationName,
      organizationLogo: request.organizationLogo,
      registrationData: request.registrationData,
      specialRequirements: request.specialRequirements,
      generatedBy: request.generatedBy,
      version: 1,
      tenantId: request.tenantId,
      createdAt: now,
      updatedAt: now
    };

    return new TicketModel(ticketData);
  }

  static generateTicketNumber(): string {
    const prefix = 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Méthodes d'instance pour les opérations sur le billet
  public markAsUsed(usedAt: Date = new Date()): void {
    this.data.status = TicketStatus.USED;
    this.data.usedAt = usedAt;
    this.data.updatedAt = new Date();
  }

  public cancel(reason?: string, cancelledBy?: string): void {
    this.data.status = TicketStatus.CANCELLED;
    this.data.cancelledAt = new Date();
    this.data.cancellationReason = reason;
    this.data.lastModifiedBy = cancelledBy;
    this.data.updatedAt = new Date();
  }

  public markEmailSent(): void {
    this.data.emailSent = true;
    this.data.emailSentAt = new Date();
    this.data.updatedAt = new Date();
  }

  public incrementDownloadCount(): void {
    this.data.downloadCount = (this.data.downloadCount || 0) + 1;
    this.data.lastDownloadAt = new Date();
    this.data.updatedAt = new Date();
  }

  public isValid(): boolean {
    const now = new Date();
    return (
      this.data.status === TicketStatus.CONFIRMED &&
      this.data.validFrom <= now &&
      this.data.validUntil >= now
    );
  }

  public canCheckIn(): boolean {
    return this.isValid() && this.data.checkInAllowed && !this.data.usedAt;
  }

  public canTransfer(): boolean {
    return this.isValid() && this.data.transferAllowed;
  }

  public canRefund(): boolean {
    return (
      this.data.status === TicketStatus.CONFIRMED &&
      this.data.refundAllowed &&
      !this.data.usedAt
    );
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}