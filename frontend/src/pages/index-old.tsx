/**
 * Page d'accueil - Events Discovery with Location
 * Design: Evelya + Polaris + Solstice
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { EventCard } from '@/components/events/EventCard';
import { CategoryBadge } from '@/components/events/CategoryBadge';
import { LocationSelector } from '@/components/location/LocationSelector';
import { useLocation } from '@/hooks/useLocation';
import { useEventFilters } from '@/hooks/useEventFilters';
import { eventsService } from '@/services/eventsService';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users,
  TrendingUp,
  Sparkles,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  category: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    address: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  price: {
    type: 'free' | 'paid';
    amount?: number;
    currency?: string;
  };
  participants: {
    registered: number;
    capacity: number;
  };
  organizer: {
    name: string;
    avatar?: string;
  };
}

export default function Home() {
  const { t } = useTranslation(['events', 'location', 'common']);
  
  // Location state
  const {
    currentPosition,
    selectedCity,
    radius,
    loading: locationLoading,
    error: locationError,
    detectPosition,
    selectCity,
    setRadius,
  } = useLocation();

  // Filter state
  const {
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
  } = useEventFilters();

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const EVENTS_PER_PAGE = 12;

  // Categories
  const categories = [
    { id: 'all', label: t('events:categories.all'), color: 'blue' },
    { id: 'music', label: t('events:categories.music'), color: 'purple' },
    { id: 'sport', label: t('events:categories.sport'), color: 'green' },
    { id: 'conference', label: t('events:categories.conference'), color: 'blue' },
    { id: 'festival', label: t('events:categories.festival'), color: 'pink' },
    { id: 'workshop', label: t('events:categories.workshop'), color: 'orange' },
    { id: 'networking', label: t('events:categories.networking'), color: 'teal' },
    { id: 'exhibition', label: t('events:categories.exhibition'), color: 'indigo' },
  ];

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsService.getPublicEvents({
          page,
          limit: EVENTS_PER_PAGE,
          category: selectedCategory || undefined,
          search: searchQuery || undefined,
        });
        
        if (page === 1) {
          setEvents(response.events);
        } else {
          setEvents(prev => [...prev, ...response.events]);
        }
        
        setHasMore(response.events.length === EVENTS_PER_PAGE);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, selectedCategory, searchQuery]);

  // Apply filters and calculate distances
  useEffect(() => {
    let result = [...events];

    // Apply filters
    result = applyFilters(result);

    // Calculate distances if position available
    if (currentPosition) {
      result = result.map(event => ({
        ...event,
        distance: calculateDistance(
          currentPosition,
          event.location.coordinates
        ),
      }));

      // Filter by radius
      if (radius) {
        result = result.filter(event => (event as any).distance <= radius);
      }

      // Sort by distance if no other sort
      if (!filters.sortBy || filters.sortBy === 'distance') {
        result.sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));
      }
    }

    setFilteredEvents(result);
  }, [events, filters, currentPosition, radius]);

  // Calculate distance using Haversine formula
  const calculateDistance = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      setSelectedCategory(null);
      updateFilter('category', undefined);
    } else {
      setSelectedCategory(categoryId);
      updateFilter('category', categoryId);
    }
    setPage(1);
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  // Handle load more
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <>
      <Head>
        <title>{t('events:page.title')} — AttendanceX</title>
        <meta name="description" content={t('events:page.description')} />
      </Head>

      <PublicLayout>
        {/* Hero Section with Gradient */}
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          {/* Animated Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 text-sm font-semibold mb-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {t('events:hero.badge')}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="block text-slate-900 dark:text-slate-100 mb-2">
                  {t('events:hero.title')}
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t('events:hero.subtitle')}
                </span>
              </h1>

              {/* Search Bar */}
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder={t('events:search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-12 h-14 rounded-xl border-2 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800 text-base shadow-lg"
                    aria-label={t('events:search.label')}
                  />
                </div>
              </div>
            </div>

            {/* Location Bar */}
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-4 p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>{t('location:current_location')}:</span>
                </div>
                
                <div className="flex-1 w-full md:w-auto">
                  <LocationSelector
                    onCitySelect={selectCity}
                    onNearMeClick={detectPosition}
                    currentCity={selectedCity}
                    isDetecting={locationLoading}
                  />
                </div>
              </div>

              {locationError && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {locationError}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section className="py-8 bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                <span>{t('events:filters.categories')}:</span>
              </div>
              
              <div className="flex gap-2">
                {categories.map((category) => (
                  <CategoryBadge
                    key={category.id}
                    category={category.label}
                    onClick={() => handleCategoryClick(category.id)}
                    active={
                      category.id === 'all'
                        ? !selectedCategory
                        : selectedCategory === category.id
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-12 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Counter */}
            <div className="mb-8 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {loading && page === 1 ? (
                  <span>{t('common:loading')}...</span>
                ) : (
                  <span>
                    {t('events:results.count', { count: filteredEvents.length })}
                    {selectedCity && ` ${t('events:results.in')} ${selectedCity.name}`}
                  </span>
                )}
              </div>

              {filteredEvents.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {t('events:filters.clear')}
                </Button>
              )}
            </div>

            {/* Loading State */}
            {loading && page === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
                  >
                    <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {t('events:empty.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
                  {t('events:empty.description')}
                </p>
                <Button
                  onClick={clearFilters}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t('events:empty.action')}
                </Button>
              </div>
            ) : (
              /* Events Grid */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <EventCard
                        event={event}
                        distance={(event as any).distance}
                      />
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && !loading && (
                  <div className="mt-12 text-center">
                    <Button
                      onClick={handleLoadMore}
                      size="lg"
                      variant="outline"
                      className="h-12 px-8 border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                    >
                      {t('events:load_more')}
                    </Button>
                  </div>
                )}

                {loading && page > 1 && (
                  <div className="mt-12 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </PublicLayout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'location'])),
    },
  };
};
