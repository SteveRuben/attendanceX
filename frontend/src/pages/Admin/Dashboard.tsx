import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Building2,
  Users,
  Settings,
  Shield,
  BarChart3,
  Database,
  Bell,
  Key,
  FileText,
  UserPlus,
  Mail,
  CreditCard,
  Gift,
  Clock,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Import des composants d'organisation
// import { OrganizationSettings } from '../components/organization/OrganizationSettings';
import { OrganizationMembersList } from '../../components/organization/OrganizationMembersList';
import { UserInvitation } from '../../components/organization/UserInvitation';
import { useAuth, usePermissions } from '../../hooks/use-auth';
import { toast } from 'react-toastify';

// Types locaux pour l'organisation
interface Organization {
  id: string;
  name: string;
  sector: string;
  description?: string;
  website?: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  settings: {
    timezone: string;
    language: string;
    currency: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  subscription?: {
    plan: string;
    status: string;
    expiresAt?: Date;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  memberCount?: number;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { canManageUsers } = usePermissions();
  const navigate = useNavigate();
  
  // États pour les nouvelles métriques
  const [promoCodeStats, setPromoCodeStats] = useState({
    totalCodes: 0,
    activeCodes: 0,
    totalUses: 0,
    totalSavings: 0
  });
  
  const [gracePeriodStats, setGracePeriodStats] = useState({
    activeGracePeriods: 0,
    expiringSoon: 0,
    conversionRate: 0,
    totalConversions: 0
  });

  // Charger les statistiques au montage du composant
  useEffect(() => {
    loadPromoCodeStats();
    loadGracePeriodStats();
  }, []);

  const loadPromoCodeStats = async () => {
    try {
      // Simuler le chargement des stats de codes promo
      // En réalité, on appellerait une API
      setPromoCodeStats({
        totalCodes: 12,
        activeCodes: 8,
        totalUses: 156,
        totalSavings: 2340
      });
    } catch (error) {
      console.error('Error loading promo code stats:', error);
    }
  };

  const loadGracePeriodStats = async () => {
    try {
      // Simuler le chargement des stats de périodes de grâce
      setGracePeriodStats({
        activeGracePeriods: 23,
        expiringSoon: 5,
        conversionRate: 68.5,
        totalConversions: 89
      });
    } catch (error) {
      console.error('Error loading grace period stats:', error);
    }
  };

  // Statistiques admin (déclarées en premier pour être utilisées dans l'état organization)
  const adminStats = {
    totalUsers: 45,
    activeUsers: 38,
    pendingInvitations: 7,
    totalOrganizations: 1,
    systemHealth: 'good',
    lastBackup: '2 heures',
    storageUsed: '2.3 GB',
    apiCalls: '12.5K'
  };

  // État pour l'organisation (mock data pour l'instant)
  const [organization, setOrganization] = useState<Organization>({
    id: user?.organizationId || '',
    name: 'Mon Organisation',
    sector: 'services',
    description: 'Description de l\'organisation',
    website: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'France'
    },
    settings: {
      timezone: 'Europe/Paris',
      language: 'fr',
      currency: 'EUR'
    },
    status: 'active',
    branding: {
      logo: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF'
    },
    subscription: {
      plan: 'Professional',
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an
    },
    contactInfo: {
      email: user?.email || '',
      phone: ''
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: user?.id || '',
    memberCount: adminStats.totalUsers
  });

  // Callback pour rafraîchir les données après invitation
  const handleInvitationSent = () => {
    toast.success('Invitation envoyée avec succès !');
    // Ici on pourrait rafraîchir les statistiques ou la liste des utilisateurs
  };

  // Callback pour mettre à jour l'organisation
  const handleOrganizationUpdate = (updatedOrg: Organization) => {
    setOrganization(updatedOrg);
    toast.success('Organisation mise à jour avec succès !');
  };

  const quickActions = [
    {
      title: 'Inviter un utilisateur',
      description: 'Ajouter un nouveau membre à l\'organisation',
      icon: UserPlus,
      action: () => setActiveTab('users'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Gérer les codes promo',
      description: 'Créer et gérer les codes de réduction',
      icon: Gift,
      action: () => navigate('/admin/promo-codes'),
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Périodes de grâce',
      description: 'Suivre les utilisateurs en période de grâce',
      icon: Clock,
      action: () => navigate('/admin/grace-periods'),
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Rapports système',
      description: 'Consulter les rapports d\'activité',
      icon: BarChart3,
      action: () => setActiveTab('system'),
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  const systemAlerts = [
    {
      type: 'warning',
      message: `${gracePeriodStats.expiringSoon} périodes de grâce expirent dans moins de 3 jours`,
      time: 'maintenant',
      action: () => navigate('/admin/grace-periods')
    },
    {
      type: 'info',
      message: 'Mise à jour système disponible (v2.1.0)',
      time: '1 heure',
      action: () => setActiveTab('system')
    },
    {
      type: 'warning',
      message: '3 utilisateurs n\'ont pas confirmé leur email',
      time: '2 heures',
      action: () => setActiveTab('users')
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-2">
            Gérez votre organisation et les paramètres système
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Shield className="w-4 h-4 mr-2" />
          Administrateur
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
          <TabsTrigger value="organization">Organisation</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="system">Système</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{adminStats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{adminStats.activeUsers}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{gracePeriodStats.activeGracePeriods}</p>
                  <p className="text-sm text-muted-foreground">Périodes de grâce</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{promoCodeStats.activeCodes}</p>
                  <p className="text-sm text-muted-foreground">Codes promo actifs</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Nouvelles métriques de billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{promoCodeStats.totalSavings}€</p>
                  <p className="text-sm text-muted-foreground">Économies générées</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{gracePeriodStats.conversionRate}%</p>
                  <p className="text-sm text-muted-foreground">Taux de conversion</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Mail className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{adminStats.pendingInvitations}</p>
                  <p className="text-sm text-muted-foreground">Invitations en attente</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-foreground">{adminStats.storageUsed}</p>
                  <p className="text-sm text-muted-foreground">Stockage utilisé</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={action.action}
                >
                  <div className={`inline-flex p-2 rounded-lg ${action.color} mb-3`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-foreground mb-1">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* System Alerts */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Alertes système</h3>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    alert.type === 'warning' ? 'bg-orange-50 hover:bg-orange-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={alert.action}
                >
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-orange-500 mr-3" />
                  ) : (
                    <Bell className="w-4 h-4 text-blue-500 mr-3" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">Il y a {alert.time}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Voir
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Facturation */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Codes promo */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Codes promo
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/admin/promo-codes')}
                >
                  Gérer
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{promoCodeStats.totalCodes}</p>
                    <p className="text-sm text-muted-foreground">Total codes</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{promoCodeStats.activeCodes}</p>
                    <p className="text-sm text-muted-foreground">Actifs</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{promoCodeStats.totalUses}</p>
                    <p className="text-sm text-muted-foreground">Utilisations</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{promoCodeStats.totalSavings}€</p>
                    <p className="text-sm text-muted-foreground">Économies</p>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/admin/promo-codes')}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Créer un code promo
                </Button>
              </div>
            </Card>

            {/* Périodes de grâce */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Périodes de grâce
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/admin/grace-periods')}
                >
                  Gérer
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{gracePeriodStats.activeGracePeriods}</p>
                    <p className="text-sm text-muted-foreground">Actives</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{gracePeriodStats.expiringSoon}</p>
                    <p className="text-sm text-muted-foreground">Expirent bientôt</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{gracePeriodStats.conversionRate}%</p>
                    <p className="text-sm text-muted-foreground">Conversion</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{gracePeriodStats.totalConversions}</p>
                    <p className="text-sm text-muted-foreground">Convertis</p>
                  </div>
                </div>
                {gracePeriodStats.expiringSoon > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {gracePeriodStats.expiringSoon} période{gracePeriodStats.expiringSoon > 1 ? 's' : ''} expire{gracePeriodStats.expiringSoon > 1 ? 'nt' : ''} bientôt
                      </span>
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full" 
                  onClick={() => navigate('/admin/grace-periods')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Voir le dashboard
                </Button>
              </div>
            </Card>
          </div>

          {/* Métriques de revenus */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Métriques de revenus
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">€12,450</p>
                <p className="text-sm text-muted-foreground">Revenus ce mois</p>
                <p className="text-xs text-green-600">+15% vs mois dernier</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">€8,200</p>
                <p className="text-sm text-muted-foreground">MRR (Revenus récurrents)</p>
                <p className="text-xs text-blue-600">+8% vs mois dernier</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">€156</p>
                <p className="text-sm text-muted-foreground">ARPU (Revenu par utilisateur)</p>
                <p className="text-xs text-purple-600">+3% vs mois dernier</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">2.3%</p>
                <p className="text-sm text-muted-foreground">Taux de désabonnement</p>
                <p className="text-xs text-green-600">-0.5% vs mois dernier</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Organisation */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Paramètres de l'organisation
                </h3>

                <div className="space-y-6">
                  {/* Informations générales */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Informations générales</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Nom de l'organisation
                        </label>
                        <input
                          type="text"
                          value={organization.name}
                          onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Secteur d'activité
                        </label>
                        <select
                          value={organization.sector}
                          onChange={(e) => setOrganization({ ...organization, sector: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="services">Services</option>
                          <option value="retail">Commerce</option>
                          <option value="healthcare">Santé</option>
                          <option value="education">Éducation</option>
                          <option value="technology">Technologie</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        value={organization.description}
                        onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      />
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Site web
                        </label>
                        <input
                          type="url"
                          value={organization.website}
                          onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={organization.phone}
                          onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Paramètres */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Paramètres</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Fuseau horaire
                        </label>
                        <select
                          value={organization.settings.timezone}
                          onChange={(e) => setOrganization({
                            ...organization,
                            settings: { ...organization.settings, timezone: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="Europe/Paris">Europe/Paris</option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="America/New_York">America/New_York</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Langue
                        </label>
                        <select
                          value={organization.settings.language}
                          onChange={(e) => setOrganization({
                            ...organization,
                            settings: { ...organization.settings, language: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="fr">Français</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Devise
                        </label>
                        <select
                          value={organization.settings.currency}
                          onChange={(e) => setOrganization({
                            ...organization,
                            settings: { ...organization.settings, currency: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleOrganizationUpdate(organization)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Sauvegarder les modifications
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Informations organisation
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan actuel</p>
                    <p className="font-medium text-foreground">Professional</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilisateurs</p>
                    <p className="font-medium text-foreground">{adminStats.totalUsers} / 100</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stockage</p>
                    <p className="font-medium text-foreground">{adminStats.storageUsed} / 10 GB</p>
                  </div>
                  <Button className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gérer l'abonnement
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {user?.organizationId && user?.id && (
                <OrganizationMembersList
                  organizationId={user.organizationId}
                  currentUserId={user.id}
                  canManageMembers={canManageUsers()}
                />
              )}
            </div>
            <div>
              {user?.organizationId && (
                <UserInvitation
                  organizationId={user.organizationId}
                  onInvitationSent={handleInvitationSent}
                />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Système */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">État du système</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Santé système</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dernière sauvegarde</span>
                  <span className="text-sm font-medium text-foreground">{adminStats.lastBackup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Appels API (24h)</span>
                  <span className="text-sm font-medium text-foreground">{adminStats.apiCalls}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions système</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  Créer une sauvegarde
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Exporter les logs
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Configuration système
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Paramètres de sécurité</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Authentification 2FA</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Activée</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Chiffrement des données</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">AES-256</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sessions actives</span>
                  <span className="text-sm font-medium text-foreground">23</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Audit et logs</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Key className="w-4 h-4 mr-2" />
                  Logs de connexion
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Événements de sécurité
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Rapport d'audit
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;