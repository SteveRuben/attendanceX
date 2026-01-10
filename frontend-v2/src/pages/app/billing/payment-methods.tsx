import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  status: 'active' | 'expired' | 'failed';
}

export default function PaymentMethodsPage() {
  const [paymentMethods] = useState<PaymentMethod[]>([]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      failed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {status === 'active' ? 'Active' : status === 'expired' ? 'Expirée' : 'Échec'}
      </Badge>
    );
  };

  const getCardIcon = (brand: string) => {
    return <CreditCard className="h-6 w-6" />;
  };

  return (
    <AppShell title="Méthodes de Paiement">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Link href="/app/billing">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                  </Link>
                </div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Méthodes de Paiement
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez vos cartes et moyens de paiement
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une méthode
              </Button>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Vos informations de paiement sont sécurisées et chiffrées. Nous ne stockons jamais vos données de carte complètes.
            </AlertDescription>
          </Alert>

          {/* Payment Methods List */}
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card key={method.id} className={method.isDefault ? 'ring-2 ring-blue-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        {getCardIcon(method.brand || '')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {method.brand} •••• {method.last4}
                          </h3>
                          {method.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Par défaut
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Expire le {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(method.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!method.isDefault && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {method.status === 'expired' && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Cette carte a expiré. Veuillez mettre à jour vos informations de paiement.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {paymentMethods.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune méthode de paiement</h3>
                <p className="text-muted-foreground mb-4">
                  Ajoutez une carte ou un autre moyen de paiement pour commencer.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre première méthode
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Security Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Toutes les transactions sont sécurisées par chiffrement SSL</p>
                <p>• Nous utilisons Stripe pour traiter vos paiements en toute sécurité</p>
                <p>• Vos données de carte ne sont jamais stockées sur nos serveurs</p>
                <p>• Vous pouvez supprimer vos méthodes de paiement à tout moment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}