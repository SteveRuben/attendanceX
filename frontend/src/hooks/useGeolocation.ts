/**
 * Hook pour la gestion de la géolocalisation
 */

import { useState, useEffect, useCallback } from 'react';
import { GeoLocation } from '@attendance-x/shared';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface GeolocationState {
  location: GeoLocation | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
  permission: PermissionState | null;
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: false,
    error: null,
    supported: 'geolocation' in navigator,
    permission: null
  });

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout ?? 10000,
    maximumAge: options.maximumAge ?? 300000 // 5 minutes
  };

  // Vérifier les permissions
  const checkPermission = useCallback(async () => {
    if (!state.supported) return;

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permission: permission.state }));
      
      // Écouter les changements de permission
      permission.addEventListener('change', () => {
        setState(prev => ({ ...prev, permission: permission.state }));
      });
    } catch (err) {
      console.warn('Permission API not supported');
    }
  }, [state.supported]);

  // Obtenir la position actuelle
  const getCurrentPosition = useCallback((): Promise<GeoLocation> => {
    return new Promise((resolve, reject) => {
      if (!state.supported) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: new Date(position.timestamp)
          };

          setState(prev => ({
            ...prev,
            location,
            loading: false,
            error: null
          }));

          resolve(location);
        },
        (error) => {
          let errorMessage = 'Erreur de géolocalisation';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission de géolocalisation refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position non disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Délai d\'attente dépassé pour la géolocalisation';
              break;
          }

          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));

          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, [state.supported, defaultOptions]);

  // Demander la localisation
  const requestLocation = useCallback(async () => {
    try {
      await getCurrentPosition();
    } catch (err) {
      console.error('Failed to get location:', err);
    }
  }, [getCurrentPosition]);

  // Surveiller la position
  const watchPosition = useCallback(() => {
    if (!state.supported || !options.watchPosition) return null;

    setState(prev => ({ ...prev, loading: true, error: null }));

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: new Date(position.timestamp)
        };

        setState(prev => ({
          ...prev,
          location,
          loading: false,
          error: null
        }));
      },
      (error) => {
        let errorMessage = 'Erreur de géolocalisation';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé pour la géolocalisation';
            break;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }));
      },
      defaultOptions
    );

    return watchId;
  }, [state.supported, options.watchPosition, defaultOptions]);

  // Arrêter la surveillance
  const clearWatch = useCallback((watchId: number) => {
    if (state.supported) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, [state.supported]);

  // Calculer la distance entre deux points
  const calculateDistance = useCallback((
    location1: GeoLocation,
    location2: GeoLocation
  ): number => {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = location1.latitude * Math.PI / 180;
    const φ2 = location2.latitude * Math.PI / 180;
    const Δφ = (location2.latitude - location1.latitude) * Math.PI / 180;
    const Δλ = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }, []);

  // Vérifier si une position est dans une zone autorisée
  const isLocationAllowed = useCallback((
    currentLocation: GeoLocation,
    allowedLocations: GeoLocation[],
    radius: number = 100
  ): boolean => {
    return allowedLocations.some(allowedLocation => {
      const distance = calculateDistance(currentLocation, allowedLocation);
      return distance <= radius;
    });
  }, [calculateDistance]);

  // Obtenir l'adresse à partir des coordonnées (géocodage inverse)
  const getAddressFromCoordinates = useCallback(async (
    location: GeoLocation
  ): Promise<string | null> => {
    try {
      // Utiliser l'API de géocodage inverse (exemple avec OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.display_name || null;
      }
      
      return null;
    } catch (err) {
      console.error('Failed to get address:', err);
      return null;
    }
  }, []);

  // Formater les coordonnées pour l'affichage
  const formatCoordinates = useCallback((location: GeoLocation, precision: number = 6): string => {
    return `${location.latitude.toFixed(precision)}, ${location.longitude.toFixed(precision)}`;
  }, []);

  // Obtenir la précision en texte
  const getAccuracyText = useCallback((accuracy?: number): string => {
    if (!accuracy) return 'Précision inconnue';
    
    if (accuracy <= 5) return 'Très précis';
    if (accuracy <= 20) return 'Précis';
    if (accuracy <= 100) return 'Moyennement précis';
    return 'Peu précis';
  }, []);

  // Vérifier les permissions au montage
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Surveiller la position si demandé
  useEffect(() => {
    if (options.watchPosition) {
      const watchId = watchPosition();
      
      return () => {
        if (watchId !== null) {
          clearWatch(watchId);
        }
      };
    }
  }, [options.watchPosition, watchPosition, clearWatch]);

  return {
    location: state.location,
    loading: state.loading,
    error: state.error,
    supported: state.supported,
    permission: state.permission,
    getCurrentPosition,
    requestLocation,
    watchPosition,
    clearWatch,
    calculateDistance,
    isLocationAllowed,
    getAddressFromCoordinates,
    formatCoordinates,
    getAccuracyText
  };
};