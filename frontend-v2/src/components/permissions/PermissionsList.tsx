/**
 * Composant d'affichage des permissions
 */

import React from 'react';
import { FeaturePermission, TenantRole } from '../../types/permission.types';
import { permissionService } from '../../services/permissionService';
import { useRolePermissions } from '../../hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Loader2, Shield, Users, Eye, BarChart3, Settings, Zap } from 'lucide-react';

interface PermissionsListProps {
  permissions: FeaturePermission[];
  title?: string;
  description?: string;
  groupByCategory?: boolean;
  showLabels?: boolean;
}

const permissionCategories = {
  users: {
    label: 'Gestion des utilisateurs',
    icon: Users,
    permissions: [
      FeaturePermission.MANAGE_USERS,
      FeaturePermission.INVITE_USERS,
      FeaturePermission.VIEW_USERS
    ]
  },
  presence: {
    label: 'Gestion de la présence',
    icon: Shield,
    permissions: [
      FeaturePermission.MANAGE_PRESENCE,
      FeaturePermission.VIEW_PRESENCE,
      FeaturePermission.CHECK_PRESENCE,
      FeaturePermission.BULK_PRESENCE_MANAGEMENT,
      FeaturePermission.GEOFENCING
    ]
  },
  analytics: {
    label: 'Analytics et rapports',
    icon: BarChart3,
    permissions: [
      FeaturePermission.VIEW_BASIC_ANALYTICS,
      FeaturePermission.VIEW_ADVANCED_ANALYTICS,
      FeaturePermission.PRESENCE_ANALYTICS,
      FeaturePermission.CUSTOM_REPORTS,
      FeaturePermission.SCHEDULED_REPORTS,
      FeaturePermission.EXPORT_DATA
    ]
  },
  settings: {
    label: 'Configuration',
    icon: Settings,
    permissions: [
      FeaturePermission.MANAGE_SETTINGS,
      FeaturePermission.MANAGE_INTEGRATIONS,
      FeaturePermission.CUSTOM_BRANDING
    ]
  },
  integrations: {
    label: 'API et intégrations',
    icon: Zap,
    permissions: [
      FeaturePermission.API_ACCESS,
      FeaturePermission.WEBHOOK_ACCESS,
      FeaturePermission.THIRD_PARTY_INTEGRATIONS
    ]
  }
};

export function PermissionsList({
  permissions,
  title = "Permissions",
  description,
  groupByCategory = true,
  showLabels = true
}: PermissionsListProps) {
  
  if (groupByCategory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(permissionCategories).map(([key, category]) => {
            const categoryPermissions = permissions.filter(p => 
              category.permissions.includes(p)
            );
            
            if (categoryPermissions.length === 0) return null;
            
            const Icon = category.icon;
            
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">{category.label}</h4>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {categoryPermissions.map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {showLabels 
                        ? permissionService.getPermissionLabel(permission)
                        : permission
                      }
                    </Badge>
                  ))}
                </div>
                <Separator className="ml-6" />
              </div>
            );
          })}
          
          {permissions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune permission
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <Badge key={permission} variant="secondary" className="text-xs">
              {showLabels 
                ? permissionService.getPermissionLabel(permission)
                : permission
              }
            </Badge>
          ))}
          {permissions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune permission
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface RolePermissionsComparisonProps {
  roles: TenantRole[];
  title?: string;
}

export function RolePermissionsComparison({ 
  roles, 
  title = "Comparaison des rôles" 
}: RolePermissionsComparisonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Comparaison des permissions par rôle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {roles.map((role) => (
          <RolePermissionsSection key={role} role={role} />
        ))}
      </CardContent>
    </Card>
  );
}

interface RolePermissionsSectionProps {
  role: TenantRole;
}

function RolePermissionsSection({ role }: RolePermissionsSectionProps) {
  const { permissions, loading, error } = useRolePermissions(role);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-destructive">
          {permissionService.getRoleLabel(role)} - Erreur
        </h4>
        <p className="text-xs text-muted-foreground">
          Impossible de charger les permissions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">
        {permissionService.getRoleLabel(role)} ({permissions.length} permissions)
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {permissions.map((permission) => (
          <Badge 
            key={permission} 
            variant="outline" 
            className="text-xs"
          >
            {permissionService.getPermissionLabel(permission)}
          </Badge>
        ))}
        {permissions.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Aucune permission spécifique
          </span>
        )}
      </div>
      <Separator />
    </div>
  );
}