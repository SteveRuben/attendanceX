import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Search, Filter, Users, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  startDate: string;
  endDate: string;
  targetAudience: number;
  reached: number;
  conversionRate: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns] = useState<Campaign[]>([
    {
      id: '1',
      name: 'Campagne Conférence Tech 2024',
      description: 'Promotion de la conférence annuelle sur les nouvelles technologies',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      targetAudience: 1000,
      reached: 750,
      conversionRate: 15.2
    },
    {
      id: '2',
      name: 'Formation React - Inscription Ouverte',
      description: 'Campagne d\'inscription pour la formation React avancé',
      status: 'active',
      startDate: '2024-01-10',
      endDate: '2024-02-20',
      targetAudience: 500,
      reached: 320,
      conversionRate: 22.8
    },
    {
      id: '3',
      name: 'Workshop UX Design',
      description: 'Promotion de l\'atelier UX Design pour débutants',
      status: 'completed',
      startDate: '2023-12-01',
      endDate: '2023-12-31',
      targetAudience: 200,
      reached: 180,
      conversionRate: 35.0
    }
  ]);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      draft: 'Brouillon',
      active: 'Active',
      completed: 'Terminée',
      paused: 'En Pause'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]} data-cy="campaign-status">
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell title="Campagnes">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <Megaphone className="h-6 w-6" />
                Campagnes Marketing
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos campagnes de promotion et suivez leurs performances
              </p>
            </div>
            <Button 
              onClick={() => router.push('/app/campaigns/create')}
              data-cy="create-campaign-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Campagne
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des campagnes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-cy="campaigns-search"
              />
            </div>
            <Button variant="outline" data-cy="campaigns-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>

          {/* Campaigns List */}
          <div className="grid grid-cols-1 gap-6" data-cy="campaigns-list">
            {filteredCampaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/app/campaigns/${campaign.id}`)}
                data-cy="campaign-card"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold" data-cy="campaign-title">
                          {campaign.name}
                        </h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-muted-foreground" data-cy="campaign-description">
                        {campaign.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Période</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(campaign.startDate).toLocaleDateString('fr-FR')} - {new Date(campaign.endDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Audience</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.reached} / {campaign.targetAudience}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Taux de Conversion</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.conversionRate}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(campaign.reached / campaign.targetAudience) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune campagne trouvée</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucune campagne ne correspond à votre recherche.' : 'Commencez par créer votre première campagne.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/app/campaigns/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une campagne
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}