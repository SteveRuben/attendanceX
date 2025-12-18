/**
 * Tests pour les services de rapports
 */
import { ReportServiceFactory, ReportUtils } from '../../../backend/functions/src/services/reports';

describe('ReportUtils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(ReportUtils.formatCurrency(1234.56)).toBe('1 234,56 €');
      expect(ReportUtils.formatCurrency(0)).toBe('0,00 €');
    });
  });

  describe('formatHours', () => {
    it('should format hours correctly', () => {
      expect(ReportUtils.formatHours(480)).toBe('8h00'); // 8 heures
      expect(ReportUtils.formatHours(90)).toBe('1h30'); // 1h30
      expect(ReportUtils.formatHours(30)).toBe('0h30'); // 30 minutes
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(ReportUtils.formatPercentage(75.5)).toBe('75.5%');
      expect(ReportUtils.formatPercentage(100)).toBe('100.0%');
      expect(ReportUtils.formatPercentage(0)).toBe('0.0%');
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate percentage change correctly', () => {
      expect(ReportUtils.calculatePercentageChange(110, 100)).toBe(10);
      expect(ReportUtils.calculatePercentageChange(90, 100)).toBe(-10);
      expect(ReportUtils.calculatePercentageChange(100, 0)).toBe(100);
      expect(ReportUtils.calculatePercentageChange(0, 0)).toBe(0);
    });
  });

  describe('validateReportFilters', () => {
    it('should validate correct filters', () => {
      const filters = {
        dateStart: '2024-01-01',
        dateEnd: '2024-01-31',
        employeeIds: ['emp1', 'emp2']
      };
      
      const result = ReportUtils.validateReportFilters(filters);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid date range', () => {
      const filters = {
        dateStart: '2024-01-31',
        dateEnd: '2024-01-01' // End before start
      };
      
      const result = ReportUtils.validateReportFilters(filters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be before end date');
    });

    it('should reject too many employees', () => {
      const filters = {
        employeeIds: Array(101).fill('emp') // 101 employees
      };
      
      const result = ReportUtils.validateReportFilters(filters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot filter by more than 100 employees');
    });
  });
});

describe('ReportServiceFactory', () => {
  // Mock Firestore
  const mockDb = {} as any;
  
  it('should create report services', () => {
    const factory = new ReportServiceFactory(mockDb);
    
    expect(factory.createReportService()).toBeDefined();
    expect(factory.createProductivityReportService()).toBeDefined();
    expect(factory.createProfitabilityReportService()).toBeDefined();
    expect(factory.createDashboardService()).toBeDefined();
  });

  it('should create all services at once', () => {
    const factory = new ReportServiceFactory(mockDb);
    const services = factory.createAllServices();
    
    expect(services.reportService).toBeDefined();
    expect(services.productivityReportService).toBeDefined();
    expect(services.profitabilityReportService).toBeDefined();
    expect(services.dashboardService).toBeDefined();
  });
});