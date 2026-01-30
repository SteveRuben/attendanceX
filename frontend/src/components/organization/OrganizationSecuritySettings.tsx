import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Shield, Globe, Zap, Lock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest } from '@/types/organization.types';

interface OrganizationSecuritySettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationSecuritySettings({ organization, onUpdate }: OrganizationSecuritySettingsProps) {
  const [formData, setFormData] = useState({
    requireSsl: organization.settings?.security?.requireSsl || true,
    allowedOrigins: organization.settings?.security?.allowedOrigins?.join('\n') || '',
    rateLimitingEnabled: organization.settings?.security?.rateLimiting?.enabled || true,
    requestsPerMinute: organization.settings?.security?.rateLimiting?.requestsPerMinute || 60,
    twoFactorEnabled: organization.settings?.security?.twoFactorAuth?.enabled || false,
    twoFactorRequired: organization.settings?.security?.twoFactorAuth?.required || false
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const allowedOrigins = formData.allowedOrigins
        .split('\n')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);

      const updates: UpdateOrganizationRequest = {
        settings: {
          ...organization.settings,
          security: {
            requireSsl: formData.requireSsl,
            allowedOrigins,
            rateLimiting: {
              enabled: formData.rateLimitingEnabled,
              requestsPerMinute: formData.requestsPerMinute
            },
            twoFactorAuth: {
              enabled: formData.twoFactorEnabled,
              required: formData.twoFactorRequired
            }
          }
        }
      };

      await onUpdate(updates);
      
      toast({
        title: 'Paramètres de sécurité sauvegardés',
        description: 'La configuration de sécurité a été mise à jour avec succès.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde des paramètres de sécurité',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sécurité SSL/TLS
          </CardTitle>
          <CardDescription>
            Configuration du chiffrement et de la sécurité des connexions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.requireSsl}
              onCheckedChange={(checked) => handleInputChange('requireSsl', checked)}
            />
            <Label>Exiger HTTPS pour tous les accès</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Recommandé : Force la redirection de HTTP vers HTTPS pour sécuriser toutes les communications.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Origines Autorisées (CORS)
          </CardTitle>
          <CardDescription>
            Contrôlez quels domaines peuvent accéder à vos formulaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Domaines autorisés (un par ligne)</Label>
            <textarea
              value={formData.allowedOrigins}
              onChange={(e) => handleInputChange('allowedOrigins', e.target.value)}
              placeholder="https://monsite.com
https://www.monsite.com
https://app.monsite.com"
              className="w-full h-24 p-3 text-sm border rounded-md resize-none"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Laissez vide pour autoriser tous les domaines. Ajoutez vos domaines pour restreindre l'accès.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Limitation de Débit
          </CardTitle>
          <CardDescription>
            Protection contre les abus et les attaques par déni de service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.rateLimitingEnabled}
              onCheckedChange={(checked) => handleInputChange('rateLimitingEnabled', checked)}
            />
            <Label>Activer la limitation de débit</Label>
          </div>
          
          {formData.rateLimitingEnabled && (
            <div className="space-y-2">
              <Label>Requêtes par minute par IP</Label>
              <Input
                type="number"
                value={formData.requestsPerMinute}
                onChange={(e) => handleInputChange('requestsPerMinute', parseInt(e.target.value) || 60)}
                min="1"
                max="1000"
              />
              <p className="text-sm text-muted-foreground">
                Nombre maximum de requêtes autorisées par adresse IP par minute.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentification à Deux Facteurs
          </CardTitle>
          <CardDescription>
            Sécurité renforcée pour les comptes utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.twoFactorEnabled}
              onCheckedChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
            />
            <Label>Permettre l'authentification à deux facteurs</Label>
          </div>
          
          {formData.twoFactorEnabled && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.twoFactorRequired}
                onCheckedChange={(checked) => handleInputChange('twoFactorRequired', checked)}
              />
              <Label>Exiger l'authentification à deux facteurs pour tous les utilisateurs</Label>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire en demandant un code de vérification en plus du mot de passe.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder les paramètres de sécurité
        </Button>
      </div>
    </div>
  );
}