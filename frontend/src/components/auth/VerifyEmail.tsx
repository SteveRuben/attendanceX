/**
 * Page de vérification d'email
 * Permet aux utilisateurs de vérifier leur email après inscription
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  Shield,
  ArrowLeft
} from 'lucide-react';

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'expired';
  message: string;
  tenantId?: string;
  setupUrl?: string;
}

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'loading',
    message: 'Vérification en cours...'
  });
  const [resending, setResending] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token && email) {
      verifyEmail(token, email);
    } else {
      setVerificationState({
        status: 'error',
        message: 'Lien de vérification invalide. Paramètres manquants.'
      });
    }
  }, [token, email]);

  const verifyEmail = async (verificationToken: string, userEmail: string) => {
    try {
      const response = await fetch('/api/public/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken,
          email: userEmail
        })
      });

      const result = await response.json();

      if (result.success) {
        setVerificationState({
          status: 'success',
          message: result.data.message,
          tenantId: result.data.tenantId,
          setupUrl: result.data.setupUrl
        });
      } else {
        setVerificationState({
          status: 'error',
          message: result.error || 'Erreur lors de la vérification'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState({
        status: 'error',
        message: 'Erreur de connexion. Veuillez réessayer.'
      });
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) return;

    try {
      setResending(true);
      
      const response = await fetch('/api/public/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      const result = await response.json();

      if (result.success) {
        setVerificationState({
          status: 'loading',
          message: 'Un nouveau lien de vérification a été envoyé à votre email.'
        });
      } else {
        setVerificationState({
          status: 'error',
          message: result.error || 'Erreur lors de l\'envoi de l\'email'
        });
      }
    } catch (error) {
      console.error('Resend error:', error);
      setVerificationState({
        status: 'error',
        message: 'Erreur de connexion. Veuillez réessayer.'
      });
    } finally {
      setResending(false);
    }
  };

  const handleContinueSetup = () => {
    if (verificationState.setupUrl) {
      window.location.href = verificationState.setupUrl;
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Email Verification</h1>
          <p className="text-gray-600 mt-2">Confirming your email address</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {verificationState.status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <CardTitle>Vérification en cours</CardTitle>
                <CardDescription>
                  Nous vérifions votre email...
                </CardDescription>
              </>
            )}

            {verificationState.status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-green-600">Email vérifié !</CardTitle>
                <CardDescription>
                  Votre compte a été activé avec succès.
                </CardDescription>
              </>
            )}

            {verificationState.status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-red-600">Vérification échouée</CardTitle>
                <CardDescription>
                  Impossible de vérifier votre email.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className={
              verificationState.status === 'success' ? 'border-green-200 bg-green-50' :
              verificationState.status === 'error' ? 'border-red-200 bg-red-50' :
              'border-blue-200 bg-blue-50'
            }>
              <AlertDescription>
                {verificationState.message}
              </AlertDescription>
            </Alert>

            {verificationState.status === 'success' && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Prochaines étapes :</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Complétez la configuration de votre organisation</li>
                    <li>Personnalisez vos paramètres</li>
                    <li>Invitez vos premiers collaborateurs</li>
                    <li>Explorez les fonctionnalités</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleContinueSetup}
                    className="flex-1"
                  >
                    Continuer la configuration
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGoToLogin}
                  >
                    Se connecter
                  </Button>
                </div>
              </div>
            )}

            {verificationState.status === 'error' && (
              <div className="space-y-3">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Que faire ?</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Vérifiez que le lien n'est pas expiré (valide 24h)</li>
                    <li>Vérifiez que vous utilisez le bon email</li>
                    <li>Demandez un nouveau lien de vérification</li>
                    <li>Contactez le support si le problème persiste</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  {email && (
                    <Button 
                      onClick={resendVerificationEmail}
                      disabled={resending}
                      className="flex-1"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Renvoyer l'email
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/register')}
                  >
                    Nouvelle inscription
                  </Button>
                </div>
              </div>
            )}

            {verificationState.status === 'loading' && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Cette opération peut prendre quelques secondes...
                </p>
              </div>
            )}

            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations de contact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Besoin d'aide ? {' '}
            <a 
              href="mailto:support@attendance-x.com" 
              className="text-blue-600 hover:underline"
            >
              Contactez notre support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;