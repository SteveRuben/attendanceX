// frontend/src/components/ui/ServiceFallback.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  CheckCircle 
} from 'lucide-react';

interface ServiceFallbackProps {
  serviceName: string;
  error?: Error | null;
  isOffline?: boolean;
  onRetry?: () => void;
  onContinueOffline?: () => void;
  fallbackContent?: React.ReactNode;
  showOfflineOption?: boolean;
}

const ServiceFallback: React.FC<ServiceFallbackProps> = ({
  serviceName,
  error,
  isOffline = false,
  onRetry,
  onContinueOffline,
  fallbackContent,
  showOfflineOption = false
}) => {
  const getErrorType = () => {
    if (isOffline) return 'offline';
    if (error?.message?.includes('404') || error?.message?.includes('Route not found')) {
      return 'not_implemented';
    }
    if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
      return 'network';
    }
    return 'unknown';
  };

  const errorType = getErrorType();

  const getErrorConfig = () => {
    switch (errorType) {
      case 'offline':
        return {
          icon: WifiOff,
          iconColor: 'text-gray-600',
          bgColor: 'bg-gray-100',
          title: 'Mode hors ligne',
          description: 'Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.',
          variant: 'info' as const
        };
      case 'not_implemented':
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: 'Service en développement',
          description: `Le service ${serviceName} n'est pas encore disponible. Vous pouvez continuer avec les fonctionnalités de base.`,
          variant: 'info' as const
        };
      case 'network':
        return {
          icon: Wifi,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: 'Problème de connexion',
          description: `Impossible de se connecter au service ${serviceName}. Vérifiez votre connexion internet.`,
          variant: 'warning' as const
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: 'Erreur de service',
          description: error?.message || `Une erreur s'est produite avec le service ${serviceName}.`,
          variant: 'destructive' as const
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  if (fallbackContent) {
    return (
      <div className="space-y-4">
        <Alert className={`border-${config.variant === 'info' ? 'blue' : config.variant === 'warning' ? 'orange' : 'red'}-200`}>
          <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
          <AlertDescription>
            {config.description}
          </AlertDescription>
        </Alert>
        {fallbackContent}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
        </div>
        <CardTitle className="text-xl text-gray-900">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={`border-${config.variant === 'info' ? 'blue' : config.variant === 'warning' ? 'orange' : 'red'}-200`}>
          <IconComponent className={`h-4 w-4 ${config.iconColor}`} />
          <AlertDescription>
            {config.description}
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col gap-2">
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          )}
          
          {showOfflineOption && onContinueOffline && (
            <Button variant="outline" onClick={onContinueOffline} className="w-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              Continuer en mode limité
            </Button>
          )}
        </div>

        {errorType === 'not_implemented' && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Cette fonctionnalité sera bientôt disponible
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceFallback;