// tests/frontend/components/RegistrationSuccess.resend.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegistrationSuccess from '@/components/auth/RegistrationSuccess';
import { useAuth } from '@/hooks/use-auth';

// Mock the useAuth hook
jest.mock('@/hooks/use-auth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock data
const mockRegistrationData = {
  success: true,
  message: 'Registration successful! Please check your email.',
  data: {
    email: 'test@example.com',
    verificationSent: true,
    expiresIn: '24 hours',
    canResend: true,
    actionRequired: true,
    nextStep: 'verify-email'
  }
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RegistrationSuccess - Resend Functionality', () => {
  const mockResendEmailVerification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      resendEmailVerification: mockResendEmailVerification,
    } as any);
  });

  it('should render resend button when canResend is true', () => {
    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    expect(screen.getByText('Resend verification email')).toBeInTheDocument();
  });

  it('should not render resend button when canResend is false', () => {
    const dataWithNoResend = {
      ...mockRegistrationData,
      data: { ...mockRegistrationData.data, canResend: false }
    };

    renderWithRouter(<RegistrationSuccess registrationData={dataWithNoResend} />);

    expect(screen.queryByText('Resend verification email')).not.toBeInTheDocument();
  });

  it('should successfully resend verification email', async () => {
    mockResendEmailVerification.mockResolvedValueOnce({
      success: true,
      message: 'Verification email sent successfully',
      rateLimitInfo: { remainingAttempts: 4, resetTime: '2024-01-01T12:00:00Z' }
    });

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Verification email sent successfully! Check your inbox.')).toBeInTheDocument();
    });

    expect(mockResendEmailVerification).toHaveBeenCalledWith('test@example.com');
  });

  it('should show rate limit information after successful resend', async () => {
    mockResendEmailVerification.mockResolvedValueOnce({
      success: true,
      message: 'Verification email sent successfully',
      rateLimitInfo: { remainingAttempts: 3, resetTime: '2024-01-01T12:00:00Z' }
    });

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('3 resend attempts remaining')).toBeInTheDocument();
    });
  });

  it('should handle rate limit exceeded error', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).rateLimitInfo = {
      remainingAttempts: 0,
      resetTime: '2024-01-01T12:30:00Z'
    };

    mockResendEmailVerification.mockRejectedValueOnce(rateLimitError);

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded. Please wait before trying again.')).toBeInTheDocument();
    });

    // Button should be disabled when rate limit is exceeded
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });
  });

  it('should disable resend button when rate limit is exceeded', async () => {
    mockResendEmailVerification.mockResolvedValueOnce({
      success: false,
      message: 'Rate limit exceeded',
      rateLimitInfo: { remainingAttempts: 0, resetTime: '2024-01-01T12:30:00Z' }
    });

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /rate limit exceeded/i });
      expect(button).toBeDisabled();
    });
  });

  it('should show rate limit reset time', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).rateLimitInfo = {
      remainingAttempts: 0,
      resetTime: '2024-01-01T12:30:00Z'
    };

    mockResendEmailVerification.mockRejectedValueOnce(rateLimitError);

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText(/Rate limit resets at:/)).toBeInTheDocument();
    });
  });

  it('should handle generic errors', async () => {
    const genericError = new Error('Network error occurred');
    mockResendEmailVerification.mockRejectedValueOnce(genericError);

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });
  });

  it('should update help text when rate limit is exceeded', async () => {
    mockResendEmailVerification.mockResolvedValueOnce({
      success: false,
      message: 'Rate limit exceeded',
      rateLimitInfo: { remainingAttempts: 0, resetTime: '2024-01-01T12:30:00Z' }
    });

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      expect(screen.getByText('Please wait before requesting another verification email')).toBeInTheDocument();
    });
  });

  it('should show remaining attempts in rate limit info', async () => {
    mockResendEmailVerification.mockResolvedValueOnce({
      success: true,
      message: 'Email sent',
      rateLimitInfo: { remainingAttempts: 2, resetTime: '2024-01-01T12:00:00Z' }
    });

    renderWithRouter(<RegistrationSuccess registrationData={mockRegistrationData} />);

    const resendButton = screen.getByText('Resend verification email');
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(screen.getByText('2 resend attempts remaining')).toBeInTheDocument();
    });
  });
});