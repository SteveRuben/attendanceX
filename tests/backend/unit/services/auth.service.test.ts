// tests/backend/unit/services/auth.service.test.ts
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { EmailService } from '@/services/notification/EmailService';
import { ValidationError, AuthenticationError, ConflictError } from '@/utils/errors';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { admin } from '@/config/firebase';

// Mock dependencies
jest.mock('@/services/user.service');
jest.mock('@/services/notification/EmailService');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@/config/firebase', () => ({
  admin: {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn(),
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
  },
}));

const mockUserService = UserService as jest.MockedClass<typeof UserService>;
const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  let mockFirestore: any;

  beforeEach(() => {
    authService = new AuthService();
    mockFirestore = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn(),
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        })),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    };
    (admin.firestore as jest.Mock).mockReturnValue(mockFirestore);
    jest.clearAllMocks();
  });

  describe('validateCredentials', () => {
    it('should validate credentials successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        status: 'active',
        emailVerified: true,
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.validateCredentials('test@example.com', 'password123');

      expect(mockUserService.prototype.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result).toEqual(expect.objectContaining({
        id: 'user-id',
        email: 'test@example.com',
      }));
    });

    it('should throw error for non-existent user', async () => {
      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        authService.validateCredentials('nonexistent@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw error for incorrect password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        status: 'active',
        emailVerified: true,
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        authService.validateCredentials('test@example.com', 'wrongpassword')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw error for inactive user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        status: 'inactive',
        emailVerified: true,
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);

      await expect(
        authService.validateCredentials('test@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw error for unverified email', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashedpassword',
        status: 'active',
        emailVerified: false,
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);

      await expect(
        authService.validateCredentials('test@example.com', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
      };

      mockJwt.sign = jest.fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const mockDoc = {
        set: jest.fn().mockResolvedValue(undefined),
      };
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      const result = await authService.generateTokens(mockUser);

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          email: 'test@example.com',
          role: 'participant',
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '15m' })
      );
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          type: 'refresh',
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '7d' })
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should store refresh token in database', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
      };

      mockJwt.sign = jest.fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const mockDoc = {
        set: jest.fn().mockResolvedValue(undefined),
      };
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      await authService.generateTokens(mockUser);

      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          token: 'refresh-token',
          createdAt: expect.any(Date),
          expiresAt: expect.any(Date),
        })
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'participant',
      };

      const mockTokenDoc = {
        exists: true,
        data: () => ({
          userId: 'user-id',
          token: 'refresh-token',
          expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        }),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockTokenDoc],
          }),
        }),
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(undefined),
          set: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockJwt.sign = jest.fn()
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshTokens('refresh-token');

      expect(result).toEqual({
        user: mockUser,
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });
    });

    it('should throw error for invalid refresh token', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        }),
      });

      await expect(
        authService.refreshTokens('invalid-refresh-token')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw error for expired refresh token', async () => {
      const mockTokenDoc = {
        exists: true,
        data: () => ({
          userId: 'user-id',
          token: 'refresh-token',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        }),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockTokenDoc],
          }),
        }),
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await expect(
        authService.refreshTokens('expired-refresh-token')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockJwt.sign = jest.fn().mockReturnValue('reset-token');
      mockEmailService.prototype.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

      const mockDoc = {
        set: jest.fn().mockResolvedValue(undefined),
      };
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDoc),
      });

      await authService.sendPasswordResetEmail('test@example.com');

      expect(mockUserService.prototype.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          email: 'test@example.com',
          type: 'password-reset',
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '1h' })
      );
      expect(mockEmailService.prototype.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'reset-token'
      );
    });

    it('should throw error for non-existent user', async () => {
      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(null);

      await expect(
        authService.sendPasswordResetEmail('nonexistent@example.com')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockTokenDoc = {
        exists: true,
        data: () => ({
          userId: 'user-id',
          email: 'test@example.com',
          type: 'password-reset',
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        }),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockTokenDoc],
          }),
        }),
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockBcrypt.hash = jest.fn().mockResolvedValue('new-hashed-password');
      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(undefined);

      await authService.resetPassword('reset-token', 'newpassword123');

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith('user-id', {
        password: 'new-hashed-password',
        mustChangePassword: false,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error for invalid reset token', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        }),
      });

      await expect(
        authService.resetPassword('invalid-token', 'newpassword123')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for expired reset token', async () => {
      const mockTokenDoc = {
        exists: true,
        data: () => ({
          userId: 'user-id',
          email: 'test@example.com',
          type: 'password-reset',
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        }),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockTokenDoc],
          }),
        }),
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      });

      await expect(
        authService.resetPassword('expired-token', 'newpassword123')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-id',
        password: 'current-hashed-password',
      };

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockBcrypt.hash = jest.fn().mockResolvedValue('new-hashed-password');
      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(undefined);

      await authService.changePassword('user-id', 'currentpassword', 'newpassword123');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('currentpassword', 'current-hashed-password');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith('user-id', {
        password: 'new-hashed-password',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error for incorrect current password', async () => {
      const mockUser = {
        id: 'user-id',
        password: 'current-hashed-password',
      };

      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        authService.changePassword('user-id', 'wrongpassword', 'newpassword123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw error for non-existent user', async () => {
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(null);

      await expect(
        authService.changePassword('nonexistent-user', 'currentpassword', 'newpassword123')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockTokenDoc = {
        exists: true,
        data: () => ({
          userId: 'user-id',
          email: 'test@example.com',
          type: 'email-verification',
          expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        }),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [mockTokenDoc],
          }),
        }),
        doc: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      });

      mockUserService.prototype.updateUser = jest.fn().mockResolvedValue(undefined);

      await authService.verifyEmail('verification-token');

      expect(mockUserService.prototype.updateUser).toHaveBeenCalledWith('user-id', {
        emailVerified: true,
        status: 'active',
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error for invalid verification token', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        }),
      });

      await expect(
        authService.verifyEmail('invalid-token')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      const mockDoc = {
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ ref: mockDoc }],
          }),
        }),
      });

      await authService.revokeToken('token-to-revoke');

      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should handle non-existent token gracefully', async () => {
      mockFirestore.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            empty: true,
            docs: [],
          }),
        }),
      });

      // Should not throw error
      await expect(authService.revokeToken('nonexistent-token')).resolves.toBeUndefined();
    });
  });
});