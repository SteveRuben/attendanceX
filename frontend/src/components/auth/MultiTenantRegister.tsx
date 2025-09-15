import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, User, Mail, Lock, Building, ArrowRight, AlertCircle, Shield, Check } from 'lucide-react';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';

const MultiTenantRegister: React.FC = () => {
  const navigate = useNavigate();
  const { createTenant, isLoading } = useMultiTenantAuth();
  
  const [formData, setFormData] = useState({
    // Organization info
    organizationName: '',
    organizationSlug: '',
    
    // Admin user info
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Plan selection
    planId: 'basic',
    
    // Terms
    acceptTerms: false,
    acceptPrivacy: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Auto-generate slug from organization name
    if (name === 'organizationName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, organizationSlug: slug }));
    }
    
    // Calculate password strength
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 6) strength += 1;
      if (value.length >= 8) strength += 1;
      if (/[A-Z]/.test(value)) strength += 1;
      if (/[0-9]/.test(value)) strength += 1;
      if (/[^A-Za-z0-9]/.test(value)) strength += 1;
      setPasswordStrength(strength);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Organization validation
    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    
    if (!formData.organizationSlug.trim()) {
      newErrors.organizationSlug = 'Organization slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.organizationSlug)) {
      newErrors.organizationSlug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    // User validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms of service';
    }
    
    if (!formData.acceptPrivacy) {
      newErrors.acceptPrivacy = 'You must accept the privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const tenantData = {
        name: formData.organizationName,
        slug: formData.organizationSlug,
        planId: formData.planId,
        adminUser: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password
        },
        settings: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: 'en',
          currency: 'USD'
        }
      };

      await createTenant(tenantData);
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-yellow-500';
    if (passwordStrength <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong';
  };

  // Custom Checkbox Component (identique au Login)
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

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Free',
      description: 'Perfect for small teams getting started',
      features: ['Up to 10 users', 'Basic reporting', 'Email support']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$29/month',
      description: 'For growing teams that need more features',
      features: ['Up to 100 users', 'Advanced reporting', 'Priority support', 'Integrations']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Contact us',
      description: 'For large organizations with custom needs',
      features: ['Unlimited users', 'Advanced analytics', 'Dedicated support', 'API access']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Header - Identique au Login */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-600 mt-2">Get started with AttendanceX in seconds</p>
        </div>

        {/* Register Form - Structure identique au Login */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Sign up</CardTitle>
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
              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700 mb-2 block">
                      Organization Name
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                      <Input
                        id="organizationName"
                        name="organizationName"
                        type="text"
                        value={formData.organizationName}
                        onChange={handleInputChange}
                        placeholder="Your Company"
                        className={`pl-10 w-full ${errors.organizationName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.organizationName && (
                      <p className="mt-1 text-sm text-red-600">{errors.organizationName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="organizationSlug" className="text-sm font-medium text-gray-700 mb-2 block">
                      Organization URL
                    </Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        yourapp.com/
                      </span>
                      <Input
                        id="organizationSlug"
                        name="organizationSlug"
                        type="text"
                        value={formData.organizationSlug}
                        onChange={handleInputChange}
                        placeholder="organization-name"
                        className={`rounded-l-none ${errors.organizationSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.organizationSlug && (
                      <p className="mt-1 text-sm text-red-600">{errors.organizationSlug}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Admin Account</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                      First name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className={`pl-10 w-full ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
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
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className={`pl-10 w-full ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

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
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@company.com"
                      className={`pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="At least 6 characters"
                        className={`pl-10 pr-10 w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 border-none bg-transparent focus:outline-none cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{getPasswordStrengthText()}</span>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-2 block">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className={`pl-10 pr-10 w-full ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 border-none bg-transparent focus:outline-none cursor-pointer"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Choose Your Plan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-lg border p-4 cursor-pointer ${
                        formData.planId === plan.id
                          ? 'border-gray-900 ring-2 ring-gray-900'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, planId: plan.id }))}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{plan.name}</h4>
                        <div className="text-sm font-medium text-gray-900">{plan.price}</div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <Check className="h-3 w-3 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      {formData.planId === plan.id && (
                        <div className="absolute top-2 right-2">
                          <div className="h-4 w-4 bg-gray-900 rounded-full flex items-center justify-center">
                            <Check className="h-2 w-2 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CustomCheckbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={(checked) => setFormData(prev => ({ ...prev, acceptTerms: checked }))}
                    className="flex-shrink-0"
                    hasError={!!errors.acceptTerms}
                  />
                  <Label htmlFor="acceptTerms" className="text-sm text-gray-600 cursor-pointer leading-5 flex-1">
                    I agree to the{' '}
                    <Link to="/terms" className="text-gray-900 hover:underline font-medium">
                      Terms of Service
                    </Link>
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-sm text-red-600 ml-8">{errors.acceptTerms}</p>
                )}

                <div className="flex items-center space-x-3">
                  <CustomCheckbox
                    id="acceptPrivacy"
                    checked={formData.acceptPrivacy}
                    onChange={(checked) => setFormData(prev => ({ ...prev, acceptPrivacy: checked }))}
                    className="flex-shrink-0"
                    hasError={!!errors.acceptPrivacy}
                  />
                  <Label htmlFor="acceptPrivacy" className="text-sm text-gray-600 cursor-pointer leading-5 flex-1">
                    I agree to the{' '}
                    <Link to="/privacy" className="text-gray-900 hover:underline font-medium">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {errors.acceptPrivacy && (
                  <p className="text-sm text-red-600 ml-8">{errors.acceptPrivacy}</p>
                )}
              </div>

              {/* Submit Button - Identique au Login */}
              <Button
                type="submit"
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
                disabled={isLoading}
              >
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Creating organization...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      <span>Create Organization</span>
                    </>
                  )}
                </div>
              </Button>
            </form>

            {/* Divider - Identique au Login */}
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
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MultiTenantRegister;