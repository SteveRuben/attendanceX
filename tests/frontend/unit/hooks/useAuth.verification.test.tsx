// tests/frontend/unit/hooks/useAuth.verification.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useAuth, AuthProvider } from '../hooks/use-auth';
import { authService } from '../services/authService';

// Mock dependencies
jest.mock('react-toastify');
jest.mock('../services/authService');

const mockToast = toast as jest.Mocked<typeof toast>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth - Email Verification Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyEmail', () => {
    it('should successfully verify email and update user state', async () => {
      const mockVerifiedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        status: 'ACTIVE'
      };

      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: mockVerifiedUser,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.verifyEmail('valid-token');
      });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(mockToast.success).toHaveBeenCalledWith('Email verified successfully');
      
      // User should be updated with verified status
      expect(result.current.user).toEqual(mockVerifiedUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle expired token error', async () => {
      const expiredError = new Error('VERIFICATION_TOKEN_EXPIRED');
      mockAuthService.verifyEmail.mockRejectedValueOnce(expiredError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail('expired-token');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(expiredError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith('Verification link has expired. Please request a new one.');
    });

    it('should handle already used token error', async () => {
      const usedError = new Error('VERIFICATION_TOKEN_USED');
      mockAuthService.verifyEmail.mockRejectedValueOnce(usedError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail('used-token');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(usedError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith('This verification link has already been used.');
    });

    it('should handle invalid token error', async () => {
      const invalidError = new Error('INVALID_VERIFICATION_TOKEN');
      mockAuthService.verifyEmail.mockRejectedValueOnce(invalidError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail('invalid-token');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(invalidError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith('Invalid verification link.');
    });

    it('should handle generic verification errors', async () => {
      const genericError = new Error('Network error');
      mockAuthService.verifyEmail.mockRejectedValueOnce(genericError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.verifyEmail('token');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(genericError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith('Network error');
    });
  });

  describe('sendEmailVerification', () => {
    it('should successfully send verification email', async () => {
      mockAuthService.sendEmailVerification.mockResolvedValueOnce({
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: 'test@example.com',
          expiresIn: '24 hours'
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.sendEmailVerification('test@example.com');
      });

      expect(mockAuthService.sendEmailVerification).toHaveBeenCalledWith('test@example.com');
      expect(mockToast.success).toHaveBeenCalledWith('Verification email sent successfully');
    });

    it('should handle rate limiting for verification email sending', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).isRateLimit = true;
      (rateLimitError as any).rateLimitInfo = {
        remainingAttempts: 0,
        resetTime: '2024-01-01T12:30:00Z'
      };

      mockAuthService.sendEmailVerification.mockRejectedValueOnce(rateLimitError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.sendEmailVerification('test@example.com');
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(rateLimitError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded')
      );
    });
  });

  describe('login with email verification checks', () => {
    it('should handle EMAIL_NOT_VERIFIED error during login', async () => {
      const notVerifiedError = new Error('EMAIL_NOT_VERIFIED');
      (notVerifiedError as any).data = {
        email: 'test@example.com',
        canResendVerification: true,
        lastVerificationSent: '2024-01-01T10:00:00Z'
      };

      mockAuthService.login.mockRejectedValueOnce(notVerifiedError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123', false);
          fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBe(notVerifiedError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        'Your email is not verified. Please check your email and click the verification link.'
      );
    });

    it('should allow login for verified users', async () => {
      const mockUser = {
        id: '1',
        email: 'verified@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        status: 'ACTIVE'
      };

      mockAuthService.login.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('verified@example.com', 'password123', false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('Welcome back!');
    });
  });

  describe('register with verification flow', () => {
    it('should handle registration without auto-login', async () => {
      const mockRegistrationResponse = {
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

      mockAuthService.register.mockResolvedValueOnce(mockRegistrationResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.register({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newuser@example.com',
          organization: 'Test Company',
          password: 'password123',
          acceptTerms: true
        });
      });

      expect(registrationResult).toEqual(mockRegistrationResponse);
      
      // User should NOT be automatically logged in
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      
      expect(mockToast.success).toHaveBeenCalledWith('Registration successful! Please check your email.');
    });

    it('should handle registration with email sending failure', async () => {
      const mockRegistrationResponse = {
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

      mockAuthService.register.mockResolvedValueOnce(mockRegistrationResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.register({
          firstName: 'John',
          lastName: 'Doe',
          email: 'newuser@example.com',
          organization: 'Test Company',
          password: 'password123',
          acceptTerms: true
        });
      });

      expect(registrationResult).toEqual(mockRegistrationResponse);
      expect(mockToast.success).toHaveBeenCalledWith('Registration successful.');
      expect(mockToast.warning).toHaveBeenCalledWith('Failed to send verification email. You can request a new link.');
    });
  });

  describe('authentication state management', () => {
    it('should update user verification status when email is verified', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially no user
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Mock successful verification
      const mockVerifiedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        status: 'ACTIVE'
      };

      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: mockVerifiedUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      });

      await act(async () => {
        await result.current.verifyEmail('valid-token');
      });

      // User should be authenticated with verified email
      expect(result.current.user).toEqual(mockVerifiedUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.emailVerified).toBe(true);
    });

    it('should maintain user state consistency during verification flow', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Mock user with unverified email
      const unverifiedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: false,
        status: 'PENDING'
      };

      // Set initial state (user logged in but not verified)
      act(() => {
        (result.current as any).setUser(unverifiedUser);
      });

      expect(result.current.user?.emailVerified).toBe(false);

      // Mock successful verification
      const verifiedUser = { ...unverifiedUser, emailVerified: true, status: 'ACTIVE' };
      mockAuthService.verifyEmail.mockResolvedValueOnce({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: verifiedUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      });

      await act(async () => {
        await result.current.verifyEmail('valid-token');
      });

      // User should be updated with verified status
      expect(result.current.user?.emailVerified).toBe(true);
      expect(result.current.user?.status).toBe('ACTIVE');
    });
  });
});