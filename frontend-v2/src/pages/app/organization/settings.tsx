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
  // Redirection immédiate vers la version simple qui fonctionne
  React.useEffect(() => {
    window.location.href = '/app/organization/settings-simple';
  }, []);

  return (
    <AppShell title="Paramètres de l'Organisation">
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Redirection vers les paramètres...</p>
        </div>
      </div>
    </AppShell>
  );
}