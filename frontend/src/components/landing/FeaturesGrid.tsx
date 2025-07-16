// src/components/landing/FeaturesGrid.tsx - Version thème clair simple
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, Smartphone, BarChart3, CheckCircle, ArrowRight, Info } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: 'Smart Analytics',
    description: 'Advanced algorithms analyze attendance patterns and detect anomalies in real-time.',
    features: [
      { name: '99.9% prediction accuracy', tooltip: 'Validated across 500+ organizations' },
      { name: 'Real-time anomaly detection', tooltip: 'Instant alerts for unusual patterns' },
      { name: 'Automated insights generation', tooltip: 'Smart reports and recommendations' }
    ],
    badge: 'AI Powered',
    badgeVariant: 'default' as const,
    iconBg: 'bg-gray-100',
    glowColor: 'shadow-gray-500/10',
    hoverGlow: 'hover:shadow-gray-500/20'
  },
  {
    icon: Smartphone,
    title: 'Multi-Modal Detection',
    description: 'Support for QR codes, geolocation, biometrics, and manual check-ins across all devices.',
    features: [
      { name: 'Ultra-fast QR scanning', tooltip: 'Sub-second QR code recognition' },
      { name: 'Intelligent geofencing', tooltip: 'GPS-accurate location verification' },
      { name: 'Enterprise biometrics', tooltip: 'Fingerprint and facial recognition' }
    ],
    badge: 'Cross Platform',
    badgeVariant: 'secondary' as const,
    iconBg: 'bg-gray-100',
    glowColor: 'shadow-gray-500/10',
    hoverGlow: 'hover:shadow-gray-500/20'
  },
  {
    icon: BarChart3,
    title: 'Enterprise Analytics',
    description: 'Comprehensive reporting with 15+ chart types and automated insights for data-driven decisions.',
    features: [
      { name: 'Real-time dashboards', tooltip: 'Live attendance monitoring' },
      { name: 'PDF/Excel export', tooltip: 'Professional report generation' },
      { name: 'Automated reporting', tooltip: 'Scheduled reports and alerts' }
    ],
    badge: 'Analytics',
    badgeVariant: 'outline' as const,
    iconBg: 'bg-gray-100',
    glowColor: 'shadow-gray-500/10',
    hoverGlow: 'hover:shadow-gray-500/20'
  }
];

export default function FeaturesGrid() {
  return (
    <TooltipProvider>
      <section id="features" className="section-padding bg-gray-50 relative">
        {/* Background pattern subtil */}
        <div className="absolute inset-0 bg-gray-50"></div>
        
        <div className="container-nexa relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20 animate-fade-in">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm bg-white border-gray-200 text-gray-700">
              Platform Features
            </Badge>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
              Deploy across any hardware and{" "}
              <span className="text-gray-900 font-bold">
                operating system
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-light">
              Supporting devices from laptops and mobile to automotive and IoT. 
              Our framework works with any hardware setup, delivering consistent performance.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`group animate-fade-in bg-white border-gray-200 hover:border-gray-300 transition-all duration-500 hover:bg-gray-50 shadow-sm hover:shadow-md cursor-pointer`}
                style={{animationDelay: `${index * 0.2}s`}}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`relative p-3 rounded-xl ${feature.iconBg} transition-all duration-300 group-hover:scale-110`}>
                      <feature.icon className="w-7 h-7 text-gray-700 relative z-10" />
                    </div>
                    <Badge 
                      variant={feature.badgeVariant} 
                      className="text-xs px-3 py-1 group-hover:scale-105 transition-transform duration-300 bg-gray-100 text-gray-700 border-gray-200"
                    >
                      {feature.badge}
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-xl text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                        <span className="flex-1">{item.name}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 ml-2 cursor-help transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-900 text-white border-gray-700">
                            <p className="text-sm">{item.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group/btn text-gray-500 hover:text-gray-700 p-0 h-auto font-normal hover:bg-transparent"
                    >
                      <span>Learn more</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Card className="max-w-4xl mx-auto bg-white border-gray-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Ready to transform your attendance management?
                    </h3>
                    <p className="text-gray-600">
                      Join 500+ organizations already using AttendanceX
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      className="border-gray-300 hover:border-gray-400 bg-transparent hover:bg-gray-50 text-gray-700"
                    >
                      Schedule Demo
                    </Button>
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 border-0">
                      Start Free Trial
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}