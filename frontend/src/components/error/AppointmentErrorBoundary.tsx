// src/components/error/AppointmentErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class AppointmentErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    console.error('Appointment Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  private getErrorMessage = (error: Error): string => {
    // Customize error messages based on error type
    if (error.message.includes('ChunkLoadError')) {
      return 'Erreur de chargement de l\'application. Veuillez actualiser la page.';
    }

    if (error.message.includes('Network Error')) {
      return 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
    }

    if (error.message.includes('ValidationError')) {
      return 'Erreur de validation des données. Veuillez vérifier les informations saisies.';
    }

    if (error.message.includes('AuthenticationError')) {
      return 'Erreur d\'authentification. Veuillez vous reconnecter.';
    }

    if (error.message.includes('PermissionError')) {
      return 'Vous n\'avez pas les permissions nécessaires pour cette action.';
    }

    return 'Une erreur inattendue s\'est produite dans le système de rendez-vous.';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Network Error')) {
      return 'medium';
    }

    if (error.message.includes('AuthenticationError') || error.message.includes('PermissionError')) {
      return 'high';
    }

    if (error.message.includes('ValidationError')) {
      return 'low';
    }

    return 'critical';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.getErrorMessage(this.state.error);
      const severity = this.getErrorSeverity(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  severity === 'critical' ? 'bg-red-100' :
                  severity === 'high' ? 'bg-orange-100' :
                  severity === 'medium' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  <AlertTriangle className={`w-8 h-8 ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>
              </div>
              <CardTitle className="text-2xl text-gray-900">
                Oops ! Une erreur s'est produite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-base">
                  {errorMessage}
                </AlertDescription>
              </Alert>

              {this.state.retryCount > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tentative {this.state.retryCount} sur {this.maxRetries}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                )}
                
                <Button variant="outline" onClick={this.handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </div>

              {/* Development mode: Show error details */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    <Bug className="w-4 h-4 inline mr-2" />
                    Détails techniques (développement)
                  </summary>
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700">Message d'erreur :</h4>
                        <p className="text-sm text-red-600 font-mono mt-1">
                          {this.state.error.message}
                        </p>
                      </div>
                      
                      {this.state.error.stack && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700">Stack trace :</h4>
                          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700">Component stack :</h4>
                          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}

              <div className="text-center text-sm text-gray-500">
                <p>
                  Si le problème persiste, veuillez contacter le support technique.
                </p>
                <p className="mt-1">
                  Code d'erreur: {this.state.error.name}-{Date.now().toString(36)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors in functional components
export const useAppointmentErrorHandler = () => {
  const handleError = (error: Error, context?: string) => {
    console.error(`Appointment Error${context ? ` in ${context}` : ''}:`, error);

    // Log to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { tags: { context } });
    }

    // You could also dispatch to a global error state here
    // Example: dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    // Clear global error state
    // Example: dispatch({ type: 'CLEAR_ERROR' });
  };

  return { handleError, clearError };
};

// Higher-order component for wrapping components with error boundary
export const withAppointmentErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <AppointmentErrorBoundary fallback={fallback}>
      <Component {...props} />
    </AppointmentErrorBoundary>
  );

  WrappedComponent.displayName = `withAppointmentErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};