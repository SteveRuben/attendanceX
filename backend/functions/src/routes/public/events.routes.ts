/**
 * Routes publiques pour les événements
 * Endpoints accessibles sans authentification
 */

import { Router } from 'express';
import { rateLimit } from '../../middleware/rateLimit';
import { PublicEventsController } from '../../controllers/public/public-events.controller';
import { memoryCache } from '../../utils/cache';

const router = Router();

// Rate limiting pour les endpoints publics
const publicEventsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requêtes par minute
  message: 'Too many requests, please try again later'
});

/**
 * GET /public/events
 * Liste des événements publics avec filtres et pagination
 * 
 * Query params:
 * - search: string (recherche textuelle)
 * - city: string
 * - country: string
 * - locationType: 'physical' | 'online' | 'hybrid'
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - category: string
 * - tags: string (comma-separated)
 * - priceType: 'free' | 'paid'
 * - minPrice: number
 * - maxPrice: number
 * - featured: boolean
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - sortBy: 'date' | 'popular' | 'rating' | 'price'
 * - sortOrder: 'asc' | 'desc'
 */
router.get('/events', 
  publicEventsRateLimit,
  PublicEventsController.getPublicEvents
);

/**
 * GET /public/events/:slug
 * Détail d'un événement public
 * 
 * Params:
 * - slug: string (URL-friendly event identifier)
 * 
 * Returns:
 * - event: PublicEvent
 * - organizer: PublicOrganizer
 * - similarEvents: PublicEvent[]
 */
router.get('/events/:slug',
  publicEventsRateLimit,
  PublicEventsController.getPublicEventBySlug
);

/**
 * GET /public/organizers/:slug
 * Profil public d'un organisateur
 * 
 * Params:
 * - slug: string (URL-friendly organizer identifier)
 * 
 * Returns:
 * - organizer: PublicOrganizer
 * - upcomingEvents: PublicEvent[]
 * - pastEvents: PublicEvent[]
 */
router.get('/organizers/:slug',
  publicEventsRateLimit,
  PublicEventsController.getPublicOrganizerBySlug
);

/**
 * GET /public/categories
 * Liste des catégories d'événements disponibles
 * 
 * Returns:
 * - categories: Array<{ id, name, slug, count, icon }>
 */
router.get('/categories',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100 // 100 requêtes par 5 minutes
  }),
  PublicEventsController.getPublicCategories
);

/**
 * GET /public/locations
 * Liste des lieux populaires
 * 
 * Returns:
 * - locations: Array<{ city, country, count }>
 */
router.get('/locations',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100 // 100 requêtes par 5 minutes
  }),
  PublicEventsController.getPublicLocations
);

export default router;
