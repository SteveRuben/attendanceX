import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validation";
import { rateLimit, rateLimitConfigs } from "../../middleware/rateLimit";
import { z } from "zod";
import appointmentAnalyticsRoutes from "./appointment-analytics.routes";
import { AppointmentController } from "../../controllers/appointment/appointment.controller";


const router = Router();

// ========== SCHÉMAS DE VALIDATION ==========

// Schéma pour la création d'un rendez-vous
const createAppointmentSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  practitionerId: z.string().min(1, "Practitioner ID is required"),
  serviceId: z.string().min(1, "Service ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional()
});

// Schéma pour la mise à jour d'un rendez-vous
const updateAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format").optional(),
  duration: z.number().min(5).max(480).optional(),
  serviceId: z.string().min(1).optional(),
  practitionerId: z.string().min(1).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']).optional()
});

// Schéma pour la mise à jour du statut
const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional()
});

// Schéma pour la finalisation d'un rendez-vous
const completeAppointmentSchema = z.object({
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional()
});

// Schéma pour l'annulation
const cancelAppointmentSchema = z.object({
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional()
});

// Schéma pour la suppression
const deleteAppointmentSchema = z.object({
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional()
});

// Schéma pour les filtres de rendez-vous
const appointmentFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  practitionerId: z.string().optional(),
  serviceId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.array(z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])).optional(),
  searchQuery: z.string().max(100).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schéma pour les créneaux disponibles
const availableSlotsSchema = z.object({
  practitionerId: z.string().min(1, "Practitioner ID is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  serviceId: z.string().optional(),
  duration: z.number().min(5).max(480).optional()
});

// Schéma pour les créneaux disponibles publics
const publicAvailableSlotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  serviceId: z.string().optional(),
  practitionerId: z.string().optional()
});

// Schéma pour les paramètres d'organisation
const organizationParamsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required")
});

// Schéma pour les paramètres avec appointment ID
const appointmentParamsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  appointmentId: z.string().min(1, "Appointment ID is required")
});

// Schéma pour la réservation publique
const publicBookingSchema = z.object({
  clientData: z.object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Valid phone number is required").max(20),
    preferences: z.object({
      reminderMethod: z.enum(['email', 'sms', 'both']).optional(),
      language: z.string().min(2).max(5).optional(),
      timezone: z.string().optional()
    }).optional()
  }),
  appointmentData: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
    serviceId: z.string().min(1, "Service ID is required"),
    practitionerId: z.string().optional(),
    notes: z.string().max(1000).optional()
  })
});

// Schéma pour la modification de réservation publique
const modifyPublicBookingSchema = z.object({
  clientEmail: z.string().email("Valid email is required"),
  updates: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    serviceId: z.string().min(1).optional(),
    notes: z.string().max(1000).optional()
  })
});

// Schéma pour l'annulation de réservation publique
const cancelPublicBookingSchema = z.object({
  clientEmail: z.string().email("Valid email is required"),
  reason: z.string().max(500).optional()
});

// ========== ROUTES PROTÉGÉES (AUTHENTIFICATION REQUISE) ==========

/**
 * @swagger
 * /appointments/{organizationId}:
 *   post:
 *     tags: [Appointments]
 *     summary: Créer un nouveau rendez-vous
 *     description: |
 *       Crée un nouveau rendez-vous pour l'organisation spécifiée.
 *       
 *       **Fonctionnalités:**
 *       - Validation des données d'entrée
 *       - Vérification de disponibilité automatique
 *       - Détection de conflits
 *       - Création du rendez-vous avec statut "scheduled"
 *       
 *       **Validations:**
 *       - Client et praticien doivent exister
 *       - Créneau doit être disponible
 *       - Date doit être dans le futur
 *       - Respect des horaires d'ouverture
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'organisation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientId:
 *                 type: string
 *                 description: ID du client
 *               practitionerId:
 *                 type: string
 *                 description: ID du praticien
 *               serviceId:
 *                 type: string
 *                 description: ID du service
 *               date:
 *                 type: string
 *                 format: date
 *                 pattern: '^\d{4}-\d{2}-\d{2}$'
 *                 description: Date du rendez-vous (YYYY-MM-DD)
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                 description: Heure de début (HH:MM)
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes optionnelles
 *             required: [clientId, practitionerId, serviceId, date, startTime]
 *           example:
 *             clientId: "client123"
 *             practitionerId: "practitioner456"
 *             serviceId: "service789"
 *             date: "2024-03-15"
 *             startTime: "14:30"
 *             notes: "Première consultation"
 *     responses:
 *       201:
 *         description: Rendez-vous créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Rendez-vous créé avec succès"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Conflit de créneaux
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "APPOINTMENT_CONFLICT"
 *                 message: "Ce créneau est déjà occupé"
 */
router.post("/:organizationId",
  authenticate,
  validateParams(organizationParamsSchema),
  validateBody(createAppointmentSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.createAppointment
);

/**
 * @swagger
 * /appointments/{organizationId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Récupérer les rendez-vous avec filtres
 *     description: |
 *       Récupère la liste des rendez-vous pour l'organisation avec possibilité de filtrage.
 *       
 *       **Filtres disponibles:**
 *       - Par période (startDate, endDate)
 *       - Par praticien (practitionerId)
 *       - Par service (serviceId)
 *       - Par client (clientId)
 *       - Par statut (status)
 *       - Recherche textuelle (searchQuery)
 *       - Pagination (page, limit)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'organisation
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: Filtrer par praticien
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Filtrer par service
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filtrer par client
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [scheduled, confirmed, completed, cancelled, no-show]
 *         description: Filtrer par statut
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Recherche textuelle
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des rendez-vous
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 count:
 *                   type: integer
 *                   description: Nombre total de résultats
 */
router.get("/:organizationId",
  authenticate,
  validateParams(organizationParamsSchema),
  validateQuery(appointmentFiltersSchema),
  AppointmentController.getAppointments
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Récupérer un rendez-vous par ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Détails du rendez-vous
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:organizationId/:appointmentId",
  authenticate,
  validateParams(appointmentParamsSchema),
  AppointmentController.getAppointmentById
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}:
 *   put:
 *     tags: [Appointments]
 *     summary: Mettre à jour un rendez-vous
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               duration:
 *                 type: integer
 *                 minimum: 5
 *                 maximum: 480
 *               serviceId:
 *                 type: string
 *               practitionerId:
 *                 type: string
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, completed, cancelled, no-show]
 *     responses:
 *       200:
 *         description: Rendez-vous mis à jour avec succès
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflit de créneaux
 */
router.put("/:organizationId/:appointmentId",
  authenticate,
  validateParams(appointmentParamsSchema),
  validateBody(updateAppointmentSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.updateAppointment
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}:
 *   delete:
 *     tags: [Appointments]
 *     summary: Supprimer un rendez-vous
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Raison de la suppression
 *     responses:
 *       200:
 *         description: Rendez-vous supprimé avec succès
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:organizationId/:appointmentId",
  authenticate,
  validateParams(appointmentParamsSchema),
  validateBody(deleteAppointmentSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.deleteAppointment
);

// ========== ROUTES D'ACTIONS SPÉCIFIQUES ==========

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Mettre à jour le statut d'un rendez-vous
 *     security:
 *       - bearerAuth: []
 */
router.patch("/:organizationId/:appointmentId/status",
  authenticate,
  validateParams(appointmentParamsSchema),
  validateBody(updateStatusSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.updateAppointmentStatus
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}/confirm:
 *   post:
 *     tags: [Appointments]
 *     summary: Confirmer un rendez-vous
 *     security:
 *       - bearerAuth: []
 */
router.post("/:organizationId/:appointmentId/confirm",
  authenticate,
  validateParams(appointmentParamsSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.confirmAppointment
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}/complete:
 *   post:
 *     tags: [Appointments]
 *     summary: Terminer un rendez-vous
 *     security:
 *       - bearerAuth: []
 */
router.post("/:organizationId/:appointmentId/complete",
  authenticate,
  validateParams(appointmentParamsSchema),
  validateBody(completeAppointmentSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.completeAppointment
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}/cancel:
 *   post:
 *     tags: [Appointments]
 *     summary: Annuler un rendez-vous
 *     security:
 *       - bearerAuth: []
 */
router.post("/:organizationId/:appointmentId/cancel",
  authenticate,
  validateParams(appointmentParamsSchema),
  validateBody(cancelAppointmentSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.cancelAppointment
);

/**
 * @swagger
 * /appointments/{organizationId}/{appointmentId}/no-show:
 *   post:
 *     tags: [Appointments]
 *     summary: Marquer un rendez-vous comme absent
 *     security:
 *       - bearerAuth: []
 */
router.post("/:organizationId/:appointmentId/no-show",
  authenticate,
  validateParams(appointmentParamsSchema),
  rateLimit(rateLimitConfigs.default),
  AppointmentController.markAsNoShow
);

// ========== ROUTES POUR LES CRÉNEAUX DISPONIBLES ==========

/**
 * @swagger
 * /appointments/{organizationId}/available-slots:
 *   get:
 *     tags: [Appointments]
 *     summary: Récupérer les créneaux disponibles (protégé)
 *     security:
 *       - bearerAuth: []
 */
router.get("/:organizationId/available-slots",
  authenticate,
  validateParams(organizationParamsSchema),
  validateQuery(availableSlotsSchema),
  AppointmentController.getAvailableSlots
);

// ========== ROUTES PUBLIQUES (PAS D'AUTHENTIFICATION) ==========

/**
 * @swagger
 * /appointments/{organizationId}/public/available-slots:
 *   get:
 *     tags: [Public Booking]
 *     summary: Récupérer les créneaux disponibles pour réservation publique
 *     description: |
 *       Endpoint public pour récupérer les créneaux disponibles.
 *       Utilisé par l'interface de réservation client.
 *       
 *       **Fonctionnalités:**
 *       - Pas d'authentification requise
 *       - Filtrage par date, service et praticien
 *       - Respect des règles de réservation de l'organisation
 *       - Rate limiting pour éviter les abus
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'organisation
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date pour laquelle récupérer les créneaux (YYYY-MM-DD)
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service (optionnel)
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien (optionnel)
 *     responses:
 *       200:
 *         description: Liste des créneaux disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AvailableSlot'
 *             example:
 *               success: true
 *               data:
 *                 - date: "2024-03-15"
 *                   startTime: "09:00"
 *                   endTime: "09:30"
 *                   duration: 30
 *                   practitionerId: "practitioner123"
 *                   serviceId: "service456"
 *                 - date: "2024-03-15"
 *                   startTime: "10:00"
 *                   endTime: "10:30"
 *                   duration: 30
 *                   practitionerId: "practitioner123"
 *                   serviceId: "service456"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.get("/:organizationId/public/available-slots",
  validateParams(organizationParamsSchema),
  validateQuery(publicAvailableSlotsSchema),
  rateLimit(rateLimitConfigs.publicBooking),
  AppointmentController.getPublicAvailableSlots
);

/**
 * @swagger
 * /appointments/{organizationId}/public/book:
 *   post:
 *     tags: [Public Booking]
 *     summary: Créer une réservation publique
 *     description: |
 *       Endpoint public pour créer une réservation.
 *       Utilisé par l'interface de réservation client.
 *       
 *       **Fonctionnalités:**
 *       - Pas d'authentification requise
 *       - Création automatique du client si nouveau
 *       - Validation des créneaux disponibles
 *       - Envoi automatique de confirmation
 *       - Respect des règles de réservation
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'organisation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientData:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 50
 *                   lastName:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 50
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                     minLength: 10
 *                     maxLength: 20
 *                   preferences:
 *                     type: object
 *                     properties:
 *                       reminderMethod:
 *                         type: string
 *                         enum: [email, sms, both]
 *                       language:
 *                         type: string
 *                         minLength: 2
 *                         maxLength: 5
 *                 required: [firstName, lastName, email, phone]
 *               appointmentData:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   startTime:
 *                     type: string
 *                     pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   serviceId:
 *                     type: string
 *                   practitionerId:
 *                     type: string
 *                   notes:
 *                     type: string
 *                     maxLength: 1000
 *                 required: [date, startTime, serviceId]
 *             required: [clientData, appointmentData]
 *           example:
 *             clientData:
 *               firstName: "Jean"
 *               lastName: "Dupont"
 *               email: "jean.dupont@example.com"
 *               phone: "+33123456789"
 *               preferences:
 *                 reminderMethod: "email"
 *                 language: "fr"
 *             appointmentData:
 *               date: "2024-03-15"
 *               startTime: "14:30"
 *               serviceId: "service789"
 *               notes: "Première consultation"
 *     responses:
 *       201:
 *         description: Réservation créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Réservation créée avec succès"
 *                 data:
 *                   type: object
 *                   properties:
 *                     appointment:
 *                       $ref: '#/components/schemas/Appointment'
 *                     client:
 *                       $ref: '#/components/schemas/Client'
 *                     isNewClient:
 *                       type: boolean
 *                       description: Indique si le client a été créé lors de cette réservation
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Conflit de créneaux ou créneau non disponible
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *     security: []
 */
router.post("/:organizationId/public/book",
  validateParams(organizationParamsSchema),
  validateBody(publicBookingSchema),
  rateLimit(rateLimitConfigs.publicBooking),
  AppointmentController.createPublicBooking
);

/**
 * @swagger
 * /appointments/{organizationId}/public/{appointmentId}/modify:
 *   put:
 *     tags: [Public Booking]
 *     summary: Modifier une réservation publique
 *     description: |
 *       Endpoint public pour modifier une réservation existante.
 *       Nécessite l'email du client pour authentification.
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientEmail:
 *                 type: string
 *                 format: email
 *                 description: Email du client pour authentification
 *               updates:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   startTime:
 *                     type: string
 *                     pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   serviceId:
 *                     type: string
 *                   notes:
 *                     type: string
 *                     maxLength: 1000
 *             required: [clientEmail, updates]
 *     responses:
 *       200:
 *         description: Réservation modifiée avec succès
 *       403:
 *         description: Email client incorrect
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *     security: []
 */
router.put("/:organizationId/public/:appointmentId/modify",
  validateParams(appointmentParamsSchema),
  validateBody(modifyPublicBookingSchema),
  rateLimit(rateLimitConfigs.publicBooking),
  AppointmentController.modifyPublicBooking
);

/**
 * @swagger
 * /appointments/{organizationId}/public/{appointmentId}/cancel:
 *   post:
 *     tags: [Public Booking]
 *     summary: Annuler une réservation publique
 *     description: |
 *       Endpoint public pour annuler une réservation existante.
 *       Nécessite l'email du client pour authentification.
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientEmail:
 *                 type: string
 *                 format: email
 *                 description: Email du client pour authentification
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Raison de l'annulation (optionnel)
 *             required: [clientEmail]
 *     responses:
 *       200:
 *         description: Réservation annulée avec succès
 *       403:
 *         description: Email client incorrect
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *     security: []
 */
router.post("/:organizationId/public/:appointmentId/cancel",
  validateParams(appointmentParamsSchema),
  validateBody(cancelPublicBookingSchema),
  rateLimit(rateLimitConfigs.publicBooking),
  AppointmentController.cancelPublicBooking
);

// ========== ROUTES ANALYTICS ==========
router.use("/:organizationId/analytics", appointmentAnalyticsRoutes);

export { router as appointmentRoutes };