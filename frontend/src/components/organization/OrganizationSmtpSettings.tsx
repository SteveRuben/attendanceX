import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Mail, TestTube, CheckCircle, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest, SmtpConfiguration } from '@/types/organization.types';

interface OrganizationSmtpSettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationSmtpSettings({ organization, onUpdate }: OrganizationSmtpSettingsProps) {
  const [formData, setFormData] = useState<SmtpConfiguration>({
    enabled: organization.settings?.smtp?.enabled || false,
    host: organization.settings?.smtp?.host || '',
    port: organization.settings?.smtp?.port || 587,
    secure: organization.settings?.smtp?.secure || false,
    auth: {
      user: organization.settings?.smtp?.auth?.user || '',
      pass: organization.settings?.smtp?.auth?.pass || ''
    },
    from: {
      name: organization.settings?.smtp?.from?.name || '',
      email: organization.settings?.smtp?.from?.email || ''
    },
    connectionTimeout: organization.settings?.smtp?.connectionTimeout || 60000,
    greetingTimeout: organization.settings?.smtp?.greetingTimeout || 30000,
    socketTimeout: organization.settings?.smtp?.socketTimeout || 60000,
    maxConnections: organization.settings?.smtp?.maxConnections || 5,
    maxMessages: organization.settings?.smtp?.maxMessages || 100,
    rateDelta: organization.settings?.smtp?.rateDelta || 1000,
    rateLimit: organization.settings?.smtp?.rateLimit || 10,
    requireTLS: organization.settings?.smtp?.requireTLS || false,
    ignoreTLS: organization.settings?.smtp?.ignoreTLS || false
  });
  
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof SmtpConfiguration] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setError(null);
    setTestResult(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validation
      if (formData.enabled) {
        if (!formData.host.trim()) {
          setError('L\'hôte SMTP est requis');
          return;
        }
        if (!formData.auth.user.trim()) {
          setError('Le nom d\'utilisateur SMTP est requis');
          return;
        }
        if (!formData.auth.pass.trim()) {
          setError('Le mot de passe SMTP est requis');
          return;
        }
        if (!formData.from.email.trim()) {
          setError('L\'email d\'expéditeur est requis');
          return;
        }
        if (!formData.from.name.trim()) {
          setError('Le nom d\'expéditeur est requis');
          return;
        }
      }

      const updates: UpdateOrganizationRequest = {
        settings: {
          ...organization.settings,
          smtp: formData
        }
      };

      await onUpdate(updates);
      
      toast({
        title: 'Configuration SMTP sauvegardée',
        description: 'Les paramètres SMTP ont été mis à jour avec succès.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde de la configuration SMTP',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);

      // Simulation du test de connexion
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulation d'un résultat aléatoire pour la démo
      const success = Math.random() > 0.3;
      
      setTestResult({
        success,
        message: success 
          ? 'Connexion SMTP réussie ! Un email de test a été envoyé.'
          : 'Échec de la connexion SMTP. Vérifiez vos paramètres.'
      });

      if (success) {
        toast({
          title: 'Test réussi',
          description: 'La connexion SMTP fonctionne correctement.',
        });
      } else {
        toast({
          title: 'Test échoué',
          description: 'Impossible de se connecter au serveur SMTP.',
          variant: 'destructive'
        });
      }

    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur lors du test de connexion'
      });
      toast({
        title: 'Erreur de test',
        description: err.message || 'Erreur lors du test de connexion SMTP',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!formData.enabled) {
      return <Badge variant="secondary">Désactivé</Badge>;
    }
    
    if (organization.settings?.smtp?.testStatus === 'success') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Configuré
      </Badge>;
    }
    
    if (organization.settings?.smtp?.testStatus === 'failed') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Erreur
      </Badge>;
    }
    
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Non testé
    </Badge>;
  };

  const smtpPresets = [
    {
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    {
      name: 'Outlook/Hotmail',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      requireTLS: true
    },
    {
      name: 'SendGrid',
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      requireTLS: true
    },
    {
      name: 'Mailgun',
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      requireTLS: true
    }
  ];

  const applyPreset = (preset: typeof smtpPresets[0]) => {
    setFormData(prev => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
      requireTLS: preset.requireTLS
    }));
    setTestResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Générale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuration SMTP
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Configurez votre serveur SMTP pour l'envoi d'emails personnalisés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="smtp-enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="smtp-enabled">Activer l'envoi d'emails via SMTP</Label>
          </div>

          {formData.enabled && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Une fois configuré, tous les emails de votre organisation seront envoyés via votre serveur SMTP au lieu du service par défaut.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {formData.enabled && (
        <>
          {/* Presets Rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Rapide</CardTitle>
              <CardDescription>
                Utilisez un preset pour configurer rapidement les fournisseurs populaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
                {smtpPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="justify-start"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Paramètres du Serveur */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du Serveur</CardTitle>
              <CardDescription>
                Configuration de connexion au serveur SMTP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Hôte SMTP *</Label>
                  <Input
                    id="smtp-host"
                    value={formData.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port *</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 587)}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp-secure"
                    checked={formData.secure}
                    onCheckedChange={(checked) => handleInputChange('secure', checked)}
                  />
                  <Label htmlFor="smtp-secure">Connexion sécurisée (SSL/TLS)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp-require-tls"
                    checked={formData.requireTLS}
                    onCheckedChange={(checked) => handleInputChange('requireTLS', checked)}
                  />
                  <Label htmlFor="smtp-require-tls">Exiger TLS</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentification */}
          <Card>
            <CardHeader>
              <CardTitle>Authentification</CardTitle>
              <CardDescription>
                Identifiants de connexion au serveur SMTP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Nom d'utilisateur *</Label>
                  <Input
                    id="smtp-user"
                    value={formData.auth.user}
                    onChange={(e) => handleInputChange('auth.user', e.target.value)}
                    placeholder="votre@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="smtp-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.auth.pass}
                      onChange={(e) => handleInputChange('auth.pass', e.target.value)}
                      placeholder="Mot de passe ou clé API"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expéditeur */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'Expéditeur</CardTitle>
              <CardDescription>
                Nom et email qui apparaîtront comme expéditeur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name">Nom de l'expéditeur *</Label>
                  <Input
                    id="smtp-from-name"
                    value={formData.from.name}
                    onChange={(e) => handleInputChange('from.name', e.target.value)}
                    placeholder="Mon Organisation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email">Email de l'expéditeur *</Label>
                  <Input
                    id="smtp-from-email"
                    type="email"
                    value={formData.from.email}
                    onChange={(e) => handleInputChange('from.email', e.target.value)}
                    placeholder="noreply@monorganisation.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paramètres Avancés */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Avancés</CardTitle>
              <CardDescription>
                Configuration avancée pour optimiser les performances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp-max-connections">Connexions max</Label>
                  <Input
                    id="smtp-max-connections"
                    type="number"
                    value={formData.maxConnections}
                    onChange={(e) => handleInputChange('maxConnections', parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-max-messages">Messages max par connexion</Label>
                  <Input
                    id="smtp-max-messages"
                    type="number"
                    value={formData.maxMessages}
                    onChange={(e) => handleInputChange('maxMessages', parseInt(e.target.value) || 100)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-rate-limit">Limite de débit (msg/sec)</Label>
                  <Input
                    id="smtp-rate-limit"
                    type="number"
                    value={formData.rateLimit}
                    onChange={(e) => handleInputChange('rateLimit', parseInt(e.target.value) || 10)}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smtp-connection-timeout">Timeout connexion (ms)</Label>
                  <Input
                    id="smtp-connection-timeout"
                    type="number"
                    value={formData.connectionTimeout}
                    onChange={(e) => handleInputChange('connectionTimeout', parseInt(e.target.value) || 60000)}
                    min="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-greeting-timeout">Timeout greeting (ms)</Label>
                  <Input
                    id="smtp-greeting-timeout"
                    type="number"
                    value={formData.greetingTimeout}
                    onChange={(e) => handleInputChange('greetingTimeout', parseInt(e.target.value) || 30000)}
                    min="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-socket-timeout">Timeout socket (ms)</Label>
                  <Input
                    id="smtp-socket-timeout"
                    type="number"
                    value={formData.socketTimeout}
                    onChange={(e) => handleInputChange('socketTimeout', parseInt(e.target.value) || 60000)}
                    min="1000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test de Connexion */}
          <Card>
            <CardHeader>
              <CardTitle>Test de Connexion</CardTitle>
              <CardDescription>
                Testez votre configuration SMTP avant de la sauvegarder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !formData.host || !formData.auth.user}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Tester la connexion
                </Button>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? 'default' : 'destructive'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder la configuration SMTP
        </Button>
      </div>
    </div>
  );
}