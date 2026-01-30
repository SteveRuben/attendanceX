/**
 * Composant EventCard
 * Carte d'événement réutilisable pour les listes
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Users, Star, Euro } from 'lucide-react';
import { PublicEvent } from '@/services/publicEventsService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EventCardProps {
  event: PublicEvent;
  variant?: 'grid' | 'list' | 'featured';
  showOrganizer?: boolean;
  showRating?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  variant = 'grid',
  showOrganizer = true,
  showRating = true,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = () => {
    if (event.pricing.type === 'free') {
      return 'Gratuit';
    }
    return `${event.pricing.amount}€`;
  };

  const availabilityPercentage = (event.capacity.available / event.capacity.total) * 100;
  const isAlmostFull = availabilityPercentage < 20;

  if (variant === 'list') {
    return (
      <Link href={`/events/${event.slug}`}>
        <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
          <CardContent className="p-0">
            <div className="flex gap-4">
              {/* Image */}
              <div className="relative w-48 h-32 flex-shrink-0">
                <Image
                  src={event.coverImage || '/placeholder-event.jpg'}
                  alt={event.title}
                  fill
                  className="object-cover rounded-l-lg"
                />
                {event.featured && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500">
                    ⭐ Featured
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 py-4 pr-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {event.title}
                    </h3>
                    {showOrganizer && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        par {event.organizerName}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{event.category}</Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {event.shortDescription}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(event.startDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location.city}
                  </div>
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
                    {formatPrice()}
                  </div>
                  {showRating && event.rating.count > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {event.rating.average.toFixed(1)} ({event.rating.count})
                    </div>
                  )}
                </div>

                {isAlmostFull && (
                  <Badge variant="destructive" className="mt-2">
                    Places limitées !
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Grid variant (default)
  return (
    <Link href={`/events/${event.slug}`}>
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer h-full">
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative w-full h-48">
            <Image
              src={event.coverImage || '/placeholder-event.jpg'}
              alt={event.title}
              fill
              className="object-cover rounded-t-lg"
            />
            {event.featured && (
              <Badge className="absolute top-2 right-2 bg-yellow-500">
                ⭐ Featured
              </Badge>
            )}
            <Badge className="absolute top-2 left-2" variant="outline">
              {event.category}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
              {event.title}
            </h3>

            {showOrganizer && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                par {event.organizerName}
              </p>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {event.shortDescription}
            </p>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(event.startDate)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {event.location.city}, {event.location.country}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {event.capacity.registered} / {event.capacity.total}
                </div>
                {showRating && event.rating.count > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {event.rating.average.toFixed(1)}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatPrice()}
              </span>
              {isAlmostFull && (
                <Badge variant="destructive" className="text-xs">
                  Places limitées
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
