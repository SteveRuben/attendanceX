/**
 * Page de découverte des événements publics
 * Accessible sans authentification
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Search, Filter, Loader2, Calendar, MapPin, Tag, X } from 'lucide-react';
import { publicEventsService, PublicEventFilters } from '@/services/publicEventsService';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function PublicEventsPage() {
  const router = useRouter();
  
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

      <PublicLayout
        showHero={true}
        heroTitle="Découvrez des Événements Incroyables"
        heroSubtitle="Trouvez et rejoignez des événements qui vous passionnent, près de chez vous ou en ligne"
      >
        {/* Search & Filters Section */}
        <section className="py-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-4">

              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Rechercher des événements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-green-500 dark:focus:border-green-500 bg-white dark:bg-slate-800 transition-colors"
                />
              </div>
              
              <Button 
                onClick={handleSearch}
                className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white px-8"
              >
                Rechercher
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="relative border-2"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-green-600 text-white">{activeFiltersCount}</Badge>
                )}
              </Button>
            </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6">
              <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtres de recherche
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowFilters(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
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

                  <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="ghost" onClick={clearFilters}>
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Count */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {pagination.total > 0 ? (
                    <>
                      {pagination.total} événement{pagination.total > 1 ? 's' : ''} trouvé{pagination.total > 1 ? 's' : ''}
                    </>
                  ) : (
                    'Aucun événement trouvé'
                  )}
                </p>
                {activeFiltersCount > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Chargement des événements...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex p-3 rounded-xl bg-red-100 dark:bg-red-900/30 mb-4">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <Button 
                    onClick={loadEvents}
                    className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Events Grid */}
            {!loading && !error && events.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="border-2"
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
                            className={`w-10 ${
                              pagination.page === page 
                                ? 'bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700' 
                                : 'border-2'
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {pagination.totalPages > 5 && (
                        <span className="text-slate-600 dark:text-slate-400">...</span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="border-2"
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!loading && !error && events.length === 0 && (
              <Card className="border-2 border-slate-200 dark:border-slate-700">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-100 to-orange-100 dark:from-green-900/30 dark:to-indigo-900/30 mb-6">
                    <Calendar className="h-16 w-16 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    Aucun événement trouvé
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    Essayez de modifier vos filtres ou votre recherche pour découvrir plus d'événements
                  </p>
                  <Button 
                    onClick={clearFilters}
                    className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Réinitialiser les filtres
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </PublicLayout>
    </>
  );
}
