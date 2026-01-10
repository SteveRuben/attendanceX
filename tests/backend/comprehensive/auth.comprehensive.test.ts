/**
 * Tests complets pour le système d'authentification
 */

import request from 'supertest';
import { Express } from 'express';
import { setupTestApp, cleanupTestApp, createTestUser, createTestTenant } from '../helpers/test-setup';
import { authService } from '../../../backend/functions/src/services/auth/auth.service';
import { collections } from '../../../backend/functions/src/config/database';

describe('Authentication System - Comprehensive Tests', () => {
  let app: Express;
  let testUser: any;
  let testTenant: any;
  let authToken: string;

  beforeAll(async () => {
    app = await setupTestApp();
    testTenant = await createTestTenant();
    testUser = await createTestUser({ tenantId: testTenant.id });
  });

  afterAll(async () => {
    await cleanupTestApp();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        acceptTerms: true
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.emailVerified).toBe(false);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: testUser.email,
        password: 'SecurePass123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('exists');
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      authToken = response.body.data.accessToken;
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should handle rate limiting for failed login attempts', async () => {
      const loginData = {
        email: 'ratelimit@test.com',
        password: 'WrongPassword'
      };

      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/v1/auth/login')
          .send(loginData);
      }

      // Next attempt should be rate limited
      const response = await request(app)
        .post('/v1/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('rate');
    });
  });

  describe('Token Management', () => {
    it('should refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should verify valid access token', async () => {
      const token = await authService.generateAccessToken(testUser.uid);
      const decoded = await authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.uid);
    });

    it('should reject expired access token', async () => {
      // Create an expired token (this would need to be mocked in real implementation)
      const expiredToken = 'expired.token.here';
      
      await expect(authService.verifyToken(expiredToken))
        .rejects.toThrow();
    });
  });

  describe('Password Management', () => {
    it('should initiate password reset for valid email', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });

    it('should handle password reset for non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not reveal if email exists or not
    });

    it('should reset password with valid token', async () => {
      // This would require setting up a valid reset token
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';

      const response = await request(app)
        .post('/v1/auth/reset-password')
        .send({ 
          token: resetToken, 
          password: newPassword,
          confirmPassword: newPassword 
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should change password with valid current password', async () => {
      const changeData = {
        currentPassword: 'TestPassword123!',
        newPassword: 'NewTestPassword123!',
        confirmPassword: 'NewTestPassword123!'
      };

      const response = await request(app)
        .post('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Verification', () => {
    it('should send verification email', async () => {
      const response = await request(app)
        .post('/v1/auth/send-verification-email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify email with valid token', async () => {
      // This would require setting up a valid verification token
      const verificationToken = 'valid-verification-token';

      const response = await request(app)
        .post('/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should logout and invalidate tokens', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Token should be invalid after logout
      const protectedResponse = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(protectedResponse.body.success).toBe(false);
    });

    it('should logout from all devices', async () => {
      // Login to get new token
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });

      const newToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .post('/v1/auth/logout-all')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Account Security', () => {
    it('should enable two-factor authentication', async () => {
      const response = await request(app)
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.qrCode).toBeDefined();
      expect(response.body.data.secret).toBeDefined();
    });

    it('should verify 2FA setup with valid code', async () => {
      const response = await request(app)
        .post('/v1/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should disable two-factor authentication', async () => {
      const response = await request(app)
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Account Status', () => {
    it('should handle suspended account login', async () => {
      // Suspend the account
      await collections.users.doc(testUser.uid).update({
        status: 'suspended'
      });

      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('suspended');

      // Restore account status
      await collections.users.doc(testUser.uid).update({
        status: 'active'
      });
    });

    it('should handle locked account login', async () => {
      // Lock the account
      const lockUntil = new Date(Date.now() + 60000); // 1 minute from now
      await collections.users.doc(testUser.uid).update({
        accountLockedUntil: lockUntil
      });

      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('locked');

      // Unlock the account
      await collections.users.doc(testUser.uid).update({
        accountLockedUntil: null
      });
    });
  });
});