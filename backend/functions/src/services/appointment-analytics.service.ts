import { 
  AppointmentStats,
  AppointmentStatus,
  APPOINTMENT_STATUSES
} from "@attendance-x/shared";
import { AppointmentModel } from "../models/appointment.model";
import { ServiceModel } from "../models/service.model";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { 
  CollectionReference, 
  Query
} from "firebase-admin/firestore";
// import * as ExcelJS from 'exceljs';
// import * as PDFDocument from 'pdfkit';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Interface pour les filtres d'analytics
 */
export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  practitionerId?: string;
  serviceId?: string;
  clientId?: string;
  status?: AppointmentStatus[];
}

/**
 * Interface pour les statistiques détaillées
 */
export interface DetailedAppointmentStats extends AppointmentStats {
  totalScheduled: number;
  totalConfirmed: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  punctualityRate: number;
  averageLeadTime: number; // Temps moyen entre création et RDV
  busyHours: { hour: number; count: number; percentage: number }[];
  dailyTrends: { date: string; count: number; attendanceRate: number }[];
  serviceBreakdown: { serviceId: string; serviceName: string; count: number; attendanceRate: number }[];
  practitionerStats: { practitionerId: string; practitionerName: string; count: number; attendanceRate: number }[];
}

/**
 * Interface pour les données de rapport
 */
export interface AppointmentReportData {
  summary: DetailedAppointmentStats;
  appointments: AppointmentModel[];
  period: { start: Date; end: Date };
  generatedAt: Date;
  organizationId: string;
}

/**
 * Service d'analytics pour les rendez-vous
 * 
 * Ce service gère le calcul des statistiques, l'analyse des tendances,
 * et la génération de rapports pour les rendez-vous.
 */
export class AppointmentAnalyticsService {
  private appointmentsCollection: CollectionReference;
  private servicesCollection: CollectionReference;
  private usersCollection: CollectionReference;

  constructor() {
    const db = getFirestore();
    this.appointmentsCollection = db.collection('appointments');
    this.servicesCollection = db.collection('services');
    this.usersCollection = db.collection('users');
  }

  /**
   * Calcule les statistiques de rendez-vous pour une organisation
   */
  async calculateAppointmentStats(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<DetailedAppointmentStats> {
    // Récupérer les rendez-vous selon les filtres
    const appointments = await this.getFilteredAppointments(organizationId, filters);
    
    if (appointments.length === 0) {
      return this.getEmptyStats();
    }

    // Calculer les statistiques de base
    const totalAppointments = appointments.length;
    const statusCounts = this.calculateStatusCounts(appointments);
    
    const totalCompleted = statusCounts[APPOINTMENT_STATUSES.COMPLETED] || 0;
    const totalCancelled = statusCounts[APPOINTMENT_STATUSES.CANCELLED] || 0;
    const totalNoShow = statusCounts[APPOINTMENT_STATUSES.NO_SHOW] || 0;
    const totalScheduled = statusCounts[APPOINTMENT_STATUSES.SCHEDULED] || 0;
    const totalConfirmed = statusCounts[APPOINTMENT_STATUSES.CONFIRMED] || 0;

    // Calculer les taux
    const attendanceRate = totalAppointments > 0 ? 
      (totalCompleted / totalAppointments) * 100 : 0;
    
    const cancellationRate = totalAppointments > 0 ? 
      (totalCancelled / totalAppointments) * 100 : 0;
    
    const noShowRate = totalAppointments > 0 ? 
      (totalNoShow / totalAppointments) * 100 : 0;

    const punctualityRate = (totalCompleted + totalConfirmed) > 0 ? 
      (totalCompleted / (totalCompleted + totalConfirmed)) * 100 : 0;

    // Calculer la durée moyenne
    const averageDuration = appointments.reduce((sum, apt) => 
      sum + apt.getData().duration, 0) / totalAppointments;

    // Calculer le temps moyen entre création et RDV
    const averageLeadTime = this.calculateAverageLeadTime(appointments);

    // Analyser les heures de pointe
    const peakHours = this.calculatePeakHoursSimple(appointments);
    const busyHours = this.calculateBusyHours(appointments);

    // Analyser les services populaires
    const popularServices = await this.calculatePopularServices(appointments);
    const serviceBreakdown = await this.calculateServiceBreakdown(appointments);

    // Analyser les tendances mensuelles et quotidiennes
    const monthlyTrends = this.calculateMonthlyTrends(appointments);
    const dailyTrends = this.calculateDailyTrends(appointments);

    // Statistiques par praticien
    const practitionerStats = await this.calculatePractitionerStats(appointments);

    return {
      totalAppointments,
      totalScheduled,
      totalConfirmed,
      totalCompleted,
      totalCancelled,
      totalNoShow,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      averageLeadTime: Math.round(averageLeadTime),
      peakHours,
      busyHours,
      popularServices,
      monthlyTrends,
      dailyTrends,
      serviceBreakdown,
      practitionerStats
    };
  }

  /**
   * Calcule le taux de présence pour une période donnée
   */
  async calculateAttendanceRate(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    practitionerId?: string
  ): Promise<number> {
    const filters: AnalyticsFilters = { startDate, endDate };
    if (practitionerId) {
      filters.practitionerId = practitionerId;
    }

    const appointments = await this.getFilteredAppointments(organizationId, filters);
    
    if (appointments.length === 0) {
      return 0;
    }

    const completedCount = appointments.filter(apt => 
      apt.getData().status === APPOINTMENT_STATUSES.COMPLETED
    ).length;

    return (completedCount / appointments.length) * 100;
  }

  /**
   * Calcule le taux d'annulation pour une période donnée
   */
  async calculateCancellationRate(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    practitionerId?: string
  ): Promise<number> {
    const filters: AnalyticsFilters = { startDate, endDate };
    if (practitionerId) {
      filters.practitionerId = practitionerId;
    }

    const appointments = await this.getFilteredAppointments(organizationId, filters);
    
    if (appointments.length === 0) {
      return 0;
    }

    const cancelledCount = appointments.filter(apt => 
      apt.getData().status === APPOINTMENT_STATUSES.CANCELLED
    ).length;

    return (cancelledCount / appointments.length) * 100;
  }

  /**
   * Identifie les heures de pointe
   */
  async calculatePeakHours(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<{ hour: number; count: number; percentage: number }[]> {
    const appointments = await this.getFilteredAppointments(organizationId, filters);
    return this.calculateBusyHours(appointments);
  }

  /**
   * Génère un rapport Excel des statistiques
   */
  async generateExcelReport(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<string> {
    const stats = await this.calculateAppointmentStats(organizationId, filters);
    const appointments = await this.getFilteredAppointments(organizationId, filters);
    
    // For now, we'll use dynamic import to avoid build issues
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // Feuille de résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    await this.createSummarySheet(summarySheet, stats);
    
    // Feuille des détails
    const detailsSheet = workbook.addWorksheet('Détails des RDV');
    await this.createDetailsSheet(detailsSheet, appointments);
    
    // Feuille des statistiques par service
    const servicesSheet = workbook.addWorksheet('Par Service');
    await this.createServicesSheet(servicesSheet, stats.serviceBreakdown);
    
    // Feuille des statistiques par praticien
    const practitionersSheet = workbook.addWorksheet('Par Praticien');
    await this.createPractitionersSheet(practitionersSheet, stats.practitionerStats);

    // Sauvegarder le fichier
    const fileName = `appointment_report_${Date.now()}.xlsx`;
    const filePath = path.join('/tmp/reports', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  }

  /**
   * Génère un rapport PDF des statistiques
   */
  async generatePDFReport(
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<string> {
    const stats = await this.calculateAppointmentStats(organizationId, filters);
    
    const fileName = `appointment_report_${Date.now()}.pdf`;
    const filePath = path.join('/tmp/reports', fileName);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // For now, we'll use dynamic import to avoid build issues
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const stream = require('fs').createWriteStream(filePath);
    doc.pipe(stream);
    
    // En-tête du rapport
    doc.fontSize(20).text('Rapport de Rendez-vous', { align: 'center' });
    doc.moveDown();
    
    // Période du rapport
    const period = this.getReportPeriod(filters);
    doc.fontSize(12).text(`Période: ${period}`, { align: 'center' });
    doc.moveDown(2);
    
    // Statistiques générales
    doc.fontSize(16).text('Statistiques Générales');
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total des rendez-vous: ${stats.totalAppointments}`);
    doc.text(`Taux de présence: ${stats.attendanceRate}%`);
    doc.text(`Taux d'annulation: ${stats.cancellationRate}%`);
    doc.text(`Taux d'absence: ${stats.noShowRate}%`);
    doc.text(`Durée moyenne: ${stats.averageDuration} minutes`);
    doc.moveDown(2);
    
    // Répartition par statut
    doc.fontSize(16).text('Répartition par Statut');
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Programmés: ${stats.totalScheduled}`);
    doc.text(`Confirmés: ${stats.totalConfirmed}`);
    doc.text(`Terminés: ${stats.totalCompleted}`);
    doc.text(`Annulés: ${stats.totalCancelled}`);
    doc.text(`Absences: ${stats.totalNoShow}`);
    doc.moveDown(2);
    
    // Heures de pointe
    if (stats.peakHours.length > 0) {
      doc.fontSize(16).text('Heures de Pointe');
      doc.moveDown();
      
      doc.fontSize(12);
      stats.peakHours.slice(0, 5).forEach(peak => {
        doc.text(`${peak.hour}h: ${peak.count} rendez-vous`);
      });
      doc.moveDown(2);
    }
    
    // Services populaires
    if (stats.popularServices.length > 0) {
      doc.fontSize(16).text('Services les Plus Demandés');
      doc.moveDown();
      
      doc.fontSize(12);
      stats.popularServices.slice(0, 5).forEach(service => {
        doc.text(`${service.serviceName}: ${service.count} rendez-vous`);
      });
    }
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  // Méthodes privées pour les calculs

  /**
   * Récupère les rendez-vous filtrés
   */
  private async getFilteredAppointments(
    organizationId: string,
    filters: AnalyticsFilters
  ): Promise<AppointmentModel[]> {
    let query: Query = this.appointmentsCollection
      .where('organizationId', '==', organizationId);

    // Application des filtres
    if (filters.startDate) {
      query = query.where('date', '>=', Timestamp.fromDate(filters.startDate));
    }

    if (filters.endDate) {
      query = query.where('date', '<=', Timestamp.fromDate(filters.endDate));
    }

    if (filters.practitionerId) {
      query = query.where('practitionerId', '==', filters.practitionerId);
    }

    if (filters.serviceId) {
      query = query.where('serviceId', '==', filters.serviceId);
    }

    if (filters.clientId) {
      query = query.where('clientId', '==', filters.clientId);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.where('status', 'in', filters.status);
    }

    const snapshot = await query.get();
    return snapshot.docs
      .map(doc => AppointmentModel.fromFirestore(doc))
      .filter(appointment => appointment !== null) as AppointmentModel[];
  }

  /**
   * Calcule le nombre d'occurrences par statut
   */
  private calculateStatusCounts(appointments: AppointmentModel[]): Record<string, number> {
    return appointments.reduce((counts, appointment) => {
      const status = appointment.getData().status;
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Calcule le temps moyen entre création et rendez-vous
   */
  private calculateAverageLeadTime(appointments: AppointmentModel[]): number {
    if (appointments.length === 0) return 0;

    const totalLeadTime = appointments.reduce((sum, appointment) => {
      const data = appointment.getData();
      const appointmentDateTime = appointment.getAppointmentDateTime();
      const createdAt = data.createdAt || new Date();
      
      const leadTimeHours = (appointmentDateTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return sum + leadTimeHours;
    }, 0);

    return totalLeadTime / appointments.length;
  }

  /**
   * Calcule les heures d'activité avec pourcentages
   */
  private calculateBusyHours(appointments: AppointmentModel[]): { hour: number; count: number; percentage: number }[] {
    const hourCounts: Record<number, number> = {};

    appointments.forEach(appointment => {
      const startTime = appointment.getData().startTime;
      const hour = parseInt(startTime.split(':')[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    const totalAppointments = appointments.length;

    return peakHours.map(peak => ({
      ...peak,
      percentage: totalAppointments > 0 ? (peak.count / totalAppointments) * 100 : 0
    }));
  }

  /**
   * Calcule les heures de pointe (version simple)
   */
  private calculatePeakHoursSimple(appointments: AppointmentModel[]): { hour: number; count: number }[] {
    const hourCounts: Record<number, number> = {};

    appointments.forEach(appointment => {
      const startTime = appointment.getData().startTime;
      const hour = parseInt(startTime.split(':')[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcule les services populaires
   */
  private async calculatePopularServices(appointments: AppointmentModel[]): Promise<{ serviceId: string; serviceName: string; count: number }[]> {
    const serviceCounts: Record<string, number> = {};

    appointments.forEach(appointment => {
      const serviceId = appointment.getData().serviceId;
      serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
    });

    // Récupérer les noms des services
    const serviceIds = Object.keys(serviceCounts);
    const services = await this.getServicesByIds(serviceIds);
    const serviceMap = new Map(services.filter(s => s && s.getData()).map(s => [s.getData().id!, s.getData().name]));

    return Object.entries(serviceCounts)
      .map(([serviceId, count]) => ({
        serviceId,
        serviceName: serviceMap.get(serviceId) || 'Service inconnu',
        count
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcule la répartition détaillée par service
   */
  private async calculateServiceBreakdown(appointments: AppointmentModel[]): Promise<{ serviceId: string; serviceName: string; count: number; attendanceRate: number }[]> {
    const serviceStats: Record<string, { count: number; completed: number }> = {};

    appointments.forEach(appointment => {
      const data = appointment.getData();
      const serviceId = data.serviceId;
      
      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = { count: 0, completed: 0 };
      }
      
      serviceStats[serviceId].count++;
      if (data.status === APPOINTMENT_STATUSES.COMPLETED) {
        serviceStats[serviceId].completed++;
      }
    });

    // Récupérer les noms des services
    const serviceIds = Object.keys(serviceStats);
    const services = await this.getServicesByIds(serviceIds);
    const serviceMap = new Map(services.filter(s => s && s.getData()).map(s => [s.getData().id!, s.getData().name]));

    return Object.entries(serviceStats)
      .map(([serviceId, stats]) => ({
        serviceId,
        serviceName: serviceMap.get(serviceId) || 'Service inconnu',
        count: stats.count,
        attendanceRate: stats.count > 0 ? (stats.completed / stats.count) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcule les statistiques par praticien
   */
  private async calculatePractitionerStats(appointments: AppointmentModel[]): Promise<{ practitionerId: string; practitionerName: string; count: number; attendanceRate: number }[]> {
    const practitionerStats: Record<string, { count: number; completed: number }> = {};

    appointments.forEach(appointment => {
      const data = appointment.getData();
      const practitionerId = data.practitionerId;
      
      if (!practitionerStats[practitionerId]) {
        practitionerStats[practitionerId] = { count: 0, completed: 0 };
      }
      
      practitionerStats[practitionerId].count++;
      if (data.status === APPOINTMENT_STATUSES.COMPLETED) {
        practitionerStats[practitionerId].completed++;
      }
    });

    // Récupérer les noms des praticiens
    const practitionerIds = Object.keys(practitionerStats);
    const practitioners = await this.getUsersByIds(practitionerIds);
    const practitionerMap = new Map(practitioners.map(p => [p.id!, p.displayName || 'Praticien inconnu']));

    return Object.entries(practitionerStats)
      .map(([practitionerId, stats]) => ({
        practitionerId,
        practitionerName: practitionerMap.get(practitionerId) || 'Praticien inconnu',
        count: stats.count,
        attendanceRate: stats.count > 0 ? (stats.completed / stats.count) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcule les tendances mensuelles
   */
  private calculateMonthlyTrends(appointments: AppointmentModel[]): { month: string; count: number; attendanceRate: number }[] {
    const monthlyStats: Record<string, { count: number; completed: number }> = {};

    appointments.forEach(appointment => {
      const data = appointment.getData();
      const month = data.date.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = { count: 0, completed: 0 };
      }
      
      monthlyStats[month].count++;
      if (data.status === APPOINTMENT_STATUSES.COMPLETED) {
        monthlyStats[month].completed++;
      }
    });

    return Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        count: stats.count,
        attendanceRate: stats.count > 0 ? (stats.completed / stats.count) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calcule les tendances quotidiennes
   */
  private calculateDailyTrends(appointments: AppointmentModel[]): { date: string; count: number; attendanceRate: number }[] {
    const dailyStats: Record<string, { count: number; completed: number }> = {};

    appointments.forEach(appointment => {
      const data = appointment.getData();
      const date = data.date.toISOString().substring(0, 10); // YYYY-MM-DD
      
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, completed: 0 };
      }
      
      dailyStats[date].count++;
      if (data.status === APPOINTMENT_STATUSES.COMPLETED) {
        dailyStats[date].completed++;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        attendanceRate: stats.count > 0 ? (stats.completed / stats.count) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Retourne des statistiques vides
   */
  private getEmptyStats(): DetailedAppointmentStats {
    return {
      totalAppointments: 0,
      totalScheduled: 0,
      totalConfirmed: 0,
      totalCompleted: 0,
      totalCancelled: 0,
      totalNoShow: 0,
      attendanceRate: 0,
      cancellationRate: 0,
      noShowRate: 0,
      punctualityRate: 0,
      averageDuration: 0,
      averageLeadTime: 0,
      peakHours: [],
      busyHours: [],
      popularServices: [],
      monthlyTrends: [],
      dailyTrends: [],
      serviceBreakdown: [],
      practitionerStats: []
    };
  }

  // Méthodes utilitaires pour récupérer les données

  /**
   * Récupère les services par IDs
   */
  private async getServicesByIds(serviceIds: string[]): Promise<ServiceModel[]> {
    if (serviceIds.length === 0) return [];

    const promises = serviceIds.map(id => this.servicesCollection.doc(id).get());
    const docs = await Promise.all(promises);
    
    return docs
      .map(doc => ServiceModel.fromFirestore(doc))
      .filter(service => service !== null) as ServiceModel[];
  }

  /**
   * Récupère les utilisateurs par IDs
   */
  private async getUsersByIds(userIds: string[]): Promise<any[]> {
    if (userIds.length === 0) return [];

    const promises = userIds.map(id => this.usersCollection.doc(id).get());
    const docs = await Promise.all(promises);
    
    return docs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Obtient la période du rapport sous forme de chaîne
   */
  private getReportPeriod(filters: AnalyticsFilters): string {
    if (filters.startDate && filters.endDate) {
      return `${filters.startDate.toLocaleDateString('fr-FR')} - ${filters.endDate.toLocaleDateString('fr-FR')}`;
    } else if (filters.startDate) {
      return `À partir du ${filters.startDate.toLocaleDateString('fr-FR')}`;
    } else if (filters.endDate) {
      return `Jusqu'au ${filters.endDate.toLocaleDateString('fr-FR')}`;
    }
    return 'Toutes les données';
  }

  // Méthodes pour la génération des feuilles Excel

  /**
   * Crée la feuille de résumé Excel
   */
  private async createSummarySheet(sheet: any, stats: DetailedAppointmentStats): Promise<void> {
    sheet.columns = [
      { header: 'Métrique', key: 'metric', width: 30 },
      { header: 'Valeur', key: 'value', width: 20 }
    ];

    const summaryData = [
      { metric: 'Total des rendez-vous', value: stats.totalAppointments },
      { metric: 'Rendez-vous programmés', value: stats.totalScheduled },
      { metric: 'Rendez-vous confirmés', value: stats.totalConfirmed },
      { metric: 'Rendez-vous terminés', value: stats.totalCompleted },
      { metric: 'Rendez-vous annulés', value: stats.totalCancelled },
      { metric: 'Absences', value: stats.totalNoShow },
      { metric: 'Taux de présence (%)', value: stats.attendanceRate },
      { metric: 'Taux d\'annulation (%)', value: stats.cancellationRate },
      { metric: 'Taux d\'absence (%)', value: stats.noShowRate },
      { metric: 'Taux de ponctualité (%)', value: stats.punctualityRate },
      { metric: 'Durée moyenne (min)', value: stats.averageDuration },
      { metric: 'Délai moyen de réservation (h)', value: stats.averageLeadTime }
    ];

    sheet.addRows(summaryData);

    // Style de l'en-tête
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  /**
   * Crée la feuille des détails Excel
   */
  private async createDetailsSheet(sheet: any, appointments: AppointmentModel[]): Promise<void> {
    sheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Heure', key: 'time', width: 10 },
      { header: 'Durée (min)', key: 'duration', width: 12 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Service', key: 'service', width: 20 },
      { header: 'Praticien', key: 'practitioner', width: 20 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    const appointmentData = appointments.map(appointment => {
      const data = appointment.getData();
      return {
        date: data.date.toLocaleDateString('fr-FR'),
        time: data.startTime,
        duration: data.duration,
        client: data.clientId, // TODO: Récupérer le nom du client
        service: data.serviceId, // TODO: Récupérer le nom du service
        practitioner: data.practitionerId, // TODO: Récupérer le nom du praticien
        status: data.status,
        notes: data.notes || ''
      };
    });

    sheet.addRows(appointmentData);

    // Style de l'en-tête
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  /**
   * Crée la feuille des services Excel
   */
  private async createServicesSheet(sheet: any, serviceBreakdown: any[]): Promise<void> {
    sheet.columns = [
      { header: 'Service', key: 'serviceName', width: 25 },
      { header: 'Nombre de RDV', key: 'count', width: 15 },
      { header: 'Taux de présence (%)', key: 'attendanceRate', width: 20 }
    ];

    sheet.addRows(serviceBreakdown);

    // Style de l'en-tête
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  /**
   * Crée la feuille des praticiens Excel
   */
  private async createPractitionersSheet(sheet: any, practitionerStats: any[]): Promise<void> {
    sheet.columns = [
      { header: 'Praticien', key: 'practitionerName', width: 25 },
      { header: 'Nombre de RDV', key: 'count', width: 15 },
      { header: 'Taux de présence (%)', key: 'attendanceRate', width: 20 }
    ];

    sheet.addRows(practitionerStats);

    // Style de l'en-tête
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }
}

// Export the class for direct instantiation
export { AppointmentAnalyticsService };