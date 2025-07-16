// src/components/layout/Header.tsx - Version harmonisée thème clair
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, User, Settings, LogOut, Menu } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-40">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          onClick={onMobileMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg hidden sm:block">
            AttendanceX
          </span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <Bell className="w-5 h-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600"
          >
            3
          </Badge>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 h-10 px-3"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {user?.firstName || 'Utilisateur'}
                </span>
                <span className="text-xs text-gray-500">
                  {user?.role || 'Participant'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
            
            <DropdownMenuSeparator className="bg-gray-200" />
            
            <DropdownMenuItem 
              onClick={() => navigate('/profile')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-gray-200" />
            
            <DropdownMenuItem 
              onClick={logout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;