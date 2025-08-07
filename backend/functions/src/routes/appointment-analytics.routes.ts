import { Router } from 'express';
import { appointmentAnalyticsController } from '../controllers/appointment-analytics.controller';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/roles';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalAppointments:
 *                       type: number
 *                     attendanceRate:
 *                       type: number
 *                     cancellationRate:
 *                       type: number
 *                     noShowRate:
 *                       type: number
 *                     averageDuration:
 *                       type: number
 *                     peakHours:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: number
 *                           count:
 *                             type: number
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non autorisé
 *       500:
 *         description: Erreur serveur
 */
router.get('/stats', 
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendanceRate:
 *                       type: number
 *                     period:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                     practitionerId:
 *                       type: string
 *                       nullable: true
 */
router.get('/attendance-rate',
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
  roleMiddleware(['admin', 'manager', 'practitioner']),
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
  roleMiddleware(['admin', 'manager']),
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
  roleMiddleware(['admin', 'manager']),
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
  roleMiddleware(['admin', 'manager']),
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
  roleMiddleware(['admin', 'manager']),
  appointmentAnalyticsController.generatePDFReport.bind(appointmentAnalyticsController)
);

export default router;