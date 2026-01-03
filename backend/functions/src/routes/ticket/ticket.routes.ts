import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { TicketController } from "../../controllers/ticket/ticket.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// Routes CRUD pour les billets
router.post("/", TicketController.createTicket);
router.post("/bulk", TicketController.createBulkTickets);
router.get("/:ticketId", TicketController.getTicket);
router.put("/:ticketId", TicketController.updateTicket);
router.post("/:ticketId/cancel", TicketController.cancelTicket);

// Routes de validation et check-in
router.post("/validate", TicketController.validateTicket);
router.post("/:ticketId/checkin", TicketController.checkInTicket);

// Routes de téléchargement et email
router.get("/:ticketId/download", TicketController.downloadTicketPDF);
router.post("/:ticketId/send-email", TicketController.sendTicketEmail);

// Routes par événement et participant
router.get("/events/:eventId", TicketController.getTicketsByEvent);
router.get("/events/:eventId/statistics", TicketController.getTicketStatistics);
router.get("/participants/:participantId", TicketController.getTicketsByParticipant);

// Route de traitement d'inscription automatique
router.post("/registration/process", TicketController.processEventRegistration);

export { router as ticketRoutes };