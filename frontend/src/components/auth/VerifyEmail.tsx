import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  Shield,
  Clock,
  XCircle
} from 'lucide-react';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';
import useValidation from '../../hooks/useValidation';
import verificationToasts, { toastUtils } from '../../utils/notifications';
import VerificationErrorBoundary from './VerificationErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Alert, AlertDescription } from '../ui/alert';
import LoadingSpinner from '../ui/LoadingSpinner';
import ProgressIndicator from '../ui/ProgressIndicator';
import { Button } from '../ui/Button';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail, resendEmailVerification } = useMultiTenantAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'invalid' | 'used'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string>('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remainingAttempts: number;
    resetTime: string;
    waitTime?: number;
  } | null>(null);

  const token = searchParams.get('token');
  const hasVerified = useRef(false);

  // Validation for resend email form
  const { errors, validateField, getFieldValidation } = useValidation({ email: '' });

  // Progress steps for verification process
  const [verificationSteps, setVerificationSteps] = useState<Array<{
    id: string;
    title: string;
    status: 'current' | 'pending' | 'completed' | 'error';
  }>>([
    { id: 'validate', title: 'Validation du lien', status: 'current' },
    { id: 'verify', title: 'Vérification', status: 'pending' },
    { id: 'complete', title: 'Terminé', status: 'pending' }
  ]);

  useEffect(() => {
    if (hasVerified.current) {
      return;
    }

    const handleVerification = async () => {
      if (!token) {
        setStatus('invalid');
        setMessage('Aucun token de vérification fourni. Veuillez vérifier le lien dans votre email.');
        setVerificationSteps(prev => prev.map(step =>
          step.id === 'validate' ? { ...step, status: 'error' } : step
        ));
        verificationToasts.tokenInvalid();
        return;
      }

      hasVerified.current = true;

      try {
        setStatus('loading');
        setMessage('Vérification de votre adresse email en cours...');
        // Update progress: validation complete, verification in progress
        setVerificationSteps(prev => prev.map(step => {
          if (step.id === 'validate') return { ...step, status: 'completed' };
          if (step.id === 'verify') return { ...step, status: 'current' };
          return step;
        }));

        const verifyingToastId = verificationToasts.verifying();

        await verifyEmail(token);

        toastUtils.dismiss(verifyingToastId);
        setStatus('success');
        setMessage('Votre adresse email a été vérifiée avec succès ! Vous pouvez maintenant vous connecter.');

        // Update progress: all steps complete
        setVerificationSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));

        verificationToasts.emailVerified();

        // Start countdown for redirect
        const countdownInterval = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              navigate('/login', {
                replace: true,
                state: {
                  message: 'Email vérifié ! Vous pouvez maintenant vous connecter.',
                  type: 'success'
                }
              });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(countdownInterval);
      } catch (error: any) {
        // Update progress: verification failed
        setVerificationSteps(prev => prev.map(step =>
          step.id === 'verify' ? { ...step, status: 'error' } : step
        ));

        // Handle different error types based on backend error codes
        if (error.message == ('EMAIL_ALREADY_VERIFIED')) {
          // Email already verified - treat as success and redirect to login
          setStatus('success');
          setMessage('Votre adresse email est déjà vérifiée ! Vous pouvez vous connecter.');

          // Update progress: all steps complete
          setVerificationSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));

          verificationToasts.emailVerified();

          // Start countdown for redirect
          const countdownInterval = setInterval(() => {
            setRedirectCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                navigate('/login', {
                  replace: true,
                  state: {
                    message: 'Email déjà vérifié ! Vous pouvez vous connecter.',
                    type: 'success'
                  }
                });
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else if (error.message == ('VERIFICATION_TOKEN_EXPIRED') || error.message.includes('expired')) {
          setStatus('expired');
          setMessage('Ce lien de vérification a expiré. Les liens de vérification sont valides pendant 24 heures pour des raisons de sécurité.');
          verificationToasts.tokenExpired();
        } else if (error.message == ('VERIFICATION_TOKEN_USED') || error.message.includes('used')) {
          setStatus('used');
          setMessage('Ce lien de vérification a déjà été utilisé. Votre email est peut-être déjà vérifié.');
          verificationToasts.tokenUsed();
        } else if (error.message == ('INVALID_VERIFICATION_TOKEN') || error.message.includes('invalid')) {
          setStatus('invalid');
          setMessage('Ce lien de vérification est invalide. Veuillez vérifier le lien dans votre email ou demander un nouveau lien.');
          verificationToasts.tokenInvalid();
        } else if (error.message == ('EMAIL_NOT_VERIFIED')) {
          setStatus('error');
          setMessage('Erreur lors de la vérification. Veuillez réessayer ou demander un nouveau lien de vérification.');
          verificationToasts.verificationError();
        } else {
          setStatus('error');
          setMessage(error.message || 'Une erreur inattendue s\'est produite lors de la vérification. Veuillez réessayer.');
          verificationToasts.verificationError(error.message);
        }
      }
    };

    handleVerification();
  }, [token, verifyEmail, navigate]);

  const handleResendVerification = async () => {
    // Validate email before sending
    validateField('email', email);
    const emailValidation = getFieldValidation('email');

    if (!emailValidation.isValid) {
      setResendError(emailValidation.error || 'Veuillez entrer une adresse email valide');
      verificationToasts.invalidEmail();
      return;
    }

    try {
      setResending(true);
      setResendError('');
      setResendSuccess(false);
      setRateLimitInfo(null);

      const sendingToastId = verificationToasts.sendingVerification();

      const result = await resendEmailVerification(email);

      toastUtils.dismiss(sendingToastId);

      if (result.success) {
        setResendSuccess(true);
        setMessage('Un nouveau lien de vérification a été envoyé à votre adresse email.');
        setRateLimitInfo(result.rateLimitInfo || null);
        verificationToasts.verificationResent(result.rateLimitInfo?.remainingAttempts);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        setResendError(result.message);
        setRateLimitInfo(result.rateLimitInfo || null);
        verificationToasts.verificationError(result.message);
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);

      if ((error as any).isRateLimit) {
        setResendError('Trop de tentatives. Veuillez attendre avant de demander un nouveau lien.');
        setRateLimitInfo((error as any).rateLimitInfo);
        verificationToasts.rateLimitExceeded((error as any).rateLimitInfo?.resetTime);
      } else if (error.message.includes('valid email')) {
        setResendError('Veuillez entrer une adresse email valide');
        verificationToasts.invalidEmail();
      } else if (error.message.includes('required')) {
        setResendError('L\'adresse email est requise');
        verificationToasts.emailRequired();
      } else {
        setResendError(error.message || 'Échec de l\'envoi de l\'email de vérification');
        verificationToasts.verificationError(error.message);
      }
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
      case 'expired':
        return <Clock className="w-8 h-8 text-orange-600" />;
      case 'used':
        return <CheckCircle className="w-8 h-8 text-gray-600" />;
      case 'invalid':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'error':
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
      case 'expired':
        return 'border-orange-200 bg-orange-50';
      case 'used':
        return 'border-gray-200 bg-gray-50';
      case 'invalid':
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Vérification en cours...';
      case 'success':
        return 'Email vérifié !';
      case 'expired':
        return 'Lien expiré';
      case 'used':
        return 'Lien déjà utilisé';
      case 'invalid':
        return 'Lien invalide';
      case 'error':
        return 'Erreur de vérification';
      default:
        return 'Vérification d\'email';
    }
  };

  return (
    <VerificationErrorBoundary>
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
              {status === 'loading' && 'Veuillez patienter pendant que nous vérifions votre adresse email'}
              {status === 'success' && `Redirection vers la connexion dans ${redirectCountdown} seconde${redirectCountdown > 1 ? 's' : ''}`}
              {status === 'expired' && 'Le lien de vérification a expiré'}
              {status === 'used' && 'Ce lien a déjà été utilisé'}
              {status === 'invalid' && 'Le lien de vérification est invalide'}
              {status === 'error' && 'Une erreur s\'est produite lors de la vérification'}
            </p>
          </div>

          {/* Progress Indicator */}
          {status === 'loading' && (
            <div className="mb-6">
              <ProgressIndicator
                steps={verificationSteps}
                orientation="horizontal"
                className="px-4"
              />
            </div>
          )}

          {/* Status Card */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-xl text-center text-gray-900">
                Vérification d'email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Message */}
              <Alert className={getStatusColor()}>
                {status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : status === 'expired' ? (
                  <Clock className="h-4 w-4 text-orange-600" />
                ) : status === 'used' ? (
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                ) : status === 'invalid' ? (
                  <XCircle className="h-4 w-4 text-red-600" />
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
                        <p className="text-sm font-medium text-green-900">Compte activé</p>
                        <p className="text-sm text-green-700">Vous pouvez maintenant vous connecter à votre compte</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Redirection automatique</p>
                        <p className="text-sm text-blue-700">
                          Vous serez redirigé vers la page de connexion dans {redirectCountdown} seconde{redirectCountdown > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <Link to="/login">
                      <ArrowRight className="w-4 h-4" />
                      Aller à la connexion maintenant
                    </Link>
                  </Button>
                </div>
              )}

              {/* Error Actions */}
              {(status === 'error' || status === 'expired' || status === 'invalid' || status === 'used') && (
                <div className="space-y-4">
                  {/* Expired Token Actions */}
                  {status === 'expired' && (
                    <div className="space-y-3">
                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-900">Lien expiré</p>
                            <p className="text-sm text-orange-700">
                              Les liens de vérification expirent après 24 heures pour des raisons de sécurité.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Adresse email
                          </label>
                          <input
                            id="email"
                            type="email"
                            placeholder="Entrez votre adresse email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setResendError(''); // Clear error when user types
                              validateField('email', e.target.value); // Real-time validation
                            }}
                            onBlur={() => validateField('email', email)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${(resendError && resendError.includes('email')) || errors.email
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300'
                              }`}
                            disabled={resending}
                          />
                          {((resendError && resendError.includes('email')) || errors.email) && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.email || resendError}
                            </p>
                          )}
                        </div>

                        {/* Resend Success Message */}
                        {resendSuccess && (
                          <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                              Email de vérification envoyé avec succès ! Vérifiez votre boîte mail.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Resend Error Message */}
                        {resendError && !resendError.includes('email') && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              {resendError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Rate Limit Information */}
                        {rateLimitInfo && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                            {rateLimitInfo.remainingAttempts > 0 ? (
                              <p className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {rateLimitInfo.remainingAttempts} tentative{rateLimitInfo.remainingAttempts > 1 ? 's' : ''} restante{rateLimitInfo.remainingAttempts > 1 ? 's' : ''}
                              </p>
                            ) : (
                              <p className="flex items-center text-orange-600">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Limite de tentatives atteinte
                              </p>
                            )}
                            {rateLimitInfo.resetTime && (
                              <p className="mt-1 text-xs">
                                Limite réinitialisée à: {new Date(rateLimitInfo.resetTime).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        )}

                      <Button
                          onClick={handleResendVerification}
                          disabled={resending || !email.trim() || !!errors.email || (rateLimitInfo?.remainingAttempts === 0)}
                          variant="outline"
                          className="w-full relative"
                        >
                          {resending ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Envoi en cours...
                            </>
                          ) : rateLimitInfo?.remainingAttempts === 0 ? (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              Limite atteinte
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Envoyer un nouveau lien de vérification
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Already Used Token */}
                  {status === 'used' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Lien déjà utilisé</p>
                          <p className="text-sm text-gray-700">
                            Ce lien de vérification a déjà été utilisé. Votre email est peut-être déjà vérifié.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invalid Token */}
                  {status === 'invalid' && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Lien invalide</p>
                          <p className="text-sm text-red-700">
                            Ce lien de vérification est invalide. Veuillez vérifier le lien dans votre email.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* General Error */}
                  {status === 'error' && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Erreur de vérification</p>
                          <p className="text-sm text-red-700">
                            Une erreur s'est produite lors de la vérification. Veuillez réessayer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      
                      className="w-full bg-gray-900 text-white hover:bg-gray-800"
                    >
                      <Link to="/login">
                        <ArrowRight className="w-4 h-4" />
                        Essayer de se connecter
                      </Link>
                    </Button>

                    <Button
                      
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/register')}
                    >
                      Retour à l'inscription
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {status === 'loading' && (
                <div className="text-center py-8">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <LoadingSpinner
                      size="lg"
                      text="Vérification en cours..."
                      className="mb-4"
                    />
                    <p className="text-sm text-blue-700">
                      Cela peut prendre quelques instants. Veuillez ne pas fermer cette page.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Vérification sécurisée par AttendanceX</span>
            </div>

            {/* Help Text */}
            <div className="mt-4 text-xs text-gray-400">
              <p>Besoin d'aide ? Contactez-nous à support@attendance-x.com</p>
            </div>
          </div>
        </div>
      </div>
    </VerificationErrorBoundary>
  );
};

export default VerifyEmail;