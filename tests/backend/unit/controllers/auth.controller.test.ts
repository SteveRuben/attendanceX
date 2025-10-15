// tests/backend/unit/controllers/auth.controller.test.ts
import { Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ValidationError, AuthenticationError, ConflictError } from '../utils/errors';

// Mock services
jest.mock('../services/auth.service');
jest.mock('../services/user.service');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'participant',
        status: 'active',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRequest.body = userData;
      mockUserService.prototype.createUser = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.generateTokens = jest.fn().mockResolvedValue(mockTokens);

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.prototype.createUser).toHaveBeenCalledWith(userData);
      expect(mockAuthService.prototype.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
        message: 'User registered successfully',
      });
    });

    it('should handle email already exists error', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      mockRequest.body = userData;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new ConflictError('Email already exists')
      );

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError));
    });

    it('should handle validation errors', async () => {
      const invalidUserData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        organization: '',
        password: '123',
        acceptTerms: false,
      };

      mockRequest.body = invalidUserData;
      mockUserService.prototype.createUser = jest.fn().mockRejectedValue(
        new ValidationError('Invalid user data')
      );

      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'participant',
        status: 'active',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRequest.body = loginData;
      mockAuthService.prototype.validateCredentials = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.generateTokens = jest.fn().mockResolvedValue(mockTokens);
      mockUserService.prototype.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.validateCredentials).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );
      expect(mockAuthService.prototype.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(mockUserService.prototype.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
        message: 'Login successful',
      });
    });

    it('should handle invalid credentials', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      mockRequest.body = loginData;
      mockAuthService.prototype.validateCredentials = jest.fn().mockRejectedValue(
        new AuthenticationError('Invalid credentials')
      );

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should handle inactive user account', async () => {
      const loginData = {
        email: 'inactive@example.com',
        password: 'password123',
        rememberMe: false,
      };

      mockRequest.body = loginData;
      mockAuthService.prototype.validateCredentials = jest.fn().mockRejectedValue(
        new AuthenticationError('Account is inactive')
      );

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should set remember me cookie when requested', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'participant',
        status: 'active',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockRequest.body = loginData;
      mockAuthService.prototype.validateCredentials = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.generateTokens = jest.fn().mockResolvedValue(mockTokens);
      mockUserService.prototype.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: expect.any(Number),
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
      };

      mockRequest.user = mockUser;
      mockRequest.headers = { authorization: 'Bearer access-token' };
      mockAuthService.prototype.revokeToken = jest.fn().mockResolvedValue(undefined);

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.revokeToken).toHaveBeenCalledWith('access-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should handle logout without token', async () => {
      mockRequest.user = null;
      mockRequest.headers = {};

      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      const requestData = {
        email: 'john.doe@example.com',
      };

      mockRequest.body = requestData;
      mockAuthService.prototype.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

      await authController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.sendPasswordResetEmail).toHaveBeenCalledWith(requestData.email);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent',
      });
    });

    it('should handle user not found gracefully', async () => {
      const requestData = {
        email: 'nonexistent@example.com',
      };

      mockRequest.body = requestData;
      mockAuthService.prototype.sendPasswordResetEmail = jest.fn().mockRejectedValue(
        new ValidationError('User not found')
      );

      await authController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      // Should still return success for security reasons
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: 'newpassword123',
      };

      mockRequest.body = resetData;
      mockAuthService.prototype.resetPassword = jest.fn().mockResolvedValue(undefined);

      await authController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.password
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful',
      });
    });

    it('should handle invalid reset token', async () => {
      const resetData = {
        token: 'invalid-token',
        password: 'newpassword123',
      };

      mockRequest.body = resetData;
      mockAuthService.prototype.resetPassword = jest.fn().mockRejectedValue(
        new ValidationError('Invalid or expired token')
      );

      await authController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should handle expired reset token', async () => {
      const resetData = {
        token: 'expired-token',
        password: 'newpassword123',
      };

      mockRequest.body = resetData;
      mockAuthService.prototype.resetPassword = jest.fn().mockRejectedValue(
        new ValidationError('Token has expired')
      );

      await authController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'participant',
        status: 'active',
      };

      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockRequest.cookies = { refreshToken: 'valid-refresh-token' };
      mockAuthService.prototype.refreshTokens = jest.fn().mockResolvedValue({
        user: mockUser,
        tokens: mockNewTokens,
      });

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          tokens: mockNewTokens,
        },
        message: 'Tokens refreshed successfully',
      });
    });

    it('should handle invalid refresh token', async () => {
      mockRequest.cookies = { refreshToken: 'invalid-refresh-token' };
      mockAuthService.prototype.refreshTokens = jest.fn().mockRejectedValue(
        new AuthenticationError('Invalid refresh token')
      );

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should handle missing refresh token', async () => {
      mockRequest.cookies = {};

      await authController.refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verificationData = {
        token: 'valid-verification-token',
      };

      mockRequest.body = verificationData;
      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalledWith(verificationData.token);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should handle invalid verification token', async () => {
      const verificationData = {
        token: 'invalid-token',
      };

      mockRequest.body = verificationData;
      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue(
        new ValidationError('Invalid verification token')
      );

      await authController.verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
      };

      mockRequest.body = changePasswordData;
      mockRequest.user = mockUser;
      mockAuthService.prototype.changePassword = jest.fn().mockResolvedValue(undefined);

      await authController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.prototype.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordData.currentPassword,
        changePasswordData.newPassword
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should handle incorrect current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
      };

      mockRequest.body = changePasswordData;
      mockRequest.user = mockUser;
      mockAuthService.prototype.changePassword = jest.fn().mockRejectedValue(
        new AuthenticationError('Current password is incorrect')
      );

      await authController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
  });
});