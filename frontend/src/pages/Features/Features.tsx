// src/pages/Features/Features.tsx - Page dédiée aux fonctionnalités
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Brain, Smartphone, BarChart3, Shield, Users, Clock, Globe, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';

const Features: React.FC = () => {
  const navigate = useNavigate();

  const mainFeatures = [
    {
      icon: Brain,
      title: 'Smart Analytics',
      description: 'Advanced algorithms analyze attendance patterns and detect anomalies in real-time.',
      features: [
        'Predictive attendance forecasting',
        'Anomaly detection and alerts', 
        'Automated insight generation',
        'Custom reporting dashboards'
      ]
    },
    {
      icon: Smartphone,
      title: 'Multi-Modal Tracking',
      description: 'Support for QR codes, geolocation, biometrics, and manual check-ins across all devices.',
      features: [
        'QR code scanning',
        'GPS geofencing',
        'Biometric verification',
        'Manual check-ins'
      ]
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Comprehensive reporting with live dashboards and automated insights.',
      features: [
        'Live attendance monitoring',
        'PDF/Excel export',
        'Scheduled reports',
        '15+ chart types'
      ]
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and compliance with industry standards.',
      features: [
        'AES-256 encryption',
        'SOC 2 Type II compliance',
        'GDPR compliant',
        'Audit trails'
      ]
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Role-based access control and team organization tools.',
      features: [
        'Role-based permissions',
        'Team organization',
        'Bulk user management',
        'Custom workflows'
      ]
    },
    {
      icon: Clock,
      title: 'Time Tracking',
      description: 'Precise time tracking with automated calculations and overtime detection.',
      features: [
        'Automated time calculations',
        'Overtime detection',
        'Break management',
        'Flexible scheduling'
      ]
    }
  ];

  const additionalFeatures = [
    { icon: Globe, title: 'Multi-language Support', description: 'Available in 15+ languages' },
    { icon: Smartphone, title: 'Mobile Apps', description: 'Native iOS and Android apps' },
    { icon: Zap, title: 'API Integration', description: 'REST API and webhooks' },
    { icon: Shield, title: 'Data Backup', description: 'Automated daily backups' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1 text-sm bg-gray-100 text-gray-700">
            Platform Features
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything you need for
            <br />
            <span className="text-gray-600">modern attendance management</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From QR code scanning to advanced analytics, AttendanceX provides all the tools 
            your organization needs to track attendance efficiently.
          </p>
          
          <Button 
            onClick={() => navigate('/register')}
            size="lg" 
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            Start free trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className="bg-white border-gray-200 hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Plus much more
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Additional features to make your attendance management even more powerful
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-5 h-5 text-gray-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
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
            Join 500+ organizations using AttendanceX for their attendance management
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
              onClick={() => navigate('/pricing')}
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-white"
            >
              View pricing
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;