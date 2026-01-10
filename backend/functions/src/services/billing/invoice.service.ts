/**
 * Service de gestion des factures
 * Gère la création, mise à jour et traitement des factures
 */

import { collections } from '../../config/database';
import { logger } from 'firebase-functions';
import { 
  Invoice
} from '../../common/types/billing.types';
import { ValidationError, NotFoundError } from '../../utils/common/errors';
import { InvoiceModel, CreateInvoiceRequest } from '../../models/invoice.model';

export class InvoiceService {

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    try {
      const invoiceModel = InvoiceModel.fromCreateRequest(request);
      await invoiceModel.validate();

      const docRef = await collections.invoices.add(invoiceModel.toFirestore());
      const invoiceData = invoiceModel.toAPI();
      
      logger.info(`✅ Invoice created: ${invoiceData.invoiceNumber}`, {
        invoiceId: docRef.id,
        tenantId: request.tenantId,
        amount: invoiceData.totalAmount
      });

      return {
        id: docRef.id,
        ...invoiceData
      };

    } catch (error: any) {
      logger.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const doc = await collections.invoices.doc(invoiceId).get();
      const invoiceModel = InvoiceModel.fromFirestore(doc);
      
      return invoiceModel ? { id: invoiceId, ...invoiceModel.toAPI() } : null;
    } catch (error: any) {
      logger.error('Error getting invoice:', error);
      throw error;
    }
  }

  async getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
    try {
      const snapshot = await collections.invoices
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      const invoices: Invoice[] = [];
      
      snapshot.docs.forEach(doc => {
        const invoiceModel = InvoiceModel.fromFirestore(doc);
        if (invoiceModel) {
          invoices.push({ id: doc.id, ...invoiceModel.toAPI() });
        }
      });

      return invoices;
    } catch (error: any) {
      logger.error('Error getting invoices by tenant:', error);
      throw error;
    }
  }

  async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const doc = await collections.invoices.doc(invoiceId).get();
      const invoiceModel = InvoiceModel.fromFirestore(doc);
      
      if (!invoiceModel) {
        throw new NotFoundError('Invoice not found');
      }

      // Apply updates through safe methods
      if (updates.metadata) {
        invoiceModel.setMetadata(updates.metadata);
      }

      await collections.invoices.doc(invoiceId).update(invoiceModel.toFirestore());

      return { id: invoiceId, ...invoiceModel.toAPI() };
    } catch (error: any) {
      logger.error('Error updating invoice:', error);
      throw error;
    }
  }

  async markInvoiceAsPaid(invoiceId: string, paidAt: Date = new Date()): Promise<Invoice> {
    try {
      const doc = await collections.invoices.doc(invoiceId).get();
      const invoiceModel = InvoiceModel.fromFirestore(doc);
      
      if (!invoiceModel) {
        throw new NotFoundError('Invoice not found');
      }

      invoiceModel.markAsPaid(paidAt);
      await collections.invoices.doc(invoiceId).update(invoiceModel.toFirestore());
      const invoiceData = invoiceModel.toAPI();

      logger.info(`✅ Invoice marked as paid: ${invoiceId}`, {
        invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.totalAmount
      });

      return { id: invoiceId, ...invoiceData };
    } catch (error: any) {
      logger.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  async voidInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    try {
      const doc = await collections.invoices.doc(invoiceId).get();
      const invoiceModel = InvoiceModel.fromFirestore(doc);
      
      if (!invoiceModel) {
        throw new NotFoundError('Invoice not found');
      }

      if (invoiceModel.isPaid()) {
        throw new ValidationError('Cannot void a paid invoice');
      }

      invoiceModel.markAsVoid();
      if (reason) {
        invoiceModel.setMetadata({ voidReason: reason });
      }

      await collections.invoices.doc(invoiceId).update(invoiceModel.toFirestore());
      const invoiceData = invoiceModel.toAPI();

      logger.info(`✅ Invoice voided: ${invoiceId}`, {
        invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        reason
      });

      return { id: invoiceId, ...invoiceData };
    } catch (error: any) {
      logger.error('Error voiding invoice:', error);
      throw error;
    }
  }
}

// Instance singleton
export const invoiceService = new InvoiceService();
export default invoiceService;