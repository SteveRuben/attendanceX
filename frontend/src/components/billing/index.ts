/**
 * Index des composants de facturation
 * Exporte tous les composants liés à la facturation
 */

export { default as BillingDashboard } from './BillingDashboard';
export { default as InvoiceList } from './InvoiceList';
export { default as UsageMetrics } from './UsageMetrics';
export { default as PlanComparison } from './PlanComparison';
export { default as PaymentMethods } from './PaymentMethods';
export { default as DunningManagement } from './DunningManagement';

// Types réexportés pour faciliter l'utilisation
export type {
  BillingDashboard as BillingDashboardData,
  SubscriptionPlan,
  Subscription,
  Invoice,
  TenantUsage,
  PlanLimits,
  OveragePreview,
  PaymentMethod
} from '../../services/billingService';

export type {
  DunningProcess,
  DunningStatus,
  DunningStep,
  DunningActionType,
  DunningStepStatus,
  DunningStats
} from '../../services/dunningService';