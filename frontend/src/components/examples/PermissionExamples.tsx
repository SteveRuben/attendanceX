/**
 * Exemples d'utilisation du système de permissions
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Lock, 
  CheckCircle, 
  XCircle,
  Info
} from 'lucide-react';

import { PermissionGuard, ConditionalRender } from '../permissions/PermissionGuard';
import { RoleBadge } from '../permissions/RoleSelector';
import { usePermissions } from '../../hooks/usePermissions';
import { FeaturePermission, TenantRole } from '../../types/permission.types';

export function PermissionExamples() {
  const { userContext, hasPermission, hasMinimumRole } = usePermissions();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Exemples d'Utilisation des Permissions</h2>
        <p className="text-muted-foreground">
          Démonstration des différents composants et hooks de permissions
        </p>
      </div>

      {/* Contexte utilisateur actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Contexte Utilisateur Actuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userContext ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rôle :</span>
                <RoleBadge role={userContext.tenantRole} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Permissions :</span>
                <Badge variant="secondary">
                  {userContext.effectivePermissions.length} permissions
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                ID Utilisateur : {userContext.userId}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Chargement du contexte utilisateur...</p>
          )}
        </CardContent>
      </Card>

      {/* Exemples de PermissionGuard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PermissionGuard - Permission Spécifique</CardTitle>
            <CardDescription>
              Affichage conditionnel basé sur une permission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionGuard permission={FeaturePermission.MANAGE_USERS}>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Vous avez la permission MANAGE_USERS
                </AlertDescription>
              </Alert>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Gérer les Utilisateurs
              </Button>
            </PermissionGuard>

            <PermissionGuard 
              permission={FeaturePermission.API_ACCESS}
              fallback={
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    ❌ Permission API_ACCESS requise
                  </AlertDescription>
                </Alert>
              }
            >
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Vous avez accès à l'API
                </AlertDescription>
              </Alert>
            </PermissionGuard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PermissionGuard - Rôle Minimum</CardTitle>
            <CardDescription>
              Affichage conditionnel basé sur un rôle minimum
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PermissionGuard role={TenantRole.ADMIN}>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Vous êtes au moins Administrateur
                </AlertDescription>
              </Alert>
              <Button variant="destructive" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Action Administrateur
              </Button>
            </PermissionGuard>

            <PermissionGuard 
              role={TenantRole.OWNER}
              fallback={
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    ❌ Rôle Propriétaire requis
                  </AlertDescription>
                </Alert>
              }
            >
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ✅ Vous êtes Propriétaire
                </AlertDescription>
              </Alert>
            </PermissionGuard>
          </CardContent>
        </Card>
      </div>

      {/* Exemples de ConditionalRender */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            ConditionalRender - Rendu Léger
          </CardTitle>
          <CardDescription>
            Rendu conditionnel sans gestion d'erreur (plus performant)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Gestion Utilisateurs</h4>
              <ConditionalRender permission={FeaturePermission.MANAGE_USERS}>
                <Button size="sm" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </ConditionalRender>
              <ConditionalRender 
                permission={FeaturePermission.MANAGE_USERS}
                fallback={<Badge variant="secondary">Non autorisé</Badge>}
              >
                <Badge variant="default">Autorisé</Badge>
              </ConditionalRender>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Analytics Avancées</h4>
              <ConditionalRender permission={FeaturePermission.VIEW_ADVANCED_ANALYTICS}>
                <Button size="sm" variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </ConditionalRender>
              <ConditionalRender 
                permission={FeaturePermission.VIEW_ADVANCED_ANALYTICS}
                fallback={<Badge variant="secondary">Non autorisé</Badge>}
              >
                <Badge variant="default">Autorisé</Badge>
              </ConditionalRender>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Paramètres</h4>
              <ConditionalRender permission={FeaturePermission.MANAGE_SETTINGS}>
                <Button size="sm" variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Button>
              </ConditionalRender>
              <ConditionalRender 
                permission={FeaturePermission.MANAGE_SETTINGS}
                fallback={<Badge variant="secondary">Non autorisé</Badge>}
              >
                <Badge variant="default">Autorisé</Badge>
              </ConditionalRender>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exemples d'utilisation des hooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Utilisation des Hooks
          </CardTitle>
          <CardDescription>
            Exemples d'utilisation directe des hooks de permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Vérifications de Permissions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>MANAGE_USERS</span>
                  <Badge variant={hasPermission(FeaturePermission.MANAGE_USERS) ? "default" : "secondary"}>
                    {hasPermission(FeaturePermission.MANAGE_USERS) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>VIEW_ADVANCED_ANALYTICS</span>
                  <Badge variant={hasPermission(FeaturePermission.VIEW_ADVANCED_ANALYTICS) ? "default" : "secondary"}>
                    {hasPermission(FeaturePermission.VIEW_ADVANCED_ANALYTICS) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>API_ACCESS</span>
                  <Badge variant={hasPermission(FeaturePermission.API_ACCESS) ? "default" : "secondary"}>
                    {hasPermission(FeaturePermission.API_ACCESS) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>MANAGE_SETTINGS</span>
                  <Badge variant={hasPermission(FeaturePermission.MANAGE_SETTINGS) ? "default" : "secondary"}>
                    {hasPermission(FeaturePermission.MANAGE_SETTINGS) ? "✓" : "✗"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Vérifications de Rôles</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Au moins VIEWER</span>
                  <Badge variant={hasMinimumRole(TenantRole.VIEWER) ? "default" : "secondary"}>
                    {hasMinimumRole(TenantRole.VIEWER) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Au moins MEMBER</span>
                  <Badge variant={hasMinimumRole(TenantRole.MEMBER) ? "default" : "secondary"}>
                    {hasMinimumRole(TenantRole.MEMBER) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Au moins ADMIN</span>
                  <Badge variant={hasMinimumRole(TenantRole.ADMIN) ? "default" : "secondary"}>
                    {hasMinimumRole(TenantRole.ADMIN) ? "✓" : "✗"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Au moins OWNER</span>
                  <Badge variant={hasMinimumRole(TenantRole.OWNER) ? "default" : "secondary"}>
                    {hasMinimumRole(TenantRole.OWNER) ? "✓" : "✗"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code d'exemple */}
      <Card>
        <CardHeader>
          <CardTitle>Exemples de Code</CardTitle>
          <CardDescription>
            Comment utiliser les composants et hooks de permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">PermissionGuard avec permission :</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<PermissionGuard permission={FeaturePermission.MANAGE_USERS}>
  <Button>Gérer les utilisateurs</Button>
</PermissionGuard>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">PermissionGuard avec rôle minimum :</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<PermissionGuard role={TenantRole.ADMIN}>
  <AdminPanel />
</PermissionGuard>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Utilisation des hooks :</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`const { hasPermission, hasMinimumRole } = usePermissions();

if (hasPermission(FeaturePermission.MANAGE_USERS)) {
  // Afficher l'interface de gestion
}

if (hasMinimumRole(TenantRole.ADMIN)) {
  // Afficher les fonctionnalités admin
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}