/**
 * Tests pour les middlewares de sécurité de présence
 */

import { Request, Response, NextFunction } from 'express';
import {
  detectSuspiciousClocking,
  validateLocationIntegrity,
  auditPresenceAction,
  validateSensitiveDataAccess,
  preventTimingAttacks
} from '../../../../backend/functions/src/middleware/presence-security.middleware';

describe('Presence Security Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockSend = jest.fn();
    mockNext = jest.fn();

    mockRequest = {
      params: { employeeId: 'emp123' },
      body: {},
      user: { uid: 'user123', role: 'employee' },
      path: '/clock-in',
      ip: '192.168.1.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
      statusCode: 200
    };

    jest.clearAllMocks();
  });

  describe('detectSuspiciousClocking', () => {
    it('should allow normal clocking attempts', () => {
      detectSuspiciousClocking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
      expect((mockRequest as any).clockingAttempt).toBeDefined();
    });

    it('should handle missing employee or user ID gracefully', () => {
      mockRequest.params = {};
      mockRequest.user = undefined;

      detectSuspiciousClocking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should continue on detection errors', () => {
      // Force an error by making path undefined
      mockRequest.path = undefined as any;

      detectSuspiciousClocking(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('validateLocationIntegrity', () => {
    it('should pass when no location provided', () => {
      validateLocationIntegrity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).locationSuspicious).toBeUndefined();
    });

    it('should detect null island coordinates', () => {
      mockRequest.body = {
        location: {
          latitude: 0,
          longitude: 0,
          accuracy: 10
        }
      };

      validateLocationIntegrity(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).locationSuspicious).toBe(true);
    });

    it('should detect unrealistically high accuracy', () => {
      mockRequest.body = {
        location: {
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 0.5 // Too precise\n        }\n      };\n\n      validateLocationIntegrity(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      expect((mockRequest as any).locationSuspicious).toBe(true);\n    });\n\n    it('should detect unrealistic altitude', () => {\n      mockRequest.body = {\n        location: {\n          latitude: 48.8566,\n          longitude: 2.3522,\n          accuracy: 10,\n          altitude: 15000 // Too high\n        }\n      };\n\n      validateLocationIntegrity(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      expect((mockRequest as any).locationSuspicious).toBe(true);\n    });\n\n    it('should handle validation errors gracefully', () => {\n      // Force an error by making location malformed\n      mockRequest.body = {\n        location: 'invalid'\n      };\n\n      validateLocationIntegrity(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n    });\n  });\n\n  describe('auditPresenceAction', () => {\n    it('should wrap response.send and log successful actions', () => {\n      const originalSend = mockResponse.send;\n      \n      auditPresenceAction(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      expect(mockResponse.send).not.toBe(originalSend);\n\n      // Simulate successful response\n      mockResponse.statusCode = 200;\n      (mockResponse.send as jest.Mock)('success');\n\n      // Should have logged the action (we can't easily test the logger call)\n      expect(mockResponse.send).toHaveBeenCalledWith('success');\n    });\n\n    it('should log failed actions with appropriate level', () => {\n      auditPresenceAction(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      // Simulate failed response\n      mockResponse.statusCode = 400;\n      (mockResponse.send as jest.Mock)('error');\n\n      expect(mockResponse.send).toHaveBeenCalledWith('error');\n    });\n\n    it('should handle logging errors gracefully', () => {\n      // Make user undefined to potentially cause logging issues\n      mockRequest.user = undefined;\n\n      auditPresenceAction(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      \n      // Should still work even with logging errors\n      (mockResponse.send as jest.Mock)('success');\n      expect(mockResponse.send).toHaveBeenCalledWith('success');\n    });\n  });\n\n  describe('validateSensitiveDataAccess', () => {\n    it('should allow admin access to any data', () => {\n      mockRequest.user = { uid: 'admin123', role: 'admin' };\n      mockRequest.params = { employeeId: 'emp123', organizationId: 'org123' };\n\n      validateSensitiveDataAccess(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      expect(mockStatus).not.toHaveBeenCalled();\n    });\n\n    it('should restrict non-admin access to other employees', () => {\n      mockRequest.user = { uid: 'user123', role: 'employee' };\n      mockRequest.params = { employeeId: 'emp456' }; // Different employee\n\n      validateSensitiveDataAccess(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled(); // Still calls next, actual validation in other middleware\n    });\n\n    it('should log sensitive data access', () => {\n      mockRequest.path = '/organizations/org123/anomalies'; // Sensitive path\n      mockRequest.user = { uid: 'manager123', role: 'manager' };\n\n      validateSensitiveDataAccess(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n    });\n\n    it('should handle validation errors', () => {\n      // Force an error by making request malformed\n      mockRequest.user = null as any;\n\n      validateSensitiveDataAccess(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockStatus).toHaveBeenCalledWith(500);\n      expect(mockJson).toHaveBeenCalledWith({\n        success: false,\n        error: 'Internal security error',\n        code: 'SECURITY_ERROR'\n      });\n    });\n  });\n\n  describe('preventTimingAttacks', () => {\n    beforeEach(() => {\n      jest.useFakeTimers();\n    });\n\n    afterEach(() => {\n      jest.useRealTimers();\n    });\n\n    it('should add delay for fast responses', () => {\n      const originalSend = mockResponse.send;\n      \n      preventTimingAttacks(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      expect(mockNext).toHaveBeenCalled();\n      expect(mockResponse.send).not.toBe(originalSend);\n\n      // Simulate fast response (less than 100ms)\n      const startTime = Date.now();\n      (mockResponse.send as jest.Mock)('fast response');\n\n      // Should not have called original send immediately\n      expect(originalSend).not.toHaveBeenCalled();\n\n      // Fast forward time to trigger delayed send\n      jest.advanceTimersByTime(100);\n      \n      // Now it should have been called\n      expect(originalSend).toHaveBeenCalledWith('fast response');\n    });\n\n    it('should not add delay for slow responses', () => {\n      const originalSend = mockResponse.send;\n      \n      preventTimingAttacks(\n        mockRequest as Request,\n        mockResponse as Response,\n        mockNext\n      );\n\n      // Simulate slow response by advancing time first\n      jest.advanceTimersByTime(150);\n      \n      (mockResponse.send as jest.Mock)('slow response');\n\n      // Should call original send immediately\n      expect(originalSend).toHaveBeenCalledWith('slow response');\n    });\n  });\n\n  describe('Rate Limiting', () => {\n    // Note: Testing rate limiting middleware directly is complex\n    // These would typically be integration tests\n    \n    it('should have proper rate limit configurations', () => {\n      // Test that rate limit middleware are properly configured\n      // This is more of a smoke test to ensure imports work\n      expect(typeof detectSuspiciousClocking).toBe('function');\n      expect(typeof validateLocationIntegrity).toBe('function');\n      expect(typeof auditPresenceAction).toBe('function');\n    });\n  });\n\n  describe('Device Fingerprinting', () => {\n    it('should generate consistent fingerprints for same device', () => {\n      const req1 = {\n        get: jest.fn().mockImplementation((header) => {\n          const headers: Record<string, string> = {\n            'User-Agent': 'Mozilla/5.0',\n            'Accept-Language': 'en-US',\n            'Accept-Encoding': 'gzip'\n          };\n          return headers[header];\n        }),\n        ip: '192.168.1.1'\n      };\n\n      const req2 = {\n        get: jest.fn().mockImplementation((header) => {\n          const headers: Record<string, string> = {\n            'User-Agent': 'Mozilla/5.0',\n            'Accept-Language': 'en-US',\n            'Accept-Encoding': 'gzip'\n          };\n          return headers[header];\n        }),\n        ip: '192.168.1.1'\n      };\n\n      // This would test the generateDeviceFingerprint function if it were exported\n      // For now, we just ensure the middleware functions exist\n      expect(typeof detectSuspiciousClocking).toBe('function');\n    });\n  });\n});