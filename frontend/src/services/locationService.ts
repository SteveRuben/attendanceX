/**
 * Location Service
 * 
 * Provides geolocation and distance calculation functionality.
 * Uses the Haversine formula for accurate distance calculations.
 */

import { City } from '@/components/location/LocationSelector';

/**
 * Coordinates interface
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geolocation error types
 */
export enum GeolocationErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Geolocation error class
 */
export class GeolocationError extends Error {
  constructor(
    public type: GeolocationErrorType,
    message: string
  ) {
    super(message);
    this.name = 'GeolocationError';
  }
}

/**
 * Location Service
 */
export class LocationService {
  /**
   * Get current user position using browser geolocation API
   * 
   * @returns Promise<Coordinates>
   * @throws GeolocationError
   */
  async getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new GeolocationError(
          GeolocationErrorType.POSITION_UNAVAILABLE,
          'Geolocation is not supported by this browser'
        ));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorType: GeolocationErrorType;
          let errorMessage: string;

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorType = GeolocationErrorType.PERMISSION_DENIED;
              errorMessage = 'User denied the request for geolocation';
              break;
            case error.POSITION_UNAVAILABLE:
              errorType = GeolocationErrorType.POSITION_UNAVAILABLE;
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorType = GeolocationErrorType.TIMEOUT;
              errorMessage = 'The request to get user location timed out';
              break;
            default:
              errorType = GeolocationErrorType.UNKNOWN;
              errorMessage = 'An unknown error occurred';
          }

          reject(new GeolocationError(errorType, errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * 
   * @param from - Starting coordinates
   * @param to - Destination coordinates
   * @returns Distance in kilometers
   */
  calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLat = this.toRadians(to.latitude - from.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Convert degrees to radians
   * 
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Search cities by query
   * 
   * @param query - Search query
   * @param cities - List of cities to search
   * @returns Filtered cities
   */
  searchCities(query: string, cities: City[]): City[] {
    if (!query.trim()) {
      return cities;
    }

    const lowerQuery = query.toLowerCase();
    
    return cities.filter(city =>
      city.name.toLowerCase().includes(lowerQuery) ||
      city.country.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get nearby events within a radius
   * 
   * @param userPosition - User's current position
   * @param events - List of events with coordinates
   * @param radius - Radius in kilometers
   * @returns Events within radius with calculated distances
   */
  getNearbyEvents<T extends { location: { coordinates?: Coordinates } }>(
    userPosition: Coordinates,
    events: T[],
    radius: number
  ): Array<T & { distance: number }> {
    return events
      .filter(event => event.location.coordinates)
      .map(event => ({
        ...event,
        distance: this.calculateDistance(
          userPosition,
          event.location.coordinates!
        ),
      }))
      .filter(event => event.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Sort events by distance from user position
   * 
   * @param userPosition - User's current position
   * @param events - List of events with coordinates
   * @returns Events sorted by distance
   */
  sortByDistance<T extends { location: { coordinates?: Coordinates } }>(
    userPosition: Coordinates,
    events: T[]
  ): Array<T & { distance: number }> {
    return events
      .filter(event => event.location.coordinates)
      .map(event => ({
        ...event,
        distance: this.calculateDistance(
          userPosition,
          event.location.coordinates!
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if coordinates are valid
   * 
   * @param coords - Coordinates to validate
   * @returns True if valid
   */
  isValidCoordinates(coords: Coordinates): boolean {
    return (
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      coords.longitude >= -180 &&
      coords.longitude <= 180
    );
  }

  /**
   * Get city from coordinates (reverse geocoding)
   * Note: This requires Google Maps Geocoding API
   * 
   * @param coords - Coordinates
   * @returns City name or null
   */
  async getCityFromCoordinates(coords: Coordinates): Promise<string | null> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return null;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        // Find the locality (city) component
        const result = data.results[0];
        const cityComponent = result.address_components.find(
          (component: any) => component.types.includes('locality')
        );

        return cityComponent?.long_name || null;
      }

      return null;
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      return null;
    }
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export for testing
export default locationService;
