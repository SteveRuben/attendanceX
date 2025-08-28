// tests/backend/unit/utils/auth-error-handler.test.ts
import { AuthErrorHandler } from "../../../../backend/functions/src/utils/auth-error-handler";
import { ERROR_CODES } from "@attendance-x/shared";
import { Request, Response } from "express";

describe('AuthErrorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      ip: '127.0.0.1',
      path: '/api/auth/login',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const response = AuthErrorHandler.createErrorResponse(
        ERROR_CODES.INVALID_TOKEN,
        'Custom message'
      );

      expect(response).toMatchObject({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Custom message',
        details: {
          timestamp: expect.any(Date),
          requestId: expect.any(String)
        }
      });
    });

    it('should use default message when custom message not provided', () => {
      const response = AuthErrorHandler.createErrorResponse(ERROR_CODES.UNAUTHORIZED);

      expect(response.message).toBe('Non autorisé');
    });

    it('should include context details when provided', () => {
      const context = {
        userId: 'test-user-123',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test',
        additionalContext: { attemptCount: 3 }
      };

      const response = AuthErrorHandler.createErrorResponse(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        undefined,
        context
      );

      expect(response.details).toMatchObject({
        userId: 'test-user-123',
        context: { attemptCount: 3 },
        request: {
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        },
        timestamp: expect.any(Date),
        requestId: expect.any(String)
      });
    });
  });

  describe('getHttpStatusCode', () => {
    it('should return correct status codes for different error types', () => {
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.BAD_REQUEST)).toBe(400);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.UNAUTHORIZED)).toBe(401);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.FORBIDDEN)).toBe(403);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.NOT_FOUND)).toBe(404);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.CONFLICT)).toBe(409);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(429);
      expect(AuthErrorHandler.getHttpStatusCode(ERROR_CODES.INTERNAL_SERVER_ERROR)).toBe(500);
    });

    it('should return 500 for unknown error codes', () => {
      expect(AuthErrorHandler.getHttpStatusCode('UNKNOWN_ERROR' as any)).toBe(500);
    });
  });

  describe('handleFirebaseError', () => {
    it('should map Firebase errors to standardized codes', () => {
      const firebaseError = { code: 'auth/id-token-expired' };
      const result = AuthErrorHandler.handleFirebaseError(firebaseError);

      expect(result.errorCode).toBe(ERROR_CODES.SESSION_EXPIRED);
      expect(result.message).toBe('Session expirée');
    });

    it('should default to INVALID_TOKEN for unknown Firebase errors', () => {
      const firebaseError = { code: 'auth/unknown-error' };
      const result = AuthErrorHandler.handleFirebaseError(firebaseError);

      expect(result.errorCode).toBe(ERROR_CODES.INVALID_TOKEN);
    });
  });

  describe('handleFirestoreError', () => {
    it('should map Firestore errors to standardized codes', () => {
      const firestoreError = { code: 'permission-denied' };
      const result = AuthErrorHandler.handleFirestoreError(firestoreError);

      expect(result.errorCode).toBe(ERROR_CODES.FORBIDDEN);
      expect(result.message).toBe('Accès interdit');
    });

    it('should default to DATABASE_ERROR for unknown Firestore errors', () => {
      const firestoreError = { code: 'unknown-error' };
      const result = AuthErrorHandler.handleFirestoreError(firestoreError);

      expect(result.errorCode).toBe(ERROR_CODES.DATABASE_ERROR);
    });
  });

  describe('validateAccountStatus', () => {
    it('should return valid for active accounts', () => {
      const result = AuthErrorHandler.validateAccountStatus('active');

      expect(result.isValid).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('should return appropriate error for inactive accounts', () => {
      const result = AuthErrorHandler.validateAccountStatus('suspended');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ERROR_CODES.ACCOUNT_SUSPENDED);
      expect(result.message).toBe('Compte suspendu');
    });

    it('should handle unknown status as inactive', () => {
      const result = AuthErrorHandler.validateAccountStatus('unknown');

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ERROR_CODES.ACCOUNT_INACTIVE);
    });
  });

  describe('sendErrorResponse', () => {
    it('should send response with correct status code and format', () => {
      AuthErrorHandler.sendErrorResponse(
        mockResponse as Response,
        ERROR_CODES.UNAUTHORIZED,
        'Custom unauthorized message'
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Custom unauthorized message',
          details: expect.objectContaining({
            timestamp: expect.any(Date),
            requestId: expect.any(String)
          })
        })
      );
    });
  });

  describe('validateErrorResponseFormat', () => {
    it('should validate correct error response format', () => {
      const validResponse = {
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token invalide',
        details: {
          timestamp: new Date(),
          requestId: 'auth_123_abc'
        }
      };

      expect(AuthErrorHandler.validateErrorResponseFormat(validResponse)).toBe(true);
    });

    it('should reject invalid error response format', () => {
      const invalidResponse = {
        success: true, // Should be false
        error: 'INVALID_TOKEN',
        message: 'Token invalide'
      };

      expect(AuthErrorHandler.validateErrorResponseFormat(invalidResponse)).toBe(false);
    });
  });

  describe('validateErrorCode', () => {
    it('should return valid error code when provided', () => {
      const result = AuthErrorHandler.validateErrorCode(ERROR_CODES.INVALID_TOKEN);
      expect(result).toBe(ERROR_CODES.INVALID_TOKEN);
    });

    it('should return fallback for invalid error code', () => {
      const result = AuthErrorHandler.validateErrorCode('INVALID_CODE');
      expect(result).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
    });

    it('should return fallback for non-string error code', () => {
      const result = AuthErrorHandler.validateErrorCode(123);
      expect(result).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
    });
  });

  describe('createMiddlewareErrorHandler', () => {
    it('should create error handler with request context', () => {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(mockRequest as Request);

      errorHandler.sendError(
        mockResponse as Response,
        ERROR_CODES.FORBIDDEN,
        'Access denied'
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Access denied',
          details: expect.objectContaining({
            request: expect.objectContaining({
              ip: '127.0.0.1',
              userAgent: 'test-user-agent',
              endpoint: '/api/auth/login'
            })
          })
        })
      );
    });

    it('should include user context when available', () => {
      const mockAuthRequest = {
        ...mockRequest,
        user: { uid: 'test-user-123', sessionId: 'session-456' }
      };

      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(mockAuthRequest as Request);

      errorHandler.sendError(
        mockResponse as Response,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'Not enough permissions'
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            userId: 'test-user-123'
          })
        })
      );
    });

    it('should handle missing request properties gracefully', () => {
      const mockMinimalRequest = {
        path: '/api/test',
        get: jest.fn().mockReturnValue(undefined)
      } as unknown as Request;

      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(mockMinimalRequest);

      errorHandler.sendError(
        mockResponse as Response,
        ERROR_CODES.BAD_REQUEST,
        'Bad request'
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            request: expect.objectContaining({
              ip: 'unknown',
              userAgent: 'unknown',
              endpoint: '/api/test'
            })
          })
        })
      );
    });

    it('should validate error codes before sending response', () => {
      const errorHandler = AuthErrorHandler.createMiddlewareErrorHandler(mockRequest as Request);

      // Test with invalid error code
      errorHandler.sendError(
        mockResponse as Response,
        'INVALID_CODE' as any,
        'Test message'
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: ERROR_CODES.INTERNAL_SERVER_ERROR
        })
      );
    });
  });
});