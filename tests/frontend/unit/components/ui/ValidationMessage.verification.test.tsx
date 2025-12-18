// tests/frontend/unit/components/ui/ValidationMessage.verification.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ValidationMessage from '../components/ui/ValidationMessage';

describe('ValidationMessage Component - Email Verification', () => {
  describe('Email validation messages', () => {
    it('should display email required error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email address is required" 
          field="email"
        />
      );

      expect(screen.getByText('Email address is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'error');
    });

    it('should display invalid email format error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Please enter a valid email address" 
          field="email"
        />
      );

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'error');
    });

    it('should display email verification success message', () => {
      render(
        <ValidationMessage 
          type="success" 
          message="Verification email sent successfully" 
          field="email"
        />
      );

      expect(screen.getByText('Verification email sent successfully')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'success');
    });
  });

  describe('Token validation messages', () => {
    it('should display token required error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Verification token is required" 
          field="token"
        />
      );

      expect(screen.getByText('Verification token is required')).toBeInTheDocument();
    });

    it('should display invalid token format error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Invalid verification token format" 
          field="token"
        />
      );

      expect(screen.getByText('Invalid verification token format')).toBeInTheDocument();
    });

    it('should display token expired error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Verification token has expired" 
          field="token"
        />
      );

      expect(screen.getByText('Verification token has expired')).toBeInTheDocument();
    });

    it('should display token already used error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="This verification token has already been used" 
          field="token"
        />
      );

      expect(screen.getByText('This verification token has already been used')).toBeInTheDocument();
    });
  });

  describe('Rate limiting messages', () => {
    it('should display rate limit exceeded error', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Rate limit exceeded. Too many verification emails sent." 
          field="rateLimit"
        />
      );

      expect(screen.getByText('Rate limit exceeded. Too many verification emails sent.')).toBeInTheDocument();
    });

    it('should display rate limit with reset time', () => {
      render(
        <ValidationMessage 
          type="warning" 
          message="Rate limit exceeded. Please wait 30 minutes before trying again." 
          field="rateLimit"
        />
      );

      expect(screen.getByText('Rate limit exceeded. Please wait 30 minutes before trying again.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'warning');
    });

    it('should display remaining attempts information', () => {
      render(
        <ValidationMessage 
          type="info" 
          message="3 verification attempts remaining" 
          field="rateLimit"
        />
      );

      expect(screen.getByText('3 verification attempts remaining')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'info');
    });
  });

  describe('Verification flow messages', () => {
    it('should display verification in progress message', () => {
      render(
        <ValidationMessage 
          type="info" 
          message="Verifying your email address..." 
          field="verification"
        />
      );

      expect(screen.getByText('Verifying your email address...')).toBeInTheDocument();
    });

    it('should display verification success message', () => {
      render(
        <ValidationMessage 
          type="success" 
          message="Email verified successfully! You can now sign in." 
          field="verification"
        />
      );

      expect(screen.getByText('Email verified successfully! You can now sign in.')).toBeInTheDocument();
    });

    it('should display verification failure message', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email verification failed. Please try again." 
          field="verification"
        />
      );

      expect(screen.getByText('Email verification failed. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error messages', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email address is required" 
          field="email"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper ARIA attributes for success messages', () => {
      render(
        <ValidationMessage 
          type="success" 
          message="Verification email sent successfully" 
          field="email"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper ARIA attributes for warning messages', () => {
      render(
        <ValidationMessage 
          type="warning" 
          message="Rate limit exceeded" 
          field="rateLimit"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should associate message with form field when fieldId is provided', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email address is required" 
          field="email"
          fieldId="email-input"
        />
      );

      const message = screen.getByRole('alert');
      expect(message).toHaveAttribute('id', 'email-input-error');
    });
  });

  describe('Visual styling', () => {
    it('should apply correct CSS classes for different message types', () => {
      const { rerender } = render(
        <ValidationMessage 
          type="error" 
          message="Error message" 
          field="test"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'error');

      rerender(
        <ValidationMessage 
          type="success" 
          message="Success message" 
          field="test"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'success');

      rerender(
        <ValidationMessage 
          type="warning" 
          message="Warning message" 
          field="test"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'warning');

      rerender(
        <ValidationMessage 
          type="info" 
          message="Info message" 
          field="test"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'info');
    });

    it('should apply field-specific CSS classes', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email error" 
          field="email"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('validation-message', 'error', 'field-email');
    });
  });

  describe('Message formatting', () => {
    it('should handle multiline messages', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      render(
        <ValidationMessage 
          type="info" 
          message={multilineMessage} 
          field="test"
        />
      );

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });

    it('should handle HTML entities in messages', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="Email &amp; password are required" 
          field="test"
        />
      );

      expect(screen.getByText('Email & password are required')).toBeInTheDocument();
    });

    it('should truncate very long messages', () => {
      const longMessage = 'A'.repeat(500);
      render(
        <ValidationMessage 
          type="error" 
          message={longMessage} 
          field="test"
        />
      );

      const messageElement = screen.getByRole('alert');
      expect(messageElement.textContent?.length).toBeLessThanOrEqual(250);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message gracefully', () => {
      render(
        <ValidationMessage 
          type="error" 
          message="" 
          field="test"
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle null message gracefully', () => {
      render(
        <ValidationMessage 
          type="error" 
          message={null as any} 
          field="test"
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should handle undefined message gracefully', () => {
      render(
        <ValidationMessage 
          type="error" 
          message={undefined as any} 
          field="test"
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});