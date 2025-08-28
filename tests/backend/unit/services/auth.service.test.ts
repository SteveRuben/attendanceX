import { AuthService } from '../../../../backend/functions/src/services/auth.service';
import { UserModel } from '../../../../backend/functions/src/models/user.model';
import { UserRole, UserStatus, LoginRequest, ERROR_CODES } from '@attendance-x/shared';
import { db } from '../../../../backend/functions/src/config';

// Mock dependencies
jest.mock('../../../../backend/functions/src/config', () => ({
  db: {
    collection: jest.fn(),
  },
}));

jest.mock('../../../../backend/functions/src/models/user.model');
jest.mock('../../../../backend/functions/src/services/notification', () => ({
  notificationService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendSms: jest.fn().mockResolvedValue(true),
    sendPush: jest.fn().mockResolvedValue(true),
    sendNotification: jest.fn().mockResolvedValue(true),
  },
  emailVerificationService: {
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    verifyToken: jest.fn().mockResolvedValue(true),
    canRequestVerification: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock('../../../../backend/functions/src/services/user.service', () => ({
  userService: {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

describe('AuthService - Login Flow Verification Checks', () => {
  let authService: AuthService;
  let mockUser: jest.Mocked<UserModel>;
  let mockUserQuery: any;

  beforeEach(() => {
    authService = new AuthService();

    // Mock user data
    const mockUserData = {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.PARTICIPANT,
      status: UserStatus.PENDING,
      emailVerified: false,
      emailVerificationAttempts: 2,
      emailVerificationSentAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      hashedPassword: 'hashed-password',
      permissions: {},
      profile: { preferences: {} },
      phoneVerified: false,
      twoFactorEnabled: false,
      loginCount: 0,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock UserModel instance
    mockUser = {
      id: 'test-user-id',
      getData: jest.fn().mockReturnValue(mockUserData),
      resetFailedLoginAttempts: jest.fn(),
      incrementFailedLoginAttempts: jest.fn().mockReturnValue({ isLocked: false }),
      isAccountLocked: jest.fn().mockReturnValue(false),
      isPasswordExpired: jest.fn().mockReturnValue(false),
    } as any;

    // Mock Firestore query
    mockUserQuery = {
      empty: false,
      docs: [{ id: 'test-user-id', data: () => mockUserData }],
    };

    // Mock database collection
    (db.collection as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockUserQuery),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      doc: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => mockUserData,
        }),
      }),
    });

    // Mock UserModel.fromFirestore
    (UserModel.fromFirestore as jest.Mock).mockReturnValue(mockUser);

    // Mock auth service methods
    jest.spyOn(authService, 'checkRateLimit' as any).mockResolvedValue(true);
    jest.spyOn(authService, 'verifyPassword' as any).mockResolvedValue(true);
    jest.spyOn(authService, 'canRequestVerification').mockResolvedValue(true);
    jest.spyOn(authService, 'logSecurityEvent').mockResolvedValue(undefined);
    jest.spyOn(authService, 'analyzeLoginPattern').mockResolvedValue('low');
    jest.spyOn(authService, 'generateTokens' as any).mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    });
    jest.spyOn(authService, 'createSession').mockResolvedValue('mock-session-id');
    jest.spyOn(authService, 'saveUser' as any).mockResolvedValue(undefined);
    jest.spyOn(authService, 'validateLoginRequest' as any).mockReturnValue({ isValid: true, errors: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Verification Status Check', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'ValidPassword123!',
      deviceInfo: { type: 'web' as const, name: 'Chrome' },
    };

    it('should reject login for user with PENDING status', async () => {
      // User has PENDING status (not verified)
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.PENDING,
        emailVerified: false,
      });

      await expect(
        authService.login(loginRequest, '127.0.0.1', 'test-agent')
      ).rejects.toThrow();

      // Verify the error contains proper structure
      try {
        await authService.login(loginRequest, '127.0.0.1', 'test-agent');
      } catch (error: any) {
        expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
        expect(error.message).toContain('Email non vérifié');
        expect(error.details).toHaveProperty('email', 'test@example.com');
        expect(error.details).toHaveProperty('canResendVerification', true);
        expect(error.details).toHaveProperty('verificationAttempts', 2);
      }
    });

    it('should reject login for user with emailVerified false', async () => {
      // User has ACTIVE status but emailVerified is false
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.ACTIVE,
        emailVerified: false,
      });

      await expect(
        authService.login(loginRequest, '127.0.0.1', 'test-agent')
      ).rejects.toThrow();

      try {
        await authService.login(loginRequest, '127.0.0.1', 'test-agent');
      } catch (error: any) {
        expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
        expect(error.details).toHaveProperty('canResendVerification', true);
      }
    });

    it('should include rate limit information when user cannot request verification', async () => {
      // Mock canRequestVerification to return false (rate limited)
      jest.spyOn(authService, 'canRequestVerification').mockResolvedValue(false);

      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.PENDING,
        emailVerified: false,
      });

      try {
        await authService.login(loginRequest, '127.0.0.1', 'test-agent');
      } catch (error: any) {
        expect(error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
        expect(error.message).toContain('limite de demandes');
        expect(error.details.canResendVerification).toBe(false);
      }
    });

    it('should log security event for email not verified login attempt', async () => {
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.PENDING,
        emailVerified: false,
      });

      try {
        await authService.login(loginRequest, '127.0.0.1', 'test-agent');
      } catch (error) {
        // Verify security event was logged
        expect(authService.logSecurityEvent).toHaveBeenCalledWith({
          type: 'failed_login',
          userId: 'test-user-id',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          details: {
            reason: 'email_not_verified',
            email: 'test@example.com',
            lastVerificationSent: expect.any(Date),
          },
          riskLevel: 'low',
        });
      }
    });

    it('should allow login for verified user', async () => {
      // User is fully verified
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });

      const result = await authService.login(loginRequest, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result).toHaveProperty('sessionId', 'mock-session-id');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should maintain existing login flow for verified users', async () => {
      // User is fully verified
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });

      await authService.login(loginRequest, '127.0.0.1', 'test-agent');

      // Verify all expected methods were called for successful login
      expect(mockUser.resetFailedLoginAttempts).toHaveBeenCalled();
      expect(authService.createSession).toHaveBeenCalledWith(
        mockUser,
        loginRequest.deviceInfo,
        '127.0.0.1',
        'test-agent'
      );
      expect(authService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login',
          userId: 'test-user-id',
          details: expect.objectContaining({
            successful: true,
          }),
        })
      );
    });

    it('should provide helpful error messages with resend options', async () => {
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.PENDING,
        emailVerified: false,
        emailVerificationSentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      });

      try {
        await authService.login(loginRequest, '127.0.0.1', 'test-agent');
      } catch (error: any) {

        // Verify helpful error message
        expect(error.message).toContain('Vérifiez votre boîte mail');
        expect(error.message).toContain('demandez un nouveau lien');

        // Verify resend options are provided
        expect(error.details).toHaveProperty('canResendVerification', true);
        expect(error.details).toHaveProperty('lastVerificationSent');
        expect(error.details).toHaveProperty('email', 'test@example.com');
      }
    });

    it('should handle other security check errors normally', async () => {
      // User is verified but account is locked
      mockUser.getData.mockReturnValue({
        ...mockUser.getData(),
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });

      mockUser.isAccountLocked.mockReturnValue(true);

      await expect(
        authService.login(loginRequest, '127.0.0.1', 'test-agent')
      ).rejects.toThrow(ERROR_CODES.ACCOUNT_LOCKED);
    });
  });
});