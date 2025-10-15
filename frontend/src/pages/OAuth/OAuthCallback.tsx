import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

interface CallbackState {
  status: 'processing' | 'success' | 'error';
  message?: string;
  provider?: string;
  error?: string;
}

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>({ status: 'processing' });

  useEffect(() => {
    processCallback();
  }, []);

  const processCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Vérifier s'il y a une erreur OAuth
      if (error) {
        handleOAuthError(error, errorDescription);
        return;
      }

      // Vérifier les paramètres requis
      if (!code || !state) {
        handleOAuthError('invalid_request', 'Code ou state manquant');
        return;
      }

      // Décoder le state pour obtenir les informations du provider
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        handleOAuthError('invalid_state', 'State invalide');
        return;
      }

      const { provider, returnUrl } = stateData;

      setState({
        status: 'processing',
        message: `Finalisation de la connexion avec ${provider}...`,
        provider
      });

      // Si nous sommes dans un popup, envoyer les données au parent
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth_success',
          data: { code, state, provider }
        }, window.location.origin);
        
        window.close();
        return;
      }

      // Sinon, traiter directement la callback
      await handleDirectCallback(code, state, provider, returnUrl);

    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      handleOAuthError('processing_error', 'Erreur lors du traitement de la callback');
    }
  };

  const handleDirectCallback = async (code: string, state: string, provider: string, returnUrl?: string) => {
    try {
      const response = await fetch(`/api/user/integrations/${provider}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la connexion');
      }

      const { data } = await response.json();

      setState({
        status: 'success',
        message: `Connexion réussie avec ${provider}`,
        provider
      });

      // Rediriger après un délai
      setTimeout(() => {
        navigate(returnUrl || '/settings/integrations');
      }, 2000);

    } catch (error) {
      handleOAuthError('connection_failed', error instanceof Error ? error.message : 'Erreur de connexion');
    }
  };

  const handleOAuthError = (error: string, description?: string | null) => {
    let userMessage = 'Une erreur est survenue lors de la connexion';

    switch (error) {
      case 'access_denied':
        userMessage = 'Vous avez refusé l\'autorisation';
        break;
      case 'invalid_request':
        userMessage = 'Demande d\'autorisation invalide';
        break;
      case 'invalid_scope':
        userMessage = 'Permissions demandées invalides';
        break;
      case 'server_error':
        userMessage = 'Erreur du serveur d\'autorisation';
        break;
      case 'temporarily_unavailable':
        userMessage = 'Service temporairement indisponible';
        break;
      default:
        if (description) {
          userMessage = description;
        }
    }

    setState({
      status: 'error',
      error: userMessage,
      provider: searchParams.get('provider') || undefined
    });

    // Si nous sommes dans un popup, informer le parent de l'erreur
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth_error',
        data: { error: userMessage }
      }, window.location.origin);
      
      setTimeout(() => window.close(), 3000);
    }
  };

  const handleRetry = () => {
    // Retourner à la page des intégrations pour réessayer
    navigate('/settings/integrations');
  };

  const handleClose = () => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth_cancelled',
        data: {}
      }, window.location.origin);
      window.close();
    } else {
      navigate('/settings/integrations');
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${getStatusColor()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle>
            {state.status === 'processing' && 'Connexion en cours...'}
            {state.status === 'success' && 'Connexion réussie !'}
            {state.status === 'error' && 'Erreur de connexion'}
          </CardTitle>
          <CardDescription>
            {state.provider && `Intégration avec ${state.provider}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.message && (
            <div className="text-center text-sm text-gray-600">
              {state.message}
            </div>
          )}

          {state.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Votre compte a été connecté avec succès. Vous allez être redirigé automatiquement.
              </AlertDescription>
            </Alert>
          )}

          {state.status === 'processing' && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">
                Finalisation de la connexion...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-2">
            {state.status === 'error' && (
              <>
                <Button variant="outline" onClick={handleClose}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={handleRetry}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </>
            )}

            {state.status === 'success' && (
              <Button onClick={() => navigate('/settings/integrations')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux intégrations
              </Button>
            )}

            {window.opener && (
              <Button variant="outline" onClick={handleClose}>
                Fermer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};