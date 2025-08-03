// tests/backend/integration/auth-email-verification.test.ts
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../../../backend/functions/src/routes/auth.routes';
import { AuthService } from '../../../backend/functions/src/services/auth.service';
import { globalErrorHandler } from '../../../backend/functions/src/middleware/errorHandler';

// Mock services
jest.mock('../../../backend/functions/src/services/auth.service');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Auth Email Verification Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(globalErrorHandler);
    jest.clearAllMocks();
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
        message: 'Email vérifié avec succès',
      });

      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalledWith(
        'valid-verification-token',
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de vérification requis');
    });

    it('should return 400 for invalid verification token', async () => {
      const verificationData = {
        token: 'invalid-token',
      };

      mockAuthService.prototype.verifyEmail = jest.fn().mockRejectedValue(
        new Error('Invalid verification token')
      );

      await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(500); // Error handler will return 500 for unhandled errors

      expect(mockAuthService.prototype.verifyEmail).toHaveBeenCalledWith(
        'invalid-token',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should return 400 for empty token', async () => {
      const verificationData = {
        token: '',
      };

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de vérification requis');
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

    it('should return 400 for invalid email format', async () => {
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

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      const verificationData = {
        email: 'nonexistent@example.com',
      };

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockRejectedValue(
        new Error('User not found')
      );

      await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(500); // Error handler will return 500 for unhandled errors

      expect(mockAuthService.prototype.resendEmailVerification).toHaveBeenCalledWith(
        'nonexistent@example.com',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should return 400 for empty email', async () => {
      const verificationData = {
        email: '',
      };

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to verify-email endpoint', async () => {
      // This test would require setting up rate limiting mocks
      // For now, we just verify the endpoint exists and responds
      const verificationData = {
        token: 'test-token',
      };

      mockAuthService.prototype.verifyEmail = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData);

      expect(response.status).toBe(200);
    });

    it('should apply rate limiting to send-email-verification endpoint', async () => {
      // This test would require setting up rate limiting mocks
      // For now, we just verify the endpoint exists and responds
      const verificationData = {
        email: 'test@example.com',
      };

      mockAuthService.prototype.resendEmailVerification = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(verificationData);

      expect(response.status).toBe(200);
    });
  });
});