import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CreditCard, 
  Clock, 
  TrendingUp,
  X
} from 'lucide-react';
import { BillingAlert } from '@/types/billing.types';
import { useBilling } from '@/hooks/useBilling';
import { formatDate } from '@/utils/format';

interface BillingAlertsProps {
  alerts: BillingAlert[];
}

export function BillingAlerts({ alerts }: BillingAlertsProps) {
  const { dismissAlert } = useBilling();
  const [dismissingAlerts, setDismissingAlerts] = useState<Set<string>>(new Set());

  const handleDismissAlert = async (alertId: string) => {
    setDismissingAlerts(prev => new Set(prev).add(alertId));
    
    try {
      await dismissAlert(alertId);
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    } finally {
      setDismissingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const getAlertIcon = (type: BillingAlert['type']) => {
    switch (type) {
      case 'usage_warning':
        return <TrendingUp className="h-4 w-4" />;
      case 'payment_failed':
        return <CreditCard className="h-4 w-4" />;
      case 'subscription_expiring':
        return <Clock className="h-4 w-4" />;
      case 'overage_detected':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (severity: BillingAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: BillingAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert 
          key={alert.id} 
          variant={getAlertVariant(alert.severity)}
          className="relative"
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{alert.title}</h4>
                <Badge className={getSeverityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
              <AlertDescription className="mb-2">
                {alert.message}
              </AlertDescription>
              <p className="text-xs text-muted-foreground">
                {formatDate(alert.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismissAlert(alert.id)}
              disabled={dismissingAlerts.has(alert.id)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}