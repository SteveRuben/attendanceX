import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Brain, 
  Smartphone, 
  BarChart3, 
  Zap,
  Shield,
  Users,
  CheckCircle,
  Star,
  Play,
  Menu,
  X,
  Clock,
  Target,
  TrendingUp
} from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'header-blur' : 'bg-transparent'
      }`}>
        <div className="container-nexa">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold">AttendanceX</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="desktop-only flex items-center space-x-8">
              <a href="#features" className="nav-link">Product</a>
              <a href="#solutions" className="nav-link">Solutions</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#company" className="nav-link">Company</a>
              <a href="#resources" className="nav-link">Resources</a>
            </nav>

            {/* CTA Buttons */}
            <div className="desktop-only flex items-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="btn-ghost"
              >
                Sign in
              </button>
              <button 
                onClick={() => navigate('/register')}
                className="btn-primary"
              >
                Get started
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="mobile-only p-2 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-only bg-black border-t border-gray-800 animate-slide-up">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block nav-link">Product</a>
              <a href="#solutions" className="block nav-link">Solutions</a>
              <a href="#pricing" className="block nav-link">Pricing</a>
              <div className="pt-4 space-y-2">
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full text-left btn-ghost"
                >
                  Sign in
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn-primary w-full justify-center"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="section-padding pt-32 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-nexa"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>

        <div className="container-nexa relative z-10">
          <div className="text-center max-w-5xl mx-auto animate-fade-in">
            {/* Badge */}
            <div className="hero-badge mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Now with Predictive AI</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-title mb-8">
              <span className="block">Accelerate</span>
              <span className="block gradient-text">
                Attendance Management
              </span>
              <span className="block">Tasks on Any Device</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Simplified attendance delivery for enterprises. Our optimized AI achieves 
              <span className="text-white font-semibold"> 9x faster </span>
              processing and 
              <span className="text-white font-semibold"> 35x faster </span>
              analytics generation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button 
                onClick={() => navigate('/register')}
                className="btn-primary group"
              >
                <span>Get started for free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="btn-secondary group"
              >
                <Play className="w-5 h-5 mr-2" />
                <span>Watch demo</span>
              </button>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2 hover-lift">
                <div className="stat-number text-blue-400">9x</div>
                <div className="stat-label">faster in attendance tasks</div>
              </div>
              <div className="space-y-2 hover-lift">
                <div className="stat-number text-purple-400">35x</div>
                <div className="stat-label">faster in analytics generation</div>
              </div>
              <div className="space-y-2 hover-lift">
                <div className="stat-number text-green-400">4x</div>
                <div className="stat-label">less storage needed</div>
              </div>
              <div className="space-y-2 hover-lift">
                <div className="stat-number text-yellow-400">99.9%</div>
                <div className="stat-label">accuracy maintained</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding bg-gray-900/50">
        <div className="container-nexa">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Deploy across any hardware and{" "}
              <span className="gradient-text">
                operating system
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Supporting devices from laptops and mobile to automotive and IoT. 
              Our framework works with any hardware setup.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'Predictive AI Intelligence',
                description: 'Advanced machine learning algorithms predict attendance patterns and detect anomalies in real-time.',
                features: ['99.9% prediction accuracy', 'Real-time anomaly detection', 'Automated insights generation'],
                gradient: 'from-blue-500 to-cyan-500',
                iconBg: 'bg-gradient-to-r from-blue-500 to-cyan-500'
              },
              {
                icon: Smartphone,
                title: 'Multi-Modal Detection',
                description: 'Support for QR codes, geolocation, biometrics, and manual check-ins across all devices.',
                features: ['Ultra-fast QR scanning', 'Intelligent geofencing', 'Enterprise biometrics'],
                gradient: 'from-purple-500 to-pink-500',
                iconBg: 'bg-gradient-to-r from-purple-500 to-pink-500'
              },
              {
                icon: BarChart3,
                title: 'Enterprise Analytics',
                description: 'Comprehensive reporting with 15+ chart types and automated insights for data-driven decisions.',
                features: ['Real-time dashboards', 'PDF/Excel export', 'Automated reporting'],
                gradient: 'from-green-500 to-teal-500',
                iconBg: 'bg-gradient-to-r from-green-500 to-teal-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group animate-fade-in" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="card-nexa hover-glow">
                  <div className={`feature-icon ${feature.iconBg}`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-300 flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="section-padding">
        <div className="container-nexa">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="animate-fade-in">
              <h2 className="text-4xl font-bold mb-6">
                Run models with full accuracy on{" "}
                <span className="gradient-text">resource-constrained devices</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Our proprietary optimization reduces storage and memory requirements by 4x 
                while maintaining 99.9% accuracy across all attendance tracking scenarios.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: Clock,
                    title: 'Real-time Processing',
                    description: 'Instant attendance verification with sub-second response times'
                  },
                  {
                    icon: Shield,
                    title: 'Enterprise Security',
                    description: 'Bank-grade encryption with complete audit trails'
                  },
                  {
                    icon: Target,
                    title: 'Precision Tracking',
                    description: 'GPS-accurate location verification with configurable zones'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative animate-fade-in">
              <div className="card-glass p-8 text-center">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-green-400">98.7%</div>
                    <div className="text-sm text-gray-400">Attendance Rate</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-blue-400">2.3s</div>
                    <div className="text-sm text-gray-400">Avg. Check-in Time</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-purple-400">500+</div>
                    <div className="text-sm text-gray-400">Organizations</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-yellow-400">24/7</div>
                    <div className="text-sm text-gray-400">Monitoring</div>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Processing Speed</span>
                    <span className="text-sm text-white">9x faster</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full w-[90%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding bg-gray-900/30">
        <div className="container-nexa">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-6">
              Trusted by industry leaders
            </h2>
            <p className="text-xl text-gray-400">
              Join 500+ organizations already using AttendanceX
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "AttendanceX represents a major leap towards making powerful attendance management accessible to everyone.",
                author: "Sarah Johnson",
                title: "CTO, TechCorp",
                rating: 5
              },
              {
                quote: "A monumental leap in attendance tracking efficiency, making real-world applications faster and smarter than ever imagined.",
                author: "Michael Chen",
                title: "Head of Operations, GlobalTech",
                rating: 5
              },
              {
                quote: "Extremely fast, better than traditional solutions, great results across all our departments.",
                author: "Emma Davis",
                title: "HR Director, InnovateCo",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="testimonial-card hover-lift animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-gray-400">{testimonial.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-nexa">
        <div className="container-nexa">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Ready to accelerate your{" "}
              <span className="gradient-text">
                attendance management?
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Join the hundreds of organizations already transforming their 
              attendance tracking with AttendanceX AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/register')}
                className="btn-primary group"
              >
                <span>Start for free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="btn-secondary"
              >
                Schedule demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-16 px-4 sm:px-6 lg:px-8">
        <div className="container-nexa">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="footer-link">Features</a></li>
                <li><a href="#" className="footer-link">Integrations</a></li>
                <li><a href="#" className="footer-link">Pricing</a></li>
                <li><a href="#" className="footer-link">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="footer-link">About</a></li>
                <li><a href="#" className="footer-link">Blog</a></li>
                <li><a href="#" className="footer-link">Careers</a></li>
                <li><a href="#" className="footer-link">Press</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="footer-link">Documentation</a></li>
                <li><a href="#" className="footer-link">Help Center</a></li>
                <li><a href="#" className="footer-link">Contact</a></li>
                <li><a href="#" className="footer-link">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="footer-link">Privacy</a></li>
                <li><a href="#" className="footer-link">Terms</a></li>
                <li><a href="#" className="footer-link">Security</a></li>
                <li><a href="#" className="footer-link">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold">AttendanceX</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 AttendanceX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;