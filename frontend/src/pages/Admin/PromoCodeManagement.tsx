/**
 * Page de gestion des codes promo pour les administrateurs
 * Interface de création, modification et suivi des codes promo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye,
  ToggleLeft,
  ToggleRight,
  Gift,
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Calendar,
  BarChart3
} from 'lucide-react';
import { promoCodeService } from '../../services/promoCodeService';
import { 
  PromoCode, 
  PromoCodeDiscountType,
  PromoCodeStats,
  ListPromoCodesRequest,
  CreatePromoCodeRequest,
  UpdatePromoCodeRequest
} from '../../shared/types/billing.types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const PromoCodeManagement: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedType, setSelectedType] = useState<'all' | PromoCodeDiscountType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);

  useEffect(() => {
    loadPromoCodes();
    loadStats();
  }, [currentPage, searchTerm, selectedStatus, selectedType]);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const filters: ListPromoCodesRequest = {
        search: searchTerm || undefined,
        isActive: selectedStatus === 'all' ? undefined : selectedStatus === 'active',
        discountType: selectedType === 'all' ? undefined : selectedType,
        limit: 20,
        offset: (currentPage - 1) * 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const response = await promoCodeService.listPromoCodes(filters);
      setPromoCodes(response.promoCodes);
      setTotalPages(Math.ceil(response.pagination.total / 20));
    } catch (error) {
      console.error('Error loading promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Pour les stats globales, on peut utiliser un endpoint dédié ou calculer côté client
      // Ici on simule des stats basiques
      const totalCodes = promoCodes.length;
      const activeCodes = promoCodes.filter(code => code.isActive).length;
      const totalUses = promoCodes.reduce((sum, code) => sum + code.currentUses, 0);
      
      setStats({
        totalCodes,
        activeCodes,
        totalUses,
        totalDiscountAmount: 0, // À calculer avec les vraies données
        conversionRate: totalUses > 0 ? (totalUses / totalCodes) * 100 : 0,
        topPerformingCodes: promoCodes
          .sort((a, b) => b.currentUses - a.currentUses)
          .slice(0, 3)
          .map(code => ({
            code: code.code,
            uses: code.currentUses,
            discountAmount: 0 // À calculer
          }))
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestion des codes promo</h1>
          <p className="text-gray-600 mt-1">
            Créez et gérez vos codes de réduction
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau code
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="codes">Codes promo</TabsTrigger>
          <TabsTrigger value="analytics">Analytiques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total codes</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCodes}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeCodes} actifs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisations</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUses}</div>
                  <p className="text-xs text-muted-foreground">
                    Total des utilisations
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
                    Codes utilisés vs créés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Économies totales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalDiscountAmount, 'EUR')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Réductions accordées
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromoCodeManagement; 
       <TabsContent value="codes" className="space-y-6">
          {/* Filtres et recherche */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Rechercher par code ou nom..."
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
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                  </select>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Tous les types</option>
                    <option value={PromoCodeDiscountType.PERCENTAGE}>Pourcentage</option>
                    <option value={PromoCodeDiscountType.FIXED_AMOUNT}>Montant fixe</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des codes promo */}
          <Card>
            <CardHeader>
              <CardTitle>Codes promo ({promoCodes.length})</CardTitle>
              <CardDescription>
                Gérez vos codes de réduction et suivez leurs performances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : promoCodes.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun code promo</h3>
                  <p className="text-gray-600 mb-4">
                    Créez votre premier code promo pour commencer
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un code
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {promoCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          {code.discountType === PromoCodeDiscountType.PERCENTAGE ? (
                            <Percent className="h-5 w-5 text-blue-600" />
                          ) : (
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{code.code}</h3>
                            <Badge variant={code.isActive ? 'default' : 'secondary'}>
                              {code.isActive ? 'Actif' : 'Inactif'}
                            </Badge>
                            {promoCodeService.getPromoCodeStatus(code) === 'expired' && (
                              <Badge variant="destructive">Expiré</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{code.name}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                            <span>
                              {code.discountType === PromoCodeDiscountType.PERCENTAGE 
                                ? `${code.discountValue}%` 
                                : `${code.discountValue}€`
                              } de réduction
                            </span>
                            <span>•</span>
                            <span>{code.currentUses} utilisations</span>
                            {code.maxUses && (
                              <>
                                <span>•</span>
                                <span>Max: {code.maxUses}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Créé le {formatDate(code.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* Voir détails */}}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCode(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await promoCodeService.togglePromoCode(code.id, !code.isActive);
                            loadPromoCodes();
                          }}
                        >
                          {code.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce code ?')) {
                              await promoCodeService.deletePromoCode(code.id);
                              loadPromoCodes();
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Précédent
              </Button>
              <span className="flex items-center px-4">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Graphiques et métriques détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top codes performants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.topPerformingCodes.map((code, index) => (
                  <div key={code.code} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{code.code}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{code.uses} utilisations</div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(code.discountAmount, 'EUR')} économisés
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Codes expirant bientôt
                </CardTitle>
              </CardHeader>
              <CardContent>
                {promoCodes
                  .filter(code => {
                    if (!code.validUntil) return false;
                    const daysUntilExpiry = Math.ceil(
                      (new Date(code.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
                  })
                  .map(code => (
                    <div key={code.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium">{code.code}</span>
                        <div className="text-sm text-gray-600">{code.name}</div>
                      </div>
                      <Badge variant="destructive">
                        Expire le {formatDate(code.validUntil!)}
                      </Badge>
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

export default PromoCodeManagement;