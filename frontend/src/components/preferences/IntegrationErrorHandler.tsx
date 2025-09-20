import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Lightbulb
} from 'lucide-react';
import { IntegrationProvider } from '../../shared';
import { integrationService } from '../services/integrationService';

interface IntegrationError {
  id: string;
  code: string;
  message: string;
  provider: IntegrationProvider;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
  suggestions: string[];
  resolved: boolean;
}

interface IntegrationErrorHandlerProps {
  integrationId: string;
  provider: IntegrationProvider;
  onErrorResolved?: () => void;
}

export const IntegrationErrorHandler: React.FC<IntegrationErrorHandlerProps> = ({
  integrationId,
  provider,
  onErrorResolved
}) => {
  const [errors, setErrors] = useState<IntegrationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadErrors();
    
    // Polling pour les nouvelles erreurs
    const interval = setInterval(loadErrors, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, [integrationId]);

  const loadErrors = async () => {
    try {
      const errorData = await integrationService.getIntegrationErrors(integrationId);
      setErrors(errorData);
    } catch (error) {
      console.error('Erreur lors du chargement des erreurs:', error);
    }
  };

  const retryOperation = async (errorId: string) => {
    setRetrying(errorId);
    try {
      await integrationService.retryFailedOperation(integrationId, errorId);
      await loadErrors();
      onErrorResolved?.();
    } catch (error) {
      console.error('Erreur lors du retry:', error);
    } finally {
      setRetrying(null);
    }
  };

  const reconnectIntegration = async () => {
    setLoading(true);
    try {
      await integrationService.initiateReconnection(integrationId);
      await loadErrors();
      onErrorResolved?.();
    } catch (error) {
      console.error('Erreur lors de la reconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const markErrorAsResolved = async (errorId: string) => {
    try {
      await integrationService.markErrorAsResolved(errorId);
      await loadErrors();
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    }
  };

  const getErrorIcon = (error: IntegrationError) => {
    if (error.resolved) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    switch (error.code) {
      case 'TOKEN_EXPIRED':
      case 'TOKEN_INVALID':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'PERMISSION_DENIED':
      case 'AUTHORIZATION_REVOKED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getErrorSeverity = (error: IntegrationError): 'low' | 'medium' | 'high' => {
    const highSeverityCodes = ['AUTHORIZATION_REVOKED', 'PERMISSION_DENIED'];
    const mediumSeverityCodes = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'QUOTA_EXCEEDED'];
    
    if (highSeverityCodes.includes(error.code)) return 'high';
    if (mediumSeverityCodes.includes(error.code)) return 'medium';
    return 'low';
  };

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    const variants = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };

    const labels = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée'
    };

    return (
      <Badge className={variants[severity]}>
        {labels[severity]}
      </Badge>
    );
  };

  const activeErrors = errors.filter(e => !e.resolved);
  const resolvedErrors = errors.filter(e => e.resolved);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Erreurs actives */}
      {activeErrors.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Problèmes détectés ({activeErrors.length})
          </h4>
          
          {activeErrors.map((error) => {
            const severity = getErrorSeverity(error);
            
            return (
              <Card key={error.id} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getErrorIcon(error)}
                      <span>Erreur de synchronisation</span>
                      {getSeverityBadge(severity)}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {error.userMessage}
                    </AlertDescription>
                  </Alert>

                  {error.suggestions.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Actions recommandées:
                        </span>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {error.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {error.retryable && (
                      <Button
                        size="sm"
                        onClick={() => retryOperation(error.id)}
                        disabled={retrying === error.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${retrying === error.id ? 'animate-spin' : ''}`} />
                        Réessayer
                      </Button>
                    )}
                    
                    {['TOKEN_EXPIRED', 'TOKEN_INVALID', 'AUTHORIZATION_REVOKED'].includes(error.code) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={reconnectIntegration}
                        disabled={loading}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Reconnecter
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markErrorAsResolved(error.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marquer comme résolu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Erreurs résolues (historique récent) */}
      {resolvedErrors.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            <span className="inline-flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Problèmes résolus récents ({resolvedErrors.length})
            </span>
          </summary>
          
          <div className="mt-2 space-y-2">
            {resolvedErrors.slice(0, 3).map((error) => (
              <div key={error.id} className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-2 rounded">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{error.userMessage}</span>
                <span className="text-xs">
                  - {new Date(error.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Actions globales */}
      {activeErrors.length > 0 && (
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={loadErrors}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/help/integrations', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Aide
          </Button>
        </div>
      )}
    </div>
  );
};