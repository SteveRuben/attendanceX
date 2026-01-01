import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, Globe, Palette, Mail, MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/useToast';

// Import des composants de configuration
import { OrganizationGeneralSettings } from '@/components/organization/OrganizationGeneralSettings';
import { OrganizationDomainSettings } from '@/components/organization/OrganizationDomainSettings';
import { OrganizationBrandingSettings } from '@/components/organization/OrganizationBrandingSettings';
import { OrganizationSmtpSettings } from '@/components/organization/OrganizationSmtpSettings';
import { OrganizationSmsSettings } from '@/components/organization/OrganizationSmsSettings';
import { OrganizationSecuritySettings } from '@/components/organization/OrganizationSecuritySettings';

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { organization, loading, error, updateOrganization } = useOrganization();
  const { toast } = useToast();

  if (loading) {
    return (
      <AppShell title="Paramètres de l'Organisation">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Paramètres de l'Organisation">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des paramètres de l'organisation: {error}
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  if (!organization) {
    return (
      <AppShell title="Paramètres de l'Organisation">
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aucune organisation trouvée. Veuillez créer une organisation d'abord.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status}
      </Badge>
    );
  };

  return (
    <AppShell title="Paramètres de l'Organisation">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Paramètres de l'Organisation
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez les paramètres, domaines, branding et configuration de votre organisation
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(organization.status)}
                <Badge variant="outline">
                  {organization.domain?.subdomain}.attendancex.com
                </Badge>
              </div>
            </div>
          </div>

          {/* Tabs de Configuration */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Général
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domaines
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                SMTP
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sécurité
              </TabsTrigger>
            </TabsList>

            {/* Onglet Paramètres Généraux */}
            <TabsContent value="general" className="space-y-6">
              <OrganizationGeneralSettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>

            {/* Onglet Configuration des Domaines */}
            <TabsContent value="domain" className="space-y-6">
              <OrganizationDomainSettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>

            {/* Onglet Branding */}
            <TabsContent value="branding" className="space-y-6">
              <OrganizationBrandingSettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>

            {/* Onglet Configuration SMTP */}
            <TabsContent value="smtp" className="space-y-6">
              <OrganizationSmtpSettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>

            {/* Onglet Configuration SMS */}
            <TabsContent value="sms" className="space-y-6">
              <OrganizationSmsSettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>

            {/* Onglet Sécurité */}
            <TabsContent value="security" className="space-y-6">
              <OrganizationSecuritySettings 
                organization={organization}
                onUpdate={updateOrganization}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}