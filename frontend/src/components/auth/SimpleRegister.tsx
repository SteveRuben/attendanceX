import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  Shield,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export const SimpleRegister: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [form, setForm] = useState<RegisterForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    acceptTerms: false
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!form.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
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
      // 1. Créer le compte utilisateur
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password
        })
      });

      const result = await response.json();

      if (result.success) {
        // 2. Connexion automatique après création
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password
          })
        });

        const loginResult = await loginResponse.json();

        if (loginResult.success) {
          // 3. Redirection intelligente via AuthRedirect
          navigate('/auth/redirect');
        } else {
          // Si la connexion auto échoue, rediriger vers login
          navigate('/login', { 
            state: { 
              message: 'Account created successfully! Please sign in.',
              email: form.email 
            }
          });
        }
      } else {
        setErrors({ general: result.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Get started with AttendanceX today</p>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Sign up</CardTitle>
          </CardHeader>
          
          <CardContent>
            {errors.general && (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                    First name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                    <Input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={handleChange('firstName')}
                      className={`pl-10 w-full ${errors.firstName ? 'border-red-300' : ''}`}
                      placeholder="John"
                      disabled={loading}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Last name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                    <Input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={handleChange('lastName')}
                      className={`pl-10 w-full ${errors.lastName ? 'border-red-300' : ''}`}
                      placeholder="Doe"
                      disabled={loading}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    className={`pl-10 w-full ${errors.email ? 'border-red-300' : ''}`}
                    placeholder="john@company.com"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange('password')}
                    className={`pl-10 pr-10 w-full ${errors.password ? 'border-red-300' : ''}`}
                    placeholder="At least 6 characters"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={form.acceptTerms}
                  onCheckedChange={(checked) => 
                    setForm(prev => ({ ...prev, acceptTerms: checked as boolean }))
                  }
                  className={errors.acceptTerms ? 'border-red-300' : ''}
                />
                <div className="text-sm">
                  <label htmlFor="acceptTerms" className="text-gray-700">
                    I agree to the{' '}
                    <Link to="/terms" className="text-blue-600 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                  {errors.acceptTerms && (
                    <p className="mt-1 text-red-600">{errors.acceptTerms}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Create account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline inline-flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Sign in instead
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you'll be able to create your organization or join existing ones via invitations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleRegister;