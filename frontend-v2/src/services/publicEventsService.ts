/**
 * Service pour les événements publics
 * API client pour les endpoints publics (sans authentification)
 */

import { apiClient } from './apiClient';
import { clientCache } from '../lib/cache';

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  coverImage: string;
  images: string[];
  organizerId: string;
  organizerName: string;
  organizerSlug: string;
  organizerAvatar?: string;
  organizerRating: number;
  startDate: string;
  endDate: string;
  timezone: string;
  location: {
    type: 'physical' | 'online' | 'hybrid';
    venue?: string;
    address?: string;
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  category: string;
  tags: string[];
  pricing: {
    type: 'free' | 'paid';
    amount?: number;
    currency?: string;
    earlyBird?: {
      amount: number;
      deadline: string;
    };
  };
  capacity: {
    total: number;
    available: number;
    registered: number;
  };
  rating: {
    average: number;
    count: number;
  };
  visibility: 'public' | 'private' | 'unlisted';
  featured: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
  };
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicOrganizer {
  id: string;
  slug: string;
  name: string;
  avatar?: string;
  coverImage?: string;
  bio: string;
  location: {
    city: string;
    country: string;
  };
  website?: string;
  social: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
  stats: {
    totalEvents: number;
    upcomingEvents: number;
    totalAttendees: number;
    rating: number;
    reviewCount: number;
  };
  verified: boolean;
  createdAt: string;
}

export interface PublicEventFilters {
  search?: string;
  city?: string;
  country?: string;
  locationType?: 'physical' | 'online' | 'hybrid';
  startDate?: string;
  endDate?: string;
  category?: string;
  tags?: string[];
  priceType?: 'free' | 'paid';
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'popular' | 'rating' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface PublicEventsResponse {
  events: PublicEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
    cities: string[];
    countries: string[];
  };
}

export interface PublicEventDetailResponse {
  event: PublicEvent;
  organizer: PublicOrganizer;
  similarEvents: PublicEvent[];
}

export interface PublicOrganizerResponse {
  organizer: PublicOrganizer;
  upcomingEvents: PublicEvent[];
  pastEvents: PublicEvent[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  icon?: string;
}

export interface Location {
  city: string;
  country: string;
  count: number;
}

const CACHE_TTL = {
  EVENTS_LIST: 5 * 60 * 1000, // 5 minutes
  EVENT_DETAIL: 10 * 60 * 1000, // 10 minutes
  ORGANIZER: 10 * 60 * 1000, // 10 minutes
  CATEGORIES: 30 * 60 * 1000, // 30 minutes
  LOCATIONS: 30 * 60 * 1000, // 30 minutes
};

export const publicEventsService = {
  /**
   * Obtenir la liste des événements publics
   */
  async getPublicEvents(filters: PublicEventFilters = {}): Promise<PublicEventsResponse> {
    const cacheKey = `public-events-${JSON.stringify(filters)}`;
    
    return clientCache.getOrSet(
      cacheKey,
      async () => {
        const params = new URLSearchParams();
        
        if (filters.search) params.append('search', filters.search);
        if (filters.city) params.append('city', filters.city);
        if (filters.country) params.append('country', filters.country);
        if (filters.locationType) params.append('locationType', filters.locationType);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.category) params.append('category', filters.category);
        if (filters.tags) params.append('tags', filters.tags.join(','));
        if (filters.priceType) params.append('priceType', filters.priceType);
        if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.featured) params.append('featured', 'true');
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await apiClient.request<{ data: PublicEventsResponse }>({
          method: 'GET',
          url: `/public/events?${params.toString()}`,
          requiresAuth: false,
        });

        return response.data;
      },
      CACHE_TTL.EVENTS_LIST
    );
  },

  /**
   * Obtenir le détail d'un événement public
   */
  async getPublicEventBySlug(slug: string): Promise<PublicEventDetailResponse> {
    const cacheKey = `public-event-${slug}`;
    
    return clientCache.getOrSet(
      cacheKey,
      async () => {
        const response = await apiClient.request<{ data: PublicEventDetailResponse }>({
          method: 'GET',
          url: `/public/events/${slug}`,
          requiresAuth: false,
        });

        return response.data;
      },
      CACHE_TTL.EVENT_DETAIL
    );
  },

  /**
   * Obtenir le profil public d'un organisateur
   */
  async getPublicOrganizerBySlug(slug: string): Promise<PublicOrganizerResponse> {
    const cacheKey = `public-organizer-${slug}`;
    
    return clientCache.getOrSet(
      cacheKey,
      async () => {
        const response = await apiClient.request<{ data: PublicOrganizerResponse }>({
          method: 'GET',
          url: `/public/organizers/${slug}`,
          requiresAuth: false,
        });

        return response.data;
      },
      CACHE_TTL.ORGANIZER
    );
  },

  /**
   * Obtenir les catégories disponibles
   */
  async getPublicCategories(): Promise<Category[]> {
    const cacheKey = 'public-categories';
    
    return clientCache.getOrSet(
      cacheKey,
      async () => {
        const response = await apiClient.request<{ data: { categories: Category[] } }>({
          method: 'GET',
          url: '/public/categories',
          requiresAuth: false,
        });

        return response.data.categories;
      },
      CACHE_TTL.CATEGORIES
    );
  },

  /**
   * Obtenir les lieux populaires
   */
  async getPublicLocations(): Promise<Location[]> {
    const cacheKey = 'public-locations';
    
    return clientCache.getOrSet(
      cacheKey,
      async () => {
        const response = await apiClient.request<{ data: { locations: Location[] } }>({
          method: 'GET',
          url: '/public/locations',
          requiresAuth: false,
        });

        return response.data.locations;
      },
      CACHE_TTL.LOCATIONS
    );
  },

  /**
   * Invalider le cache pour un événement spécifique
   */
  invalidateEventCache(slug: string): void {
    clientCache.delete(`public-event-${slug}`);
  },

  /**
   * Invalider tout le cache des événements
   */
  invalidateAllCache(): void {
    clientCache.clear();
  },
};
