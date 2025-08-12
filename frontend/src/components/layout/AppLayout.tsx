// src/components/layout/AppLayout.tsx - Layout principal de l'application
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Home,
  Calendar,
  Users,
  CheckSquare,
  Bell,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  User,
  Shield,
  HelpCircle,
  Search,
  Plus
} from 'lucide-react';
import { notificationService } from '@/services';
import { toast } from 'react-toastify';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  permission?: string;
  roles?: string[];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, logout } = useAuth();
  const { 
    canCreateEvents, 
    canManageUsers, 
    canViewReports, 
    canManageSettings,
    isAdmin,
    isOrganizer 
  } = usePermissions();
  
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Navigation items
  const navigation: NavigationItem[] = [
    {
      name: 'Tableau de bord',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: 'Événements',
      href: '/events',
      icon: Calendar,
    },
    {
      name: 'Présences',
      href: '/attendances',
      icon: CheckSquare,
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: Bell,
      badge: unreadNotifications,
    },
    {
      name: 'Rapports',
      href: '/reports',
      icon: BarChart3,
      permission: 'view_reports',
    },
    {
      name: 'Utilisateurs',
      href: '/users',
      icon: Users,
      permission: 'manage_users',
    },
    {
      name: 'Administration',
      href: '/admin',
      icon: Shield,
      roles: ['admin', 'super_admin'],
    },
  ];

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (item.permission && !canViewReports && item.permission === 'view_reports') return false;
    if (item.permission && !canManageUsers && item.permission === 'manage_users') return false;
    if (item.roles && !item.roles.some(role => 
      (role === 'admin' && isAdmin) || 
      (role === 'super_admin' && isAdmin)
    )) return false;
    return true;
  });

  useEffect(() => {
    loadUnreadNotifications();
  }, []);

  const loadUnreadNotifications = async () => {
    try {
      const response = await notificationService.getMyNotifications({ 
        unreadOnly: true, 
        limit: 1 
      });
      if (response.success && response.data) {
        setUnreadNotifications(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="ml-3 text-xl font-bold text-foreground">AttendanceX</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {filteredNavigation.map((item) => {
          const isActive = isCurrentPath(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`sidebar-nav-item ${
                isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-1">{item.name}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="ml-2 px-2 py-1 text-xs">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.photoURL} />
            <AvatarFallback className="text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.displayName || `${user?.firstName} ${user?.lastName}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-card border-r">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-card border-b px-4 py-3 flex items-center justify-between lg:px-6">
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <div
                  className="lg:hidden mr-2"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </div>
              </SheetTrigger>
            </Sheet>

            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent w-64"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            {/* will always return true {canCreateEvents && ( */}
            {canCreateEvents() && (
              <button className="hidden sm:flex">
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </button>
            )}

            {/* Notifications */}
            <button className="relative">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 px-1 py-0 text-xs min-w-[1.25rem] h-5"
                >
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Badge>
              )}
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || `${user?.firstName} ${user?.lastName}`}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                {canManageSettings() && (
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Paramètres</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/help" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Aide</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;