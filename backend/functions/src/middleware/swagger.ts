import { NextFunction, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';
import { swaggerUiConfig } from '../config/swagger-ui-config';

// Middleware pour servir la documentation Swagger
export const serveSwaggerDocs = swaggerUi.serve;

export const setupSwaggerDocs = swaggerUi.setup(swaggerSpec, swaggerUiConfig);

// Middleware pour servir le JSON de la spécification
export const serveSwaggerJson = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
};

// Middleware pour rediriger vers la documentation
export const redirectToDocs = (req: Request, res: Response) => {
  res.redirect('/docs');
};

// Middleware de sécurité pour la documentation (optionnel)
export const protectDocs = (req: Request, res: Response, next: NextFunction) => {
  // En développement, pas de protection
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // En production, on peut ajouter une authentification basique
  // ou vérifier les permissions de l'utilisateur
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="API Documentation"');
    return res.status(401).json({
      success: false,
      error: {
        code: 'DOCS_AUTH_REQUIRED',
        message: 'Authentification requise pour accéder à la documentation'
      }
    });
  }

  // Ici on pourrait vérifier les credentials ou le JWT
  // Pour l'instant, on laisse passer
  next();
};

// Middleware pour ajouter des headers de sécurité à la documentation
export const secureDocsHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Empêcher l'indexation par les moteurs de recherche
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  
  // Headers de sécurité
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  next();
};

export default {
  serveSwaggerDocs,
  setupSwaggerDocs,
  serveSwaggerJson,
  redirectToDocs,
  protectDocs,
  secureDocsHeaders
};