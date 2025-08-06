import { Request, Response, NextFunction } from 'express';
import { requireAuth, authenticate, optionalAuth } from '../../../backend/functions/src/middleware/auth';
import { TokenValidator } from '../../../backend/functions/src/utils/token-validator';
import { ERROR_CODES } from '@attendance-x/shared';

// Mock des dépendances
jest.mock('../../../backend/functions/src/utils/token-validator');
jest.mock('../../../backend/functions/src/services/auth.service');
jest.mock('../../../backend/functions/src/config');
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockTokenValidator = TokenValidator as jest.Mocked<typeof TokenValidator>;

describe('Auth Middleware Token Validation Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      headers: {},
      ip: '192.168.1.1',
      path: '/api/test',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    it('should reject request when no token is provided', async () => {
      mockReq.headers = {};

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: "Token d'authentification requis"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when token validation fails', async () => {
      const invalidToken = 'invalid.token.here';
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: false,
        error: 'Structure de token invalide',
        errorCode: ERROR_CODES.INVALID_TOKEN,
        details: {
          originalLength: invalidToken.length,
          cleanedLength: invalidToken.length,
          hasInvisibleChars: false,
          structure: {
            hasDots: true,
            partCount: 2,
            isBase64Like: true
          }
        }
      });

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
        invalidToken,
        {
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          endpoint: '/api/test'
        }
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Structure de token invalide'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should clean token with invisible characters and proceed', async () => {
      const dirtyToken = '  valid.jwt.token\u200B  ';
      const cleanToken = 'valid.jwt.token';
      
      mockReq.headers = {
        authorization: `Bearer ${dirtyToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: true,
        cleanedToken: cleanToken,
        details: {
          originalLength: dirtyToken.length,
          cleanedLength: cleanToken.length,
          hasInvisibleChars: true
        }
      });

      // Mock authService.verifyToken pour simuler une vérification réussie
      const mockAuthService = require('../../../backend/functions/src/services/auth.service');
      mockAuthService.authService = {
        verifyToken: jest.fn().mockResolvedValue({
          userId: 'user123',
          email: 'test@example.com'
        })
      };

      // Mock collections.users pour simuler un utilisateur existant
      const mockCollections = require('../../../backend/functions/src/config');
      mockCollections.collections = {
        users: {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: jest.fn().mockReturnValue({
                email: 'test@example.com',
                role: 'user',
                status: 'active',
                permissions: { read: true }
              })
            })
          })
        }
      };

      await requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
        dirtyToken,
        {
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          endpoint: '/api/test'
        }
      );

      expect(mockAuthService.authService.verifyToken).toHaveBeenCalledWith(cleanToken);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authenticate middleware', () => {
    it('should reject request when no authorization header', async () => {
      mockReq.headers = {};

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Token d'authentification requis"
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request when token validation fails', async () => {
      const invalidToken = 'malformed-token';
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: false,
        error: 'Structure de token invalide',
        errorCode: ERROR_CODES.INVALID_TOKEN,
        details: {
          originalLength: invalidToken.length,
          cleanedLength: invalidToken.length,
          hasInvisibleChars: false,
          structure: {
            hasDots: false,
            partCount: 1,
            isBase64Like: true
          }
        }
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
        invalidToken,
        {
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          endpoint: '/api/test'
        }
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Structure de token invalide'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    it('should continue without auth when no token provided', async () => {
      mockReq.headers = {};

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without auth when token validation fails', async () => {
      const invalidToken = 'invalid.token';
      mockReq.headers = {
        authorization: `Bearer ${invalidToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: false,
        error: 'Structure de token invalide',
        errorCode: ERROR_CODES.INVALID_TOKEN
      });

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
        invalidToken,
        {
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          endpoint: '/api/test'
        }
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should authenticate user when token is valid after cleaning', async () => {
      const dirtyToken = 'valid.jwt.token\u200B';
      const cleanToken = 'valid.jwt.token';
      
      mockReq.headers = {
        authorization: `Bearer ${dirtyToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: true,
        cleanedToken: cleanToken,
        details: {
          originalLength: dirtyToken.length,
          cleanedLength: cleanToken.length,
          hasInvisibleChars: true
        }
      });

      // Mock authService.verifyToken
      const mockAuthService = require('../../../backend/functions/src/services/auth.service');
      mockAuthService.authService = {
        verifyToken: jest.fn().mockResolvedValue({
          uid: 'user123',
          email: 'test@example.com'
        })
      };

      // Mock collections.users
      const mockCollections = require('../../../backend/functions/src/config');
      mockCollections.collections = {
        users: {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: jest.fn().mockReturnValue({
                email: 'test@example.com',
                role: 'user',
                permissions: { read: true }
              })
            })
          })
        }
      };

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
        dirtyToken,
        {
          ip: '192.168.1.1',
          userAgent: 'test-user-agent',
          endpoint: '/api/test'
        }
      );

      expect(mockAuthService.authService.verifyToken).toHaveBeenCalledWith(cleanToken);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without auth when auth service throws error', async () => {
      const validToken = 'valid.jwt.token';
      
      mockReq.headers = {
        authorization: `Bearer ${validToken}`
      };

      mockTokenValidator.validateAndCleanToken.mockReturnValue({
        isValid: true,
        cleanedToken: validToken,
        details: {
          originalLength: validToken.length,
          cleanedLength: validToken.length,
          hasInvisibleChars: false
        }
      });

      // Mock authService.verifyToken to throw error
      const mockAuthService = require('../../../backend/functions/src/services/auth.service');
      mockAuthService.authService = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Token expired'))
      };

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Token cleaning integration', () => {
    it('should handle tokens with various invisible characters', async () => {
      const tokensWithInvisibleChars = [
        'token.with.spaces\u200B',
        '\u200Ctoken.with.zerowidth',
        'token\u0000.with.control\u001F',
        '  token.with.whitespace  ',
        'token\n.with\r.newlines\t'
      ];

      for (const dirtyToken of tokensWithInvisibleChars) {
        mockReq.headers = {
          authorization: `Bearer ${dirtyToken}`
        };

        mockTokenValidator.validateAndCleanToken.mockReturnValue({
          isValid: false,
          error: 'Structure de token invalide',
          errorCode: ERROR_CODES.INVALID_TOKEN,
          details: {
            originalLength: dirtyToken.length,
            cleanedLength: dirtyToken.replace(/[\s\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '').length,
            hasInvisibleChars: true
          }
        });

        await requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockTokenValidator.validateAndCleanToken).toHaveBeenCalledWith(
          dirtyToken,
          expect.objectContaining({
            ip: '192.168.1.1',
            userAgent: 'test-user-agent',
            endpoint: '/api/test'
          })
        );
      }
    });
  });
});