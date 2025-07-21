// src/pages/Features/Features.tsx - Page dédiée aux fonctionnalités
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  CheckCircle, 
  Brain, 
  Smartphone, 
  BarChart3, 
  Shield, 
  Users, 
  Clock, 
  Globe, 
  Zap,
  QrCode,
  Star,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';
import Footer from '@/components/layout/Footer';

const Features: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("core");

  const featureCategories = {
    core: {
      title: "Core Features",
      description: "Essential tools for attendance management",
      features: [
        {
          icon: QrCode,
          title: 'QR Code Scanning',
          description: 'Generate unique QR codes for events, locations, or time periods. Users can scan codes for instant check-ins with sub-second response times.',
          features: [
            'Contactless check-ins',
            'Unique codes per event',
            'Sub-second scanning',
            'Offline capability'
          ],
          color: "bg-gray-100 text-gray-700"
        },
        {
          icon: Smartphone,
          title: 'Mobile Applications',
          description: 'Native iOS and Android apps with full offline support. Check-in anywhere, sync when connected, and access all features on mobile.',
          features: [
            'Native mobile apps',
            'Offline functionality',
            'Cross-platform sync',
            'Push notifications'
          ],
          color: "bg-purple-50 text-purple-600"
        },
        {
          icon: Users,
          title: 'User Management',
          description: 'Complete user management system with role-based permissions, bulk operations, and advanced user controls for organizations.',
          features: [
            'Role-based access',
            'Bulk operations',
            'User profiles',
            'Permission controls'
          ],
          color: "bg-slate-100 text-slate-700"
        }
      ]
    },
    analytics: {
      title: "Analytics & Reporting",
      description: "Powerful insights and reporting tools",
      features: [
        {
          icon: BarChart3,
          title: 'Real-time Analytics',
          description: 'Comprehensive analytics dashboard with live attendance data, automated reports, and customizable insights for better decision making.',
          features: [
            'Live attendance data',
            '15+ chart types',
            'Automated reports',
            'Custom dashboards'
          ],
          color: "bg-green-50 text-green-600"
        },
        {
          icon: Brain,
          title: 'Smart Insights',
          description: 'AI-powered insights and predictive analytics to identify patterns, trends, and anomalies in attendance data automatically.',
          features: [
            'Pattern recognition',
            'Predictive analytics',
            'Anomaly detection',
            'Smart recommendations'
          ],
          color: "bg-indigo-50 text-indigo-600"
        },
        {
          icon: TrendingUp,
          title: 'Advanced Reports',
          description: 'Generate detailed reports with custom filters, export options, and scheduled delivery to stakeholders.',
          features: [
            'Custom filters',
            'PDF/Excel export',
            'Scheduled reports',
            'Email delivery'
          ],
          color: "bg-teal-50 text-teal-600"
        }
      ]
    },
    management: {
      title: "Management Tools",
      description: "Tools for efficient team and time management",
      features: [
        {
          icon: Clock,
          title: 'Time Tracking',
          description: 'Precise time tracking with automatic calculations for work hours, overtime, breaks, and custom time periods with detailed reporting.',
          features: [
            'Automatic calculations',
            'Overtime tracking',
            'Break management',
            'Time reports'
          ],
          color: "bg-emerald-50 text-emerald-600"
        },
        {
          icon: Globe,
          title: 'Multi-location Support',
          description: 'Manage attendance across multiple locations, time zones, and regions with centralized control and location-specific settings.',
          features: [
            'Multiple locations',
            'Time zone support',
            'Regional settings',
            'Centralized control'
          ],
          color: "bg-teal-50 text-teal-600"
        }
      ]
    },
    security: {
      title: "Security & Compliance",
      description: "Enterprise-grade security and compliance features",
      features: [
        {
          icon: Shield,
          title: 'Security & Privacy',
          description: 'Enterprise-grade security with end-to-end encryption, audit logs, compliance features, and data protection standards.',
          features: [
            'End-to-end encryption',
            'Audit logs',
            'GDPR compliant',
            'SOC 2 certified'
          ],
          color: "bg-gray-50 text-gray-600"
        },
        {
          icon: Zap,
          title: 'API Integration',
          description: 'Powerful REST API and webhooks for seamless integration with existing systems, HR platforms, and custom applications.',
          features: [
            'REST API',
            'Webhooks',
            'HR integrations',
            'Custom connectors'
          ],
          color: "bg-yellow-50 text-yellow-600"
        }
      ]
    }
  };

  const stats = [
    { value: "99.9%", label: "Uptime", icon: TrendingUp },
    { value: "500+", label: "Organizations", icon: Users },
    { value: "50K+", label: "Daily Check-ins", icon: Clock },
    { value: "15min", label: "Setup Time", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-60"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300">
              <Star className="w-4 h-4 mr-2" />
              Platform Features
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Everything you need for
              <br />
              <span className="bg-gradient-to-r from-gray-800 to-purple-600 bg-clip-text text-transparent">
                attendance management
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              From QR code scanning to advanced analytics, AttendanceX provides comprehensive tools 
              for modern organizations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                onClick={() => navigate('/register')}
                size="lg" 
                className="bg-gradient-to-r from-gray-800 to-purple-600 text-white hover:from-gray-900 hover:to-purple-700 text-lg px-8 py-4 shadow-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/pricing')}
                size="lg"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8 py-4"
              >
                View Pricing
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <stat.icon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features by Category */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              Feature Categories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Organized by your needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore our comprehensive feature set organized by category to find exactly what you need.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-12 bg-white border border-gray-200">
              {Object.entries(featureCategories).map(([key, category]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-800 data-[state=active]:border-gray-300"
                >
                  {category.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(featureCategories).map(([key, category]) => (
              <TabsContent key={key} value={key} className="space-y-8">
                <div className="text-center mb-12">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{category.title}</h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">{category.description}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.features.map((feature, index) => (
                    <Card 
                      key={index} 
                      className="group bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                    >
                      <CardHeader>
                        <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                          <feature.icon className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-xl text-gray-900 group-hover:text-purple-600 transition-colors">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                          {feature.description}
                        </p>
                        <ul className="space-y-3">
                          {feature.features.map((item, idx) => (
                            <li key={idx} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              Integrations
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Works with your
              <span className="text-purple-600"> existing tools</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Seamlessly integrate with popular HR platforms, productivity tools, and custom applications.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Slack", description: "Real-time notifications", icon: "💬" },
              { name: "Microsoft Teams", description: "Team collaboration", icon: "👥" },
              { name: "Google Workspace", description: "Calendar integration", icon: "📅" },
              { name: "Zapier", description: "Workflow automation", icon: "⚡" },
              { name: "REST API", description: "Custom integrations", icon: "🔗" },
              { name: "Webhooks", description: "Real-time events", icon: "📡" },
              { name: "SAML SSO", description: "Single sign-on", icon: "🔐" },
              { name: "CSV Export", description: "Data portability", icon: "📊" }
            ].map((integration, index) => (
              <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 group cursor-pointer">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">
                  {integration.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {integration.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {integration.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gray-800 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <br />
            attendance management?
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
            Join hundreds of organizations already using AttendanceX to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-white text-gray-800 hover:bg-gray-100 font-medium text-lg px-8 py-4 shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:border-white font-medium text-lg px-8 py-4"
            >
              Contact Sales
            </Button>
          </div>
          <p className="text-purple-100 text-sm mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;