import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Mail, 
  ArrowRight,
  Shield,
  RefreshCw
} from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendEmailVerification } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setStatus('invalid');
        setMessage('No verification token provided');
        return;
      }

      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { message: 'Email verified! You can now sign in.' }
          });
        }, 3000);
      } catch (error: any) {
        if (error.message.includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a new one.');
        } else if (error.message.includes('invalid') || error.message.includes('used')) {
          setStatus('invalid');
          setMessage('This verification link is invalid or has already been used.');
        } else {
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. Please try again.');
        }
      }
    };

    handleVerification();
  }, [token, verifyEmail, navigate]);

  const handleResendVerification = async () => {
    if (!email) {
      setEmail(prompt('Please enter your email address:') || '');
      return;
    }

    try {
      setResending(true);
      await resendEmailVerification(email);
    } catch (error) {
      // Error is handled by the hook with toast
    } finally {
      setResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'error':
      case 'expired':
      case 'invalid':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Mail className="w-8 h-8 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
      case 'expired':
      case 'invalid':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying your email...';
      case 'success':
        return 'Email verified!';
      case 'expired':
        return 'Link expired';
      case 'invalid':
        return 'Invalid link';
      case 'error':
        return 'Verification failed';
      default:
        return 'Email verification';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm border">
              {getStatusIcon()}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{getTitle()}</h1>
          <p className="text-gray-600 mt-2">
            {status === 'loading' && 'Please wait while we verify your email address'}
            {status === 'success' && 'You will be redirected to sign in shortly'}
            {(status === 'error' || status === 'expired' || status === 'invalid') && 'There was an issue with your verification link'}
          </p>
        </div>

        {/* Status Card */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Message */}
            <Alert className={getStatusColor()}>
              {status === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="text-gray-700">
                {message}
              </AlertDescription>
            </Alert>

            {/* Success Actions */}
            {status === 'success' && (
              <div className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Account activated</p>
                      <p className="text-sm text-green-700">You can now sign in to your account</p>
                    </div>
                  </div>
                </div>
                
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
            )}

            {/* Error Actions */}
            {(status === 'error' || status === 'expired' || status === 'invalid') && (
              <div className="space-y-4">
                {status === 'expired' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Verification links expire after 24 hours for security reasons.
                    </p>
                    
                    <div className="space-y-2">
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                      
                      <Button
                        onClick={handleResendVerification}
                        disabled={resending || !email}
                        variant="outline"
                        className="w-full"
                      >
                        {resending ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="w-4 h-4 mr-2" />
                        )}
                        {resending ? 'Sending...' : 'Send new verification email'}
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <Link to="/register">
                    Back to registration
                  </Link>
                </Button>
                
                <Button
                  asChild
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  <Link to="/login">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Try signing in
                  </Link>
                </Button>
              </div>
            )}

            {/* Loading State */}
            {status === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  This may take a few moments...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure email verification powered by AttendanceX</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;