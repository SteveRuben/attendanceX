// src/pages/auth/ForgotPassword.tsx - Version moderne et optimisée
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Mail, ArrowLeft, CheckCircle, Info, AlertCircle, Shield } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { forgotPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error: any) {
      if (error.message.includes('User not found')) {
        setErrors({ email: 'No account found with this email address' });
      } else if (error.message.includes('Too many requests')) {
        setErrors({ general: 'Too many reset attempts. Please try again later.' });
      } else {
        setErrors({ general: error.message || 'Failed to send recovery email. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white w-6 h-6" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Check your email</h1>
            <p className="text-gray-600 mt-2">We've sent a recovery link to your email</p>
          </div>

          {/* Success Card */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-gray-700">
                  We've sent a password recovery link to:
                </p>
                <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {email}
                </p>
                
                <Alert className="text-left">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tip:</strong> Check your spam folder if you don't receive the email within 5 minutes.
                  </AlertDescription>
                </Alert>
                
                <div className="pt-4">
                  <Button asChild className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium">
                    <Link to="/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to sign in
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Didn't receive the email?{' '}
              <button
                onClick={() => setSent(false)}
                className="text-gray-700 hover:text-gray-900 hover:underline font-medium"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-600 mt-2">Enter your email to receive a recovery link</p>
        </div>

        {/* Forgot Password Form */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Reset password</CardTitle>
          </CardHeader>
          <CardContent>
            {/* General Error */}
            {errors.general && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className={`pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter your email address"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Sending...' : 'Send recovery link'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Remember your password?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline inline-flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;