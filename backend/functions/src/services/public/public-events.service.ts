/**
 * Service pour les événements publics
 * Gère la logique métier pour les endpoints publics
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
import { NotFoundError } from '../../utils/common/errors';
import { logger } from 'firebase-functions';

export class PublicEventsService {
  
  /**
   * Obtenir la liste des événements publics avec filtres
   */
  async getPublicEvents(filters: PublicEventFilters): Promise<PublicEventListResponse['data']> {
    try {
      logger.info('🔍 Starting getPublicEvents', { filters });

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

      let events: PublicEvent[] = [];
      try {
        events = snapshot.docs.map(doc => this.mapToPublicEvent(doc));
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
      const event = this.mapToPublicEvent(eventDoc);

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

      const upcomingEvents = upcomingEventsSnapshot.docs.map(doc => this.mapToPublicEvent(doc));

      // Obtenir les événements passés
      const pastEventsSnapshot = await collections.events
        .where('organizerId', '==', organizer.id)
        .where('visibility', '==', 'public')
        .where('startDate', '<', new Date())
        .orderBy('startDate', 'desc')
        .limit(10)
        .get();

      const pastEvents = pastEventsSnapshot.docs.map(doc => this.mapToPublicEvent(doc));

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

  private mapToPublicEvent(doc: FirebaseFirestore.DocumentSnapshot): PublicEvent {
    const data = doc.data()!;
    
    return {
      id: doc.id,
      slug: data.slug || this.generateSlug(data.title, doc.id),
      title: data.title,
      description: data.description || '',
      shortDescription: data.shortDescription || data.description?.substring(0, 160) || '',
      coverImage: data.coverImage || '',
      images: data.images || [],
      organizerId: data.tenantId || data.organizerId,
      organizerName: data.organizerName || 'Unknown',
      organizerSlug: data.organizerSlug || '',
      organizerAvatar: data.organizerAvatar,
      organizerRating: data.organizerRating || 0,
      startDate: this.convertFirestoreDate(data.startDate, 'startDate'),
      endDate: this.convertFirestoreDate(data.endDate, 'endDate'),
      timezone: data.timezone || 'UTC',
      location: data.location || { type: 'online', city: '', country: '' },
      category: data.category || 'other',
      tags: data.tags || [],
      pricing: data.pricing || { type: 'free' },
      capacity: data.capacity || { total: 0, available: 0, registered: 0 },
      rating: data.rating || { average: 0, count: 0 },
      visibility: data.visibility || 'public',
      featured: data.featured || false,
      seo: data.seo || {
        metaTitle: data.title,
        metaDescription: data.shortDescription || data.description?.substring(0, 160) || '',
        keywords: data.tags || [],
        ogImage: data.coverImage || ''
      },
      publishedAt: this.convertFirestoreDate(data.publishedAt, 'publishedAt'),
      createdAt: this.convertFirestoreDate(data.createdAt, 'createdAt'),
      updatedAt: this.convertFirestoreDate(data.updatedAt, 'updatedAt')
    };
  }

  /**
   * Safely converts Firestore Timestamp or date string to Date object
   * @param value - Firestore Timestamp, ISO string, number, or undefined
   * @param fieldName - Name of the field for logging purposes
   * @returns Date object, defaults to current date if conversion fails
   */
  private convertFirestoreDate(value: any, fieldName?: string): Date {
    if (!value) {
      return new Date();
    }
    
    // Firestore Timestamp with toDate method
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (error) {
        logger.warn(`Failed to convert Firestore Timestamp for ${fieldName}`, { error });
      }
    }
    
    // ISO string or timestamp number
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Fallback to current date
    logger.warn(`Invalid date value for ${fieldName}, using current date`, { 
      value: typeof value,
      fieldName 
    });
    return new Date();
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
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date()
    };
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
      .map(doc => this.mapToPublicEvent(doc))
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
