// tests/backend/integration/auth.routes.test.ts
import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { globalErrorHandler } from '@/middleware/errorHandler';

// Mock services
jest.mock('@/services/auth.service');
jest.mock('@/services/user.service');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('Auth Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(globalErrorHandler);
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
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

      mockAuthService.register = jest.fn().mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
        message: 'User registered successfully'
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
        message: 'User registered successfully',
      });
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        organization: '',
        password: '123',
        acceptTerms: false,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should return 409 for existing email', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Email already exists')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already exists');
    });
  });

  describe('POST /auth/login', () => {
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

      mockAuthService.prototype.validateCredentials = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.generateTokens = jest.fn().mockResolvedValue(mockTokens);
      mockUserService.prototype.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
        message: 'Login successful',
      });
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
        rememberMe: false,
      };

      mockAuthService.prototype.validateCredentials = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // missing password
      };

      const response = await request(app)
        .post('/auth/login')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should set refresh token cookie when rememberMe is true', async () => {
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

      mockAuthService.prototype.validateCredentials = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.generateTokens = jest.fn().mockResolvedValue(mockTokens);
      mockUserService.prototype.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-token');
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('Secure');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      mockAuthService.prototype.revokeToken = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer access-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful',
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
    });

    it('should logout successfully even without token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful',
      });
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email successfully', async () => {
      const requestData = {
        email: 'john.doe@example.com',
      };

      mockAuthService.prototype.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset email sent',
      });
    });

    it('should return success even for non-existent email (security)', async () => {
      const requestData = {
        email: 'nonexistent@example.com',
      };

      mockAuthService.prototype.sendPasswordResetEmail = jest.fn().mockRejectedValue(
        new Error('User not found')
      );

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset email sent',
      });
    });

    it('should return 400 for invalid email format', async () => {
      const requestData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: 'newpassword123',
      };

      mockAuthService.prototype.resetPassword = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password reset successful',
      });
    });

    it('should return 400 for invalid reset token', async () => {
      const resetData = {
        token: 'invalid-token',
        password: 'newpassword123',
      };

      mockAuthService.prototype.resetPassword = jest.fn().mockRejectedValue(
        new Error('Invalid or expired token')
      );

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should return 400 for weak password', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: '123',
      };

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/refresh-token', () => {
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

      mockAuthService.prototype.refreshTokens = jest.fn().mockResolvedValue({
        user: mockUser,
        tokens: mockNewTokens,
      });

      const response = await request(app)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=valid-refresh-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockUser,
          tokens: mockNewTokens,
        },
        message: 'Tokens refreshed successfully',
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockAuthService.prototype.refreshTokens = jest.fn().mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh-token')
        .set('Cookie', 'refreshToken=invalid-refresh-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should return 401 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token required');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const verificationData = {
        token: 'valid-verification-token',
      };

      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should return 400 for invalid verification token', async () => {
      const verificationData = {
        token: 'invalid-token',
      };

      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue(
        new Error('Invalid verification token')
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid verification token');
    });
  });

  describe('POST /auth/send-email-verification', () => {
    it('should send email verification successfully', async () => {
      const verificationData = {
        email: 'john.doe@example.com',
      };

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Email de vérification renvoyé avec succès',
      });

      expect(mockAuthService.prototype.resendEmailVerification).toHaveBeenCalledWith(
        'john.doe@example.com',
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should return 400 for invalid email', async () => {
      const verificationData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should return 404 for non-existent email', async () => {
      const verificationData = {
        email: 'nonexistent@example.com',
      };

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue(
        new Error('User not found')
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    it('should handle rate limiting', async () => {
      const verificationData = {
        email: 'john.doe@example.com',
      };

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully for authenticated user', async () => {
      const changePasswordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
      };

      mockAuthService.prototype.changePassword = jest.fn().mockResolvedValue(undefined);

      // Mock authentication middleware
      app.use('/auth/change-password', (req, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(changePasswordData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const changePasswordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .post('/auth/change-password')
        .send(changePasswordData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('should return 400 for incorrect current password', async () => {
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
      };

      mockAuthService.prototype.changePassword = jest.fn().mockRejectedValue(
        new Error('Current password is incorrect')
      );

      // Mock authentication middleware
      app.use('/auth/change-password', (req, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(changePasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      mockAuthService.prototype.validateCredentials = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      // Make multiple requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should apply rate limiting to forgot-password endpoint', async () => {
      const requestData = {
        email: 'test@example.com',
      };

      mockAuthService.prototype.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

      // Make multiple requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/auth/forgot-password')
          .send(requestData)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format in registration', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should validate password strength in registration', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organization: 'Test Company',
        password: '123',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    it('should require terms acceptance in registration', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: false,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('terms');
    });
  });
});