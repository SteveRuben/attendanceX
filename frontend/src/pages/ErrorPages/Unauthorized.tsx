// src/pages/ErrorPages/Unauthorized.tsx - Page d'accès non autorisé
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Home, AlertTriangle } from 'lucide-react';

const Unauthorized = () => {
  const location = useLocation();
  const message = location.state?.message || 'Vous n\'avez pas l\'autorisation d\'accéder à cette page.';
  const requiredRoles = location.state?.requiredRoles;
  const requiredPermissions = location.state?.requiredPermissions;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Accès refusé</h1>
          <p className="text-gray-600 mt-2">Vous n'êtes pas autorisé à accéder à cette ressource</p>
        </div>

        {/* Error Card */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center text-gray-900 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              Autorisation requise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>

            {requiredRoles && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Rôles requis :</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {requiredRoles.map((role: string) => (
                    <li key={role} className="capitalize">{role}</li>
                  ))}
                </ul>
              </div>
            )}

            {requiredPermissions && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Permissions requises :</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {requiredPermissions.map((permission: string) => (
                    <li key={permission}>{permission.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center text-sm text-gray-600">
              <p>Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button asChild className="flex-1">
                <Link to="/dashboard">
                  <Home className="w-4 h-4 mr-2" />
                  Accueil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Besoin d'aide ?{' '}
            <Link to="/help" className="text-gray-700 hover:text-gray-900 hover:underline font-medium">
              Consultez notre centre d'aide
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;