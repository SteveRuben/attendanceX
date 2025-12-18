import {Request, Response} from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { attendanceService } from "../../services";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { AttendanceMethod, AttendanceStatus } from "../../common/types";


/**
 * Contrôleur de gestion des présences
 */
export class AttendanceController {
  /**
   * Enregistrer sa présence (check-in)
   */
  static checkIn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const checkInData = {
      ...req.body,
      userId,
      deviceInfo: {
        type: req.get("User-Agent")?.includes("Mobile") ? "mobile" : "web",
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      },
    };

    const result = await attendanceService.checkIn(checkInData);

    res.json({
      success: true,
      message: result.message,
      data: {
        attendance: result.attendance,
        requiresValidation: result.requiresValidation,
      },
    });
  });

  /**
   * Obtenir une présence par ID
   */
  static getAttendanceById = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const attendance = await attendanceService.getAttendanceById(id);

    res.json({
      success: true,
      data: attendance.getData(),
    });
  });

  /**
   * Obtenir les présences d'un événement
   */
  static getEventAttendances = asyncHandler(async (req: Request, res: Response) => {
    const {eventId} = req.params;

    const attendances = await attendanceService.getAttendancesByEvent(eventId);

    res.json({
      success: true,
      data: attendances.map((a) => a.getData()),
    });
  });

  /**
   * Obtenir mes présences
   */
  static getMyAttendances = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const options = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: parseInt(req.query.limit as string) || 50,
      status: req.query.status as AttendanceStatus,
    };

    const attendances = await attendanceService.getAttendancesByUser(userId, options);

    res.json({
      success: true,
      data: attendances.map((a) => a.getData()),
    });
  });

  /**
   * Obtenir la liste des présences avec filtres
   */
  static getAttendances = asyncHandler(async (req: Request, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      eventId: req.query.eventId as string,
      userId: req.query.userId as string,
      status: req.query.status as AttendanceStatus,
      method: req.query.method as AttendanceMethod,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      } : undefined,
      validationStatus: req.query.validationStatus as "pending" | "validated" | "rejected",
    };

    const result = await attendanceService.getAttendances(options);

    res.json({
      success: true,
      data: result.attendances,
      pagination: result.pagination,
    });
  });

  /**
   * Valider une présence
   */
  static validateAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {approved, notes} = req.body;
    const validatedBy = req.user.uid;

    const attendance = await attendanceService.validateAttendance({
      attendanceId: id,
      validatedBy,
      approved,
      notes,
    });

    res.json({
      success: true,
      message: approved ? "Présence validée" : "Présence rejetée",
      data: attendance.getData(),
    });
  });

  /**
   * Validation en masse des présences
   */
  static bulkValidateAttendances = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {attendanceIds, approved, notes} = req.body;
    const validatedBy = req.user.uid;

    const result = await attendanceService.bulkValidateAttendances(
      attendanceIds,
      validatedBy,
      approved,
      notes
    );

    res.json({
      success: true,
      message: `${result.success.length} présences validées, ${result.failed.length} échecs`,
      data: result,
    });
  });

  /**
   * Marquer les absents automatiquement
   */
  static markAbsentees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {eventId} = req.params;
    const markedBy = req.user.uid;

    const markedCount = await attendanceService.markAbsentees(eventId, markedBy);

    res.json({
      success: true,
      message: `${markedCount} participants marqués comme absents`,
      data: {markedCount},
    });
  });

  /**
   * Opérations en lot sur les présences
   */
  static bulkMarkAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const operation = req.body;
    const performedBy = req.user.uid;

    const result = await attendanceService.bulkMarkAttendance(operation, performedBy);

    res.json({
      success: true,
      message: `Opération effectuée: ${result.success.length} succès, ${result.failed.length} échecs`,
      data: result,
    });
  });

  /**
   * Obtenir les statistiques des présences
   */
  static getAttendanceStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      userId: req.query.userId as string,
      eventId: req.query.eventId as string,
      organizerId: req.query.organizerId as string || req.user.uid,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string),
      } : undefined,
      department: req.query.department as string,
    };

    const stats = await attendanceService.getAttendanceStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Obtenir le rapport de présence d'un événement
   */
  static getEventAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const {eventId} = req.params;

    const report = await attendanceService.getEventAttendanceReport(eventId);

    res.json({
      success: true,
      data: report,
    });
  });

  /**
   * Obtenir le rapport de présence d'un utilisateur
   */
  static getUserAttendanceReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {userId} = req.params;
    const dateRange = {
      start: new Date(req.query.startDate as string || Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(req.query.endDate as string || Date.now()),
    };

    const report = await attendanceService.getUserAttendanceReport(userId, dateRange);

    res.json({
      success: true,
      data: report,
    });
  });

  /**
   * Obtenir les patterns de présence d'un utilisateur
   */
  static getAttendancePatterns = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.params.userId || req.user.uid;

    const patterns = await attendanceService.getAttendancePatterns(userId);

    res.json({
      success: true,
      data: patterns,
    });
  });

  /**
   * Obtenir les métriques de présence en temps réel
   */
  static getRealtimeMetrics = asyncHandler(async (req: Request, res: Response) => {
    const {eventId} = req.params;

    const metrics = await attendanceService.getRealtimeAttendanceMetrics(eventId);

    res.json({
      success: true,
      data: metrics,
    });
  });

  /**
   * Exporter les données de présence
   */
  static exportAttendances = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = req.body;
    const format = req.query.format as "csv" | "json" | "excel" || "csv";
    const requesterId = req.user.uid;

    const result = await attendanceService.exportAttendances(filters, format, requesterId);

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.data);
  });

  /**
   * Synchroniser les présences d'un événement
   */
  static synchronizeEventAttendances = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {eventId} = req.params;

    const result = await attendanceService.synchronizeEventAttendances(eventId);

    res.json({
      success: true,
      message: "Synchronisation terminée",
      data: result,
    });
  });

  /**
   * Diagnostiquer les problèmes de présence d'un événement
   */
  static diagnoseAttendanceIssues = asyncHandler(async (req: Request, res: Response) => {
    const {eventId} = req.params;

    const diagnosis = await attendanceService.diagnoseAttendanceIssues(eventId);

    res.json({
      success: true,
      data: diagnosis,
    });
  });

  /**
   * Obtenir les paramètres de présence
   */
  static getAttendanceSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Pour l'instant, on retourne des paramètres par défaut
    // Dans une implémentation complète, ces paramètres seraient stockés en base
    const defaultSettings = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      workDays: 'Mon-Fri',
      startHour: '09:00',
      endHour: '17:00',
      graceMinutes: 5,
    };

    res.json({
      success: true,
      data: defaultSettings,
    });
  });

  /**
   * Mettre à jour les paramètres de présence
   */
  static updateAttendanceSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const settings = req.body;
    const updatedBy = req.user.uid;

    // Pour l'instant, on simule la sauvegarde
    // Dans une implémentation complète, ces paramètres seraient sauvegardés en base
    console.log('Updating attendance settings:', settings, 'by user:', updatedBy);

    res.json({
      success: true,
      message: 'Paramètres de présence mis à jour avec succès',
      data: settings,
    });
  });
}
