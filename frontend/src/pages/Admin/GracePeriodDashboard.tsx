/**
 * Dashboard de gestion des périodes de grâce pour les administrateurs
 * Vue d'ensemble des utilisateurs en période de grâce avec statistiques et outils de gestion
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Mail,
  BarChart3,
  PieChart,
  Activity,
  UserCheck,
  UserX,
  Timer,
  Zap
} from 'lucide-react';
import { 
  GracePeriod,
  GracePeriodStatus,
  GracePeriodSource,
  GracePeriodStats,
  CreateGracePeriodRequest,
  ExtendGracePeriodRequest
} from '../../shared/types/billing.types';
import { formatDate } from '../../utils/formatters';

export const GracePeriodDashboard: React.FC = () => {
  const [gracePeriods, setGracePeriods] = useState<GracePeriod[]>([]);
  const [stats, setStats] = useState<GracePeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | GracePeriodStatus>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | GracePeriodSource>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [extendingPeriod, setExtendingPeriod] = useState<GracePeriod | null>(null);

  useEffect(() => {
    loadGracePeriods();
    loadStats();
  }, [searchTerm, selectedStatus, selectedSource]);

  const loadGracePeriods = async () => {
    try {
      setLoading(true);
      // Simuler le chargement des données
      // En réalité, on appellerait une API pour récupérer les périodes de grâce
      const mockData: GracePeriod[] = [
        {
          id: '1',
          userId: 'user1',
          tenantId: 'tenant1',
          status: GracePeriodStatus.ACTIVE,
          source: GracePeriodSource.MIGRATION,
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          durationDays: 14,
          notificationsSent: [],
          extensions: [],
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        }
      ];
      setGracePeriods(mockData);
    } catch (error) {
      console.error('Error loading grace periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculer les statistiques basées sur les données
      const totalGracePeriods = gracePeriods.length;
      const activeGracePeriods = gracePeriods.filter(gp => gp.status === GracePeriodStatus.ACTIVE).length;
      const expiredGracePeriods = gracePeriods.filter(gp => gp.status === GracePeriodStatus.EXPIRED).length;
      const convertedGracePeriods = gracePeriods.filter(gp => gp.status === GracePeriodStatus.CONVERTED).length;
      
      setStats({
        totalGracePeriods,
        activeGracePeriods,
        expiredGracePeriods,
        convertedGracePeriods,
        conversionRate: totalGracePeriods > 0 ? (convertedGracePeriods / totalGracePeriods) * 100 : 0,
        averageDaysToConversion: 7, // Valeur simulée
        totalExtensions: gracePeriods.reduce((sum, gp) => sum + gp.extensions.length, 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusBadge = (status: GracePeriodStatus) => {
    const statusConfig = {
      [GracePeriodStatus.ACTIVE]: { label: 'Actif', variant: 'default' as const, color: 'bg-green-500' },
      [GracePeriodStatus.EXPIRED]: { label: 'Expiré', variant: 'destructive' as const, color: 'bg-red-500' },
      [GracePeriodStatus.CONVERTED]: { label: 'Converti', variant: 'secondary' as const, color: 'bg-blue-500' },
      [GracePeriodStatus.CANCELLED]: { label: 'Annulé', variant: 'outline' as const, color: 'bg-gray-500' }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: GracePeriodSource) => {
    const sourceConfig = {
      [GracePeriodSource.MIGRATION]: { label: 'Migration', color: 'bg-blue-100 text-blue-700' },
      [GracePeriodSource.TRIAL_EXPIRED]: { label: 'Essai expiré', color: 'bg-orange-100 text-orange-700' },
      [GracePeriodSource.PAYMENT_FAILED]: { label: 'Paiement échoué', color: 'bg-red-100 text-red-700' },
      [GracePeriodSource.ADMIN_GRANTED]: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
      [GracePeriodSource.CUSTOMER_REQUEST]: { label: 'Demande client', color: 'bg-green-100 text-green-700' }
    };

    const config = sourceConfig[source];
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProgressPercentage = (startDate: Date, endDate: Date) => {
    const now = new Date();
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Périodes de grâce</h1>
          <p className="text-gray-600 mt-1">
            Gérez les utilisateurs en période de grâce et suivez les conversions
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle période
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="active">Périodes actives</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques principales */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total périodes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalGracePeriods}</div>
                  <p className="text-xs text-muted-foreground">
                    Toutes les périodes créées
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Périodes actives</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.activeGracePeriods}</div>
                  <p className="text-xs text-muted-foreground">
                    En cours actuellement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Convertis en abonnement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Temps moyen</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageDaysToConversion}j</div>
                  <p className="text-xs text-muted-foreground">
                    Jusqu'à conversion
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alertes importantes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Périodes expirant bientôt
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gracePeriods
                  .filter(gp => {
                    const daysRemaining = getDaysRemaining(gp.endDate);
                    return gp.status === GracePeriodStatus.ACTIVE && daysRemaining <= 3;
                  })
                  .map(gp => (
                    <div key={gp.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium">Utilisateur {gp.userId}</span>
                        <div className="text-sm text-gray-600">
                          Expire le {formatDate(gp.endDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {getDaysRemaining(gp.endDate)}j restants
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Conversions récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gracePeriods
                  .filter(gp => gp.status === GracePeriodStatus.CONVERTED)
                  .slice(0, 5)
                  .map(gp => (
                    <div key={gp.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium">Utilisateur {gp.userId}</span>
                        <div className="text-sm text-gray-600">
                          {gp.convertedAt && formatDate(gp.convertedAt)}
                        </div>
                      </div>
                      <Badge variant="default">Converti</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GracePeriodDashboard;      
  <TabsContent value="active" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher par utilisateur ou tenant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value={GracePeriodStatus.ACTIVE}>Actif</option>
                    <option value={GracePeriodStatus.EXPIRED}>Expiré</option>
                    <option value={GracePeriodStatus.CONVERTED}>Converti</option>
                    <option value={GracePeriodStatus.CANCELLED}>Annulé</option>
                  </select>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Toutes les sources</option>
                    <option value={GracePeriodSource.MIGRATION}>Migration</option>
                    <option value={GracePeriodSource.TRIAL_EXPIRED}>Essai expiré</option>
                    <option value={GracePeriodSource.PAYMENT_FAILED}>Paiement échoué</option>
                    <option value={GracePeriodSource.ADMIN_GRANTED}>Admin</option>
                    <option value={GracePeriodSource.CUSTOMER_REQUEST}>Demande client</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des périodes de grâce */}
          <Card>
            <CardHeader>
              <CardTitle>Périodes de grâce actives ({gracePeriods.filter(gp => gp.status === GracePeriodStatus.ACTIVE).length})</CardTitle>
              <CardDescription>
                Gérez les utilisateurs actuellement en période de grâce
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : gracePeriods.filter(gp => gp.status === GracePeriodStatus.ACTIVE).length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune période active</h3>
                  <p className="text-gray-600 mb-4">
                    Aucun utilisateur n'est actuellement en période de grâce
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gracePeriods
                    .filter(gp => gp.status === GracePeriodStatus.ACTIVE)
                    .map((gracePeriod) => {
                      const daysRemaining = getDaysRemaining(gracePeriod.endDate);
                      const progress = getProgressPercentage(gracePeriod.startDate, gracePeriod.endDate);
                      const isUrgent = daysRemaining <= 3;

                      return (
                        <div key={gracePeriod.id} className={`p-4 border rounded-lg ${isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUrgent ? 'bg-red-100' : 'bg-blue-100'}`}>
                                <Clock className={`h-5 w-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
                              </div>
                              <div>
                                <h3 className="font-semibold">Utilisateur {gracePeriod.userId}</h3>
                                <p className="text-sm text-gray-600">Tenant: {gracePeriod.tenantId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(gracePeriod.status)}
                              {getSourceBadge(gracePeriod.source)}
                              {isUrgent && (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progression de la période</span>
                              <span className="font-medium">
                                {daysRemaining} jour{daysRemaining !== 1 ? 's' : ''} restant{daysRemaining !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <Progress 
                              value={progress} 
                              className="h-2"
                              indicatorClassName={isUrgent ? 'bg-red-500' : 'bg-blue-500'}
                            />
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Début: {formatDate(gracePeriod.startDate)}</span>
                              <span>Fin: {formatDate(gracePeriod.endDate)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Durée: {gracePeriod.durationDays} jours</span>
                              {gracePeriod.extensions.length > 0 && (
                                <span>Extensions: {gracePeriod.extensions.length}</span>
                              )}
                              <span>Notifications: {gracePeriod.notificationsSent.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {/* Envoyer notification */}}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExtendingPeriod(gracePeriod)}
                              >
                                <Edit className="h-4 w-4" />
                                Étendre
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {/* Convertir */}}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Convertir
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Graphiques et métriques détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition par source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(GracePeriodSource).map(source => {
                    const count = gracePeriods.filter(gp => gp.source === source).length;
                    const percentage = gracePeriods.length > 0 ? (count / gracePeriods.length) * 100 : 0;
                    
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceBadge(source)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10">{percentage.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Taux de conversion par source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(GracePeriodSource).map(source => {
                    const total = gracePeriods.filter(gp => gp.source === source).length;
                    const converted = gracePeriods.filter(gp => gp.source === source && gp.status === GracePeriodStatus.CONVERTED).length;
                    const conversionRate = total > 0 ? (converted / total) * 100 : 0;
                    
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSourceBadge(source)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{converted}/{total}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${conversionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10">{conversionRate.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métriques temporelles */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution des périodes de grâce</CardTitle>
              <CardDescription>
                Tendances sur les 30 derniers jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Graphique d'évolution temporelle</p>
                <p className="text-sm">(À implémenter avec une librairie de graphiques)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Gestion des notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notifications automatiques
              </CardTitle>
              <CardDescription>
                Configurez les rappels envoyés aux utilisateurs en période de grâce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Les notifications sont envoyées automatiquement à 7, 3 et 1 jour(s) avant expiration.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Rappel 7 jours</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Premier rappel pour choisir un plan
                        </p>
                        <Badge variant="default">Actif</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle className="h-6 w-6 text-orange-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Rappel 3 jours</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Rappel d'urgence avec offres spéciales
                        </p>
                        <Badge variant="default">Actif</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="font-semibold mb-2">Rappel final</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Dernière chance avant expiration
                        </p>
                        <Badge variant="default">Actif</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historique des notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des notifications</CardTitle>
              <CardDescription>
                Dernières notifications envoyées aux utilisateurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4" />
                <p>Aucune notification récente</p>
                <p className="text-sm">Les notifications apparaîtront ici une fois envoyées</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GracePeriodDashboard;