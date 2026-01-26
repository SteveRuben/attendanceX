/**
 * Controller pour les événements publics
 * Gère les requêtes HTTP pour les endpoints publics
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { asyncHandler } from '../../middleware/errorHandler';
import { publicEventsService } from '../../services/public/public-events.service';
import { PublicEventFilters } from '../../types/public-event.types';
import { getStringParam } from '../../utils/route-params';

export class PublicEventsController {

  /**
   * GET /public/events
   * Obtenir la liste des événements publics avec filtres
   */
  static getPublicEvents = asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Extraire les filtres de la requête
      const filters: PublicEventFilters = {
        search: req.query.search as string,
        city: req.query.city as string,
        country: req.query.country as string,
        locationType: req.query.locationType as 'physical' | 'online' | 'hybrid',
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        priceType: req.query.priceType as 'free' | 'paid',
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        featured: req.query.featured === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as 'date' | 'popular' | 'rating' | 'price',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      logger.info('📋 Getting public events', {
        filters,
        ip: req.ip
      });

      const result = await publicEventsService.getPublicEvents(filters);

      const duration = Date.now() - startTime;
      logger.info('✅ Public events retrieved successfully', {
        total: result.pagination.total,
        page: result.pagination.page,
        duration
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error getting public events', {
        error: error.message,
        duration
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get public events'
        }
      });
    }
  });

  /**
   * GET /public/events/:slug
   * Obtenir le détail d'un événement public
   */
  static getPublicEventBySlug = asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const slug = getStringParam(req.params.slug);

      if (!slug) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Event slug is required'
          }
        });
      }

      logger.info('📄 Getting public event detail', {
        slug,
        ip: req.ip
      });

      const result = await publicEventsService.getPublicEventBySlug(slug);

      const duration = Date.now() - startTime;
      logger.info('✅ Public event detail retrieved successfully', {
        eventId: result.event.id,
        slug,
        duration
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.code === 'NOT_FOUND') {
        logger.warn('⚠️ Public event not found', {
          slug: req.params.slug,
          duration
        });
        
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Event not found'
          }
        });
      }

      logger.error('❌ Error getting public event detail', {
        slug: req.params.slug,
        error: error.message,
        duration
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get event details'
        }
      });
    }
  });

  /**
   * GET /public/organizers/:slug
   * Obtenir le profil public d'un organisateur
   */
  static getPublicOrganizerBySlug = asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const slug = getStringParam(req.params.slug);

      if (!slug) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Organizer slug is required'
          }
        });
      }

      logger.info('👤 Getting public organizer profile', {
        slug,
        ip: req.ip
      });

      const result = await publicEventsService.getPublicOrganizerBySlug(slug);

      const duration = Date.now() - startTime;
      logger.info('✅ Public organizer profile retrieved successfully', {
        organizerId: result.organizer.id,
        slug,
        duration
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.code === 'NOT_FOUND') {
        logger.warn('⚠️ Public organizer not found', {
          slug: req.params.slug,
          duration
        });
        
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Organizer not found'
          }
        });
      }

      logger.error('❌ Error getting public organizer profile', {
        slug: req.params.slug,
        error: error.message,
        duration
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get organizer profile'
        }
      });
    }
  });

  /**
   * GET /public/categories
   * Obtenir les catégories disponibles
   */
  static getPublicCategories = asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      logger.info('🏷️ Getting public categories', {
        ip: req.ip
      });

      const result = await publicEventsService.getPublicCategories();

      const duration = Date.now() - startTime;
      logger.info('✅ Public categories retrieved successfully', {
        total: result.categories.length,
        duration
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error getting public categories', {
        error: error.message,
        duration
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get categories'
        }
      });
    }
  });

  /**
   * GET /public/locations
   * Obtenir les lieux populaires
   */
  static getPublicLocations = asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      logger.info('📍 Getting public locations', {
        ip: req.ip
      });

      const result = await publicEventsService.getPublicLocations();

      const duration = Date.now() - startTime;
      logger.info('✅ Public locations retrieved successfully', {
        total: result.locations.length,
        duration
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ Error getting public locations', {
        error: error.message,
        duration
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get locations'
        }
      });
    }
  });
}
