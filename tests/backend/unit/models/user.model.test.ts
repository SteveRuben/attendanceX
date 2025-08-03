import { UserModel } from '@/models/user.model';
import { UserRole, UserStatus, CreateUserRequest } from '@attendance-x/shared';

describe('UserModel', () => {
  const mockUserData = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    status: UserStatus.PENDING,
    emailVerified: false,
    emailVerificationAttempts: 0,
    verificationHistory: [],
    permissions: {
      canCreateEvents: false,
      canManageUsers: false,
      canViewReports: false,
      canManageSettings: false,
      canSendNotifications: false,
      canExportData: false,
      canManageRoles: false,
      canAccessAnalytics: false,
      canModerateContent: false,
      canManageIntegrations: false,
    },
    profile: {
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        language: "fr",
        theme: "light" as const,
        timezone: "Europe/Paris",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h" as const,
        weekStartsOn: 1,
      }
    },
    phoneVerified: false,
    twoFactorEnabled: false,
    loginCount: 0,
    failedLoginAttempts: 0,
    hashedPassword: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Email Verification Fields', () => {
    it('should validate verification fields correctly', () => {
      const userModel = new UserModel(mockUserData);
      const validation = userModel.validateVerificationFields();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid emailVerificationAttempts', () => {
      const invalidData = {
        ...mockUserData,
        emailVerificationAttempts: -1
      };
      
      const userModel = new UserModel(invalidData);
      const validation = userModel.validateVerificationFields();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('emailVerificationAttempts must be a non-negative integer');
    });

    it('should reject excessive emailVerificationAttempts', () => {
      const invalidData = {
        ...mockUserData,
        emailVerificationAttempts: 101
      };
      
      const userModel = new UserModel(invalidData);
      const validation = userModel.validateVerificationFields();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('emailVerificationAttempts cannot exceed 100');
    });

    it('should validate verification history entries', () => {
      const validData = {
        ...mockUserData,
        verificationHistory: [
          {
            sentAt: new Date(),
            ipAddress: '192.168.1.1'
          }
        ]
      };
      
      const userModel = new UserModel(validData);
      const validation = userModel.validateVerificationFields();
      
      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid IP addresses in verification history', () => {
      const invalidData = {
        ...mockUserData,
        verificationHistory: [
          {
            sentAt: new Date(),
            ipAddress: 'invalid-ip'
          }
        ]
      };
      
      const userModel = new UserModel(invalidData);
      const validation = userModel.validateVerificationFields();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('verificationHistory[0].ipAddress must be a valid IP address');
    });
  });

  describe('Email Verification Methods', () => {
    it('should allow email verification request for unverified user', () => {
      const userModel = new UserModel(mockUserData);
      
      expect(userModel.canRequestEmailVerification()).toBe(true);
    });

    it('should not allow email verification request for verified user', () => {
      const verifiedData = {
        ...mockUserData,
        emailVerified: true
      };
      
      const userModel = new UserModel(verifiedData);
      
      expect(userModel.canRequestEmailVerification()).toBe(false);
    });

    it('should not allow email verification request when rate limited', () => {
      const rateLimitedData = {
        ...mockUserData,
        emailVerificationAttempts: 3,
        lastVerificationRequestAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      };
      
      const userModel = new UserModel(rateLimitedData);
      
      expect(userModel.canRequestEmailVerification()).toBe(false);
    });

    it('should add verification history entry correctly', () => {
      const userModel = new UserModel(mockUserData);
      const ipAddress = '192.168.1.1';
      
      userModel.addVerificationHistoryEntry(ipAddress);
      
      expect(userModel.data.verificationHistory).toHaveLength(1);
      expect(userModel.data.verificationHistory![0].ipAddress).toBe(ipAddress);
      expect(userModel.data.verificationHistory![0].sentAt).toBeInstanceOf(Date);
      expect(userModel.data.emailVerificationAttempts).toBe(1);
      expect(userModel.data.emailVerificationSentAt).toBeInstanceOf(Date);
      expect(userModel.data.lastVerificationRequestAt).toBeInstanceOf(Date);
    });

    it('should mark email as verified correctly', () => {
      const userModel = new UserModel({
        ...mockUserData,
        verificationHistory: [
          {
            sentAt: new Date(),
            ipAddress: '192.168.1.1'
          }
        ]
      });
      
      userModel.markEmailAsVerified('192.168.1.1');
      
      expect(userModel.data.emailVerified).toBe(true);
      expect(userModel.data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(userModel.data.status).toBe(UserStatus.ACTIVE);
      expect(userModel.data.verificationHistory![0].verifiedAt).toBeInstanceOf(Date);
    });

    it('should limit verification history to 10 entries', () => {
      const userModel = new UserModel({
        ...mockUserData,
        verificationHistory: Array(10).fill(null).map(() => ({
          sentAt: new Date(),
          ipAddress: '192.168.1.1'
        }))
      });
      
      userModel.addVerificationHistoryEntry('192.168.1.2');
      
      expect(userModel.data.verificationHistory).toHaveLength(10);
      expect(userModel.data.verificationHistory![9].ipAddress).toBe('192.168.1.2');
    });
  });

  describe('fromCreateRequest', () => {
    it('should initialize verification fields correctly', () => {
      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        displayName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        password: 'password123'
      };
      
      const userModel = UserModel.fromCreateRequest(createRequest);
      
      expect(userModel.data.emailVerificationAttempts).toBe(0);
      expect(userModel.data.verificationHistory).toEqual([]);
      expect(userModel.data.emailVerified).toBe(false);
    });
  });

  describe('validate', () => {
    it('should include verification field validation in main validate method', async () => {
      const invalidData = {
        ...mockUserData,
        emailVerificationAttempts: -1
      };
      
      const userModel = new UserModel(invalidData);
      
      await expect(userModel.validate()).rejects.toThrow('Verification fields validation failed');
    });
  });
});