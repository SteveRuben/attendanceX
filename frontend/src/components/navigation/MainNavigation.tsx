/**
 * Navigation principale avec onglets et fonctionnalités "Coming Soon"
 */

import React, { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
  Shield
} from 'lucide-react';

// Composants existants (à importer selon votre structure)
import { EventAnalyticsDashboard } from '@/components/analytics/EventAnalyticsDashboard';
import { AttendanceValidationReport } from '@/components/analytics/AttendanceValidationReport';
import { TeamParticipationChart } from '@/components/analytics/TeamParticipationChart';
import { ExportReportsDialog } from '@/components/analytics/ExportReportsDialog';

// Composants placeholder pour les fonctionnalités existantes
import { EventManagement } from '@/components/events/EventManagement';
import { TeamManagement } from '@/components/teams/TeamManagement';
import { OrganizationDashboard } from '@/components/dashboard/OrganizationDashboard';
import { AttendanceValidationInterface } from '@/components/attendance/AttendanceValidationInterface';

interface MainNavigationProps {
  organizationId: string;
  organizationName: string;
  userRole: string;
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

export const MainNavigation: React.FC<MainNavigationProps> = ({
  organizationId,
  organizationName,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: <BarChart3 className="h-4 w-4" />,
      component: OrganizationDashboard
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
          component: EventManagement
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
          component: TeamManagement
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
          component: () => <EventAnalyticsDashboard organizationId={organizationId} />
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
          id: 'org-settings',
          label: 'Paramètres',
          icon: <Settings className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-members',
          label: 'Membres',
          icon: <Users className="h-4 w-4" />,
          comingSoon: true
        },
        {
          id: 'org-billing',
          label: 'Facturation',
          icon: <FileText className="h-4 w-4" />,
          comingSoon: true
        }
      ]
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      comingSoon: true
    }
  ];

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
    <div className="min-h-screen bg-gray-50">
      {/* En-tête avec nom de l'organisation */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organizationName}</h1>
            <p className="text-sm text-gray-600">Tableau de bord de gestion</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{userRole}</Badge>
          </div>
        </div>
      </div>

      {/* Navigation principale */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white border-b px-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:grid-cols-none lg:flex">
            {navigationItems.map((item) => (
              <div key={item.id} className="relative">
                {item.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={activeTab.startsWith(item.id) ? "default" : "ghost"}
                        className="flex items-center gap-2"
                      >
                        {item.icon}
                        {item.label}
                        <ChevronDown className="h-3 w-3" />
                        {item.comingSoon && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            Bientôt
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.dropdown.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.id}
                          onClick={() => setActiveTab(subItem.id)}
                          disabled={subItem.comingSoon}
                          className="flex items-center gap-2"
                        >
                          {subItem.icon}
                          {subItem.label}
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
                  <TabsTrigger
                    value={item.id}
                    className="flex items-center gap-2"
                    disabled={item.comingSoon}
                  >
                    {item.icon}
                    {item.label}
                    {item.comingSoon && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        Bientôt
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </div>
            ))}
          </TabsList>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
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
        </div>
      </Tabs>
    </div>
  );
};