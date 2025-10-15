/**
 * Sidebar de navigation principale
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../hooks/use-auth';
import {
  Building2,
  Calendar,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  User,
  Bell,
  Plug,
  FileText,
  QrCode,
  Upload,
  UserPlus,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Shield,
  Clock,
  MapPin,
  Zap,
  TrendingUp,
  Database,
  Mail,
  Phone,
  Globe
} from 'lucide-react';

interface SidebarProps {
  organizationId: string;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  children?: MenuItem[];
  permission?: string;
  comingSoon?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ organizationId, className }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(['dashboard', 'organization']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: Home,
      href: `/organization/${organizationId}/dashboard`
    },
    {
      id: 'organization',
      label: 'Organisation',
      icon: Building2,
      children: [
        {
          id: 'org-overview',
          label: 'Vue d\'ensemble',
          icon: Building2,
          href: `/organization/${organizationId}/overview`
        },
        {
          id: 'teams',
          label: 'Équipes',
          icon: Users,
          href: `/organization/${organizationId}/teams`,
          badge: 'Nouveau'
        },
        {
          id: 'members',
          label: 'Membres',
          icon: User,
          href: `/organization/${organizationId}/members`
        },
        {
          id: 'invitations',
          label: 'Invitations',
          icon: UserPlus,
          href: `/organization/${organizationId}/invitations`
        }
      ]
    },
    {
      id: 'events',
      label: 'Événements',
      icon: Calendar,
      children: [
        {
          id: 'events-list',
          label: 'Tous les événements',
          icon: Calendar,
          href: `/organization/${organizationId}/events`
        },
        {
          id: 'create-event',
          label: 'Créer un événement',
          icon: Calendar,
          href: `/organization/${organizationId}/events/create`
        },
        {
          id: 'event-templates',
          label: 'Modèles d\'événements',
          icon: FileText,
          href: `/organization/${organizationId}/events/templates`,
          comingSoon: true
        }
      ]
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: UserCheck,
      children: [
        {
          id: 'attendance-overview',
          label: 'Vue d\'ensemble',
          icon: UserCheck,
          href: `/organization/${organizationId}/attendance`
        },
        {
          id: 'validate-attendance',
          label: 'Valider les présences',
          icon: UserCheck,
          href: `/organization/${organizationId}/attendance/validate`
        },
        {
          id: 'upload-attendance',
          label: 'Importer un fichier',
          icon: Upload,
          href: `/organization/${organizationId}/attendance/upload`
        },
        {
          id: 'qr-codes',
          label: 'Codes QR',
          icon: QrCode,
          href: `/organization/${organizationId}/qr-codes`
        }
      ]
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: BarChart3,
      children: [
        {
          id: 'attendance-reports',
          label: 'Rapports de présence',
          icon: BarChart3,
          href: `/organization/${organizationId}/reports/attendance`
        },
        {
          id: 'event-reports',
          label: 'Rapports d\'événements',
          icon: Calendar,
          href: `/organization/${organizationId}/reports/events`
        },
        {
          id: 'analytics',
          label: 'Analytics avancés',
          icon: TrendingUp,
          href: `/organization/${organizationId}/analytics`,
          comingSoon: true
        }
      ]
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: Users,
      children: [
        {
          id: 'users-list',
          label: 'Tous les utilisateurs',
          icon: Users,
          href: `/organization/${organizationId}/users`
        },
        {
          id: 'create-user',
          label: 'Inviter un utilisateur',
          icon: UserPlus,
          href: `/organization/${organizationId}/users/invite`
        },
        {
          id: 'user-roles',
          label: 'Rôles et permissions',
          icon: Shield,
          href: `/organization/${organizationId}/users/roles`,
          comingSoon: true
        }
      ]
    }
  ];

  const settingsItems: MenuItem[] = [
    {
      id: 'profile',
      label: 'Mon profil',
      icon: User,
      href: `/profile`
    },
    {
      id: 'preferences',
      label: 'Préférences',
      icon: Settings,
      href: `/preferences`
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      href: `/notifications`,
      badge: 3
    },
    {
      id: 'integrations',
      label: 'Intégrations',
      icon: Plug,
      href: `/integrations`,
      comingSoon: true
    }
  ];

  const comingSoonItems: MenuItem[] = [
    {
      id: 'time-tracking',
      label: 'Suivi du temps',
      icon: Clock,
      comingSoon: true
    },
    {
      id: 'geolocation',
      label: 'Géolocalisation',
      icon: MapPin,
      comingSoon: true
    },
    {
      id: 'automation',
      label: 'Automatisation',
      icon: Zap,
      comingSoon: true
    },
    {
      id: 'api-access',
      label: 'Accès API',
      icon: Database,
      comingSoon: true
    },
    {
      id: 'sms-integration',
      label: 'Intégration SMS',
      icon: Phone,
      comingSoon: true
    },
    {
      id: 'email-campaigns',
      label: 'Campagnes email',
      icon: Mail,
      comingSoon: true
    },
    {
      id: 'public-pages',
      label: 'Pages publiques',
      icon: Globe,
      comingSoon: true
    }
  ];

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);
    const active = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => toggleSection(item.id)}
            className={cn(
              "w-full justify-start text-left font-normal",
              level > 0 && "pl-8",
              active && "bg-gray-100 text-gray-900"
            )}
          >
            <item.icon className="mr-3 h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {item.badge}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          {isExpanded && (
            <div className="space-y-1 pl-4">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (item.comingSoon) {
      return (
        <div key={item.id} className="relative">
          <Button
            variant="ghost"
            disabled
            className={cn(
              "w-full justify-start text-left font-normal opacity-60",
              level > 0 && "pl-8"
            )}
          >
            <item.icon className="mr-3 h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              Bientôt
            </Badge>
          </Button>
        </div>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        asChild
        className={cn(
          "w-full justify-start text-left font-normal",
          level > 0 && "pl-8",
          active && "bg-gray-100 text-gray-900"
        )}
      >
        <Link to={item.href!}>
          <item.icon className="mr-3 h-4 w-4" />
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {item.badge}
            </Badge>
          )}
        </Link>
      </Button>
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div className={cn("flex h-full w-64 flex-col bg-white border-r", className)}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-6">
        <Building2 className="h-6 w-6 text-gray-900" />
        <span className="ml-2 text-lg font-semibold text-gray-900">
          AttendanceX
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-2 px-3">
          {/* Menu principal */}
          <div className="space-y-1">
            {menuItems.map(item => renderMenuItem(item))}
          </div>

          <Separator className="my-4" />

          {/* Paramètres */}
          <div className="space-y-1">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Paramètres
              </h3>
            </div>
            {settingsItems.map(item => renderMenuItem(item))}
          </div>

          <Separator className="my-4" />

          {/* Fonctionnalités à venir */}
          <div className="space-y-1">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                À venir
              </h3>
            </div>
            {comingSoonItems.map(item => renderMenuItem(item))}
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.displayName || user?.email}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-left font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
};