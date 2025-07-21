// src/pages/Landing/Landing.tsx - Version moderne et cohérente
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, 
  CheckCircle, 
  QrCode, 
  BarChart3, 
  Smartphone, 
  Users, 
  Clock, 
  Shield,
  Zap,
  TrendingUp,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';
import Footer from '@/components/layout/Footer';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: QrCode,
      title: "QR Code Scanning",
      description: "Scan QR codes for instant check-ins. Generate unique codes for events, locations, or time periods.",
      highlight: "Sub-second scanning",
      color: "bg-gray-100 text-gray-700"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Live attendance insights with automated reports. Track trends, patterns, and generate custom analytics.",
      highlight: "15+ chart types",
      color: "bg-green-50 text-green-600"
    },
    {
      icon: Smartphone,
      title: "Mobile Apps",
      description: "Native iOS and Android apps with offline support. Check-in anywhere, sync when connected.",
      highlight: "Works offline",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: Users,
      title: "User Management",
      description: "Complete user management system with roles, permissions, and bulk operations.",
      highlight: "Role-based access",
      color: "bg-slate-100 text-slate-700"
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Precise time tracking with automatic calculations for work hours, overtime, and breaks.",
      highlight: "Automatic calculations",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      description: "Enterprise-grade security with data encryption, audit logs, and compliance features.",
      highlight: "SOC 2 compliant",
      color: "bg-gray-50 text-gray-600"
    }
  ];

  const stats = [
    { value: "500+", label: "Organizations", icon: Users },
    { value: "99.9%", label: "Uptime", icon: TrendingUp },
    { value: "50K+", label: "Daily Check-ins", icon: Clock },
    { value: "15min", label: "Setup Time", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 opacity-60"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            {/* Badge */}
            <Badge 
              variant="secondary" 
              className="mb-8 px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-default border border-gray-300"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Trusted by 500+ organizations worldwide
            </Badge>

            {/* Titre principal */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Modern Attendance
              <br />
              <span className="bg-gradient-to-r from-gray-800 to-purple-600 bg-clip-text text-transparent">
                Management
              </span>
              <br />
              <span className="text-gray-600 text-4xl md:text-5xl lg:text-6xl">
                Made Simple
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Streamline your attendance tracking with QR codes, mobile apps, and real-time analytics. 
              <br className="hidden md:block" />
              <span className="text-gray-500">Setup in under 15 minutes. No complex configurations.</span>
            </p>

            {/* CTA Principal */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                onClick={() => navigate('/register')}
                size="lg" 
                className="bg-gradient-to-r from-gray-800 to-purple-600 text-white hover:from-gray-900 hover:to-purple-700 text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/features')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-lg px-8 py-4 transition-all font-medium"
              >
                View Features
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

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need for
              <br />
              <span className="text-purple-600">attendance management</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive tools designed for modern teams. From QR code scanning to advanced analytics, 
              we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <CardContent className="p-8">
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-sm font-medium text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {feature.highlight}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              variant="outline"
              onClick={() => navigate('/features')}
              className="border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all font-medium"
            >
              View All Features
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-sm border-gray-300 text-gray-600">
              How it works
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Get started in
              <span className="text-purple-600"> 3 simple steps</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From setup to your first attendance tracking in under 15 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Account",
                description: "Sign up for free and set up your organization profile. Invite team members and configure basic settings.",
                icon: Users
              },
              {
                step: "02", 
                title: "Generate QR Codes",
                description: "Create unique QR codes for events, locations, or time periods. Customize settings and access controls.",
                icon: QrCode
              },
              {
                step: "03",
                title: "Start Tracking",
                description: "Users scan codes to check in/out. View real-time data, generate reports, and analyze attendance patterns.",
                icon: BarChart3
              }
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-gray-200 transition-colors">
                    <step.icon className="w-8 h-8 text-gray-700" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
            Trusted by organizations worldwide
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {[
              { metric: "500+", label: "Organizations" },
              { metric: "50K+", label: "Daily Check-ins" },
              { metric: "99.9%", label: "Uptime" },
              { metric: "4.9/5", label: "User Rating" }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">
                  {item.metric}
                </div>
                <div className="text-gray-600">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
            {[
              "Enterprise Security",
              "GDPR Compliant", 
              "24/7 Support",
              "99.9% SLA",
              "Free Migration"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 hover:text-gray-700 transition-colors">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-gray-800 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your
            <br />
            attendance management?
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto">
            Join hundreds of organizations already using AttendanceX to streamline their operations
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

export default Landing;