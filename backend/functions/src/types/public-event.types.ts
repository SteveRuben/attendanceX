/**
 * Types pour les événements publics
 * Endpoints accessibles sans authentification
 */

export interface PublicEvent {
  // Identifiants
  id: string;
  slug: string; // URL-friendly: "tech-conference-2026-paris"
  
  // Informations de base
  title: string;
  description: string;
  shortDescription: string; // 160 caractères max pour SEO
  coverImage: string;
  images: string[];
  
  // Organisateur
  organizerId: string;
  organizerName: string;
  organizerSlug: string;
  organizerAvatar?: string;
  organizerRating: number;
  
  // Date et lieu
  startDate: Date;
  endDate: Date;
  timezone: string;
  location: EventLocation;
  
  // Catégorie et tags
  category: string;
  tags: string[];
  
  // Pricing
  pricing: EventPricing;
  
  // Capacité
  capacity: EventCapacity;
  
  // Ratings et reviews
  rating: EventRating;
  
  // Visibilité
  visibility: 'public' | 'private' | 'unlisted';
  featured: boolean;
  
  // SEO
  seo: EventSEO;
  
  // Timestamps
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventLocation {
  type: 'physical' | 'online' | 'hybrid';
  venue?: string;
  address?: string;
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface EventPricing {
  type: 'free' | 'paid';
  amount?: number;
  currency?: string;
  earlyBird?: {
    amount: number;
    deadline: Date;
  };
}

export interface EventCapacity {
  total: number;
  available: number;
  registered: number;
}

export interface EventRating {
  average: number; // 0-5
  count: number;
}

export interface EventSEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: string;
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
  createdAt: Date;
}

export interface PublicEventFilters {
  // Recherche
  search?: string;
  
  // Localisation
  city?: string;
  country?: string;
  locationType?: 'physical' | 'online' | 'hybrid';
  
  // Date
  startDate?: Date;
  endDate?: Date;
  
  // Catégorie
  category?: string;
  tags?: string[];
  
  // Prix
  priceType?: 'free' | 'paid';
  minPrice?: number;
  maxPrice?: number;
  
  // Autres
  featured?: boolean;
  
  // Pagination
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'popular' | 'rating' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface PublicEventListResponse {
  success: true;
  data: {
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
  };
}

export interface PublicEventDetailResponse {
  success: true;
  data: {
    event: PublicEvent;
    organizer: PublicOrganizer;
    similarEvents: PublicEvent[];
  };
}

export interface PublicOrganizerResponse {
  success: true;
  data: {
    organizer: PublicOrganizer;
    upcomingEvents: PublicEvent[];
    pastEvents: PublicEvent[];
  };
}

export interface PublicCategoriesResponse {
  success: true;
  data: {
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      count: number;
      icon?: string;
    }>;
  };
}

export interface PublicLocationsResponse {
  success: true;
  data: {
    locations: Array<{
      city: string;
      country: string;
      count: number;
    }>;
  };
}
