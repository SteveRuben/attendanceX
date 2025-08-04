// tests/frontend/unit/components/auth/VerificationErrorBoundary.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VerificationErrorBoundary from '@/components/auth/VerificationErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    if (errorType === 'verification') {
      throw new Error('VERIFICATION_TOKEN_EXPIRED');
    } else if (errorType === 'network') {
      throw new Error('Network error occurred');
    } else {
      throw new Error('Something went wrong');
    }
  }
  return <div>Component rendered successfully</div>;
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('VerificationErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={false} />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });

    it('should not interfere with normal component rendering', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <div>
              <h1>Test Component</h1>
              <p>This is a test paragraph</p>
              <button>Test Button</button>
            </div>
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('This is a test paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should catch and display verification-specific errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Erreur de vérification')).toBeInTheDocument();
      expect(screen.getByText(/problème avec la vérification de votre email/i)).toBeInTheDocument();
      expect(screen.getByText('VERIFICATION_TOKEN_EXPIRED')).toBeInTheDocument();
    });

    it('should catch and display network errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="network" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Erreur de connexion')).toBeInTheDocument();
      expect(screen.getByText(/problème de connexion réseau/i)).toBeInTheDocument();
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should catch and display generic errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="generic" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
      expect(screen.getByText(/erreur inattendue s'est produite/i)).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error recovery options', () => {
    it('should provide retry button for verification errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /réessayer la vérification/i })).toBeInTheDocument();
    });

    it('should provide retry button for network errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="network" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    });

    it('should provide navigation links for recovery', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /retour à la connexion/i })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: /demander un nouveau lien/i })).toHaveAttribute('href', '/register');
    });

    it('should provide contact support link for generic errors', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="generic" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByRole('link', { name: /contacter le support/i })).toBeInTheDocument();
    });
  });

  describe('Error information display', () => {
    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Détails de l\'erreur:')).toBeInTheDocument();
      expect(screen.getByText('VERIFICATION_TOKEN_EXPIRED')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.queryByText('Détails de l\'erreur:')).not.toBeInTheDocument();
      expect(screen.queryByText('VERIFICATION_TOKEN_EXPIRED')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should display timestamp of error occurrence', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/erreur survenue le/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error display', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
      expect(errorContainer).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper heading structure', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should have proper button and link attributes', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /réessayer la vérification/i });
      expect(retryButton).toHaveAttribute('type', 'button');

      const loginLink = screen.getByRole('link', { name: /retour à la connexion/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Error boundary lifecycle', () => {
    it('should log error information for debugging', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should reset error state when children change', () => {
      const { rerender } = render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Erreur de vérification')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={false} />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
      expect(screen.queryByText('Erreur de vérification')).not.toBeInTheDocument();
    });
  });

  describe('Custom error handling', () => {
    it('should handle custom verification error types', () => {
      const CustomError: React.FC = () => {
        const error = new Error('VERIFICATION_TOKEN_USED');
        (error as any).type = 'VERIFICATION_ERROR';
        throw error;
      };

      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <CustomError />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Erreur de vérification')).toBeInTheDocument();
      expect(screen.getByText('VERIFICATION_TOKEN_USED')).toBeInTheDocument();
    });

    it('should provide specific recovery options based on error type', () => {
      const TokenExpiredError: React.FC = () => {
        throw new Error('VERIFICATION_TOKEN_EXPIRED');
      };

      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <TokenExpiredError />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/lien de vérification a expiré/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /demander un nouveau lien/i })).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should apply appropriate CSS classes for error display', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveClass('verification-error-boundary');
      expect(errorContainer).toHaveClass('error-verification');
    });

    it('should display error icon for visual feedback', () => {
      render(
        <TestWrapper>
          <VerificationErrorBoundary>
            <ThrowError shouldThrow={true} errorType="verification" />
          </VerificationErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });
  });
});