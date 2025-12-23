import { useState, useEffect, useCallback } from 'react';
import { billingService, BillingDashboard, Plan, Subscription, Invoice, UsageStats, BillingAlert, GracePeriodStatus } from '@/services/billingService';
import { useToast } from '@/hooks/use-toast';

interface UseBillingReturn {
  // Dashboard
  dashboard: BillingDashboard | null;
  loadingDashboard: boolean;
  
  // Plans
  plans: Plan[];
  loadingPlans: boolean;
  
  // Subscription
  subscription: Subscription | null;
  loadingSubscription: boolean;
  
  // Invoices
  invoices: Invoice[];
  loadingInvoices: boolean;
  
  // Usage
  usage: UsageStats | null;
  loadingUsage: boolean;
  
  // Alerts
  alerts: BillingAlert[];
  loadingAlerts: boolean;
  
  // Grace Period
  gracePeriodStatus: GracePeriodStatus | null;
  loadingGracePeriod: boolean;
  
  // Actions
  fetchDashboard: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  fetchInvoices: (page?: number, limit?: number) => Promise<void>;
  fetchUsage: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchGracePeriodStatus: () => Promise<void>;
  
  changePlan: (planId: string, billingCycle?: 'monthly' | 'yearly', promoCode?: string) => Promise<void>;
  cancelSubscription: (reason?: string) => Promise<void>;
  applyPromoCode: (subscriptionId: string, promoCode: string) => Promise<void>;
  removePromoCode: (subscriptionId: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  payInvoice: (invoiceId: string) => Promise<void>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export const useBilling = (): UseBillingReturn => {
  // State
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [gracePeriodStatus, setGracePeriodStatus] = useState<GracePeriodStatus | null>(null);
  
  // Loading states
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingGracePeriod, setLoadingGracePeriod] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: any, context: string) => {
    const errorMessage = err?.message || `Error in ${context}`;
    setError(errorMessage);
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive'
    });
  }, [toast]);

  // Fetch functions
  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setError(null);
    
    try {
      const data = await billingService.getDashboard();
      setDashboard(data);
    } catch (err) {
      handleError(err, 'fetching billing dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, [handleError]);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    setError(null);
    
    try {
      const data = await billingService.getPlans();
      setPlans(data);
    } catch (err) {
      handleError(err, 'fetching plans');
    } finally {
      setLoadingPlans(false);
    }
  }, [handleError]);

  const fetchSubscription = useCallback(async () => {
    setLoadingSubscription(true);
    setError(null);
    
    try {
      const data = await billingService.getCurrentSubscription();
      setSubscription(data);
    } catch (err) {
      handleError(err, 'fetching subscription');
    } finally {
      setLoadingSubscription(false);
    }
  }, [handleError]);

  const fetchInvoices = useCallback(async (page: number = 1, limit: number = 10) => {
    setLoadingInvoices(true);
    setError(null);
    
    try {
      const data = await billingService.getInvoices(page, limit);
      setInvoices(data.invoices);
    } catch (err) {
      handleError(err, 'fetching invoices');
    } finally {
      setLoadingInvoices(false);
    }
  }, [handleError]);

  const fetchUsage = useCallback(async () => {
    setLoadingUsage(true);
    setError(null);
    
    try {
      const data = await billingService.getUsageStats();
      setUsage(data);
    } catch (err) {
      handleError(err, 'fetching usage stats');
    } finally {
      setLoadingUsage(false);
    }
  }, [handleError]);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setError(null);
    
    try {
      const data = await billingService.getAlerts();
      setAlerts(data);
    } catch (err) {
      handleError(err, 'fetching alerts');
    } finally {
      setLoadingAlerts(false);
    }
  }, [handleError]);

  const fetchGracePeriodStatus = useCallback(async () => {
    setLoadingGracePeriod(true);
    setError(null);
    
    try {
      const data = await billingService.getMyGracePeriodStatus();
      setGracePeriodStatus(data);
    } catch (err) {
      handleError(err, 'fetching grace period status');
    } finally {
      setLoadingGracePeriod(false);
    }
  }, [handleError]);

  // Action functions
  const changePlan = useCallback(async (planId: string, billingCycle?: 'monthly' | 'yearly', promoCode?: string) => {
    try {
      await billingService.changePlan({ planId, billingCycle, promoCode });
      toast({
        title: 'Success',
        description: 'Plan changed successfully',
        variant: 'success'
      });
      
      // Refresh data
      await Promise.all([fetchSubscription(), fetchDashboard()]);
    } catch (err) {
      handleError(err, 'changing plan');
      throw err;
    }
  }, [handleError, toast, fetchSubscription, fetchDashboard]);

  const cancelSubscription = useCallback(async (reason?: string) => {
    try {
      await billingService.cancelSubscription(reason);
      toast({
        title: 'Success',
        description: 'Subscription cancelled successfully',
        variant: 'success'
      });
      
      // Refresh data
      await Promise.all([fetchSubscription(), fetchDashboard()]);
    } catch (err) {
      handleError(err, 'cancelling subscription');
      throw err;
    }
  }, [handleError, toast, fetchSubscription, fetchDashboard]);

  const applyPromoCode = useCallback(async (subscriptionId: string, promoCode: string) => {
    try {
      const result = await billingService.applyPromoCode({ subscriptionId, promoCode });
      toast({
        title: 'Success',
        description: result.message || 'Promo code applied successfully',
        variant: 'success'
      });
      
      // Refresh data
      await Promise.all([fetchSubscription(), fetchDashboard()]);
    } catch (err) {
      handleError(err, 'applying promo code');
      throw err;
    }
  }, [handleError, toast, fetchSubscription, fetchDashboard]);

  const removePromoCode = useCallback(async (subscriptionId: string) => {
    try {
      const result = await billingService.removePromoCode(subscriptionId);
      toast({
        title: 'Success',
        description: result.message || 'Promo code removed successfully',
        variant: 'success'
      });
      
      // Refresh data
      await Promise.all([fetchSubscription(), fetchDashboard()]);
    } catch (err) {
      handleError(err, 'removing promo code');
      throw err;
    }
  }, [handleError, toast, fetchSubscription, fetchDashboard]);

  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await billingService.dismissAlert(alertId);
      
      // Remove alert from local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: 'Success',
        description: 'Alert dismissed',
        variant: 'success'
      });
    } catch (err) {
      handleError(err, 'dismissing alert');
      throw err;
    }
  }, [handleError, toast]);

  const payInvoice = useCallback(async (invoiceId: string) => {
    try {
      const result = await billingService.payInvoice(invoiceId);
      toast({
        title: 'Success',
        description: result.message || 'Invoice paid successfully',
        variant: 'success'
      });
      
      // Refresh invoices
      await fetchInvoices();
    } catch (err) {
      handleError(err, 'paying invoice');
      throw err;
    }
  }, [handleError, toast, fetchInvoices]);

  return {
    // Data
    dashboard,
    plans,
    subscription,
    invoices,
    usage,
    alerts,
    gracePeriodStatus,
    
    // Loading states
    loadingDashboard,
    loadingPlans,
    loadingSubscription,
    loadingInvoices,
    loadingUsage,
    loadingAlerts,
    loadingGracePeriod,
    
    // Fetch functions
    fetchDashboard,
    fetchPlans,
    fetchSubscription,
    fetchInvoices,
    fetchUsage,
    fetchAlerts,
    fetchGracePeriodStatus,
    
    // Actions
    changePlan,
    cancelSubscription,
    applyPromoCode,
    removePromoCode,
    dismissAlert,
    payInvoice,
    
    // Error handling
    error,
    clearError
  };
};