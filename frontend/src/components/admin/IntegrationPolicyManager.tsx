import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { IntegrationProvider, type UserIntegration } from '@attendance-x/shared';

// Type étendu pour inclure les informations utilisateur
interface UserIntegrationWithDetails extends UserIntegration {
  userEmail?: string;
  userName?: string;
}
import { integrationService, type IntegrationPolicy } from '@/services/integrationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IntegrationUsageStats {
  provider: IntegrationProvider;
  totalUsers: number;
  activeConnections: number;
  lastUsed: Date | null;
  dataVolume: number;
}

export const IntegrationPolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState<IntegrationPolicy[]>([]);
  const [usageStats, setUsageStats] = useState<IntegrationUsageStats[]>([]);
  const [userIntegrations, setUserIntegrations] = useState<UserIntegrationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('policies');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [policiesData, statsData, integrationsData] = await Promise.all([
        integrationService.getOrganizationPolicies(),
        integrationService.getIntegrationUsageStats(),
        integrationService.getAllUserIntegrations()
      ]);

      setPolicies(policiesData);
      setUsageStats(statsData);
      setUserIntegrations(integrationsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (provider: IntegrationProvider, updates: Partial<IntegrationPolicy>) => {
    try {
      await integrationService.updateIntegrationPolicy(provider, updates);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la politique:', error);
    }
  };

  const revokeUserIntegration = async (integrationId: string) => {
    try {
      await integrationService.revokeIntegration(integrationId);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la révocation:', error);
    }
  };

  const bulkRevokeProvider = async (provider: IntegrationProvider) => {
    try {
      await integrationService.bulkRevokeProvider(provider);
      await loadData();
    } catch (error) {
      console.error('Erreur lors de la révocation en masse:', error);
    }
  };

  const exportUsageReport = async () => {
    try {
      const report = await integrationService.generateUsageReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integration-usage-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  const getProviderIcon = (provider: IntegrationProvider) => {
    // Retourner l'icône appropriée selon le provider
    return <Settings className="h-4 w-4" />;
  };

  const getStatusBadge = (enabled: boolean) => {
    return enabled ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Autorisé
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Bloqué
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Politiques d'intégration
          </h2>
          <p className="text-gray-600">
            Gérez les intégrations autorisées et surveillez leur utilisation
          </p>
        </div>
        <Button onClick={exportUsageReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter le rapport
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="policies">Politiques</TabsTrigger>
          <TabsTrigger value="usage">Utilisation</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.provider}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getProviderIcon(policy.provider)}
                      <span className="capitalize">{policy.provider}</span>
                      {getStatusBadge(policy.enabled)}
                    </div>
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={(enabled) => updatePolicy(policy.provider, { enabled })}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Permissions requises</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {policy.requiredPermissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Rôles autorisés</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {policy.allowedRoles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {policy.restrictions && (
                    <div>
                      <Label>Restrictions</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {policy.restrictions}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configurer
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Configuration - {policy.provider}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Restrictions supplémentaires</Label>
                            <Textarea
                              value={policy.restrictions || ''}
                              onChange={(e) => updatePolicy(policy.provider, { restrictions: e.target.value })}
                              placeholder="Décrivez les restrictions spécifiques..."
                            />
                          </div>
                          <div>
                            <Label>Niveau de sécurité</Label>
                            <Select
                              value={policy.securityLevel || 'standard'}
                              onValueChange={(value) => updatePolicy(policy.provider, { securityLevel: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Faible</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="high">Élevé</SelectItem>
                                <SelectItem value="critical">Critique</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => bulkRevokeProvider(policy.provider)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Révoquer tout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usageStats.map((stat) => (
              <Card key={stat.provider}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getProviderIcon(stat.provider)}
                    <span className="capitalize">{stat.provider}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilisateurs totaux:</span>
                      <span className="font-medium">{stat.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Connexions actives:</span>
                      <span className="font-medium">{stat.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Volume de données:</span>
                      <span className="font-medium">{stat.dataVolume} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dernière utilisation:</span>
                      <span className="font-medium">
                        {stat.lastUsed ? new Date(stat.lastUsed).toLocaleDateString() : 'Jamais'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="space-y-2">
            {userIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(integration.provider)}
                      <div>
                        <p className="font-medium">{integration.userEmail || integration.userId}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          {integration.provider} - {integration.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                        {integration.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeUserIntegration(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};