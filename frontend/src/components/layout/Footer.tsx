// src/components/layout/Footer.tsx - Footer avec liens classiques
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [copyrightYear, setCopyrightYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setCopyrightYear(new Date().getFullYear())
  }, [])
  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", path: "/features" },
        { name: "Pricing", path: "/pricing" },
        { name: "Security", path: "/security" },
        { name: "Integrations", path: "/integrations" }
      ]
    },
    {
      title: "Company",
      links: [
        { name: "About", path: "/about" },
        { name: "Blog", path: "/blog" },
        { name: "Careers", path: "/careers" },
        { name: "Contact", path: "/contact" }
      ]
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", path: "/faq" },
        { name: "Documentation", path: "/docs" },
        { name: "API Reference", path: "/api" },
        { name: "Status", path: "/status" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy", path: "/privacy" },
        { name: "Terms", path: "/terms" },
        { name: "Security", path: "/security" },
        { name: "GDPR", path: "/gdpr" }
      ]
    }
  ];

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                AttendanceX
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-6 max-w-sm leading-relaxed">
              Simple, modern attendance management for teams. 
              Track attendance with QR codes, mobile apps, and real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/register')}
                size="sm"
                className="bg-gray-900 text-white hover:bg-gray-800 font-medium"
              >
                Get started
              </Button>
              <Button 
                variant="ghost"
                onClick={() => navigate('/contact')}
                size="sm"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium"
              >
                Contact sales
              </Button>
            </div>
          </div>

          {/* Footer links */}
          {footerSections.map((section, index) => (
            <div key={index} className="md:col-span-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-0">
                {section.links.map((link) => (
                  <li key={link.name} className="mb-3">
                    <a
                      href={link.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(link.path);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors inline-block"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-gray-200" />

      {/* Bottom footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 text-sm text-gray-500">
            <span>© {copyrightYear} AttendanceX</span>
            <div className="flex gap-4">
              <a 
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/privacy');
                }}
                className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
              >
                Privacy Policy
              </a>
              <a 
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/terms');
                }}
                className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 text-sm text-gray-500">
            <span>Made with ❤️ for modern teams</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;