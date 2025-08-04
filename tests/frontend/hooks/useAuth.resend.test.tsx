// tests/frontend/hooks/useAuth.resend.test.tsx
import { renderHook, act } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useAuth, AuthProvider } from '@/hooks/use-auth';
import { authService } from '@/services/authService';

// Mock dependencies
jest.mock('react-toastify');
jest.mock('@/services/authService');

const mockToast = toast as jest.Mocked<typeof toast>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth - Resend Email Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resendEmailVerification', () => {
    it('should successfully resend verification email and show success toast', async () => {
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

      mockAuthService.resendEmailVerification.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let resendResult;
      await act(async () => {
        resendResult = await result.current.resendEmailVerification('test@example.com');
      });

      expect(resendResult).toEqual({
        success: true,
        message: 'Verification email sent successfully',
        rateLimitInfo: {
          remainingAttempts: 4,
          resetTime: '2024-01-01T12:00:00Z'
        }
      });

      expect(mockToast.success).toHaveBeenCalledWith('Verification email sent successfully');
      expect(mockAuthService.resendEmailVerification).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle rate limiting errors with specific feedback', async () => {
      const rateLimitError = new Error('Rate limit exceeded. Too many verification emails sent.');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z',
        waitTime: 1800
      };

      mockAuthService.resendEmailVerification.mockRejectedValueOnce(rateLimitError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let resendResult;
      try {
        await act(async () => {
          resendResult = await result.current.resendEmailVerification('test@example.com');
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(resendResult).toEqual({
          success: false,
          message: 'Rate limit exceeded. Too many verification emails sent. Please wait 30 minutes before trying again.',
          rateLimitInfo: {
            remainingAttempts: 0,
            resetTime: '2024-01-01T12:30:00Z',
            waitTime: 1800
          }
        });

        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Rate limit exceeded')
        );
      }
    });

    it('should handle email validation errors', async () => {
      const validationError = new Error('Please enter a valid email address');
      mockAuthService.resendEmailVerification.mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resendEmailVerification('invalid-email');
          fail('Should have thrown an error');
        } catch (error) {
          expect(mockToast.error).toHaveBeenCalledWith('Please enter a valid email address');
        }
      });
    });

    it('should handle required email errors', async () => {
      const requiredError = new Error('Email address is required');
      mockAuthService.resendEmailVerification.mockRejectedValueOnce(requiredError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resendEmailVerification('');
          fail('Should have thrown an error');
        } catch (error) {
          expect(mockToast.error).toHaveBeenCalledWith('Email address is required');
        }
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error occurred');
      mockAuthService.resendEmailVerification.mockRejectedValueOnce(genericError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.resendEmailVerification('test@example.com');
          fail('Should have thrown an error');
        } catch (error) {
          expect(mockToast.error).toHaveBeenCalledWith('Network error occurred');
        }
      });
    });

    it('should calculate wait time from reset time when waitTime is not provided', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      };

      mockAuthService.resendEmailVerification.mockRejectedValueOnce(rateLimitError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let resendResult;
      try {
        await act(async () => {
          resendResult = await result.current.resendEmailVerification('test@example.com');
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Please wait 5 minutes before trying again')
        );
      }
    });
  });
});