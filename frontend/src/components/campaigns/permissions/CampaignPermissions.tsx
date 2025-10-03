import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  Shield,
  Users,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'campaign' | 'template' | 'automation' | 'analytics' | 'settings';
}

interface RolePermissions {
  role: 'admin' | 'manager' | 'user' | 'guest';
  displayName: string;
  permissions: string[];
  userCount: number;
}

interface CampaignPermissionsProps {
  organizationId: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: 'campaign:create',
    name: 'Créer des campagnes',
    description: 'Permet de créer de nouvelles campagnes email',
    category: 'campaign'
  },
  {
    id: 'campaign:edit',
    name: 'Modifier des campagnes',
    description: 'Permet de modifier les campagnes existantes',
    category: 'campaign'
  },
  {
    id: 'campaign:delete',
    name: 'Supprimer des campagnes',
    description: 'Permet de supprimer des campagnes',
    category: 'campaign'
  },
  {
    id: 'campaign:send',
    name: 'Envoyer des campagnes',
    description: 'Permet d\'envoyer des campagnes aux destinataires',
    category: 'campaign'
  },
  {
    id: 'campaign:approve',
    name: 'Approuver des campagnes',
    description: 'Permet d\'approuver les campagnes avant envoi',
    category: 'campaign'
  },
  {
    id: 'template:create',
    name: 'Créer des templates',
    description: 'Permet de créer de nouveaux templates',
    category: 'template'
  },
  {
    id: 'template:edit',
    name: 'Modifier des templates',
    description: 'Permet de modifier les templates existants',
    category: 'template'
  },
  {
    id: 'template:delete',
    name: 'Supprimer des templates',
    description: 'Permet de supprimer des templates',
    category: 'template'
  },
  {
    id: 'automation:create',
    name: 'Créer des automatisations',
    description: 'Permet de créer des workflows automatisés',
    category: 'automation'
  },
  {
    id: 'automation:edit',
    name: 'Modifier des automatisations',
    description: 'Permet de modifier les automatisations existantes',
    category: 'automation'
  },
  {
    id: 'automation:delete',
    name: 'Supprimer des automatisations',
    description: 'Permet de supprimer des automatisations',
    category: 'automation'
  },
  {
    id: 'analytics:view',
    name: 'Voir les analytics',
    description: 'Permet de consulter les statistiques des campagnes',
    category: 'analytics'
  },
  {
    id: 'analytics:export',
    name: 'Exporter les analytics',
    description: 'Permet d\'exporter les données analytiques',
    category: 'analytics'
  },
  {
    id: 'settings:manage',
    name: 'Gérer les paramètres',
    description: 'Permet de modifier les paramètres de l\'organisation',
    category: 'settings'
  }
];

export const CampaignPermissions: React.FC<CampaignPermissionsProps> = ({ organizationId }) => {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([
    {
      role: 'admin',
      displayName: 'Administrateur',
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
      userCount: 5
    },
    {
      role: 'manager',
      displayName: 'Manager',
      permissions: [
        'campaign:create',
        'campaign:edit',
        'campaign:send',
        'template:create',
        'template:edit',
        'automation:create',
        'automation:edit',
        'analytics:view',
        'analytics:export'
      ],
      userCount: 12
    },
    {
      role: 'user',
      displayName: 'Utilisateur',
      permissions: [
        'campaign:create',
        'template:create',
        'analytics:view'
      ],
      userCount: 45
    },
    {
      role: 'guest',
      displayName: 'Invité',
      permissions: [
        'analytics:view'
      ],
      userCount: 8
    }
  ]);

  const [selectedRole, setSelectedRole] = useState<RolePermissions>(rolePermissions[0]);

  const handleTogglePermission = (permissionId: string) => {
    setRolePermissions(rolePermissions.map(rp => {
      if (rp.role === selectedRole.role) {
        const hasPermission = rp.permissions.includes(permissionId);
        return {
          ...rp,
          permissions: hasPermission
            ? rp.permissions.filter(p => p !== permissionId)
            : [...rp.permissions, permissionId]
        };
      }
      return rp;
    }));

    setSelectedRole(prev => {
      const hasPermission = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: hasPermission
          ? prev.permissions.filter(p => p !== permissionId)
          : [...prev.permissions, permissionId]
      };
    });
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const getCategoryLabel = (category: string) => {
    const labels = {
      campaign: 'Campagnes',
      template: 'Templates',
      automation: 'Automatisations',
      analytics: 'Analytics',
      settings: 'Paramètres'
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestion des permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {rolePermissions.map(rp => (
              <button
                key={rp.role}
                onClick={() => setSelectedRole(rp)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedRole.role === rp.role
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="font-semibold text-gray-900">{rp.displayName}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {rp.userCount} utilisateur{rp.userCount > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {rp.permissions.length} permission{rp.permissions.length > 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Permissions pour {selectedRole.displayName}
            </h3>

            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    {getCategoryLabel(category)}
                  </h4>
                  <div className="space-y-2">
                    {permissions.map(permission => {
                      const hasPermission = selectedRole.permissions.includes(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </span>
                              {hasPermission ? (
                                <Badge variant="default" className="bg-green-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  Activé
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <X className="h-3 w-3 mr-1" />
                                  Désactivé
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{permission.description}</p>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => handleTogglePermission(permission.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedRole.permissions.length} permission(s) activée(s) sur {AVAILABLE_PERMISSIONS.length}
              </div>
              <Button>
                Sauvegarder les modifications
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé des permissions par rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Permission</th>
                  {rolePermissions.map(rp => (
                    <th key={rp.role} className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      {rp.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {AVAILABLE_PERMISSIONS.map(permission => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{permission.name}</td>
                    {rolePermissions.map(rp => (
                      <td key={rp.role} className="px-4 py-3 text-center">
                        {rp.permissions.includes(permission.id) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

