// backend/functions/src/services/report.service.ts - PARTIE 1/3

import {getFirestore, Query, FieldValue} from "firebase-admin/firestore";
import {authService} from "./auth.service";
import {userService} from "./user.service";
import {eventService} from "./event.service";
import {attendanceService} from "./attendance.service";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import {
  Report,
  ReportType,
  ReportStatus,
  ReportFormat,
  ERROR_CODES,
  AttendanceStatus,
  ReportTemplate,
  GenerateReportRequest,
  ReportData,
  AttendanceReport,
  EventReport,
  UserReport,
  DepartmentReport,
  CustomReport,
  DataAggregation,
  ReportListOptions,
  ReportStats,
  ChartConfig,
  EventType,
} from "@attendance-x/shared";


// 🏭 CLASSE PRINCIPALE DU SERVICE
export class ReportService {
  private readonly db = getFirestore();
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
    const {filters = {}} = request;
    const {startDate, endDate, eventIds, userIds, departments} = filters;

    const dateRange={
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
    const events = await this.getEventData(eventIds_unique);
    const eventMap = new Map(events.map((e) => [e.id!, e]));

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
    const departmentStats= departStats.map((d) => ({
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
    const {filters = {}} = request;
    const {eventId} = filters;

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
      .filter((userId:string) => !attendanceData.some((a) => a.userId === userId))
      .map((userId:string) => ({
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
    const {filters = {}} = request;
    const {userId, startDate, endDate} = filters;
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
          acc[type] = {total: 0, attended: 0, late: 0};
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
    const {filters = {}} = request;
    const {department, startDate, endDate} = filters;
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
    const {filters = {}} = request;
    const {month, year} = filters;

    if (!month || !year) {
      throw new Error("Month and year are required for monthly summary report");
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const dateRange = {start: startDate, end: endDate};

    // Récupérer toutes les données du mois
    const [attendances, events, users] = await Promise.all([
      this.getAttendanceData({dateRange}),
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
    const {filters = {}} = request;
    const {startDate, endDate} = filters;

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
    await fs.mkdir(path.dirname(filePath), {recursive: true});

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
    // TODO: Implémenter avec une bibliothèque comme exceljs
    const csvContent = this.generateCSVContent(data);
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

  // 🔧 MÉTHODES D'ANALYSE ET DE CALCUL
  private calculateAttendanceTrends(
    attendances: any[],
    dateRange?: { start: Date; end: Date }
  ): Array<{ date: string; attendanceRate: number; totalEvents: number }> {
    if (!dateRange) return [];

    const trends = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);

      const dayAttendances = attendances.filter((a) =>
        a.createdAt >= dayStart && a.createdAt < dayEnd
      );

      const totalEvents = new Set(dayAttendances.map((a) => a.eventId)).size;
      const attended = dayAttendances.filter((a) =>
        [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
      ).length;

      trends.push({
        date: current.toISOString().split("T")[0],
        attendanceRate: dayAttendances.length > 0 ? (attended / dayAttendances.length) * 100 : 0,
        totalEvents,
      });

      current.setDate(current.getDate() + 1);
    }

    return trends;
  }

  private calculateDepartmentStats(
    attendances: any[],
    userMap: Map<string, any>
  ): Array<{
    department: string;
    totalParticipants: number;
    attendanceRate: number;
    punctualityRate: number }> {
    const departmentData = new Map<string, {
      users: Set<string>;
      total: number;
      attended: number;
      punctual: number;
    }>();

    attendances.forEach((attendance) => {
      const user = userMap.get(attendance.userId);
      const department = user?.profile?.department || "Non défini";

      if (!departmentData.has(department)) {
        departmentData.set(department, {
          users: new Set(),
          total: 0,
          attended: 0,
          punctual: 0,
        });
      }

      const data = departmentData.get(department)!;
      data.users.add(attendance.userId);
      data.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        data.attended++;
      }

      if (attendance.status === AttendanceStatus.PRESENT) {
        data.punctual++;
      }
    });

    return Array.from(departmentData.entries()).map(([department, data]) => ({
      department,
      totalParticipants: data.users.size,
      attendanceRate: data.total > 0 ? (data.attended / data.total) * 100 : 0,
      punctualityRate: data.attended > 0 ? (data.punctual / data.attended) * 100 : 0,
    }));
  }

  private calculateUserStats(
    attendances: any[],
    userMap: Map<string, any>
  ): Array<{
    userId: string;
    userName: string;
    department: string;
    totalEvents: number;
    attendanceRate: number;
    punctualityRate: number;
  }> {
    const userStats = new Map<string, {
      total: number;
      attended: number;
      punctual: number;
    }>();

    attendances.forEach((attendance) => {
      if (!userStats.has(attendance.userId)) {
        userStats.set(attendance.userId, {total: 0, attended: 0, punctual: 0});
      }

      const stats = userStats.get(attendance.userId)!;
      stats.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        stats.attended++;
      }

      if (attendance.status === AttendanceStatus.PRESENT) {
        stats.punctual++;
      }
    });

    return Array.from(userStats.entries()).map(([userId, stats]) => {
      const user = userMap.get(userId);
      return {
        userId,
        userName: user?.displayName || "Unknown",
        department: user?.profile?.department || "Non défini",
        totalEvents: stats.total,
        attendanceRate: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0,
        punctualityRate: stats.attended > 0 ? (stats.punctual / stats.attended) * 100 : 0,
      };
    });
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
        const fieldValues = items.map((item) => item[agg.field]).filter((v) => v != null);
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

  private generateCSVContent(data: ReportData): string {
    // Extraire les données tabulaires du rapport
    let csvContent = "";

    if ("topPerformers" in data && data.topPerformers) {
      csvContent += "Top Performers\n";
      csvContent += "User ID,User Name,Department,Attendance Rate,Total Events,Punctuality Rate\n";
      // @ts-ignore
      data.topPerformers.forEach((performer: any) => {
        csvContent += `${performer.userId},${performer.userName},${performer.department},${performer.attendanceRate},${performer.totalEvents},${performer.punctualityRate}\n`;
      });
      csvContent += "\n";
    }

    if ("statusBreakdown" in data && data.statusBreakdown) {
      csvContent += "Status Breakdown\n";
      csvContent += "Status,Count\n";

      Object.entries(data.statusBreakdown).forEach(([status, count]) => {
        csvContent += `${status},${count}\n`;
      });
    }

    return csvContent;
  }

  private generateHTMLReport(data: ReportData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport ${data.type}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
          .section { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport ${data.type}</h1>
          <p>Généré le ${new Date().toLocaleDateString("fr-FR")}</p>
        </div>
        
        <div class="summary">
          <h2>Résumé</h2>
          <p>Total des enregistrements: ${data.summary.totalRecords}</p>
          <p>Taux de présence: ${data.summary.attendanceRate}%</p>
          <p>Taux de ponctualité: ${data.summary.punctualityRate}%</p>
        </div>
        
        <div class="section">
          <h2>Données détaillées</h2>
          <p>Les données complètes sont disponibles dans les fichiers CSV/JSON associés.</p>
        </div>
      </body>
      </html>
    `;
  }

  // 🧠 GÉNÉRATION D'INSIGHTS
  private generateAttendanceInsights(
    statusCounts: Record<string, number>,
    attendanceRate: number,
    punctualityRate: number,
    trends: any[]
  ): string[] {
    const insights = [];

    if (attendanceRate < 70) {
      insights.push("Le taux de présence est préoccupant (<70%). Considérez des mesures d'amélioration.");
    } else if (attendanceRate > 90) {
      insights.push("Excellent taux de présence (>90%). Félicitations !");
    }

    if (punctualityRate < 80) {
      insights.push("Le taux de ponctualité pourrait être amélioré. Considérez des rappels plus fréquents.");
    }

    const lateCount = statusCounts[AttendanceStatus.LATE] || 0;
    const totalPresent = (statusCounts[AttendanceStatus.PRESENT] || 0) + lateCount;

    if (lateCount > totalPresent * 0.3) {
      insights.push("Un tiers des participants arrivent en retard. Vérifiez les horaires et communications.");
    }

    return insights;
  }

  private generateEventInsights(eventData: any, attendances: any[], statusCounts: Record<string, number>): string[] {
    const insights = [];
    const totalParticipants = eventData.participants.length;
    const totalAttended = attendances.length;

    if (totalAttended < totalParticipants * 0.7) {
      insights.push("Faible taux de participation. Considérez améliorer la communication ou l'engagement.");
    }

    const lateCount = statusCounts[AttendanceStatus.LATE] || 0;
    if (lateCount > totalAttended * 0.2) {
      insights.push("Beaucoup de retards. Vérifiez l'heure de début et les notifications.");
    }

    return insights;
  }

  private generateUserInsights(userData: any, attendances: any[], statusCounts: Record<string, number>): string[] {
    const insights = [];
    const totalEvents = attendances.length;
    const attendanceRate = totalEvents > 0 ?
      ((statusCounts[AttendanceStatus.PRESENT] || 0) + (statusCounts[AttendanceStatus.LATE] || 0)) / totalEvents * 100 :
      0;

    if (attendanceRate < 70) {
      insights.push("Taux de présence en dessous de la moyenne. Un suivi personnalisé pourrait être bénéfique.");
    } else if (attendanceRate > 95) {
      insights.push("Excellente assiduité ! Utilisateur exemplaire.");
    }

    const lateRate = totalEvents > 0 ? ((statusCounts[AttendanceStatus.LATE] || 0) / totalEvents * 100) : 0;
    if (lateRate > 20) {
      insights.push("Tendance aux retards fréquents. Considérez des rappels personnalisés.");
    }

    return insights;
  }

  // backend/functions/src/services/report.service.ts - PARTIE 3/3

  // 📋 GESTION DES RAPPORTS
  async getReports(options: ReportListOptions = {}): Promise<{
    reports: Report[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      type,
      status,
      generatedBy,
      dateRange,
      format,
    } = options;

    // Validation de la pagination
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = this.db.collection("reports");

    // Filtres
    if (type) {
      query = query.where("type", "==", type);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    if (generatedBy) {
      query = query.where("generatedBy", "==", generatedBy);
    }

    if (format) {
      query = query.where("format", "==", format);
    }

    if (dateRange) {
      query = query.where("createdAt", ">=", dateRange.start)
        .where("createdAt", "<=", dateRange.end);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Report[];

    // Compter le total
    const total = await this.countReports(options);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getReportById(reportId: string, userId?: string): Promise<Report> {
    const reportDoc = await this.db.collection("reports").doc(reportId).get();

    if (!reportDoc.exists) {
      throw new Error(ERROR_CODES.NOT_FOUND);
    }

    const report = {id: reportDoc.id, ...reportDoc.data()} as Report;

    // Vérifier les permissions de lecture
    if (userId && !await this.canAccessReport(userId, report)) {
      throw new Error(ERROR_CODES.FORBIDDEN);
    }

    return report;
  }

  async downloadReport(reportId: string, userId: string): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    const report = await this.getReportById(reportId, userId);

    if (report.status !== "completed" || !report.filePath) {
      throw new Error("Report not ready for download");
    }

    // Incrémenter le compteur de téléchargements
    await this.incrementDownloadCount(reportId);

    // Log de l'audit
    await this.logReportAction("report_downloaded", reportId, userId, {
      format: report.format,
      downloadCount: report.downloadCount??0 + 1,
    });

    return {
      filePath: report.filePath,
      fileName: `${report.name}.${report.format}`,
      mimeType: this.getMimeType(report.format),
    };
  }

  async deleteReport(reportId: string, userId: string): Promise<boolean> {
    try {
      const report = await this.getReportById(reportId);

      // Vérifier les permissions
      if (!await this.canDeleteReport(userId, report)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Supprimer le fichier physique si il existe
      if (report.filePath) {
        try {
          await fs.unlink(report.filePath);
        } catch (error) {
          console.warn("Could not delete file:", report.filePath);
        }
      }

      // Supprimer de Firestore
      await this.db.collection("reports").doc(reportId).delete();

      // Log de l'audit
      await this.logReportAction("report_deleted", reportId, userId, {
        type: report.type,
        format: report.format,
      });

      return true;
    } catch (error) {
      console.error("Error deleting report:", error);
      return false;
    }
  }

  // 📊 STATISTIQUES DES RAPPORTS
  async getReportStats(
    filters: {
      generatedBy?: string;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<ReportStats> {
    let query: Query = this.db.collection("reports");

    if (filters.generatedBy) {
      query = query.where("generatedBy", "==", filters.generatedBy);
    }

    if (filters.dateRange) {
      query = query.where("createdAt", ">=", filters.dateRange.start)
        .where("createdAt", "<=", filters.dateRange.end);
    }

    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => doc.data() as Report);

    // Calculer les statistiques
    const stats = {
      total: reports.length,
      byType: {} as Record<ReportType, number>,
      byStatus: {} as Record<ReportStatus, number>,
      byFormat: {} as Record<ReportFormat, number>,
      averageGenerationTime: 0,
      totalDownloads: 0,
    };

    let totalGenerationTime = 0;
    let completedReports = 0;

    reports.forEach((report) => {
      // Par type
      stats.byType[report.type] = (stats.byType[report.type] || 0) + 1;

      // Par statut
      stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

      // Par format
      stats.byFormat[report.format] = (stats.byFormat[report.format] || 0) + 1;

      // Temps de génération
      if (report.status === "completed" && report.startedAt && report.completedAt) {
        totalGenerationTime += report.completedAt.getTime() - report.startedAt.getTime();
        completedReports++;
      }

      // Téléchargements
      stats.totalDownloads += report.downloadCount || 0;
    });

    stats.averageGenerationTime = completedReports > 0 ? totalGenerationTime / completedReports / 1000 : 0; // en secondes

    return stats;
  }

  // 📅 RAPPORTS PROGRAMMÉS
  async scheduleReport(request: GenerateReportRequest & {
    schedule: {
      frequency: "daily" | "weekly" | "monthly";
      dayOfWeek?: number; // 0-6 pour weekly
      dayOfMonth?: number; // 1-31 pour monthly
      time: string; // HH:mm
    };
    recipients: string[];
  }): Promise<string> {
    const scheduleId = crypto.randomUUID();

    const scheduledReport = {
      id: scheduleId,
      ...request,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      lastGenerated: null,
      nextGeneration: this.calculateNextGeneration(request.schedule),
    };

    await this.db
      .collection("scheduled_reports")
      .doc(scheduleId)
      .set(scheduledReport);

    // Log de l'audit
    await this.logReportAction("report_scheduled", scheduleId, request.generatedBy, {
      type: request.type,
      frequency: request.schedule.frequency,
    });

    return scheduleId;
  }

  async processScheduledReports(): Promise<void> {
    const now = new Date();

    const scheduledQuery = await this.db
      .collection("scheduled_reports")
      .where("isActive", "==", true)
      .where("nextGeneration", "<=", now)
      .get();

    for (const doc of scheduledQuery.docs) {
      try {
        const scheduledReport = doc.data();

        // Générer le rapport
        // @ts-ignore
        const report = await this.generateReport(scheduledReport);

        // Envoyer aux destinataires si le rapport est complété
        if (report.status === "completed") {
          await this.sendReportToRecipients(report, scheduledReport.recipients);
        }

        // Mettre à jour la prochaine génération
        await this.db
          .collection("scheduled_reports")
          .doc(doc.id)
          .update({
            lastGenerated: now,
            nextGeneration: this.calculateNextGeneration(scheduledReport.schedule),
            updatedAt: new Date(),
          });
      } catch (error) {
        console.error(`Error processing scheduled report ${doc.id}:`, error);

        // Marquer comme en erreur après plusieurs échecs
        await this.handleScheduledReportError(doc.id);
      }
    }
  }

  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  private async getAttendanceData(filters: {
    dateRange?: { start: Date; end: Date };
    eventIds?: string[];
    userIds?: string[];
    departments?: string[];
  }): Promise<any[]> {
    // Simuler la récupération des données de présence
    // En production, cette méthode ferait des requêtes à la base de données
    const attendanceOptions = {
      dateRange: filters.dateRange,
      eventId: undefined,
      userId: undefined,
    };

    const attendances = await attendanceService.getAttendances(attendanceOptions);
    return attendances.attendances.filter((attendance) => {
      if (filters.eventIds && !filters.eventIds.includes(attendance.eventId)) return false;
      if (filters.userIds && !filters.userIds.includes(attendance.userId)) return false;
      return true;
    });
  }

  private async getEventData(eventIds?: string[], dateRange?: { start: Date; end: Date }): Promise<any[]> {
    const eventOptions = {
      dateRange,
      status: undefined,
    };

    const events = await eventService.getEvents(eventOptions);
    return eventIds ? events.events.filter((e) => eventIds.includes(e.id!)) : events.events;
  }

  private async getUserData(userIds: string[]): Promise<any[]> {
    const users = [];
    for (const userId of userIds) {
      try {
        const user = await userService.getUserById(userId);
        users.push(user.getData());
      } catch (error) {
        console.warn(`Could not fetch user ${userId}:`, error);
      }
    }
    return users;
  }

  private async getUsersByDepartment(department: string): Promise<any[]> {
    // Simuler la récupération des utilisateurs par département
    const usersOptions = {department};
    const users = await userService.getUsers(usersOptions);
    return users.users.filter((u) => u.profile?.department === department);
  }

  private async getAllActiveUsers(): Promise<any[]> {
    const usersOptions = {includeInactive: false};
    const users = await userService.getUsers(usersOptions);
    return users.users;
  }

  private generateCacheKey(request: GenerateReportRequest): string {
    return crypto
      .createHash("md5")
      .update(JSON.stringify({
        type: request.type,
        format: request.format,
        filters: request.filters,
      }))
      .digest("hex");
  }

  private async canAccessReport(userId: string, report: Report): Promise<boolean> {
    // Le créateur peut toujours accéder
    if (report.generatedBy === userId) {
      return true;
    }

    // Rapports publics accessibles à tous
    if (report.isPublic) {
      return true;
    }

    // Vérifier les permissions selon le type de rapport
    return await this.canGenerateReport(userId, report.type);
  }

  private async canDeleteReport(userId: string, report: Report): Promise<boolean> {
    // Le créateur peut supprimer
    if (report.generatedBy === userId) {
      return true;
    }

    // Les admins peuvent supprimer tous les rapports
    return await authService.hasPermission(userId, "manage_all_reports");
  }

  private getMimeType(format: ReportFormat): string {
    ReportFormat.PDF;
    const mimeTypes = {
      "pdf": "application/pdf",
      "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "csv": "text/csv",
      "json": "application/json",
    };
    if (!format || !Object.keys(mimeTypes).includes(format)) {
      throw new Error(`Unsupported report format: ${format}`);
    }
    // @ts-ignore
    return mimeTypes[format] || "application/octet-stream";
  }

  private calculateNextGeneration(schedule: {
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  }): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(":").map(Number);

    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
    case "daily":
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case "weekly":
      if (schedule.dayOfWeek !== undefined) {
        const currentDay = now.getDay();
        const targetDay = schedule.dayOfWeek;
        let daysToAdd = targetDay - currentDay;

        if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
          daysToAdd += 7;
        }

        next.setDate(next.getDate() + daysToAdd);
      }
      break;

    case "monthly":
      if (schedule.dayOfMonth !== undefined) {
        next.setDate(schedule.dayOfMonth);

        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(schedule.dayOfMonth);
        }
      }
      break;
    }

    return next;
  }

  private async sendReportToRecipients(report: Report, recipients: string[]): Promise<void> {
    // TODO: Implémenter l'envoi de rapport par email avec NotificationService
    console.log(`Sending report ${report.id} to ${recipients.length} recipients`);

    for (const recipientId of recipients) {
      try {
        // Envoyer notification avec lien de téléchargement
        // await notificationService.sendNotification({
        //   userId: recipientId,
        //   type: 'report_ready',
        //   title: `Rapport "${report.name}" disponible`,
        //   message: `Votre rapport programmé est prêt à être téléchargé.`,
        //   link: `/reports/${report.id}/download`
        // });
      } catch (error) {
        console.error(`Failed to send report notification to ${recipientId}:`, error);
      }
    }
  }

  private async handleScheduledReportError(scheduleId: string): Promise<void> {
    // Implémenter la gestion des erreurs pour les rapports programmés
    // Par exemple, désactiver après 3 échecs consécutifs
    console.log(`Handling error for scheduled report ${scheduleId}`);
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private async incrementDownloadCount(reportId: string): Promise<void> {
    await this.db
      .collection("reports")
      .doc(reportId)
      .update({
        downloadCount: FieldValue.increment(1),
        lastDownloadedAt: FieldValue.serverTimestamp(),
      });
  }

  private async countReports(options: ReportListOptions): Promise<number> {
    let query: Query = this.db.collection("reports");

    // Appliquer les mêmes filtres que dans getReports
    if (options.type) query = query.where("type", "==", options.type);
    if (options.status) query = query.where("status", "==", options.status);
    if (options.generatedBy) query = query.where("generatedBy", "==", options.generatedBy);
    if (options.format) query = query.where("format", "==", options.format);
    if (options.dateRange) {
      query = query.where("createdAt", ">=", options.dateRange.start)
        .where("createdAt", "<=", options.dateRange.end);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async saveReport(report: Report): Promise<void> {
    await this.db
      .collection("reports")
      .doc(report.id!)
      .set(report);
  }

  private async updateReport(report: Report): Promise<void> {
    report.updatedAt = new Date();
    await this.db
      .collection("reports")
      .doc(report.id!)
      .update({
        ...report,
        updatedAt: FieldValue.serverTimestamp(),
      });
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

  // 🧹 NETTOYAGE ET MAINTENANCE
  async cleanupExpiredReports(): Promise<number> {
    const now = new Date();

    const expiredQuery = await this.db
      .collection("reports")
      .where("expiresAt", "<", now)
      .get();

    let deletedCount = 0;

    for (const doc of expiredQuery.docs) {
      try {
        const report = doc.data() as Report;

        // Supprimer le fichier physique
        if (report.filePath) {
          try {
            await fs.unlink(report.filePath);
          } catch (error) {
            console.warn("Could not delete file:", report.filePath);
          }
        }

        // Supprimer de Firestore
        await doc.ref.delete();
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting expired report ${doc.id}:`, error);
      }
    }

    console.log(`Cleaned up ${deletedCount} expired reports`);
    return deletedCount;
  }

  // 📊 TEMPLATES ET CONFIGURATION
  private initializeTemplates(): void {
    // Charger les templates de rapports prédéfinis
    const templates: ReportTemplate[] = [
      {
        id: "attendance_summary_weekly",
        name: "Résumé de présence hebdomadaire",
        type: ReportType.ATTENDANCE_SUMMARY,
        description: "Rapport hebdomadaire des présences avec tendances et statistiques",
        defaultFilters: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        requiredPermissions: ["generate_all_reports"],
        isCustomizable: true,
        estimatedDuration: 30,
        defaultConfiguration: {
          includeCharts: false,
          includeDetails: false,
          includeSummary: false,
          includeMetrics: false,
        },
        category: "attendance",
        popularity: 0,
        createdBy: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "department_monthly",
        name: "Analyse départementale mensuelle",
        type: ReportType.DEPARTMENT_ANALYTICS,
        description: "Analyse complète des performances par département sur un mois",
        defaultFilters: {
          startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
        },
        requiredPermissions: ["generate_all_reports"],
        isCustomizable: true,
        estimatedDuration: 60,
        defaultConfiguration: {
          includeCharts: false,
          includeDetails: false,
          includeSummary: false,
          includeMetrics: false,
        },
        category: "attendance",
        popularity: 0,
        createdBy: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "user_performance",
        name: "Performance utilisateur",
        type: ReportType.USER_PERFORMANCE,
        description: "Rapport détaillé de la performance d'un utilisateur",
        defaultFilters: {},
        requiredPermissions: ["generate_team_reports"],
        isCustomizable: false,
        estimatedDuration: 15,
        defaultConfiguration: {
          includeCharts: false,
          includeDetails: false,
          includeSummary: false,
          includeMetrics: false,
        },
        category: "attendance",
        popularity: 0,
        createdBy: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    templates.forEach((template) => {
      this.reportTemplates.set(template.id, template);
    });
  }

  async getReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.reportTemplates.values());
  }

  async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.reportTemplates.get(templateId) || null;
  }


  // 📈 MÉTHODES D'ANALYSE AVANCÉES
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

  // 💡 INSIGHTS AVANCÉS
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

  private generateCustomInsights(data: any[], aggregations: any[]): string[] {
    const insights:string[] = [];

    if (data.length === 0) {
      insights.push("Aucune donnée trouvée pour les critères spécifiés.");
      return insights;
    }

    // Analyser les agrégations numériques
    aggregations.forEach((agg) => {
      if (["sum", "avg", "count"].includes(agg.operation)) {
        const alias = agg.alias || `${agg.operation}_${agg.field}`;
        const values = data.map((item) => item[alias]).filter((v) => v != null);

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

  // ✅ IMPLÉMENTATION: calculateUserMonthlyTrends
  private calculateUserMonthlyTrends(attendanceData: any[], dateRange: { start: Date; end: Date }): {
  month: string;
  attendanceRate: number;
  punctualityRate: number;
}[] {
    const monthlyData = new Map<string, {
    total: number;
    attended: number;
    punctual: number;
  }>();

    // Grouper les présences par mois
    attendanceData.forEach((attendance) => {
      if (!attendance.createdAt) return;

      const monthKey = `${attendance.createdAt.getFullYear()}-${String(attendance.createdAt.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {total: 0, attended: 0, punctual: 0});
      }

      const monthStats = monthlyData.get(monthKey)!;
      monthStats.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        monthStats.attended++;
      }

      if (attendance.status === AttendanceStatus.PRESENT) {
        monthStats.punctual++;
      }
    });

    // Convertir en tableau et calculer les taux
    return Array.from(monthlyData.entries())
      .map(([month, stats]) => ({
        month,
        attendanceRate: stats.total > 0 ? (stats.attended / stats.total) * 100 : 0,
        punctualityRate: stats.attended > 0 ? (stats.punctual / stats.attended) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // ✅ IMPLÉMENTATION: analyzeUserPunctualityPattern
  private analyzeUserPunctualityPattern(attendanceData: any[], eventMap: Map<any, any>): {
  averageArrivalTime: number;
  mostCommonTimeSlot: string;
  tendencyToLate: number;
} {
    const arrivalTimes: number[] = [];
    const timeSlots = new Map<string, number>();
    let lateCount = 0;
    let totalWithCheckIn = 0;

    attendanceData.forEach((attendance) => {
      if (!attendance.checkInTime) return;

      const event = eventMap.get(attendance.eventId);
      if (!event || !event.startDateTime) return;

      // Calculer le délai d'arrivée en minutes
      const arrivalDelay = (attendance.checkInTime.getTime() - event.startDateTime.getTime()) / (1000 * 60);
      arrivalTimes.push(arrivalDelay);

      // Grouper par créneaux horaires de 15 minutes
      const timeSlot = this.getTimeSlot(attendance.checkInTime);
      timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);

      // Compter les retards
      if (attendance.status === AttendanceStatus.LATE) {
        lateCount++;
      }
      totalWithCheckIn++;
    });

    // Calculer la moyenne des temps d'arrivée
    const averageArrivalTime = arrivalTimes.length > 0 ?
      arrivalTimes.reduce((sum, time) => sum + time, 0) / arrivalTimes.length :
      0;

    // Trouver le créneau le plus fréquent
    let mostCommonTimeSlot = "Non défini";
    let maxCount = 0;
    timeSlots.forEach((count, slot) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonTimeSlot = slot;
      }
    });

    // Calculer la tendance aux retards
    const tendencyToLate = totalWithCheckIn > 0 ? (lateCount / totalWithCheckIn) * 100 : 0;

    return {
      averageArrivalTime: Math.round(averageArrivalTime * 10) / 10,
      mostCommonTimeSlot,
      tendencyToLate: Math.round(tendencyToLate * 10) / 10,
    };
  }

  // ✅ HELPER: getTimeSlot
  private getTimeSlot(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 15) * 15;

    return `${String(hours).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;
  }

  // ✅ IMPLÉMENTATION: analyzeDepartmentEventTypes
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
      if (!event) return;

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

  // ✅ IMPLÉMENTATION: calculateDepartmentTrends
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

  // 📊 MÉTHODES DE PRÉPARATION DES DONNÉES

  private prepareLineChartData(data: any[], config: ChartConfig): any[] {
    return data
      .filter((item) =>
        item[config.xAxis.field] != null &&
      item[config.yAxis.field] != null
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
        item[config.xAxis.field] != null &&
      item[config.yAxis.field] != null
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
        item[config.xAxis.field] != null &&
      item[config.yAxis.field] != null
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
        item[config.xAxis.field] != null &&
      item[config.yAxis.field] != null
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
    if (value == null) return "";

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
    const result = {...target};

    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // 📊 MÉTHODES DE GÉNÉRATION RAPIDE POUR LES RAPPORTS

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

    return charts.filter((chart) => chart != null);
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
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const reportService = new ReportService();
