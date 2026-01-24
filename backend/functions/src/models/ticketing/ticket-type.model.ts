/**
 * Modèle pour les types de billets
 * Gère la validation et la persistance des types de billets
 */

import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel, ValidationError } from "../base.model";
import { 
  TicketTypeConfig, 
  TicketVisibility,
  CreateTicketTypeRequest 
} from "../../common/types/ticket-config.types";

export class TicketTypeModel extends BaseModel<TicketTypeConfig> {
  constructor(data: Partial<TicketTypeConfig>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const ticketType = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(ticketType, [
      "name",
      "eventId",
      "tenantId",
      "price",
      "quantity",
      "currency",
      "visibility",
      "createdBy"
    ]);

    // Validation du nom
    if (ticketType.name.trim().length < 2) {
      throw new ValidationError("Ticket type name must be at least 2 characters", "name");
    }

    if (ticketType.name.length > 100) {
      throw new ValidationError("Ticket type name must not exceed 100 characters", "name");
    }

    // Validation du prix
    if (ticketType.price < 0) {
      throw new ValidationError("Price cannot be negative", "price");
    }

    if (ticketType.price > 1000000) {
      throw new ValidationError("Price cannot exceed 1,000,000", "price");
    }

    // Validation de la quantité
    if (ticketType.quantity < 1) {
      throw new ValidationError("Quantity must be at least 1", "quantity");
    }

    if (ticketType.quantity > 100000) {
      throw new ValidationError("Quantity cannot exceed 100,000", "quantity");
    }

    // Validation des quantités vendues/réservées
    if (ticketType.quantitySold < 0) {
      throw new ValidationError("Quantity sold cannot be negative", "quantitySold");
    }

    if (ticketType.quantityReserved < 0) {
      throw new ValidationError("Quantity reserved cannot be negative", "quantityReserved");
    }

    if (ticketType.quantitySold + ticketType.quantityReserved > ticketType.quantity) {
      throw new ValidationError(
        "Sold + reserved quantity cannot exceed total quantity",
        "quantity"
      );
    }

    // Validation de la visibilité
    BaseModel.validateEnum(ticketType.visibility, TicketVisibility, "visibility");

    // Validation de la devise
    if (!this.isValidCurrency(ticketType.currency)) {
      throw new ValidationError("Invalid currency code", "currency");
    }

    // Validation des dates de vente
    if (ticketType.salesStartDate && ticketType.salesEndDate) {
      this.validateDateRange(
        ticketType.salesStartDate,
        ticketType.salesEndDate,
        "sales period"
      );
    }

    // Validation de l'ordre
    if (ticketType.order < 0) {
      throw new ValidationError("Order must be non-negative", "order");
    }

    return true;
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = TicketTypeModel.removeUndefinedFields(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  /**
   * Sérialisation sécurisée pour API (exclut les champs sensibles)
   */
  public toAPI(): Partial<TicketTypeConfig> {
    const data = this.data as any;
    const cleaned = { ...data };
    
    // Pas de champs sensibles à supprimer pour les types de billets
    // Mais on pourrait ajouter des champs internes à exclure ici
    
    return cleaned;
  }

  static fromFirestore(doc: DocumentSnapshot): TicketTypeModel | null {
    if (!doc.exists) {return null;}

    const data = doc.data()!;
    const convertedData = TicketTypeModel.prototype.convertDatesFromFirestore(data);

    return new TicketTypeModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(
    request: CreateTicketTypeRequest & { tenantId: string; createdBy: string }
  ): TicketTypeModel {
    const ticketTypeData: Partial<TicketTypeConfig> = {
      eventId: request.eventId,
      tenantId: request.tenantId,
      name: request.name.trim(),
      description: request.description?.trim(),
      price: request.price,
      currency: request.currency || "EUR",
      quantity: request.quantity,
      quantitySold: 0,
      quantityReserved: 0,
      salesStartDate: request.salesStartDate,
      salesEndDate: request.salesEndDate,
      visibility: request.visibility || TicketVisibility.PUBLIC,
      order: request.order || 0,
      isActive: true,
      metadata: request.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: request.createdBy,
    };

    return new TicketTypeModel(ticketTypeData);
  }

  /**
   * Validation de la devise ISO 4217
   */
  private isValidCurrency(currency: string): boolean {
    const validCurrencies = [
      "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "CNY", "INR", "BRL",
      "MXN", "ZAR", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN",
      "HRK", "RUB", "TRY", "ILS", "AED", "SAR", "QAR", "KWD", "BHD", "OMR"
    ];
    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Supprimer les champs undefined (helper statique)
   */
  private static removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  }

  /**
   * Vérifier si le billet est disponible à la vente
   */
  public isAvailableForSale(): boolean {
    const now = new Date();
    
    // Vérifier si actif
    if (!this.data.isActive) {
      return false;
    }

    // Vérifier les dates de vente
    if (this.data.salesStartDate && now < this.data.salesStartDate) {
      return false;
    }

    if (this.data.salesEndDate && now > this.data.salesEndDate) {
      return false;
    }

    // Vérifier la disponibilité
    const available = this.data.quantity - this.data.quantitySold - this.data.quantityReserved;
    return available > 0;
  }

  /**
   * Obtenir la quantité disponible
   */
  public getAvailableQuantity(): number {
    return Math.max(
      0,
      this.data.quantity - this.data.quantitySold - this.data.quantityReserved
    );
  }

  /**
   * Réserver des billets
   */
  public reserveTickets(quantity: number): void {
    const available = this.getAvailableQuantity();
    
    if (quantity > available) {
      throw new ValidationError(
        `Only ${available} tickets available, cannot reserve ${quantity}`,
        "quantity"
      );
    }

    this.data.quantityReserved += quantity;
    this.updateTimestamp();
  }

  /**
   * Libérer des billets réservés
   */
  public releaseReservedTickets(quantity: number): void {
    if (quantity > this.data.quantityReserved) {
      throw new ValidationError(
        `Cannot release ${quantity} tickets, only ${this.data.quantityReserved} reserved`,
        "quantity"
      );
    }

    this.data.quantityReserved -= quantity;
    this.updateTimestamp();
  }

  /**
   * Confirmer la vente de billets réservés
   */
  public confirmSale(quantity: number): void {
    if (quantity > this.data.quantityReserved) {
      throw new ValidationError(
        `Cannot confirm sale of ${quantity} tickets, only ${this.data.quantityReserved} reserved`,
        "quantity"
      );
    }

    this.data.quantityReserved -= quantity;
    this.data.quantitySold += quantity;
    this.updateTimestamp();
  }
}
