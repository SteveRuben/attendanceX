// tests/backend/unit/services/user.service.test.ts
import { UserService } from '../../../../backend/functions/src/services/user.service';
import { AuthService } from '../../../../backend/functions/src/services/auth.service';
import { UserModel } from '../../../../backend/functions/src/models/user.model';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserRole, 
  UserStatus, 
  ERROR_CODES 
} from '@attendance-x/shared';
import { getFirestore } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('firebase-admin/firestore');
jest.mock('../../../../backend/functions/src/services/auth.service');
jest.mock('../../../../backend/functions/src/models/user.model');

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    where: jest.fn(() => ({
      get: jest.fn(),
      limit: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
    add: jest.fn(),
  })),
};

(getFirestore as jest.Mock).mockReturnValue(mockFirestore);

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockUserModel = UserModel as jest.MockedClass<typeof UserModel>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const validCreateRequest: CreateUserRequest = {
      email: 'test@example.com',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+33123456789',
      role: UserRole.PARTICIPANT,
      password: 'SecurePassword123!',
      sendInvitation: true,
    };

    it('should create user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ ...validCreateRequest, id: 'user-id' }),
      } as any;

      const mockInvitation = {
        id: 'invitation-id',
        email: validCreateRequest.email,
        token: 'invitation-token',
      };

      mockAuthService.prototype.hasPermission = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.emailExists = jest.fn().mockResolvedValue(false);
      mockUserService.prototype.phoneExists = jest.fn().mockResolvedValue(false);
      mockAuthService.prototype.hashPassword = jest.fn().mockResolvedValue('hashed-password');
      mockUserModel.fromCreateRequest = jest.fn().mockReturnValue(mockUser);
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);
      mockUserService.prototype.createInvitation = jest.fn().mockResolvedValue(mockInvitation);
      mockUserService.prototype.logUserAction = jest.fn().mockResolvedValue(undefined);

      const result = await userService.createUser(validCreateRequest, 'creator-id');

      expect(result.user).toBe(mockUser);
      expect(result.invitation).toBe(mockInvitation);
      expect(mockUserService.prototype.saveUser).toHaveBeenCalledWith(mockUser);
    });

    it('should throw error for duplicate email', async () => {
      mockAuthService.prototype.hasPermission = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.emailExists = jest.fn().mockResolvedValue(true);

      await expect(
        userService.createUser(validCreateRequest, 'creator-id')
      ).rejects.toThrow(ERROR_CODES.EMAIL_ALREADY_EXISTS);
    });

    it('should throw error for duplicate phone', async () => {
      mockAuthService.prototype.hasPermission = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.emailExists = jest.fn().mockResolvedValue(false);
      mockUserService.prototype.phoneExists = jest.fn().mockResolvedValue(true);

      await expect(
        userService.createUser(validCreateRequest, 'creator-id')
      ).rejects.toThrow(ERROR_CODES.PHONE_ALREADY_EXISTS);
    });

    it('should throw error for insufficient permissions', async () => {
      mockAuthService.prototype.hasPermission = jest.fn().mockResolvedValue(false);

      await expect(
        userService.createUser(validCreateRequest, 'creator-id')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        email: '',
      };

      await expect(
        userService.createUser(invalidRequest, 'creator-id')
      ).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        email: 'invalid-email',
      };

      await expect(
        userService.createUser(invalidRequest, 'creator-id')
      ).rejects.toThrow();
    });

    it('should validate phone format', async () => {
      const invalidRequest = {
        ...validCreateRequest,
        phoneNumber: 'invalid-phone',
      };

      await expect(
        userService.createUser(invalidRequest, 'creator-id')
      ).rejects.toThrow();
    });

    it('should create user without invitation', async () => {
      const requestWithoutInvitation = {
        ...validCreateRequest,
        sendInvitation: false,
      };

      const mockUser = {
        id: 'user-id',
        getData: () => ({ ...requestWithoutInvitation, id: 'user-id' }),
      } as any;

      mockAuthService.prototype.hasPermission = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.emailExists = jest.fn().mockResolvedValue(false);
      mockUserService.prototype.phoneExists = jest.fn().mockResolvedValue(false);
      mockAuthService.prototype.hashPassword = jest.fn().mockResolvedValue('hashed-password');
      mockUserModel.fromCreateRequest = jest.fn().mockReturnValue(mockUser);
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);
      mockUserService.prototype.logUserAction = jest.fn().mockResolvedValue(undefined);

      const result = await userService.createUser(requestWithoutInvitation, 'creator-id');

      expect(result.user).toBe(mockUser);
      expect(result.invitation).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
      } as any;

      const mockDoc = {
        exists: true,
        data: () => ({ id: 'user-id', email: 'test@example.com' }),
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockUserModel.fromFirestore = jest.fn().mockReturnValue(mockUser);

      const result = await userService.getUserById('user-id');

      expect(result).toBe(mockUser);
      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('user-id');
    });

    it('should throw error for non-existent user', async () => {
      const mockDoc = {
        exists: false,
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);

      await expect(
        userService.getUserById('non-existent-id')
      ).rejects.toThrow(ERROR_CODES.USER_NOT_FOUND);
    });

    it('should throw error for invalid user data', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({ id: 'user-id' }),
      };

      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockUserModel.fromFirestore = jest.fn().mockReturnValue(null);

      await expect(
        userService.getUserById('user-id')
      ).rejects.toThrow(ERROR_CODES.USER_NOT_FOUND);
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
      } as any;

      const mockSnapshot = {
        empty: false,
        docs: [{
          data: () => ({ id: 'user-id', email: 'test@example.com' }),
        }],
      };

      mockFirestore.collection().where().limit().get.mockResolvedValue(mockSnapshot);
      mockUserModel.fromFirestore = jest.fn().mockReturnValue(mockUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toBe(mockUser);
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('email', '==', 'test@example.com');
    });

    it('should throw error for invalid email format', async () => {
      await expect(
        userService.getUserByEmail('invalid-email')
      ).rejects.toThrow(ERROR_CODES.INVALID_EMAIL);
    });

    it('should throw error for non-existent email', async () => {
      const mockSnapshot = {
        empty: true,
        docs: [],
      };

      mockFirestore.collection().where().limit().get.mockResolvedValue(mockSnapshot);

      await expect(
        userService.getUserByEmail('nonexistent@example.com')
      ).rejects.toThrow(ERROR_CODES.USER_NOT_FOUND);
    });
  });

  describe('updateUser', () => {
    const updateRequest: UpdateUserRequest = {
      displayName: 'Updated Name',
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+33987654321',
    };

    it('should update user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
        updateProfile: jest.fn(),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.canUpdateUser = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.validateUpdateRequest = jest.fn().mockResolvedValue(undefined);
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);
      mockUserService.prototype.logUserAction = jest.fn().mockResolvedValue(undefined);

      const result = await userService.updateUser('user-id', updateRequest, 'updater-id');

      expect(result).toBe(mockUser);
      expect(mockUser.updateProfile).toHaveBeenCalledWith(updateRequest);
      expect(mockUserService.prototype.saveUser).toHaveBeenCalledWith(mockUser);
    });

    it('should throw error for insufficient permissions', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.canUpdateUser = jest.fn().mockResolvedValue(false);

      await expect(
        userService.updateUser('user-id', updateRequest, 'updater-id')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it('should validate email uniqueness on update', async () => {
      const updateWithEmail = {
        ...updateRequest,
        email: 'newemail@example.com',
      };

      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.canUpdateUser = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.validateUpdateRequest = jest.fn().mockRejectedValue(
        new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS)
      );

      await expect(
        userService.updateUser('user-id', updateWithEmail, 'updater-id')
      ).rejects.toThrow(ERROR_CODES.EMAIL_ALREADY_EXISTS);
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', role: UserRole.PARTICIPANT }),
        changeRole: jest.fn(),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.canChangeRole = jest.fn().mockResolvedValue(true);
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);

      const result = await userService.changeUserRole('user-id', UserRole.ORGANIZER, 'changer-id');

      expect(result).toBe(mockUser);
      expect(mockUser.changeRole).toHaveBeenCalledWith(UserRole.ORGANIZER, 'changer-id');
      expect(mockUserService.prototype.saveUser).toHaveBeenCalledWith(mockUser);
    });

    it('should throw error for insufficient permissions', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', role: UserRole.PARTICIPANT }),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.canChangeRole = jest.fn().mockResolvedValue(false);

      await expect(
        userService.changeUserRole('user-id', UserRole.ADMIN, 'changer-id')
      ).rejects.toThrow(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status successfully', async () => {
      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', status: UserStatus.ACTIVE }),
        update: jest.fn(),
      } as any;

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);
      mockUserService.prototype.logUserAction = jest.fn().mockResolvedValue(undefined);

      const result = await userService.changeUserStatus(
        'user-id', 
        UserStatus.SUSPENDED, 
        'changer-id', 
        'Policy violation'
      );

      expect(result).toBe(mockUser);
      expect(mockUser.update).toHaveBeenCalledWith({ status: UserStatus.SUSPENDED });
    });

    it('should prevent self-suspension', async () => {
      await expect(
        userService.changeUserStatus('user-id', UserStatus.SUSPENDED, 'user-id', 'Self suspension')
      ).rejects.toThrow(ERROR_CODES.CANNOT_DELETE_SELF);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ];

      const mockSnapshot = {
        docs: mockUsers.map(user => ({
          data: () => user,
        })),
      };

      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockUserModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockUsers[0] })
        .mockReturnValueOnce({ getData: () => mockUsers[1] });
      mockUserService.prototype.countUsers = jest.fn().mockResolvedValue(10);

      const result = await userService.getUsers({
        page: 1,
        limit: 2,
        role: UserRole.PARTICIPANT,
      });

      expect(result.users).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });

    it('should filter by role', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockUserService.prototype.countUsers = jest.fn().mockResolvedValue(0);

      await userService.getUsers({ role: UserRole.ADMIN });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('role', '==', UserRole.ADMIN);
    });

    it('should filter by status', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);
      mockUserService.prototype.countUsers = jest.fn().mockResolvedValue(0);

      await userService.getUsers({ status: UserStatus.ACTIVE });

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('status', '==', UserStatus.ACTIVE);
    });

    it('should validate pagination parameters', async () => {
      await expect(
        userService.getUsers({ page: 0, limit: 1000 })
      ).rejects.toThrow(ERROR_CODES.BAD_REQUEST);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockInvitationDoc = {
        empty: false,
        docs: [{
          data: () => ({
            id: 'invitation-id',
            email: 'test@example.com',
            expiresAt: new Date(Date.now() + 86400000), // 1 day from now
          }),
        }],
      };

      const mockUser = {
        id: 'user-id',
        getData: () => ({ id: 'user-id', email: 'test@example.com' }),
        update: jest.fn(),
      } as any;

      mockFirestore.collection().where().get.mockResolvedValue(mockInvitationDoc);
      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.hashPassword = jest.fn().mockResolvedValue('hashed-password');
      mockUserService.prototype.saveUser = jest.fn().mockResolvedValue(undefined);
      mockFirestore.collection().doc().update.mockResolvedValue(undefined);

      const result = await userService.acceptInvitation('valid-token', 'password123');

      expect(result).toBe(mockUser);
      expect(mockUser.update).toHaveBeenCalledWith({
        hashedPassword: 'hashed-password',
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
    });

    it('should throw error for invalid token', async () => {
      const mockInvitationDoc = {
        empty: true,
        docs: [],
      };

      mockFirestore.collection().where().get.mockResolvedValue(mockInvitationDoc);

      await expect(
        userService.acceptInvitation('invalid-token', 'password123')
      ).rejects.toThrow(ERROR_CODES.INVALID_TOKEN);
    });

    it('should throw error for expired invitation', async () => {
      const mockInvitationDoc = {
        empty: false,
        docs: [{
          data: () => ({
            id: 'invitation-id',
            email: 'test@example.com',
            expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          }),
        }],
      };

      mockFirestore.collection().where().get.mockResolvedValue(mockInvitationDoc);

      await expect(
        userService.acceptInvitation('expired-token', 'password123')
      ).rejects.toThrow(ERROR_CODES.INVALID_TOKEN);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockTotalSnapshot = { size: 100 };
      const mockRoleStats = { [UserRole.PARTICIPANT]: 80, [UserRole.ORGANIZER]: 15, [UserRole.ADMIN]: 5 };
      const mockStatusStats = { [UserStatus.ACTIVE]: 90, [UserStatus.INACTIVE]: 8, [UserStatus.SUSPENDED]: 2 };
      const mockDeptStats = { 'IT': 30, 'HR': 20, 'Finance': 25, 'Non défini': 25 };

      mockFirestore.collection().get.mockResolvedValue(mockTotalSnapshot);
      mockUserService.prototype.getUsersByRole = jest.fn().mockResolvedValue(mockRoleStats);
      mockUserService.prototype.getUsersByStatus = jest.fn().mockResolvedValue(mockStatusStats);
      mockUserService.prototype.getUsersByDepartment = jest.fn().mockResolvedValue(mockDeptStats);
      mockUserService.prototype.getRecentUsers = jest.fn().mockResolvedValue(15);

      const result = await userService.getUserStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(90);
      expect(result.inactive).toBe(8);
      expect(result.suspended).toBe(2);
      expect(result.byRole).toEqual(mockRoleStats);
      expect(result.byDepartment).toEqual(mockDeptStats);
      expect(result.recentSignups).toBe(15);
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', role: UserRole.PARTICIPANT },
      ];

      const mockSnapshot = {
        docs: mockUsers.map(user => ({
          data: () => user,
        })),
      };

      mockFirestore.collection().where().limit().get.mockResolvedValue(mockSnapshot);
      mockUserModel.fromFirestore = jest.fn()
        .mockReturnValueOnce({ getData: () => mockUsers[0] });

      const filters = {
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        department: 'IT',
      };

      const result = await userService.searchUsers(filters, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUsers[0]);
    });

    it('should search users with date range', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().limit().get.mockResolvedValue(mockSnapshot);

      const filters = {
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
      };

      await userService.searchUsers(filters);

      expect(mockFirestore.collection().where).toHaveBeenCalledWith('createdAt', '>=', filters.dateRange.start);
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('createdAt', '<=', filters.dateRange.end);
    });

    it('should search users with skills filter', async () => {
      const mockSnapshot = { docs: [] };
      mockFirestore.collection().where().limit().get.mockResolvedValue(mockSnapshot);

      const filters = {
        skills: ['JavaScript', 'TypeScript'],
      };

      await userService.searchUsers(filters);

      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'profile.skills', 
        'array-contains-any', 
        filters.skills
      );
    });
  });
});