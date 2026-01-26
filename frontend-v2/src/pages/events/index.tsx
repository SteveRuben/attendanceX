/**
 * Page de découverte des événements publics
 * Accessible sans authentification
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, Filter, Loader2, Calendar, MapPin, Tag } from 'lucide-react';
import { publicEventsService, PublicEventFilters } from '@/services/publicEventsService';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

export default function PublicEventsPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<PublicEventFilters>({
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'asc',
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Charger les événements
  useEffect(() => {
    loadEvents();
  }, [filters]);

  // Charger les catégories et lieux
  useEffect(() => {
    loadFiltersData();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await publicEventsService.getPublicEvents(filters);
      
      setEvents(response.events);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Impossible de charger les événements. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [categoriesData, locationsData] = await Promise.all([
        publicEventsService.getPublicCategories(),
        publicEventsService.getPublicLocations(),
      ]);
      
      setCategories(categoriesData);
      setLocations(locationsData);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery,
      page: 1,
    }));
  };

  const handleFilterChange = (key: keyof PublicEventFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'date',
      sortOrder: 'asc',
    });
    setSearchQuery('');
  };

  const activeFiltersCount = Object.keys(filters).filter(
    key => !['page', 'limit', 'sortBy', 'sortOrder'].includes(key) && filters[key as keyof PublicEventFilters]
  ).length;

  return (
    <>
      <Head>
        <title>Découvrir des Événements | AttendanceX</title>
        <meta 
          name="description" 
          content="Découvrez et rejoignez des événements incroyables près de chez vous. Parcourez des milliers d'événements dans la tech, le business, l'éducation et plus encore." 
        />
        <meta property="og:title" content="Découvrir des Événements | AttendanceX" />
        <meta property="og:description" content="Découvrez et rejoignez des événements incroyables près de chez vous." />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Découvrir des Événements
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Trouvez et rejoignez des événements près de chez vous
                </p>
              </div>
              <Button onClick={() => router.push('/auth/login')} variant="outline">
                Se connecter
              </Button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher des événements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Rechercher
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-blue-600">{activeFiltersCount}</Badge>
                )}
              </Button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        <Tag className="h-4 w-4 inline mr-1" />
                        Catégorie
                      </label>
                      <Select
                        value={filters.category || ''}
                        onValueChange={(value) => handleFilterChange('category', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Toutes</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name} ({cat.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Lieu
                      </label>
                      <Select
                        value={filters.city || ''}
                        onValueChange={(value) => handleFilterChange('city', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tous</SelectItem>
                          {locations.slice(0, 10).map((loc) => (
                            <SelectItem key={`${loc.city}-${loc.country}`} value={loc.city}>
                              {loc.city}, {loc.country} ({loc.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Prix
                      </label>
                      <Select
                        value={filters.priceType || ''}
                        onValueChange={(value) => handleFilterChange('priceType', value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tous</SelectItem>
                          <SelectItem value="free">Gratuit</SelectItem>
                          <SelectItem value="paid">Payant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Trier par
                      </label>
                      <Select
                        value={filters.sortBy || 'date'}
                        onValueChange={(value) => handleFilterChange('sortBy', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="popular">Popularité</SelectItem>
                          <SelectItem value="rating">Note</SelectItem>
                          <SelectItem value="price">Prix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button variant="ghost" onClick={clearFilters}>
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600 dark:text-gray-400">
              {pagination.total > 0 ? (
                <>
                  <span className="font-semibold">{pagination.total}</span> événement{pagination.total > 1 ? 's' : ''} trouvé{pagination.total > 1 ? 's' : ''}
                </>
              ) : (
                'Aucun événement trouvé'
              )}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-6 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button onClick={loadEvents} className="mt-4">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Events Grid */}
          {!loading && !error && events.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    Précédent
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={pagination.page === page ? 'default' : 'outline'}
                          onClick={() => handlePageChange(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    {pagination.totalPages > 5 && <span>...</span>}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && events.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Aucun événement trouvé
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
                <Button onClick={clearFilters}>
                  Réinitialiser les filtres
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
