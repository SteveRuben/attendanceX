import { logger } from 'firebase-functions';
import { AuthLogger, AuthLogContext } from '../../../backend/functions/src/utils/auth-logger';

// Mock firebase-functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AuthLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logTokenValidationFailure', () => {
    it('should log token validation failure with sanitized token', () => {
      const context: AuthLogContext = {
        tokenPrefix: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9',
        error: 'Invalid token structure',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/auth',
        tokenDetails: {
          originalLength: 150,
          cleanedLength: 148,
          hasInvisibleChars: true,
          structure: 'invalid'
        }
      };

      AuthLogger.logTokenValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('Token validation failed', expect.objectContaining({
        timestamp: expect.any(String),
        request: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          endpoint: '/api/auth'
        },
        error: 'Invalid token structure',
        token: {
          prefix: 'eyJhbGciOiJSUzI1NiIs...',
          details: {
            originalLength: 150,
            cleanedLength: 148,
            hasInvisibleChars: true,
            structure: 'invalid'
          }
        },
        userId: undefined
      }));
    });

    it('should handle missing token prefix', () => {
      const context: AuthLogContext = {
        error: 'No token provided',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/auth'
      };

      AuthLogger.logTokenValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('Token validation failed', expect.objectContaining({
        error: 'No token provided',
        token: undefined,
        userId: undefined
      }));
    });

    it('should handle empty token', () => {
      const context: AuthLogContext = {
        tokenPrefix: '',
        error: 'Empty token',
        ip: '192.168.1.1'
      };

      AuthLogger.logTokenValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('Token validation failed', expect.objectContaining({
        token: {
          prefix: '[empty]',
          details: undefined
        },
        userId: undefined
      }));
    });
  });

  describe('logUserValidationFailure', () => {
    it('should log user validation failure with userId analysis', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        error: 'User not found',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/auth',
        firestoreOperation: 'getUserDoc',
        firestoreSuccess: false,
        firestoreError: 'Document not found'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: {
          type: 'string',
          length: 7,
          value: 'user123',
          isNull: false,
          isUndefined: false,
          isEmpty: false,
          hasWhitespace: false
        },
        error: 'User not found',
        firestore: {
          operation: 'getUserDoc',
          success: false,
          error: 'Document not found'
        }
      }));
    });

    it('should handle null userId', () => {
      const context: AuthLogContext = {
        userId: null,
        error: 'Null userId'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: {
          type: 'object',
          length: 0,
          value: '[null]',
          isNull: true,
          isUndefined: false,
          isEmpty: false,
          hasWhitespace: false
        }
      }));
    });

    it('should handle undefined userId', () => {
      const context: AuthLogContext = {
        userId: undefined,
        error: 'Undefined userId'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: undefined,
        error: 'Undefined userId'
      }));
    });

    it('should handle empty string userId', () => {
      const context: AuthLogContext = {
        userId: '',
        error: 'Empty userId'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: {
          type: 'string',
          length: 0,
          value: '[empty string]',
          isNull: false,
          isUndefined: false,
          isEmpty: true,
          hasWhitespace: false
        }
      }));
    });

    it('should handle userId with whitespace', () => {
      const context: AuthLogContext = {
        userId: '  user123  ',
        error: 'UserId with whitespace'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: {
          type: 'string',
          length: 11,
          value: '  user123  ',
          isNull: false,
          isUndefined: false,
          isEmpty: false,
          hasWhitespace: true
        }
      }));
    });

    it('should truncate very long userId', () => {
      const longUserId = 'a'.repeat(100);
      const context: AuthLogContext = {
        userId: longUserId,
        error: 'Long userId'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: expect.objectContaining({
          value: 'a'.repeat(50) + '...'
        })
      }));
    });

    it('should handle non-string userId', () => {
      const context: AuthLogContext = {
        userId: 12345,
        error: 'Non-string userId'
      };

      AuthLogger.logUserValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('User validation failed', expect.objectContaining({
        userId: {
          type: 'number',
          length: 0,
          value: '[number]',
          isNull: false,
          isUndefined: false,
          isEmpty: false,
          hasWhitespace: false
        }
      }));
    });
  });

  describe('logAuthenticationSuccess', () => {
    it('should log successful authentication with sanitized data', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        role: 'admin',
        email: 'user@example.com',
        sessionId: 'session456',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/protected'
      };

      AuthLogger.logAuthenticationSuccess(context);

      expect(logger.info).toHaveBeenCalledWith('User authenticated successfully', expect.objectContaining({
        user: {
          uid: 'user123',
          role: 'admin',
          email: 'use***',
          sessionId: 'session456'
        }
      }));
    });

    it('should handle missing email', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        role: 'user'
      };

      AuthLogger.logAuthenticationSuccess(context);

      expect(logger.info).toHaveBeenCalledWith('User authenticated successfully', expect.objectContaining({
        user: {
          uid: 'user123',
          role: 'user',
          email: undefined,
          sessionId: undefined
        }
      }));
    });
  });

  describe('logLogoutAttempt', () => {
    it('should log logout attempt with firestore context', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        sessionId: 'session456',
        ip: '192.168.1.1',
        firestoreOperation: 'invalidateSession',
        firestoreSuccess: true
      };

      AuthLogger.logLogoutAttempt(context);

      expect(logger.info).toHaveBeenCalledWith('Logout attempt', expect.objectContaining({
        user: {
          uid: 'user123',
          sessionId: 'session456'
        },
        firestore: {
          operation: 'invalidateSession',
          success: true,
          error: undefined
        }
      }));
    });
  });

  describe('logFirestoreError', () => {
    it('should log firestore error with operation context', () => {
      const error = {
        message: 'Permission denied',
        code: 'permission-denied',
        details: 'Insufficient permissions'
      };
      const context: AuthLogContext = {
        userId: 'user123',
        ip: '192.168.1.1'
      };

      AuthLogger.logFirestoreError('getUserDoc', error, context);

      expect(logger.error).toHaveBeenCalledWith('Firestore operation failed', expect.objectContaining({
        firestore: {
          operation: 'getUserDoc',
          error: 'Permission denied',
          code: 'permission-denied',
          details: 'Insufficient permissions'
        },
        user: {
          uid: 'user123'
        }
      }));
    });
  });

  describe('logFirebaseTokenError', () => {
    it('should log firebase token error with error analysis', () => {
      const error = {
        code: 'auth/id-token-expired',
        message: 'Firebase ID token has expired'
      };
      const context: AuthLogContext = {
        tokenPrefix: 'eyJhbGciOiJSUzI1NiIs',
        ip: '192.168.1.1'
      };

      AuthLogger.logFirebaseTokenError(error, context);

      expect(logger.warn).toHaveBeenCalledWith('Firebase token verification failed', expect.objectContaining({
        firebase: {
          errorCode: 'auth/id-token-expired',
          errorMessage: 'Firebase ID token has expired',
          isExpired: true,
          isInvalid: false
        },
        token: {
          prefix: 'eyJhbGciOiJSUzI1NiIs...'
        }
      }));
    });
  });

  describe('logAccountStatusError', () => {
    it('should log account status error', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        ip: '192.168.1.1'
      };

      AuthLogger.logAccountStatusError('inactive', context);

      expect(logger.warn).toHaveBeenCalledWith('Account status check failed', expect.objectContaining({
        account: {
          status: 'inactive',
          userId: 'user123'
        }
      }));
    });
  });

  describe('logCorruptedUserData', () => {
    it('should log corrupted user data analysis', () => {
      const userData = {
        email: 'user@example.com',
        role: null,
        permissions: undefined,
        status: 'active'
      };
      const context: AuthLogContext = {
        userId: 'user123'
      };

      AuthLogger.logCorruptedUserData(userData, context);

      expect(logger.error).toHaveBeenCalledWith('Corrupted user data detected', expect.objectContaining({
        userData: {
          hasEmail: true,
          hasRole: false,
          hasPermissions: false,
          hasStatus: true,
          keys: ['email', 'role', 'permissions', 'status']
        },
        user: {
          uid: 'user123'
        }
      }));
    });

    it('should handle null userData', () => {
      const context: AuthLogContext = {
        userId: 'user123'
      };

      AuthLogger.logCorruptedUserData(null, context);

      expect(logger.error).toHaveBeenCalledWith('Corrupted user data detected', expect.objectContaining({
        userData: {
          hasEmail: false,
          hasRole: false,
          hasPermissions: false,
          hasStatus: false,
          keys: []
        }
      }));
    });
  });

  describe('logInsufficientPermissions', () => {
    it('should log insufficient permissions with permission analysis', () => {
      const userPermissions = {
        'read_events': true,
        'create_events': false
      };
      const context: AuthLogContext = {
        userId: 'user123',
        role: 'user',
        ip: '192.168.1.1'
      };

      AuthLogger.logInsufficientPermissions('delete_events', userPermissions, context);

      expect(logger.warn).toHaveBeenCalledWith('Insufficient permissions', expect.objectContaining({
        permission: {
          required: 'delete_events',
          userHasPermission: false,
          userPermissionCount: 2
        },
        user: {
          uid: 'user123',
          role: 'user'
        }
      }));
    });
  });

  describe('logAuthenticationError', () => {
    it('should log generic authentication error', () => {
      const error = new Error('Authentication failed');
      error.stack = 'Error: Authentication failed\n    at test';
      const context: AuthLogContext = {
        userId: 'user123',
        ip: '192.168.1.1'
      };

      AuthLogger.logAuthenticationError(error, context);

      expect(logger.error).toHaveBeenCalledWith('Authentication error', expect.objectContaining({
        error: {
          message: 'Authentication failed',
          code: undefined,
          stack: 'Error: Authentication failed\n    at test'
        },
        user: {
          uid: 'user123'
        }
      }));
    });
  });

  describe('Security and Privacy', () => {
    it('should not expose full tokens in logs', () => {
      const longToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.EkN-DOsnsuRjRO6BxXemmJDm3HbxrbRzXglbN2S4sOkopdU4IsDxTI8jO19W_A4K8ZPJijNLis4EZsHeY559a4DFOd50_OqgHs_3VMUfUZjUBgjLvlpWBdX3lFVLvtF6ScfJuLiVaab_HEIgD0rTwblDHYGEaFQnTEQkGewl1yWWLdJ6van_lD-ikE4NNwSHbLx81IvoDeNBhiSBFR6Xtzee4-VnoEwVxRsPFuNiYQoQJSRXMLHqkbHmNjHDKnpBMRdnfuFMhkHcMjcjzoGx-FGAHw7clOHork4B_mAgv8MFxuE-SfFELLkMYnf75ISEhfXSciVOpvQjknaVrWw';
      const context: AuthLogContext = {
        tokenPrefix: longToken,
        error: 'Token too long'
      };

      AuthLogger.logTokenValidationFailure(context);

      const logCall = (logger.warn as jest.MockedFunction<typeof logger.warn>).mock.calls[0][1];
      expect(logCall.token.prefix).toBe('eyJhbGciOiJSUzI1NiIs...');
      expect(logCall.token.prefix.length).toBeLessThanOrEqual(23); // 20 chars + "..."
    });

    it('should not expose full email addresses', () => {
      const context: AuthLogContext = {
        userId: 'user123',
        email: 'sensitive.email@company.com'
      };

      AuthLogger.logAuthenticationSuccess(context);

      const logCall = (logger.info as jest.MockedFunction<typeof logger.info>).mock.calls[0][1];
      expect(logCall.user.email).toBe('sen***');
      expect(logCall.user.email).not.toContain('@company.com');
    });

    it('should truncate very long userIds', () => {
      const veryLongUserId = 'a'.repeat(100);
      const context: AuthLogContext = {
        userId: veryLongUserId,
        error: 'Long userId test'
      };

      AuthLogger.logUserValidationFailure(context);

      const logCall = (logger.warn as jest.MockedFunction<typeof logger.warn>).mock.calls[0][1];
      expect(logCall.userId.value).toBe('a'.repeat(50) + '...');
      expect(logCall.userId.value.length).toBeLessThanOrEqual(53); // 50 chars + "..."
    });
  });

  describe('Context Handling', () => {
    it('should handle missing context gracefully', () => {
      const context: AuthLogContext = {};

      AuthLogger.logTokenValidationFailure(context);

      expect(logger.warn).toHaveBeenCalledWith('Token validation failed', expect.objectContaining({
        request: {
          ip: 'unknown',
          userAgent: 'unknown',
          endpoint: 'unknown'
        }
      }));
    });

    it('should include timestamp in all logs', () => {
      const context: AuthLogContext = {
        userId: 'user123'
      };

      AuthLogger.logAuthenticationSuccess(context);

      const logCall = (logger.info as jest.MockedFunction<typeof logger.info>).mock.calls[0][1];
      expect(logCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});