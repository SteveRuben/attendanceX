import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Check, 
  Star, 
  Users, 
  Calendar, 
  HardDrive, 
  Zap,
  Crown,
  Building
} from 'lucide-react';
import { useBilling } from '@/hooks/useBilling';
import { Plan } from '@/types/billing.types';
import { formatCurrency } from '@/utils/format';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PlanSelectorProps {
  currentPlanId?: string;
  onPlanSelected?: () => void;
}

export function PlanSelector({ currentPlanId, onPlanSelected }: PlanSelectorProps) {
  const { 
    plans, 
    loadingPlans, 
    fetchPlans, 
    changePlan,
    error 
  } = useBilling();
  
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handlePlanSelect = (plan: Plan) => {
    if (plan.id === currentPlanId) return;
    
    setSelectedPlan(plan);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlan) return;
    
    setIsChangingPlan(true);
    
    try {
      await changePlan(
        selectedPlan.id,
        isYearly ? 'yearly' : 'monthly',
        promoCode || undefined
      );
      
      setShowConfirmDialog(false);
      setSelectedPlan(null);
      setPromoCode('');
      onPlanSelected?.();
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setIsChangingPlan(false);
    }
  };

  const getPlanPrice = (plan: Plan) => {
    return isYearly ? plan.price.yearly : plan.price.monthly;
  };

  const getYearlySavings = (plan: Plan) => {
    const monthlyTotal = plan.price.monthly * 12;
    const yearlySavings = monthlyTotal - plan.price.yearly;
    const savingsPercentage = (yearlySavings / monthlyTotal) * 100;
    return { amount: yearlySavings, percentage: savingsPercentage };
  };

  const getLimitIcon = (type: string) => {
    switch (type) {
      case 'users':
        return <Users className="h-4 w-4" />;
      case 'events':
        return <Calendar className="h-4 w-4" />;
      case 'storage':
        return <HardDrive className="h-4 w-4" />;
      case 'apiCalls':
        return <Zap className="h-4 w-4" />;
      default:
        return <Check className="h-4 w-4" />;
    }
  };

  if (loadingPlans) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Failed to load plans: {error}</p>
          <Button onClick={fetchPlans} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <CardDescription>
            Select the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Label htmlFor="billing-toggle" className={!isYearly ? 'font-semibold' : ''}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label htmlFor="billing-toggle" className={isYearly ? 'font-semibold' : ''}>
              Yearly
            </Label>
            {isYearly && (
              <Badge variant="secondary" className="ml-2">
                Save up to 20%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = getPlanPrice(plan);
          const savings = isYearly ? getYearlySavings(plan) : null;
          const isCurrentPlan = plan.id === currentPlanId;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.isPopular ? 'border-blue-500 shadow-lg' : ''
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {plan.isEnterprise && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary">
                    <Crown className="h-3 w-3 mr-1" />
                    Enterprise
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {plan.isEnterprise ? (
                    <Building className="h-8 w-8 text-purple-600" />
                  ) : (
                    <div className={`p-2 rounded-full ${
                      plan.isPopular ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Users className={`h-6 w-6 ${
                        plan.isPopular ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                  )}
                </div>
                
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {formatCurrency(price, plan.currency)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{isYearly ? 'year' : 'month'}
                    </span>
                  </div>
                  
                  {isYearly && savings && savings.amount > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      Save {formatCurrency(savings.amount, plan.currency)} 
                      ({savings.percentage.toFixed(0)}% off)
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Plan Limits */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getLimitIcon('users')}
                    <span className="text-sm">
                      {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users} users
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getLimitIcon('events')}
                    <span className="text-sm">
                      {plan.limits.events === -1 ? 'Unlimited' : plan.limits.events} events/month
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getLimitIcon('storage')}
                    <span className="text-sm">
                      {plan.limits.storage === -1 ? 'Unlimited' : `${plan.limits.storage}GB`} storage
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getLimitIcon('apiCalls')}
                    <span className="text-sm">
                      {plan.limits.apiCalls === -1 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()} API calls/month
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  
                  {plan.features.length > 4 && (
                    <p className="text-xs text-muted-foreground">
                      +{plan.features.length - 4} more features
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'secondary' : (plan.isPopular ? 'default' : 'outline')}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
            <DialogDescription>
              You are about to change to the {selectedPlan?.name} plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedPlan && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold">{selectedPlan.name}</h4>
                <p className="text-2xl font-bold">
                  {formatCurrency(getPlanPrice(selectedPlan), selectedPlan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{isYearly ? 'year' : 'month'}
                  </span>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="promo-code">Promo Code (Optional)</Label>
              <Input
                id="promo-code"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isChangingPlan}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPlanChange}
              disabled={isChangingPlan}
            >
              {isChangingPlan ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Changing Plan...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}