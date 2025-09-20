import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/badge';
import {
  Mail,
  Send,
  Users,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { notificationService } from '../services';
import { toast } from 'react-toastify';

interface CampaignCenterProps {
  organizationId: string;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  recipients: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
}

export const CampaignCenter: React.FC<CampaignCenterProps> = ({ organizationId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalSent: 0,
    averageOpenRate: 0,
    averageClickRate: 0
  });

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, []);

  const loadCampaigns = async () => {
    try {
      // Simuler des données de campagnes pour l'instant
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: 'Newsletter Mensuelle',
          subject: 'Actualités de votre organisation',
          status: 'sent',
          recipients: 150,
          openRate: 65.2,
          clickRate: 12.8,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          name: 'Rappel Événement',
          subject: 'N\'oubliez pas votre événement demain',
          status: 'scheduled',
          recipients: 85,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          scheduledFor: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          name: 'Bienvenue Nouveaux Membres',
          subject: 'Bienvenue dans notre organisation !',
          status: 'draft',
          recipients: 0,
          openRate: 0,
          clickRate: 0,
          createdAt: new Date().toISOString()
        }
      ];
      
      setCampaigns(mockCampaigns);
      setLoading(false);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Erreur lors du chargement des campagnes');
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculer les statistiques à partir des campagnes mockées
      setStats({
        totalCampaigns: 3,
        totalSent: 1,
        averageOpenRate: 65.2,
        averageClickRate: 12.8
      });
    } catch (error) {
      console.error('Error loading campaign stats:', error);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Brouillon', icon: Edit },
      scheduled: { variant: 'default' as const, label: 'Programmé', icon: Clock },
      sent: { variant: 'default' as const, label: 'Envoyé', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Échec', icon: AlertCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes Email</h1>
          <p className="text-gray-600">
            Gérez vos campagnes de communication par email
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Campagne
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Campagnes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Campagnes Envoyées</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux d'Ouverture</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageOpenRate}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Clic</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageClickRate}%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Send className="h-6 w-6" />
            <span>Créer une Campagne</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <FileText className="h-6 w-6" />
            <span>Gérer les Templates</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <Users className="h-6 w-6" />
            <span>Gérer les Listes</span>
          </Button>
        </div>
      </Card>

      {/* Liste des campagnes */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Campagnes</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune campagne
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première campagne email pour commencer.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer une campagne
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{campaign.subject}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {campaign.recipients} destinataires
                      </div>
                      
                      {campaign.status === 'sent' && (
                        <>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {campaign.openRate}% ouverture
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            {campaign.clickRate}% clic
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {campaign.sentAt 
                          ? `Envoyé le ${formatDate(campaign.sentAt)}`
                          : campaign.scheduledFor 
                            ? `Programmé pour le ${formatDate(campaign.scheduledFor)}`
                            : `Créé le ${formatDate(campaign.createdAt)}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};