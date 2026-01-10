/**
 * Page de gestion des permissions
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  Shield, 
  Users, 
  Eye, 
  Settings, 
  Crown, 
  Info,
  UserCheck,
  BarChart3
} from 'lucide-react';

import { PermissionGuard } from '../../../components/permissions/PermissionGuard';
import { RoleSelector, RoleBadge } from '../../../components/permissions/RoleSelector';
import { PermissionsList, RolePermissionsComparison } from '../../../components/permissions/PermissionsList';
import { usePermissions, usePlanFeatures } from '../../../hooks/usePermissions';
import { TenantRole, FeaturePermission } from '../../../types/permission.types';

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<TenantRole>(TenantRole.MEMBER);
  const { userContext, loading, error, hasPermission, hasMinimumRole } = usePermissions();
  const { features, loading: planLoading } = usePlanFeatures('pro'); // Exemple avec plan pro

  if (loading) {
    return (
      <AppShell title="Permissions">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Permissions">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Gestion des Permissions
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez les rôles et permissions des utilisateurs de votre organisation
                </p>
              </div>
              <Link href="/app/permissions/examples">
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4 mr-2" />
                  Voir les Exemples
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Rôles
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Plan & Limites
              </TabsTrigger>
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Contexte utilisateur actuel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserCheck className="h-5 w-5" />
                      Votre Profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {userContext ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Rôle :</span>
                          <RoleBadge role={userContext.tenantRole} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Permissions :</span>
                          <Badge variant="secondary" className="text-xs">
                            {userContext.effectivePermissions.length}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chargement du profil...
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Statistiques rapides */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5" />
                      Accès Rapide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Gérer les utilisateurs</span>
                        <Badge variant={hasPermission(FeaturePermission.MANAGE_USERS) ? "default" : "secondary"}>
                          {hasPermission(FeaturePermission.MANAGE_USERS) ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Analytics avancées</span>
                        <Badge variant={hasPermission(FeaturePermission.VIEW_ADVANCED_ANALYTICS) ? "default" : "secondary"}>
                          {hasPermission(FeaturePermission.VIEW_ADVANCED_ANALYTICS) ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Accès API</span>
                        <Badge variant={hasPermission(FeaturePermission.API_ACCESS) ? "default" : "secondary"}>
                          {hasPermission(FeaturePermission.API_ACCESS) ? "✓" : "✗"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informations du plan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Crown className="h-5 w-5" />
                      Plan Actuel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {planLoading ? (
                      <p className="text-sm text-muted-foreground">Chargement...</p>
                    ) : features ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Utilisateurs max</span>
                          <Badge variant="secondary">
                            {features.maxUsers === -1 ? "Illimité" : features.maxUsers}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Support prioritaire</span>
                          <Badge variant={features.prioritySupport ? "default" : "secondary"}>
                            {features.prioritySupport ? "✓" : "✗"}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Plan non disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Permissions actuelles */}
              {userContext && (
                <PermissionsList
                  permissions={userContext.effectivePermissions}
                  title="Vos Permissions Actuelles"
                  description="Liste des permissions dont vous disposez dans cette organisation"
                  groupByCategory={true}
                />
              )}
            </TabsContent>

            {/* Gestion des rôles */}
            <TabsContent value="roles" className="space-y-6">
              <PermissionGuard permission={FeaturePermission.MANAGE_USERS}>
                <Card>
                  <CardHeader>
                    <CardTitle>Explorateur de Rôles</CardTitle>
                    <CardDescription>
                      Sélectionnez un rôle pour voir ses permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RoleSelector
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      showPermissions={true}
                    />
                  </CardContent>
                </Card>

                <RolePermissionsComparison
                  roles={Object.values(TenantRole)}
                  title="Comparaison des Rôles"
                />
              </PermissionGuard>
            </TabsContent>

            {/* Gestion des permissions */}
            <TabsContent value="permissions" className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les permissions sont automatiquement attribuées selon le rôle de l'utilisateur. 
                  Contactez un administrateur pour modifier les permissions.
                </AlertDescription>
              </Alert>

              {userContext && (
                <PermissionsList
                  permissions={userContext.effectivePermissions}
                  title="Permissions Détaillées"
                  description="Vue détaillée de toutes vos permissions par catégorie"
                  groupByCategory={true}
                />
              )}
            </TabsContent>

            {/* Plan et limites */}
            <TabsContent value="plan" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fonctionnalités du Plan</CardTitle>
                    <CardDescription>
                      Fonctionnalités disponibles avec votre plan actuel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {planLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </div>
                    ) : features ? (
                      <div className="space-y-3">
                        {Object.entries(features).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="capitalize">
                              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </span>
                            <Badge variant={value ? "default" : "secondary"}>
                              {typeof value === 'boolean' 
                                ? (value ? "✓" : "✗")
                                : value === -1 
                                  ? "Illimité" 
                                  : value
                              }
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Impossible de charger les fonctionnalités du plan
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Limites du Plan</CardTitle>
                    <CardDescription>
                      Limites d'utilisation de votre plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userContext ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Utilisateurs maximum</span>
                          <Badge variant="secondary">
                            {userContext.planLimits.maxUsers === -1 ? "Illimité" : userContext.planLimits.maxUsers}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Événements maximum</span>
                          <Badge variant="secondary">
                            {userContext.planLimits.maxEvents === -1 ? "Illimité" : userContext.planLimits.maxEvents}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Stockage maximum</span>
                          <Badge variant="secondary">
                            {userContext.planLimits.maxStorage === -1 ? "Illimité" : `${userContext.planLimits.maxStorage} MB`}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Appels API / mois</span>
                          <Badge variant="secondary">
                            {userContext.planLimits.apiCallsPerMonth === -1 ? "Illimité" : userContext.planLimits.apiCallsPerMonth}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Chargement des limites...
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}