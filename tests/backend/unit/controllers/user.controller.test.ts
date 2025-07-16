// tests/backend/unit/controllers/user.controller.test.ts
import { Request, Response } from 'express';
import { UserController } from '../../../../backend/functions/src/controllers/user.controller';
import { UserService } from '../../../../backend/functions/src/services/user.service';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserRole, 
  UserStatus, 
  ERROR_CODES 
} from '@attendance-x/shared';

// Mock services
jest.mock('../../../../backend/functions/src/services/user.service');

const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    userController = new UserController();
    mockRequest = {
      user: { uid: 'current-user-id' },
      params: {},
      body: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
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

      mockRequest.body = validCreateRequest;
      mockUserService.prototype.createUser = jest.fn().mockResolvedValue({
        user: mockUser,
        invitation: mockInvitation,
      });

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.createUser).toHaveBeenCalledWith(
        validCreateRequest,
        'current-user-id'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: mockUser.getData(),
          invitation: mockInvitation,
        },
      });
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        email: 'invalid-email',
      };

      mockRequest.body = invalidRequest;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle duplicate email error', async () => {
      mockRequest.body = validCreateRequest;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS)
      );

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle insufficient permissions', async () => {
      mockRequest.body = validCreateRequest;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should create user without invitation', async () => {
      const requestWithoutInvitation = {
        ...validCreateRequest,
        sendInvitation: false,
      };

      const mockUser = {
        id: 'new-user-id',
        getData: () => ({ ...requestWithoutInvitation, id: 'new-user-id' }),
      };

      mockRequest.body = requestWithoutInvitation;
      mockUserService.prototype.createUser = jest.fn().mockResolvedValue({
        user: mockUser,
        invitation: undefined,
      });

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: mockUser.getData(),
          invitation: undefined,
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({
          id: 'user-id',
          email: 'user@example.com',
          displayName: 'Test User',
        }),
      };

      mockRequest.params = { id: 'user-id' };
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await UserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser.getData(),
      });
    });

    it('should handle user not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };
      mockUserService.prototype.getUserById = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.USER_NOT_FOUND)
      );

      await UserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        id: 'current-user-id',
        getData: () => ({
          id: 'current-user-id',
          email: 'current@example.com',
          displayName: 'Current User',
        }),
      };

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      await UserController.getMyProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUserById).toHaveBeenCalledWith('current-user-id');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser.getData(),
      });
    });

    it('should handle missing user context', async () => {
      mockRequest.user = undefined;

      await UserController.getMyProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateProfile', () => {
    const updateRequest: UpdateUserRequest = {
      displayName: 'Updated Name',
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+33987654321',
    };

    it('should update user profile successfully', async () => {
      const mockUser = {
        id: 'current-user-id',
        getData: () => ({
          id: 'current-user-id',
          ...updateRequest,
        }),
      };

      mockRequest.body = updateRequest;
      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(mockUser);

      await UserController.updateProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith(
        'current-user-id',
        updateRequest,
        'current-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: mockUser.getData(),
      });
    });

    it('should handle validation errors', async () => {
      const invalidUpdate = {
        ...updateRequest,
        email: 'invalid-email',
      };

      mockRequest.body = invalidUpdate;
      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.updateProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle insufficient permissions', async () => {
      mockRequest.body = updateRequest;
      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.updateProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateUser', () => {
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

      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = updateRequest;
      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(mockUser);

      await UserController.updateUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith(
        'target-user-id',
        updateRequest,
        'current-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: mockUser.getData(),
      });
    });

    it('should handle insufficient permissions', async () => {
      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = updateRequest;
      mockUserService.prototype.updateUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.updateUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUsers', () => {
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

      mockRequest.query = {
        page: '1',
        limit: '20',
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      await UserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortOrder: undefined,
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        department: undefined,
        searchTerm: undefined,
        includeInactive: false,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        pagination: mockResult.pagination,
      });
    });

    it('should handle search parameters', async () => {
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

      mockRequest.query = {
        search: 'john',
        department: 'IT',
        sortBy: 'displayName',
        sortOrder: 'asc',
        includeInactive: 'true',
      };

      mockUserService.prototype.getUsers = jest.fn().mockResolvedValue(mockResult);

      await UserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: 'displayName',
        sortOrder: 'asc',
        role: undefined,
        status: undefined,
        department: 'IT',
        searchTerm: 'john',
        includeInactive: true,
      });
    });

    it('should handle invalid pagination parameters', async () => {
      mockRequest.query = {
        page: 'invalid',
        limit: 'invalid',
      };

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

      await UserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUsers).toHaveBeenCalledWith({
        page: 1, // Default value
        limit: 20, // Default value
        sortBy: undefined,
        sortOrder: undefined,
        role: undefined,
        status: undefined,
        department: undefined,
        searchTerm: undefined,
        includeInactive: false,
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'john@example.com', role: UserRole.PARTICIPANT },
      ];

      const searchFilters = {
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        department: 'IT',
      };

      mockRequest.body = searchFilters;
      mockRequest.query = { limit: '10' };
      mockUserService.prototype.searchUsers = jest.fn().mockResolvedValue(mockUsers);

      await UserController.searchUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.searchUsers).toHaveBeenCalledWith(searchFilters, 10);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
    });

    it('should use default limit when not provided', async () => {
      const searchFilters = { role: UserRole.PARTICIPANT };

      mockRequest.body = searchFilters;
      mockRequest.query = {};
      mockUserService.prototype.searchUsers = jest.fn().mockResolvedValue([]);

      await UserController.searchUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.searchUsers).toHaveBeenCalledWith(searchFilters, 10);
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          role: UserRole.ORGANIZER,
        }),
      };

      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = { role: UserRole.ORGANIZER };
      mockUserService.prototype.changeUserRole = jest.fn().mockResolvedValue(mockUser);

      await UserController.changeUserRole(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.changeUserRole).toHaveBeenCalledWith(
        'target-user-id',
        UserRole.ORGANIZER,
        'current-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Rôle modifié avec succès',
        data: mockUser.getData(),
      });
    });

    it('should handle insufficient permissions', async () => {
      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = { role: UserRole.ADMIN };
      mockUserService.prototype.changeUserRole = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.changeUserRole(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle invalid role', async () => {
      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = { role: 'invalid-role' };
      mockUserService.prototype.changeUserRole = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.changeUserRole(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status successfully', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          status: UserStatus.SUSPENDED,
        }),
      };

      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = { 
        status: UserStatus.SUSPENDED, 
        reason: 'Policy violation' 
      };
      mockUserService.prototype.changeUserStatus = jest.fn().mockResolvedValue(mockUser);

      await UserController.changeUserStatus(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.changeUserStatus).toHaveBeenCalledWith(
        'target-user-id',
        UserStatus.SUSPENDED,
        'current-user-id',
        'Policy violation'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statut modifié avec succès',
        data: mockUser.getData(),
      });
    });

    it('should handle self-suspension attempt', async () => {
      mockRequest.params = { id: 'current-user-id' };
      mockRequest.body = { status: UserStatus.SUSPENDED };
      mockUserService.prototype.changeUserStatus = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.CANNOT_DELETE_SELF)
      );

      await UserController.changeUserStatus(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle status change without reason', async () => {
      const mockUser = {
        id: 'target-user-id',
        getData: () => ({
          id: 'target-user-id',
          status: UserStatus.ACTIVE,
        }),
      };

      mockRequest.params = { id: 'target-user-id' };
      mockRequest.body = { status: UserStatus.ACTIVE };
      mockUserService.prototype.changeUserStatus = jest.fn().mockResolvedValue(mockUser);

      await UserController.changeUserStatus(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.changeUserStatus).toHaveBeenCalledWith(
        'target-user-id',
        UserStatus.ACTIVE,
        'current-user-id',
        undefined
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockUser = {
        id: 'new-user-id',
        getData: () => ({
          id: 'new-user-id',
          email: 'invited@example.com',
          status: UserStatus.ACTIVE,
        }),
      };

      mockRequest.body = {
        token: 'valid-invitation-token',
        password: 'SecurePassword123!',
      };
      mockUserService.prototype.acceptInvitation = jest.fn().mockResolvedValue(mockUser);

      await UserController.acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.acceptInvitation).toHaveBeenCalledWith(
        'valid-invitation-token',
        'SecurePassword123!'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Invitation acceptée avec succès',
        data: mockUser.getData(),
      });
    });

    it('should handle invalid invitation token', async () => {
      mockRequest.body = {
        token: 'invalid-token',
        password: 'SecurePassword123!',
      };
      mockUserService.prototype.acceptInvitation = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INVALID_TOKEN)
      );

      await UserController.acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle expired invitation', async () => {
      mockRequest.body = {
        token: 'expired-token',
        password: 'SecurePassword123!',
      };
      mockUserService.prototype.acceptInvitation = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INVALID_TOKEN)
      );

      await UserController.acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle weak password', async () => {
      mockRequest.body = {
        token: 'valid-token',
        password: '123',
      };
      mockUserService.prototype.acceptInvitation = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.acceptInvitation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUserStats', () => {
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

      await UserController.getUserStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.getUserStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should handle service errors', async () => {
      mockUserService.prototype.getUserStats = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await UserController.getUserStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockRequest.params = { id: 'user-id' };
      mockUserService.prototype.getUserById = jest.fn().mockRejectedValue(
        new Error('Unexpected database error')
      );

      await UserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Unexpected database error');
    });

    it('should handle missing request parameters', async () => {
      mockRequest.params = {}; // Missing id parameter

      await UserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle malformed request body', async () => {
      mockRequest.body = null;

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Input Validation', () => {
    it('should validate email format in create user', async () => {
      const invalidRequest = {
        email: 'not-an-email',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        password: 'SecurePassword123!',
      };

      mockRequest.body = invalidRequest;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate role enum in change role', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = { role: 'invalid-role' };
      mockUserService.prototype.changeUserRole = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.changeUserRole(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should validate status enum in change status', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = { status: 'invalid-status' };
      mockUserService.prototype.changeUserStatus = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.VALIDATION_ERROR)
      );

      await UserController.changeUserStatus(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Authorization', () => {
    it('should check permissions for user creation', async () => {
      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.ADMIN, // Trying to create admin
        password: 'SecurePassword123!',
      };

      mockRequest.body = createRequest;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.createUser(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should check permissions for role changes', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = { role: UserRole.SUPER_ADMIN };
      mockUserService.prototype.changeUserRole = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS)
      );

      await UserController.changeUserRole(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow users to update their own profile', async () => {
      const updateRequest = {
        displayName: 'Updated Name',
        phoneNumber: '+33123456789',
      };

      const mockUser = {
        id: 'current-user-id',
        getData: () => ({ id: 'current-user-id', ...updateRequest }),
      };

      mockRequest.body = updateRequest;
      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(mockUser);

      await UserController.updateProfile(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith(
        'current-user-id',
        updateRequest,
        'current-user-id'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: mockUser.getData(),
      });
    });
  });
});