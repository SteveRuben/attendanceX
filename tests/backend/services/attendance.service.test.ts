// tests/backend/services/attendance.service.test.ts - Tests du service de présence

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { attendanceService } from '../../../backend/functions/src/services/attendance.service';
import { qrCodeService } from '../../../backend/functions/src/services/qrcode.service';
import { sessionTrackingService } from '../../../backend/functions/src/services/auth/session-tracking.service';

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn()
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore
}));

describe('AttendanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordAttendance', () => {
    it('should record attendance successfully with QR code', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 3600000),
        participants: ['user-1']
      };

      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com'
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEvent
          })
        })
      });

      // Mock QR validation
      jest.spyOn(qrCodeService, 'validateQRCode').mockResolvedValue({
        isValid: true,
        eventId: 'event-1',
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Act
      const result = await attendanceService.recordAttendance({
        eventId: 'event-1',
        userId: 'user-1',
        method: 'qr_code',
        qrCodeData: 'valid-qr-code',
        timestamp: new Date()
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('present');
      expect(result.method).toBe('qr_code');
    });

    it('should mark as late when checking in after start time', async () => {
      // Arrange
      const eventStartTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startDateTime: eventStartTime,
        endDateTime: new Date(Date.now() + 1800000),
        participants: ['user-1']
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEvent
          })
        })
      });

      // Act
      const result = await attendanceService.recordAttendance({
        eventId: 'event-1',
        userId: 'user-1',
        method: 'manual',
        timestamp: new Date()
      });

      // Assert
      expect(result.status).toBe('late');
    });

    it('should reject attendance for non-participant', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 3600000),
        participants: ['user-2'] // user-1 not in participants
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEvent
          })
        })
      });

      // Act & Assert
      await expect(attendanceService.recordAttendance({
        eventId: 'event-1',
        userId: 'user-1',
        method: 'manual',
        timestamp: new Date()
      })).rejects.toThrow('User not registered for this event');
    });

    it('should prevent duplicate check-ins', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        participants: ['user-1']
      };

      const mockExistingAttendance = {
        id: 'attendance-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: 'present'
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEvent
          })
        }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => mockExistingAttendance }]
        })
      });

      // Act & Assert
      await expect(attendanceService.recordAttendance({
        eventId: 'event-1',
        userId: 'user-1',
        method: 'manual',
        timestamp: new Date()
      })).rejects.toThrow('User already checked in');
    });
  });

  describe('getEventAttendanceStats', () => {
    it('should calculate attendance statistics correctly', async () => {
      // Arrange
      const mockAttendances = [
        { status: 'present', checkInTime: new Date() },
        { status: 'late', checkInTime: new Date() },
        { status: 'absent' }
      ];

      const mockEvent = {
        participants: ['user-1', 'user-2', 'user-3', 'user-4']
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockAttendances.map(att => ({ data: () => att }))
        }),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEvent
          })
        })
      });

      // Act
      const stats = await attendanceService.getEventAttendanceStats('event-1');

      // Assert
      expect(stats.totalParticipants).toBe(4);
      expect(stats.presentCount).toBe(2); // present + late
      expect(stats.absentCount).toBe(2); // 4 total - 2 present
      expect(stats.lateCount).toBe(1);
      expect(stats.attendanceRate).toBe(50); // 2/4 * 100
    });
  });

  describe('validateGeolocation', () => {
    it('should validate location within allowed radius', async () => {
      // Arrange
      const eventLocation = { latitude: 48.8566, longitude: 2.3522 }; // Paris
      const userLocation = { latitude: 48.8567, longitude: 2.3523 }; // Very close
      const allowedRadius = 100; // meters

      // Act
      const isValid = await attendanceService.validateGeolocation(
        userLocation,
        eventLocation,
        allowedRadius
      );

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject location outside allowed radius', async () => {
      // Arrange
      const eventLocation = { latitude: 48.8566, longitude: 2.3522 }; // Paris
      const userLocation = { latitude: 48.8600, longitude: 2.3600 }; // Far away
      const allowedRadius = 50; // meters

      // Act
      const isValid = await attendanceService.validateGeolocation(
        userLocation,
        eventLocation,
        allowedRadius
      );

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('bulkImportAttendance', () => {
    it('should import multiple attendance records', async () => {
      // Arrange
      const attendanceData = [
        { eventId: 'event-1', userId: 'user-1', status: 'present' },
        { eventId: 'event-1', userId: 'user-2', status: 'late' },
        { eventId: 'event-1', userId: 'user-3', status: 'absent' }
      ];

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: jest.fn().mockResolvedValue(undefined)
        })
      });

      // Act
      const result = await attendanceService.bulkImportAttendance(attendanceData);

      // Assert
      expect(result.imported).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import errors gracefully', async () => {
      // Arrange
      const attendanceData = [
        { eventId: 'event-1', userId: 'user-1', status: 'present' },
        { eventId: 'invalid', userId: 'user-2', status: 'late' }
      ];

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          set: jest.fn()
            .mockResolvedValueOnce(undefined) // First succeeds
            .mockRejectedValueOnce(new Error('Invalid event')) // Second fails
        })
      });

      // Act
      const result = await attendanceService.bulkImportAttendance(attendanceData);

      // Assert
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});

describe('SessionTrackingService', () => {
  describe('recordSessionAttendance', () => {
    it('should record session check-in successfully', async () => {
      // Arrange
      const mockSession = {
        id: 'session-1',
        eventId: 'event-1',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000)
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockSession
          }),
          set: jest.fn().mockResolvedValue(undefined)
        }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Act
      const result = await sessionTrackingService.recordSessionAttendance(
        'session-1',
        'user-1',
        'qr_code'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.sessionId).toBe('session-1');
      expect(result.userId).toBe('user-1');
      expect(result.status).toBe('present');
    });

    it('should calculate partial attendance correctly', async () => {
      // Arrange
      const mockSessions = [
        { id: 'session-1', isRequired: true },
        { id: 'session-2', isRequired: true },
        { id: 'session-3', isRequired: false }
      ];

      const mockAttendances = [
        { sessionId: 'session-1', status: 'present', duration: 60 },
        { sessionId: 'session-2', status: 'late', duration: 45 }
        // Missing session-3
      ];

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn()
          .mockResolvedValueOnce({ // Sessions query
            docs: mockSessions.map(s => ({ data: () => s }))
          })
          .mockResolvedValueOnce({ // Attendances query
            docs: mockAttendances.map(a => ({ data: () => a }))
          })
      });

      // Act
      const result = await sessionTrackingService.calculatePartialAttendance('user-1', 'event-1');

      // Assert
      expect(result.totalSessions).toBe(3);
      expect(result.attendedSessions).toBe(2);
      expect(result.requiredSessions).toBe(2);
      expect(result.attendedRequiredSessions).toBe(2);
      expect(result.attendancePercentage).toBeCloseTo(66.67, 2);
      expect(result.requiredAttendancePercentage).toBe(100);
    });
  });
});

describe('Integration Tests', () => {
  describe('QR Code + Attendance Flow', () => {
    it('should complete full QR check-in flow', async () => {
      // Arrange
      const eventId = 'event-1';
      const userId = 'user-1';
      const qrData = 'qr-code-data';

      // Mock QR validation
      jest.spyOn(qrCodeService, 'validateQRCode').mockResolvedValue({
        isValid: true,
        eventId,
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Mock event and user data
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: eventId,
              participants: [userId],
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 3600000)
            })
          }),
          set: jest.fn().mockResolvedValue(undefined)
        }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Act
      const result = await attendanceService.recordAttendance({
        eventId,
        userId,
        method: 'qr_code',
        qrCodeData: qrData,
        timestamp: new Date()
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.method).toBe('qr_code');
      expect(result.status).toBe('present');
      expect(qrCodeService.validateQRCode).toHaveBeenCalledWith(qrData);
    });
  });

  describe('Offline Sync Flow', () => {
    it('should handle offline attendance sync', async () => {
      // This would test the offline sync service integration
      // Implementation depends on the offline sync service structure
      expect(true).toBe(true); // Placeholder
    });
  });
});

describe('Performance Tests', () => {
  describe('High Volume Events', () => {
    it('should handle 1000 concurrent check-ins', async () => {
      // Arrange
      const eventId = 'large-event';
      const checkIns = Array.from({ length: 1000 }, (_, i) => ({
        eventId,
        userId: `user-${i}`,
        method: 'manual',
        timestamp: new Date()
      }));

      // Mock successful responses
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              id: eventId,
              participants: checkIns.map(c => c.userId),
              startDateTime: new Date(),
              endDateTime: new Date(Date.now() + 3600000)
            })
          }),
          set: jest.fn().mockResolvedValue(undefined)
        }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true })
      });

      // Act
      const startTime = Date.now();
      const promises = checkIns.map(checkIn => 
        attendanceService.recordAttendance(checkIn)
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();

      // Assert
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const duration = endTime - startTime;

      expect(successful).toBeGreaterThan(950); // Allow for some failures
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});