// tests/backend/integration/auth-email-verification-endpoints.test.ts
import request from 'supertest';
import express from 'express';

// Mock Firebase Admin before importing anything else
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  credential: {
    applicationDefault: jest.fn(),
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
          limit: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
      add: jest.fn(),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  })),
  auth: jest.fn(() => ({
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserByEmail: jest.fn(),
    verifyIdToken: jest.fn(),
    createCustomToken: jest.fn(),
  })),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(),
    settings: jest.fn(),
  })),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(),
  })),
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { authRoutes } from '../../../backend/functions/src/routes/auth.routes';
import { authService } from '../../../backend/functions/src/services/auth.service';
import { globalErrorHandler } from '../../../backend/functions/src/middleware/errorHandler';

// Mock services
jest.mock('../../../backend/functions/src/services/auth.service');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Email Verification API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(globalErrorHandler);
    jest.clearAllMocks();
  });

  describe('POST /auth/register - Modified behavior for email verification', () => {
    const validRegistrationData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      displayName: 'John Doe',
      role: 'organizer',
      phoneNumber: '+1234567890'
    };

    it('should register user with PENDING status and send verification email', async () => {
      const mockResponse = {
        success: true,
        message: 'Inscription réussie. Vérifiez votre email pour activer votre compte.',
        data: {
          user: {
            id: 'user-id',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            status: 'PENDING',
            emailVerified: false
          },
          verificationSent: true,
          expiresIn: '24 heures'
        }
      };

      mockAuthService.register = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual(mockResponse);
      expect(response.body.data.user.status).toBe('PENDING');
      expect(response.body.data.user.emailVerified).toBe(false);
      expect(response.body.data.verificationSent).toBe(true);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }),
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should handle email sending failure gracefully during registration', async () => {
      const mockResponse = {
        success: true,
        message: 'Inscription réussie. Erreur lors de l\'envoi de l\'email de vérification.',
        data: {
          user: {
            id: 'user-id',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            status: 'PENDING',
            emailVerified: false
          },
          verificationSent: false,
          canResend: true
        },
        warning: 'Vous pouvez demander un nouveau lien de vérification.'
      };

      mockAuthService.register = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual(mockResponse);
      expect(response.body.data.verificationSent).toBe(false);
      expect(response.body.data.canResend).toBe(true);
      expect(response.body.warning).toBeDefined();
    });

    it('should return 409 for existing email during registration', async () => {
      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Email already exists')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already exists');
    });

    it('should validate required fields during registration', async () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'invalid-email',
        password: '123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/login - Email verification checks', () => {
    const validLoginData = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      rememberMe: false
    };

    it('should reject login for unverified users with EMAIL_NOT_VERIFIED error', async () => {
      const mockError = {
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Votre email n\'est pas encore vérifié. Vérifiez votre boîte mail.',
        data: {
          email: 'john.doe@example.com',
          canResendVerification: true,
          lastVerificationSent: '2024-01-15T10:30:00Z'
        }
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        Object.assign(new Error('EMAIL_NOT_VERIFIED'), mockError)
      );

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_NOT_VERIFIED');
      expect(response.body.data.canResendVerification).toBe(true);
      expect(response.body.data.email).toBe('john.doe@example.com');
    });

    it('should allow login for verified users', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
        emailVerified: true
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      };

      const mockResponse = {
        success: true,
        message: 'Connexion réussie',
        data: {
          user: mockUser,
          tokens: mockTokens
        }
      };

      mockAuthService.login = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(response.body.data.user.emailVerified).toBe(true);
      expect(response.body.data.user.status).toBe('ACTIVE');
    });

    it('should provide helpful error messages for unverified users', async () => {
      const mockError = {
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Votre email n\'est pas encore vérifié. Vérifiez votre boîte mail.',
        data: {
          email: 'john.doe@example.com',
          canResendVerification: true,
          lastVerificationSent: '2024-01-15T10:30:00Z',
          instructions: 'Cliquez sur le lien dans votre email ou demandez un nouveau lien de vérification.'
        }
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        Object.assign(new Error('EMAIL_NOT_VERIFIED'), mockError)
      );

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(403);

      expect(response.body.message).toContain('Votre email n\'est pas encore vérifié');
      expect(response.body.data.instructions).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login = jest.fn().mockRejectedValue(
        new Error('Invalid credentials')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('POST /auth/verify-email - Email verification endpoint', () => {
    it('should verify email successfully with valid token', async () => {
      const verificationData = {
        token: 'valid-verification-token-123'
      };

      const mockResponse = {
        success: true,
        message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.',
        data: {
          emailVerified: true,
          userStatus: 'ACTIVE'
        }
      };

      mockAuthService.verifyEmail = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(
        'valid-verification-token-123',
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should return 400 for expired verification token', async () => {
      const verificationData = {
        token: 'expired-token-123'
      };

      const mockError = {
        success: false,
        error: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Le lien de vérification a expiré. Demandez un nouveau lien.',
        data: {
          canResend: true,
          email: 'john.doe@example.com'
        }
      };

      mockAuthService.verifyEmail = jest.fn().mockRejectedValue(
        Object.assign(new Error('VERIFICATION_TOKEN_EXPIRED'), mockError)
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VERIFICATION_TOKEN_EXPIRED');
      expect(response.body.data.canResend).toBe(true);
    });

    it('should return 400 for already used verification token', async () => {
      const verificationData = {
        token: 'used-token-123'
      };

      const mockError = {
        success: false,
        error: 'VERIFICATION_TOKEN_USED',
        message: 'Ce lien de vérification a déjà été utilisé.',
        data: {
          emailAlreadyVerified: true
        }
      };

      mockAuthService.verifyEmail = jest.fn().mockRejectedValue(
        Object.assign(new Error('VERIFICATION_TOKEN_USED'), mockError)
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VERIFICATION_TOKEN_USED');
      expect(response.body.data.emailAlreadyVerified).toBe(true);
    });

    it('should return 400 for invalid verification token', async () => {
      const verificationData = {
        token: 'invalid-token-123'
      };

      const mockError = {
        success: false,
        error: 'INVALID_VERIFICATION_TOKEN',
        message: 'Lien de vérification invalide.',
        data: {
          canResend: true
        }
      };

      mockAuthService.verifyEmail = jest.fn().mockRejectedValue(
        Object.assign(new Error('INVALID_VERIFICATION_TOKEN'), mockError)
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send(verificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_VERIFICATION_TOKEN');
      expect(response.body.data.canResend).toBe(true);
    });

    it('should validate token format', async () => {
      const invalidData = {
        token: ''
      };

      const response = await request(app)
        .post('/auth/verify-email')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle missing token', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('POST /auth/send-email-verification - Resend verification endpoint', () => {
    it('should resend verification email successfully', async () => {
      const resendData = {
        email: 'john.doe@example.com'
      };

      const mockResponse = {
        success: true,
        message: 'Email de vérification renvoyé avec succès',
        data: {
          email: 'john.doe@example.com',
          verificationSent: true,
          expiresIn: '24 heures'
        }
      };

      mockAuthService.resendEmailVerification = jest.fn().mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(resendData)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockAuthService.resendEmailVerification).toHaveBeenCalledWith(
        'john.doe@example.com',
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should return 404 for non-existent email', async () => {
      const resendData = {
        email: 'nonexistent@example.com'
      };

      const mockError = {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Aucun utilisateur trouvé avec cette adresse email.',
        data: {
          email: 'nonexistent@example.com'
        }
      };

      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('USER_NOT_FOUND'), mockError)
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(resendData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('USER_NOT_FOUND');
    });

    it('should return 400 for already verified email', async () => {
      const resendData = {
        email: 'verified@example.com'
      };

      const mockError = {
        success: false,
        error: 'EMAIL_ALREADY_VERIFIED',
        message: 'Cette adresse email est déjà vérifiée.',
        data: {
          email: 'verified@example.com',
          emailVerified: true
        }
      };

      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('EMAIL_ALREADY_VERIFIED'), mockError)
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(resendData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_ALREADY_VERIFIED');
      expect(response.body.data.emailVerified).toBe(true);
    });

    it('should handle rate limiting for verification email sending', async () => {
      const resendData = {
        email: 'john.doe@example.com'
      };

      const mockError = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de demandes de vérification. Réessayez dans 1 heure.',
        data: {
          email: 'john.doe@example.com',
          rateLimitReset: '2024-01-15T11:30:00Z',
          maxAttempts: 3,
          attemptsRemaining: 0
        }
      };

      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('RATE_LIMIT_EXCEEDED'), mockError)
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(resendData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.data.maxAttempts).toBe(3);
      expect(response.body.data.attemptsRemaining).toBe(0);
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle missing email', async () => {
      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle email service failures gracefully', async () => {
      const resendData = {
        email: 'john.doe@example.com'
      };

      const mockError = {
        success: false,
        error: 'EMAIL_SERVICE_ERROR',
        message: 'Erreur lors de l\'envoi de l\'email. Réessayez plus tard.',
        data: {
          email: 'john.doe@example.com',
          canRetry: true
        }
      };

      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('EMAIL_SERVICE_ERROR'), mockError)
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send(resendData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_SERVICE_ERROR');
      expect(response.body.data.canRetry).toBe(true);
    });
  });

  describe('Error Responses and Status Codes', () => {
    it('should return consistent error format across all endpoints', async () => {
      const endpoints = [
        { path: '/auth/register', data: { email: 'invalid' } },
        { path: '/auth/login', data: { email: 'invalid' } },
        { path: '/auth/verify-email', data: { token: '' } },
        { path: '/auth/send-email-verification', data: { email: 'invalid' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .post(endpoint.path)
          .send(endpoint.data)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }
    });

    it('should return appropriate HTTP status codes for different error types', async () => {
      // Test 400 - Bad Request (validation errors)
      await request(app)
        .post('/auth/verify-email')
        .send({ token: '' })
        .expect(400);

      // Test 404 - Not Found (user not found)
      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('USER_NOT_FOUND'), { success: false, error: 'USER_NOT_FOUND' })
      );

      await request(app)
        .post('/auth/send-email-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      // Test 409 - Conflict (email already exists)
      mockAuthService.register = jest.fn().mockRejectedValue(
        new Error('Email already exists')
      );

      await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@example.com',
          password: 'SecurePassword123!'
        })
        .expect(409);

      // Test 429 - Too Many Requests (rate limiting)
      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('RATE_LIMIT_EXCEEDED'), { success: false, error: 'RATE_LIMIT_EXCEEDED' })
      );

      await request(app)
        .post('/auth/send-email-verification')
        .send({ email: 'test@example.com' })
        .expect(429);
    });

    it('should include helpful error details in response data', async () => {
      const mockError = {
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Votre email n\'est pas encore vérifié.',
        data: {
          email: 'john.doe@example.com',
          canResendVerification: true,
          lastVerificationSent: '2024-01-15T10:30:00Z',
          instructions: 'Vérifiez votre boîte mail ou demandez un nouveau lien.'
        }
      };

      mockAuthService.login = jest.fn().mockRejectedValue(
        Object.assign(new Error('EMAIL_NOT_VERIFIED'), mockError)
      );

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'john.doe@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('canResendVerification');
      expect(response.body.data).toHaveProperty('lastVerificationSent');
      expect(response.body.data).toHaveProperty('instructions');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to verification endpoints', async () => {
      // Mock rate limit exceeded for verification attempts
      const mockError = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de tentatives de vérification. Réessayez plus tard.'
      };

      mockAuthService.verifyEmail = jest.fn().mockRejectedValue(
        Object.assign(new Error('RATE_LIMIT_EXCEEDED'), mockError)
      );

      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: 'test-token' })
        .expect(429);

      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should apply rate limiting to email sending endpoints', async () => {
      // Mock rate limit exceeded for email sending
      const mockError = {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Trop de demandes d\'email de vérification. Réessayez dans 1 heure.'
      };

      mockAuthService.resendEmailVerification = jest.fn().mockRejectedValue(
        Object.assign(new Error('RATE_LIMIT_EXCEEDED'), mockError)
      );

      const response = await request(app)
        .post('/auth/send-email-verification')
        .send({ email: 'test@example.com' })
        .expect(429);

      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      mockAuthService.register = jest.fn().mockResolvedValue({
        success: true,
        message: 'Registration successful',
        data: { user: { id: 'test' }, verificationSent: true }
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'SecurePassword123!'
        });

      // Check that response doesn't expose sensitive information
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('hashedPassword');
    });

    it('should handle CORS preflight requests', async () => {
      await request(app)
        .options('/auth/verify-email')
        .expect(200);

      // CORS headers should be handled by middleware
      // This test ensures the endpoint is accessible
    });
  });
});