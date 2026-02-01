/**
 * InteractiveMap Component - Google Maps Integration
 * Displays events on an interactive map with markers and clustering
 * Design: Evelya + Polaris standards
 */

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { useTranslation } from 'next-i18next';
import { MapPin, Calendar, Users, ExternalLink, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  startDate: string;
  location: {
    address: string;
    city: string;
    coordinates: Coordinates;
  };
  category?: string;
  price?: number;
  isFree?: boolean;
  participantsCount?: number;
}

interface InteractiveMapProps {
  events: Event[];
  center?: Coordinates;
  zoom?: number;
  onEventClick?: (eventId: string) => void;
  onMapClick?: (coords: Coordinates) => void;
  userPosition?: Coordinates | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 48.8566,
  lng: 2.3522,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export default function InteractiveMap({
  events,
  center,
  zoom = 12,
  onEventClick,
  onMapClick,
  userPosition,
}: InteractiveMapProps) {
  const { t } = useTranslation(['events', 'common']);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const mapCenter = useMemo(() => {
    if (center) {
      return { lat: center.latitude, lng: center.longitude };
    }
    if (userPosition) {
      return { lat: userPosition.latitude, lng: userPosition.longitude };
    }
    if (events.length > 0 && events[0].location?.coordinates) {
      return {
        lat: events[0].location.coordinates.latitude,
        lng: events[0].location.coordinates.longitude,
      };
    }
    return defaultCenter;
  }, [center, userPosition, events]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (event: Event) => {
    setSelectedEvent(event);
    if (onEventClick) {
      onEventClick(event.id);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng && onMapClick) {
      onMapClick({
        latitude: e.latLng.lat(),
        longitude: e.latLng.lng(),
      });
    }
    setSelectedEvent(null);
  };

  const handleRecenter = () => {
    if (map && userPosition) {
      map.panTo({ lat: userPosition.latitude, lng: userPosition.longitude });
      map.setZoom(14);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (event: Event) => {
    if (event.isFree) {
      return t('events:card.free');
    }
    if (event.price) {
      return `${t('events:card.from')} ${event.price}€`;
    }
    return t('events:card.free');
  };

  // Filter events with valid coordinates
  const validEvents = useMemo(() => {
    return events.filter(
      (event) =>
        event.location?.coordinates?.latitude &&
        event.location?.coordinates?.longitude
    );
  }, [events]);

  return (
    <div className="relative">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={zoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={mapOptions}
        >
          {/* User position marker */}
          {userPosition && (
            <Marker
              position={{
                lat: userPosition.latitude,
                lng: userPosition.longitude,
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
              title={t('location:your_position')}
            />
          )}

          {/* Event markers with clustering */}
          <MarkerClusterer
            options={{
              imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
              gridSize: 60,
              maxZoom: 15,
            }}
          >
            {(clusterer) => (
              <>
                {validEvents.map((event) => (
                  <Marker
                    key={event.id}
                    position={{
                      lat: event.location.coordinates.latitude,
                      lng: event.location.coordinates.longitude,
                    }}
                    onClick={() => handleMarkerClick(event)}
                    clusterer={clusterer}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#3b82f6"/>
                          <circle cx="16" cy="16" r="8" fill="white"/>
                        </svg>
                      `),
                      scaledSize: new google.maps.Size(32, 40),
                      anchor: new google.maps.Point(16, 40),
                    }}
                  />
                ))}
              </>
            )}
          </MarkerClusterer>

          {/* Info Window for selected event */}
          {selectedEvent && (
            <InfoWindow
              position={{
                lat: selectedEvent.location.coordinates.latitude,
                lng: selectedEvent.location.coordinates.longitude,
              }}
              onCloseClick={() => setSelectedEvent(null)}
            >
              <Card className="border-0 shadow-none max-w-xs">
                <CardContent className="p-0">
                  {selectedEvent.coverImage && (
                    <div className="relative w-full h-32 mb-3">
                      <img
                        src={selectedEvent.coverImage}
                        alt={selectedEvent.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                      {selectedEvent.category && (
                        <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
                          {selectedEvent.category}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-base text-slate-900 line-clamp-2">
                      {selectedEvent.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(selectedEvent.startDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{selectedEvent.location.city}</span>
                    </div>
                    
                    {selectedEvent.participantsCount !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="h-4 w-4" />
                        <span>{t('events:participants.count', { count: selectedEvent.participantsCount })}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-blue-600">
                        {formatPrice(selectedEvent)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => window.open(`/events/${selectedEvent.slug}`, '_blank')}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs"
                      >
                        {t('events:card.viewDetails')}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* Recenter button */}
      {userPosition && (
        <Button
          onClick={handleRecenter}
          className="absolute bottom-6 right-6 bg-white hover:bg-slate-50 text-slate-900 shadow-lg border border-slate-200 h-12 w-12 p-0"
          aria-label={t('location:recenter')}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
