// src/pages/Pricing/Pricing.tsx - Page dédiée au pricing
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { 
  CheckCircle, 
  ArrowRight, 
  Star, 
  Users, 
  Zap, 
  Shield,
  Gift,
  Clock,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '../../components/landing/HeaderLanding';
import Footer from '../../components/layout/Footer';
import { promoCodeService } from '../../services/promoCodeService';
import { billingService } from '../../services/billingService';
import { PromoCodeValidationResponse, GracePeriodStatus } from '../../shared/types/billing.types';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidationResponse | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [gracePeriodStatus, setGracePeriodStatus] = useState<GracePeriodStatus | null>(null);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 29,
      annualPrice: 24,
      period: "/month",
      description: "Perfect for small teams getting started",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      features: [
        "Up to 25 users",
        "QR code scanning",
        "Basic analytics",
        "Mobile app access",
        "Email support",
        "Data export (CSV)",
        "14-day grace period"
      ],
      buttonText: "Start 14-Day Grace Period",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      id: "professional",
      name: "Professional",
      price: 79,
      annualPrice: 65,
      period: "/month",
      description: "For growing teams that need more features",
      icon: Zap,
      color: "bg-purple-50 text-purple-600",
      features: [
        "Up to 500 users",
        "All tracking methods",
        "Advanced analytics",
        "Custom reports",
        "Priority support",
        "API access",
        "Integrations",
        "Multi-location support",
        "14-day grace period"
      ],
      buttonText: "Start 14-Day Grace Period",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: null,
      annualPrice: null,
      description: "For large organizations with custom needs",
      icon: Shield,
      color: "bg-green-50 text-green-600",
      features: [
        "Unlimited users",
        "All features included",
        "White-label branding",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option",
        "Custom training",
        "Flexible grace period"
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
      popular: false
    }
  ];

  // Charger le statut de la période de grâce si l'utilisateur est connecté
  useEffect(() => {
    const loadGracePeriodStatus = async () => {
      try {
        const status = await billingService.getMyGracePeriodStatus();
        setGracePeriodStatus(status);
      } catch (error) {
        // Utilisateur non connecté ou pas de période de grâce
        console.log('No grace period status available');
      }
    };

    loadGracePeriodStatus();
  }, []);

  // Validation du code promo en temps réel
  useEffect(() => {
    const validatePromoCode = async () => {
      if (!promoCode.trim()) {
        setPromoValidation(null);
        return;
      }

      setIsValidatingPromo(true);
      try {
        const validation = await promoCodeService.validatePromoCode({
          code: promoCode.trim()
        });
        setPromoValidation(validation);
      } catch (error) {
        setPromoValidation({
          isValid: false,
          errorMessage: 'Erreur lors de la validation du code'
        });
      } finally {
        setIsValidatingPromo(false);
      }
    };

    const debounceTimer = setTimeout(validatePromoCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [promoCode]);

  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (plan.price === null) {
      return "Custom";
    }
    
    const basePrice = isAnnual ? plan.annualPrice! : plan.price;
    
    // Appliquer la réduction du code promo si valide
    if (promoValidation?.isValid && promoValidation.promoCode) {
      const discount = promoCodeService.calculateDiscount(promoValidation.promoCode, basePrice);
      const finalPrice = basePrice - discount;
      return `$${finalPrice}`;
    }
    
    return `$${basePrice}`;
  };

  const getOriginalPrice = (plan: typeof plans[0]) => {
    if (plan.price === null) return null;
    return isAnnual ? plan.annualPrice! : plan.price;
  };

  const getPlanDiscount = (plan: typeof plans[0]) => {
    if (!promoValidation?.isValid || !promoValidation.promoCode || plan.price === null) {
      return null;
    }
    
    const basePrice = isAnnual ? plan.annualPrice! : plan.price;
    return promoCodeService.calculateDiscount(promoValidation.promoCode, basePrice);
  };

  const faqs = [
    {
      question: "Can I change plans anytime?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "You can export all your data before cancellation. We keep your data for 30 days after cancellation."
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes, save 20% when you pay annually. The discount is applied automatically at checkout."
    },
    {
      question: "Is there a setup fee?",
      answer: "No setup fees. You only pay for your subscription and can start using AttendanceX immediately."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Grace Period Banner */}
      {gracePeriodStatus?.hasActiveGracePeriod && (
        <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-3" />
              <span className="font-medium">
                Période de grâce active - {gracePeriodStatus.daysRemaining} jours restants
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => navigate('/billing')}
            >
              Choisir un plan
            </Button>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-60"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300">
              <Star className="w-4 h-4 mr-2" />
              Simple & Transparent Pricing
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Choose the right plan
              <br />
              <span className="bg-gradient-to-r from-gray-800 to-purple-600 bg-clip-text text-transparent">
                for your team
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Start with a 14-day grace period and scale as you grow. All plans include our core features 
              with no hidden fees or setup costs.
            </p>

            {/* Annual/Monthly Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className={`text-lg font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
                className="data-[state=checked]:bg-purple-600"
              />
              <span className={`text-lg font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
                Annual
              </span>
              {isAnnual && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-200">
                  Save 20%
                </Badge>
              )}
            </div>

            {/* Promo Code Input */}
            <div className="max-w-md mx-auto mb-12">
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Code promo (optionnel)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="pl-10 pr-4 py-3 text-center text-lg border-2 border-gray-200 focus:border-purple-500 rounded-lg"
                />
                {isValidatingPromo && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  </div>
                )}
              </div>
              
              {promoValidation && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  promoValidation.isValid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {promoValidation.isValid ? (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span>
                        Code valide ! {promoValidation.promoCode && 
                          promoCodeService.formatPromoCodeForDisplay(promoValidation.promoCode)
                        }
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span>{promoValidation.errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-white hover:shadow-xl transition-all duration-300 group ${
                  plan.popular 
                    ? 'border-2 border-purple-500 shadow-lg scale-105' 
                    : 'border border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-gray-800 to-purple-600 text-white px-4 py-1"
                  >
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8 pt-8">
                  <div className={`w-16 h-16 rounded-full ${plan.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <plan.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl text-gray-900 mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-5xl font-bold text-gray-900">
                        {getDisplayPrice(plan)}
                      </span>
                      {getPlanDiscount(plan) && (
                        <div className="text-left">
                          <div className="text-lg text-gray-400 line-through">
                            ${getOriginalPrice(plan)}
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            -${getPlanDiscount(plan)}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {plan.period && (
                      <span className="text-gray-600 text-lg">
                        {plan.period}
                        {isAnnual && plan.price !== null && (
                          <span className="block text-sm text-green-600 mt-1">
                            Save ${((plan.price - plan.annualPrice!) * 12).toFixed(0)}/year
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-6 pb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.buttonVariant}
                    size="lg"
                    className={`w-full font-medium ${
                      plan.buttonVariant === 'default' 
                        ? 'bg-gradient-to-r from-gray-800 to-purple-600 text-white hover:from-gray-900 hover:to-purple-700 shadow-lg' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                    onClick={() => {
                      if (plan.name === 'Enterprise') {
                        navigate('/contact');
                      } else {
                        // Passer le plan et le code promo à la page d'inscription
                        const params = new URLSearchParams({
                          plan: plan.id,
                          billing: isAnnual ? 'yearly' : 'monthly'
                        });
                        if (promoCode && promoValidation?.isValid) {
                          params.set('promo', promoCode);
                        }
                        navigate(`/register?${params.toString()}`);
                      }
                    }}
                  >
                    {plan.buttonText}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              What's Included
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              All plans include
              <span className="text-purple-600"> essential features</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Core features available across all subscription tiers to get you started
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { feature: 'QR code scanning', icon: '📱' },
              { feature: 'Mobile apps (iOS & Android)', icon: '📲' },
              { feature: 'Real-time attendance tracking', icon: '⏱️' },
              { feature: 'Basic reporting', icon: '📊' },
              { feature: 'Email notifications', icon: '📧' },
              { feature: 'Data export (CSV/PDF)', icon: '📄' },
              { feature: 'Multi-language support', icon: '🌍' },
              { feature: '99.9% uptime SLA', icon: '⚡' },
              { feature: 'SSL encryption', icon: '🔒' }
            ].map((item, index) => (
              <div key={index} className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300">
                <div className="text-2xl mr-4">{item.icon}</div>
                <div>
                  <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
                  <span className="text-gray-700 font-medium">{item.feature}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              FAQ
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently asked
              <span className="text-purple-600"> questions</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Common questions about our pricing and plans
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">{faq.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-amber-300 py-20 bg-gradient-to-r from-gray-800 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
            Start with a 14-day grace period to explore all features. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => {
                const params = new URLSearchParams({
                  plan: 'professional',
                  billing: 'monthly'
                });
                if (promoCode && promoValidation?.isValid) {
                  params.set('promo', promoCode);
                }
                navigate(`/register?${params.toString()}`);
              }}
              size="lg" 
              className="bg-white text-gray-800 hover:bg-gray-100 font-medium text-lg px-8 py-4 shadow-lg"
            >
              Start Grace Period
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              size="lg"
              className="border-white/30 text-black hover:bg-white/10 hover:border-white font-medium text-lg px-8 py-4"
            >
              Contact Sales
            </Button>
          </div>
          <p className="text-purple-100 text-sm mt-6">
            No credit card required • 14-day grace period • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;