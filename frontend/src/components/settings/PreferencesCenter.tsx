import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { UserPreferencesSettings } from './UserPreferencesSettings';
import { OrganizationPreferencesSettings } from './OrganizationPreferencesSettings';
import { PreferencesProvider } from '../components/providers/PreferencesProvider';
import { User, Building, Settings } from 'lucide-react';

interface PreferencesCenterProps {
  userId: string;
  organizationId: string;
  userRole: string;
}

export const PreferencesCenter: React.FC<PreferencesCenterProps> = ({
  userId,
  organizationId,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState('user');
  
  // Vérifier si l'utilisateur peut modifier les préférences de l'organisation
  const canEditOrganizationPreferences = ['owner', 'admin'].includes(userRole.toLowerCase());

  return (
    <PreferencesProvider userId={userId} organizationId={organizationId}>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Préférences</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences personnelles et celles de votre organisation
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Préférences personnelles
            </TabsTrigger>
            <TabsTrigger 
              value="organization" 
              className="flex items-center gap-2"
              disabled={!canEditOrganizationPreferences}
            >
              <Building className="h-4 w-4" />
              Préférences de l'organisation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="space-y-6">
            <UserPreferencesSettings />
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            {canEditOrganizationPreferences ? (
              <OrganizationPreferencesSettings 
                organizationId={organizationId}
                canEdit={canEditOrganizationPreferences}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Accès restreint
                  </CardTitle>
                  <CardDescription>
                    Vous n'avez pas les permissions nécessaires pour modifier les préférences de l'organisation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Seuls les propriétaires et administrateurs de l'organisation peuvent modifier ces paramètres.
                    Contactez un administrateur si vous pensez avoir besoin de ces permissions.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PreferencesProvider>
  );
};