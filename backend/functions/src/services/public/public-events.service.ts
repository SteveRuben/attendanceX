/**
 * Service pour les événements publics
 * Gère la logique métier pour les endpoints publics
 * 
 * ⚠️ SECURITY NOTE: This service handles PUBLIC endpoints.
 * - NO tenant scoping required (events are public by design)
 * - NO authentication required (accessible to anonymous users)
 * - Rate limiting applied at route level
 * - Only returns events with visibility='public' and status='published'
 * 
 * For authenticated/tenant-scoped event operations, use EventService instead.
 */

import { collections } from '../../config/database';
import { 
  PublicEvent, 
  PublicEventFilters, 
  PublicOrganizer,
  PublicEventListResponse,
  PublicEventDetailResponse,
  PublicOrganizerResponse,
  PublicCategoriesResponse,
  PublicLocationsResponse
} from '../../types/public-event.types';
import { NotFoundError, ValidationError } from '../../utils/common/errors';
import { PublicEventModel } from '../../models/public-event.model';
import { logger } from 'firebase-functions';

export class PublicEventsService {
  
  /**
   * Obtenir la liste des événements publics avec filtres
   */
  async getPublicEvents(filters: PublicEventFilters): Promise<PublicEventListResponse['data']> {
    try {
      logger.info('🔍 Starting getPublicEvents', { filters });

      // Validate input filters
      this.validateFilters(filters);

      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100); // Max 100
      const offset = (page - 1) * limit;

      // Construire la requête Firestore
      let query = collections.events
        .where('visibility', '==', 'public')
        .where('status', '==', 'published');

      logger.info('📊 Base query constructed', { 
        collection: 'events',
        filters: { visibility: 'public', status: 'published' }
      });

      // Filtres de localisation
      if (filters.city) {
        query = query.where('location.city', '==', filters.city);
      }
      if (filters.country) {
        query = query.where('location.country', '==', filters.country);
      }
      if (filters.locationType) {
        query = query.where('location.type', '==', filters.locationType);
      }

      // Filtre de catégorie
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      // Filtre featured
      if (filters.featured) {
        query = query.where('featured', '==', true);
      }

      // Filtre de prix
      if (filters.priceType === 'free') {
        query = query.where('pricing.type', '==', 'free');
      } else if (filters.priceType === 'paid') {
        query = query.where('pricing.type', '==', 'paid');
      }

      // Tri
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'asc';
      
      if (sortBy === 'date') {
        query = query.orderBy('startDate', sortOrder);
      } else if (sortBy === 'rating') {
        query = query.orderBy('rating.average', sortOrder === 'asc' ? 'desc' : 'asc');
      } else if (sortBy === 'popular') {
        query = query.orderBy('capacity.registered', sortOrder === 'asc' ? 'desc' : 'asc');
      }

      // Limite pour performance (max 100 events)
      query = query.limit(100);

      // Exécuter la requête
      logger.info('🔄 Executing Firestore query...');
      const snapshot = await query.get();
      logger.info('✅ Query executed', { 
        docsCount: snapshot.docs.length,
        empty: snapshot.empty 
      });

      // Handle empty results gracefully
      if (snapshot.empty) {
        logger.info('📭 No events found in database');
        const availableFilters = await this.getAvailableFilters();
        return {
          events: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          filters: availableFilters
        };
      }

      // Map documents to models
      let events: PublicEvent[] = [];
      try {
        events = snapshot.docs
          .map(doc => PublicEventModel.fromFirestore(doc))
          .filter(model => model !== null)
          .map(model => model!.toPublicAPI());
        
        logger.info('✅ Events mapped successfully', { count: events.length });
      } catch (mappingError: any) {
        logger.error('❌ Error mapping events', { 
          error: mappingError.message,
          stack: mappingError.stack 
        });
        throw new Error(`Failed to map events: ${mappingError.message}`);
      }

      // Filtres post-requête (pour les champs non indexés)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        events = events.filter(event => 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        events = events.filter(event =>
          filters.tags!.some(tag => event.tags.includes(tag))
        );
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        events = events.filter(event => {
          if (event.pricing.type === 'free') return filters.minPrice === 0;
          const price = event.pricing.amount || 0;
          if (filters.minPrice !== undefined && price < filters.minPrice) return false;
          if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
          return true;
        });
      }

      // Filtres de date
      if (filters.startDate) {
        events = events.filter(event => event.startDate >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter(event => event.startDate <= filters.endDate!);
      }

      // Pagination
      const total = events.length;
      const paginatedEvents = events.slice(offset, offset + limit);

      // Obtenir les filtres disponibles
      const availableFilters = await this.getAvailableFilters();

      logger.info('📋 Public events retrieved', {
        total,
        page,
        limit,
        filters: filters
      });

      return {
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: availableFilters
      };

    } catch (error: any) {
      logger.error('❌ Error getting public events', { 
        error: error.message,
        code: error.code,
        stack: error.stack,
        filters 
      });
      throw error;
    }
  }

  /**
   * Obtenir le détail d'un événement public par slug
   */
  async getPublicEventBySlug(slug: string): Promise<PublicEventDetailResponse['data']> {
    try {
      // Validate slug
      if (!slug || typeof slug !== 'string') {
        throw new ValidationError('Valid slug is required');
      }

      // Rechercher l'événement par slug
      const eventSnapshot = await collections.events
        .where('slug', '==', slug)
        .where('visibility', '==', 'public')
        .limit(1)
        .get();

      if (eventSnapshot.empty) {
        throw new NotFoundError('Event not found');
      }

      const eventDoc = eventSnapshot.docs[0];
      const eventModel = PublicEventModel.fromFirestore(eventDoc);
      
      if (!eventModel) {
        throw new NotFoundError('Event not found');
      }

      const event = eventModel.toPublicAPI();

      // Obtenir l'organisateur
      const organizer = await this.getOrganizerById(event.organizerId);

      // Obtenir les événements similaires
      const similarEvents = await this.getSimilarEvents(event);

      logger.info('📄 Public event detail retrieved', {
        eventId: event.id,
        slug,
        organizerId: event.organizerId
      });

      return {
        event,
        organizer,
        similarEvents
      };

    } catch (error: any) {
      logger.error('❌ Error getting public event detail', { slug, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir le profil public d'un organisateur
   */
  async getPublicOrganizerBySlug(slug: string): Promise<PublicOrganizerResponse['data']> {
    try {
      // Validate slug
      if (!slug || typeof slug !== 'string') {
        throw new ValidationError('Valid slug is required');
      }

      // Rechercher l'organisateur par slug
      const organizerSnapshot = await collections.tenants
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (organizerSnapshot.empty) {
        throw new NotFoundError('Organizer not found');
      }

      const organizerDoc = organizerSnapshot.docs[0];
      const organizer = this.mapToPublicOrganizer(organizerDoc);

      // Obtenir les événements à venir
      const upcomingEventsSnapshot = await collections.events
        .where('organizerId', '==', organizer.id)
        .where('visibility', '==', 'public')
        .where('startDate', '>=', new Date())
        .orderBy('startDate', 'asc')
        .limit(10)
        .get();

      const upcomingEvents = upcomingEventsSnapshot.docs
        .map(doc => PublicEventModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toPublicAPI());

      // Obtenir les événements passés
      const pastEventsSnapshot = await collections.events
        .where('organizerId', '==', organizer.id)
        .where('visibility', '==', 'public')
        .where('startDate', '<', new Date())
        .orderBy('startDate', 'desc')
        .limit(10)
        .get();

      const pastEvents = pastEventsSnapshot.docs
        .map(doc => PublicEventModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toPublicAPI());

      logger.info('👤 Public organizer profile retrieved', {
        organizerId: organizer.id,
        slug,
        upcomingEvents: upcomingEvents.length,
        pastEvents: pastEvents.length
      });

      return {
        organizer,
        upcomingEvents,
        pastEvents
      };

    } catch (error: any) {
      logger.error('❌ Error getting public organizer', { slug, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les catégories disponibles
   */
  async getPublicCategories(): Promise<PublicCategoriesResponse['data']> {
    try {
      logger.info('🏷️ Starting getPublicCategories');

      // Obtenir toutes les catégories uniques des événements publics
      const eventsSnapshot = await collections.events
        .where('visibility', '==', 'public')
        .select('category')
        .get();

      logger.info('✅ Categories query executed', { 
        docsCount: eventsSnapshot.docs.length,
        empty: eventsSnapshot.empty 
      });

      // Handle empty results gracefully
      if (eventsSnapshot.empty) {
        logger.info('📭 No events found for categories');
        return { categories: [] };
      }

      const categoryCounts = new Map<string, number>();
      
      eventsSnapshot.docs.forEach(doc => {
        const category = doc.data().category;
        if (category) {
          categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        }
      });

      const categories = Array.from(categoryCounts.entries()).map(([category, count]) => ({
        id: category,
        name: this.getCategoryName(category),
        slug: category,
        count,
        icon: this.getCategoryIcon(category)
      }));

      // Trier par nombre d'événements
      categories.sort((a, b) => b.count - a.count);

      logger.info('✅ Public categories retrieved', {
        total: categories.length
      });

      return { categories };

    } catch (error: any) {
      logger.error('❌ Error getting public categories', { 
        error: error.message,
        code: error.code,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Obtenir les lieux populaires
   */
  async getPublicLocations(): Promise<PublicLocationsResponse['data']> {
    try {
      logger.info('📍 Starting getPublicLocations');

      // Obtenir tous les lieux uniques des événements publics
      const eventsSnapshot = await collections.events
        .where('visibility', '==', 'public')
        .select('location')
        .get();

      logger.info('✅ Locations query executed', { 
        docsCount: eventsSnapshot.docs.length,
        empty: eventsSnapshot.empty 
      });

      // Handle empty results gracefully
      if (eventsSnapshot.empty) {
        logger.info('📭 No events found for locations');
        return { locations: [] };
      }

      const locationCounts = new Map<string, { city: string; country: string; count: number }>();
      
      eventsSnapshot.docs.forEach(doc => {
        const location = doc.data().location;
        if (location && location.city && location.country) {
          const key = `${location.city}|${location.country}`;
          const existing = locationCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            locationCounts.set(key, {
              city: location.city,
              country: location.country,
              count: 1
            });
          }
        }
      });

      const locations = Array.from(locationCounts.values());

      // Trier par nombre d'événements
      locations.sort((a, b) => b.count - a.count);

      logger.info('✅ Public locations retrieved', {
        total: locations.length
      });

      return { locations };

    } catch (error: any) {
      logger.error('❌ Error getting public locations', { 
        error: error.message,
        code: error.code,
        stack: error.stack 
      });
      throw error;
    }
  }

  // ========== Méthodes privées ==========

  /**
   * Validate filter inputs
   */
  private validateFilters(filters: PublicEventFilters): void {
    // Validate page
    if (filters.page !== undefined) {
      if (filters.page < 1 || !Number.isInteger(filters.page)) {
        throw new ValidationError('Page must be a positive integer');
      }
    }
    
    // Validate limit
    if (filters.limit !== undefined) {
      if (filters.limit < 1 || filters.limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100');
      }
    }
    
    // Validate dates
    if (filters.startDate && filters.endDate) {
      if (filters.startDate > filters.endDate) {
        throw new ValidationError('Start date must be before end date');
      }
    }
    
    // Validate price range
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      if (filters.minPrice < 0) {
        throw new ValidationError('Min price must be non-negative');
      }
      if (filters.maxPrice < 0) {
        throw new ValidationError('Max price must be non-negative');
      }
      if (filters.minPrice > filters.maxPrice) {
        throw new ValidationError('Min price must be less than or equal to max price');
      }
    }

    // Validate sort parameters
    if (filters.sortBy) {
      const validSortBy = ['date', 'popular', 'rating', 'price'];
      if (!validSortBy.includes(filters.sortBy)) {
        throw new ValidationError(`Sort by must be one of: ${validSortBy.join(', ')}`);
      }
    }

    if (filters.sortOrder) {
      const validSortOrder = ['asc', 'desc'];
      if (!validSortOrder.includes(filters.sortOrder)) {
        throw new ValidationError(`Sort order must be one of: ${validSortOrder.join(', ')}`);
      }
    }

    // Validate location type
    if (filters.locationType) {
      const validLocationTypes = ['physical', 'online', 'hybrid'];
      if (!validLocationTypes.includes(filters.locationType)) {
        throw new ValidationError(`Location type must be one of: ${validLocationTypes.join(', ')}`);
      }
    }

    // Validate price type
    if (filters.priceType) {
      const validPriceTypes = ['free', 'paid'];
      if (!validPriceTypes.includes(filters.priceType)) {
        throw new ValidationError(`Price type must be one of: ${validPriceTypes.join(', ')}`);
      }
    }
  }

  /**
   * Map Firestore document to PublicEvent (DEPRECATED - use PublicEventModel.fromFirestore)
   * Kept for backward compatibility with mapToPublicOrganizer
   */
  private mapToPublicEvent(doc: FirebaseFirestore.DocumentSnapshot): PublicEvent {
    const model = PublicEventModel.fromFirestore(doc);
    if (!model) {
      throw new Error(`Failed to create model from document ${doc.id}`);
    }
    return model.toPublicAPI();
  }

  private mapToPublicOrganizer(doc: FirebaseFirestore.DocumentSnapshot): PublicOrganizer {
    const data = doc.data()!;
    
    return {
      id: doc.id,
      slug: data.slug || '',
      name: data.name || 'Unknown',
      avatar: data.avatar,
      coverImage: data.coverImage,
      bio: data.bio || '',
      location: data.location || { city: '', country: '' },
      website: data.website,
      social: data.social || {},
      stats: data.stats || {
        totalEvents: 0,
        upcomingEvents: 0,
        totalAttendees: 0,
        rating: 0,
        reviewCount: 0
      },
      verified: data.verified || false,
      createdAt: this.safeConvertDate(data.createdAt, 'createdAt')
    };
  }

  /**
   * Safely convert date value
   */
  private safeConvertDate(value: any, fieldName: string): Date {
    if (!value) {
      return new Date();
    }
    
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (error) {
        logger.warn(`Failed to convert date for ${fieldName}`, { error });
      }
    }
    
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    
    return new Date();
  }

  private async getOrganizerById(organizerId: string): Promise<PublicOrganizer> {
    const doc = await collections.tenants.doc(organizerId).get();
    
    if (!doc.exists) {
      return {
        id: organizerId,
        slug: '',
        name: 'Unknown Organizer',
        bio: '',
        location: { city: '', country: '' },
        social: {},
        stats: {
          totalEvents: 0,
          upcomingEvents: 0,
          totalAttendees: 0,
          rating: 0,
          reviewCount: 0
        },
        verified: false,
        createdAt: new Date()
      };
    }

    return this.mapToPublicOrganizer(doc);
  }

  private async getSimilarEvents(event: PublicEvent): Promise<PublicEvent[]> {
    // Rechercher des événements similaires (même catégorie, même ville)
    const snapshot = await collections.events
      .where('visibility', '==', 'public')
      .where('category', '==', event.category)
      .where('location.city', '==', event.location.city)
      .limit(6)
      .get();

    return snapshot.docs
      .filter(doc => doc.id !== event.id)
      .map(doc => PublicEventModel.fromFirestore(doc))
      .filter(model => model !== null)
      .map(model => model!.toPublicAPI())
      .slice(0, 4);
  }

  private async getAvailableFilters() {
    // Retourner des filtres statiques pour l'instant
    // TODO: Calculer dynamiquement depuis la base de données
    return {
      categories: ['tech', 'business', 'education', 'arts', 'sports', 'health', 'other'],
      cities: ['Paris', 'London', 'Berlin', 'Madrid', 'Rome'],
      countries: ['France', 'United Kingdom', 'Germany', 'Spain', 'Italy']
    };
  }

  private generateSlug(title: string, id: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return `${slug}-${id.substring(0, 8)}`;
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      tech: 'Technology',
      business: 'Business',
      education: 'Education',
      arts: 'Arts & Culture',
      sports: 'Sports',
      health: 'Health & Wellness',
      other: 'Other'
    };
    return names[category] || category;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      tech: '💻',
      business: '💼',
      education: '📚',
      arts: '🎨',
      sports: '⚽',
      health: '🏥',
      other: '📌'
    };
    return icons[category] || '📌';
  }
}

export const publicEventsService = new PublicEventsService();
