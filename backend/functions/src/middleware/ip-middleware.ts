// backend/functions/src/middleware/ip-middleware.ts - Middleware pour l'extraction d'IP

import { extractClientIp } from '../utils';
import { NextFunction, Request, Response } from 'express';


/**
 * Middleware pour extraire automatiquement l'IP du client
 * et l'ajouter à l'objet request
 */
export function ipExtractionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ajouter l'IP extraite à l'objet request
  (req as any).clientIp = extractClientIp(req);
  
  // Ajouter également une méthode helper
  (req as any).getClientIp = () => extractClientIp(req);
  
  next();
}

/**
 * Extension du type Request pour inclure les propriétés IP
 */
declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
      getClientIp?: () => string;
    }
  }
}