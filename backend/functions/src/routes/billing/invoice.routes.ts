import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { InvoiceController } from "../../controllers/billing/invoice.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// Routes CRUD
router.post("/", InvoiceController.createInvoice);
router.get("/", InvoiceController.getInvoices);
router.get("/:invoiceId", InvoiceController.getInvoice);
router.put("/:invoiceId", InvoiceController.updateInvoice);
router.post("/:invoiceId/pay", InvoiceController.markInvoiceAsPaid);
router.post("/:invoiceId/void", InvoiceController.voidInvoice);

export { router as invoiceRoutes };