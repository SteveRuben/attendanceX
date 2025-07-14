// src/pages/Pricing/Pricing.tsx - Page dédiée au pricing
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';

const Pricing: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 25 users",
        "QR code scanning",
        "Basic analytics",
        "Mobile app access",
        "Email support"
      ],
      buttonText: "Start free",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Professional",
      price: "$4",
      period: "/user/month",
      description: "For growing teams that need more features",
      features: [
        "Up to 100 users",
        "All tracking methods",
        "Advanced analytics",
        "Custom reports",
        "Priority support",
        "API access",
        "Integrations"
      ],
      buttonText: "Start trial",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited users",
        "All features included",
        "White-label branding",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option"
      ],
      buttonText: "Contact sales",
      buttonVariant: "outline" as const,
      popular: false
    }
  ];

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
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm bg-gray-100 text-gray-700">
            Simple Pricing
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choose the right plan
            <br />
            <span className="text-gray-600">for your team</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Start free and scale as you grow. All plans include our core features 
            with no hidden fees or setup costs.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-white border-gray-200 hover:shadow-lg transition-all duration-300 ${
                  plan.popular ? 'border-gray-900 shadow-md' : ''
                }`}
              >
                {plan.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white"
                  >
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl text-gray-900 mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-600 text-lg">{plan.period}</span>}
                  </div>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.buttonVariant}
                    className={`w-full ${
                      plan.buttonVariant === 'default' 
                        ? 'bg-gray-900 text-white hover:bg-gray-800' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (plan.name === 'Enterprise') {
                        navigate('/contact');
                      } else {
                        navigate('/register');
                      }
                    }}
                  >
                    {plan.buttonText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              All plans include
            </h2>
            <p className="text-gray-600">
              Core features available across all subscription tiers
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'QR code scanning',
              'Mobile apps (iOS & Android)',
              'Real-time attendance tracking',
              'Basic reporting',
              'Email notifications',
              'Data export (CSV/PDF)',
              'Multi-language support',
              '99.9% uptime SLA'
            ].map((feature, index) => (
              <div key={index} className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <p className="text-gray-600">
              Common questions about our pricing and plans
            </p>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start with our free plan and upgrade when you're ready
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-white"
            >
              Contact sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;