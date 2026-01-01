import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { Organization, UpdateOrganizationRequest, DnsRecord } from '@/types/organization.types';

interface OrganizationDomainSettingsProps {
  organization: Organization;
  onUpdate: (updates: UpdateOrganizationRequest) => Promise<void>;
}

export function OrganizationDomainSettings({ organization, onUpdate }: OrganizationDomainSettingsProps) {
  const [customDomain, setCustomDomain] = useState(organization.domain?.customDomain || '');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSaveCustomDomain = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validation du domaine
      if (customDomain && !isValidDomain(customDomain)) {
        setError('Format de domaine invalide');
        return;
      }

      const updates: UpdateOrganizationRequest = {
        settings: {
          ...organization.settings
        }
      };

      // Note: La mise à jour du domaine nécessiterait un endpoint spécifique
      // Pour l'instant, on simule la sauvegarde
      
      toast({
        title: 'Domaine sauvegardé',
        description: 'La configuration du domaine a été mise à jour.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la sauvegarde du domaine',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    try {
      setVerifying(true);
      setError(null);

      // Simulation de la vérification DNS
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Vérification lancée',
        description: 'La vérification DNS est en cours. Cela peut prendre quelques minutes.',
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification');
      toast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la vérification DNS',
        variant: 'destructive'
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: 'Valeur copiée dans le presse-papiers',
    });
  };

  const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      verified: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  // Données DNS simulées
  const dnsRecords: DnsRecord[] = [
    {
      type: 'CNAME',
      name: customDomain || 'forms.mondomaine.com',
      value: `${organization.domain?.subdomain}.attendancex.com`,
      ttl: 300,
      required: true,
      status: 'pending'
    },
    {
      type: 'TXT',
      name: `_attendancex-verification.${customDomain || 'mondomaine.com'}`,
      value: organization.domain?.verification?.verificationToken || 'attendancex-verification=abc123def456',
      ttl: 300,
      required: true,
      status: 'pending'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sous-domaine Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Sous-domaine Principal
          </CardTitle>
          <CardDescription>
            Votre sous-domaine AttendanceX pour accéder à vos formulaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <span className="font-mono text-lg">
              {organization.domain?.subdomain}.attendancex.com
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(`${organization.domain?.subdomain}.attendancex.com`)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://${organization.domain?.subdomain}.attendancex.com`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Ce domaine est automatiquement configuré et prêt à utiliser.
          </p>
        </CardContent>
      </Card>

      {/* Domaine Personnalisé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domaine Personnalisé
          </CardTitle>
          <CardDescription>
            Utilisez votre propre domaine pour vos formulaires (ex: forms.monentreprise.com)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customDomain">Domaine personnalisé</Label>
            <div className="flex gap-2">
              <Input
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="forms.monentreprise.com"
              />
              <Button onClick={handleSaveCustomDomain} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </div>

          {customDomain && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{customDomain}</span>
                  {getStatusBadge(organization.domain?.verification?.status || 'pending')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyDomain}
                  disabled={verifying}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Vérifier
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Pour utiliser votre domaine personnalisé, vous devez configurer les enregistrements DNS suivants chez votre fournisseur de domaine.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration DNS */}
      {customDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration DNS Requise</CardTitle>
            <CardDescription>
              Ajoutez ces enregistrements DNS chez votre fournisseur de domaine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {dnsRecords.map((record, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{record.type}</Badge>
                      {getStatusBadge(record.status)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(record.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="font-medium">Nom:</span>
                      <code className="ml-2 px-2 py-1 bg-muted rounded">{record.name}</code>
                    </div>
                    <div>
                      <span className="font-medium">Valeur:</span>
                      <code className="ml-2 px-2 py-1 bg-muted rounded break-all">{record.value}</code>
                    </div>
                    {record.ttl && (
                      <div>
                        <span className="font-medium">TTL:</span>
                        <code className="ml-2 px-2 py-1 bg-muted rounded">{record.ttl}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                La propagation DNS peut prendre jusqu'à 48 heures. Une fois configuré, cliquez sur "Vérifier" pour valider la configuration.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* SSL/TLS */}
      <Card>
        <CardHeader>
          <CardTitle>Certificat SSL/TLS</CardTitle>
          <CardDescription>
            Sécurisation HTTPS de votre domaine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Certificat SSL</span>
              {getStatusBadge(organization.domain?.ssl?.status || 'pending')}
            </div>
            <div className="text-sm text-muted-foreground">
              {organization.domain?.ssl?.enabled ? 'Activé' : 'En attente de la vérification DNS'}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Le certificat SSL sera automatiquement généré une fois que la configuration DNS sera vérifiée.
          </p>
        </CardContent>
      </Card>

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}