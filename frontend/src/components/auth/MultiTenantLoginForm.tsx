// Formulaire de connexion multi-tenant
import React, { useState, useEffect } from 'react';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';
import type { TenantMembership } from '../../types/tenant.types';

interface MultiTenantLoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  defaultEmail?: string;
  defaultTenantId?: string;
}

export const MultiTenantLoginForm: React.FC<MultiTenantLoginFormProps> = ({
  onSuccess,
  onError,
  defaultEmail = '',
  defaultTenantId = ''
}) => {
  const { login, isLoading, availableTenants } = useMultiTenantAuth();
  
  const [formData, setFormData] = useState({
    email: defaultEmail,
    password: '',
    tenantId: defaultTenantId,
    rememberMe: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTenantSelection, setShowTenantSelection] = useState(false);
  const [userTenants, setUserTenants] = useState<TenantMembership[]>([]);

  // Réinitialiser les erreurs quand les données changent
  useEffect(() => {
    setErrors({});
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    }
  };

  const handleTenantSelection = async (selectedTenantId: string) => {
    try {
      setFormData(prev => ({ ...prev, tenantId: selectedTenantId }));
      
      const result = await login(
        formData.email,
        formData.password,
        selectedTenantId,
        formData.rememberMe
      );

      setShowTenantSelection(false);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to login with selected tenant.';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    }
  };

  // Affichage de la sélection de tenant
  if (showTenantSelection) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Select Organization</h2>
          <p className="text-gray-600 mt-2">
            You have access to multiple organizations. Please select one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {userTenants.map((membership) => (
            <button
              key={membership.tenantId}
              onClick={() => handleTenantSelection(membership.tenantId)}
              className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              disabled={isLoading}
            >
              <div className="font-medium text-gray-900">
                {/* Nom du tenant - à récupérer depuis l'API */}
                Organization {membership.tenantId}
              </div>
              <div className="text-sm text-gray-500 capitalize">
                Role: {membership.role}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowTenantSelection(false)}
          className="w-full mt-4 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isLoading}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // Formulaire de connexion principal
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
        <p className="text-gray-600 mt-2">Welcome back! Please sign in to your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Erreur générale */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Mot de passe */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Tenant ID (optionnel) */}
        <div>
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-1">
            Organization ID <span className="text-gray-500">(optional)</span>
          </label>
          <input
            type="text"
            id="tenantId"
            name="tenantId"
            value={formData.tenantId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter organization ID (if known)"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to see all available organizations after login
          </p>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isLoading}
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
            Remember me
          </label>
        </div>

        {/* Bouton de connexion */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Liens supplémentaires */}
      <div className="mt-6 text-center space-y-2">
        <a
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Forgot your password?
        </a>
        <div className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
};