// src/pages/Landing/Landing.tsx - Version propre et corrigée
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import HeaderLanding from '@/components/landing/HeaderLanding';
import Footer from '@/components/layout/Footer';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <HeaderLanding />
      
      {/* Hero Section Ultra-Minimal */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge simple avec hover effect */}
          <Badge 
            variant="secondary" 
            className="mb-8 px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-default"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Simple attendance management
          </Badge>

          {/* Titre principal */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            Track attendance.
            <br />
            <span className="text-gray-600">Simply.</span>
          </h1>

          {/* Sous-titre */}
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Modern attendance tracking for teams. QR codes, mobile apps, and real-time analytics.
            <br />
            <span className="text-gray-500 text-lg">Setup in under 15 minutes.</span>
          </p>

          {/* CTA Principal */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-gray-900 text-white hover:bg-gray-800 text-lg px-8 py-4 shadow-sm hover:shadow-md transition-all font-medium"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/features')}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-lg px-8 py-4 transition-all font-medium"
            >
              View features
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>500+ organizations</span>
            </div>
            <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>99.9% uptime</span>
            </div>
            <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2 hover:text-gray-700 transition-colors">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No setup fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Simple tools for modern attendance management. 
              No complexity, just results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "QR Code Scanning",
                description: "Fast, contactless check-ins with unique codes",
                highlight: "Sub-second scanning"
              },
              {
                title: "Real-time Analytics",
                description: "Live attendance insights and automated reports",
                highlight: "15+ chart types"
              },
              {
                title: "Mobile Apps",
                description: "Native iOS and Android apps with offline support",
                highlight: "Works offline"
              }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-300 cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-3 hover:text-gray-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-3 hover:text-gray-700 transition-colors">
                  {feature.description}
                </p>
                <span className="text-sm text-green-600 font-medium">
                  ✓ {feature.highlight}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button 
              variant="outline"
              onClick={() => navigate('/features')}
              className="border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all font-medium"
            >
              View all features
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 lg:py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify attendance?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of teams already using AttendanceX
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-white text-gray-900 hover:bg-gray-100 font-medium"
            >
              Start free trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              size="lg"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-medium"
            >
              Contact sales
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;