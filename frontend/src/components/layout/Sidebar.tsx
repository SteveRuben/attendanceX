// src/components/layout/Sidebar.tsx - Version harmonisée thème clair
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Calendar, 
  CheckCircle, 
  Users, 
  FileText, 
  Bell, 
  Settings,
  X,
  Activity,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: BarChart3,
      badge: null
    },
    { 
      path: '/events', 
      label: 'Events', 
      icon: Calendar,
      badge: null
    },
    { 
      path: '/attendance', 
      label: 'Attendance', 
      icon: CheckCircle,
      badge: null
    },
    { 
      path: '/users', 
      label: 'Users', 
      icon: Users,
      badge: null
    },
    { 
      path: '/reports', 
      label: 'Reports', 
      icon: FileText,
      badge: null
    },
    { 
      path: '/notifications', 
      label: 'Notifications', 
      icon: Bell,
      badge: 5
    },
    { 
      path: '/admin', 
      label: 'Administration', 
      icon: Settings,
      badge: null
    },
    { 
      path: '/system/status', 
      label: 'System Status', 
      icon: Activity,
      badge: null
    },
    { 
      path: '/system/api-reference', 
      label: 'API Reference', 
      icon: Code,
      badge: null
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                AttendanceX
              </span>
            </div>
            
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => onClose?.()}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                    )} />
                    <span className="font-medium">
                      {item.label}
                    </span>
                  </div>
                  
                  {item.badge && (
                    <Badge 
                      variant={isActive ? "secondary" : "default"}
                      className={cn(
                        "text-xs",
                        isActive 
                          ? "bg-white/20 text-white hover:bg-white/30" 
                          : "bg-gray-900 text-white"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Need help?
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Check our documentation and tutorials
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-gray-300 text-gray-700 hover:bg-white text-xs"
              >
                Get Support
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;