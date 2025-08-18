/**
 * Middleware de sécurité pour les routes de présence
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit, rateLimitConfigs } from './rateLimit';
import { PresenceSecurityService } from '../services/presence-security.service';

const securityService = new PresenceSecurityService();

// === CONFIGURATION CORS ===
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://your-domain.com',
      'https://your-app.vercel.app'
    ];

    // Permettre les requêtes sans origine (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 heures
};

// === CONFIGURATION HELMET ===
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.your-domain.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Nécessaire pour certaines APIs
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// === RATE LIMITING ===

// Rate limiting général
export const generalRateLimit = rateLimit(rateLimitConfigs.general);

// Rate limiting strict pour les opérations sensibles
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requêtes par IP
  message: 'Too many sensitive operations from this IP, please try again later.',
  keyGenerator: (req: Request) => {
    const trustedIPs = ['127.0.0.1', '::1'];
    const clientIP = getClientIP(req);
    return trustedIPs.includes(clientIP) ? `trusted_${clientIP}` : `strict_${clientIP}`;
  }
});

// Rate limiting pour l'authentification
export const authRateLimit = rateLimit(rateLimitConfigs.auth);

// === MIDDLEWARE D'AUTHENTIFICATION ===

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Vérifier le token (implémentation dépendante de votre système d'auth)
    const decoded = await verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Ajouter les informations utilisateur à la requête
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// === MIDDLEWARE D'AUTORISATION ===

export const authorize = (requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Vérifier les permissions avec le service de sécurité
      const hasPermission = await checkUserPermissions(user.uid, requiredPermissions);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermissions
        });
      }

      return next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(403).json({
        error: 'Authorization failed',
        code: 'AUTH_FAILED'
      });
    }
  };
};

// === MIDDLEWARE DE VALIDATION D'ACCÈS ===

export const validateAccess = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Valider l'accès avec le service de sécurité
      const accessResult = await securityService.validateAccess(
        user.uid,
        resource,
        action,
        req
      );

      if (!accessResult.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          code: 'ACCESS_DENIED',
          reason: accessResult.reason
        });
      }

      return next();
    } catch (error) {
      console.error('Access validation error:', error);
      res.status(500).json({
        error: 'Access validation failed',
        code: 'VALIDATION_FAILED'
      });
    }
  };
};

// === MIDDLEWARE DE VALIDATION DES DONNÉES ===

export const validatePresenceData = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, location, timestamp } = req.body;

    // Validation de base
    if (!employeeId || typeof employeeId !== 'string') {
      return res.status(400).json({
        error: 'Valid employeeId is required',
        code: 'INVALID_EMPLOYEE_ID'
      });
    }

    // Validation de la géolocalisation si fournie
    if (location) {
      if (typeof location.latitude !== 'number' || 
          typeof location.longitude !== 'number' ||
          Math.abs(location.latitude) > 90 ||
          Math.abs(location.longitude) > 180) {
        return res.status(400).json({
          error: 'Invalid location coordinates',
          code: 'INVALID_LOCATION'
        });
      }
    }

    // Validation du timestamp si fourni
    if (timestamp) {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          error: 'Invalid timestamp format',
          code: 'INVALID_TIMESTAMP'
        });
      }

      // Vérifier que le timestamp n'est pas trop ancien ou futur
      const now = Date.now();
      const timeDiff = Math.abs(now - date.getTime());
      const maxDiff = 24 * 60 * 60 * 1000; // 24 heures

      if (timeDiff > maxDiff) {
        return res.status(400).json({
          error: 'Timestamp too far from current time',
          code: 'INVALID_TIMESTAMP_RANGE'
        });
      }
    }

    return next();
  } catch (error) {
    console.error('Data validation error:', error);
    res.status(400).json({
      error: 'Data validation failed',
      code: 'VALIDATION_FAILED'
    });
  }
};

// === MIDDLEWARE DE CHIFFREMENT ===

export const encryptSensitiveFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const field of fields) {
        if (req.body[field]) {
          req.body[field] = securityService.encryptSensitiveData(req.body[field]);
        }
      }
      next();
    } catch (error) {
      console.error('Encryption error:', error);
      res.status(500).json({
        error: 'Data encryption failed',
        code: 'ENCRYPTION_FAILED'
      });
    }
  };
};

// === MIDDLEWARE DE LOGGING DE SÉCURITÉ ===

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || '';
  const user = req.user;

  // Log de la requête
  console.log(`[SECURITY] ${req.method} ${req.path} - IP: ${userAgent + '-' + clientIP} - User: ${user?.uid || 'anonymous'}`);

  // Intercepter la réponse pour logger les erreurs de sécurité
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      console.warn(`[SECURITY] ${req.method} ${req.path} - ${statusCode} - ${duration}ms - IP: ${clientIP}`);
      
      // Logger les erreurs de sécurité critiques
      if (statusCode === 401 || statusCode === 403) {
        // Ici, vous pourriez envoyer à un service de monitoring
      }
    }

    return originalSend.call(this, data);
  };

  next();
};

// === MIDDLEWARE DE PROTECTION CONTRE LES ATTAQUES ===

// Protection contre les injections NoSQL
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Nettoyer récursivement tous les champs
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    
    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      error: 'Invalid input data',
      code: 'INVALID_INPUT'
    });
  }
};

// Protection contre les attaques de timing
export const constantTimeResponse = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const minResponseTime = 100; // 100ms minimum

  const originalSend = res.send;
  res.send = function(data) {
    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, minResponseTime - elapsed);
    
    setTimeout(() => {
      return originalSend.call(this, data);
    }, delay);

    return this;
  };

  next();
};

// === FONCTIONS UTILITAIRES ===

function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         '0.0.0.0';
}

async function verifyJWT(token: string): Promise<any> {
  // Implémentation de la vérification JWT
  // Retourner les données décodées du token ou null si invalide
  try {
    // Ici, utilisez votre bibliothèque JWT préférée
    // Par exemple: jwt.verify(token, process.env.JWT_SECRET)
    return { id: 'user-id', role: 'employee' }; // Exemple
  } catch {
    return null;
  }
}

async function checkUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
  // Implémentation de la vérification des permissions
  // Retourner true si l'utilisateur a toutes les permissions requises
  return true; // Exemple
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Supprimer les caractères potentiellement dangereux
    return obj.replace(/[<>\"'%;()&+]/g, '');
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Éviter les clés dangereuses
        if (key.startsWith('$') || key.includes('.')) {
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

// === MIDDLEWARE COMPOSITE ===

export const securityMiddleware = [
  helmet(helmetOptions),
  cors(corsOptions),
  generalRateLimit,
  securityLogger,
  sanitizeInput
];

export const authMiddleware = [
  authRateLimit,
  authenticateToken
];

export const presenceSecurityMiddleware = [
  ...securityMiddleware,
  ...authMiddleware,
  validatePresenceData
];