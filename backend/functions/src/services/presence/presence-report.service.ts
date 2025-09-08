/**
 * Service de génération de rapports de présence
 */

import { logger } from 'firebase-functions';
import { collections, db } from '../../config/database';
import {
  Employee,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  PaginatedResponse,
  PresenceEntry,
  PresenceReport,
  PresenceReportEntry,
  PresenceStatus,
  PresenceSummary
} from '../../shared';
import { PresenceEntryModel } from '../../models/presence-entry.model';
import { EmployeeModel } from '../../models/employee.model';
import * as ExcelJS from 'exceljs';
import { notificationService } from '../notification/notification.service';

export interface ReportFilters {
  organizationId: string;
  employeeIds?: string[];
  departmentIds?: string[];
  startDate: string;
  endDate: string;
  statuses?: PresenceStatus[];
  includeBreakdown?: boolean;
  includeAnomalies?: boolean;
}

export interface ReportOptions {
  format: 'json' | 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeDetails?: boolean;
  groupBy?: 'employee' | 'department' | 'date' | 'week' | 'month';
  sortBy?: 'date' | 'employee' | 'hours' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ScheduledReport {
  id: string;
  name: string;
  organizationId: string;
  filters: ReportFilters;
  options: ReportOptions;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // Pour weekly
    dayOfMonth?: number; // Pour monthly
    time: string; // Format HH:MM
  };
  recipients: string[]; // User IDs
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdBy: string;
  createdAt: Date;
}

class PresenceReportService {
  private readonly reportsCollection = 'presence_reports';
  private readonly scheduledReportsCollection = 'scheduled_reports';

  /**
   * Générer un rapport de présence
   */
  async generateReport(
    filters: ReportFilters,
    options: ReportOptions,
    generatedBy: string
  ): Promise<PresenceReport> {
    try {
      logger.info('Generating presence report', { filters, options, generatedBy });

      // Récupérer les données de présence
      const presenceData = await this.getPresenceData(filters);

      // Récupérer les informations des employés
      const employees = await this.getEmployeesInfo(filters.organizationId, filters.employeeIds);

      // Calculer le résumé
      const summary = this.calculateSummary(presenceData);

      // Créer les entrées détaillées du rapport
      const details = await this.createReportEntries(presenceData, employees, options);

      // Créer le rapport
      const report: PresenceReport = {
        id: `report_${Date.now()}`,
        organizationId: filters.organizationId,
        title: this.generateReportTitle(filters, options),
        type: this.determineReportType(filters),
        startDate: filters.startDate,
        endDate: filters.endDate,
        filters,
        summary,
        details,
        generatedBy,
        generatedAt: new Date(),
        format: options.format,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Sauvegarder le rapport
      await this.saveReport(report);

      // Générer le fichier si nécessaire
      if (options.format !== 'json') {
        const fileUrl = await this.generateReportFile(report, options);
        report.fileUrl = fileUrl;
        await this.updateReport(report.id, { fileUrl });
      }

      logger.info('Presence report generated successfully', {
        reportId: report.id,
        entriesCount: details.length
      });

      return report;

    } catch (error) {
      logger.error('Failed to generate presence report', { error, filters, options });
      throw error;
    }
  }

  /**
   * Obtenir un rapport existant
   */
  async getReport(reportId: string): Promise<PresenceReport | null> {
    try {
      const doc = await db.collection(this.reportsCollection).doc(reportId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as PresenceReport;

    } catch (error) {
      logger.error('Failed to get report', { error, reportId });
      throw error;
    }
  }

  /**
   * Lister les rapports avec pagination
   */
  async listReports(
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<PresenceReport>> {
    try {
      const query = db.collection(this.reportsCollection)
        .where('organizationId', '==', organizationId)
        .orderBy('generatedAt', 'desc')
        .offset((page - 1) * limit)
        .limit(limit);

      const snapshot = await query.get();
      const reports: PresenceReport[] = [];

      snapshot.forEach(doc => {
        reports.push({ id: doc.id, ...doc.data() } as PresenceReport);
      });

      // Compter le total
      const countQuery = db.collection(this.reportsCollection)
        .where('organizationId', '==', organizationId);
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return {
        data: reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Failed to list reports', { error, organizationId });
      throw error;
    }
  }

  /**
   * Créer un rapport programmé
   */
  async createScheduledReport(
    scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt' | 'lastRun' | 'nextRun'> & {
      nextRun: Date;
    }
  ): Promise<ScheduledReport> {
    try {
      const docRef = db.collection(this.scheduledReportsCollection).doc();

      const report: ScheduledReport = {
        ...scheduledReport,
        id: docRef.id,
        createdAt: new Date()
      };

      await docRef.set(report);

      logger.info('Scheduled report created', { reportId: report.id });
      return report;

    } catch (error) {
      logger.error('Failed to create scheduled report', { error, scheduledReport });
      throw error;
    }
  }

  /**
   * Exécuter les rapports programmés
   */
  async runScheduledReports(): Promise<{
    executed: number;
    failed: number;
    reports: { id: string; status: 'success' | 'failed'; error?: string }[];
  }> {
    try {
      logger.info('Running scheduled reports');

      const now = new Date();
      const query = db.collection(this.scheduledReportsCollection)
        .where('isActive', '==', true)
        .where('nextRun', '<=', now);

      const snapshot = await query.get();
      const results: { id: string; status: 'success' | 'failed'; error?: string }[] = [];
      let executed = 0;
      let failed = 0;

      for (const doc of snapshot.docs) {
        const scheduledReport = { id: doc.id, ...doc.data() } as ScheduledReport;

        try {
          // Générer le rapport
          const report = await this.generateReport(
            scheduledReport.filters,
            scheduledReport.options,
            'system'
          );

          // Envoyer aux destinataires
          await this.sendReportToRecipients(report, scheduledReport.recipients);

          // Calculer la prochaine exécution
          const nextRun = this.calculateNextRun(scheduledReport.schedule, now);

          // Mettre à jour le rapport programmé
          await db.collection(this.scheduledReportsCollection).doc(scheduledReport.id).update({
            lastRun: now,
            nextRun
          });

          results.push({ id: scheduledReport.id, status: 'success' });
          executed++;

        } catch (error) {
          logger.error('Failed to run scheduled report', { error, reportId: scheduledReport.id });
          results.push({
            id: scheduledReport.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      logger.info('Scheduled reports execution completed', { executed, failed });
      return { executed, failed, reports: results };

    } catch (error) {
      logger.error('Failed to run scheduled reports', { error });
      throw error;
    }
  }

  /**
   * Exporter un rapport vers un fichier
   */
  async exportReport(
    reportId: string,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<string> {
    try {
      const report = await this.getReport(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const fileUrl = await this.generateReportFile(report, { format });

      // Mettre à jour le rapport avec l'URL du fichier
      await this.updateReport(reportId, { fileUrl });

      return fileUrl;

    } catch (error) {
      logger.error('Failed to export report', { error, reportId, format });
      throw error;
    }
  }

  // Méthodes privées
  private async getPresenceData(filters: ReportFilters): Promise<PresenceEntry[]> {
    let query = collections.presence_entries
      .where('organizationId', '==', filters.organizationId)
      .where('date', '>=', filters.startDate)
      .where('date', '<=', filters.endDate);

    if (filters.employeeIds && filters.employeeIds.length > 0) {
      query = query.where('employeeId', 'in', filters.employeeIds);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.where('status', 'in', filters.statuses);
    }

    const snapshot = await query.get();
    const entries: PresenceEntry[] = [];

    snapshot.forEach(doc => {
      const entry = PresenceEntryModel.fromFirestore(doc);
      if (entry) {
        entries.push(entry.getData());
      }
    });

    return entries;
  }

  private async getEmployeesInfo(
    organizationId: string,
    employeeIds?: string[]
  ): Promise<Map<string, Employee>> {
    let query = collections.employees
      .where('organizationId', '==', organizationId);

    if (employeeIds && employeeIds.length > 0) {
      query = query.where('id', 'in', employeeIds);
    }

    const snapshot = await query.get();
    const employees = new Map<string, Employee>();

    snapshot.forEach(doc => {
      const employee = EmployeeModel.fromFirestore(doc);
      if (employee) {
        const data = employee.getData();
        employees.set(data.id!, data);
      }
    });

    return employees;
  }

  private calculateSummary(entries: PresenceEntry[]): PresenceSummary {
    const summary: PresenceSummary = {
      totalEmployees: new Set(entries.map(e => e.employeeId)).size,
      totalWorkDays: entries.length,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalEarlyLeave: 0,
      totalOvertimeHours: 0,
      averageWorkHours: 0,
      attendanceRate: 0
    };

    let totalWorkHours = 0;

    entries.forEach(entry => {
      switch (entry.status) {
        case PresenceStatus.PRESENT:
          summary.totalPresent++;
          break;
        case PresenceStatus.ABSENT:
          summary.totalAbsent++;
          break;
        case PresenceStatus.LATE:
          summary.totalLate++;
          summary.totalPresent++; // Aussi compté comme présent
          break;
        case PresenceStatus.EARLY_LEAVE:
          summary.totalEarlyLeave++;
          summary.totalPresent++; // Aussi compté comme présent
          break;
        case PresenceStatus.OVERTIME:
          summary.totalPresent++;
          break;
      }

      if (entry.actualWorkHours) {
        totalWorkHours += entry.actualWorkHours;
      }

      if (entry.overtimeHours) {
        summary.totalOvertimeHours += entry.overtimeHours;
      }
    });

    summary.averageWorkHours = entries.length > 0 ? totalWorkHours / entries.length : 0;
    summary.attendanceRate = summary.totalWorkDays > 0 ?
      (summary.totalPresent / summary.totalWorkDays) * 100 : 0;

    return summary;
  }

  private async createReportEntries(
    presenceData: PresenceEntry[],
    employees: Map<string, Employee>,
    options: ReportOptions
  ): Promise<PresenceReportEntry[]> {
    const entries: PresenceReportEntry[] = [];

    for (const entry of presenceData) {
      const employee = employees.get(entry.employeeId);
      const employeeName = employee ? await this.getEmployeeFullName(employee) : 'Unknown';

      entries.push({
        employeeId: entry.employeeId,
        employeeName,
        date: entry.date,
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime,
        status: entry.status,
        actualWorkHours: entry.actualWorkHours || 0,
        scheduledWorkHours: entry.scheduledWorkHours,
        overtimeHours: entry.overtimeHours || 0,
        totalBreakTime: entry.totalBreakTime || 0,
        isLate: entry.status === PresenceStatus.LATE,
        isEarlyLeave: entry.status === PresenceStatus.EARLY_LEAVE
      });
    }

    return entries;
  }

  private generateReportTitle(filters: ReportFilters, options: ReportOptions): string {
    const startDate = new Date(filters.startDate).toLocaleDateString();
    const endDate = new Date(filters.endDate).toLocaleDateString();

    return `Rapport de présence du ${startDate} au ${endDate}`;
  }

  private determineReportType(filters: ReportFilters): 'daily' | 'weekly' | 'monthly' | 'custom' {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {return 'daily';}
    if (diffDays <= 7) {return 'weekly';}
    if (diffDays <= 31) {return 'monthly';}
    return 'custom';
  }

  private async saveReport(report: PresenceReport): Promise<void> {
    await db.collection(this.reportsCollection).doc(report.id).set(report);
  }

  private async updateReport(reportId: string, updates: Partial<PresenceReport>): Promise<void> {
    await db.collection(this.reportsCollection).doc(reportId).update({
      ...updates,
      updatedAt: new Date()
    });
  }

  private async generateReportFile(
    report: PresenceReport,
    options: ReportOptions
  ): Promise<string> {
    switch (options.format) {
      case 'excel':
        return this.generateExcelFile(report);
      case 'pdf':
        return this.generatePDFFile(report);
      case 'csv':
        return this.generateCSVFile(report);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private async generateExcelFile(report: PresenceReport): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rapport de Présence');

    // En-têtes
    worksheet.columns = [
      { header: 'Employé', key: 'employeeName', width: 20 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Arrivée', key: 'clockInTime', width: 10 },
      { header: 'Départ', key: 'clockOutTime', width: 10 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Heures travaillées', key: 'actualWorkHours', width: 15 },
      { header: 'Heures supplémentaires', key: 'overtimeHours', width: 18 },
      { header: 'Temps de pause', key: 'totalBreakTime', width: 15 }
    ];

    // Données
    report.details.forEach(entry => {
      worksheet.addRow({
        employeeName: entry.employeeName,
        date: entry.date,
        clockInTime: entry.clockInTime ? entry.clockInTime.toLocaleTimeString() : '',
        clockOutTime: entry.clockOutTime ? entry.clockOutTime.toLocaleTimeString() : '',
        status: entry.status,
        actualWorkHours: entry.actualWorkHours,
        overtimeHours: entry.overtimeHours,
        totalBreakTime: entry.totalBreakTime
      });
    });

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Générer le fichier
    const fileName = `rapport_presence_${report.id}.xlsx`;
    const filePath = `/tmp/${fileName}`;

    await workbook.xlsx.writeFile(filePath);

    // Upload vers le stockage cloud
    const fileUrl = await this.uploadFileToStorage(filePath, fileName);
    return fileUrl;
  }

  private async generatePDFFile(report: PresenceReport): Promise<string> {
    const PDFDocument = await import('pdfkit');
    const doc = new PDFDocument.default();
    const fileName = `rapport_presence_${report.id}.pdf`;
    const filePath = `/tmp/${fileName}`;

    // En-tête
    doc.fontSize(20).text(report.title, 50, 50);
    doc.fontSize(12).text(`Période: ${report.startDate} - ${report.endDate}`, 50, 80);
    doc.text(`Généré le: ${report.generatedAt.toLocaleDateString()}`, 50, 100);

    // Résumé
    let yPosition = 140;
    doc.fontSize(16).text('Résumé', 50, yPosition);
    yPosition += 30;

    doc.fontSize(12);
    doc.text(`Nombre d'employés: ${report.summary.totalEmployees}`, 50, yPosition);
    doc.text(`Jours de présence: ${report.summary.totalPresent}`, 250, yPosition);
    yPosition += 20;

    doc.text(`Jours d'absence: ${report.summary.totalAbsent}`, 50, yPosition);
    doc.text(`Retards: ${report.summary.totalLate}`, 250, yPosition);
    yPosition += 20;

    doc.text(`Taux de présence: ${report.summary.attendanceRate.toFixed(1)}%`, 50, yPosition);
    doc.text(`Heures supplémentaires: ${report.summary.totalOvertimeHours.toFixed(1)}h`, 250, yPosition);

    // Détails (première page seulement pour l'exemple)
    yPosition += 50;
    doc.fontSize(16).text('Détails', 50, yPosition);
    yPosition += 30;

    doc.fontSize(10);
    const maxEntries = Math.min(report.details.length, 20); // Limiter pour l'exemple

    for (let i = 0; i < maxEntries; i++) {
      const entry = report.details[i];
      doc.text(`${entry.employeeName} - ${entry.date} - ${entry.status}`, 50, yPosition);
      yPosition += 15;

      if (yPosition > 700) {break;} // Éviter le débordement de page
    }

    // Sauvegarder le PDF
    await this.savePDFToFile(doc, filePath);

    // Upload vers le stockage cloud
    const fileUrl = await this.uploadFileToStorage(filePath, fileName);
    return fileUrl;
  }

  private async generateCSVFile(report: PresenceReport): Promise<string> {
    const headers = [
      'Employé',
      'Date',
      'Arrivée',
      'Départ',
      'Statut',
      'Heures travaillées',
      'Heures supplémentaires',
      'Temps de pause'
    ];

    const rows = report.details.map(entry => [
      entry.employeeName,
      entry.date,
      entry.clockInTime ? entry.clockInTime.toLocaleTimeString() : '',
      entry.clockOutTime ? entry.clockOutTime.toLocaleTimeString() : '',
      entry.status,
      entry.actualWorkHours.toString(),
      entry.overtimeHours.toString(),
      entry.totalBreakTime.toString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const fileName = `rapport_presence_${report.id}.csv`;
    const filePath = `/tmp/${fileName}`;

    // Écrire le fichier CSV
    await this.writeCSVFile(filePath, csvContent);

    // Upload vers le stockage cloud
    const fileUrl = await this.uploadFileToStorage(filePath, fileName);
    return fileUrl;
  }

  private async sendReportToRecipients(
    report: PresenceReport,
    recipients: string[]
  ): Promise<void> {
    try {
      // Intégrer avec le service de notifications pour envoyer le rapport

      for (const recipientId of recipients) {
        await notificationService.sendNotification({
          userId: recipientId,
          type: NotificationType.REPORT_READY,
          title: 'Rapport de présence disponible',
          message: `Le rapport "${report.title}" est maintenant disponible.`,
          data: {
            reportId: report.id,
            reportTitle: report.title,
            fileUrl: report.fileUrl,
            format: report.format
          },
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH]
        });
      }

      logger.info('Report sent to recipients successfully', {
        reportId: report.id,
        recipientsCount: recipients.length
      });
    } catch (error) {
      logger.error('Failed to send report to recipients', {
        error,
        reportId: report.id,
        recipientsCount: recipients.length
      });
      // Ne pas faire échouer le processus si l'envoi de notification échoue
    }
  }

  private calculateNextRun(
    schedule: ScheduledReport['schedule'],
    currentDate: Date
  ): Date {
    const nextRun = new Date(currentDate);

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }

    // Définir l'heure
    const [hours, minutes] = schedule.time.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    return nextRun;
  }

  /**
   * Obtenir le nom complet d'un employé
   */
  private async getEmployeeFullName(employee: Employee): Promise<string> {
    try {
      // Essayer de récupérer les informations utilisateur depuis la collection users
      const userDoc = await collections.users.doc(employee.userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data();

        // Utiliser le nom complet si disponible
        if (userData?.firstName && userData?.lastName) {
          return `${userData.firstName} ${userData.lastName}`;
        }

        // Utiliser displayName si disponible
        if (userData?.displayName) {
          return userData.displayName;
        }

        // Utiliser l'email si disponible
        if (userData?.email) {
          const emailName = userData.email.split('@')[0];
          return emailName.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch user data for employee name', {
        employeeId: employee.employeeId,
        userId: employee.userId,
        error
      });
    }

    // Fallback vers les données de l'employé
    // Utiliser l'email de travail si disponible
    if (employee.workEmail) {
      const emailName = employee.workEmail.split('@')[0];
      return emailName.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Utiliser la position et l'ID employé
    if (employee.position) {
      return `${employee.position} (${employee.employeeId})`;
    }

    // Utiliser l'ID employé comme fallback
    if (employee.employeeId) {
      return `Employé ${employee.employeeId}`;
    }

    // Dernier recours : utiliser l'userId
    return employee.userId || 'Employé inconnu';
  }

  /**
   * Upload un fichier vers le stockage cloud
   */
  private async uploadFileToStorage(filePath: string, fileName: string): Promise<string> {
    try {
      // Import dynamique pour éviter les problèmes de dépendances
      const { Storage } = await import('@google-cloud/storage');
      const fs = await import('fs');

      const storage = new Storage();
      const bucketName = process.env.STORAGE_BUCKET || 'attendance-reports';
      const bucket = storage.bucket(bucketName);

      const destination = `reports/${fileName}`;
      const file = bucket.file(destination);

      // Upload le fichier
      await file.save(fs.readFileSync(filePath), {
        metadata: {
          contentType: this.getContentType(fileName),
          cacheControl: 'public, max-age=3600'
        }
      });

      // Générer une URL signée valide pour 7 jours
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
      });

      // Nettoyer le fichier temporaire
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file', { filePath, error: cleanupError });
      }

      logger.info('File uploaded to storage successfully', { fileName, destination });
      return signedUrl;

    } catch (error) {
      logger.error('Failed to upload file to storage', { error, fileName });

      // Fallback: retourner une URL locale pour le développement
      if (process.env.NODE_ENV === 'development') {
        return `http://localhost:3000/tmp/${fileName}`;
      }

      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sauvegarder un document PDF dans un fichier
   */
  private async savePDFToFile(doc: PDFKit.PDFDocument, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      stream.on('finish', () => {
        resolve();
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });

      doc.end();
    });
  }

  /**
   * Écrire un fichier CSV
   */
  private async writeCSVFile(filePath: string, content: string): Promise<void> {
    const fs = await import('fs');
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Obtenir le type de contenu selon l'extension du fichier
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }
}

export { PresenceReportService };
export const presenceReportService = new PresenceReportService();