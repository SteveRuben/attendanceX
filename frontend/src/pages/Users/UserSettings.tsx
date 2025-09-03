import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationsPreferences } from '@/components/preferences/IntegrationsPreferences';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Link,
  Settings as SettingsIcon 
} from 'lucide-react';

export const UserSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 mt-2">
          Gérez vos préférences et paramètres de compte
        </p>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-700">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Apparence
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Intégrations
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="profile" className="space-y-4">
                <Card className="bg-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Informations personnelles</CardTitle>
                    <CardDescription className="text-gray-400">
                      Gérez vos informations de profil
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Section en construction...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4">
                <Card className="bg-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Préférences de notification</CardTitle>
                    <CardDescription className="text-gray-400">
                      Configurez comment vous souhaitez être notifié
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Section en construction...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card className="bg-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Sécurité et confidentialité</CardTitle>
                    <CardDescription className="text-gray-400">
                      Gérez vos paramètres de sécurité
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Section en construction...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4">
                <Card className="bg-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Apparence</CardTitle>
                    <CardDescription className="text-gray-400">
                      Personnalisez l'apparence de l'interface
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Section en construction...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-4">
                <Card className="bg-gray-900 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white">Intégrations</CardTitle>
                    <CardDescription className="text-gray-400">
                      Connectez vos comptes de services externes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IntegrationsPreferences />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};