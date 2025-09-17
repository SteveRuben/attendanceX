import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserCheck,
  Building2,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield
} from 'lucide-react';

interface InvitationDetails {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
  inviterName: string;
  expiresAt: Date;
}

interface AcceptanceForm {
  username: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
}

export const InvitationAcceptance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<AcceptanceForm>({
    username: '',
    password: '',
    passwordConfirm: '',
    acceptTerms: false
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    } else {
      setLoading(false);
      setErrors({ token: 'Invitation token missing' });
    }
  }, [token]);

  // Auto-generate username from invitation details
  useEffect(() => {
    if (invitation && !form.username) {
      const username = `${invitation.firstName.toLowerCase()}.${invitation.lastName.toLowerCase()}`;
      setForm(prev => ({ ...prev, username }));
    }
  }, [invitation, form.username]);

  const validateInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/invitations/validate/${invitationToken}`);
      const data = await response.json();
      
      if (data.success) {
        setInvitation(data.data);
      } else {
        setErrors({ token: data.error });
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      setErrors({ token: 'Error validating invitation' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (form.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(form.username)) {
      newErrors.username = 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (form.password !== form.passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match';
    }

    if (!form.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms of service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAcceptInvitation = async () => {
    if (!validateForm() || !token) return;

    try {
      setSubmitting(true);
      setErrors({});

      const response = await fetch('/api/public/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          username: form.username,
          password: form.password,
          acceptTerms: form.acceptTerms
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Account created successfully! You can now sign in.',
              email: invitation?.email 
            }
          });
        }, 3000);
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setErrors({ submit: 'Connection error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: keyof AcceptanceForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();

  // Custom Checkbox Component
  const CustomCheckbox = ({ 
    checked, 
    onChange, 
    id, 
    className = '',
    hasError = false 
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    id: string;
    className?: string;
    hasError?: boolean;
  }) => {
    return (
      <div className={`relative ${className}`}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <label
          htmlFor={id}
          className={`
            relative flex items-center justify-center w-5 h-5 
            border rounded-md cursor-pointer transition-all duration-200 ease-in-out
            ${checked 
              ? 'bg-gray-900 border-gray-900' 
              : hasError 
                ? 'bg-white border-red-300 hover:border-red-400' 
                : 'bg-white border-gray-300 hover:border-gray-400'
            }
            focus-within:ring-2 focus-within:ring-gray-500 focus-within:ring-offset-2
          `}
        >
          {checked && (
            <svg 
              className="w-3 h-3 text-white transition-opacity duration-200 ease-in-out"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </label>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    );
  }

  if (errors.token || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
              <CardDescription>
                This invitation is not valid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.token}</AlertDescription>
              </Alert>
              
              <div className="mt-4 text-center">
                <Button onClick={() => navigate('/')}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <CardTitle className="text-yellow-600">Invitation Expired</CardTitle>
              <CardDescription>
                This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Contact {invitation.inviterName} to receive a new invitation.
                </p>
                
                <Button onClick={() => navigate('/')}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Welcome!</CardTitle>
              <CardDescription>
                Your account has been created successfully.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm">
                    You will be redirected to the login page in a few seconds...
                  </p>
                </div>
                
                <Button onClick={() => navigate('/login')}>
                  Sign in now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join Organization</h1>
          <p className="text-gray-600 mt-2">Complete your account setup</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Account Setup
            </CardTitle>
            <CardDescription>
              You've been invited to join {invitation.organizationName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-600" />
                <span className="font-medium">{invitation.organizationName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span>Invited by {invitation.inviterName}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <span>{invitation.email}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Role: <span className="font-medium capitalize">{invitation.role}</span>
              </div>
            </div>

            {/* Account Setup Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => updateForm('username', e.target.value)}
                    placeholder="john.doe"
                    className={`pl-10 ${errors.username ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  This will be your unique identifier in the organization
                </p>
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Minimum 8 characters"
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="passwordConfirm">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={form.passwordConfirm}
                    onChange={(e) => updateForm('passwordConfirm', e.target.value)}
                    placeholder="Confirm your password"
                    className={`pl-10 ${errors.passwordConfirm ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.passwordConfirm && (
                  <p className="text-red-500 text-sm mt-1">{errors.passwordConfirm}</p>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-3">
              <CustomCheckbox
                id="acceptTerms"
                checked={form.acceptTerms}
                onChange={(checked) => updateForm('acceptTerms', checked)}
                className="flex-shrink-0 mt-0.5"
                hasError={!!errors.acceptTerms}
              />
              <Label htmlFor="acceptTerms" className="text-sm cursor-pointer leading-5">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline" target="_blank">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                  Privacy Policy
                </a>
                {' '}*
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-red-500 text-sm">{errors.acceptTerms}</p>
            )}

            {/* Errors */}
            {errors.submit && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleAcceptInvitation}
              disabled={submitting || !form.acceptTerms}
              className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Join Organization
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};