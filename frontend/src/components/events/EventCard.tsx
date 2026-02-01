import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Calendar, MapPin, Users, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'next-i18next';
import { format, Locale } from 'date-fns';
import { fr, enUS, es, de } from 'date-fns/locale';

/**
 * Event interface matching backend Event type
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  category: string;
  startDate: Date | string;
  endDate?: Date | string;
  location: {
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
  slug?: string;
}

/**
 * EventCard Props
 */
export interface EventCardProps {
  event: Event;
  distance?: number; // Distance in kilometers
  onFavoriteToggle?: (eventId: string) => void;
  isFavorite?: boolean;
  className?: string;
}

/**
 * Get locale for date-fns based on i18n language
 */
const getDateLocale = (lang: string): Locale => {
  const locales: Record<string, Locale> = { 
    fr, 
    en: enUS, 
    es, 
    de 
  };
  return locales[lang] || enUS;
};

/**
 * EventCard Component
 * 
 * Displays an event card with image, category, distance badge, favorite toggle,
 * date/time, location, participants, price, and action button.
 * 
 * Features:
 * - 16:9 image ratio with rounded corners
 * - Category badge overlay (top-left)
 * - Distance badge (top-right, conditional)
 * - Favorite icon toggle (heart)
 * - Hover: elevation + image zoom
 * - Responsive design
 * - Accessibility compliant (WCAG 2.1 AA)
 */
export const EventCard: React.FC<EventCardProps> = ({
  event,
  distance,
  onFavoriteToggle,
  isFavorite = false,
  className = '',
}) => {
  const router = useRouter();
  const { t, i18n } = useTranslation(['events', 'common']);
  
  // Parse date if string
  const startDate = typeof event.startDate === 'string' 
    ? new Date(event.startDate) 
    : event.startDate;
  
  // Format date with locale
  const formattedDate = format(
    startDate,
    'EEE d MMM • HH:mm',
    { locale: getDateLocale(i18n.language) }
  );
  
  // Handle card click - navigate to event details
  const handleCardClick = () => {
    const slug = event.slug || event.id;
    router.push(`/events/${slug}`);
  };
  
  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onFavoriteToggle) {
      onFavoriteToggle(event.id);
    }
  };
  
  // Format price
  const priceDisplay = event.price?.isFree 
    ? t('events:price.free')
    : event.price 
      ? `${t('events:price.from')} ${event.price.amount}${event.price.currency}`
      : t('events:price.free');
  
  // Placeholder image if none provided
  const imageUrl = event.coverImage || '/images/event-placeholder.jpg';
  
  return (
    <Card 
      className={`
        group relative overflow-hidden cursor-pointer
        bg-white dark:bg-slate-800 
        border-2 border-slate-200 dark:border-slate-700 
        rounded-2xl shadow-sm 
        hover:shadow-2xl hover:border-transparent hover:-translate-y-2
        transition-all duration-300
        ${className}
      `}
      onClick={handleCardClick}
      role="article"
      aria-label={`${event.title} - ${formattedDate}`}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
      
      {/* Image Section */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={imageUrl}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Category Badge - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <Badge 
            className="
              px-3 py-1 rounded-full text-xs font-semibold
              bg-blue-600 text-white
              shadow-lg backdrop-blur-sm
            "
          >
            {event.category}
          </Badge>
        </div>
        
        {/* Distance Badge - Top Right (conditional) */}
        {distance !== undefined && (
          <div className="absolute top-4 right-4 z-10">
            <Badge 
              className="
                px-3 py-1 rounded-full text-xs font-semibold
                bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100
                shadow-lg backdrop-blur-sm
                border border-slate-200 dark:border-slate-700
              "
            >
              {t('events:distance.label', { distance: distance.toFixed(1) })}
            </Badge>
          </div>
        )}
        
        {/* Favorite Icon - Top Right (below distance if present) */}
        <button
          onClick={handleFavoriteClick}
          className={`
            absolute ${distance !== undefined ? 'top-16' : 'top-4'} right-4 z-10
            p-2 rounded-full
            bg-white/90 dark:bg-slate-800/90
            shadow-lg backdrop-blur-sm
            border border-slate-200 dark:border-slate-700
            hover:scale-110 transition-transform duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          aria-label={isFavorite ? t('events:favorite.remove') : t('events:favorite.add')}
        >
          <Heart 
            className={`h-5 w-5 ${
              isFavorite 
                ? 'fill-red-500 text-red-500' 
                : 'text-slate-600 dark:text-slate-400'
            }`}
          />
        </button>
      </div>
      
      {/* Content Section */}
      <CardContent className="relative p-6 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">
          {event.title}
        </h3>
        
        {/* Date/Time */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <time dateTime={startDate.toISOString()}>
            {formattedDate}
          </time>
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">
            {event.location.city}
          </span>
        </div>
        
        {/* Participants (if available) */}
        {event.participants && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              {t('events:participants.count', { count: event.participants.current })}
            </span>
          </div>
        )}
        
        {/* Price and Action Button */}
        <div className="flex items-center justify-between pt-2">
          {/* Price Badge */}
          <Badge 
            className={`
              px-3 py-1 rounded-full text-sm font-semibold
              ${event.price?.isFree 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }
            `}
          >
            {priceDisplay}
          </Badge>
          
          {/* Action Button */}
          <Button
            size="sm"
            className="
              h-9 px-4 
              bg-blue-600 hover:bg-blue-700 
              text-white font-medium rounded-lg
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            {t('events:actions.viewDetails')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCard;
