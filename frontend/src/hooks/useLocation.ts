/**
 * useLocation Hook
 * 
 * Manages location state including user position, selected city, and radius.
 * Persists state to localStorage for better UX.
 */

import { useState, useEffect, useCallback } from 'react';
import { City } from '@/components/location/LocationSelector';
import { 
  locationService, 
  Coordinates, 
  GeolocationError, 
  GeolocationErrorType 
} from '@/services/locationService';

/**
 * Location state interface
 */
export interface LocationState {
  currentPosition: Coordinates | null;
  selectedCity: City | null;
  radius: number;
  loading: boolean;
  error: string | null;
}

/**
 * useLocation return interface
 */
export interface UseLocationReturn extends LocationState {
  detectPosition: () => Promise<void>;
  selectCity: (city: City) => void;
  setRadius: (radius: number) => void;
  clearLocation: () => void;
  clearError: () => void;
}

/**
 * LocalStorage keys
 */
const STORAGE_KEYS = {
  POSITION: 'attendancex_user_position',
  CITY: 'attendancex_selected_city',
  RADIUS: 'attendancex_radius',
} as const;

/**
 * Default radius in kilometers
 */
const DEFAULT_RADIUS = 25;

/**
 * useLocation Hook
 * 
 * @returns UseLocationReturn
 * 
 * @example
 * const { 
 *   currentPosition, 
 *   selectedCity, 
 *   radius, 
 *   loading, 
 *   error,
 *   detectPosition,
 *   selectCity,
 *   setRadius,
 *   clearLocation 
 * } = useLocation();
 */
export const useLocation = (): UseLocationReturn => {
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [radius, setRadiusState] = useState<number>(DEFAULT_RADIUS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load state from localStorage on mount
   */
  useEffect(() => {
    try {
      // Load position
      const savedPosition = localStorage.getItem(STORAGE_KEYS.POSITION);
      if (savedPosition) {
        const position = JSON.parse(savedPosition);
        if (locationService.isValidCoordinates(position)) {
          setCurrentPosition(position);
        }
      }

      // Load city
      const savedCity = localStorage.getItem(STORAGE_KEYS.CITY);
      if (savedCity) {
        setSelectedCity(JSON.parse(savedCity));
      }

      // Load radius
      const savedRadius = localStorage.getItem(STORAGE_KEYS.RADIUS);
      if (savedRadius) {
        const parsedRadius = parseInt(savedRadius, 10);
        if (!isNaN(parsedRadius) && parsedRadius >= 5 && parsedRadius <= 100) {
          setRadiusState(parsedRadius);
        }
      }
    } catch (err) {
      console.error('Error loading location state from localStorage:', err);
    }
  }, []);

  /**
   * Detect user position using geolocation
   */
  const detectPosition = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await locationService.getCurrentPosition();
      
      setCurrentPosition(position);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.POSITION, JSON.stringify(position));

      // Try to get city name from coordinates
      const cityName = await locationService.getCityFromCoordinates(position);
      if (cityName) {
        const detectedCity: City = {
          id: 'detected',
          name: cityName,
          country: 'Detected',
          coordinates: position,
        };
        setSelectedCity(detectedCity);
        localStorage.setItem(STORAGE_KEYS.CITY, JSON.stringify(detectedCity));
      }
    } catch (err) {
      if (err instanceof GeolocationError) {
        switch (err.type) {
          case GeolocationErrorType.PERMISSION_DENIED:
            setError('location:errors.permissionDenied');
            break;
          case GeolocationErrorType.POSITION_UNAVAILABLE:
            setError('location:errors.unavailable');
            break;
          case GeolocationErrorType.TIMEOUT:
            setError('location:errors.timeout');
            break;
          default:
            setError('location:errors.unknown');
        }
      } else {
        setError('location:errors.unknown');
      }
      console.error('Error detecting position:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select a city manually
   */
  const selectCity = useCallback((city: City) => {
    setSelectedCity(city);
    
    // If city has coordinates, set as current position
    if (city.coordinates) {
      setCurrentPosition(city.coordinates);
      localStorage.setItem(STORAGE_KEYS.POSITION, JSON.stringify(city.coordinates));
    }
    
    // Save city to localStorage
    localStorage.setItem(STORAGE_KEYS.CITY, JSON.stringify(city));
    
    // Clear any errors
    setError(null);
  }, []);

  /**
   * Set radius for distance filtering
   */
  const setRadius = useCallback((newRadius: number) => {
    if (newRadius >= 5 && newRadius <= 100) {
      setRadiusState(newRadius);
      localStorage.setItem(STORAGE_KEYS.RADIUS, newRadius.toString());
    }
  }, []);

  /**
   * Clear all location data
   */
  const clearLocation = useCallback(() => {
    setCurrentPosition(null);
    setSelectedCity(null);
    setRadiusState(DEFAULT_RADIUS);
    setError(null);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.POSITION);
    localStorage.removeItem(STORAGE_KEYS.CITY);
    localStorage.removeItem(STORAGE_KEYS.RADIUS);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentPosition,
    selectedCity,
    radius,
    loading,
    error,
    detectPosition,
    selectCity,
    setRadius,
    clearLocation,
    clearError,
  };
};

export default useLocation;
