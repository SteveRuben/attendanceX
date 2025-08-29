// src/pages/Auth/VerifyEmailRequired.tsx - Page pour demander la vérification d'email
import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';

const VerifyEmailRequired = () => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resendEmailVerification, logout } = useAuth();

  const state = location.state as {
    from?: Location;
    message?: string;
    email?: string;
    canResend?: boolean;
  } | null;

  const email = state?.email || user?.email || '';
  const canResend = state?.canResend !== false;

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Adresse email non disponible');
      return;
    }

    try {
      setIsResending(true);
      setResendSuccess(false);
      
      const response = await resendEmailVerification(email);
      
      if (response.success) {
        setResendSuccess(true);
        toast.success('Email de vérification envoyé avec succès');
      }
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      // Error is already handled by the hook with toast
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleGoBack = () => {
    if (state?.from) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vérification d'email requise</CardTitle>
          <CardDescription>
            Vous devez vérifier votre adresse email pour continuer
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {state?.message && (
            <Alert>
              <AlertDescription>
                {state.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Un email de vérification a été envoyé à :
            </p>
            <p className="font-medium text-foreground">
              {email}
            </p>
            
            <p className="text-sm text-muted-foreground">
              Cliquez sur le lien dans l'email pour vérifier votre compte.
            </p>

            {resendSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  Email de vérification envoyé avec succès ! Vérifiez votre boîte de réception.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-3">
            {canResend && (
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
                variant="default"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Renvoyer l'email de vérification
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Se déconnecter
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Vous ne trouvez pas l'email ? Vérifiez votre dossier spam ou{' '}
              <Link 
                to="/contact" 
                className="text-primary hover:underline"
              >
                contactez le support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailRequired;