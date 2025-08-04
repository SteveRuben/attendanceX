// tests/frontend/services/authService.resend.test.ts
import { authService } from '@/services/authService';

// Mock fetch globally
global.fetch = jest.fn();

describe('AuthService - Resend Email Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('resendEmailVerification', () => {
    it('should successfully resend verification email', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: 'test@example.com',
          rateLimitInfo: {
            remainingAttempts: 4,
            resetTime: '2024-01-01T12:00:00Z'
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.resendEmailVerification('test@example.com');

      expect(result).toEqual({
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: 'test@example.com',
          rateLimitInfo: {
            remainingAttempts: 4,
            resetTime: '2024-01-01T12:00:00Z'
          }
        }
      });

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

    it('should validate email format before sending request', async () => {
      await expect(authService.resendEmailVerification('')).rejects.toThrow('Email address is required');
      await expect(authService.resendEmailVerification('   ')).rejects.toThrow('Email address is required');
      await expect(authService.resendEmailVerification('invalid-email')).rejects.toThrow('Please enter a valid email address');
      await expect(authService.resendEmailVerification('test@')).rejects.toThrow('Please enter a valid email address');
    });

    it('should normalize email address (trim and lowercase)', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification email sent successfully',
        data: { email: 'test@example.com' }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await authService.resendEmailVerification('  TEST@EXAMPLE.COM  ');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'test@example.com' })
        })
      );
    });

    it('should handle rate limiting errors with specific information', async () => {
      const mockResponse = {
        success: false,
        error: 'Rate limit exceeded. Too many verification emails sent.',
        data: {
          rateLimitInfo: {
            remainingAttempts: 0,
            resetTime: '2024-01-01T12:30:00Z',
            waitTime: 1800
          }
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      try {
        await authService.resendEmailVerification('test@example.com');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Rate limit exceeded');
        expect(error.isRateLimit).toBe(true);
        expect(error.rateLimitInfo).toEqual({
          remainingAttempts: 0,
          resetTime: '2024-01-01T12:30:00Z',
          waitTime: 1800
        });
      }
    });

    it('should handle generic API errors', async () => {
      const mockResponse = {
        success: false,
        error: 'Email service temporarily unavailable'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(authService.resendEmailVerification('test@example.com'))
        .rejects.toThrow('Email service temporarily unavailable');
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(authService.resendEmailVerification('test@example.com'))
        .rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle HTTP error responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      } as Response);

      await expect(authService.resendEmailVerification('test@example.com'))
        .rejects.toThrow('Server error');
    });
  });
});