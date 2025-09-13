/**
 * Dashboard principal de facturation
 * Affiche un aperçu complet de l'abonnement, usage, et factures
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CreditCard, 
  TrendingUp, 
  Users, 
  Calendar, 
  HardDrive, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Settings
} from 'lucide-react';
import { billingService, BillingDashboard as BillingDashboardData, SubscriptionStatus } from '../../services/billingService';
import { formatCurrency, formatDate, formatBytes } from '../../utils/formatters';
import { InvoiceList } from './InvoiceList';
import { PlanComparison } from './PlanComparison';
import { UsageMetrics } from './UsageMetrics';
import { PaymentMethods } from './PaymentMethods';
import { DunningManagement } from './DunningManagement';

export const BillingDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<BillingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingService.getBillingDashboard();
      setDashboardData(data);
    } catch (err) {
      setError('Erreur lors du chargement des données de facturation');
      console.error('Error loading billing dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const statusConfig = {
      [SubscriptionStatus.ACTIVE]: { label: 'Actif', variant: 'default' as const, color: 'bg-green-500' },
      [SubscriptionStatus.TRIALING]: { label: 'Essai', variant: 'secondary' as const, color: 'bg-blue-500' },
      [SubscriptionStatus.PAST_DUE]: { label: 'En retard', variant: 'destructive' as const, color: 'bg-orange-500' },
      [SubscriptionStatus.CANCELLED]: { label: 'Annulé', variant: 'outline' as const, color: 'bg-gray-500' },
      [SubscriptionStatus.UNPAID]: { label: 'Impayé', variant: 'destructive' as const, color: 'bg-red-500' },
      [SubscriptionStatus.INCOMPLETE]: { label: 'Incomplet', variant: 'secondary' as const, color: 'bg-yellow-500' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Impossible de charger les données de facturation'}
        </AlertDescription>
      </Alert>
    );
  }

  const { currentPlan, subscription, usage, limits, overagePreview, recentInvoices, billingInfo } = dashboardData;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Facturation</h1>
          <p className="text-gray-600 mt-1">
            Gérez votre abonnement et vos factures
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Paramètres de facturation
        </Button>
      </div>

      {/* Alertes */}
      {subscription.status === SubscriptionStatus.PAST_DUE && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Votre paiement est en retard. Veuillez mettre à jour votre méthode de paiement pour éviter l'interruption du service.
          </AlertDescription>
        </Alert>
      )}

      {overagePreview.hasOverages && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            Vous avez des dépassements ce mois-ci pour un montant de {formatCurrency(overagePreview.totalOverageCost, overagePreview.currency)}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="usage">Utilisation</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="dunning">Relances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cartes de statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plan actuel */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan actuel</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentPlan.name}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(currentPlan.price, currentPlan.currency)}/{currentPlan.billingCycle === 'yearly' ? 'an' : 'mois'}
                </p>
                <div className="mt-2">
                  {getStatusBadge(subscription.status)}
                </div>
              </CardContent>
            </Card>

            {/* Prochaine facturation */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prochaine facturation</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDate(billingInfo.nextBillingDate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cycle {billingInfo.billingCycle === 'yearly' ? 'annuel' : 'mensuel'}
                </p>
              </CardContent>
            </Card>

            {/* Utilisateurs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usage.users}</div>
                <p className="text-xs text-muted-foreground">
                  sur {limits.maxUsers} autorisés
                </p>
                <Progress 
                  value={getUsagePercentage(usage.users, limits.maxUsers)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            {/* Stockage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stockage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(usage.storage * 1024 * 1024)}</div>
                <p className="text-xs text-muted-foreground">
                  sur {formatBytes(limits.maxStorage * 1024 * 1024)}
                </p>
                <Progress 
                  value={getUsagePercentage(usage.storage, limits.maxStorage)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Aperçu des overages */}
          {overagePreview.hasOverages && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dépassements ce mois-ci
                </CardTitle>
                <CardDescription>
                  Coûts supplémentaires pour l'utilisation au-delà de votre plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {overagePreview.overages.map((overage, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium">{overage.metric}</p>
                        <p className="text-sm text-gray-600">
                          {overage.actualUsage} utilisés (limite: {overage.baseLimit})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatCurrency(overage.totalCost, overagePreview.currency)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {overage.overageAmount} × {formatCurrency(overage.unitPrice, overagePreview.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total des dépassements</span>
                      <span className="text-orange-600">
                        {formatCurrency(overagePreview.totalOverageCost, overagePreview.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Factures récentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Factures récentes</CardTitle>
                <CardDescription>Vos 5 dernières factures</CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('invoices')}
              >
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-500' : 
                        invoice.status === 'open' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(invoice.issueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status === 'paid' ? 'Payée' : 
                         invoice.status === 'open' ? 'En attente' : 'Brouillon'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          <UsageMetrics usage={usage} limits={limits} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceList />
        </TabsContent>

        <TabsContent value="plans">
          <PlanComparison currentPlanId={currentPlan.id} onPlanChanged={loadDashboardData} />
        </TabsContent>

        <TabsContent value="dunning">
          <DunningManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingDashboard;