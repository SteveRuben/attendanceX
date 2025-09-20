// backend/functions/src/services/report.service.ts - PARTIE 1/3

import { getFirestore } from "firebase-admin/firestore";
import { userService } from "./user.service";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { eventService } from "../event/legacy-event.service";
import { attendanceService } from "../attendance/attendance.service";
import { authService } from "../auth/auth.service";
import { AttendanceReport, AttendanceStatus, ChartConfig,
  Report, CustomReport,
   EventReport, GenerateReportRequest, ReportData, ReportFormat, 
   ReportStatus, ReportType, UserReport, 
   DepartmentReport,
   EventType,
   DataAggregation} from "../../common/types";
import { ERROR_CODES } from "../../common/constants";


// 🏭 CLASSE PRINCIPALE DU SERVICE
export class ReportService {

  private readonly db = getFirestore();
  // @ts-ignore
  private readonly reportTemplates = new Map<string, ReportTemplate>();
  private readonly generationQueue = new Map<string, Promise<Report>>();

  constructor() {
    this.initializeTemplates();
  }

  // 📊 GÉNÉRATION DE RAPPORTS
  async generateReport(request: GenerateReportRequest): Promise<Report> {
    try {
      // Validation des données
      await this.validateGenerateRequest(request);

      // Vérifier les permissions
      if (!await this.canGenerateReport(request.generatedBy, request.type)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Vérifier s'il y a déjà une génération en cours pour les mêmes paramètres
      const cacheKey = this.generateCacheKey(request);
      if (this.generationQueue.has(cacheKey)) {
        return await this.generationQueue.get(cacheKey)!;
      }

      // Créer le rapport
      const report = this.createReport(request);

      // Démarrer la génération
      const generationPromise = this.executeReportGeneration(report, request);
      this.generationQueue.set(cacheKey, generationPromise);

      // Sauvegarder le rapport initial
      await this.saveReport(report);

      // Nettoyer le cache une fois terminé
      generationPromise.finally(() => {
        this.generationQueue.delete(cacheKey);
      });

      return await generationPromise;
    } catch (error) {
      console.error("Error generating report:", error);

      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  private async executeReportGeneration(report: Report, request: GenerateReportRequest): Promise<Report> {
    try {
      // Mettre à jour le statut
      report.status = ReportStatus.GENERATING;
      report.startedAt = new Date();
      await this.updateReport(report);

      // Générer les données selon le type de rapport
      let data: ReportData;

      switch (request.type) {
        case "attendance_summary":
          data = await this.generateAttendanceSummary(request);
          break;

        case "event_detail":
          data = await this.generateEventDetail(request);
          break;

        case "user_attendance":
          data = await this.generateUserAttendance(request);
          break;

        case "department_analytics":
          data = await this.generateDepartmentAnalytics(request);
          break;

        case "monthly_summary":
          data = await this.generateMonthlySummary(request);
          break;

        case "custom":
          data = await this.generateCustomReport(request);
          break;

        default:
          throw new Error(`Unsupported report type: ${request.type}`);
      }

      // Générer le fichier dans le format demandé
      const filePath = await this.generateReportFile(report, data, request.format);

      // Mettre à jour le rapport avec les résultats
      report.status = ReportStatus.COMPLETED;
      report.completedAt = new Date();
      report.data = data;
      report.filePath = filePath;
      report.fileSize = await this.getFileSize(filePath);

      await this.updateReport(report);

      // Log de l'audit
      await this.logReportAction("report_generated", report.id!, request.generatedBy, {
        type: request.type,
        format: request.format,
        duration: report.completedAt.getTime() - report.startedAt!.getTime(),
        recordCount: data.summary.totalRecords,
      });

      return report;
    } catch (error) {
      console.error("Error executing report generation:", error);

      // Mettre à jour le statut d'erreur
      report.status = ReportStatus.FAILED;
      report.error = error instanceof Error ? error.message : "Unknown error";
      report.completedAt = new Date();

      await this.updateReport(report);

      throw error;
    }
  }

  // 📈 GÉNÉRATEURS DE RAPPORTS SPÉCIFIQUES
  private async generateAttendanceSummary(request: GenerateReportRequest): Promise<AttendanceReport> {
    const { filters = {} } = request;
    const { startDate, endDate, eventIds, userIds, departments } = filters;

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(),
      end: endDate ? new Date(endDate) : new Date(),
    };
    // Récupérer les données de présence
    const attendances = await this.getAttendanceData({
      dateRange,
      eventIds,
      userIds,
      departments,
    });

    // Récupérer les données des événements associés
    const eventIds_unique = [...new Set(attendances.map((a) => a.eventId))];
    // const events = await this.getEventData(eventIds_unique);
    // const eventMap = new Map(events.map((e) => [e.id!, e]));

    // Récupérer les données des utilisateurs
    const userIds_unique = [...new Set(attendances.map((a) => a.userId))];
    const users = await this.getUserData(userIds_unique);
    const userMap = new Map(users.map((u) => [u.id!, u]));

    // Calculer les statistiques générales
    const totalEvents = eventIds_unique.length;
    const totalUsers = userIds_unique.length;
    const totalAttendances = attendances.length;

    const statusCounts = attendances.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const attendanceRate = totalAttendances > 0 ?
      ((statusCounts[AttendanceStatus.PRESENT] || 0) + (statusCounts[AttendanceStatus.LATE] || 0)) / totalAttendances * 100 :
      0;

    const punctualityRate = statusCounts[AttendanceStatus.PRESENT] && (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE]) ?
      (statusCounts[AttendanceStatus.PRESENT] / (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE])) * 100 :
      0;

    // Analyser les tendances temporelles
    const trends = this.calculateAttendanceTrends(attendances, dateRange);

    // Analyser par département
    const departStats = this.calculateDepartmentStats(attendances, userMap);
    const departmentStats = departStats.map((d) => ({
      department: d.department,
      totalUsers: d.totalParticipants,
      attendanceRate: Math.round(d.attendanceRate * 10) / 10,
      punctualityRate: Math.round(d.punctualityRate * 10) / 10,
    }));

    // Top performers et bottom performers
    const userStats = this.calculateUserStats(attendances, userMap);
    const topPerformers = userStats
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);

    const bottomPerformers = userStats
      .filter((u) => u.totalEvents >= 3) // Au moins 3 événements pour être considéré
      .sort((a, b) => a.attendanceRate - b.attendanceRate)
      .slice(0, 10);

    // Analyser les méthodes de check-in
    const methodStats = attendances.reduce((acc, attendance) => {
      acc[attendance.method] = (acc[attendance.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      type: ReportType.ATTENDANCE_SUMMARY,
      period: dateRange,
      summary: {
        totalEvents,
        totalUsers,
        totalAttendances,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        totalRecords: totalAttendances,
      },
      statusBreakdown: statusCounts,
      trends,
      departmentStats,
      topPerformers: topPerformers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        department: u.department,
        attendanceRate: u.attendanceRate,
        totalEvents: u.totalEvents,
        punctualityRate: u.punctualityRate,
      })),
      bottomPerformers: bottomPerformers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        department: u.department,
        attendanceRate: u.attendanceRate,
        totalEvents: u.totalEvents,
        punctualityRate: u.punctualityRate,
      })),
      methodAnalysis: methodStats,
      insights: this.generateAttendanceInsights(statusCounts, attendanceRate, punctualityRate, trends),
    };
  }

  private async generateEventDetail(request: GenerateReportRequest): Promise<EventReport> {
    const { filters = {} } = request;
    const { eventId } = filters;

    if (!eventId) {
      throw new Error("Event ID is required for event detail report");
    }

    // Récupérer l'événement
    const event = await eventService.getEventById(eventId);
    const eventData = event.getData();

    // Récupérer les présences pour cet événement
    const attendances = await attendanceService.getAttendancesByEvent(eventId);
    const attendanceData = attendances.map((a) => a.getData());

    // Récupérer les données des participants
    const userIds = eventData.participants;
    const users = await this.getUserData(userIds);
    const userMap = new Map(users.map((u) => [u.id!, u]));

    // Calculer les statistiques détaillées
    const totalParticipants = userIds.length;
    const totalAttended = attendanceData.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status as any)
    ).length;

    const statusCounts = attendanceData.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyser la timeline des check-ins
    const checkInTimeline = attendanceData
      .filter((a) => a.checkInTime)
      .sort((a, b) => a.checkInTime!.getTime() - b.checkInTime!.getTime())
      .map((a) => ({
        time: a.checkInTime!,
        userId: a.userId,
        userName: userMap.get(a.userId)?.displayName || "Unknown",
        status: a.status,
        method: a.method,
        minutesFromStart: Math.round((a.checkInTime!.getTime() - eventData.startDateTime.getTime()) / (1000 * 60)),
      }));

    // Analyser les retards
    const lateArrivals = attendanceData
      .filter((a) => a.status === AttendanceStatus.LATE)
      .map((a) => ({
        userId: a.userId,
        userName: userMap.get(a.userId)?.displayName || "Unknown",
        checkInTime: a.checkInTime!,
        minutesLate: a.metrics?.lateMinutes || 0,
      }))
      .sort((a, b) => b.minutesLate - a.minutesLate);

    // Analyser les absents
    const absentees = userIds
      .filter((userId: string) => !attendanceData.some((a) => a.userId === userId))
      .map((userId: string) => ({
        userId,
        userName: userMap.get(userId)?.displayName || "Unknown",
        department: userMap.get(userId)?.profile?.department || "Unknown",
      }));

    // Statistiques par département, calculateEventDepartmentStats
    const departmentStats = this.calculateDepartmentStats(attendanceData, userMap);

    return {
      type: ReportType.EVENT_DETAIL,
      event: {
        id: eventData.id!,
        title: eventData.title,
        type: eventData.type,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        location: eventData.location,
        organizer: eventData.organizerName,
      },
      summary: {
        totalUsers: totalParticipants,
        totalAttendances: totalAttended,
        attendanceRate: totalParticipants > 0 ? (totalAttended / totalParticipants) * 100 : 0,
        punctualityRate: totalAttended > 0 ? ((statusCounts[AttendanceStatus.PRESENT] || 0) / totalAttended) * 100 : 0,
        totalRecords: attendanceData.length,
      },
      statusBreakdown: statusCounts,
      checkInTimeline,
      lateArrivals,
      absentees,
      departmentStats,
      methodUsage: attendanceData.reduce((acc, a) => {
        acc[a.method] = (acc[a.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      insights: this.generateEventInsights(eventData, attendanceData, statusCounts),
    };
  }

  private async generateUserAttendance(request: GenerateReportRequest): Promise<UserReport> {
    const { filters = {} } = request;
    const { userId, startDate, endDate } = filters;
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(),
      end: endDate ? new Date(endDate) : new Date(),
    };
    if (!userId) {
      throw new Error("User ID is required for user attendance report");
    }

    // Récupérer l'utilisateur
    const user = await userService.getUserById(userId);
    const userData = user.getData();

    // Récupérer les présences de l'utilisateur
    const attendances = await attendanceService.getAttendancesByUser(userId, {
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    });
    const attendanceData = attendances.map((a) => a.getData());

    // Récupérer les événements associés
    const eventIds = attendanceData.map((a) => a.eventId);
    const events = await this.getEventData(eventIds);
    const eventMap = new Map(events.map((e) => [e.id!, e]));

    // Calculer les statistiques
    const totalEvents = attendanceData.length;
    const totalAttended = attendanceData.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status as any)
    ).length;

    const statusCounts = attendanceData.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyser les tendances mensuelles, calculateUserMonthlyTrends
    const monthlyTrends = this.calculateUserMonthlyTrends(attendanceData, dateRange);

    // Analyser par type d'événement
    const eventTypeStats = attendanceData.reduce((acc, attendance) => {
      const event = eventMap.get(attendance.eventId);
      if (event) {
        const type = event.type;
        if (!acc[type]) {
          acc[type] = { total: 0, attended: 0, late: 0 };
        }
        acc[type].total++;
        if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status as any)) {
          acc[type].attended++;
        }
        if (attendance.status === AttendanceStatus.LATE) {
          acc[type].late++;
        }
      }
      return acc;
    }, {} as Record<string, { total: number; attended: number; late: number }>);

    // Analyser les patterns de ponctualité
    const punctualityPattern = this.analyzeUserPunctualityPattern(attendanceData, eventMap);

    return {
      type: ReportType.USER_ATTENDANCE,
      user: {
        id: userData.id!,
        name: userData.displayName,
        email: userData.email,
        department: userData.profile.department ?? "Non défini",
        role: userData.role,
      },
      period: dateRange,
      summary: {
        totalEvents,
        totalAttendances: totalAttended,
        attendanceRate: totalEvents > 0 ? (totalAttended / totalEvents) * 100 : 0,
        punctualityRate: totalAttended > 0 ? ((statusCounts[AttendanceStatus.PRESENT] || 0) / totalAttended) * 100 : 0,
        totalRecords: totalEvents,
      },
      statusBreakdown: statusCounts,
      monthlyTrends,
      eventTypeStats,
      punctualityPattern,
      recentAttendances: attendanceData
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, 20)
        .map((a) => ({
          eventId: a.eventId,
          eventTitle: eventMap.get(a.eventId)?.title || "Unknown",
          status: a.status,
          checkInTime: a.checkInTime,
          method: a.method,
          date: a.createdAt,
        })),
      insights: this.generateUserInsights(userData, attendanceData, statusCounts),
    };
  }

  // 🛠️ MÉTHODES UTILITAIRES PRIVÉES
  private async validateGenerateRequest(request: GenerateReportRequest): Promise<void> {
    if (!request.type) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!request.generatedBy) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!["pdf", "excel", "csv", "json"].includes(request.format)) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Valider les filtres selon le type de rapport
    if (request.type === "event_detail" && !request.filters?.eventId) {
      throw new Error("Event ID is required for event detail report");
    }

    if (request.type === "user_attendance" && !request.filters?.userId) {
      throw new Error("User ID is required for user attendance report");
    }
  }

  private async canGenerateReport(userId: string, type: ReportType): Promise<boolean> {
    // Vérifier les permissions selon le type de rapport
    switch (type) {
      case "attendance_summary":
      case "monthly_summary":
        return await authService.hasPermission(userId, "generate_all_reports");

      case "event_detail":
        return await authService.hasPermission(userId, "generate_event_reports");

      case "user_attendance":
        return await authService.hasPermission(userId, "generate_team_reports");

      case "department_analytics":
        return await authService.hasPermission(userId, "generate_all_reports");

      case "custom":
        return await authService.hasPermission(userId, "generate_all_reports");

      default:
        return false;
    }
  }

  private createReport(request: GenerateReportRequest): Report {
    return {
      id: crypto.randomUUID(),
      type: request.type,
      name: request.name || this.generateReportName(request.type, request.filters),
      description: request.description || "",
      format: request.format,
      status: ReportStatus.PENDING,
      generatedBy: request.generatedBy,
      filters: request.filters || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      downloadCount: 0,
      isPublic: request.isPublic || false,
      isRecurring: false,
      configuration: request.configuration || {
        includeCharts: true,
        includeDetails: true,
        includeSummary: true,
        includeMetrics: true,
      },
    };
  }

  private generateReportName(type: ReportType, filters: Record<string, any> = {}): string {
    const timestamp = new Date().toISOString().split("T")[0];

    const typeNames = {
      "attendance_summary": "Résumé de Présence",
      "event_detail": "Détail Événement",
      "user_attendance": "Présence Utilisateur",
      "department_analytics": "Analyse Département",
      "monthly_summary": "Résumé Mensuel",
      "custom": "Rapport Personnalisé",
    };
    // @ts-ignore
    return `${typeNames[type] || type} - ${timestamp}`;
  }

  // backend/functions/src/services/report.service.ts - PARTIE 2/3

  // 🏢 RAPPORT DÉPARTEMENT
  private async generateDepartmentAnalytics(request: GenerateReportRequest): Promise<DepartmentReport> {
    const { filters = {} } = request;
    const { department, startDate, endDate } = filters;
    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(),
      end: endDate ? new Date(endDate) : new Date(),
    };

    if (!department) {
      throw new Error("Department is required for department analytics report");
    }

    // Récupérer les utilisateurs du département
    const departmentUsers = await this.getUsersByDepartment(department);
    const userIds = departmentUsers.map((u) => u.id!);

    // Récupérer les présences du département
    const attendances = await this.getAttendanceData({
      userIds,
      dateRange,
    });

    // Récupérer les événements associés
    const eventIds = [...new Set(attendances.map((a) => a.eventId))];
    const events = await this.getEventData(eventIds);

    // Calculer les statistiques globales du département
    const totalEmployees = departmentUsers.length;
    const activeEmployees = userIds.filter((userId) =>
      attendances.some((a) => a.userId === userId)
    ).length;

    const totalEvents = eventIds.length;
    const totalAttendances = attendances.length;

    const statusCounts = attendances.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overallAttendanceRate = totalAttendances > 0 ?
      ((statusCounts[AttendanceStatus.PRESENT] || 0) + (statusCounts[AttendanceStatus.LATE] || 0)) / totalAttendances * 100 :
      0;

    // Analyser les performances individuelles
    const employeeStats = userIds.map((userId) => {
      const userAttendances = attendances.filter((a) => a.userId === userId);
      const userEvents = userAttendances.length;
      const userPresent = userAttendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status as any)
      ).length;

      const user = departmentUsers.find((u) => u.id === userId)!;

      return {
        userId,
        userName: user.displayName,
        position: user.profile.position || "Non définie",
        totalEvents: userEvents,
        attendanceRate: userEvents > 0 ? (userPresent / userEvents) * 100 : 0,
        punctualityRate: userPresent > 0 ? ((userAttendances.filter((a) => a.status === AttendanceStatus.PRESENT).length) / userPresent) * 100 : 0,
        lastActivity: userAttendances.length > 0 ? Math.max(...userAttendances.map((a) => a.createdAt?.getTime() || 0)) : 0,
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Analyser les tendances temporelles
    const trends = this.calculateDepartmentTrends(attendances, dateRange);

    // Analyser par type d'événement
    const eventTypeAnalysis = this.analyzeDepartmentEventTypes(attendances, events);

    // Identifier les problèmes et opportunités
    const insights = this.generateDepartmentInsights(employeeStats, trends, overallAttendanceRate);

    return {
      type: ReportType.DEPARTMENT_STATS,
      department: {
        name: department,
        totalEmployees,
        activeEmployees,
      },
      period: dateRange,
      summary: {
        totalEvents,
        totalAttendances,
        attendanceRate: Math.round(overallAttendanceRate * 10) / 10,
        punctualityRate: statusCounts[AttendanceStatus.PRESENT] && (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE]) ?
          Math.round((statusCounts[AttendanceStatus.PRESENT] / (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE])) * 100 * 10) / 10 :
          0,
        totalRecords: totalAttendances,
      },
      employeeStats,
      trends,
      eventTypeAnalysis,
      statusBreakdown: statusCounts,
      insights,
    };
  }


  // 📅 RAPPORT MENSUEL
  private async generateMonthlySummary(request: GenerateReportRequest): Promise<CustomReport> {
    const { filters = {} } = request;
    const { month, year } = filters;

    if (!month || !year) {
      throw new Error("Month and year are required for monthly summary report");
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const dateRange = { start: startDate, end: endDate };

    // Récupérer toutes les données du mois
    const [attendances, events, users] = await Promise.all([
      this.getAttendanceData({ dateRange }),
      this.getEventData([], dateRange),
      this.getAllActiveUsers(),
    ]);

    // Calculer les métriques globales
    const totalEvents = events.length;
    const totalUsers = users.length;
    const totalAttendances = attendances.length;

    const statusCounts = attendances.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyser les événements par semaine
    const weeklyAnalysis = this.analyzeWeeklyData(events, attendances, startDate, endDate);

    // Top événements par participation
    const eventStats = events.map((event) => {
      const eventAttendances = attendances.filter((a) => a.eventId === event.id);
      const attendedCount = eventAttendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status as any)
      ).length;

      return {
        eventId: event.id!,
        title: event.title,
        type: event.type,
        date: event.startDateTime,
        expectedParticipants: event.participants.length,
        actualAttendees: attendedCount,
        attendanceRate: event.participants.length > 0 ? (attendedCount / event.participants.length) * 100 : 0,
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate);

    // Analyse des départements
    const departmentAnalysis = await this.analyzeDepartmentPerformance(attendances, users);

    return {
      type: ReportType.MONTHLY_SUMMARY,
      period: dateRange,
      summary: {
        totalEvents,
        totalUsers,
        totalAttendances,
        attendanceRate: totalAttendances > 0 ?
          ((statusCounts[AttendanceStatus.PRESENT] || 0) + (statusCounts[AttendanceStatus.LATE] || 0)) / totalAttendances * 100 :
          0,
        punctualityRate: statusCounts[AttendanceStatus.PRESENT] && (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE]) ?
          (statusCounts[AttendanceStatus.PRESENT] / (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE])) * 100 :
          0,
        totalRecords: totalAttendances,
      },
      data: {
        weeklyAnalysis,
        topEvents: eventStats.slice(0, 10),
        departmentAnalysis,
        trends: this.calculateMonthlyTrends(attendances, events, startDate, endDate),
        aggregatedData: [...statusCounts],
      },
      charts: [
        {
          type: "line",
          title: "Évolution hebdomadaire de la présence",
          data: weeklyAnalysis.map((w) => ({
            week: `Semaine ${w.week}`,
            attendanceRate: w.attendanceRate,
          })),
        },
        {
          type: "bar",
          title: "Répartition par statut de présence",
          data: Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
          })),
        },
        {
          type: "pie",
          title: "Répartition par département",
          data: departmentAnalysis.map((d) => ({
            department: d.department,
            attendanceRate: d.averageAttendanceRate,
          })),
        },
      ],
      insights: this.generateMonthlyInsights(statusCounts, weeklyAnalysis, departmentAnalysis),
    };
  }

  // 🎨 RAPPORT PERSONNALISÉ
  private async generateCustomReport(request: GenerateReportRequest): Promise<CustomReport> {
    const { filters = {} } = request;
    const { startDate, endDate } = filters;

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const aggregations: any[] = [];
    const groupBy: string[] = [];
    const charts: ChartConfig[] = [];
    const sort: any[] = [];

    if (!aggregations || !Array.isArray(aggregations)) {
      throw new Error("Aggregations are required for custom reports");
    }

    // Récupérer les données selon les filtres
    const baseData: any[] = [];// await this.getFilteredData(filters);

    // Appliquer les agrégations
    const aggregatedData = this.applyAggregations(baseData, {
      groupBy: groupBy || [],
      aggregations,
      filters,
      sort,
    });

    // Générer les graphiques si demandés
    const generatedCharts = charts ? await this.generateCharts(aggregatedData, charts) : [];

    return {
      type: ReportType.CUSTOM,
      period: dateRange,
      summary: {
        totalRecords: aggregatedData.length,
        totalEvents: 0,
        totalUsers: 0,
        totalAttendances: 0,
        attendanceRate: 0,
        punctualityRate: 0,
      },
      data: {
        aggregatedData,
        rawDataSample: baseData.slice(0, 100), // Échantillon des données brutes
      },
      charts: generatedCharts,
      insights: this.generateCustomInsights(aggregatedData, aggregations),
    };
  }

  // 📁 GÉNÉRATION DE FICHIERS
  private async generateReportFile(
    report: Report,
    data: ReportData,
    format: ReportFormat
  ): Promise<string> {
    const fileName = `${report.id}_${report.name.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
    const filePath = path.join("/tmp/reports", fileName);

    // Créer le répertoire s'il n'existe pas
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    switch (format) {
      case "pdf":
        await this.generatePDF(data, filePath);
        break;

      case "excel":
        await this.generateExcel(data, filePath);
        break;

      case "csv":
        await this.generateCSV(data, filePath);
        break;

      case "json":
        await this.generateJSON(data, filePath);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return filePath;
  }

  private async generatePDF(data: ReportData, filePath: string): Promise<void> {
    // TODO: Implémenter la génération PDF avec une bibliothèque comme puppeteer ou jsPDF
    const htmlContent = this.generateHTMLReport(data);

    // Pour l'instant, sauvegarder en HTML
    await fs.writeFile(filePath.replace(".pdf", ".html"), htmlContent, "utf8");

    console.log(`PDF generation not implemented, saved as HTML: ${filePath}`);
  }

  private async generateExcel(data: ReportData, filePath: string): Promise<void> {
    // TODO: Implémenter la génération Excel avec une bibliothèque comme exceljs
    const csvContent = this.generateCSVContent(data);

    // Pour l'instant, sauvegarder en CSV
    await fs.writeFile(filePath.replace(".xlsx", ".csv"), csvContent, "utf8");

    console.log(`Excel generation not implemented, saved as CSV: ${filePath}`);
  }

  private async generateCSV(data: ReportData, filePath: string): Promise<void> {
    const csvContent = this.generateCSVContent(data);
    await fs.writeFile(filePath, csvContent, "utf8");
  }

  private async generateJSON(data: ReportData, filePath: string): Promise<void> {
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonContent, "utf8");
  }

  private generateCSVContent(data: ReportData): string {
    const lines: string[] = [];

    // En-tête du rapport
    lines.push(`"Rapport","${data.type}"`);
    lines.push(`"Période","${data.period?.start} - ${data.period?.end}"`);
    lines.push(`"Généré le","${new Date().toISOString()}"`);
    lines.push("");

    // Résumé
    if (data.summary) {
      lines.push("RÉSUMÉ");
      Object.entries(data.summary).forEach(([key, value]) => {
        lines.push(`"${key}","${value}"`);
      });
      lines.push("");
    }

    // Données spécifiques selon le type
    if (data.type === ReportType.ATTENDANCE_SUMMARY) {
      const attendanceData = data as AttendanceReport;

      // Top performers
      if (attendanceData.topPerformers) {
        lines.push("TOP PERFORMERS");
        lines.push('"Nom","Département","Taux de présence","Événements","Ponctualité"');
        attendanceData.topPerformers.forEach(performer => {
          lines.push(`"${performer.userName}","${performer.department}","${performer.attendanceRate}%","${performer.totalEvents}","${performer.punctualityRate}%"`);
        });
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  private generateHTMLReport(data: ReportData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport ${data.type}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .summary { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .chart { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rapport ${data.type}</h1>
            <p>Période: ${data.period?.start} - ${data.period?.end}</p>
            <p>Généré le: ${new Date().toLocaleString()}</p>
          </div>
          
          ${data.summary ? `
            <div class="summary">
              <h2>Résumé</h2>
              ${Object.entries(data.summary).map(([key, value]) =>
      `<p><strong>${key}:</strong> ${value}</p>`
    ).join('')}
            </div>
          ` : ''}
          
          ${this.generateHTMLCharts(data)}
          
          <div class="insights">
            <h2>Insights</h2>
            ${data.insights ? data.insights.map(insight => `<p>• ${insight}</p>`).join('') : ''}
          </div>
        </body>
      </html>
    `;
  }

  private generateHTMLCharts(data: ReportData): string {
    // Vérifier si les données ont des graphiques (pour CustomReport)
    const customData = data as CustomReport;
    if (!customData.charts || customData.charts.length === 0) {return '';}

    return `
      <div class="charts">
        <h2>Graphiques</h2>
        ${customData.charts.map((chart) => `
          <div class="chart">
            <h3>${chart.title}</h3>
            <p>Type: ${chart.type}</p>
            <pre>${JSON.stringify(chart.data, null, 2)}</pre>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 📊 MÉTHODES D'ANALYSE ET CALCUL
  private calculateAttendanceTrends(
    attendances: any[],
    dateRange: { start: Date; end: Date }
  ): Array<{ date: string; attendanceRate: number; totalEvents: number }> {
    const trends: Array<{ date: string; attendanceRate: number; totalEvents: number }> = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (let date = new Date(dateRange.start); date <= dateRange.end; date = new Date(date.getTime() + dayMs)) {
      const dayAttendances = attendances.filter(a =>
        a.createdAt && this.isSameDay(a.createdAt, date)
      );

      const totalEvents = dayAttendances.length;
      const presentCount = dayAttendances.filter(a =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
      ).length;

      trends.push({
        date: new Date(date).toISOString(),
        attendanceRate: totalEvents > 0 ? (presentCount / totalEvents) * 100 : 0,
        totalEvents,
      });
    }

    return trends;
  }

  private calculateDepartmentStats(
    attendances: any[],
    userMap: Map<string, any>
  ): Array<{ department: string; totalParticipants: number; attendanceRate: number; punctualityRate: number }> {
    const deptStats = new Map<string, { total: number; present: number; punctual: number }>();

    attendances.forEach(attendance => {
      const user = userMap.get(attendance.userId);
      const dept = user?.profile?.department || 'Non défini';

      if (!deptStats.has(dept)) {
        deptStats.set(dept, { total: 0, present: 0, punctual: 0 });
      }

      const stats = deptStats.get(dept)!;
      stats.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        stats.present++;
        if (attendance.status === AttendanceStatus.PRESENT) {
          stats.punctual++;
        }
      }
    });

    return Array.from(deptStats.entries()).map(([department, stats]) => ({
      department,
      totalParticipants: stats.total,
      attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
      punctualityRate: stats.present > 0 ? (stats.punctual / stats.present) * 100 : 0,
    }));
  }

  private calculateUserStats(
    attendances: any[],
    userMap: Map<string, any>
  ): Array<{ userId: string; userName: string; department: string; totalEvents: number; attendanceRate: number; punctualityRate: number }> {
    const userStats = new Map<string, { total: number; present: number; punctual: number }>();

    attendances.forEach(attendance => {
      if (!userStats.has(attendance.userId)) {
        userStats.set(attendance.userId, { total: 0, present: 0, punctual: 0 });
      }

      const stats = userStats.get(attendance.userId)!;
      stats.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        stats.present++;
        if (attendance.status === AttendanceStatus.PRESENT) {
          stats.punctual++;
        }
      }
    });

    return Array.from(userStats.entries()).map(([userId, stats]) => {
      const user = userMap.get(userId);
      return {
        userId,
        userName: user?.displayName || 'Unknown',
        department: user?.profile?.department || 'Non défini',
        totalEvents: stats.total,
        attendanceRate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
        punctualityRate: stats.present > 0 ? (stats.punctual / stats.present) * 100 : 0,
      };
    });
  }

  private calculateUserMonthlyTrends(
    attendances: any[],
    dateRange: { start: Date; end: Date }
  ): Array<{ month: string; attendanceRate: number; punctualityRate: number }> {
    const monthlyData = new Map<string, { total: number; present: number; punctuality: number }>();

    attendances.forEach(attendance => {
      if (attendance.createdAt) {
        const monthKey = `${attendance.createdAt.getFullYear()}-${attendance.createdAt.getMonth() + 1}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { total: 0, present: 0, punctuality: 0 });
        }

        const data = monthlyData.get(monthKey)!;
        data.total++;

        if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE, AttendanceStatus.PARTIAL].includes(attendance.status)) {
          data.present++;
        }
        if ([AttendanceStatus.PRESENT].includes(attendance.status)) {
          data.punctuality++;
        }
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
      punctualityRate: data.total > 0 ? (data.punctuality / data.total) * 100 : 0,
    }));
  }

  private analyzeUserPunctualityPattern(
    attendances: any[],
    eventMap: Map<string, any>
  ): { averageArrivalTime: number; mostCommonTimeSlot: string; tendencyToLate: number } {
    const lateAttendances = attendances.filter(a => a.status === AttendanceStatus.LATE);
    const totalLateMinutes = lateAttendances.reduce((sum, a) => sum + (a.metrics?.lateMinutes || 0), 0);

    // Analyser par type d'événement
    const eventTypeLateness = new Map<string, number[]>();
    lateAttendances.forEach(attendance => {
      const event = eventMap.get(attendance.eventId);
      if (event) {
        if (!eventTypeLateness.has(event.type)) {
          eventTypeLateness.set(event.type, []);
        }
        eventTypeLateness.get(event.type)!.push(attendance.metrics?.lateMinutes || 0);
      }
    });

    // @ts-ignore
    let mostLateEventType = 'N/A';
    let maxAverageLateness = 0;

    eventTypeLateness.forEach((lateTimes, eventType) => {
      const average = lateTimes.reduce((sum, time) => sum + time, 0) / lateTimes.length;
      if (average > maxAverageLateness) {
        maxAverageLateness = average;
        mostLateEventType = eventType;
      }
    });

    return {
      averageArrivalTime: lateAttendances.length > 0 ? 1 - (totalLateMinutes / lateAttendances.length) : 0,
      mostCommonTimeSlot: this.determinePunctualityTrend(attendances),
      tendencyToLate: maxAverageLateness,
    };
  }

  // 🔍 MÉTHODES D'INSIGHTS
  private generateAttendanceInsights(
    statusCounts: Record<string, number>,
    attendanceRate: number,
    punctualityRate: number,
    trends: any[]
  ): string[] {
    const insights: string[] = [];

    if (attendanceRate > 85) {
      insights.push("Excellent taux de présence global");
    } else if (attendanceRate < 60) {
      insights.push("Taux de présence préoccupant, nécessite une attention");
    }

    if (punctualityRate > 90) {
      insights.push("Excellente ponctualité des participants");
    } else if (punctualityRate < 70) {
      insights.push("Problème de ponctualité à adresser");
    }

    // Analyser les tendances
    if (trends.length >= 7) {
      const recentTrend = trends.slice(-7);
      const isImproving = recentTrend[recentTrend.length - 1].attendanceRate > recentTrend[0].attendanceRate;

      if (isImproving) {
        insights.push("Tendance positive de la présence sur la période récente");
      } else {
        insights.push("Tendance décroissante de la présence à surveiller");
      }
    }

    return insights;
  }

  private generateEventInsights(eventData: any, attendanceData: any[], statusCounts: Record<string, number>): string[] {
    const insights: string[] = [];
    const attendanceRate = (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE]) / eventData.participants.length * 100;

    if (attendanceRate > 90) {
      insights.push("Excellent taux de participation pour cet événement");
    } else if (attendanceRate < 50) {
      insights.push("Faible participation, considérer les facteurs d'amélioration");
    }

    if (statusCounts[AttendanceStatus.LATE] > statusCounts[AttendanceStatus.PRESENT] * 0.3) {
      insights.push("Taux de retard élevé, vérifier l'horaire et la communication");
    }

    return insights;
  }

  private generateUserInsights(userData: any, attendanceData: any[], statusCounts: Record<string, number>): string[] {
    const insights: string[] = [];
    const attendanceRate = (statusCounts[AttendanceStatus.PRESENT] + statusCounts[AttendanceStatus.LATE]) / attendanceData.length * 100;

    if (attendanceRate > 95) {
      insights.push("Utilisateur très assidu");
    } else if (attendanceRate < 60) {
      insights.push("Présence irrégulière, suivi recommandé");
    }

    return insights;
  }

  // 🛠️ MÉTHODES UTILITAIRES
  private async getAttendanceData(filters: {
    dateRange?: { start: Date; end: Date };
    eventIds?: string[];
    userIds?: string[];
    departments?: string[];
  }): Promise<any[]> {
    // Simulation - en production, utiliser AttendanceService
    return [];
  }

  private async getEventData(eventIds: string[], dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const eventOptions = {
      dateRange,
      status: undefined,
    };

    const events = await eventService.getEvents(eventOptions);
    return eventIds ? events.events.filter((e) => eventIds.includes(e.id!)) : events.events;
  }

  private async getUserData(userIds: string[]): Promise<any[]> {
    // Simulation - en production, utiliser UserService
    const users = [];
    for (const userId of userIds) {
      try {
        const user = await userService.getUserById(userId);
        users.push(user.getData());
      } catch (error) {
        console.warn(`User not found: ${userId}`);
      }
    }
    return users;
  }

  private async getUsersByDepartment(department: string): Promise<any[]> {
    const result = await userService.getUsers({ department });
    return result.users;
  }

  private async getAllActiveUsers(): Promise<any[]> {
    const result = await userService.getUsers({ status: 'active' as any });
    return result.users;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }

  private determinePunctualityTrend(attendances: any[]): string {
    // Analyser la tendance de ponctualité sur les derniers événements
    const recentAttendances = attendances.slice(-10);
    const lateCount = recentAttendances.filter(a => a.status === AttendanceStatus.LATE).length;

    if (lateCount === 0) {return "Excellent";}
    if (lateCount <= 2) {return "Bon";}
    if (lateCount <= 5) {return "Moyen";}
    return "Préoccupant";
  }

  private generateCacheKey(request: GenerateReportRequest): string {
    return `${request.type}_${JSON.stringify(request.filters)}_${request.format}`;
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async saveReport(report: Report): Promise<void> {
    await this.db.collection("reports").doc(report.id!).set(report);
  }

  private async updateReport(report: Report): Promise<void> {
    report.updatedAt = new Date();

    // Convertir l'objet Report en format compatible Firestore
    const updateData = {
      ...report,
      // S'assurer que les dates sont correctement sérialisées
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      startedAt: report.startedAt || null,
      completedAt: report.completedAt || null,
      expiresAt: report.expiresAt,
      // Sérialiser les données complexes si nécessaire
      data: report.data ? JSON.parse(JSON.stringify(report.data)) : null,
      filters: report.filters ? JSON.parse(JSON.stringify(report.filters)) : {},
      configuration: report.configuration ? JSON.parse(JSON.stringify(report.configuration)) : null,
    };

    await this.db.collection("reports").doc(report.id!).update(updateData);
  }

  private async logReportAction(
    action: string,
    reportId: string,
    performedBy: string,
    details?: any
  ): Promise<void> {
    await this.db.collection("audit_logs").add({
      action,
      targetType: "report",
      targetId: reportId,
      performedBy,
      performedAt: new Date(),
      details,
    });
  }

  private initializeTemplates(): void {
    // Initialiser les templates de rapport par défaut
    console.log("Report templates initialized");
  }

  // Méthodes non implémentées (stubs pour compilation)
  private calculateDepartmentTrends(attendances: any[], dateRange: { start: Date; end: Date }): any[] {
    const trends = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    // Analyser semaine par semaine
    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekAttendances = attendances.filter((a) =>
        a.createdAt && a.createdAt >= weekStart && a.createdAt < weekEnd
      );

      const eventCount = new Set(weekAttendances.map((a) => a.eventId)).size;
      const attendedCount = weekAttendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
      ).length;

      trends.push({
        date: weekStart.toISOString().split("T")[0],
        attendanceRate: weekAttendances.length > 0 ? (attendedCount / weekAttendances.length) * 100 : 0,
        eventCount,
        totalAttendances: weekAttendances.length,
      });

      current.setDate(current.getDate() + 7);
    }

    return trends;
  }
  private analyzeDepartmentEventTypes(attendances: any[], events: any[]): Record<EventType, {
    totalEvents: number;
    averageAttendance: number;
    popularityScore: number;
  }> {
    const eventTypeData = new Map<EventType, {
      events: Set<string>;
      totalAttendances: number;
      totalParticipants: number;
    }>();

    // Analyser chaque présence
    attendances.forEach((attendance) => {
      const event = events.find((e) => e.id === attendance.eventId);
      if (!event) {return;}

      const eventType = event.type as EventType;

      if (!eventTypeData.has(eventType)) {
        eventTypeData.set(eventType, {
          events: new Set(),
          totalAttendances: 0,
          totalParticipants: 0,
        });
      }

      const typeData = eventTypeData.get(eventType)!;
      typeData.events.add(attendance.eventId);

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        typeData.totalAttendances++;
      }
    });

    // Calculer les métriques pour chaque type
    const result: any = {};

    eventTypeData.forEach((data, eventType) => {
      const eventsOfType = events.filter((e) => e.type === eventType);
      const totalEvents = data.events.size;
      const totalPossibleAttendances = eventsOfType.reduce((sum, event) =>
        sum + (event.participants?.length || 0), 0);

      result[eventType] = {
        totalEvents,
        averageAttendance: totalEvents > 0 ? data.totalAttendances / totalEvents : 0,
        popularityScore: totalPossibleAttendances > 0 ? (data.totalAttendances / totalPossibleAttendances) * 100 : 0,
      };
    });

    return result;
  }
  private generateDepartmentInsights(employeeStats: any[], trends: any[], overallRate: number): string[] {
    const insights = [];

    // Identifier les employés à risque
    const lowPerformers = employeeStats.filter((emp) => emp.attendanceRate < 70);
    if (lowPerformers.length > 0) {
      insights.push(`${lowPerformers.length} employés ont un taux de présence préoccupant (<70%).`);
    }

    // Analyser la ponctualité
    const avgPunctuality = employeeStats.reduce((sum, emp) => sum + emp.punctualityRate, 0) / employeeStats.length;
    if (avgPunctuality < 80) {
      insights.push("Le taux de ponctualité du département est en dessous de la moyenne.");
    }

    // Comparer à la moyenne globale
    if (overallRate > 90) {
      insights.push("Excellent taux de présence départemental !");
    } else if (overallRate < 70) {
      insights.push("Le département nécessite des actions d'amélioration.");
    }

    return insights;
  }
  private analyzeWeeklyData(events: any[], attendances: any[], startDate: Date, endDate: Date): any[] {
    const weeks = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekEvents = events.filter((e) =>
        e.startDateTime >= weekStart && e.startDateTime < weekEnd
      );

      const weekAttendances = attendances.filter((a) =>
        a.createdAt >= weekStart && a.createdAt < weekEnd
      );

      const weekNumber = Math.ceil((current.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      weeks.push({
        week: weekNumber,
        startDate: weekStart,
        endDate: weekEnd,
        eventCount: weekEvents.length,
        attendanceCount: weekAttendances.length,
        attendanceRate: weekAttendances.length > 0 ?
          (weekAttendances.filter((a) => [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)).length / weekAttendances.length) * 100 :
          0,
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }
  private async analyzeDepartmentPerformance(attendances: any[], users: any[]): Promise<any[]> {
    const departmentMap = new Map<string, {
      users: Set<string>;
      attendances: any[];
    }>();

    // Grouper par département
    attendances.forEach((attendance) => {
      const user = users.find((u) => u.id === attendance.userId);
      const department = user?.profile?.department || "Non défini";

      if (!departmentMap.has(department)) {
        departmentMap.set(department, {
          users: new Set(),
          attendances: [],
        });
      }

      const deptData = departmentMap.get(department)!;
      deptData.users.add(attendance.userId);
      deptData.attendances.push(attendance);
    });

    // Calculer les statistiques par département
    return Array.from(departmentMap.entries()).map(([department, data]) => {
      const totalAttendances = data.attendances.length;
      const presentCount = data.attendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
      ).length;

      return {
        department,
        userCount: data.users.size,
        totalAttendances,
        averageAttendanceRate: totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0,
        punctualityRate: presentCount > 0 ?
          (data.attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length / presentCount) * 100 :
          0,
      };
    }).sort((a, b) => b.averageAttendanceRate - a.averageAttendanceRate);
  }
  private calculateMonthlyTrends(attendances: any[], events: any[], startDate: Date, endDate: Date): any[] {
    // Calculer les tendances jour par jour pour le mois
    const daily = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);

      const dayAttendances = attendances.filter((a) =>
        a.createdAt >= dayStart && a.createdAt < dayEnd
      );

      const dayEvents = events.filter((e) =>
        e.startDateTime >= dayStart && e.startDateTime < dayEnd
      );

      daily.push({
        date: current.toISOString().split("T")[0],
        eventCount: dayEvents.length,
        attendanceCount: dayAttendances.length,
        attendanceRate: dayAttendances.length > 0 ?
          (dayAttendances.filter(
            (a) => [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)).length / dayAttendances.length) * 100 :
          0,
      });

      current.setDate(current.getDate() + 1);
    }

    return daily;
  }
  private generateMonthlyInsights(statusCounts: any, weeklyAnalysis: any[], departmentAnalysis: any[]): string[] {
    const insights = [];

    // Analyser les tendances hebdomadaires
    if (weeklyAnalysis.length >= 2) {
      const firstWeek = weeklyAnalysis[0].attendanceRate;
      const lastWeek = weeklyAnalysis[weeklyAnalysis.length - 1].attendanceRate;
      const trend = lastWeek - firstWeek;

      if (trend > 5) {
        insights.push("Tendance positive : amélioration du taux de présence au cours du mois.");
      } else if (trend < -5) {
        insights.push("Tendance préoccupante : baisse du taux de présence au cours du mois.");
      }
    }

    // Analyser les départements
    if (departmentAnalysis.length > 0) {
      const bestDept = departmentAnalysis[0];
      const worstDept = departmentAnalysis[departmentAnalysis.length - 1];

      if (bestDept.averageAttendanceRate - worstDept.averageAttendanceRate > 20) {
        insights.push(`Écart important entre départements : ${bestDept.department} (${bestDept.averageAttendanceRate.toFixed(1)}%) vs ${worstDept.department} (${worstDept.averageAttendanceRate.toFixed(1)}%).`);
      }
    }

    return insights;
  }

  private groupData(data: any[], groupBy: string[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    data.forEach((item) => {
      const key = groupBy.map((field) => item[field] || "null").join("|");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }

  private applyAggregations(data: any[], config: DataAggregation): any[] {
    // Groupement des données
    const grouped = this.groupData(data, config.groupBy);

    // Application des agrégations
    return Object.entries(grouped).map(([key, items]) => {
      const result: any = {};

      // Ajouter les champs de groupement
      config.groupBy.forEach((field, index) => {
        result[field] = key.split("|")[index];
      });

      // Calculer les agrégations
      config.aggregations.forEach((agg) => {
        const fieldValues = items.map((item) => item[agg.field]).filter((v) => v !== null && v !== undefined);
        const alias = agg.alias || `${agg.operation}_${agg.field}`;

        switch (agg.operation) {
          case "count":
            result[alias] = items.length;
            break;
          case "sum":
            result[alias] = fieldValues.reduce((sum, val) => sum + Number(val), 0);
            break;
          case "avg":
            result[alias] = fieldValues.length > 0 ?
              fieldValues.reduce((sum, val) => sum + Number(val), 0) / fieldValues.length :
              0;
            break;
          case "min":
            result[alias] = fieldValues.length > 0 ? Math.min(...fieldValues.map(Number)) : 0;
            break;
          case "max":
            result[alias] = fieldValues.length > 0 ? Math.max(...fieldValues.map(Number)) : 0;
            break;
        }
      });

      return result;
    });
  }
  private async generateCharts(data: any[], configs: ChartConfig[]): Promise<any[]> {
    const generatedCharts = [];

    for (const config of configs) {
      try {
        // Valider la configuration du graphique
        if (!config.type || !config.title || !config.xAxis || !config.yAxis) {
          console.warn(`Invalid chart config: ${config.title}`);
          continue;
        }

        // Préparer les données selon le type de graphique
        let chartData: any[];

        switch (config.type) {
          case "line":
          case "area":
            chartData = this.prepareLineChartData(data, config);
            break;

          case "bar":
            chartData = this.prepareBarChartData(data, config);
            break;

          case "pie":
          case "doughnut":
            chartData = this.preparePieChartData(data, config);
            break;

          case "scatter":
            chartData = this.prepareScatterChartData(data, config);
            break;

          default:
            console.warn(`Unsupported chart type: ${config.type}`);
            continue;
        }

        // Limiter le nombre de points de données pour les performances
        const maxDataPoints = this.getMaxDataPoints(config.type);
        if (chartData.length > maxDataPoints) {
          chartData = this.sampleData(chartData, maxDataPoints);
        }

        // Générer les options du graphique
        const chartOptions = this.generateChartOptions(config);

        generatedCharts.push({
          id: crypto.randomUUID(),
          type: config.type,
          title: config.title,
          data: chartData,
          options: chartOptions,
          xAxis: config.xAxis,
          yAxis: config.yAxis,
          colors: config.colors || this.getDefaultColors(config.type),
          generated: true,
          generatedAt: new Date(),
          dataPoints: chartData.length,
        });
      } catch (error) {
        console.error(`Error generating chart "${config.title}":`, error);

        // Ajouter un graphique d'erreur
        generatedCharts.push({
          id: crypto.randomUUID(),
          type: config.type,
          title: config.title,
          data: [],
          error: error instanceof Error ? error.message : "Unknown error",
          generated: false,
          generatedAt: new Date(),
        });
      }
    }

    return generatedCharts;
  }
  private generateCustomInsights(data: any[], aggregations: any[]): string[] {
    const insights: string[] = [];

    if (data.length === 0) {
      insights.push("Aucune donnée trouvée pour les critères spécifiés.");
      return insights;
    }

    // Analyser les agrégations numériques
    aggregations.forEach((agg) => {
      if (["sum", "avg", "count"].includes(agg.operation)) {
        const alias = agg.alias || `${agg.operation}_${agg.field}`;
        const values = data.map((item) => item[alias]).filter((v) => v !== null && v !== undefined);

        if (values.length > 0) {
          const max = Math.max(...values);
          const min = Math.min(...values);
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

          insights.push(`${alias}: Maximum = ${max}, Minimum = ${min}, Moyenne = ${avg.toFixed(2)}`);
        }
      }
    });

    return insights;
  }

  private getDefaultColors(chartType: string): string[] {
    const colorPalettes = {
      default: [
        "#3B82F6", // Blue
        "#EF4444", // Red
        "#10B981", // Green
        "#F59E0B", // Yellow
        "#8B5CF6", // Purple
        "#06B6D4", // Cyan
        "#F97316", // Orange
        "#84CC16", // Lime
        "#EC4899", // Pink
        "#6B7280", // Gray
      ],
      pie: [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
        "#DDA0DD", "#FFB347", "#87CEEB", "#F0E68C", "#FFA07A",
      ],
      professional: [
        "#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED",
        "#0891B2", "#EA580C", "#65A30D", "#BE185D", "#4B5563",
      ],
    };

    if (chartType === "pie" || chartType === "doughnut") {
      return colorPalettes.pie;
    }

    return colorPalettes.professional;
  }

  // 🛠️ MÉTHODES UTILITAIRES

  private formatAxisValue(value: any, axis: "x" | "y"): any {
    if (value === null || value === undefined) {return "";}

    // Formater les dates
    if (value instanceof Date) {
      return value.toISOString().split("T")[0]; // Format YYYY-MM-DD
    }

    // Formater les nombres pour l'axe Y
    if (axis === "y" && typeof value === "number") {
      // Arrondir à 2 décimales
      return Math.round(value * 100) / 100;
    }

    return value;
  }

  private getMaxDataPoints(chartType: string): number {
    const limits = {
      line: 100,
      area: 100,
      bar: 50,
      pie: 20,
      doughnut: 20,
      scatter: 200,
    };

    return limits[chartType as keyof typeof limits] || 50;
  }

  private sampleData(data: any[], maxPoints: number): any[] {
    if (data.length <= maxPoints) {
      return data;
    }

    // Échantillonnage uniforme
    const step = Math.floor(data.length / maxPoints);
    const sampled = [];

    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }

    // S'assurer d'inclure le dernier point
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled[sampled.length - 1] = data[data.length - 1];
    }

    return sampled.slice(0, maxPoints);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // @ts-ignore
  private generateQuickCharts(reportType: ReportType, data: any): any[] {
    const charts = [];

    switch (reportType) {
      case ReportType.ATTENDANCE_SUMMARY:
        charts.push(
          this.createStatusBreakdownChart(data.statusBreakdown),
          this.createTrendsChart(data.trends),
          this.createDepartmentChart(data.departmentStats)
        );
        break;

      case ReportType.EVENT_DETAIL:
        charts.push(
          this.createCheckInTimelineChart(data.checkInTimeline),
          this.createMethodUsageChart(data.methodUsage)
        );
        break;

      case ReportType.USER_ATTENDANCE:
        charts.push(
          this.createMonthlyTrendsChart(data.monthlyTrends),
          this.createEventTypeStatsChart(data.eventTypeStats)
        );
        break;

      case ReportType.DEPARTMENT_STATS:
        charts.push(
          this.createEmployeePerformanceChart(data.employeeStats),
          this.createDepartmentTrendsChart(data.trends)
        );
        break;
    }

    return charts.filter((chart) => chart !== null && chart !== undefined);
  }

  private createStatusBreakdownChart(statusBreakdown: Record<string, number>): any {
    return {
      type: "pie",
      title: "Répartition des statuts de présence",
      data: Object.entries(statusBreakdown).map(([status, count]) => ({
        name: this.getStatusLabel(status),
        value: count,
      })),
      generated: true,
    };
  }

  private createTrendsChart(trends: any[]): any {
    return {
      type: "line",
      title: "Évolution du taux de présence",
      data: trends.map((trend) => ({
        x: trend.date,
        y: trend.attendanceRate,
      })),
      generated: true,
    };
  }

  private createDepartmentChart(departmentStats: any[]): any {
    return {
      type: "bar",
      title: "Performance par département",
      data: departmentStats.map((dept) => ({
        category: dept.department,
        value: dept.attendanceRate,
      })),
      generated: true,
    };
  }

  private createCheckInTimelineChart(timeline: any[]): any {
    return {
      type: "scatter",
      title: "Timeline des arrivées",
      data: timeline.map((entry) => ({
        x: entry.minutesFromStart,
        y: entry.time.getHours() + entry.time.getMinutes() / 60,
        label: entry.userName,
      })),
      generated: true,
    };
  }

  private createMethodUsageChart(methodUsage: Record<string, number>): any {
    return {
      type: "doughnut",
      title: "Méthodes de check-in utilisées",
      data: Object.entries(methodUsage).map(([method, count]) => ({
        name: this.getMethodLabel(method),
        value: count,
      })),
      generated: true,
    };
  }

  private createMonthlyTrendsChart(monthlyTrends: any[]): any {
    return {
      type: "line",
      title: "Évolution mensuelle",
      data: monthlyTrends.map((trend) => ({
        x: trend.month,
        y: trend.attendanceRate,
      })),
      generated: true,
    };
  }

  private createEventTypeStatsChart(eventTypeStats: Record<string, any>): any {
    return {
      type: "bar",
      title: "Performance par type d'événement",
      data: Object.entries(eventTypeStats).map(([type, stats]) => ({
        category: this.getEventTypeLabel(type),
        value: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0,
      })),
      generated: true,
    };
  }

  private createEmployeePerformanceChart(employeeStats: any[]): any {
    return {
      type: "bar",
      title: "Performance des employés",
      data: employeeStats.slice(0, 10).map((emp) => ({
        category: emp.userName,
        value: emp.attendanceRate,
      })),
      generated: true,
    };
  }

  private createDepartmentTrendsChart(trends: any[]): any {
    return {
      type: "area",
      title: "Tendances du département",
      data: trends.map((trend) => ({
        x: trend.date,
        y: trend.attendanceRate,
      })),
      generated: true,
    };
  }

  // 🏷️ MÉTHODES DE LABELLISATION

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      [AttendanceStatus.PRESENT]: "Présent",
      [AttendanceStatus.LATE]: "En retard",
      [AttendanceStatus.ABSENT]: "Absent",
      [AttendanceStatus.EXCUSED]: "Excusé",
    };
    return labels[status] || status;
  }

  private getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      "qr_code": "QR Code",
      "manual": "Manuel",
      "nfc": "NFC",
      "geolocation": "Géolocalisation",
      "biometric": "Biométrique",
    };
    return labels[method] || method;
  }

  private getEventTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      "meeting": "Réunion",
      "training": "Formation",
      "conference": "Conférence",
      "workshop": "Atelier",
      "presentation": "Présentation",
      "seminar": "Séminaire",
    };
    return labels[type] || type;
  }

  private prepareLineChartData(data: any[], config: ChartConfig): any[] {
    return data
      .filter((item) =>
        item[config.xAxis.field] !== null && item[config.xAxis.field] !== undefined &&
        item[config.yAxis.field] !== undefined
      )
      .map((item) => ({
        x: this.formatAxisValue(item[config.xAxis.field], "x"),
        y: this.formatAxisValue(item[config.yAxis.field], "y"),
        label: item[config.xAxis.field],
        value: item[config.yAxis.field],
        original: item,
      }))
      .sort((a, b) => {
        // Trier par axe X pour les graphiques linéaires
        if (typeof a.x === "string" && typeof b.x === "string") {
          return a.x.localeCompare(b.x);
        }
        return Number(a.x) - Number(b.x);
      });
  }

  private prepareBarChartData(data: any[], config: ChartConfig): any[] {
    return data
      .filter((item) =>
        item[config.xAxis.field] !== null && item[config.xAxis.field] !== undefined &&
        item[config.yAxis.field] !== undefined
      )
      .map((item) => ({
        category: String(item[config.xAxis.field]),
        value: Number(item[config.yAxis.field]) || 0,
        label: String(item[config.xAxis.field]),
        original: item,
      }))
      .sort((a, b) => b.value - a.value); // Trier par valeur décroissante
  }

  private preparePieChartData(data: any[], config: ChartConfig): any[] {
    const pieData = data
      .filter((item) =>
        item[config.xAxis.field] !== null && item[config.xAxis.field] !== undefined &&
        item[config.yAxis.field] !== undefined
      )
      .map((item) => ({
        name: String(item[config.xAxis.field]),
        value: Number(item[config.yAxis.field]) || 0,
        percentage: 0, // Calculé après
        original: item,
      }));

    // Calculer les pourcentages
    const total = pieData.reduce((sum, item) => sum + item.value, 0);

    if (total > 0) {
      pieData.forEach((item) => {
        item.percentage = Math.round((item.value / total) * 100 * 10) / 10;
      });
    }

    return pieData
      .filter((item) => item.value > 0) // Exclure les valeurs nulles
      .sort((a, b) => b.value - a.value); // Trier par valeur décroissante
  }

  private prepareScatterChartData(data: any[], config: ChartConfig): any[] {
    return data
      .filter((item) =>
        item[config.xAxis.field] !== null && item[config.xAxis.field] !== undefined &&
        item[config.yAxis.field] !== undefined
      )
      .map((item) => ({
        x: Number(item[config.xAxis.field]) || 0,
        y: Number(item[config.yAxis.field]) || 0,
        label: item.name || item.title || `Point ${data.indexOf(item) + 1}`,
        original: item,
      }));
  }

  // 🎨 MÉTHODES DE CONFIGURATION

  private generateChartOptions(config: ChartConfig): any {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: config.title,
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: ["pie", "doughnut"].includes(config.type),
          position: "bottom",
        },
        tooltip: {
          enabled: true,
          mode: "index",
          intersect: false,
        },
      },
      scales: this.generateScaleOptions(config),
      animation: {
        duration: 1000,
        easing: "easeInOutQuart",
      },
    };

    // Fusionner avec les options personnalisées
    if (config.options) {
      return this.deepMerge(baseOptions, config.options);
    }

    return baseOptions;
  }

  private generateScaleOptions(config: ChartConfig): any {
    // Les graphiques circulaires n'ont pas d'axes
    if (["pie", "doughnut"].includes(config.type)) {
      return {};
    }

    return {
      x: {
        display: true,
        title: {
          display: true,
          text: config.xAxis.label,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          display: true,
          color: "#e0e0e0",
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: config.yAxis.label,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          display: true,
          color: "#e0e0e0",
        },
        beginAtZero: true,
      },
    };
  }
}

export const reportService = new ReportService();
