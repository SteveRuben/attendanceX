// tests/backend/unit/middleware/roles.test.ts
import { Request, Response, NextFunction } from 'express';
import { requireRole, requireAnyRole, requirePermission } from '../middleware/roles';
import { ForbiddenError } from '../utils/errors';

describe('Roles Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for user without required role', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'participant',
        status: 'active',
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
        })
      );
    });

    it('should deny access for unauthenticated user', () => {
      mockRequest.user = null;

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
    });

    it('should allow super_admin to access admin-only resources', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'superadmin@example.com',
        role: 'super_admin',
        status: 'active',
      };

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow admin to access organizer resources', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      };

      const middleware = requireRole('organizer');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow organizer to access moderator resources', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'organizer@example.com',
        role: 'organizer',
        status: 'active',
      };

      const middleware = requireRole('moderator');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow moderator to access analyst resources', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'moderator@example.com',
        role: 'moderator',
        status: 'active',
      };

      const middleware = requireRole('analyst');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should not allow lower roles to access higher role resources', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'participant@example.com',
        role: 'participant',
        status: 'active',
      };

      const middleware = requireRole('moderator');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireAnyRole', () => {
    it('should allow access for user with one of the required roles', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'moderator@example.com',
        role: 'moderator',
        status: 'active',
      };

      const middleware = requireAnyRole(['admin', 'moderator', 'organizer']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for user without any of the required roles', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'participant@example.com',
        role: 'participant',
        status: 'active',
      };

      const middleware = requireAnyRole(['admin', 'moderator']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
        })
      );
    });

    it('should deny access for unauthenticated user', () => {
      mockRequest.user = null;

      const middleware = requireAnyRole(['admin', 'moderator']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
    });

    it('should handle empty roles array', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'participant',
        status: 'active',
      };

      const middleware = requireAnyRole([]);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should allow super_admin for any role requirement', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'superadmin@example.com',
        role: 'super_admin',
        status: 'active',
      };

      const middleware = requireAnyRole(['participant']);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requirePermission', () => {
    it('should allow access for user with manage_users permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      };

      const middleware = requirePermission('manage_users');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for user with manage_events permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'organizer@example.com',
        role: 'organizer',
        status: 'active',
      };

      const middleware = requirePermission('manage_events');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for user with view_reports permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'analyst@example.com',
        role: 'analyst',
        status: 'active',
      };

      const middleware = requirePermission('view_reports');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow access for user with manage_attendance permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'moderator@example.com',
        role: 'moderator',
        status: 'active',
      };

      const middleware = requirePermission('manage_attendance');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for user without required permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'participant@example.com',
        role: 'participant',
        status: 'active',
      };

      const middleware = requirePermission('manage_users');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
        })
      );
    });

    it('should deny access for unauthenticated user', () => {
      mockRequest.user = null;

      const middleware = requirePermission('manage_users');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
        })
      );
    });

    it('should allow super_admin for any permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'superadmin@example.com',
        role: 'super_admin',
        status: 'active',
      };

      const middleware = requirePermission('manage_users');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle invalid permission', () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      };

      const middleware = requirePermission('invalid_permission' as any);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('Role Hierarchy', () => {
    const testCases = [
      { userRole: 'super_admin', requiredRole: 'admin', shouldAllow: true },
      { userRole: 'super_admin', requiredRole: 'organizer', shouldAllow: true },
      { userRole: 'super_admin', requiredRole: 'moderator', shouldAllow: true },
      { userRole: 'super_admin', requiredRole: 'analyst', shouldAllow: true },
      { userRole: 'super_admin', requiredRole: 'participant', shouldAllow: true },
      
      { userRole: 'admin', requiredRole: 'super_admin', shouldAllow: false },
      { userRole: 'admin', requiredRole: 'organizer', shouldAllow: true },
      { userRole: 'admin', requiredRole: 'moderator', shouldAllow: true },
      { userRole: 'admin', requiredRole: 'analyst', shouldAllow: true },
      { userRole: 'admin', requiredRole: 'participant', shouldAllow: true },
      
      { userRole: 'organizer', requiredRole: 'admin', shouldAllow: false },
      { userRole: 'organizer', requiredRole: 'moderator', shouldAllow: true },
      { userRole: 'organizer', requiredRole: 'analyst', shouldAllow: true },
      { userRole: 'organizer', requiredRole: 'participant', shouldAllow: true },
      
      { userRole: 'moderator', requiredRole: 'organizer', shouldAllow: false },
      { userRole: 'moderator', requiredRole: 'analyst', shouldAllow: true },
      { userRole: 'moderator', requiredRole: 'participant', shouldAllow: true },
      
      { userRole: 'analyst', requiredRole: 'moderator', shouldAllow: false },
      { userRole: 'analyst', requiredRole: 'participant', shouldAllow: true },
      
      { userRole: 'participant', requiredRole: 'analyst', shouldAllow: false },
    ];

    testCases.forEach(({ userRole, requiredRole, shouldAllow }) => {
      it(`should ${shouldAllow ? 'allow' : 'deny'} ${userRole} to access ${requiredRole} resources`, () => {
        mockRequest.user = {
          id: 'user-id',
          email: 'user@example.com',
          role: userRole as any,
          status: 'active',
        };

        const middleware = requireRole(requiredRole as any);
        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        if (shouldAllow) {
          expect(mockNext).toHaveBeenCalledWith();
        } else {
          expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
        }
      });
    });
  });
});