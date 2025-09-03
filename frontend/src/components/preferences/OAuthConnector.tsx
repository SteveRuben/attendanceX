import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  Calendar,
  Users,
  Mail,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

export interface OAuthConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  provider: {
    id: string;
    name: string;
    icon: React.ReactNode;
  };
  scopes?: string[];
  onSuccess: (integration: any) => void;
  onError: (error: string) => void;
}

interface OAuthState {
  status: 'idle' | 'authorizing' | 'exchanging' | 'success' | 'error';
  authUrl?: string;
  error?: string;
  progress: number;
}

const scopeDescriptions: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  'calendar.read': {
    label: 'Lecture du calendrier',
    description: 'Voir vos événements de calendrier',
    icon: <Calendar className="h-4 w-4" />
  },
  'calendar.write': {
    label: 'Écriture du calendrier',
    description: 'Créer et modifier vos événements',
    icon: <Calendar className="h-4 w-4" />
  },
  'contacts.read': {
    label: 'Lecture des contacts',
    description: 'Voir votre liste de contacts',
    icon: <Users className="h-4 w-4" />
  },
  'email.read': {
    label: 'Lecture des emails',
    description: 'Voir vos emails',
    icon: <Mail className="h-4 w-4" />
  },
  'files.read': {
    label: 'Lecture des fichiers',
    description: 'Voir vos fichiers stockés',
    icon: <FileText className="h-4 w-4" />
  },
  'profile.read': {
    label: 'Informations de profil',
    description: 'Voir vos informations de base',
    icon: <Eye className="h-4 w-4" />
  }
};

export const OAuthConnector: React.FC<OAuthConnectorProps> = ({
  isOpen,
  onClose,
  provider,
  scopes = [],
  onSuccess,
  onError
}) => {
  const [oauthState, setOAuthState] = useState<OAuthState>({
    status: 'idle',
    progress: 0
  });

  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setOAuthState({ status: 'idle', progress: 0 });
      if (popupWindow) {
        popupWindow.close();
        setPopupWindow(null);
      }
    }
  }, [isOpen, popupWindow]);

  useEffect(() => {
    // Écouter les messages du popup OAuth
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data;

      switch (type) {
        case 'oauth_success':
          handleOAuthSuccess(data);
          break;
        case 'oauth_error':
          handleOAuthError(data.error);
          break;
        case 'oauth_cancelled':
          handleOAuthCancelled();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const initiateOAuth = async () => {
    try {
      setOAuthState({ status: 'authorizing', progress: 25 });

      // Appeler l'API pour obtenir l'URL d'autorisation
      const response = await fetch(`/api/user/integrations/${provider.id}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          scopes,
          redirectUri: `${window.location.origin}/oauth/callback`
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'initialisation OAuth');
      }

      const { data } = await response.json();
      setOAuthState(prev => ({ ...prev, authUrl: data.authUrl, progress: 50 }));

      // Ouvrir le popup OAuth
      const popup = window.open(
        data.authUrl,
        'oauth_popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'autorisation. Vérifiez que les popups ne sont pas bloqués.');
      }

      setPopupWindow(popup);
      setOAuthState(prev => ({ ...prev, progress: 75 }));

      // Surveiller la fermeture du popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (oauthState.status === 'authorizing') {
            handleOAuthCancelled();
          }
        }
      }, 1000);

    } catch (error) {
      handleOAuthError(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  const handleOAuthSuccess = async (authData: any) => {
    try {
      setOAuthState({ status: 'exchanging', progress: 90 });

      // Échanger le code d'autorisation contre les tokens
      const response = await fetch(`/api/user/integrations/${provider.id}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(authData)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'échange des tokens');
      }

      const { data } = await response.json();
      
      setOAuthState({ status: 'success', progress: 100 });
      
      setTimeout(() => {
        onSuccess(data);
        onClose();
      }, 1500);

    } catch (error) {
      handleOAuthError(error instanceof Error ? error.message : 'Erreur lors de la finalisation');
    }
  };

  const handleOAuthError = (error: string) => {
    setOAuthState({ status: 'error', error, progress: 0 });
    onError(error);
    
    if (popupWindow) {
      popupWindow.close();
      setPopupWindow(null);
    }
  };

  const handleOAuthCancelled = () => {
    setOAuthState({ status: 'idle', progress: 0 });
    toast.info('Connexion annulée');
    
    if (popupWindow) {
      popupWindow.close();
      setPopupWindow(null);
    }
  };

  const getStatusIcon = () => {
    switch (oauthState.status) {
      case 'authorizing':
      case 'exchanging':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Shield className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (oauthState.status) {
      case 'authorizing':
        return 'Redirection vers l\'autorisation...';
      case 'exchanging':
        return 'Finalisation de la connexion...';
      case 'success':
        return 'Connexion réussie !';
      case 'error':
        return 'Erreur de connexion';
      default:
        return 'Prêt à se connecter';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {provider.icon}
            <span>Connexion à {provider.name}</span>
          </DialogTitle>
          <DialogDescription>
            Autorisez l'accès à vos données pour activer la synchronisation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statut de la connexion */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon()}
            <div>
              <div className="font-medium">{getStatusText()}</div>
              {oauthState.status === 'authorizing' && (
                <div className="text-sm text-gray-600">
                  Une nouvelle fenêtre va s'ouvrir pour l'autorisation
                </div>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          {oauthState.progress > 0 && (
            <Progress value={oauthState.progress} className="w-full" />
          )}

          {/* Erreur */}
          {oauthState.status === 'error' && oauthState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{oauthState.error}</AlertDescription>
            </Alert>
          )}

          {/* Permissions demandées */}
          {scopes.length > 0 && oauthState.status === 'idle' && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Permissions demandées :</div>
              <div className="space-y-2">
                {scopes.map((scope) => {
                  const scopeInfo = scopeDescriptions[scope];
                  if (!scopeInfo) return null;

                  return (
                    <div key={scope} className="flex items-center space-x-3 p-2 bg-blue-50 rounded">
                      {scopeInfo.icon}
                      <div>
                        <div className="text-sm font-medium">{scopeInfo.label}</div>
                        <div className="text-xs text-gray-600">{scopeInfo.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={oauthState.status === 'authorizing' || oauthState.status === 'exchanging'}
            >
              Annuler
            </Button>
            
            {oauthState.status === 'idle' && (
              <Button onClick={initiateOAuth}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Se connecter
              </Button>
            )}
            
            {oauthState.status === 'error' && (
              <Button onClick={initiateOAuth}>
                Réessayer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};