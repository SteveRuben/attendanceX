/**
 * Routes de configuration de billetterie
 * Gère les types de billets, codes promo et paramètres
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { tenantContextMiddleware } from "../../middleware/tenant-context.middleware";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { TicketConfigController } from "../../controllers/ticketing/ticket-config.controller";

const router = Router();

// Middleware chain obligatoire
router.use(smartRateLimit);
router.use(requireAuth);
router.use(tenantContextMiddleware.injectTenantContext());
router.use(tenantContextMiddleware.validateTenantAccess());

// ============================================
// Ticket Types Routes
// ============================================

/**
 * @route POST /api/ticket-config/ticket-types
 * @desc Créer un nouveau type de billet
 * @access Private (Organizer)
 */
router.post("/ticket-types", TicketConfigController.createTicketType);

/**
 * @route GET /api/ticket-config/ticket-types/:ticketTypeId
 * @desc Récupérer un type de billet par ID
 * @access Private
 */
router.get("/ticket-types/:ticketTypeId", TicketConfigController.getTicketType);

/**
 * @route GET /api/ticket-config/events/:eventId/ticket-types
 * @desc Récupérer tous les types de billets d'un événement
 * @access Private
 */
router.get("/events/:eventId/ticket-types", TicketConfigController.getTicketTypesByEvent);

/**
 * @route PUT /api/ticket-config/ticket-types/:ticketTypeId
 * @desc Mettre à jour un type de billet
 * @access Private (Organizer)
 */
router.put("/ticket-types/:ticketTypeId", TicketConfigController.updateTicketType);

/**
 * @route DELETE /api/ticket-config/ticket-types/:ticketTypeId
 * @desc Supprimer un type de billet
 * @access Private (Organizer)
 */
router.delete("/ticket-types/:ticketTypeId", TicketConfigController.deleteTicketType);

// ============================================
// Promo Codes Routes
// ============================================

/**
 * @route POST /api/ticket-config/promo-codes
 * @desc Créer un code promo
 * @access Private (Organizer)
 */
router.post("/promo-codes", TicketConfigController.createPromoCode);

/**
 * @route POST /api/ticket-config/promo-codes/validate
 * @desc Valider un code promo
 * @access Private
 */
router.post("/promo-codes/validate", TicketConfigController.validatePromoCode);

// ============================================
// Ticketing Settings Routes
// ============================================

/**
 * @route PUT /api/ticket-config/events/:eventId/settings
 * @desc Créer ou mettre à jour les paramètres de billetterie
 * @access Private (Organizer)
 */
router.put("/events/:eventId/settings", TicketConfigController.upsertTicketingSettings);

/**
 * @route GET /api/ticket-config/events/:eventId/settings
 * @desc Récupérer les paramètres de billetterie
 * @access Private
 */
router.get("/events/:eventId/settings", TicketConfigController.getTicketingSettings);

/**
 * @route GET /api/ticket-config/events/:eventId/summary
 * @desc Récupérer la configuration complète de billetterie (settings + ticket types + promo codes)
 * @access Private
 */
router.get("/events/:eventId/summary", TicketConfigController.getTicketingConfigSummary);

export { router as ticketConfigRoutes };
