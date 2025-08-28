import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../backend/functions/src/middleware/auth';
import { AuthLogger } from '../../../backend/functions/src/utils/auth-logger';
import { TokenValidator } from '../../../backend/functions/src/utils/token-validator';
import { authService } from '../../../backend/functions/src/services/auth.service';
import { collections } from '../../../backend/functions/src/config';
import { ERROR_CODES } from '@attendance-x/shared';

// Mock Firebase Admin
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    settings: jest.fn(),
    collection: jest.fn()
  }))
}));

jest.mock('firebase-admin', () => ({
  messaging: jest.fn(() => ({
    send: jest.fn(),
    sendMulticast: jest.fn(),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn()
  })),
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn()
  }
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock dependencies
jest.mock('../../../backend/functions/src/utils/auth-logger');
jest.mock('../../../backend/functions/src/utils/token-validator');
jest.mock('../../../backend/functions/src/services/auth.service');
jest.mock('../../../backend/functions/src/config', () => ({
  collections: {
    users: {
      doc: jest.fn()
    }
  }
}));

describe('Enhanced Auth Middleware Validation', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockDoc: any;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer valid-token'
      },
      ip: '192.168.1.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      }),
      path: '/api/test'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    mockDoc = {
      get: jest.fn(),
      exists: true,
      data: jest.fn()
    };

    (collections.users.doc as jest.Mock).mockReturnValue(mockDoc);
    jest.clearAllMocks();
  });

  describe('requireAuth - Enhanced User ID Validation', () => {
    it('should log detailed error for null userId', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: null,
        email: 'test@example.com'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logUserValidationFailure).toHaveBeenCalledWith({
        userId: null,
        error: 'Invalid userId in decoded token',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: "Token invalide - userId manquant ou invalide"
      });
    });

    it('should log detailed error for empty userId after trim', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: '   ',
        email: 'test@example.com'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logUserValidationFailure).toHaveBeenCalledWith({
        userId: '   ',
        error: 'UserId is empty after trimming',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: "Token invalide - userId vide"
      });
    });

    it('should log Firestore errors with context', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'valid-user-id',
        email: 'test@example.com'
      });

      const firestoreError = new Error('Firestore connection failed') as any;
      firestoreError.code = 'unavailable';
      mockDoc.get.mockRejectedValue(firestoreError);

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logFirestoreError).toHaveBeenCalledWith(
        'getUserDoc',
        firestoreError,
        {
          userId: 'valid-user-id',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        }
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.DATABASE_ERROR,
        message: "Erreur lors de la récupération des données utilisateur"
      });
    });

    it('should log corrupted user data', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'valid-user-id',
        email: 'test@example.com'
      });

      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.data.mockReturnValue({
        email: null, // Corrupted data
        role: undefined,
        status: 'active'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logCorruptedUserData).toHaveBeenCalledWith(
        {
          email: null,
          role: undefined,
          status: 'active'
        },
        {
          userId: 'valid-user-id',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        }
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.DATABASE_ERROR,
        message: "Données utilisateur corrompues"
      });
    });

    it('should log account status errors', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'valid-user-id',
        email: 'test@example.com'
      });

      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.data.mockReturnValue({
        email: 'test@example.com',
        role: 'user',
        status: 'inactive',
        permissions: {}
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logAccountStatusError).toHaveBeenCalledWith(
        'inactive',
        {
          userId: 'valid-user-id',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        }
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.ACCOUNT_INACTIVE,
        message: "Compte inactif"
      });
    });

    it('should log successful authentication', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'valid-user-id',
        email: 'test@example.com',
        sessionId: 'session-123'
      });

      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.data.mockReturnValue({
        email: 'test@example.com',
        role: 'user',
        status: 'active',
        permissions: { read_events: true }
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logAuthenticationSuccess).toHaveBeenCalledWith({
        userId: 'valid-user-id',
        role: 'user',
        email: 'test@example.com',
        sessionId: 'session-123',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });

      expect(next).toHaveBeenCalled();
    });

    it('should handle Firebase token errors', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      const firebaseError = new Error('Token expired') as any;
      firebaseError.code = 'auth/id-token-expired';
      (authService.verifyToken as jest.Mock).mockRejectedValue(firebaseError);

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logFirebaseTokenError).toHaveBeenCalledWith(
        firebaseError,
        {
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        }
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.SESSION_EXPIRED,
        message: "Token expiré"
      });
    });
  });

  describe('Token Validation Logging', () => {
    it('should log token validation failures with detailed context', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid token structure',
        errorCode: ERROR_CODES.INVALID_TOKEN,
        details: {
          originalLength: 100,
          cleanedLength: 98,
          hasInvisibleChars: true,
          structure: 'invalid'
        }
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logTokenValidationFailure).toHaveBeenCalledWith({
        tokenPrefix: 'valid-token',
        error: 'Invalid token structure',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test',
        tokenDetails: {
          originalLength: 100,
          cleanedLength: 98,
          hasInvisibleChars: true,
          structure: 'invalid'
        }
      });

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should log Firebase token verification failures', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue(null);

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logFirebaseTokenError).toHaveBeenCalledWith(
        { code: 'auth/invalid-token', message: 'Token could not be decoded' },
        {
          tokenPrefix: 'clean-token',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
          endpoint: '/api/test'
        }
      );
    });
  });

  describe('User Validation Edge Cases', () => {
    it('should handle non-string userId types', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 12345, // Number instead of string
        email: 'test@example.com'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logUserValidationFailure).toHaveBeenCalledWith({
        userId: 12345,
        error: 'Invalid userId in decoded token',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });
    });

    it('should handle undefined userId', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: undefined,
        email: 'test@example.com'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logUserValidationFailure).toHaveBeenCalledWith({
        userId: undefined,
        error: 'Invalid userId in decoded token',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });
    });

    it('should handle userId with only whitespace', async () => {
      (TokenValidator.validateAndCleanToken as jest.Mock).mockReturnValue({
        isValid: true,
        cleanedToken: 'clean-token'
      });

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: '\t\n  \r',
        email: 'test@example.com'
      });

      await requireAuth(req as Request, res as Response, next);

      expect(AuthLogger.logUserValidationFailure).toHaveBeenCalledWith({
        userId: '\t\n  \r',
        error: 'UserId is empty after trimming',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        endpoint: '/api/test'
      });
    });
  });
});