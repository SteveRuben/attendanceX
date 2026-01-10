import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Download,
  Eye,
  Gift,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function BillingPage() {
  const [currentPlan] = useState({
    name: '',
    price: 0,
    currency: 'EUR',
    period: 'month',
    status: '',
    nextBilling: ''
  });

  const [recentInvoices] = useState([]);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {status}
      </Badge>
    );
  };

  return (
    <AppShell title="Facturation">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Facturation & Abonnement
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez votre abonnement, factures et codes promo
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(currentPlan.status || 'inactive')}
                <Badge variant="outline">
                  {currentPlan.name ? `Plan ${currentPlan.name}` : 'Aucun plan'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Plan Actuel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Plan Actuel
              </CardTitle>
              <CardDescription>
                Détails de votre abonnement actuel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">{currentPlan.name || 'Aucun plan actif'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.price > 0 ? 
                      `${currentPlan.price} ${currentPlan.currency} / ${currentPlan.period}` : 
                      'Aucun abonnement actif'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Prochaine facturation</p>
                  <p className="font-medium">{currentPlan.nextBilling || 'Non définie'}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline">
                  Changer de plan
                </Button>
                <Button variant="outline">
                  Annuler l'abonnement
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions Rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6 text-center">
                <Gift className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h3 className="font-medium mb-1">Codes Promo</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Gérer les codes de réduction
                </p>
                <Link href="/app/billing/promo-codes">
                  <Button variant="outline" size="sm">
                    Gérer
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-medium mb-1">Méthodes de Paiement</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Cartes et moyens de paiement
                </p>
                <Link href="/app/billing/payment-methods">
                  <Button variant="outline" size="sm">
                    Configurer
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <h3 className="font-medium mb-1">Historique</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Toutes vos factures
                </p>
                <Link href="/app/billing/history">
                  <Button variant="outline" size="sm">
                    Voir tout
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Factures Récentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Factures Récentes
              </CardTitle>
              <CardDescription>
                Vos dernières factures et paiements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">{invoice.amount} EUR</p>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune facture</h3>
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore de factures.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}