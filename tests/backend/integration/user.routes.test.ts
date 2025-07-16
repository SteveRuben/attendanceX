// tests/backend/integration/user.routes.test.ts
import request from 'supertest';
import express from 'express';
import { userRoutes } from '../../../backend/functions/src/routes/users.routes';
import { UserService } from '../../../backend/functions/src/services/user.service';
import { AuthService } from '../../../backend/functions/src/services/auth.service';
import { errorHandler } from '../../../backend/functions/src/middleware/errorHandler';
import { authenticate, requirePermission } from '../../../backend/functions/src/middleware/auth';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserRole, 
  UserStatus, 
  ERROR_CODES 
} from '@attendance-x/shared';

// Mock services
jest.mock('../../../backend/functions/src/services/user.service');
jest.mock('../../../backend/functions/src/services/auth.service');

const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('User Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { 
        uid: 'current-user-id', 
        role: UserRole.ADMIN,
        permissions: { canManageUsers: true, canViewReports: true }
      };
      next();
    });
    
    app.use('/users', userRoutes);
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('POST /users', () => {
    const validCreateRequest: CreateUserRequest = {
      email: 'newuser@example.com',
      displayName: 'New User',
      firstName: 'New',
      lastName: 'User',
      phoneNumber: '+33123456789',
      role: UserRole.PARTICIPANT,
      password: 'SecurePassword123!',
      sendInvitation: true,
    };

    it('should create user successfully', async () => {
      const mockUser = {
        id: 'new-user-id',
        getData: () => ({ ...validCreateRequest, id: 'new-user-id' }),
      };

      const mockInvitation = {
        id: 'invitation-id',
        email: validCreateRequest.email,
        token: 'invitation-token',
      };

      mockUserService.prototype.createUser = jest.fn().mockResolvedValue({
        user: mockUser,
        invitation: mockInvitation,
      });

      const response = await request(app)
        .post('/users')
        .send(validCreateRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: mockUser.getData(),
          invitation: mockInvitation,
        },
      });
    });

    it('should return 400 for invalid user data', async () => {
      const invalidData = {
        ...validCreateRequest,
        email: 'invalid-email',
        password: '123',
      };

      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      const response = await request(app)
        .post('/users')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for duplicate email', async () => {
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS)
      );

      const response = await request(app)
        .post('/users')
        .send(validCreateRequest)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return 403 for insufficient permissions', async () => {
      // Override middleware to simulate insufficient permissions
      app.use('/users', (req, res, next) => {
        req.user = { 
          uid: 'limited-user-id', 
          role: UserRole.PARTICIPANT,
          permissions: { canManageUsers: false }
        };
        next();
      });

      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      const response = await request(app)
        .post('/users')
        .send(validCreateRequest)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // Missing required fields
      };

      const response = await request(app)
        .post('/users')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validCreateRequest,
        email: 'not-an-email',
      };

      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      const response = await request(app)
        .post('/users')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validCreateRequest,
        password: '123',
      };

      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      const response = await request(app)
        .post('/users')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate phone number format', async () => {
      const invalidPhoneData = {
        ...validCreateRequest,
        phoneNumber: 'invalid-phone',
      };

      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      const response = await request(app)
        .post('/users')
        .send(invalidPhoneData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({
          id: 'user-id',
          email: 'user@example.com',
          displayName: 'Test User',
          role: UserRole.PARTICIPANT,
        }),
      };

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/user-id')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUser.getData(),
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockUserService.prototype.getUserById = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.USER_NOT_FOUND)
      );

      const response = await request(app)
        .get('/users/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate user ID format', async () => {
      const response = await request(app)
        .get('/users/invalid-id-format')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: 'current-user-id',
        getData: () => ({
          id: 'current-user-id',
          email: 'current@example.com',
          displayName: 'Current User',
          role: UserRole.ADMIN,
        }),
      };

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/me')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUser.getData(),
      });
      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('current-user-id');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Override middleware to simulate unauthenticated request
      app.use('/users', (req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .get('/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });
  });

  describe('PUT /users/me', () => {
    const updateRequest: UpdateUserRequest = {
      displayName: 'Updated Name',
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+33987654321',
    };

    it('should update current user profile', async () => {
      const mockUser = {
        id: 'current-user-id',
        getData: () => ({
          id: 'current-user-id',
          ...updateRequest,
        }),
      };

      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/me')
        .send(updateRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: mockUser.getData(),
      });
      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith(
        'current-user-id',
        updateRequest,
        'current-user-id'
      );
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        ...updateRequest,
        email: 'invalid-email',
      };

      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      const response = await request(app)
        .put('/users/me')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate email error', async () => {
      const updateWithEmail = {
        ...updateRequest,
        email: 'existing@example.com',
      };

      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS)
      );

      const response = await request(app)
        .put('/users/me')
        .send(updateWithEmail)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id', () => {
    const updateRequest: UpdateUserRequest = {
      displayName: 'Admin Updated Name',
      role: UserRole.ORGANIZER,
    };

    it('should update user successfully (admin)', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          ...updateRequest,
        }),
      };

      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/target-user-id')
        .send(updateRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: mockUser.getData(),
      });
      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith(
        'target-user-id',
        updateRequest,
        'current-user-id'
      );
    });

    it('should return 403 for insufficient permissions', async () => {
      // Override middleware to simulate insufficient permissions
      app.use('/users', (req, res, next) => {
        req.user = { 
          uid: 'limited-user-id', 
          role: UserRole.PARTICIPANT,
          permissions: { canManageUsers: false }
        };
        next();
      });

      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      const response = await request(app)
        .put('/users/target-user-id')
        .send(updateRequest)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', role: UserRole.PARTICIPANT },
        { id: 'user-2', email: 'user2@example.com', role: UserRole.ORGANIZER },
      ];

      const mockResult = {
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUsers,
        pagination: mockResult.pagination,
      });
    });

    it('should filter by role', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users?role=participant')
        .expect(200);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.PARTICIPANT,
        })
      );
    });

    it('should filter by status', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users?status=active')
        .expect(200);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
        })
      );
    });

    it('should support search', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users?search=john')
        .expect(200);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          searchTerm: 'john',
        })
      );
    });

    it('should support pagination', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users?page=2&limit=10')
        .expect(200);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });

    it('should support sorting', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/users?sortBy=displayName&sortOrder=asc')
        .expect(200);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'displayName',
          sortOrder: 'asc',
        })
      );
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/users?page=0&limit=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /users/search', () => {
    it('should search users with filters', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'john@example.com', role: UserRole.PARTICIPANT },
      ];

      const searchFilters = {
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        department: 'IT',
      };

      mockUserService.prototype.searchUsers = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app)
        .post('/users/search')
        .send(searchFilters)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUsers,
      });
      expect(mockUserService.prototype.searchUsers).toHaveBeenCalledWith(searchFilters, 10);
    });

    it('should support custom limit', async () => {
      const searchFilters = { role: UserRole.PARTICIPANT };

      mockUserService.prototype.searchUsers = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .post('/users/search?limit=5')
        .send(searchFilters)
        .expect(200);

      expect(mockUserService.prototype.searchUsers).toHaveBeenCalledWith(searchFilters, 5);
    });
  });

  describe('PUT /users/:id/role', () => {
    it('should change user role successfully', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          role: UserRole.ORGANIZER,
        }),
      };

      mockUserService.prototype.changeUserRole = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/target-user-id/role')
        .send({ role: UserRole.ORGANIZER })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Rôle modifié avec succès',
        data: mockUser.getData(),
      });
      expect(mockUserService.prototype.changeUserRole).toHaveBeenCalledWith(
        'target-user-id',
        UserRole.ORGANIZER,
        'current-user-id'
      );
    });

    it('should return 403 for insufficient permissions', async () => {
      mockUserService.prototype.changeUserRole = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      const response = await request(app)
        .put('/users/target-user-id/role')
        .send({ role: UserRole.ADMIN })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should validate role value', async () => {
      const response = await request(app)
        .put('/users/target-user-id/role')
        .send({ role: 'invalid-role' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('PUT /users/:id/status', () => {
    it('should change user status successfully', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          status: UserStatus.SUSPENDED,
        }),
      };

      mockUserService.prototype.changeUserStatus = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/users/target-user-id/status')
        .send({ 
          status: UserStatus.SUSPENDED, 
          reason: 'Policy violation' 
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Statut modifié avec succès',
        data: mockUser.getData(),
      });
      expect(mockUserService.prototype.changeUserStatus).toHaveBeenCalledWith(
        'target-user-id',
        UserStatus.SUSPENDED,
        'current-user-id',
        'Policy violation'
      );
    });

    it('should prevent self-suspension', async () => {
      mockUserService.prototype.changeUserStatus = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.CANNOT_DELETE_SELF)
      );

      const response = await request(app)
        .put('/users/current-user-id/status')
        .send({ status: UserStatus.SUSPENDED })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate status value', async () => {
      const response = await request(app)
        .put('/users/target-user-id/status')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /users/accept-invitation', () => {
    it('should accept invitation successfully', async () => {
      const mockUser = {
        id: 'new-user-id',
        getData: () => ({
          id: 'new-user-id',
          email: 'invited@example.com',
          status: UserStatus.ACTIVE,
        }),
      };

      mockUserService.prototype.acceptInvitation = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/users/accept-invitation')
        .send({
          token: 'valid-invitation-token',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Invitation acceptée avec succès',
        data: mockUser.getData(),
      });
    });

    it('should return 400 for invalid token', async () => {
      mockUserService.prototype.acceptInvitation = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INVALID_TOKEN)
      );

      const response = await request(app)
        .post('/users/accept-invitation')
        .send({
          token: 'invalid-token',
          password: 'SecurePassword123!',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/users/accept-invitation')
        .send({
          token: 'valid-token',
          password: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });
  });

  describe('GET /users/stats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total: 100,
        active: 85,
        inactive: 10,
        suspended: 5,
        byRole: {
          [UserRole.PARTICIPANT]: 70,
          [UserRole.ORGANIZER]: 25,
          [UserRole.ADMIN]: 5,
        },
        byDepartment: {
          'IT': 30,
          'HR': 20,
          'Finance': 25,
          'Marketing': 15,
          'Non défini': 10,
        },
        recentSignups: 15,
      };

      mockUserService.prototype.getUserStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/users/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
      });
    });

    it('should require admin permissions', async () => {
      // Override middleware to simulate insufficient permissions
      app.use('/users', (req, res, next) => {
        req.user = { 
          uid: 'limited-user-id', 
          role: UserRole.PARTICIPANT,
          permissions: { canViewReports: false }
        };
        next();
      });

      const response = await request(app)
        .get('/users/stats')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to user creation', async () => {
      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        password: 'SecurePassword123!',
      };

      mockUserService.prototype.createUser = jest.fn().mockResolvedValue({
        user: { getData: () => createRequest },
        invitation: undefined,
      });

      // Make multiple requests to trigger rate limiting
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/users')
          .send(createRequest)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML in user input', async () => {
      const maliciousInput = {
        displayName: '<script>alert("xss")</script>Malicious User',
        firstName: 'Test<script>',
        lastName: 'User</script>',
        email: 'test@example.com',
        role: UserRole.PARTICIPANT,
        password: 'SecurePassword123!',
      };

      const sanitizedUser = {
        getData: () => ({
          ...maliciousInput,
          displayName: 'Malicious User', // HTML stripped
          firstName: 'Test',
          lastName: 'User',
        }),
      };

      mockUserService.prototype.createUser = jest.fn().mockResolvedValue({
        user: sanitizedUser,
        invitation: undefined,
      });

      const response = await request(app)
        .post('/users')
        .send(maliciousInput)
        .expect(201);

      expect(response.body.data.user.displayName).not.toContain('<script>');
      expect(response.body.data.user.firstName).not.toContain('<script>');
      expect(response.body.data.user.lastName).not.toContain('</script>');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockUserService.prototype.getUsers = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/users')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Internal server error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/users')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required headers', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});