import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Calendar, 
  Building2, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Users,
  Heart,
  Megaphone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dataCy: string;
}

const navItems: NavItem[] = [
  {
    href: '/app/dashboard',
    label: 'Tableau de Bord',
    icon: LayoutDashboard,
    dataCy: 'nav-dashboard'
  },
  {
    href: '/app/projects',
    label: 'Projets',
    icon: FolderOpen,
    dataCy: 'nav-projects'
  },
  {
    href: '/app/events',
    label: 'Événements',
    icon: Calendar,
    dataCy: 'nav-events'
  },
  {
    href: '/app/teams',
    label: 'Équipes',
    icon: Users,
    dataCy: 'nav-teams'
  },
  {
    href: '/app/volunteers',
    label: 'Bénévoles',
    icon: Heart,
    dataCy: 'nav-volunteers'
  },
  {
    href: '/app/campaigns',
    label: 'Campagnes',
    icon: Megaphone,
    dataCy: 'nav-campaigns'
  },
  {
    href: '/app/organization/settings',
    label: 'Organisation',
    icon: Building2,
    dataCy: 'nav-organization'
  }
];

export const AppShell: React.FC<AppShellProps> = ({ children, title }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/app/dashboard') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tenantId');
    router.push('/auth/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarOpen ? '' : 'collapsed'}
          ${window.innerWidth < 1024 ? 'mobile-hidden' : ''}
        `}
        data-cy="sidebar"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">AttendanceX</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            className="lg:hidden"
            data-cy="sidebar-toggle"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${active 
                      ? 'bg-blue-100 text-blue-700 active' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  data-cy={item.dataCy}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-2"
              data-cy="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-cy="user-menu-button">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" data-cy="user-menu">
                <DropdownMenuLabel>
                  <div data-cy="user-email">test@test.com</div>
                  <div className="text-xs text-muted-foreground" data-cy="user-role">
                    Administrateur
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile" data-cy="profile-settings-link">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres du profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-cy="logout-button">
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Navigation mobile */}
      <div className="lg:hidden" data-cy="mobile-nav">
        {sidebarOpen && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
            <div className="flex justify-around">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className="flex flex-col items-center p-2"
                    data-cy={`mobile-${item.dataCy}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs mt-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};