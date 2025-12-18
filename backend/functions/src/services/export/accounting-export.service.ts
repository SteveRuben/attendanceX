/**
 * Service d'export comptable pour les systèmes de paie et facturation
 */

import { ExportService } from './export.service';
import { ValidationError } from '../../models/base.model';

// Types pour les exports comptables
export interface PayrollExport {
  id?: string;
  tenantId: string;

  // Période de paie
  payrollPeriod: {
    start: Date;
    end: Date;
    type: 'weekly' | 'bi-weekly' | 'monthly';
  };

  // Données employé
  employeeData: PayrollEmployeeData[];

  // Totaux
  totals: {
    totalEmployees: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalCost: number;
    totalRegularCost: number;
    totalOvertimeCost: number;
  };

  // Configuration
  includeBreakdown: boolean;
  includeBenefits: boolean;
  includeDeductions: boolean;

  // Métadonnées
  generatedBy: string;
  generatedAt: Date;
}

export interface PayrollEmployeeData {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;

  // Heures
  regularHours: number;
  overtimeHours: number;
  totalHours: number;

  // Taux
  regularRate: number;
  overtimeRate: number;

  // Coûts
  regularPay: number;
  overtimePay: number;
  totalPay: number;

  // Détails par jour
  dailyBreakdown?: DailyHours[];

  // Projets
  projectBreakdown?: ProjectHours[];
}

export interface DailyHours {
  date: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  projects: string[];
}

export interface ProjectHours {
  projectId: string;
  projectName: string;
  hours: number;
  billableHours: number;
  cost: number;
  billableAmount: number;
}

export interface BillingExport {
  id?: string;
  tenantId: string;

  // Période de facturation
  billingPeriod: {
    start: Date;
    end: Date;
  };

  // Client/Projet
  clientId?: string;
  clientName?: string;
  projectData: BillingProjectData[];

  // Totaux
  totals: {
    totalProjects: number;
    totalHours: number;
    totalBillableHours: number;
    totalAmount: number;
    totalCost: number;
    margin: number;
    marginPercentage: number;
  };

  // Configuration
  includeNonBillable: boolean;
  includeEmployeeDetails: boolean;
  includeRateDetails: boolean;

  // Métadonnées
  generatedBy: string;
  generatedAt: Date;
}

export interface BillingProjectData {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientId: string;
  clientName: string;

  // Heures
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;

  // Montants
  totalCost: number;
  billableAmount: number;
  averageRate: number;

  // Détails par employé
  employeeBreakdown?: BillingEmployeeData[];

  // Détails par activité
  activityBreakdown?: ActivityBilling[];
}

export interface BillingEmployeeData {
  employeeId: string;
  employeeName: string;
  hours: number;
  billableHours: number;
  rate: number;
  cost: number;
  billableAmount: number;
}

export interface ActivityBilling {
  activityId: string;
  activityName: string;
  hours: number;
  rate: number;
  amount: number;
}

export class AccountingExportService extends ExportService {

  // ==================== Exports de paie ====================

  /**
   * Générer un export de paie
   */
  async generatePayrollExport(
    tenantId: string,
    payrollPeriod: PayrollExport['payrollPeriod'],
    options: {
      employeeIds?: string[];
      includeBreakdown?: boolean;
      includeBenefits?: boolean;
      includeDeductions?: boolean;
      format?: 'csv' | 'excel' | 'json' | 'xml';
    },
    generatedBy: string
  ): Promise<PayrollExport> {
    try {
      // Obtenir les données des employés pour la période
      const employeeData = await this.fetchPayrollEmployeeData(tenantId, payrollPeriod, options.employeeIds);

      // Calculer les totaux
      const totals = this.calculatePayrollTotals(employeeData);

      const payrollExport: PayrollExport = {
        tenantId,
        payrollPeriod,
        employeeData,
        totals,
        includeBreakdown: options.includeBreakdown || false,
        includeBenefits: options.includeBenefits || false,
        includeDeductions: options.includeDeductions || false,
        generatedBy,
        generatedAt: new Date()
      };

      return payrollExport;
    } catch (error) {
      throw new Error(`Failed to generate payroll export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exporter vers un système de paie spécifique
   */
  async exportToPayrollSystem(
    tenantId: string,
    payrollExport: PayrollExport,
    systemType: 'sage' | 'adp' | 'workday' | 'bamboohr' | 'generic',
    format: 'csv' | 'xml' | 'json' = 'csv'
  ): Promise<string> {
    try {
      let formattedData: string;

      switch (systemType) {
        case 'sage':
          formattedData = this.formatForSage(payrollExport, format);
          break;

        case 'adp':
          formattedData = this.formatForADP(payrollExport, format);
          break;

        case 'workday':
          formattedData = this.formatForWorkday(payrollExport, format);
          break;

        case 'bamboohr':
          formattedData = this.formatForBambooHR(payrollExport, format);
          break;

        case 'generic':
        default:
          formattedData = this.formatGenericPayroll(payrollExport, format);
          break;
      }

      // Sauvegarder le fichier
      const fileName = `payroll_${systemType}_${Date.now()}.${format}`;
      const fileUrl = await this.saveAccountingExportFile(fileName, formattedData, this.getMimeType(format));

      return fileUrl;
    } catch (error) {
      throw new Error(`Failed to export to payroll system: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Exports de facturation ====================

  /**
   * Générer un export de facturation
   */
  async generateBillingExport(
    tenantId: string,
    billingPeriod: BillingExport['billingPeriod'],
    options: {
      clientId?: string;
      projectIds?: string[];
      includeNonBillable?: boolean;
      includeEmployeeDetails?: boolean;
      includeRateDetails?: boolean;
      format?: 'csv' | 'excel' | 'json' | 'pdf';
    },
    generatedBy: string
  ): Promise<BillingExport> {
    try {
      // Obtenir les données de facturation pour la période
      const projectData = await this.fetchBillingProjectData(tenantId, billingPeriod, options);

      // Calculer les totaux
      const totals = this.calculateBillingTotals(projectData);

      const billingExport: BillingExport = {
        tenantId,
        billingPeriod,
        clientId: options.clientId,
        projectData,
        totals,
        includeNonBillable: options.includeNonBillable || false,
        includeEmployeeDetails: options.includeEmployeeDetails || false,
        includeRateDetails: options.includeRateDetails || false,
        generatedBy,
        generatedAt: new Date()
      };

      return billingExport;
    } catch (error) {
      throw new Error(`Failed to generate billing export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer une facture client
   */
  async generateClientInvoice(
    tenantId: string,
    clientId: string,
    billingPeriod: BillingExport['billingPeriod'],
    options: {
      projectIds?: string[];
      includeDetails?: boolean;
      invoiceTemplate?: string;
      currency?: string;
      taxRate?: number;
    }
  ): Promise<{
    invoiceData: any;
    fileUrl: string;
  }> {
    try {
      // Obtenir les données de facturation pour le client
      const billingExport = await this.generateBillingExport(
        tenantId,
        billingPeriod,
        {
          clientId,
          projectIds: options.projectIds,
          includeEmployeeDetails: options.includeDetails || false,
          includeRateDetails: options.includeDetails || false
        },
        'system'
      );

      // Générer les données de facture
      const invoiceData = this.generateInvoiceData(billingExport, options);

      // Générer le PDF de facture
      const fileUrl = await this.generateInvoicePDF(invoiceData, options.invoiceTemplate);

      return {
        invoiceData,
        fileUrl
      };
    } catch (error) {
      throw new Error(`Failed to generate client invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes de récupération de données ====================

  private async fetchPayrollEmployeeData(
    tenantId: string,
    payrollPeriod: PayrollExport['payrollPeriod'],
    employeeIds?: string[]
  ): Promise<PayrollEmployeeData[]> {
    try {
      // TODO: Intégrer avec les services de feuilles de temps et employés
      // Pour l'instant, retourner des données fictives
      return [];
    } catch (error) {
      throw new Error(`Failed to fetch payroll data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchBillingProjectData(
    tenantId: string,
    billingPeriod: BillingExport['billingPeriod'],
    options: any
  ): Promise<BillingProjectData[]> {
    try {
      // TODO: Intégrer avec les services de projets et feuilles de temps
      // Pour l'instant, retourner des données fictives
      return [];
    } catch (error) {
      throw new Error(`Failed to fetch billing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Calculs ====================

  private calculatePayrollTotals(employeeData: PayrollEmployeeData[]): PayrollExport['totals'] {
    return employeeData.reduce((totals, employee) => ({
      totalEmployees: totals.totalEmployees + 1,
      totalHours: totals.totalHours + employee.totalHours,
      totalRegularHours: totals.totalRegularHours + employee.regularHours,
      totalOvertimeHours: totals.totalOvertimeHours + employee.overtimeHours,
      totalCost: totals.totalCost + employee.totalPay,
      totalRegularCost: totals.totalRegularCost + employee.regularPay,
      totalOvertimeCost: totals.totalOvertimeCost + employee.overtimePay
    }), {
      totalEmployees: 0,
      totalHours: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalCost: 0,
      totalRegularCost: 0,
      totalOvertimeCost: 0
    });
  }

  private calculateBillingTotals(projectData: BillingProjectData[]): BillingExport['totals'] {
    const initialTotals: BillingExport['totals'] = {
      totalProjects: 0,
      totalHours: 0,
      totalBillableHours: 0,
      totalAmount: 0,
      totalCost: 0,
      margin: 0,
      marginPercentage: 0
    };

    const totals = projectData.reduce((acc, project) => ({
      totalProjects: acc.totalProjects + 1,
      totalHours: acc.totalHours + project.totalHours,
      totalBillableHours: acc.totalBillableHours + project.billableHours,
      totalAmount: acc.totalAmount + project.billableAmount,
      totalCost: acc.totalCost + project.totalCost,
      margin: acc.margin,
      marginPercentage: acc.marginPercentage
    }), initialTotals);

    // Calculer la marge
    totals.margin = totals.totalAmount - totals.totalCost;
    totals.marginPercentage = totals.totalAmount > 0 ? (totals.margin / totals.totalAmount) * 100 : 0;

    return totals;
  }  // ==================== Formatage pour systèmes de paie ====================

  private formatForSage(payrollExport: PayrollExport, format: string): string {
    // Format spécifique pour Sage
    if (format === 'csv') {
      let csv = 'Employee Code,First Name,Last Name,Regular Hours,Overtime Hours,Regular Rate,Overtime Rate,Total Pay\n';

      payrollExport.employeeData.forEach(employee => {
        csv += `${employee.employeeCode},${employee.firstName},${employee.lastName},`;
        csv += `${employee.regularHours},${employee.overtimeHours},`;
        csv += `${employee.regularRate},${employee.overtimeRate},${employee.totalPay}\n`;
      });

      return csv;
    }

    // TODO: Implémenter d'autres formats pour Sage
    return this.formatGenericPayroll(payrollExport, format);
  }

  private formatForADP(payrollExport: PayrollExport, format: string): string {
    // Format spécifique pour ADP
    if (format === 'csv') {
      let csv = 'Employee ID,Last Name,First Name,Department,Regular Hours,OT Hours,Total Hours\n';

      payrollExport.employeeData.forEach(employee => {
        csv += `${employee.employeeCode},${employee.lastName},${employee.firstName},`;
        csv += `${employee.department},${employee.regularHours},${employee.overtimeHours},${employee.totalHours}\n`;
      });

      return csv;
    }

    return this.formatGenericPayroll(payrollExport, format);
  }

  private formatForWorkday(payrollExport: PayrollExport, format: string): string {
    // Format spécifique pour Workday
    if (format === 'xml') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<PayrollData>\n';
      xml += `  <PayrollPeriod start="${payrollExport.payrollPeriod.start.toISOString()}" end="${payrollExport.payrollPeriod.end.toISOString()}"/>\n`;

      payrollExport.employeeData.forEach(employee => {
        xml += '  <Employee>\n';
        xml += `    <EmployeeID>${employee.employeeCode}</EmployeeID>\n`;
        xml += `    <Name>${employee.firstName} ${employee.lastName}</Name>\n`;
        xml += `    <RegularHours>${employee.regularHours}</RegularHours>\n`;
        xml += `    <OvertimeHours>${employee.overtimeHours}</OvertimeHours>\n`;
        xml += `    <TotalPay>${employee.totalPay}</TotalPay>\n`;
        xml += '  </Employee>\n';
      });

      xml += '</PayrollData>';
      return xml;
    }

    return this.formatGenericPayroll(payrollExport, format);
  }

  private formatForBambooHR(payrollExport: PayrollExport, format: string): string {
    // Format spécifique pour BambooHR
    if (format === 'json') {
      return JSON.stringify({
        payrollPeriod: payrollExport.payrollPeriod,
        employees: payrollExport.employeeData.map(employee => ({
          employeeId: employee.employeeCode,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          hours: {
            regular: employee.regularHours,
            overtime: employee.overtimeHours,
            total: employee.totalHours
          },
          pay: {
            regular: employee.regularPay,
            overtime: employee.overtimePay,
            total: employee.totalPay
          }
        })),
        totals: payrollExport.totals
      }, null, 2);
    }

    return this.formatGenericPayroll(payrollExport, format);
  }

  private formatGenericPayroll(payrollExport: PayrollExport, format: string): string {
    switch (format) {
      case 'csv':
        return this.generatePayrollCSV(payrollExport);
      case 'json':
        return JSON.stringify(payrollExport, null, 2);
      case 'xml':
        return this.generatePayrollXML(payrollExport);
      default:
        throw new ValidationError(`Unsupported format for payroll export: ${format}`);
    }
  }

  private generatePayrollCSV(payrollExport: PayrollExport): string {
    let csv = 'Employee Code,Employee Name,Department,Position,Regular Hours,Overtime Hours,Total Hours,Regular Rate,Overtime Rate,Regular Pay,Overtime Pay,Total Pay\n';

    payrollExport.employeeData.forEach(employee => {
      csv += `${employee.employeeCode},"${employee.firstName} ${employee.lastName}",`;
      csv += `${employee.department},${employee.position},`;
      csv += `${employee.regularHours},${employee.overtimeHours},${employee.totalHours},`;
      csv += `${employee.regularRate},${employee.overtimeRate},`;
      csv += `${employee.regularPay},${employee.overtimePay},${employee.totalPay}\n`;
    });

    return csv;
  }

  private generatePayrollXML(payrollExport: PayrollExport): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<PayrollExport>\n';
    xml += '  <Period>\n';
    xml += `    <Start>${payrollExport.payrollPeriod.start.toISOString()}</Start>\n`;
    xml += `    <End>${payrollExport.payrollPeriod.end.toISOString()}</End>\n`;
    xml += `    <Type>${payrollExport.payrollPeriod.type}</Type>\n`;
    xml += '  </Period>\n';
    xml += '  <Employees>\n';

    payrollExport.employeeData.forEach(employee => {
      xml += '    <Employee>\n';
      xml += `      <Code>${employee.employeeCode}</Code>\n`;
      xml += `      <FirstName>${this.escapeXmlText(employee.firstName)}</FirstName>\n`;
      xml += `      <LastName>${this.escapeXmlText(employee.lastName)}</LastName>\n`;
      xml += `      <Department>${this.escapeXmlText(employee.department)}</Department>\n`;
      xml += `      <Position>${this.escapeXmlText(employee.position)}</Position>\n`;
      xml += '      <Hours>\n';
      xml += `        <Regular>${employee.regularHours}</Regular>\n`;
      xml += `        <Overtime>${employee.overtimeHours}</Overtime>\n`;
      xml += `        <Total>${employee.totalHours}</Total>\n`;
      xml += '      </Hours>\n';
      xml += '      <Rates>\n';
      xml += `        <Regular>${employee.regularRate}</Regular>\n`;
      xml += `        <Overtime>${employee.overtimeRate}</Overtime>\n`;
      xml += '      </Rates>\n';
      xml += '      <Pay>\n';
      xml += `        <Regular>${employee.regularPay}</Regular>\n`;
      xml += `        <Overtime>${employee.overtimePay}</Overtime>\n`;
      xml += `        <Total>${employee.totalPay}</Total>\n`;
      xml += '      </Pay>\n';
      xml += '    </Employee>\n';
    });

    xml += '  </Employees>\n';
    xml += '  <Totals>\n';
    xml += `    <TotalEmployees>${payrollExport.totals.totalEmployees}</TotalEmployees>\n`;
    xml += `    <TotalHours>${payrollExport.totals.totalHours}</TotalHours>\n`;
    xml += `    <TotalCost>${payrollExport.totals.totalCost}</TotalCost>\n`;
    xml += '  </Totals>\n';
    xml += '</PayrollExport>';

    return xml;
  }

  // ==================== Génération de factures ====================

  private generateInvoiceData(billingExport: BillingExport, options: any): any {
    return {
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      billingPeriod: {
        start: billingExport.billingPeriod.start.toISOString().split('T')[0],
        end: billingExport.billingPeriod.end.toISOString().split('T')[0]
      },
      client: {
        id: billingExport.clientId,
        name: billingExport.clientName
      },
      projects: billingExport.projectData.map(project => ({
        name: project.projectName,
        code: project.projectCode,
        hours: project.billableHours,
        rate: project.averageRate,
        amount: project.billableAmount
      })),
      subtotal: billingExport.totals.totalAmount,
      tax: options.taxRate ? billingExport.totals.totalAmount * (options.taxRate / 100) : 0,
      total: billingExport.totals.totalAmount + (options.taxRate ? billingExport.totals.totalAmount * (options.taxRate / 100) : 0),
      currency: options.currency || 'EUR'
    };
  }

  private async generateInvoicePDF(invoiceData: any, template?: string): Promise<string> {
    // TODO: Implémenter la génération de PDF de facture
    // Pour l'instant, retourner une URL fictive
    return `https://storage.example.com/invoices/invoice_${invoiceData.invoiceNumber}.pdf`;
  }

  // ==================== Méthodes utilitaires ====================

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'csv': 'text/csv',
      'json': 'application/json',
      'xml': 'application/xml',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pdf': 'application/pdf'
    };

    return mimeTypes[format] || 'text/plain';
  }

  private async saveAccountingExportFile(fileName: string, content: string, mimeType: string): Promise<string> {
    // TODO: Intégrer avec le service de stockage (Firebase Storage, AWS S3, etc.)
    // Pour l'instant, retourner une URL fictive
    return `https://storage.example.com/accounting-exports/${fileName}`;
  }

  private escapeXmlText(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==================== Méthodes publiques pour les totalisations ====================

  /**
   * Générer un rapport de totalisation par période
   */
  async generatePeriodSummary(
    tenantId: string,
    period: { start: Date; end: Date },
    groupBy: 'employee' | 'project' | 'department' | 'week' | 'month'
  ): Promise<any> {
    try {
      // TODO: Implémenter la génération de résumé par période
      return {
        period,
        groupBy,
        summary: [],
        totals: {}
      };
    } catch (error) {
      throw new Error(`Failed to generate period summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Générer un rapport de conformité comptable
   */
  async generateComplianceReport(
    tenantId: string,
    period: { start: Date; end: Date },
    standard: 'gaap' | 'ifrs' | 'local'
  ): Promise<any> {
    try {
      // TODO: Implémenter la génération de rapport de conformité
      return {
        period,
        standard,
        compliance: {
          status: 'compliant',
          issues: [],
          recommendations: []
        }
      };
    } catch (error) {
      throw new Error(`Failed to generate compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}