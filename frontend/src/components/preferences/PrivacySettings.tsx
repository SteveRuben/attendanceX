import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Lock, 
  Eye, 
  Trash2, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { integrationService } from '@/services/integrationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrivacySettings {
  dataRetentionDays: number;
  allowDataSharing: boolean;
  allowAnalytics: boolean;
  encryptionLevel: 'standard' | 'enhanced';
  auditLogRetentionDays: number;
  notifyOnDataAccess: boolean;
}

interface SecurityReport {
  integrations: number;
  lastActivity: Date | null;
  securityEvents: number;
  dataRetentionDays: number;
  encryptionStatus: string;
  recommendations: string[];
}

export const PrivacySettings: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSecurityReport();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await integrationService.getPrivacySettings();
      setSettings(data);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityReport = async () => {
    try {
      const report = await integrationService.getSecurityReport();
      setSecurityReport(report);
    } catch (error) {
      console.error('Erreur lors du chargement du rapport:', error);
    }
  };

  const saveSettings = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return;

    setSaving(true);
    try {
      const newSettings = { ...settings, ...updates };
      await integrationService.updatePrivacySettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAllData = async () => {
    try {
      await integrationService.deleteAllIntegrationData();
      setShowDeleteConfirm(false);
      await loadSettings();
      await loadSecurityReport();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const exportData = async () => {
    try {
      const data = await integrationService.exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integration-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Confidentialité et sécurité</h2>
      </div>

      <Tabs defaultValue="privacy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="data">Données</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Paramètres de confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Partage de données</Label>
                  <p className="text-sm text-gray-600">
                    Autoriser le partage anonymisé des données d'utilisation
                  </p>
                </div>
                <Switch
                  checked={settings.allowDataSharing}
                  onCheckedChange={(checked) => saveSettings({ allowDataSharing: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Analyses d'utilisation</Label>
                  <p className="text-sm text-gray-600">
                    Permettre la collecte de données analytiques pour améliorer le service
                  </p>
                </div>
                <Switch
                  checked={settings.allowAnalytics}
                  onCheckedChange={(checked) => saveSettings({ allowAnalytics: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Notifications d'accès</Label>
                  <p className="text-sm text-gray-600">
                    Recevoir des notifications lors de l'accès à vos données
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnDataAccess}
                  onCheckedChange={(checked) => saveSettings({ notifyOnDataAccess: checked })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Rétention des données</Label>
                <p className="text-sm text-gray-600">
                  Durée de conservation des données de synchronisation: {settings.dataRetentionDays} jours
                </p>
                <Slider
                  value={[settings.dataRetentionDays]}
                  onValueChange={([value]) => saveSettings({ dataRetentionDays: value })}
                  min={30}
                  max={730}
                  step={30}
                  className="w-full"
                  disabled={saving}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>30 jours</span>
                  <span>2 ans</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Rétention des logs d'audit</Label>
                <p className="text-sm text-gray-600">
                  Durée de conservation des journaux de sécurité: {settings.auditLogRetentionDays} jours
                </p>
                <Slider
                  value={[settings.auditLogRetentionDays]}
                  onValueChange={([value]) => saveSettings({ auditLogRetentionDays: value })}
                  min={30}
                  max={365}
                  step={30}
                  className="w-full"
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Paramètres de sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Niveau de chiffrement</Label>
                <Select
                  value={settings.encryptionLevel}
                  onValueChange={(value: 'standard' | 'enhanced') => 
                    saveSettings({ encryptionLevel: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Standard</Badge>
                        <span>Chiffrement AES-256 standard</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="enhanced">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">Renforcé</Badge>
                        <span>Chiffrement renforcé avec clés rotatives</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">
                  Le chiffrement renforcé offre une sécurité supplémentaire mais peut légèrement 
                  ralentir les opérations.
                </p>
              </div>

              {securityReport && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Rapport de sécurité
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Intégrations actives:</span>
                      <span className="ml-2 font-medium">{securityReport.integrations}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Événements de sécurité:</span>
                      <span className="ml-2 font-medium">{securityReport.securityEvents}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Dernière activité:</span>
                      <span className="ml-2 font-medium">
                        {securityReport.lastActivity 
                          ? new Date(securityReport.lastActivity).toLocaleDateString()
                          : 'Aucune'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Statut chiffrement:</span>
                      <Badge className="ml-2" variant={
                        securityReport.encryptionStatus === 'enhanced' ? 'default' : 'secondary'
                      }>
                        {securityReport.encryptionStatus === 'enhanced' ? 'Renforcé' : 'Standard'}
                      </Badge>
                    </div>
                  </div>

                  {securityReport.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium text-orange-800 mb-2">Recommandations:</h5>
                      <ul className="space-y-1">
                        {securityReport.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-orange-700">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gestion des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={exportData}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter mes données
                </Button>

                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Supprimer toutes les données
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmer la suppression</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Cette action supprimera définitivement toutes vos données d'intégration,
                          y compris les connexions, l'historique de synchronisation et les paramètres.
                          Cette action est irréversible.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Annuler
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={deleteAllData}
                        >
                          Supprimer définitivement
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Informations sur vos données</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Les données de synchronisation sont chiffrées avec votre clé personnelle</li>
                  <li>• Les tokens d'accès sont stockés de manière sécurisée et chiffrée</li>
                  <li>• L'historique de synchronisation est automatiquement nettoyé selon vos paramètres</li>
                  <li>• Vous pouvez exporter ou supprimer vos données à tout moment</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};