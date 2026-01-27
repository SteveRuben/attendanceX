/**
 * Page de découverte des événements publics - Design Evelya
 * Accessible sans authentification
 * Inspiré de https://evelya.co/
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { 
  Search, 
  Filter, 
  Loader2, 
  Calendar, 
  MapPin, 
  Tag, 
  X,
  Navigation,
  SlidersHorizontal
} from 'lucide-react';
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
  const { t } = useTranslation(['events', 'common']);
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  
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
      setError(t('events:error.loadEvents'));
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

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setError(t('events:error.geolocation'));
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFilters(prev => ({
          ...prev,
          // TODO: Add lat/lng to filters when backend supports it
          page: 1,
        }));
        setGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(t('events:error.geolocation'));
        setGettingLocation(false);
      }
    );
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
        <title>{t('events:page.title')} | AttendanceX</title>
        <meta name="description" content={t('events:page.metaDescription')} />
        <meta property="og:title" content={`${t('events:page.title')} | AttendanceX`} />
        <meta property="og:description" content={t('events:page.metaDescription')} />
        <meta property="og:type" content="website" />
      </Head>

      <PublicLayout
        showHero={true}
        heroTitle={t('events:page.title')}
        heroSubtitle={t('events:page.subtitle')}
      >
        {/* Search & Filters Section - Evelya Style */}
        <section className="py-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-3">

              {/* Search Bar - Evelya Style */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('events:search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 pr-4 h-12 rounded-lg border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              {/* Near Me Button - Evelya Style */}
              <Button 
                onClick={handleNearMe}
                disabled={gettingLocation}
                variant="outline"
                className="h-12 px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                {t('events:search.nearMe')}
              </Button>

              {/* Search Button - Evelya Style */}
              <Button 
                onClick={handleSearch}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('events:search.button')}
              </Button>
              
              {/* Filters Button - Evelya Style */}
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 relative"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {t('events:search.filters')}
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-blue-600 text-white px-2 py-0.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters Panel - Evelya Style */}
            {showFilters && (
              <div className="mt-6" data-testid="filters-panel">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        {t('events:filters.title')}
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="text-slate-600 dark:text-slate-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300" data-testid="category-label">
                          <Tag className="h-4 w-4 inline mr-1" />
                          {t('events:filters.category')}
                        </label>
                        <Select
                          value={filters.category || ''}
                          onValueChange={(value) => handleFilterChange('category', value || undefined)}
                        >
                          <SelectTrigger className="border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder={t('events:filters.allCategories')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('events:filters.allCategories')}</SelectItem>
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
                        <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {t('events:filters.location')}
                        </label>
                        <Select
                          value={filters.city || ''}
                          onValueChange={(value) => handleFilterChange('city', value || undefined)}
                        >
                          <SelectTrigger className="border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder={t('events:filters.allLocations')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('events:filters.allLocations')}</SelectItem>
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
                        <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">
                          {t('events:filters.price')}
                        </label>
                        <Select
                          value={filters.priceType || ''}
                          onValueChange={(value) => handleFilterChange('priceType', value || undefined)}
                        >
                          <SelectTrigger className="border-slate-300 dark:border-slate-700">
                            <SelectValue placeholder={t('events:filters.all')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('events:filters.all')}</SelectItem>
                            <SelectItem value="free">{t('events:filters.free')}</SelectItem>
                            <SelectItem value="paid">{t('events:filters.paid')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort Filter */}
                      <div>
                        <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">
                          {t('events:filters.sortBy')}
                        </label>
                        <Select
                          value={filters.sortBy || 'date'}
                          onValueChange={(value) => handleFilterChange('sortBy', value)}
                        >
                          <SelectTrigger className="border-slate-300 dark:border-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">{t('events:filters.date')}</SelectItem>
                            <SelectItem value="popular">{t('events:filters.popular')}</SelectItem>
                            <SelectItem value="rating">{t('events:filters.rating')}</SelectItem>
                            <SelectItem value="price">{t('events:filters.priceSort')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <Button 
                        variant="ghost" 
                        onClick={clearFilters}
                        className="text-slate-600 dark:text-slate-400"
                      >
                        {t('events:search.clearFilters')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        {/* Content - Evelya Style */}
        <section className="py-12 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Count */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {pagination.total > 0 ? (
                    t('events:results.found_plural', { count: pagination.total })
                  ) : (
                    t('events:results.noResults')
                  )}
                </p>
                {activeFiltersCount > 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {t('events:results.activeFilters_plural', { count: activeFiltersCount })}
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">{t('events:loading.events')}</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex p-3 rounded-xl bg-red-100 dark:bg-red-900/30 mb-4">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <Button 
                    onClick={loadEvents}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('events:error.retry')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Events Grid - Evelya Style */}
            {!loading && !error && events.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>

                {/* Pagination - Evelya Style */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="border-slate-300 dark:border-slate-700"
                    >
                      {t('events:pagination.previous')}
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
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'border-slate-300 dark:border-slate-700'
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
                      className="border-slate-300 dark:border-slate-700"
                    >
                      {t('events:pagination.next')}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Empty State - Evelya Style */}
            {!loading && !error && events.length === 0 && (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-16 text-center">
                  <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6">
                    <Calendar className="h-16 w-16 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    {t('events:results.noResults')}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                    {t('events:results.noResultsDescription')}
                  </p>
                  <Button 
                    onClick={clearFilters}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {t('events:search.clearFilters')}
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

// Server-side translations
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['events', 'common'])),
    },
  };
}
