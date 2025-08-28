import { AppointmentAnalyticsService, AnalyticsFilters } from '../../../../backend/functions/src/services/appointment-analytics.service';
import { AppointmentModel } from '../../../../backend/functions/src/models/appointment.model';
import { APPOINTMENT_STATUSES } from '@attendance-x/shared';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Mock Firebase
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  Timestamp: {
    fromDate: jest.fn()
  }
}));
jest.mock('../../../../backend/functions/src/models/appointment.model');
jest.mock('../../../../backend/functions/src/models/service.model');

describe('AppointmentAnalyticsService', () => {
  let service: AppointmentAnalyticsService;
  let mockFirestore: any;
  let mockCollection: any;
  let mockQuery: any;
  let mockDoc: any;

  beforeEach(() => {
    // Setup mocks
    mockDoc = {
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn()
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnValue(mockQuery),
      add: jest.fn(),
      get: jest.fn()
    };

    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    
    // Mock Timestamp.fromDate
    (Timestamp.fromDate as jest.Mock).mockImplementation((date) => ({ toDate: () => date }));

    service = new AppointmentAnalyticsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAppointmentStats', () => {
    it('should return empty stats when no appointments exist', async () => {
      // Arrange
      mockQuery.get.mockResolvedValue({ docs: [] });

      // Act
      const result = await service.calculateAppointmentStats('org1');

      // Assert
      expect(result.totalAppointments).toBe(0);
      expect(result.attendanceRate).toBe(0);
      expect(result.cancellationRate).toBe(0);
      expect(result.noShowRate).toBe(0);
    });

    it('should calculate correct attendance rate', async () => {
      // Arrange
      const mockAppointments = [
        createMockAppointment('1', APPOINTMENT_STATUSES.COMPLETED),
        createMockAppointment('2', APPOINTMENT_STATUSES.COMPLETED),
        createMockAppointment('3', APPOINTMENT_STATUSES.CANCELLED),
        createMockAppointment('4', APPOINTMENT_STATUSES.NO_SHOW),
        createMockAppointment('5', APPOINTMENT_STATUSES.SCHEDULED)
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAppointments.map(apt => ({
          id: apt.id,
          exists: true,
          data: () => apt.getData()
        }))
      });

      (AppointmentModel.fromFirestore as jest.Mock).mockImplementation((doc) => {
        const appointment = mockAppointments.find(apt => apt.id === doc.id);
        return appointment || null;
      });

      // Act
      const result = await service.calculateAppointmentStats('org1');

      // Assert
      expect(result.totalAppointments).toBe(5);
      expect(result.totalCompleted).toBe(2);
      expect(result.totalCancelled).toBe(1);
      expect(result.totalNoShow).toBe(1);
      expect(result.totalScheduled).toBe(1);
      expect(result.attendanceRate).toBe(40); // 2/5 * 100
      expect(result.cancellationRate).toBe(20); // 1/5 * 100
      expect(result.noShowRate).toBe(20); // 1/5 * 100
    });

    it('should calculate peak hours correctly', async () => {
      // Arrange
      const mockAppointments = [
        createMockAppointment('1', APPOINTMENT_STATUSES.COMPLETED, '09:00'),
        createMockAppointment('2', APPOINTMENT_STATUSES.COMPLETED, '09:30'),
        createMockAppointment('3', APPOINTMENT_STATUSES.COMPLETED, '10:00'),
        createMockAppointment('4', APPOINTMENT_STATUSES.COMPLETED, '14:00')
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAppointments.map(apt => ({
          id: apt.id,
          exists: true,
          data: () => apt.getData()
        }))
      });

      (AppointmentModel.fromFirestore as jest.Mock).mockImplementation((doc) => {
        const appointment = mockAppointments.find(apt => apt.id === doc.id);
        return appointment || null;
      });

      // Act
      const result = await service.calculateAppointmentStats('org1');

      // Assert
      expect(result.peakHours).toHaveLength(3);
      expect(result.peakHours[0]).toEqual({ hour: 9, count: 2 });
      expect(result.peakHours[1]).toEqual({ hour: 10, count: 1 });
      expect(result.peakHours[2]).toEqual({ hour: 14, count: 1 });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const filters: AnalyticsFilters = {
        startDate,
        endDate,
        practitionerId: 'practitioner1',
        serviceId: 'service1'
      };

      mockQuery.get.mockResolvedValue({ docs: [] });

      // Act
      await service.calculateAppointmentStats('org1', filters);

      // Assert
      expect(mockCollection.where).toHaveBeenCalledWith('organizationId', '==', 'org1');
      expect(mockQuery.where).toHaveBeenCalledWith('date', '>=', expect.any(Object));
      expect(mockQuery.where).toHaveBeenCalledWith('date', '<=', expect.any(Object));
      expect(mockQuery.where).toHaveBeenCalledWith('practitionerId', '==', 'practitioner1');
      expect(mockQuery.where).toHaveBeenCalledWith('serviceId', '==', 'service1');
    });
  });

  describe('calculateAttendanceRate', () => {
    it('should return 0 when no appointments exist', async () => {
      // Arrange
      mockQuery.get.mockResolvedValue({ docs: [] });

      // Act
      const result = await service.calculateAttendanceRate(
        'org1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate correct attendance rate', async () => {
      // Arrange
      const mockAppointments = [
        createMockAppointment('1', APPOINTMENT_STATUSES.COMPLETED),
        createMockAppointment('2', APPOINTMENT_STATUSES.COMPLETED),
        createMockAppointment('3', APPOINTMENT_STATUSES.CANCELLED),
        createMockAppointment('4', APPOINTMENT_STATUSES.NO_SHOW)
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAppointments.map(apt => ({
          id: apt.id,
          exists: true,
          data: () => apt.getData()
        }))
      });

      (AppointmentModel.fromFirestore as jest.Mock).mockImplementation((doc) => {
        const appointment = mockAppointments.find(apt => apt.id === doc.id);
        return appointment || null;
      });

      // Act
      const result = await service.calculateAttendanceRate(
        'org1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Assert
      expect(result).toBe(50); // 2/4 * 100
    });
  });

  describe('calculateCancellationRate', () => {
    it('should return 0 when no appointments exist', async () => {
      // Arrange
      mockQuery.get.mockResolvedValue({ docs: [] });

      // Act
      const result = await service.calculateCancellationRate(
        'org1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate correct cancellation rate', async () => {
      // Arrange
      const mockAppointments = [
        createMockAppointment('1', APPOINTMENT_STATUSES.COMPLETED),
        createMockAppointment('2', APPOINTMENT_STATUSES.CANCELLED),
        createMockAppointment('3', APPOINTMENT_STATUSES.CANCELLED),
        createMockAppointment('4', APPOINTMENT_STATUSES.NO_SHOW)
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAppointments.map(apt => ({
          id: apt.id,
          exists: true,
          data: () => apt.getData()
        }))
      });

      (AppointmentModel.fromFirestore as jest.Mock).mockImplementation((doc) => {
        const appointment = mockAppointments.find(apt => apt.id === doc.id);
        return appointment || null;
      });

      // Act
      const result = await service.calculateCancellationRate(
        'org1',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Assert
      expect(result).toBe(50); // 2/4 * 100
    });
  });

  // Note: Excel and PDF report tests are skipped as they require external libraries
  // that are not installed in the test environment

  // Helper function to create mock appointments
  function createMockAppointment(
    id: string, 
    status: string, 
    startTime: string = '09:00',
    date: Date = new Date('2024-01-15')
  ): AppointmentModel {
    const mockData = {
      id,
      organizationId: 'org1',
      clientId: 'client1',
      practitionerId: 'practitioner1',
      serviceId: 'service1',
      date,
      startTime,
      duration: 30,
      status,
      reminders: [],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-10')
    };

    const mockAppointment = {
      id,
      getData: jest.fn().mockReturnValue(mockData),
      getAppointmentDateTime: jest.fn().mockReturnValue(new Date(`${date.toISOString().split('T')[0]}T${startTime}:00`))
    } as unknown as AppointmentModel;

    return mockAppointment;
  }
});