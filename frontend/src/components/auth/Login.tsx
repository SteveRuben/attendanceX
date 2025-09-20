import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Eye, EyeOff, Mail, Lock, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';
import type { TenantMembership } from '../../types/tenant.types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useMultiTenantAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantId: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showTenantSelection, setShowTenantSelection] = useState(false);
  const [userTenants, setUserTenants] = useState<TenantMembership[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const result = await login(
        formData.email,
        formData.password,
        formData.tenantId || undefined,
        formData.rememberMe
      );

      // Si l'utilisateur doit sélectionner un tenant
      if (result.data.requiresTenantSelection && result.data.availableTenants) {
        setUserTenants(result.data.availableTenants);
        setShowTenantSelection(true);
        return;
      }

      // Connexion réussie
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
    }
  };

  const handleTenantSelection = async (selectedTenantId: string) => {
    try {
      await login(
        formData.email,
        formData.password,
        selectedTenantId,
        formData.rememberMe
      );

      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to login with selected tenant.';
      setErrors({ general: errorMessage });
      setShowTenantSelection(false);
    }
  };

  // Custom Checkbox Component (same as Register)
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

  // Affichage de la sélection de tenant
  if (showTenantSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="text-center space-y-1 pb-6">
              <CardTitle className="text-xl text-gray-900">Select Organization</CardTitle>
              <CardDescription>
                You have access to multiple organizations. Please select one to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userTenants.map((membership) => (
                <Button
                  key={membership.tenantId}
                  variant="outline"
                  className="w-full p-4 h-auto justify-start"
                  onClick={() => handleTenantSelection(membership.tenantId)}
                  disabled={isLoading}
                >
                  <div className="text-left">
                    <div className="font-medium">
                      Organization {membership.tenantId}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      Role: {membership.role}
                    </div>
                  </div>
                </Button>
              ))}
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowTenantSelection(false)}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Formulaire de connexion principal
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header - Identique au Register */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in to your AttendanceX account</p>
        </div>

        {/* Login Form - Structure identique au Register */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Sign in</CardTitle>
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
              <div className="space-y-4">
                {/* Email */}
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
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="john@company.com"
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
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`pl-10 pr-10 w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 border-none bg-transparent focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Organization ID (optional) */}
                <div>
                  <Label htmlFor="tenantId" className="text-sm font-medium text-gray-700 mb-2 block">
                    Organization ID <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="tenantId"
                    name="tenantId"
                    type="text"
                    value={formData.tenantId}
                    onChange={handleInputChange}
                    placeholder="Enter organization ID if known"
                    disabled={isLoading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to see all available organizations after login
                  </p>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CustomCheckbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onChange={(checked) => setFormData(prev => ({ ...prev, rememberMe: checked }))}
                    className="flex-shrink-0"
                  />
                  <Label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
                    Remember me
                  </Label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-700 hover:text-gray-900 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button - Identique au Register */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
              >
                <div className="flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      <span>Sign in</span>
                    </>
                  )}
                </div>
              </Button>
            </form>

            {/* Divider - Identique au Register */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/register"
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                >
                  Create account
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;