// src/components/landing/HeaderLanding.tsx - Version harmonisée
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function HeaderLanding() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' },
    { name: 'FAQ', path: '/faq' }
  ];

  return (
    <header className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled 
        ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm" 
        : "bg-white"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20">
        <div className="flex items-center justify-between h-full">
          {/* Logo harmonisé avec le reste du projet */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              AttendanceX
            </span>
          </div>

          {/* Desktop Navigation - style harmonisé */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <div 
                key={item.name} 
                onClick={() => navigate(item.path)}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium px-4 py-2 transition-all cursor-pointer"
              >
                {item.name}
              </div>
            ))}
          </nav>

          {/* Desktop CTA Buttons - style cohérent */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium"
            >
              Sign in
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-gray-900 text-white hover:bg-gray-800 font-medium shadow-sm"
            >
              Get started
            </Button>
          </div>

          {/* Mobile Menu - style harmonisé */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[350px] bg-white border-gray-200">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3 text-gray-900">
                  <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  AttendanceX
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-8 space-y-6">
                {/* Mobile Navigation Links */}
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors py-3 px-4 rounded-lg font-medium"
                    >
                      {item.name}
                    </button>
                  ))}
                </nav>

                {/* Mobile CTA Buttons */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigate('/login');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Sign in
                  </Button>
                  <Button 
                    onClick={() => {
                      navigate('/register');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium"
                  >
                    Get started free
                  </Button>
                </div>

                {/* Mobile Contact */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MessageCircle className="w-4 h-4" />
                    <span>Need help? Contact support</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}