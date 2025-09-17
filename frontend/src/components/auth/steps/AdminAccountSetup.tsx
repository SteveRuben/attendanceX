import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, User, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Shield, Check } from 'lucide-react';
import type { OnboardingData } from '../OnboardingFlow';

interface AdminAccountSetupProps {
  data: OnboardingData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

export const AdminAccountSetup: React.FC<AdminAccountSetupProps> = ({
  data,
  errors,
  onUpdate,
  onComplete,
  onPrev,
  isLoading
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleInputChange = (field: keyof OnboardingData, value: string | boolean) => {
    onUpdate({ [field]: value });
    
    // Calculate password strength
    if (field === 'password' && typeof value === 'string') {
      let strength = 0;
      if (value.length >= 6) strength += 1;
      if (value.length >= 8) strength += 1;
      if (/[A-Z]/.test(value)) strength += 1;
      if (/[0-9]/.test(value)) strength += 1;
      if (/[^A-Za-z0-9]/.test(value)) strength += 1;
      setPasswordStrength(strength);
    }
  };

  const validateForm = (): boolean => {
    return !!(
      data.firstName.trim() &&
      data.lastName.trim() &&
      data.email.trim() &&
      /\S+@\S+\.\S+/.test(data.email) &&
      data.password &&
      data.password.length >= 6 &&
      data.acceptTerms &&
      data.acceptPrivacy
    );
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

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create admin account</h1>
          <p className="text-gray-600 mt-2">Set up your administrator account</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div className="w-16 h-1 bg-green-600"></div>
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div className="w-16 h-1 bg-green-600"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">Step 3 of 3</div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Admin Account</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 mb-2 block">
                    First name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                    <Input
                      id="firstName"
                      type="text"
                      value={data.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
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
                    Last name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                    <Input
                      id="lastName"
                      type="text"
                      value={data.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
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
                  Email address *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="john@company.com"
                    className={`pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={data.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
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
                {data.password && (
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

              {/* Terms and Conditions */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CustomCheckbox
                    id="acceptTerms"
                    checked={data.acceptTerms}
                    onChange={(checked) => handleInputChange('acceptTerms', checked)}
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
                    checked={data.acceptPrivacy}
                    onChange={(checked) => handleInputChange('acceptPrivacy', checked)}
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
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={onPrev}
                disabled={isLoading}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={onComplete}
                disabled={!validateForm() || isLoading}
                className="bg-gray-900 text-white hover:bg-gray-800 font-medium"
              >
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      <span>Create Organization</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};