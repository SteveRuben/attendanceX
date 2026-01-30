/**
 * Routes publiques pour les événements
 * Endpoints accessibles sans authentification
 */

import { Router } from 'express';
import { rateLimitPresets } from '../../middleware/smartRateLimit';
import { PublicEventsController } from '../../controllers/public/public-events.controller';

const router = Router();

/**
 * Apply rate limiting to all public routes
 * Using 'frequent' preset for public discovery endpoints
 * - 100 requests/minute in production
 * - 2000 requests/minute in development (20x multiplier)
 */
router.use(rateLimitPresets.frequent());

/**
 * GET /public/events
 * Liste des événements publics avec filtres et pagination
 * 
 * Rate Limiting: 100 req/min (production), 2000 req/min (development)
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
router.get('/events', PublicEventsController.getPublicEvents);

/**
 * GET /public/events/:slug
 * Détail d'un événement public
 * 
 * Rate Limiting: 100 req/min (production), 2000 req/min (development)
 * 
 * Params:
 * - slug: string (URL-friendly event identifier)
 * 
 * Returns:
 * - event: PublicEvent
 * - organizer: PublicOrganizer
 * - similarEvents: PublicEvent[]
 */
router.get('/events/:slug', PublicEventsController.getPublicEventBySlug);

/**
 * GET /public/organizers/:slug
 * Profil public d'un organisateur
 * 
 * Rate Limiting: 100 req/min (production), 2000 req/min (development)
 * 
 * Params:
 * - slug: string (URL-friendly organizer identifier)
 * 
 * Returns:
 * - organizer: PublicOrganizer
 * - upcomingEvents: PublicEvent[]
 * - pastEvents: PublicEvent[]
 */
router.get('/organizers/:slug', PublicEventsController.getPublicOrganizerBySlug);

/**
 * GET /public/categories
 * Liste des catégories d'événements disponibles
 * 
 * Rate Limiting: 100 req/min (production), 2000 req/min (development)
 * 
 * Returns:
 * - categories: Array<{ id, name, slug, count, icon }>
 */
router.get('/categories', PublicEventsController.getPublicCategories);

/**
 * GET /public/locations
 * Liste des lieux populaires
 * 
 * Rate Limiting: 100 req/min (production), 2000 req/min (development)
 * 
 * Returns:
 * - locations: Array<{ city, country, count }>
 */
router.get('/locations', PublicEventsController.getPublicLocations);

export default router;
