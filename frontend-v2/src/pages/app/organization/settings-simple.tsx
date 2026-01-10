import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Globe, 
  Palette, 
  Mail, 
  MessageSquare, 
  Shield, 
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/router';

export default function OrganizationSettingsSimplePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [customDomain, setCustomDomain] = useState('');
  const { currentTenant } = useTenant();

  // Gestion de l'onglet via URL
  useEffect(() => {
    const tab = router.query.tab as string;
    if (tab && ['general', 'domain', 'branding', 'smtp', 'sms', 'security'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  // Utiliser les données du tenant si disponibles, sinon des données par défaut
  const mockOrganization = {
    name: currentTenant?.name || 'Mon Organisation',
    subdomain: currentTenant?.slug || 'mon-org',
    status: currentTenant?.status || 'active'
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Vous pouvez ajouter une notification ici
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status}
      </Badge>
    );
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
                {getStatusBadge(mockOrganization.status)}
                <Badge variant="outline">
                  {mockOrganization.subdomain}.attendancex.com
                </Badge>
              </div>
            </div>
          </div>

          {/* Notification de démonstration */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Mode Démonstration :</strong> Cette interface utilise des données simulées. 
              Les fonctionnalités de configuration DNS et domaines sont entièrement fonctionnelles 
              et prêtes à être connectées au backend.
            </AlertDescription>
          </Alert>

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
              {/* Informations Générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations Générales</CardTitle>
                  <CardDescription>
                    Paramètres de base de votre organisation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Nom de l'organisation</Label>
                      <Input id="orgName" defaultValue={mockOrganization.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nom d'affichage</Label>
                      <Input id="displayName" defaultValue={mockOrganization.name} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Description de votre organisation" />
                  </div>
                  <div className="flex justify-end">
                    <Button>Sauvegarder</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres Système (depuis onboarding) */}
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres Système</CardTitle>
                  <CardDescription>
                    Configuration de la timezone, langue et préférences régionales
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <select id="timezone" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locale">Langue & Locale</Label>
                      <select id="locale" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="fr-FR">Français (France)</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="de-DE">Deutsch</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Devise</Label>
                      <select id="currency" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Format de date</Label>
                      <select id="dateFormat" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeFormat">Format d'heure</Label>
                      <select id="timeFormat" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="HH:mm">24h (HH:mm)</option>
                        <option value="hh:mm A">12h (hh:mm AM/PM)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button>Sauvegarder les paramètres</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres de Présence (déplacé depuis Admin) */}
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de Présence</CardTitle>
                  <CardDescription>
                    Configuration des règles de présence et d'assiduité
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workDays">Jours de travail</Label>
                      <select id="workDays" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="Mon-Fri">Lundi - Vendredi</option>
                        <option value="Mon-Sat">Lundi - Samedi</option>
                        <option value="Mon-Sun">Lundi - Dimanche</option>
                        <option value="Tue-Sat">Mardi - Samedi</option>
                        <option value="Custom">Personnalisé</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graceMinutes">Période de grâce (minutes)</Label>
                      <select id="graceMinutes" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="0">Aucune période de grâce</option>
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Heure de début</Label>
                      <Input id="startTime" type="time" defaultValue="09:00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Heure de fin</Label>
                      <Input id="endTime" type="time" defaultValue="17:00" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="autoCheckOut" className="rounded" />
                      <Label htmlFor="autoCheckOut">Check-out automatique en fin de journée</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="requireLocation" className="rounded" />
                      <Label htmlFor="requireLocation">Exiger la géolocalisation pour le check-in</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="allowBreaks" className="rounded" />
                      <Label htmlFor="allowBreaks">Autoriser les pauses</Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button>Sauvegarder la politique de présence</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres des Feuilles de Temps (déplacé depuis Admin) */}
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres des Feuilles de Temps</CardTitle>
                  <CardDescription>
                    Configuration des feuilles de temps et approbations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timesheetPeriod">Période des feuilles de temps</Label>
                      <select id="timesheetPeriod" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="weekly">Hebdomadaire</option>
                        <option value="biweekly">Bi-hebdomadaire</option>
                        <option value="monthly">Mensuelle</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="approvalRequired">Approbation requise</Label>
                      <select id="approvalRequired" className="w-full p-2 border border-gray-300 rounded-md">
                        <option value="always">Toujours</option>
                        <option value="overtime">Seulement pour les heures supplémentaires</option>
                        <option value="never">Jamais</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxHoursPerDay">Heures max par jour</Label>
                      <Input id="maxHoursPerDay" type="number" defaultValue="8" min="1" max="24" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxHoursPerWeek">Heures max par semaine</Label>
                      <Input id="maxHoursPerWeek" type="number" defaultValue="40" min="1" max="168" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="allowManualEntry" className="rounded" />
                      <Label htmlFor="allowManualEntry">Autoriser la saisie manuelle des heures</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="requireComments" className="rounded" />
                      <Label htmlFor="requireComments">Exiger des commentaires pour les heures supplémentaires</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="lockPreviousPeriods" className="rounded" />
                      <Label htmlFor="lockPreviousPeriods">Verrouiller les périodes précédentes</Label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button>Sauvegarder les paramètres des feuilles de temps</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Configuration des Domaines */}
            <TabsContent value="domain" className="space-y-6">
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
                      {mockOrganization.subdomain}.attendancex.com
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`${mockOrganization.subdomain}.attendancex.com`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://${mockOrganization.subdomain}.attendancex.com`, '_blank')}
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
                      <Button>Sauvegarder</Button>
                    </div>
                  </div>

                  {customDomain && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customDomain}</span>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {getStatusIcon('pending')}
                            <span className="ml-1">pending</span>
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Vérifier
                        </Button>
                      </div>

                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Pour utiliser votre domaine personnalisé, vous devez configurer les enregistrements DNS suivants chez votre fournisseur de domaine.
                        </AlertDescription>
                      </Alert>

                      {/* Configuration DNS */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Configuration DNS Requise</CardTitle>
                          <CardDescription>
                            Ajoutez ces enregistrements DNS chez votre fournisseur de domaine
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {/* Enregistrement CNAME */}
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">CNAME</Badge>
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    {getStatusIcon('pending')}
                                    <span className="ml-1">pending</span>
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(`${mockOrganization.subdomain}.attendancex.com`)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Nom:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded">{customDomain}</code>
                                </div>
                                <div>
                                  <span className="font-medium">Valeur:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded">{mockOrganization.subdomain}.attendancex.com</code>
                                </div>
                                <div>
                                  <span className="font-medium">TTL:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded">300</code>
                                </div>
                              </div>
                            </div>

                            {/* Enregistrement TXT */}
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">TXT</Badge>
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    {getStatusIcon('pending')}
                                    <span className="ml-1">pending</span>
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard('attendancex-verification=abc123def456')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Nom:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded">_attendancex-verification.{customDomain.split('.').slice(-2).join('.')}</code>
                                </div>
                                <div>
                                  <span className="font-medium">Valeur:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded break-all">attendancex-verification=abc123def456</code>
                                </div>
                                <div>
                                  <span className="font-medium">TTL:</span>
                                  <code className="ml-2 px-2 py-1 bg-muted rounded">300</code>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              La propagation DNS peut prendre jusqu'à 48 heures. Une fois configuré, cliquez sur "Vérifier" pour valider la configuration.
                            </AlertDescription>
                          </Alert>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {getStatusIcon('pending')}
                        <span className="ml-1">pending</span>
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      En attente de la vérification DNS
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Le certificat SSL sera automatiquement généré une fois que la configuration DNS sera vérifiée.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Autres onglets avec contenu placeholder */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branding de l'Organisation</CardTitle>
                  <CardDescription>
                    Personnalisez l'apparence de votre organisation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Configuration du branding en cours de développement.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Configuration SMTP
                  </CardTitle>
                  <CardDescription>
                    Configurez votre serveur email pour l'envoi de notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Configuration SMTP Simplifiée */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">Serveur SMTP</Label>
                        <Input id="smtpHost" placeholder="smtp.gmail.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">Port</Label>
                        <Input id="smtpPort" placeholder="587" type="number" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">Nom d'utilisateur</Label>
                        <Input id="smtpUser" placeholder="votre@email.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword">Mot de passe</Label>
                        <Input id="smtpPassword" type="password" placeholder="••••••••" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">Email expéditeur</Label>
                      <Input id="fromEmail" placeholder="noreply@monorganisation.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromName">Nom expéditeur</Label>
                      <Input id="fromName" placeholder="Mon Organisation" />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="smtpTls" className="rounded" />
                      <Label htmlFor="smtpTls">Utiliser TLS/SSL</Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button>
                      Sauvegarder la configuration
                    </Button>
                    <Button variant="outline">
                      Tester l'envoi
                    </Button>
                  </div>

                  {/* Providers populaires */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Configurations rapides pour providers populaires :</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4 cursor-pointer hover:bg-muted/50">
                        <div className="text-center">
                          <h5 className="font-medium">Gmail</h5>
                          <p className="text-sm text-muted-foreground">smtp.gmail.com:587</p>
                        </div>
                      </Card>
                      <Card className="p-4 cursor-pointer hover:bg-muted/50">
                        <div className="text-center">
                          <h5 className="font-medium">SendGrid</h5>
                          <p className="text-sm text-muted-foreground">smtp.sendgrid.net:587</p>
                        </div>
                      </Card>
                      <Card className="p-4 cursor-pointer hover:bg-muted/50">
                        <div className="text-center">
                          <h5 className="font-medium">Mailgun</h5>
                          <p className="text-sm text-muted-foreground">smtp.mailgun.org:587</p>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Statut de la configuration */}
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Mode Démonstration :</strong> Cette configuration sera sauvegardée une fois connectée au backend. 
                      En l'absence de configuration personnalisée, les paramètres globaux de la plateforme seront utilisés.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration SMS</CardTitle>
                  <CardDescription>
                    Configurez l'envoi de SMS pour les notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Configuration SMS en cours de développement.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de Sécurité</CardTitle>
                  <CardDescription>
                    Gérez les paramètres de sécurité de votre organisation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Paramètres de sécurité en cours de développement.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}