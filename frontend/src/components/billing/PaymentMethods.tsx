/**
 * Composant de gestion des méthodes de paiement
 * Placeholder pour future implémentation complète
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star,
  Info,
  AlertTriangle
} from 'lucide-react';
import { PaymentMethod } from '../../services/billingService';
import { formatCardNumber } from '../../utils/formatters';

interface PaymentMethodsProps {
  onPaymentMethodChanged?: () => void;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({ 
  onPaymentMethodChanged 
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implémenter quand le service sera disponible
      // const methods = await billingService.getPaymentMethods();
      // setPaymentMethods(methods);
      
      // Données de démonstration pour l'instant
      setPaymentMethods([
        {
          id: 'pm_demo_1',
          type: 'card',
          lastFour: '4242',
          expiryDate: '12/25',
          brand: 'Visa',
          isDefault: true
        },
        {
          id: 'pm_demo_2',
          type: 'card',
          lastFour: '0005',
          expiryDate: '08/26',
          brand: 'Mastercard',
          isDefault: false
        }
      ]);
    } catch (err) {
      setError('Erreur lors du chargement des méthodes de paiement');
      console.error('Error loading payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      // TODO: Implémenter l'ajout de méthode de paiement
      console.log('Add payment method');
    } catch (err) {
      setError('Erreur lors de l\'ajout de la méthode de paiement');
      console.error('Error adding payment method:', err);
    }
  };

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    try {
      // TODO: Implémenter la suppression de méthode de paiement
      console.log('Remove payment method:', paymentMethodId);
    } catch (err) {
      setError('Erreur lors de la suppression de la méthode de paiement');
      console.error('Error removing payment method:', err);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      // TODO: Implémenter la définition de méthode par défaut
      console.log('Set default payment method:', paymentMethodId);
    } catch (err) {
      setError('Erreur lors de la définition de la méthode par défaut');
      console.error('Error setting default payment method:', err);
    }
  };

  const getCardIcon = (brand?: string) => {
    // Retourne l'icône appropriée selon la marque de carte
    return <CreditCard className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Méthodes de paiement
            </CardTitle>
            <CardDescription>
              Gérez vos cartes de crédit et méthodes de paiement
            </CardDescription>
          </div>
          <Button onClick={handleAddPaymentMethod} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une carte
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Note d'implémentation future */}
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              La gestion complète des méthodes de paiement sera disponible dans une prochaine version. 
              Pour l'instant, vous pouvez voir les méthodes existantes.
            </AlertDescription>
          </Alert>

          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune méthode de paiement
              </h3>
              <p className="text-gray-600 mb-4">
                Ajoutez une carte de crédit pour automatiser vos paiements
              </p>
              <Button onClick={handleAddPaymentMethod}>
                Ajouter votre première carte
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div 
                  key={method.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getCardIcon(method.brand)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {method.brand} {formatCardNumber(method.lastFour || '')}
                        </span>
                        {method.isDefault && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Expire le {method.expiryDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      >
                        Définir par défaut
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations de sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sécurité des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p>
                Toutes les transactions sont sécurisées par chiffrement SSL 256-bit
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p>
                Nous utilisons Stripe pour traiter vos paiements de manière sécurisée
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p>
                Vos informations de carte ne sont jamais stockées sur nos serveurs
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <p>
                Conformité PCI DSS Level 1 pour la sécurité des données de paiement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentMethods;