import { Response } from "express";
import { logger } from "firebase-functions";
import { asyncAuthHandler } from "../../middleware/errorHandler";
import { invoiceService } from "../../services/billing/invoice.service";
import { AuthenticatedRequest } from "../../types";
import { AuthErrorHandler } from "../../utils/auth";
import { ERROR_CODES } from "../../common/constants";
import { 
  CreateInvoiceRequest
} from "../../models/invoice.model";

export class InvoiceController {

  /**
   * POST /invoices
   * Create a new invoice
   */
  static createInvoice = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.uid;
    const tenantId = req.user?.tenantId;

    try {
      if (!userId || !tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Authentication required");
      }

      const createRequest: CreateInvoiceRequest = {
        ...req.body,
        tenantId
      };

      const invoice = await invoiceService.createInvoice(createRequest);

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error creating invoice:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to create invoice");
    }
  });

  /**
   * GET /invoices/:invoiceId
   * Get invoice by ID
   */
  static getInvoice = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const invoice = await invoiceService.getInvoice(invoiceId);

      if (!invoice) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }

      // Verify tenant ownership
      if (invoice.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.FORBIDDEN, "Access denied");
      }

      res.json({
        success: true,
        data: invoice
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting invoice:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get invoice");
    }
  });

  /**
   * GET /invoices
   * Get invoices for tenant
   */
  static getInvoices = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      const invoices = await invoiceService.getInvoicesByTenant(tenantId);

      res.json({
        success: true,
        data: invoices
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error getting invoices:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to get invoices");
    }
  });

  /**
   * PUT /invoices/:invoiceId
   * Update invoice
   */
  static updateInvoice = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const tenantId = req.user?.tenantId;
      const updateRequest = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      // Verify invoice exists and belongs to tenant
      const existingInvoice = await invoiceService.getInvoice(invoiceId);
      if (!existingInvoice || existingInvoice.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }

      const invoice = await invoiceService.updateInvoice(invoiceId, updateRequest);

      res.json({
        success: true,
        message: "Invoice updated successfully",
        data: invoice
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error updating invoice:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to update invoice");
    }
  });

  /**
   * POST /invoices/:invoiceId/pay
   * Mark invoice as paid
   */
  static markInvoiceAsPaid = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const tenantId = req.user?.tenantId;
      const { paidAt } = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      // Verify invoice exists and belongs to tenant
      const existingInvoice = await invoiceService.getInvoice(invoiceId);
      if (!existingInvoice || existingInvoice.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }

      const invoice = await invoiceService.markInvoiceAsPaid(
        invoiceId, 
        paidAt ? new Date(paidAt) : new Date()
      );

      res.json({
        success: true,
        message: "Invoice marked as paid successfully",
        data: invoice
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error marking invoice as paid:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to mark invoice as paid");
    }
  });

  /**
   * POST /invoices/:invoiceId/void
   * Void invoice
   */
  static voidInvoice = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { invoiceId } = req.params;
      const tenantId = req.user?.tenantId;
      const { reason } = req.body;

      if (!tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.UNAUTHORIZED, "Tenant context required");
      }

      // Verify invoice exists and belongs to tenant
      const existingInvoice = await invoiceService.getInvoice(invoiceId);
      if (!existingInvoice || existingInvoice.tenantId !== tenantId) {
        const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
        return errorHandler.sendError(res, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }

      const invoice = await invoiceService.voidInvoice(invoiceId, reason);

      res.json({
        success: true,
        message: "Invoice voided successfully",
        data: invoice
      });

    } catch (error: any) {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(req);
      logger.error("Error voiding invoice:", error);
      return errorHandler.sendError(res, ERROR_CODES.INTERNAL_SERVER_ERROR, "Failed to void invoice");
    }
  });
}