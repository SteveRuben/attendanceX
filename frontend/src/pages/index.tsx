/**
 * Page d'accueil - Evelya-inspired Design
 * Design épuré et moderne inspiré de https://evelya.co/
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
  Loader2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Event {
  id: string;
  title: string;
  slug?: string;
  description: string;
  coverImage?: string;
  category: string;
  startDate: string | Date;
  endDate?: string | Date;
  location: {
    name?: string;
    address: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  price?: {
    amount: number;
    currency: string;
    isFree: boolean;
  };
  participants?: {
    current: number;
    max?: number;
  };
  organizer?: {
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
    { id: 'all', label: t('events:categories.all') },
    { id: 'music', label: t('events:categories.music') },
    { id: 'sport', label: t('events:categories.sport') },
    { id: 'conference', label: t('events:categories.conference') },
    { id: 'festival', label: t('events:categories.festival') },
    { id: 'workshop', label: t('events:categories.workshop') },
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
        
        // Transform EventItem to Event interface
        const transformedEvents: Event[] = response.events.map((item: any) => ({
          id: item.id,
          title: item.title || item.name,
          slug: item.slug || item.id,
          description: item.description || '',
          coverImage: item.coverImage || undefined,
          category: item.type || item.category || 'other',
          startDate: item.startTime || item.startDateTime || new Date().toISOString(),
          endDate: item.endDateTime || item.endTime,
          location: {
            name: item.location?.name,
            address: item.location?.address || '',
            city: item.location?.city || item.location?.name || 'Unknown',
            coordinates: item.location?.coordinates,
          },
          price: item.price ? {
            amount: item.price.amount || 0,
            currency: item.price.currency || 'EUR',
            isFree: item.price.isFree || item.price.type === 'free',
          } : {
            amount: 0,
            currency: 'EUR',
            isFree: true,
          },
          participants: item.participants ? {
            current: item.participants.current || item.attendeesCount || 0,
            max: item.participants.max || item.maxParticipants,
          } : {
            current: item.attendeesCount || 0,
            max: item.maxParticipants,
          },
          organizer: item.organizer,
        }));
        
        if (page === 1) {
          setEvents(transformedEvents);
        } else {
          setEvents(prev => [...prev, ...transformedEvents]);
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
    result = applyFilters(result);

    if (currentPosition) {
      result = result.map(event => ({
        ...event,
        distance: calculateDistance(
          currentPosition,
          event.location.coordinates
        ),
      }));

      if (radius) {
        result = result.filter(event => (event as any).distance <= radius);
      }

      if (!filters.sortBy || filters.sortBy === 'distance') {
        result.sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));
      }
    }

    setFilteredEvents(result);
  }, [events, filters, currentPosition, radius]);

  const calculateDistance = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number } | undefined
  ): number => {
    if (!to) return 0;
    
    const R = 6371;
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

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
        {/* Hero Section - Evelya Style */}
        <section className="relative py-20 sm:py-32 bg-white dark:bg-slate-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-slate-700 dark:text-slate-300">
                {t('events:hero.badge')}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-6">
              {t('events:hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
              {t('events:hero.subtitle')}
            </p>

            {/* Search Bar - Centered */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('events:search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-900 text-base"
                  aria-label={t('events:search.label')}
                />
              </div>
            </div>

            {/* Location Selector - Inline */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>{t('location:current_location')}:</span>
              </div>
              
              <div className="flex-1 w-full sm:w-auto max-w-md">
                <LocationSelector
                  onCitySelect={selectCity}
                  onNearMeClick={detectPosition}
                  currentCity={selectedCity || undefined}
                  isDetecting={locationLoading}
                />
              </div>
            </div>

            {locationError && (
              <div className="mt-4 text-sm text-red-600 dark:text-red-400">
                {locationError}
              </div>
            )}
          </div>
        </section>

        {/* Category Filters - Clean */}
        <section className="py-6 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3 flex-wrap">
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
        </section>

        {/* Events Grid - Spacious */}
        <section className="py-16 bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Counter */}
            <div className="mb-12 text-center">
              {loading && page === 1 ? (
                <span className="text-slate-600 dark:text-slate-400">{t('common:loading')}...</span>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('events:results.count', { count: filteredEvents.length })}
                    {selectedCity && ` ${t('events:results.in')} ${selectedCity.name}`}
                  </p>
                  {filteredEvents.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {t('events:filters.clear')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && page === 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden"
                  >
                    <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {t('events:empty.title')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      distance={(event as any).distance}
                    />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && !loading && (
                  <div className="mt-16 text-center">
                    <Button
                      onClick={handleLoadMore}
                      size="lg"
                      variant="outline"
                      className="h-12 px-8 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl font-medium"
                    >
                      {t('events:load_more')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}

                {loading && page > 1 && (
                  <div className="mt-16 flex justify-center">
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
