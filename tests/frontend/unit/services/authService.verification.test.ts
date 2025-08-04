// tests/frontend/unit/services/authService.verification.test.ts
import { authService } from '@/services/authService';

// Mock fetch globally
global.fetch = jest.fn();

describe('AuthService - Email Verification Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const mockResponse = {
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: '1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            emailVerified: true,
            status: 'ACTIVE'
          },
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.verifyEmail('valid-token');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/verify-email'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ token: 'valid-token' })
        })
      );
    });

    it('should validate token before sending request', async () => {
      await expect(authService.verifyEmail('')).rejects.toThrow('Verification token is required');
      await expect(authService.verifyEmail('   ')).rejects.toThrow('Verification token is required');
    });

    it('should handle expired token error', async () => {
      const mockResponse = {
        success: false,
        error: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Verification token has expired'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.verifyEmail('expired-token');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('VERIFICATION_TOKEN_EXPIRED');
      }
    });

    it('should handle already used token error', async () => {
      const mockResponse = {
        success: false,
        error: 'VERIFICATION_TOKEN_USED',
        message: 'Verification token has already been used'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.verifyEmail('used-token');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('VERIFICATION_TOKEN_USED');
      }
    });

    it('should handle invalid token error', async () => {
      const mockResponse = {
        success: false,
        error: 'INVALID_VERIFICATION_TOKEN',
        message: 'Invalid verification token'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.verifyEmail('invalid-token');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('INVALID_VERIFICATION_TOKEN');
      }
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(authService.verifyEmail('token'))
        .rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle HTTP error responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      } as Response);

      await expect(authService.verifyEmail('token'))
        .rejects.toThrow('Server error');
    });
  });

  describe('sendEmailVerification', () => {
    it('should successfully send verification email', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: 'test@example.com',
          expiresIn: '24 hours'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.sendEmailVerification('test@example.com');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-email-verification'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should validate email before sending request', async () => {
      await expect(authService.sendEmailVerification('')).rejects.toThrow('Email address is required');
      await expect(authService.sendEmailVerification('   ')).rejects.toThrow('Email address is required');
      await expect(authService.sendEmailVerification('invalid-email')).rejects.toThrow('Please enter a valid email address');
    });

    it('should normalize email address', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification email sent successfully',
        data: { email: 'test@example.com' }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await authService.sendEmailVerification('  TEST@EXAMPLE.COM  ');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should handle rate limiting errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Rate limit exceeded',
        data: {
          rateLimitInfo: {
            remainingAttempts: 0,
            resetTime: '2024-01-01T12:30:00Z'
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.sendEmailVerification('test@example.com');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Rate limit exceeded');
        expect(error.isRateLimit).toBe(true);
        expect(error.rateLimitInfo).toEqual({
          remainingAttempts: 0,
          resetTime: '2024-01-01T12:30:00Z'
        });
      }
    });
  });

  describe('login with email verification checks', () => {
    it('should handle EMAIL_NOT_VERIFIED error', async () => {
      const mockResponse = {
        success: false,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Your email is not verified. Please check your email.',
        data: {
          email: 'test@example.com',
          canResendVerification: true,
          lastVerificationSent: '2024-01-01T10:00:00Z'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.login('test@example.com', 'password123', false);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('EMAIL_NOT_VERIFIED');
        expect(error.data).toEqual({
          email: 'test@example.com',
          canResendVerification: true,
          lastVerificationSent: '2024-01-01T10:00:00Z'
        });
      }
    });

    it('should allow login for verified users', async () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: '1',
            email: 'verified@example.com',
            firstName: 'John',
            lastName: 'Doe',
            emailVerified: true,
            status: 'ACTIVE'
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.login('verified@example.com', 'password123', false);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'verified@example.com',
            password: 'password123',
            rememberMe: false
          })
        })
      );
    });

    it('should handle other login errors normally', async () => {
      const mockResponse = {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.login('test@example.com', 'wrongpassword', false);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  describe('register without auto-login', () => {
    it('should register user without auto-login and send verification email', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful! Please check your email.',
        data: {
          email: 'newuser@example.com',
          verificationSent: true,
          expiresIn: '24 hours',
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'newuser@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true
      };

      const result = await authService.register(registrationData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(registrationData)
        })
      );
    });

    it('should handle registration with email sending failure', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful.',
        data: {
          email: 'newuser@example.com',
          verificationSent: false,
          canResend: true,
          actionRequired: true,
          nextStep: 'verify-email'
        },
        warning: 'Failed to send verification email. You can request a new link.'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'newuser@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true
      };

      const result = await authService.register(registrationData);

      expect(result).toEqual(mockResponse);
      expect(result.warning).toBe('Failed to send verification email. You can request a new link.');
    });

    it('should handle traditional registration errors', async () => {
      const mockResponse = {
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        organization: 'Test Company',
        password: 'password123',
        acceptTerms: true
      };

      try {
        await authService.register(registrationData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('EMAIL_ALREADY_EXISTS');
      }
    });
  });

  describe('API endpoint configuration', () => {
    it('should use correct endpoints for verification operations', async () => {
      const mockResponse = { success: true };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Test verify email endpoint
      await authService.verifyEmail('token');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/verify-email'),
        expect.any(Object)
      );

      // Test send verification endpoint
      await authService.sendEmailVerification('test@example.com');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-email-verification'),
        expect.any(Object)
      );

      // Test resend verification endpoint
      await authService.resendEmailVerification('test@example.com');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-email-verification'),
        expect.any(Object)
      );
    });

    it('should include proper headers for all verification requests', async () => {
      const mockResponse = { success: true };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await authService.verifyEmail('token');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });
});