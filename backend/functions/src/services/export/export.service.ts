/**
 * Service d'export de base pour les feuilles de temps
 */

import { firestore } from 'firebase-admin';
import { ValidationError } from '../../models/base.model';

// Types pour les exports
export interface ExportRequest {
  id?: string;
  tenantId: string;
  
  // Configuration de l'export
  exportType: 'timesheet' | 'time_entries' | 'summary' | 'payroll' | 'billing';
  format: 'csv' | 'excel' | 'json' | 'pdf' | 'xml';
  
  // Filtres
  filters: {
    dateRange: {
      start: Date;
      end: Date;
    };
    employeeIds?: string[];
    projectIds?: string[];
    activityCodeIds?: string[];
    status?: string[];
    billableOnly?: boolean;
    approvedOnly?: boolean;
  };
  
  // Paramètres d'export
  options: {
    includeHeaders: boolean;
    includeMetadata: boolean;
    includeCalculations: boolean;
    groupBy?: 'employee' | 'project' | 'activity' | 'date' | 'week' | 'month';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    timezone?: string;
    dateFormat?: string;
    numberFormat?: string;
    currency?: string;
  };
  
  // Template personnalisé
  templateId?: string;
  customFields?: string[];
  
  // Statut
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  
  // Résultats
  outputUrl?: string;
  fileSize?: number;
  recordCount?: number;
  
  // Métadonnées
  requestedBy: string;
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // en millisecondes
  
  // Erreurs
  errors?: string[];
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportTemplate {
  id?: string;
  tenantId: string;
  
  // Identification
  name: string;
  description: string;
  exportType: ExportRequest['exportType'];
  format: ExportRequest['format'];
  
  // Configuration
  columns: ExportColumn[];
  defaultFilters: Partial<ExportRequest['filters']>;
  defaultOptions: Partial<ExportRequest['options']>;
  
  // Personnalisation
  headerStyle?: any;
  dataStyle?: any;
  footerTemplate?: string;
  
  // Métadonnées
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportColumn {
  id: string;
  name: string;
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'duration';
  width?: number;
  format?: string;
  formula?: string; // Pour les colonnes calculées
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
}

export class ExportService {
  private db: firestore.Firestore;
  private requestsCollection: string = 'export_requests';
  private templatesCollection: string = 'export_templates';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Gestion des exports ====================

  /**
   * Créer une demande d'export
   */
  async createExportRequest(
    tenantId: string,
    exportType: ExportRequest['exportType'],
    format: ExportRequest['format'],
    filters: ExportRequest['filters'],
    options: ExportRequest['options'],
    requestedBy: string,
    templateId?: string
  ): Promise<ExportRequest> {
    try {
      // Valider les paramètres
      this.validateExportParameters(exportType, format, filters, options);

      // Appliquer le template si spécifié
      let finalOptions = options;
      let customFields: string[] | undefined;
      
      if (templateId) {
        const template = await this.getExportTemplate(tenantId, templateId);
        if (template) {
          finalOptions = { ...template.defaultOptions, ...options };
          customFields = template.columns.filter(c => c.visible).map(c => c.field);
        }
      }

      const request: ExportRequest = {
        tenantId,
        exportType,
        format,
        filters,
        options: finalOptions,
        templateId,
        customFields,
        status: 'pending',
        progress: 0,
        requestedBy,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.requestsCollection).add(request);
      
      const createdRequest = {
        ...request,
        id: docRef.id
      };

      // Démarrer le traitement asynchrone
      this.processExportAsync(createdRequest);

      return createdRequest;
    } catch (error) {
      throw new Error(`Failed to create export request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Traiter un export de manière asynchrone
   */
  private async processExportAsync(request: ExportRequest): Promise<void> {
    try {
      // Mettre à jour le statut
      await this.updateExportStatus(request.id!, 'processing', 0);

      // Obtenir les données
      const data = await this.fetchExportData(request);
      await this.updateExportStatus(request.id!, 'processing', 30);

      // Formater les données
      const formattedData = await this.formatExportData(data, request);
      await this.updateExportStatus(request.id!, 'processing', 60);

      // Générer le fichier
      const fileInfo = await this.generateExportFile(formattedData, request);
      await this.updateExportStatus(request.id!, 'processing', 90);

      // Finaliser l'export
      await this.finalizeExport(request.id!, fileInfo);
      await this.updateExportStatus(request.id!, 'completed', 100);

    } catch (error) {
      await this.updateExportStatus(request.id!, 'failed', 0, [
        error instanceof Error ? error.message : 'Unknown error'
      ]);
    }
  }

  /**
   * Obtenir les données pour l'export
   */
  private async fetchExportData(request: ExportRequest): Promise<any[]> {
    try {
      const { filters, exportType } = request;
      
      // TODO: Intégrer avec les services appropriés selon le type d'export
      switch (exportType) {
        case 'timesheet':
          return this.fetchTimesheetData(request.tenantId, filters);
        
        case 'time_entries':
          return this.fetchTimeEntryData(request.tenantId, filters);
        
        case 'summary':
          return this.fetchSummaryData(request.tenantId, filters);
        
        case 'payroll':
          return this.fetchPayrollData(request.tenantId, filters);
        
        case 'billing':
          return this.fetchBillingData(request.tenantId, filters);
        
        default:
          throw new ValidationError(`Unsupported export type: ${exportType}`);
      }
    } catch (error) {
      throw new Error(`Failed to fetch export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Formater les données selon les options
   */
  private async formatExportData(data: any[], request: ExportRequest): Promise<any[]> {
    try {
      let formattedData = [...data];

      // Appliquer le groupement
      if (request.options.groupBy) {
        formattedData = this.groupData(formattedData, request.options.groupBy);
      }

      // Appliquer le tri
      if (request.options.sortBy) {
        formattedData = this.sortData(formattedData, request.options.sortBy, request.options.sortOrder);
      }

      // Formater les valeurs
      formattedData = this.formatValues(formattedData, request.options);

      // Appliquer les colonnes personnalisées
      if (request.customFields) {
        formattedData = this.applyCustomFields(formattedData, request.customFields);
      }

      return formattedData;
    } catch (error) {
      throw new Error(`Failed to format export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer le fichier d'export
   */
  private async generateExportFile(data: any[], request: ExportRequest): Promise<{
    url: string;
    size: number;
    recordCount: number;
  }> {
    try {
      let fileContent: string | Buffer;
      let mimeType: string;
      let extension: string;

      switch (request.format) {
        case 'csv':
          fileContent = this.generateCSV(data, request.options);
          mimeType = 'text/csv';
          extension = 'csv';
          break;

        case 'excel':
          fileContent = await this.generateExcel(data, request.options);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = 'xlsx';
          break;

        case 'json':
          fileContent = this.generateJSON(data, request.options);
          mimeType = 'application/json';
          extension = 'json';
          break;

        case 'pdf':
          fileContent = await this.generatePDF(data, request.options);
          mimeType = 'application/pdf';
          extension = 'pdf';
          break;

        case 'xml':
          fileContent = this.generateXML(data, request.options);
          mimeType = 'application/xml';
          extension = 'xml';
          break;

        default:
          throw new ValidationError(`Unsupported export format: ${request.format}`);
      }

      // Sauvegarder le fichier (TODO: intégrer avec le service de stockage)
      const fileName = `export_${request.id}_${Date.now()}.${extension}`;
      const fileUrl = await this.saveExportFile(fileName, fileContent, mimeType);

      return {
        url: fileUrl,
        size: Buffer.isBuffer(fileContent) ? fileContent.length : Buffer.byteLength(fileContent),
        recordCount: data.length
      };
    } catch (error) {
      throw new Error(`Failed to generate export file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  // ==================== Gestion des templates ====================

  /**
   * Créer un template d'export
   */
  async createExportTemplate(
    tenantId: string,
    name: string,
    description: string,
    exportType: ExportRequest['exportType'],
    format: ExportRequest['format'],
    columns: ExportColumn[],
    createdBy: string,
    options: {
      defaultFilters?: Partial<ExportRequest['filters']>;
      defaultOptions?: Partial<ExportRequest['options']>;
      isDefault?: boolean;
      isPublic?: boolean;
    } = {}
  ): Promise<ExportTemplate> {
    try {
      const template: ExportTemplate = {
        tenantId,
        name,
        description,
        exportType,
        format,
        columns,
        defaultFilters: options.defaultFilters || {},
        defaultOptions: options.defaultOptions || {},
        isDefault: options.isDefault || false,
        isPublic: options.isPublic || false,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection(this.templatesCollection).add(template);
      
      return {
        ...template,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to create export template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir un template d'export
   */
  async getExportTemplate(tenantId: string, templateId: string): Promise<ExportTemplate | null> {
    try {
      const doc = await this.db.collection(this.templatesCollection).doc(templateId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data || data.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...data
      } as ExportTemplate;
    } catch (error) {
      return null;
    }
  }

  // ==================== Méthodes utilitaires ====================

  private validateExportParameters(
    exportType: ExportRequest['exportType'],
    format: ExportRequest['format'],
    filters: ExportRequest['filters'],
    options: ExportRequest['options']
  ): void {
    // Valider les dates
    if (filters.dateRange.start >= filters.dateRange.end) {
      throw new ValidationError('Start date must be before end date');
    }

    // Valider la période (max 1 an)
    const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 an en millisecondes
    if (filters.dateRange.end.getTime() - filters.dateRange.start.getTime() > maxPeriod) {
      throw new ValidationError('Export period cannot exceed 1 year');
    }

    // Valider les formats supportés
    const supportedFormats = ['csv', 'excel', 'json', 'pdf', 'xml'];
    if (!supportedFormats.includes(format)) {
      throw new ValidationError(`Unsupported format: ${format}`);
    }

    // Valider les types d'export
    const supportedTypes = ['timesheet', 'time_entries', 'summary', 'payroll', 'billing'];
    if (!supportedTypes.includes(exportType)) {
      throw new ValidationError(`Unsupported export type: ${exportType}`);
    }
  }

  private async updateExportStatus(
    requestId: string,
    status: ExportRequest['status'],
    progress: number,
    errors?: string[]
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        progress,
        updatedAt: new Date()
      };

      if (status === 'processing' && progress === 0) {
        updateData.startedAt = new Date();
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
      }

      if (errors) {
        updateData.errors = errors;
      }

      await this.db.collection(this.requestsCollection).doc(requestId).update(updateData);
    } catch (error) {
      console.error('Failed to update export status:', error);
    }
  }

  private async finalizeExport(requestId: string, fileInfo: {
    url: string;
    size: number;
    recordCount: number;
  }): Promise<void> {
    try {
      await this.db.collection(this.requestsCollection).doc(requestId).update({
        outputUrl: fileInfo.url,
        fileSize: fileInfo.size,
        recordCount: fileInfo.recordCount,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to finalize export:', error);
    }
  }

  // ==================== Méthodes de récupération de données ====================

  private async fetchTimesheetData(tenantId: string, filters: ExportRequest['filters']): Promise<any[]> {
    // TODO: Intégrer avec TimesheetService
    return [];
  }

  private async fetchTimeEntryData(tenantId: string, filters: ExportRequest['filters']): Promise<any[]> {
    // TODO: Intégrer avec TimeEntryService
    return [];
  }

  private async fetchSummaryData(tenantId: string, filters: ExportRequest['filters']): Promise<any[]> {
    // TODO: Calculer les données de résumé
    return [];
  }

  private async fetchPayrollData(tenantId: string, filters: ExportRequest['filters']): Promise<any[]> {
    // TODO: Intégrer avec le service de paie
    return [];
  }

  private async fetchBillingData(tenantId: string, filters: ExportRequest['filters']): Promise<any[]> {
    // TODO: Calculer les données de facturation
    return [];
  }

  // ==================== Méthodes de formatage ====================

  private groupData(data: any[], groupBy: string): any[] {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy] || 'Unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([key, items]) => ({
      group: key,
      items: items as any[]
    }));
  }

  private sortData(data: any[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): any[] {
    return data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private formatValues(data: any[], options: ExportRequest['options']): any[] {
    return data.map(item => {
      const formatted = { ...item };

      // Formater les dates
      if (options.dateFormat) {
        Object.keys(formatted).forEach(key => {
          if (formatted[key] instanceof Date) {
            formatted[key] = this.formatDate(formatted[key], options.dateFormat!);
          }
        });
      }

      // Formater les nombres
      if (options.numberFormat) {
        Object.keys(formatted).forEach(key => {
          if (typeof formatted[key] === 'number') {
            formatted[key] = this.formatNumber(formatted[key], options.numberFormat!);
          }
        });
      }

      return formatted;
    });
  }

  private applyCustomFields(data: any[], fields: string[]): any[] {
    return data.map(item => {
      const filtered: any = {};
      fields.forEach(field => {
        if (item.hasOwnProperty(field)) {
          filtered[field] = item[field];
        }
      });
      return filtered;
    });
  }

  // ==================== Générateurs de fichiers ====================

  private generateCSV(data: any[], options: ExportRequest['options']): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    let csv = '';

    // Ajouter les en-têtes si demandé
    if (options.includeHeaders) {
      csv += headers.join(',') + '\n';
    }

    // Ajouter les données
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Échapper les guillemets et virgules
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  private async generateExcel(data: any[], options: ExportRequest['options']): Promise<Buffer> {
    // TODO: Implémenter la génération Excel avec une librairie comme xlsx
    // Pour l'instant, retourner un buffer vide
    return Buffer.from('Excel generation not implemented yet');
  }

  private generateJSON(data: any[], options: ExportRequest['options']): string {
    const output: any = {
      data,
      metadata: {}
    };

    if (options.includeMetadata) {
      output.metadata = {
        exportedAt: new Date().toISOString(),
        recordCount: data.length,
        format: 'json'
      };
    }

    return JSON.stringify(output, null, 2);
  }

  private async generatePDF(data: any[], options: ExportRequest['options']): Promise<Buffer> {
    // TODO: Implémenter la génération PDF avec une librairie comme puppeteer ou pdfkit
    return Buffer.from('PDF generation not implemented yet');
  }

  private generateXML(data: any[], options: ExportRequest['options']): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<export>\n';

    if (options.includeMetadata) {
      xml += '  <metadata>\n';
      xml += `    <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
      xml += `    <recordCount>${data.length}</recordCount>\n`;
      xml += '  </metadata>\n';
    }

    xml += '  <data>\n';
    data.forEach(item => {
      xml += '    <record>\n';
      Object.entries(item).forEach(([key, value]) => {
        xml += `      <${key}>${this.escapeXml(String(value))}</${key}>\n`;
      });
      xml += '    </record>\n';
    });
    xml += '  </data>\n';
    xml += '</export>';

    return xml;
  }

  // ==================== Méthodes utilitaires de formatage ====================

  private formatDate(date: Date, format: string): string {
    // TODO: Implémenter le formatage de date selon le format spécifié
    return date.toISOString().split('T')[0]; // Format YYYY-MM-DD par défaut
  }

  private formatNumber(number: number, format: string): string {
    // TODO: Implémenter le formatage de nombre selon le format spécifié
    return number.toString();
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async saveExportFile(fileName: string, content: string | Buffer, mimeType: string): Promise<string> {
    // TODO: Intégrer avec le service de stockage (Firebase Storage, AWS S3, etc.)
    // Pour l'instant, retourner une URL fictive
    return `https://storage.example.com/exports/${fileName}`;
  }

  // ==================== Méthodes de requête ====================

  /**
   * Obtenir une demande d'export
   */
  async getExportRequest(tenantId: string, requestId: string): Promise<ExportRequest | null> {
    try {
      const doc = await this.db.collection(this.requestsCollection).doc(requestId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      if (!data || data.tenantId !== tenantId) {
        return null;
      }

      return {
        id: doc.id,
        ...data
      } as ExportRequest;
    } catch (error) {
      return null;
    }
  }

  /**
   * Lister les demandes d'export
   */
  async listExportRequests(
    tenantId: string,
    options: {
      status?: ExportRequest['status'];
      requestedBy?: string;
      limit?: number;
    } = {}
  ): Promise<ExportRequest[]> {
    try {
      let query = this.db.collection(this.requestsCollection)
        .where('tenantId', '==', tenantId);

      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      if (options.requestedBy) {
        query = query.where('requestedBy', '==', options.requestedBy);
      }

      const result = await query
        .orderBy('requestedAt', 'desc')
        .limit(options.limit || 50)
        .get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExportRequest));
    } catch (error) {
      throw new Error(`Failed to list export requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Annuler une demande d'export
   */
  async cancelExportRequest(tenantId: string, requestId: string, cancelledBy: string): Promise<void> {
    try {
      const request = await this.getExportRequest(tenantId, requestId);
      
      if (!request) {
        throw new ValidationError('Export request not found');
      }

      if (request.status === 'completed' || request.status === 'failed') {
        throw new ValidationError('Cannot cancel completed or failed export');
      }

      await this.db.collection(this.requestsCollection).doc(requestId).update({
        status: 'cancelled',
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to cancel export request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}