import { Router } from "express";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { webhookSignatureValidation, captureRawBody } from "../../middleware/webhook-signature";
import { FormSubmissionWebhookController } from "../../controllers/webhook/form-submission.webhook";

const router = Router();

// Webhook-specific middleware chain
router.use(smartRateLimit); // Rate limiting
router.use(captureRawBody); // Capture raw body for signature validation
router.use(webhookSignatureValidation); // Validate webhook signatures

// Note: Webhooks don't use standard auth middleware as they come from external systems

/**
 * @swagger
 * /api/webhooks/form-submission:
 *   post:
 *     summary: Webhook pour traiter les soumissions de formulaire
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [form.submitted]
 *                 description: Type d'événement
 *               data:
 *                 type: object
 *                 properties:
 *                   formSubmission:
 *                     type: object
 *                     description: Données de soumission du formulaire
 *                   formId:
 *                     type: string
 *                     description: ID du formulaire
 *                   eventId:
 *                     type: string
 *                     description: ID de l'événement (optionnel)
 *                   tenantId:
 *                     type: string
 *                     description: ID du tenant
 *                   config:
 *                     type: object
 *                     description: Configuration pour le traitement automatique
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp de l'événement
 *               signature:
 *                 type: string
 *                 description: Signature de sécurité (optionnel)
 *             required:
 *               - event
 *               - data
 *               - timestamp
 *     responses:
 *       200:
 *         description: Webhook traité avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketGenerated:
 *                       type: boolean
 *                     ticketId:
 *                       type: string
 *                     ticketNumber:
 *                       type: string
 *                     emailSent:
 *                       type: boolean
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur de traitement
 */
router.post("/form-submission", FormSubmissionWebhookController.processFormSubmission);

/**
 * @swagger
 * /api/webhooks/ticket-status:
 *   post:
 *     summary: Webhook pour les mises à jour de statut de billet
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [ticket.created, ticket.cancelled, ticket.used]
 *                 description: Type d'événement de billet
 *               data:
 *                 type: object
 *                 properties:
 *                   ticketId:
 *                     type: string
 *                     description: ID du billet
 *                   tenantId:
 *                     type: string
 *                     description: ID du tenant
 *                   eventId:
 *                     type: string
 *                     description: ID de l'événement
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *             required:
 *               - event
 *               - data
 *               - timestamp
 *     responses:
 *       200:
 *         description: Webhook traité avec succès
 *       500:
 *         description: Erreur de traitement
 */
router.post("/ticket-status", FormSubmissionWebhookController.processTicketStatusUpdate);

/**
 * @swagger
 * /api/webhooks/event-reminder:
 *   post:
 *     summary: Webhook pour les rappels d'événement
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [event.reminder]
 *                 description: Type d'événement de rappel
 *               data:
 *                 type: object
 *                 properties:
 *                   eventId:
 *                     type: string
 *                     description: ID de l'événement
 *                   tenantId:
 *                     type: string
 *                     description: ID du tenant
 *                   reminderType:
 *                     type: string
 *                     enum: [1hour, 1day, 1week]
 *                     description: Type de rappel
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *             required:
 *               - event
 *               - data
 *               - timestamp
 *     responses:
 *       200:
 *         description: Webhook traité avec succès
 *       500:
 *         description: Erreur de traitement
 */
router.post("/event-reminder", FormSubmissionWebhookController.processEventReminder);

export { router as webhookRoutes };