import React, { Component, type ErrorInfo, type ReactNode} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class VerificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('VerificationErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Card className="bg-white border-red-200 shadow-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-red-600 w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-xl text-gray-900">
                  Erreur de vérification
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Une erreur s'est produite lors du processus de vérification
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <Mail className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {this.state.error?.message || 'Une erreur inattendue s\'est produite lors de la vérification de votre email.'}
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Que faire maintenant ?</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Vérifiez votre connexion internet</li>
                        <li>Réessayez le processus de vérification</li>
                        <li>Demandez un nouveau lien de vérification</li>
                        <li>Contactez le support si le problème persiste</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={this.handleRetry}
                    className="w-full bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer la vérification
                  </Button>
                  
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                  >
                    <Link to="/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Retour à la connexion
                    </Link>
                  </Button>
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Besoin d'aide ? Contactez-nous à{' '}
                    <a 
                      href="mailto:support@attendance-x.com" 
                      className="text-gray-700 hover:underline"
                    >
                      support@attendance-x.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default VerificationErrorBoundary;