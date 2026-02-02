import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'next-i18next';

/**
 * Location interface
 */
export interface Location {
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * LocationSelector Props
 */
export interface LocationSelectorProps {
  onLocationDetected?: (location: Location) => void;
  className?: string;
}

/**
 * LocationSelector Component
 * 
 * Automatically detects user location on load and displays the city.
 * Users can also manually trigger location detection.
 * 
 * Features:
 * - Auto-detect location on component mount
 * - Display detected city with icon
 * - Manual "Near Me" button for re-detection
 * - Loading state (spinner)
 * - Error handling
 * - Accessibility
 * - Dark mode support
 * 
 * @example
 * <LocationSelector
 *   onLocationDetected={(location) => handleLocationChange(location)}
 * />
 */
export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationDetected,
  className = '',
}) => {
  const { t } = useTranslation(['location', 'common']);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reverse geocode coordinates to get city name
   */
  const reverseGeocode = async (latitude: number, longitude: number): Promise<Location> => {
    try {
      // Using Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${t('common:locale')}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown',
        country: data.address.country || 'Unknown',
        coordinates: { latitude, longitude },
      };
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      // Fallback location
      return {
        city: t('location:unknown'),
        country: '',
        coordinates: { latitude, longitude },
      };
    }
  };

  /**
   * Detect user location using browser geolocation API
   */
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError(t('location:errors.notSupported'));
      return;
    }

    setIsDetecting(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const location = await reverseGeocode(latitude, longitude);
      
      setDetectedLocation(location);
      setError(null);
      
      if (onLocationDetected) {
        onLocationDetected(location);
      }
    } catch (err: any) {
      console.error('Geolocation error:', err);
      
      let errorMessage = t('location:errors.generic');
      
      if (err.code === 1) {
        errorMessage = t('location:errors.denied');
      } else if (err.code === 2) {
        errorMessage = t('location:errors.unavailable');
      } else if (err.code === 3) {
        errorMessage = t('location:errors.timeout');
      }
      
      setError(errorMessage);
    } finally {
      setIsDetecting(false);
    }
  };

  /**
   * Auto-detect location on component mount
   */
  useEffect(() => {
    detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Detected Location Display */}
      {detectedLocation && !error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {detectedLocation.city}
            {detectedLocation.country && `, ${detectedLocation.country}`}
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <span className="text-sm text-red-700 dark:text-red-300">
            {error}
          </span>
        </div>
      )}

      {/* "Near Me" Button */}
      <Button
        onClick={detectLocation}
        disabled={isDetecting}
        className="
          h-12 px-6
          bg-blue-600 hover:bg-blue-700 active:bg-blue-800
          text-white font-medium rounded-lg
          flex items-center gap-2
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        aria-label={isDetecting ? t('location:nearMe.detecting') : t('location:nearMe.label')}
      >
        {isDetecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <span>{t('location:nearMe.detecting')}</span>
          </>
        ) : (
          <>
            <Navigation className="h-5 w-5" aria-hidden="true" />
            <span>{detectedLocation ? t('location:nearMe.refresh') : t('location:nearMe.button')}</span>
          </>
        )}
      </Button>
    </div>
  );
};

export default LocationSelector;
