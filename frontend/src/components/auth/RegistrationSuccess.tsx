import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useAuth } from '@/hooks/use-auth';
import { verificationToasts } from '@/utils/notifications';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react';

interface RegistrationSuccessProps {
  registrationData: {
    success: boolean;
    message: string;
    data: {
      email: string;
      verificationSent: boolean;
      expiresIn?: string;
      canResend: boolean;
      actionRequired: boolean;
      nextStep: string;
    };
    warning?: string;
  };
}

const RegistrationSuccess = ({ registrationData }: RegistrationSuccessProps) => {
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts: number;
    resetTime: string;
    waitTime?: number;
  } | null>(null);
  const [resendError, setResendError] = useState<string>('');
  const { resendEmailVerification } = useAuth();

  const handleResendVerification = async () => {
    try {
      setResending(true);
      setResendError('');
      setRateLimitInfo(null);
      
      const result = await resendEmailVerification(registrationData.data.email);
      
      if (result.success) {
        setResendSuccess(true);
        setRateLimitInfo(result.rateLimitInfo || null);
        verificationToasts.verificationResent(result.rateLimitInfo?.remainingAttempts);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        setResendError(result.message);
        setRateLimitInfo(result.rateLimitInfo || null);
        verificationToasts.verificationError(result.message);
      }
    } catch (error: any) {
      // Enhanced error handling with specific toasts
      setResendError(error.message || 'Failed to resend verification email');
      if ((error as any).rateLimitInfo) {
        setRateLimitInfo((error as any).rateLimitInfo);
      }
      
      if ((error as any).isRateLimit) {
        verificationToasts.rateLimitExceeded((error as any).rateLimitInfo?.resetTime);
      } else {
        verificationToasts.verificationError(error.message);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              {registrationData.data.verificationSent ? (
                <Mail className="text-green-600 w-6 h-6" />
              ) : (
                <AlertCircle className="text-yellow-600 w-6 h-6" />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {registrationData.data.verificationSent ? 'Check your email' : 'Account created'}
          </h1>
          <p className="text-gray-600 mt-2">
            {registrationData.data.verificationSent 
              ? 'We sent a verification link to your email'
              : 'There was an issue sending the verification email'
            }
          </p>
        </div>

        {/* Success Card */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">
              Registration Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            <Alert className={registrationData.data.verificationSent ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
              {registrationData.data.verificationSent ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertDescription className="text-gray-700">
                {registrationData.message}
              </AlertDescription>
            </Alert>

            {/* Warning if email sending failed */}
            {registrationData.warning && (
              <Alert variant="destructive" className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  {registrationData.warning}
                </AlertDescription>
              </Alert>
            )}

            {/* Email Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email sent to:</p>
                  <p className="text-sm text-gray-600">{registrationData.data.email}</p>
                </div>
              </div>
              
              {registrationData.data.expiresIn && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Link expires in:</p>
                    <p className="text-sm text-gray-600">{registrationData.data.expiresIn}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Next steps:</h3>
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    1
                  </div>
                  <p className="text-sm text-gray-600">
                    Check your email inbox (and spam folder)
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    2
                  </div>
                  <p className="text-sm text-gray-600">
                    Click the verification link in the email
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    3
                  </div>
                  <p className="text-sm text-gray-600">
                    Return here to sign in to your account
                  </p>
                </div>
              </div>
            </div>

            {/* Resend Success Message */}
            {resendSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Verification email sent successfully! Check your inbox.
                  {rateLimitInfo && rateLimitInfo.remainingAttempts > 0 && (
                    <div className="mt-1 text-sm">
                      You have {rateLimitInfo.remainingAttempts} resend attempt{rateLimitInfo.remainingAttempts > 1 ? 's' : ''} remaining.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Resend Error Message */}
            {resendError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {resendError}
                  {rateLimitInfo && (
                    <div className="mt-2 text-sm">
                      {rateLimitInfo.remainingAttempts > 0 ? (
                        <p>You have {rateLimitInfo.remainingAttempts} attempt{rateLimitInfo.remainingAttempts > 1 ? 's' : ''} remaining.</p>
                      ) : (
                        <p>Rate limit exceeded. Please wait before trying again.</p>
                      )}
                      {rateLimitInfo.resetTime && (
                        <p className="mt-1">
                          Rate limit resets at: {new Date(rateLimitInfo.resetTime).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {registrationData.data.canResend && (
                <Button
                  onClick={handleResendVerification}
                  disabled={resending || (rateLimitInfo?.remainingAttempts === 0)}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {resending ? 'Sending...' : 
                   rateLimitInfo?.remainingAttempts === 0 ? 'Rate limit exceeded' :
                   'Resend verification email'}
                </Button>
              )}
              
              {/* Rate Limit Information */}
              {rateLimitInfo && (
                <div className="text-sm text-gray-600 text-center">
                  {rateLimitInfo.remainingAttempts > 0 ? (
                    <p>{rateLimitInfo.remainingAttempts} resend attempt{rateLimitInfo.remainingAttempts > 1 ? 's' : ''} remaining</p>
                  ) : (
                    <p>Rate limit exceeded. Try again later.</p>
                  )}
                </div>
              )}
              
              <Button
                asChild
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
              >
                <Link to="/login">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continue to sign in
                </Link>
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Didn't receive the email?{' '}
                <button
                  onClick={handleResendVerification}
                  disabled={resending || !registrationData.data.canResend || (rateLimitInfo?.remainingAttempts === 0)}
                  className="text-gray-900 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rateLimitInfo?.remainingAttempts === 0 ? 'Rate limit exceeded' : 'Try resending it'}
                </button>
              </p>
              {rateLimitInfo?.remainingAttempts === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Please wait before requesting another verification email
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Your account is secure and protected</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default RegistrationSuccess;