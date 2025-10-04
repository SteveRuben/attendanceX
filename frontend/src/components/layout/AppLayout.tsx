// Layout principal de l'application avec support multi-tenant
import React, { ReactNode } from 'react';
import { TenantSwitcher } from '../tenant/TenantSwitcher';
import { useMultiTenantAuth, useTenant } from '../../contexts/MultiTenantAuthContext';
import { ConditionalRender } from '../auth/ProtectedRoute';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { NavigationKey, getNavigationKeyForRoute } from '../../constants/routes';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  title?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSidebar = true,
  showHeader = true,
  title
}) => {
  const { user, logout, isLoading } = useMultiTenantAuth();
  const { tenant, branding } = useTenant();
  const campaignsBase = tenant?.id ? `/organization/${tenant.id}/campaigns` : '/campaigns';

  return (
    <div className="min-h-screen bg-gray-50" style={{
      '--primary-color': branding.primaryColor,
      '--secondary-color': branding.secondaryColor
    } as React.CSSProperties}>
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo et titre */}
              <div className="flex items-center space-x-4">
                {tenant?.branding?.logoUrl ? (
                  <img
                    src={tenant.branding.logoUrl}
                    alt={tenant.name}
                    className="h-8 w-auto"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    {tenant?.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {title || tenant?.name || 'Attendance Management'}
                  </h1>
                </div>
              </div>

              {/* Navigation et actions */}
              <div className="flex items-center space-x-4">
                {/* Sélecteur de tenant */}
                <TenantSwitcher />

                {/* Menu utilisateur */}
                <div className="relative">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-700">
                      {user?.displayName || user?.email}
                    </span>
                    <button
                      onClick={logout}
                      disabled={isLoading}
                      className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 bg-white shadow-sm border-r sticky top-16 h-[calc(100vh-4rem)]">
            <nav className="h-full overflow-y-auto px-4 py-6">
              <div className="space-y-2">
                <NavLink href="/dashboard" icon="🏠" navKey={NavigationKey.DASHBOARD}>
                  Dashboard
                </NavLink>
                <NavLink href="/presence" icon="✅" permission="view_attendance" navKey={NavigationKey.ATTENDANCE}>
                  Attendance
                </NavLink>
                <NavLink href="/presence/qr" icon="📱" permission="check_attendance" navKey={NavigationKey.QR_CHECKIN}>
                  QR Check-in
                </NavLink>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Campaigns
                  </p>
                  <NavLink href={campaignsBase} icon="✉️" navKey={NavigationKey.CAMPAIGNS}>
                    Campaigns
                  </NavLink>
                  <NavLink href={`${campaignsBase}/templates`} icon="🧩" navKey={NavigationKey.TEMPLATES}>
                    Templates
                  </NavLink>
                  <NavLink href={`${campaignsBase}/analytics`} icon="📈" navKey={NavigationKey.ANALYTICS}>
                    Analytics
                  </NavLink>
                </div>
                <ConditionalRender permissions={['manager_access']}>
                  <NavLink href="/manager" icon="👨‍💼" navKey={NavigationKey.MANAGER}>
                    Manager
                  </NavLink>
                </ConditionalRender>
                <ConditionalRender permissions={['admin_access']}>
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Administration
                    </p>
                    <NavLink href="/admin" icon="⚙️" navKey={NavigationKey.ADMIN}>
                      Admin Panel
                    </NavLink>
                    <NavLink href="/admin/users" icon="👥" permission="manage_users" navKey={NavigationKey.USERS}>
                      Users
                    </NavLink>
                    <NavLink href="/admin/integrations" icon="🔗" permission="manage_integrations" navKey={NavigationKey.INTEGRATIONS}>
                      Integrations
                    </NavLink>
                    <NavLink href="/admin/reports" icon="📊" permission="view_reports" navKey={NavigationKey.REPORTS}>
                      Reports
                    </NavLink>
                  </div>
                </ConditionalRender>
                <ConditionalRender features={['advancedAnalytics']}>
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Analytics
                    </p>
                    <NavLink href="/analytics/ml" icon="🤖" navKey={NavigationKey.ML_DASHBOARD}>
                      ML Dashboard
                    </NavLink>
                  </div>
                </ConditionalRender>
              </div>
            </nav>
          </aside>
        )}

        {/* Contenu principal */}
        <main className={`flex-1 ${showSidebar ? 'ml-0' : ''}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Composant de lien de navigation
interface NavLinkProps {
  href: string;
  icon: string;
  children: ReactNode;
  permission?: string;
  feature?: string;
  navKey: NavigationKey;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, children, permission, feature, navKey }) => {
  const location = useLocation();
  const currentNavKey = getNavigationKeyForRoute(location.pathname);
  const isActive = currentNavKey === navKey;

  return (
    <ConditionalRender
      permissions={permission ? [permission] : []}
      features={feature ? [feature] : []}
    >
      <RouterNavLink
        to={href}
        className={
          `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`
        }
      >
        <span className="text-lg">{icon}</span>
        <span>{children}</span>
      </RouterNavLink>
    </ConditionalRender>
  );
};