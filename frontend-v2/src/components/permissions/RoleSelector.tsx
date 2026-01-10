/**
 * Composant de sélection de rôle avec permissions
 */

import React from 'react';
import { TenantRole } from '../../types/permission.types';
import { permissionService } from '../../services/permissionService';
import { useRolePermissions } from '../../hooks/usePermissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Shield, Users, Eye, Settings, Crown } from 'lucide-react';

interface RoleSelectorProps {
  value?: TenantRole;
  onValueChange: (role: TenantRole) => void;
  disabled?: boolean;
  placeholder?: string;
  showPermissions?: boolean;
  availableRoles?: TenantRole[];
}

const roleIcons = {
  [TenantRole.OWNER]: Crown,
  [TenantRole.ADMIN]: Shield,
  [TenantRole.MANAGER]: Settings,
  [TenantRole.MEMBER]: Users,
  [TenantRole.VIEWER]: Eye
};

const roleColors = {
  [TenantRole.OWNER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  [TenantRole.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  [TenantRole.MANAGER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [TenantRole.MEMBER]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [TenantRole.VIEWER]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
};

export function RoleSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Sélectionner un rôle",
  showPermissions = false,
  availableRoles = Object.values(TenantRole)
}: RoleSelectorProps) {
  
  return (
    <div className="space-y-4">
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => {
            const Icon = roleIcons[role];
            return (
              <SelectItem key={role} value={role}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{permissionService.getRoleLabel(role)}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {showPermissions && value && (
        <RolePermissionsDisplay role={value} />
      )}
    </div>
  );
}

interface RolePermissionsDisplayProps {
  role: TenantRole;
}

function RolePermissionsDisplay({ role }: RolePermissionsDisplayProps) {
  const { permissions, loading, error } = useRolePermissions(role);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">
            Erreur lors du chargement des permissions
          </p>
        </CardContent>
      </Card>
    );
  }

  const Icon = roleIcons[role];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5" />
          Permissions pour {permissionService.getRoleLabel(role)}
        </CardTitle>
        <CardDescription>
          Ce rôle dispose des permissions suivantes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {permissions.map((permission) => (
            <Badge
              key={permission}
              variant="secondary"
              className="text-xs"
            >
              {permissionService.getPermissionLabel(permission)}
            </Badge>
          ))}
          {permissions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune permission spécifique
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface RoleBadgeProps {
  role: TenantRole;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, showIcon = true, size = 'md' }: RoleBadgeProps) {
  const Icon = roleIcons[role];
  const colorClass = roleColors[role];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge className={`${colorClass} ${sizeClasses[size]} flex items-center gap-1.5`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {permissionService.getRoleLabel(role)}
    </Badge>
  );
}