import { Router } from 'express';
import { appointmentAnalyticsController } from '../controllers/appointment-analytics.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { UserRole } from '@attendance-x/shared';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

/**
 * @swagger
 * /api/appointments/analytics/stats:
 *   get:
 *     summary: Récupère les statistiques générales des rendez-vous
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: ID du praticien
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: ID du client
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [scheduled, confirmed, completed, cancelled, no-show]
 *         description: Statuts des rendez-vous à inclure
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', 
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getAppointmentStats.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/attendance-rate:
 *   get:
 *     summary: Calcule le taux de présence pour une période
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien (optionnel)
 *     responses:
 *       200:
 *         description: Taux de présence calculé avec succès
 */
router.get('/attendance-rate',
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getAttendanceRate.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/cancellation-rate:
 *   get:
 *     summary: Calcule le taux d'annulation pour une période
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (YYYY-MM-DD)
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien (optionnel)
 *     responses:
 *       200:
 *         description: Taux d'annulation calculé avec succès
 */
router.get('/cancellation-rate',
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getCancellationRate.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/peak-hours:
 *   get:
 *     summary: Récupère les heures de pointe
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: ID du praticien
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service
 *     responses:
 *       200:
 *         description: Heures de pointe récupérées avec succès
 */
router.get('/peak-hours',
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getPeakHours.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/summary:
 *   get:
 *     summary: Récupère un résumé des métriques clés
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (par défaut 30 derniers jours)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (par défaut aujourd'hui)
 *     responses:
 *       200:
 *         description: Résumé récupéré avec succès
 */
router.get('/summary',
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getSummary.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/trends/monthly:
 *   get:
 *     summary: Récupère les tendances mensuelles
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (par défaut 12 derniers mois)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (par défaut aujourd'hui)
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien
 *     responses:
 *       200:
 *         description: Tendances mensuelles récupérées avec succès
 */
router.get('/trends/monthly',
  requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.ORGANIZER]),
  appointmentAnalyticsController.getMonthlyTrends.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/services:
 *   get:
 *     summary: Récupère les statistiques par service
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *     responses:
 *       200:
 *         description: Statistiques par service récupérées avec succès
 */
router.get('/services',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  appointmentAnalyticsController.getServiceStats.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/practitioners:
 *   get:
 *     summary: Récupère les statistiques par praticien
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service
 *     responses:
 *       200:
 *         description: Statistiques par praticien récupérées avec succès
 */
router.get('/practitioners',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  appointmentAnalyticsController.getPractitionerStats.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/reports/excel:
 *   get:
 *     summary: Génère un rapport Excel des statistiques
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service
 *     responses:
 *       200:
 *         description: Fichier Excel généré et téléchargé
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur lors de la génération du rapport
 */
router.get('/reports/excel',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  appointmentAnalyticsController.generateExcelReport.bind(appointmentAnalyticsController)
);

/**
 * @swagger
 * /api/appointments/analytics/reports/pdf:
 *   get:
 *     summary: Génère un rapport PDF des statistiques
 *     tags: [Appointment Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: ID du praticien
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: ID du service
 *     responses:
 *       200:
 *         description: Fichier PDF généré et téléchargé
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur lors de la génération du rapport
 */
router.get('/reports/pdf',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  appointmentAnalyticsController.generatePDFReport.bind(appointmentAnalyticsController)
);

export default router;