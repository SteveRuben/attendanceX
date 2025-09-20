/**
 * Middleware de dépréciation pour les routes obsolètes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions';

export interface DeprecationOptions {
  version?: string;
  sunset?: string; // Date de suppression prévue
  replacement?: string; // Route de remplacement
  message?: string;
}

/**
 * Middleware pour marquer une route comme dépréciée
 */
export const deprecated = (options: DeprecationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const {
      version = '2.0.0',
      sunset,
      replacement,
      message
    } = options;

    // Ajouter les headers de dépréciation
    res.set('Deprecation', 'true');
    res.set('Sunset', sunset || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()); // 90 jours par défaut
    
    if (replacement) {
      res.set('Link', `<${replacement}>; rel="successor-version"`);
    }

    // Logger l'utilisation de la route dépréciée
    logger.warn('Deprecated route accessed', {
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      replacement,
      sunset
    });

    // Ajouter un warning dans la réponse (sera intercepté par le middleware de réponse)
    (req as any).deprecationWarning = {
      message: message || `This endpoint is deprecated. ${replacement ? `Use ${replacement} instead.` : ''}`,
      version,
      sunset,
      replacement
    };

    next();
  };
};

/**
 * Middleware pour ajouter les warnings de dépréciation dans les réponses
 */
export const addDeprecationWarning = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function(body: any) {
    if ((req as any).deprecationWarning) {
      const warning = (req as any).deprecationWarning;
      
      // Ajouter le warning dans la réponse
      if (typeof body === 'object' && body !== null) {
        body._deprecated = {
          warning: warning.message,
          version: warning.version,
          sunset: warning.sunset,
          replacement: warning.replacement
        };
      }
    }

    return originalJson.call(this, body);
  };

  next();
};