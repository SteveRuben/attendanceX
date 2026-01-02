import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import authService from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use AuthContext login method
      await login(formData.email, formData.password);

      // The auth service has already checked tenants and set needsOnboarding
      // We can now check the value and redirect accordingly
      const needsOnboarding = authService.needsOnboarding();
      
      console.log('🔍 Login successful, checking redirection:', {
        needsOnboarding,
        tenantId: authService.getTenantId(),
        user: authService.getCurrentUser(),
        callbackUrl: router.query.callbackUrl
      });
      
      // Check if there's a callback URL from the query parameters
      const callbackUrl = router.query.callbackUrl as string;
      
      // Add a small delay to ensure tokens are stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (callbackUrl) {
        console.log('🔄 Redirecting to callback URL:', callbackUrl);
        await router.push(callbackUrl);
      } else if (needsOnboarding) {
        console.log('🚀 Redirecting to onboarding - user has no tenant');
        await router.push('/onboarding');
      } else {
        console.log('🚀 Redirecting to dashboard - user has tenant');
        await router.push('/app');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Une erreur s\'est produite lors de la connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte AttendanceX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <Alert variant="destructive" data-cy="login-error">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10"
                  data-cy="email-input"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive" data-cy="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Votre mot de passe"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10"
                  data-cy="password-input"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" data-cy="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-cy="login-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" data-cy="loading-spinner" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>

            <div className="text-center">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-blue-600 hover:underline"
                data-cy="forgot-password-link"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}