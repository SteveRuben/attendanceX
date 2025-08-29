/**
 * Navigation principale avec onglets et fonctionnalités "Coming Soon"
 */

import React, { useState } from 'react';
import {
  Tabs,
  TabsContent
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  BarChart3,
  Settings,
  Clock,
  QrCode,
  FileText,
  Bell,
  ChevronDown,
  Sparkles,
  Building,
  UserPlus,
  Shield,
  Plug,
  User,
  CreditCard,
  Mail,
  Send,
  Brain,
  UserCheck,
  Activity,
  Briefcase,
  ClipboardList
} from 'lucide-react';

// Composants fonctionnels
import { EventManagementCenter } from '@/components/events/EventManagementCenter';
import { TeamManagementCenter } from '@/components/teams/TeamManagementCenter';
import { OrganizationDashboard } from '@/components/dashboard/OrganizationDashboard';
import { AttendanceValidationInterface } from '@/components/attendance/AttendanceValidationInterface';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { CampaignCenter } from '@/components/campaigns/CampaignCenter';
import { AnalyticsCenter } from '@/components/analytics/AnalyticsCenter';

// Composants placeholder pour les fonctionnalités à venir
import { AttendanceValidationReport } from '@/components/analytics/AttendanceValidationReport';
import { TeamParticipationChart } from '@/components/analytics/TeamParticipationChart';
import { ExportReportsDialog } from '@/components/analytics/ExportReportsDialog';
import { PreferencesCenter } from '@/components/settings/PreferencesCenter';

// Pages intégrées
import AdminDashboard from '@/pages/Admin/Dashboard';
import MLDashboard from '@/pages/Analytics/MLDashboard';
import IntegrationsDashboard from '@/pages/Integrations/IntegrationsDashboard';
import UsersList from '@/pages/Users/UsersList';
import PresenceDashboard from '@/pages/Presence/PresenceDashboard';
import ManagerDashboard from '@/pages/manager/ManagerDashboard';
import QRCheckIn from '@/pages/CheckIn/QRCheckIn';
import ReportsList from '@/pages/Reports/ReportsList';

interface MainNavigationProps {
  organizationId: string;
  organizationName: string;
  userRole: string;
  userName?: string;
  userPermissions?: string[];
  isOwner?: boolean;
  isAdmin?: boolean;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component?: React.ComponentType<any>;
  comingSoon?: boolean;
  dropdown?: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    component?: React.ComponentType<any>;
    comingSoon?: boolean;
  }>;
}

const ComingSoonPlaceholder: React.FC<{ feature: string }> = ({ feature }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <Sparkles className="h-16 w-16 text-blue-500 mb-4" />
    <h3 className="text-xl font-semibold mb-2">Bientôt Disponible</h3>
    <p className="text-muted-foreground mb-4">
      La fonctionnalité <strong>{feature}</strong> sera disponible prochainement.
    </p>
    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
      <Sparkles className="h-3 w-3 mr-1" />
      Coming Soon
    </Badge>
  </div>
);

import { filterNavigationItems } from '@/utils/navigationPermissions';
import { OrganizationRole } from '@attendance-x/shared';

export const MainNavigation: React.FC<MainNavigationProps> = ({
  organizationId,
  organizationName,
  userRole,
  userName,
  userPermissions = [],
  isOwner = false,
  isAdmin = false
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const allNavigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: <BarChart3 className="h-4 w-4" />,
      component: () => <OrganizationDashboard organizationId={organizationId} />
    },
    {
      id: 'events',
      label: 'Événements',
      icon: <Calendar className="h-4 w-4" />,
      dropdown: [
        {
          id: 'events-list',
          label: 'Liste des Événements',
          icon: <Calendar className="h-4 w-4" />,
          component: () => <EventManagementCenter organizationId={organizationId} />
        },
        {
          id: 'events-create',
          label: 'Créer un Événement',
          icon: <Calendar className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'events-templates',
          label: 'Templates d\'Événements',
          icon: <FileText className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: <Clock className="h-4 w-4" />,
      dropdown: [
        {
          id: 'attendance-validation',
          label: 'Validation des Présences',
          icon: <Shield className="h-4 w-4" />,
          component: AttendanceValidationInterface
        },
        {
          id: 'attendance-qr',
          label: 'QR Codes',
          icon: <QrCode className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'attendance-reports',
          label: 'Rapports de Présence',
          icon: <FileText className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'teams',
      label: 'Équipes',
      icon: <Users className="h-4 w-4" />,
      dropdown: [
        {
          id: 'teams-management',
          label: 'Gestion des Équipes',
          icon: <Users className="h-4 w-4" />,
          component: () => <TeamManagementCenter organizationId={organizationId} />
        },
        {
          id: 'teams-permissions',
          label: 'Permissions',
          icon: <Shield className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'teams-invitations',
          label: 'Invitations',
          icon: <UserPlus className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      dropdown: [
        {
          id: 'analytics-events',
          label: 'Analytics Événements',
          icon: <BarChart3 className="h-4 w-4" />,
          component: () => <AnalyticsCenter organizationId={organizationId} />
        },
        {
          id: 'analytics-validation',
          label: 'Rapport de Validation',
          icon: <FileText className="h-4 w-4" />,
          component: () => <AttendanceValidationReport organizationId={organizationId} />
        },
        {
          id: 'analytics-teams',
          label: 'Participation par Équipe',
          icon: <Users className="h-4 w-4" />,
          component: () => <TeamParticipationChart organizationId={organizationId} />
        },
        {
          id: 'analytics-export',
          label: 'Export de Rapports',
          icon: <FileText className="h-4 w-4" />,
          component: () => <ExportReportsDialog organizationId={organizationId} />
        }
      ]
    },
    {
      id: 'organization',
      label: 'Organisation',
      icon: <Building className="h-4 w-4" />,
      dropdown: [
        {
          id: 'org-profile',
          label: 'Profil Organisation',
          icon: <Building className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-settings',
          label: 'Paramètres',
          icon: <Settings className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-members',
          label: 'Gestion des Membres',
          icon: <Users className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-integrations',
          label: 'Connecteurs & Intégrations',
          icon: <Plug className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-billing',
          label: 'Facturation & Abonnement',
          icon: <FileText className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'campaigns',
      label: 'Campagnes Mail',
      icon: <Mail className="h-4 w-4" />,
      dropdown: [
        {
          id: 'campaigns-list',
          label: 'Mes Campagnes',
          icon: <Mail className="h-4 w-4" />,
          component: () => <CampaignCenter organizationId={organizationId} />
        },
        {
          id: 'campaigns-create',
          label: 'Créer une Campagne',
          icon: <Send className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'campaigns-templates',
          label: 'Templates Email',
          icon: <FileText className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'campaigns-analytics',
          label: 'Analytics Campagnes',
          icon: <BarChart3 className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: <User className="h-4 w-4" />,
      dropdown: [
        {
          id: 'profile-settings',
          label: 'Paramètres du Profil',
          icon: <User className="h-4 w-4" />,
          component: () => <PreferencesCenter userId={userName || 'current-user'} organizationId={organizationId} userRole={userRole} />
        },
        {
          id: 'profile-security',
          label: 'Sécurité',
          icon: <Shield className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'profile-integrations',
          label: 'Connecteurs',
          icon: <Plug className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'profile-billing',
          label: 'Facturation',
          icon: <CreditCard className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      dropdown: [
        {
          id: 'notifications-inbox',
          label: 'Boîte de Réception',
          icon: <Bell className="h-4 w-4" />,
          component: () => <NotificationCenter organizationId={organizationId} />
        },
        {
          id: 'notifications-settings',
          label: 'Paramètres de Notification',
          icon: <Settings className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'notifications-history',
          label: 'Historique',
          icon: <Clock className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: <Shield className="h-4 w-4" />,
      dropdown: [
        {
          id: 'admin-dashboard',
          label: 'Dashboard Admin',
          icon: <Shield className="h-4 w-4" />,
          component: () => <AdminDashboard />
        },
        {
          id: 'admin-users',
          label: 'Gestion Utilisateurs',
          icon: <Users className="h-4 w-4" />,
          component: () => <UsersList />
        },
        {
          id: 'admin-integrations',
          label: 'Intégrations',
          icon: <Plug className="h-4 w-4" />,
          component: () => <IntegrationsDashboard />
        },
        {
          id: 'admin-reports',
          label: 'Rapports',
          icon: <FileText className="h-4 w-4" />,
          component: () => <ReportsList />
        }
      ]
    },
    {
      id: 'ai-ml',
      label: 'Intelligence Artificielle',
      icon: <Brain className="h-4 w-4" />,
      dropdown: [
        {
          id: 'ml-dashboard',
          label: 'Dashboard IA',
          icon: <Brain className="h-4 w-4" />,
          component: () => <MLDashboard />
        },
        {
          id: 'ml-predictions',
          label: 'Prédictions',
          icon: <Activity className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'ml-insights',
          label: 'Insights Avancés',
          icon: <BarChart3 className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'presence',
      label: 'Présence Avancée',
      icon: <UserCheck className="h-4 w-4" />,
      dropdown: [
        {
          id: 'presence-dashboard',
          label: 'Dashboard Présence',
          icon: <UserCheck className="h-4 w-4" />,
          component: () => <PresenceDashboard />
        },
        {
          id: 'presence-qr',
          label: 'Check-in QR',
          icon: <QrCode className="h-4 w-4" />,
          component: () => <QRCheckIn />
        },
        {
          id: 'presence-reports',
          label: 'Rapports Présence',
          icon: <ClipboardList className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'manager',
      label: 'Outils Manager',
      icon: <Briefcase className="h-4 w-4" />,
      dropdown: [
        {
          id: 'manager-dashboard',
          label: 'Dashboard Manager',
          icon: <Briefcase className="h-4 w-4" />,
          component: () => <ManagerDashboard />
        },
        {
          id: 'manager-leave',
          label: 'Gestion des Congés',
          icon: <Calendar className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'manager-schedules',
          label: 'Planification',
          icon: <Clock className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    }
  ];

  // Filtrer les éléments de navigation selon les permissions
  const navigationItems = filterNavigationItems(
    allNavigationItems,
    userRole as OrganizationRole,
    userPermissions,
    isOwner,
    isAdmin
  );

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const renderTabContent = (item: NavigationItem) => {
    if (item.comingSoon) {
      return <ComingSoonPlaceholder feature={item.label} />;
    }

    if (item.component) {
      const Component = item.component;
      return <Component organizationId={organizationId} />;
    }

    if (item.dropdown) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {item.dropdown.map((subItem) => (
              <div
                key={subItem.id}
                className="p-6 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (!subItem.comingSoon) {
                    setActiveTab(subItem.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  {subItem.icon}
                  <h3 className="font-semibold">{subItem.label}</h3>
                  {subItem.comingSoon && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      Bientôt
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subItem.comingSoon
                    ? 'Cette fonctionnalité sera disponible prochainement'
                    : 'Cliquez pour accéder à cette fonctionnalité'
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div>Contenu non défini</div>;
  };

  const renderSubItemContent = (itemId: string) => {
    for (const item of navigationItems) {
      if (item.dropdown) {
        const subItem = item.dropdown.find(sub => sub.id === itemId);
        if (subItem) {
          if (subItem.comingSoon) {
            return <ComingSoonPlaceholder feature={subItem.label} />;
          }
          if (subItem.component) {
            const Component = subItem.component;
            return <Component organizationId={organizationId} />;
          }
        }
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        {/* En-tête avec nom de l'organisation */}
        <div className="p-6 border-b">
          <div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{organizationName}</h1>
            <p className="text-sm text-gray-600">
              {userName ? `Connecté en tant que ${userName}` : 'Tableau de bord'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{userRole}</Badge>
            {userName && (
              <Badge variant="secondary" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                {userName}
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation sidebar */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigationItems.map((item) => (
              <div key={item.id}>
                {item.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={activeTab.startsWith(item.id) ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-10 text-left"
                      >
                        {item.icon}
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        {item.comingSoon && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            Bientôt
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 z-50">
                      <DropdownMenuLabel className="font-semibold">{item.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.dropdown.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.id}
                          onClick={() => {
                            console.log('Clicking on:', subItem.id, subItem.label);
                            setActiveTab(subItem.id);
                          }}
                          disabled={subItem.comingSoon}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {subItem.icon}
                          <span className="flex-1">{subItem.label}</span>
                          {subItem.comingSoon && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Bientôt
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 h-10"
                    disabled={item.comingSoon}
                    onClick={() => setActiveTab(item.id)}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.comingSoon && (
                      <Badge variant="secondary" className="text-xs">
                        Bientôt
                      </Badge>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Barre de titre */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.id === activeTab)?.label ||
                  navigationItems.flatMap(item => item.dropdown || []).find(subItem => subItem.id === activeTab)?.label ||
                  'Tableau de Bord'}
              </h2>
            </div>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {navigationItems.map((item) => (
              <TabsContent key={item.id} value={item.id} className="mt-0">
                {renderTabContent(item)}
              </TabsContent>
            ))}

            {/* Contenu des sous-éléments */}
            {navigationItems.flatMap(item => item.dropdown || []).map((subItem) => (
              <TabsContent key={subItem.id} value={subItem.id} className="mt-0">
                {renderSubItemContent(subItem.id)}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};