/**
 * Composant de comparaison et changement de plans
 * Permet de voir tous les plans disponibles et de changer de plan
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { 
  Check, 
  X, 
  Crown, 
  Zap, 
  Users, 
  Calendar, 
  HardDrive,
  ArrowRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  billingService, 
  SubscriptionPlan, 
  PlanComparison as PlanComparisonData,
  ChangePlanRequest 
} from '../../services/billingService';
import { formatCurrency, formatNumber, formatBytes } from '../../utils/formatters';

interface PlanComparisonProps {
  currentPlanId: string;
  onPlanChanged?: () => void;
}

export const PlanComparison: React.FC<PlanComparisonProps> = ({ 
  currentPlanId, 
  onPlanChanged 
}) => {
  const [planData, setPlanData] = useState<PlanComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingService.getAvailablePlans();
      setPlanData(data);
    } catch (err) {
      setError('Erreur lors du chargement des plans');
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    if (plan.id === currentPlanId) return;
    setSelectedPlan(plan);
    setShowChangeDialog(true);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    try {
      setChangingPlan(true);
      const request: ChangePlanRequest = {
        newPlanId: selectedPlan.id,
        billingCycle
      };

      await billingService.changePlan(request);
      setShowChangeDialog(false);
      setSelectedPlan(null);
      
      if (onPlanChanged) {
        onPlanChanged();
      }
    } catch (err) {
      setError('Erreur lors du changement de plan');
      console.error('Error changing plan:', err);
    } finally {
      setChangingPlan(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('enterprise') || name.includes('premium')) {
      return <Crown className="h-5 w-5 text-yellow-500" />;
    } else if (name.includes('pro') || name.includes('professional')) {
      return <Zap className="h-5 w-5 text-blue-500" />;
    }
    return <Users className="h-5 w-5 text-gray-500" />;
  };

  const getYearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyMonthly = yearlyPrice / 12;
    const discount = ((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100;
    return Math.round(discount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !planData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Impossible de charger les plans disponibles'}
        </AlertDescription>
      </Alert>
    );
  }

  const { plans } = planData;

  return (
    <div className="space-y-6">
      {/* Sélecteur de cycle de facturation */}
      <Card>
        <CardHeader>
          <CardTitle>Choisir votre plan</CardTitle>
          <CardDescription>
            Sélectionnez le plan qui correspond le mieux à vos besoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annuel
                <Badge variant="secondary" className="ml-2">
                  -20%
                </Badge>
              </button>
            </div>
          </div>

          {/* Grille des plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans
              .filter(plan => plan.billingCycle === billingCycle)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((plan) => {
                const isCurrentPlan = plan.id === currentPlanId;
                const yearlyPlan = plans.find(p => 
                  p.id === plan.id.replace('monthly', 'yearly') || 
                  p.id === plan.id.replace('yearly', 'monthly')
                );
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative ${
                      isCurrentPlan 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300 cursor-pointer'
                    }`}
                    onClick={() => !isCurrentPlan && handlePlanSelection(plan)}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-500">Plan actuel</Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">
                        {getPlanIcon(plan.name)}
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[2rem]">
                        {plan.description}
                      </CardDescription>
                      
                      <div className="mt-4">
                        <div className="text-3xl font-bold">
                          {formatCurrency(plan.price, plan.currency)}
                        </div>
                        <div className="text-sm text-gray-600">
                          par {billingCycle === 'yearly' ? 'an' : 'mois'}
                        </div>
                        {billingCycle === 'yearly' && yearlyPlan && (
                          <div className="text-xs text-green-600 mt-1">
                            Économisez {getYearlyDiscount(yearlyPlan.price * 12, plan.price)}%
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Limites */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Utilisateurs
                          </span>
                          <span className="font-medium">
                            {plan.limits.maxUsers === -1 ? 'Illimité' : formatNumber(plan.limits.maxUsers)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Événements
                          </span>
                          <span className="font-medium">
                            {plan.limits.maxEvents === -1 ? 'Illimité' : formatNumber(plan.limits.maxEvents)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Stockage
                          </span>
                          <span className="font-medium">
                            {plan.limits.maxStorage === -1 
                              ? 'Illimité' 
                              : formatBytes(plan.limits.maxStorage * 1024 * 1024)
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            API
                          </span>
                          <span className="font-medium">
                            {plan.limits.apiCallsPerMonth === -1 
                              ? 'Illimité' 
                              : `${formatNumber(plan.limits.apiCallsPerMonth)}/mois`
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Fonctionnalités */}
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Fonctionnalités incluses</h4>
                        <div className="space-y-2">
                          {Object.entries(plan.features).map(([feature, included]) => (
                            <div key={feature} className="flex items-center gap-2 text-sm">
                              {included ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-gray-300" />
                              )}
                              <span className={included ? '' : 'text-gray-400'}>
                                {getFeatureLabel(feature)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Bouton d'action */}
                      <div className="pt-4">
                        {isCurrentPlan ? (
                          <Button disabled className="w-full">
                            Plan actuel
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant={plan.price > 0 ? 'default' : 'outline'}
                          >
                            {plan.price === 0 ? 'Passer au gratuit' : 'Choisir ce plan'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de changement de plan */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le changement de plan</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de changer votre plan d'abonnement.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Nouveau plan: {selectedPlan.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(selectedPlan.price, selectedPlan.currency)} par {
                    billingCycle === 'yearly' ? 'an' : 'mois'
                  }
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Le changement prendra effet immédiatement. Votre prochaine facture sera 
                  ajustée au prorata du temps restant sur votre période de facturation actuelle.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowChangeDialog(false)}
              disabled={changingPlan}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleChangePlan}
              disabled={changingPlan}
            >
              {changingPlan ? 'Changement en cours...' : 'Confirmer le changement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getFeatureLabel = (feature: string): string => {
  const labels: Record<string, string> = {
    advancedReporting: 'Rapports avancés',
    apiAccess: 'Accès API',
    customBranding: 'Personnalisation',
    webhooks: 'Webhooks',
    ssoIntegration: 'Connexion SSO',
    prioritySupport: 'Support prioritaire'
  };
  
  return labels[feature] || feature;
};

export default PlanComparison;