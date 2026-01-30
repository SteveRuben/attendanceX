import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, MessageSquare, TestTube, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest, SmsConfiguration } from '@/types/organization.types';

interface OrganizationSmsSettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationSmsSettings({ organization, onUpdate }: OrganizationSmsSettingsProps) {
  const [formData, setFormData] = useState<SmsConfiguration>({
    enabled: organization.settings?.notifications?.smsProvider?.enabled || false,
    provider: organization.settings?.notifications?.smsProvider?.provider || 'twilio',
    credentials: organization.settings?.notifications?.smsProvider?.credentials || {},
    defaultFrom: organization.settings?.notifications?.smsProvider?.defaultFrom || '',
    dailyLimit: organization.settings?.notifications?.smsProvider?.dailyLimit || 100,
    monthlyLimit: organization.settings?.notifications?.smsProvider?.monthlyLimit || 1000
  });
  
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('credentials.')) {
      const credField = field.replace('credentials.', '');
      setFormData(prev => ({
        ...prev,
        credentials: { ...prev.credentials, [credField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const updates: UpdateOrganizationRequest = {
        settings: {
          ...organization.settings,
          notifications: {
            ...organization.settings?.notifications,
            smsProvider: formData
          }
        }
      };

      await onUpdate(updates);
      
      toast({
        title: 'Configuration SMS sauvegardée',
        description: 'Les paramètres SMS ont été mis à jour avec succès.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde de la configuration SMS',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderProviderFields = () => {
    switch (formData.provider) {
      case 'twilio':
        return (
          <>
            <div className="space-y-2">
              <Label>Account SID</Label>
              <Input
                value={formData.credentials.accountSid || ''}
                onChange={(e) => handleInputChange('credentials.accountSid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Auth Token</Label>
              <Input
                type={showCredentials ? 'text' : 'password'}
                value={formData.credentials.authToken || ''}
                onChange={(e) => handleInputChange('credentials.authToken', e.target.value)}
                placeholder="Votre Auth Token Twilio"
              />
            </div>
            <div className="space-y-2">
              <Label>Numéro d'expéditeur</Label>
              <Input
                value={formData.credentials.fromNumber || ''}
                onChange={(e) => handleInputChange('credentials.fromNumber', e.target.value)}
                placeholder="+33123456789"
              />
            </div>
          </>
        );
      case 'aws-sns':
        return (
          <>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input
                value={formData.credentials.accessKeyId || ''}
                onChange={(e) => handleInputChange('credentials.accessKeyId', e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <Input
                type={showCredentials ? 'text' : 'password'}
                value={formData.credentials.secretAccessKey || ''}
                onChange={(e) => handleInputChange('credentials.secretAccessKey', e.target.value)}
                placeholder="Votre clé secrète AWS"
              />
            </div>
            <div className="space-y-2">
              <Label>Région</Label>
              <Select
                value={formData.credentials.region || 'eu-west-1'}
                onValueChange={(value) => handleInputChange('credentials.region', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Configuration SMS
          </CardTitle>
          <CardDescription>
            Configurez l'envoi de SMS pour les notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label>Activer l'envoi de SMS</Label>
          </div>

          {formData.enabled && (
            <>
              <div className="space-y-2">
                <Label>Fournisseur SMS</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value) => handleInputChange('provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twilio">Twilio</SelectItem>
                    <SelectItem value="aws-sns">AWS SNS</SelectItem>
                    <SelectItem value="nexmo">Nexmo/Vonage</SelectItem>
                    <SelectItem value="custom">Webhook personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderProviderFields()}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                >
                  {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showCredentials ? 'Masquer' : 'Afficher'} les identifiants
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Limite quotidienne</Label>
                  <Input
                    type="number"
                    value={formData.dailyLimit}
                    onChange={(e) => handleInputChange('dailyLimit', parseInt(e.target.value) || 100)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite mensuelle</Label>
                  <Input
                    type="number"
                    value={formData.monthlyLimit}
                    onChange={(e) => handleInputChange('monthlyLimit', parseInt(e.target.value) || 1000)}
                    min="1"
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setTesting(true)}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Tester la configuration
              </Button>
            </>
          )}
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
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}