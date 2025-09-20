// Dashboard principal multi-tenant
import React from 'react';
import { AppLayout } from '../layout/AppLayout';
import { useMultiTenantAuth, useTenant } from '../../contexts/MultiTenantAuthContext';
import { ConditionalRender } from '../auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Crown, 
  Shield,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

export const MultiTenantDashboard: React.FC = () => {
  const { user } = useMultiTenantAuth();
  const { tenant, context, hasFeature, hasPermission } = useTenant();

  if (!tenant || !context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { label: 'Owner', icon: Crown, color: 'bg-yellow-100 text-yellow-800' },
      admin: { label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-800' },
      manager: { label: 'Manager', icon: Users, color: 'bg-blue-100 text-blue-800' },
      member: { label: 'Member', icon: Users, color: 'bg-green-100 text-green-800' },
      viewer: { label: 'Viewer', icon: Users, color: 'bg-gray-100 text-gray-800' }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* En-tête du dashboard */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.displayName || user?.email}
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening in {tenant.name}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              {getRoleBadge(context.membership.role)}
              <Badge variant="outline">
                {tenant.planId.charAt(0).toUpperCase() + tenant.planId.slice(1)} Plan
              </Badge>
            </div>
          </div>
          
          <ConditionalRender permissions={['manage_organization']}>
            <button
              onClick={() => window.location.href = '/settings'}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </ConditionalRender>
        </div>

        {/* Métriques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={context.subscription?.usage.users || 0}
            limit={context.subscription?.limits.maxUsers}
            icon={Users}
            color="blue"
          />
          
          <MetricCard
            title="Events This Month"
            value={context.subscription?.usage.events || 0}
            limit={context.subscription?.limits.maxEvents}
            icon={Calendar}
            color="green"
          />
          
          <ConditionalRender features={['analytics']}>
            <MetricCard
              title="Attendance Rate"
              value="94%"
              icon={TrendingUp}
              color="purple"
            />
          </ConditionalRender>
          
          <MetricCard
            title="Storage Used"
            value={`${context.subscription?.usage.storage || 0} MB`}
            limit={context.subscription?.limits.maxStorage}
            icon={BarChart3}
            color="orange"
          />
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actions principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConditionalRender permissions={['create_events']}>
                <QuickActionButton
                  href="/events/create"
                  icon={Calendar}
                  title="Create Event"
                  description="Schedule a new event or meeting"
                />
              </ConditionalRender>
              
              <ConditionalRender permissions={['manage_users']}>
                <QuickActionButton
                  href="/users/invite"
                  icon={Users}
                  title="Invite Users"
                  description="Add new team members"
                />
              </ConditionalRender>
              
              <ConditionalRender permissions={['view_attendance']}>
                <QuickActionButton
                  href="/presence"
                  icon={Clock}
                  title="View Attendance"
                  description="Check attendance records"
                />
              </ConditionalRender>
            </CardContent>
          </Card>

          {/* Informations du plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="w-5 h-5" />
                <span>Plan Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Plan</span>
                <Badge variant="outline" className="capitalize">
                  {tenant.planId}
                </Badge>
              </div>
              
              {context.subscription && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Users</span>
                      <span>{context.subscription.usage.users} / {context.subscription.limits.maxUsers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (context.subscription.usage.users / context.subscription.limits.maxUsers) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Events</span>
                      <span>{context.subscription.usage.events} / {context.subscription.limits.maxEvents}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (context.subscription.usage.events / context.subscription.limits.maxEvents) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
              
              {tenant.planId === 'basic' && (
                <button
                  onClick={() => window.location.href = '/upgrade'}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm"
                >
                  Upgrade Plan
                </button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fonctionnalités avancées */}
        <ConditionalRender features={['advancedAnalytics']}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Advanced Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get insights into your organization's attendance patterns and trends.
              </p>
              <button
                onClick={() => window.location.href = '/analytics/ml'}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
              >
                View Analytics
              </button>
            </CardContent>
          </Card>
        </ConditionalRender>
      </div>
    </AppLayout>
  );
};

// Composant de métrique
interface MetricCardProps {
  title: string;
  value: string | number;
  limit?: number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, limit, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value}
              {limit && <span className="text-sm text-gray-500 ml-1">/ {limit}</span>}
            </p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant d'action rapide
interface QuickActionButtonProps {
  href: string;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ href, icon: Icon, title, description }) => {
  return (
    <a
      href={href}
      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </a>
  );
};