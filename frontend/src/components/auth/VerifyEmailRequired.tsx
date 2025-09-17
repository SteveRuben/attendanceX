import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, AlertTriangle, Shield, ArrowLeft } from 'lucide-react';
// import { useAuth } from '@/hooks/use-auth';

interface VerifyEmailRequiredProps {
  email?: string;
  onResendSuccess?: () => void;
}

const VerifyEmailRequired: React.FC<VerifyEmailRequiredProps> = ({ 
  email: propEmail, 
  onResendSuccess 
}) => {
  const navigate = useNavigate();
  // const { user, resendVerificationEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const email = propEmail || 'user@example.com'; // Fallback for demo

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email || countdown > 0) return;

    setLoading(true);
    setError('');

    try {
      // await resendVerificationEmail(email);
      // Simulation pour test
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSent(true);
      setCountdown(60); // 60 seconds cooldown
      onResendSuccess?.();
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setError(error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear any auth state and redirect to login
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-600 mt-2">Check your inbox to continue</p>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-gray-900">Email verification required</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {email && (
              <Alert className="border-blue-200 bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">
                  Verification email sent to: <strong>{email}</strong>
                </AlertDescription>
              </Alert>
            )}

            {sent && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  New verification email sent successfully!
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Next steps:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your email inbox</li>
                <li>Look in your spam/junk folder if needed</li>
                <li>Click the verification link in the email</li>
                <li>Return here once verified</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={loading || countdown > 0 || !email}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-medium h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  `Resend in ${countdown}s`
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Having trouble? Contact our{' '}
              <Link to="/contact" className="text-blue-600 hover:underline">
                support team
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailRequired;