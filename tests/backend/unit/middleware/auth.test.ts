// tests/backend/unit/middleware/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { AuthenticationError, ForbiddenError } from '@/utils/errors';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('@/services/auth.service');
jest.mock('@/services/user.service');
jest.mock('jsonwebtoken');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      cookies: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid Bearer token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'active',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should authenticate user with valid cookie token', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'active',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.cookies = {
        accessToken: 'valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without token', async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Access token required',
        })
      );
    });

    it('should reject request with invalid token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token format',
        })
      );
    });

    it('should reject request with expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
        })
      );
    });

    it('should reject request with malformed token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed-token',
      };

      mockJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
        })
      );
    });

    it('should reject request for inactive user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'inactive',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account is inactive',
        })
      );
    });

    it('should reject request for non-existent user', async () => {
      const mockDecodedToken = {
        userId: 'nonexistent-user',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(null);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockRejectedValue(
        new Error('Database connection error')
      );

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should authenticate user when token is provided', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'active',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when no token is provided', async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      await optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when user is not found', async () => {
      const mockDecodedToken = {
        userId: 'nonexistent-user',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(null);

      await optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when user is inactive', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'inactive',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Token Extraction', () => {
    it('should prioritize Authorization header over cookies', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'active',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer header-token',
      };
      mockRequest.cookies = {
        accessToken: 'cookie-token',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('header-token', expect.any(String));
      expect(mockJwt.verify).not.toHaveBeenCalledWith('cookie-token', expect.any(String));
    });

    it('should handle Bearer token with extra spaces', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        status: 'active',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        iat: Date.now() / 1000,
        exp: Date.now() / 1000 + 3600,
      };

      mockRequest.headers = {
        authorization: '  Bearer   token-with-spaces  ',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockDecodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('token-with-spaces', expect.any(String));
    });
  });
});