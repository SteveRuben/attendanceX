// src/pages/auth/Login.tsx - Version moderne et optimisée
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useAuth } from '@/hooks/use-auth';
import { useLoginValidation } from '@/hooks/useValidation';
import { verificationToasts, validationToast } from '@/utils/notifications';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Shield, RefreshCw } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [emailNotVerified, setEmailNotVerified] = useState<{
    email: string;
    canResend: boolean;
    lastVerificationSent?: string;
    rateLimitInfo?: {
      remainingAttempts: number;
      resetTime: string;
      waitTime?: number;
    };
  } | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendError, setResendError] = useState<string>('');
  
  const { login, isAuthenticated, resendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Enhanced validation
  const { 
    errors, 
    validateField, 
    validateForm, 
    getFieldValidation,
    clearErrors,
    setFieldTouched 
  } = useLoginValidation({ validateOnChange: true, validateOnBlur: true });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Get redirect message from location state
  const redirectMessage = location.state?.message;

  // Form validation is now handled by the useLoginValidation hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form using the validation hook
    const isFormValid = validateForm(formData);
    if (!isFormValid) {
      validationToast(errors);
      return;
    }
    
    setLoading(true);
    setGeneralError('');
    setEmailNotVerified(null);
    clearErrors();

    try {
      await login(formData.email, formData.password, rememberMe);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      // Handle EMAIL_NOT_VERIFIED error specifically
      if (error.message === 'EMAIL_NOT_VERIFIED' || error.message.includes('Email non vérifié')) {
        setEmailNotVerified({
          email: formData.email,
          canResend: true, // Default to true, can be enhanced with backend response
          lastVerificationSent: undefined
        });
        setGeneralError('Votre email n\'est pas encore vérifié. Vérifiez votre boîte mail ou demandez un nouveau lien de vérification.');
        verificationToasts.emailNotVerified();
      } else if (error.message.includes('Invalid credentials') || error.message.includes('Identifiants invalides')) {
        setGeneralError('Email ou mot de passe invalide. Veuillez réessayer.');
      } else if (error.message.includes('Account locked') || error.message.includes('Compte verrouillé')) {
        setGeneralError('Votre compte a été temporairement verrouillé. Veuillez réessayer plus tard.');
      } else if (error.message.includes('Account suspended') || error.message.includes('Compte suspendu')) {
        setGeneralError('Votre compte a été suspendu. Contactez le support pour plus d\'informations.');
      } else {
        setGeneralError(error.message || 'Échec de la connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    validateField(name as keyof typeof formData, value);
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('');
    }
    
    // Clear email verification error when user changes email
    if (name === 'email' && emailNotVerified) {
      setEmailNotVerified(null);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFieldTouched(name as keyof typeof formData, true);
    validateField(name as keyof typeof formData, value);
  };

  const handleResendVerification = async () => {
    if (!emailNotVerified?.email) return;
    
    setResendingVerification(true);
    setResendError('');
    
    try {
      const result = await resendEmailVerification(emailNotVerified.email);
      
      if (result.success) {
        setGeneralError('Un nouveau lien de vérification a été envoyé à votre adresse email. Vérifiez votre boîte mail.');
        setEmailNotVerified(prev => prev ? { 
          ...prev, 
          lastVerificationSent: new Date().toISOString(),
          rateLimitInfo: result.rateLimitInfo
        } : null);
        verificationToasts.verificationResent(result.rateLimitInfo?.remainingAttempts);
      } else {
        setResendError(result.message);
        setEmailNotVerified(prev => prev ? { 
          ...prev, 
          rateLimitInfo: result.rateLimitInfo
        } : null);
        verificationToasts.verificationError(result.message);
      }
    } catch (error: any) {
      const errorMessage = (error as any).isRateLimit 
        ? 'Trop de demandes de vérification. Veuillez patienter avant de réessayer.'
        : error.message || 'Échec de l\'envoi de l\'email de vérification. Veuillez réessayer.';
      
      setResendError(errorMessage);
      setEmailNotVerified(prev => prev ? { 
        ...prev, 
        rateLimitInfo: (error as any).rateLimitInfo
      } : null);
      
      if ((error as any).isRateLimit) {
        verificationToasts.rateLimitExceeded((error as any).rateLimitInfo?.resetTime);
      } else {
        verificationToasts.verificationError(errorMessage);
      }
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bon retour</h1>
          <p className="text-gray-600 mt-2">Connectez-vous à votre compte AttendanceX</p>
        </div>

        {/* Redirect Message */}
        {redirectMessage && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{redirectMessage}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Connexion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* General Error */}
            {generalError && (
              <Alert className={`mb-4 ${emailNotVerified ? 'border-orange-200 bg-orange-50' : ''}`} variant={emailNotVerified ? "default" : "destructive"}>
                <AlertCircle className={`h-4 w-4 ${emailNotVerified ? 'text-orange-600' : ''}`} />
                <AlertDescription className={emailNotVerified ? 'text-orange-800' : ''}>
                  {generalError}
                  {emailNotVerified && emailNotVerified.canResend && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={resendingVerification || (emailNotVerified.rateLimitInfo?.remainingAttempts === 0)}
                          variant="outline"
                          size="sm"
                          className="border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400 disabled:opacity-50"
                        >
                          {resendingVerification ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Envoi en cours...
                            </>
                          ) : emailNotVerified.rateLimitInfo?.remainingAttempts === 0 ? (
                            <>
                              <AlertCircle className="w-4 h-4 mr-2" />
                              Limite atteinte
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Renvoyer l'email de vérification
                            </>
                          )}
                        </Button>
                        {emailNotVerified.lastVerificationSent && (
                          <span className="text-sm text-orange-600 self-center">
                            Dernier envoi: {new Date(emailNotVerified.lastVerificationSent).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      
                      {/* Rate Limit Information */}
                      {emailNotVerified.rateLimitInfo && (
                        <div className="text-sm text-orange-700">
                          {emailNotVerified.rateLimitInfo.remainingAttempts > 0 ? (
                            <p>{emailNotVerified.rateLimitInfo.remainingAttempts} tentative{emailNotVerified.rateLimitInfo.remainingAttempts > 1 ? 's' : ''} restante{emailNotVerified.rateLimitInfo.remainingAttempts > 1 ? 's' : ''}</p>
                          ) : (
                            <p>Limite de tentatives atteinte. Veuillez patienter.</p>
                          )}
                          {emailNotVerified.rateLimitInfo.resetTime && (
                            <p className="mt-1">
                              Limite réinitialisée à: {new Date(emailNotVerified.rateLimitInfo.resetTime).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Resend Error */}
                      {resendError && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          {resendError}
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                {/* Email Field */}
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                    Adresse email
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
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Entrez votre email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-2 block">
                    Mot de passe
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
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`pl-10 pr-10 w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="Entrez votre mot de passe"
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
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Se souvenir de moi
                  </Label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-700 hover:text-gray-900 hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || resendingVerification}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12 relative"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>

              {/* Email Verification Help */}
              {emailNotVerified && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Vérification d'email requise</p>
                      <p className="mb-2">
                        Pour des raisons de sécurité, vous devez vérifier votre adresse email avant de pouvoir vous connecter.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Vérifiez votre boîte mail (y compris les spams)</li>
                        <li>Cliquez sur le lien de vérification dans l'email</li>
                        <li>Revenez ici pour vous connecter</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Nouveau sur AttendanceX ?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/register"
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                >
                  Créer un compte
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            En vous connectant, vous acceptez nos{' '}
            <Link to="/terms" className="text-gray-700 hover:text-gray-900 hover:underline">
              Conditions d'utilisation
            </Link>
            {' '}et notre{' '}
            <Link to="/privacy" className="text-gray-700 hover:text-gray-900 hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Login;