import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBilling } from '@/hooks/useBilling';
import { formatCurrency, formatDate } from '@/utils/format';
import { 
  CreditCard, 
  Calendar, 
  Users, 
  Activity, 
  HardDrive, 
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BillingAlerts } from '@/components/billing/BillingAlerts';
import { UsageOverview } from '@/components/billing/UsageOverview';
import { InvoiceHistory } from '@/components/billing/InvoiceHistory';
import { PlanSelector } from '@/components/billing/PlanSelector';

export default function BillingPage() {
  const router = useRouter();
  const {
    dashboard,
    subscription,
    usage,
    alerts,
    gracePeriodStatus,
    loadingDashboard,
    loadingSubscription,
    loadingUsage,
    loadingAlerts,
    loadingGracePeriod,
    fetchDashboard,
    fetchSubscription,
    fetchUsage,
    fetchAlerts,
    fetchGracePeriodStatus,
    error
  } = useBilling();

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Load initial data
    Promise.all([
      fetchDashboard(),
      fetchSubscription(),
      fetchUsage(),
      fetchAlerts(),
      fetchGracePeriodStatus()
    ]);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'past_due':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loadingDashboard || loadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, view usage, and billing history
        </p>
      </div>

      {/* Grace Period Alert */}
      {gracePeriodStatus?.hasActiveGracePeriod && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Grace Period Active</strong>
                <p className="text-sm mt-1">
                  {gracePeriodStatus.daysRemaining} days remaining until your account is suspended.
                  {gracePeriodStatus.isExpiringSoon && ' Please upgrade your plan soon.'}
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => setActiveTab('plans')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Upgrade Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Billing Alerts */}
      {alerts && alerts.length > 0 && (
        <BillingAlerts alerts={alerts} />
      )}

      {/* Current Plan Overview */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </div>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusIcon(subscription.status)}
                <span className="ml-1 capitalize">{subscription.status}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-lg">
                  {subscription.plan?.name || 'Current Plan'}
                </h3>
                <p className="text-2xl font-bold">
                  {formatCurrency(subscription.amount, subscription.currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{subscription.billingCycle}
                  </span>
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Next billing date</p>
                <p className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.nextPaymentDate)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('plans')}
                >
                  Change Plan
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('invoices')}
                >
                  View Invoices
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Usage Overview */}
          {usage && (
            <UsageOverview usage={usage} />
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest billing and subscription events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.recentInvoices?.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100' : 
                        invoice.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        <CreditCard className={`h-4 w-4 ${
                          invoice.status === 'paid' ? 'text-green-600' : 
                          invoice.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">Invoice #{invoice.id.slice(-8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {(!dashboard?.recentInvoices || dashboard.recentInvoices.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No recent invoices
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage">
          {usage ? (
            <UsageOverview usage={usage} detailed />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plans">
          <PlanSelector 
            currentPlanId={subscription?.planId}
            onPlanSelected={() => {
              // Refresh subscription data after plan change
              fetchSubscription();
              fetchDashboard();
            }}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}