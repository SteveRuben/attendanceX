// src/components/landing/HeroSection.tsx - Version thème clair simple
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Play, CheckCircle, Zap, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HeroSection() {
  const navigate = useNavigate();

  const stats = [
    { value: "9x", label: "faster in attendance tasks", icon: Zap, color: "text-gray-700" },
    { value: "35x", label: "faster in analytics generation", icon: TrendingUp, color: "text-gray-700" },
    { value: "4x", label: "less storage needed", icon: CheckCircle, color: "text-gray-700" },
    { value: "99.9%", label: "accuracy maintained", icon: Users, color: "text-gray-700" }
  ];

  return (
    <section className="section-padding pt-32 relative overflow-hidden bg-white">
      {/* Background Elements subtils */}
      <div className="absolute inset-0 bg-white"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-100 rounded-full blur-3xl opacity-50 animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-50 rounded-full blur-3xl opacity-30 animate-float" style={{animationDelay: '2s'}}></div>

      <div className="container-nexa relative z-10">
        <div className="text-center max-w-5xl mx-auto animate-fade-in">
          {/* Badge simple */}
          <Badge 
            variant="secondary" 
            className="mb-8 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 transition-all duration-300 border border-gray-200 text-gray-700"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-700 font-normal">
              Now with Smart Analytics
            </span>
          </Badge>

          {/* Titre principal simple */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
            <span className="block text-gray-900">Simple</span>
            <span className="block text-gray-900 font-bold">
              Attendance Management
            </span>
            <span className="block text-gray-900">For Modern Teams</span>
          </h1>

          {/* Sous-titre */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            Streamlined attendance tracking for organizations. Our optimized system achieves{" "}
            <span className="text-gray-900 font-semibold">9x faster</span>{" "}
            processing and{" "}
            <span className="text-gray-900 font-semibold">35x faster</span>{" "}
            analytics generation.
          </p>

          {/* CTA Buttons simples */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={() => navigate('/register')}
              size="lg" 
              className="bg-gray-900 text-white hover:bg-gray-800 font-normal text-lg px-8 py-6 h-auto transition-all duration-300"
            >
              <span>Get started for free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="group border-gray-300 hover:border-gray-400 bg-transparent hover:bg-gray-50 text-gray-700 transition-all duration-300 text-lg px-8 py-6 h-auto"
                >
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span>Watch demo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[900px] bg-white border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 text-xl">
                    AttendanceX Platform Demo
                  </DialogTitle>
                </DialogHeader>
                <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">AttendanceX Demo Video</p>
                    <p className="text-gray-500 text-sm mt-2">Discover the power of our platform</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Performance Stats - style simple */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat, index) => (
              <Card 
                key={index}
                className="group bg-gray-50 border-gray-200 hover:border-gray-300 transition-all duration-300 hover:bg-gray-100 cursor-pointer hover:scale-105"
              >
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                      <stat.icon className={`w-5 h-5 text-gray-700`} />
                    </div>
                  </div>
                  <div className={`text-2xl md:text-3xl font-bold text-gray-900 mb-2 group-hover:scale-110 transition-transform`}>
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 leading-tight">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Indicateur de scroll */}
          <div className="mt-16 flex justify-center">
            <div className="animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-600 rounded-full mt-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}