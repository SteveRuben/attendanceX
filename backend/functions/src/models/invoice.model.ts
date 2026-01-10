import { DocumentSnapshot } from "firebase-admin/firestore";
import { BaseModel } from "./base.model";
import { 
  Invoice, 
  InvoiceLineItem, 
  InvoiceStatus 
} from "../common/types/billing.types";
import { ValidationError } from "../utils/common/errors";

export interface CreateInvoiceRequest {
  tenantId: string;
  subscriptionId?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  metadata?: Record<string, any>;
}

export class InvoiceModel extends BaseModel<Invoice> {
  constructor(data: Partial<Invoice>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const invoice = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(invoice, [
      'tenantId', 'invoiceNumber', 'status', 'currency', 
      'subtotal', 'totalAmount', 'dueDate', 'lineItems'
    ]);

    // Validation du statut
    if (!Object.values(InvoiceStatus).includes(invoice.status)) {
      throw new ValidationError('Invalid invoice status');
    }

    // Validation des montants
    if (invoice.subtotal < 0) {
      throw new ValidationError('Subtotal cannot be negative');
    }

    if (invoice.taxAmount < 0) {
      throw new ValidationError('Tax amount cannot be negative');
    }

    if (invoice.discountAmount < 0) {
      throw new ValidationError('Discount amount cannot be negative');
    }

    if (invoice.totalAmount < 0) {
      throw new ValidationError('Total amount cannot be negative');
    }

    // Validation de la cohérence des montants
    const calculatedTotal = invoice.subtotal + invoice.taxAmount - invoice.discountAmount;
    if (Math.abs(calculatedTotal - invoice.totalAmount) > 0.01) {
      throw new ValidationError('Total amount does not match calculated total');
    }

    // Validation des line items
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      throw new ValidationError('Invoice must have at least one line item');
    }

    for (const item of invoice.lineItems) {
      this.validateLineItem(item);
    }

    // Validation des dates
    if (invoice.paidAt && invoice.paidAt < invoice.createdAt) {
      throw new ValidationError('Paid date cannot be before creation date');
    }

    if (invoice.voidedAt && invoice.voidedAt < invoice.createdAt) {
      throw new ValidationError('Voided date cannot be before creation date');
    }

    return true;
  }

  private validateLineItem(item: InvoiceLineItem): void {
    BaseModel.validateRequired(item, ['id', 'description', 'quantity', 'unitAmount', 'totalAmount']);

    if (item.quantity <= 0) {
      throw new ValidationError('Line item quantity must be positive');
    }

    if (item.unitAmount < 0) {
      throw new ValidationError('Line item unit amount cannot be negative');
    }

    if (item.totalAmount < 0) {
      throw new ValidationError('Line item total amount cannot be negative');
    }

    // Vérifier la cohérence du calcul
    const calculatedTotal = item.quantity * item.unitAmount;
    if (Math.abs(calculatedTotal - item.totalAmount) > 0.01) {
      throw new ValidationError(`Line item ${item.id} total amount does not match calculated total`);
    }
  }

  toFirestore() {
    const { id, ...data } = this.data;
    const cleanedData = this.filterUndefinedValues(data);
    return this.convertDatesToFirestore(cleanedData);
  }

  static fromFirestore(doc: DocumentSnapshot): InvoiceModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData = InvoiceModel.prototype.convertDatesFromFirestore(data);

    return new InvoiceModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromCreateRequest(request: CreateInvoiceRequest): InvoiceModel {
    const now = new Date();
    const invoiceNumber = InvoiceModel.generateInvoiceNumber();
    
    const totalAmount = request.subtotal + request.taxAmount - request.discountAmount;
    const amountDue = totalAmount;

    const invoiceData: Partial<Invoice> = {
      tenantId: request.tenantId,
      subscriptionId: request.subscriptionId,
      invoiceNumber,
      status: InvoiceStatus.OPEN,
      currency: request.currency,
      subtotal: request.subtotal,
      taxAmount: request.taxAmount,
      discountAmount: request.discountAmount,
      totalAmount,
      amountPaid: 0,
      amountDue,
      dueDate: request.dueDate,
      paymentAttemptCount: 0,
      lineItems: request.lineItems,
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    return new InvoiceModel(invoiceData);
  }

  // Méthodes d'instance
  isPaid(): boolean {
    return this.data.status === InvoiceStatus.PAID;
  }

  isOverdue(): boolean {
    return this.data.status === InvoiceStatus.OPEN && 
           this.data.dueDate < new Date();
  }

  canBePaid(): boolean {
    return this.data.status === InvoiceStatus.OPEN && 
           this.data.amountDue > 0;
  }

  markAsPaid(paidAt: Date = new Date()): void {
    this.data.status = InvoiceStatus.PAID;
    this.data.paidAt = paidAt;
    this.data.amountPaid = this.data.totalAmount;
    this.data.amountDue = 0;
    this.data.updatedAt = new Date();
  }

  markAsVoid(voidedAt: Date = new Date()): void {
    this.data.status = InvoiceStatus.VOID;
    this.data.voidedAt = voidedAt;
    this.data.updatedAt = new Date();
  }

  addPayment(amount: number, paymentDate: Date = new Date()): void {
    this.data.amountPaid += amount;
    this.data.amountDue = Math.max(0, this.data.totalAmount - this.data.amountPaid);
    
    if (this.data.amountDue === 0) {
      this.data.status = InvoiceStatus.PAID;
      this.data.paidAt = paymentDate;
    }
    
    this.data.updatedAt = new Date();
  }

  incrementPaymentAttempt(): void {
    this.data.paymentAttemptCount++;
    this.data.lastPaymentAttempt = new Date();
    this.data.updatedAt = new Date();
  }

  getDaysOverdue(): number {
    if (!this.isOverdue()) return 0;
    
    const now = new Date();
    const diffTime = now.getTime() - this.data.dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Générer un numéro de facture unique
   */
  static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `INV-${year}${month}-${timestamp}-${random}`;
  }

  // Méthodes publiques pour accès sécurisé
  public toAPI(): Invoice {
    return { ...this.data } as Invoice;
  }

  public setMetadata(metadata: Record<string, any>): void {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    this.data.updatedAt = new Date();
  }
}